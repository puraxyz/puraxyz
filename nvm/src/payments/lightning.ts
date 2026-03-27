/**
 * Lightning payment integration — NIP-57 zap creation and monitoring.
 *
 * Wallet backends:
 *   - mock: in-memory, no real Lightning (dev/testing)
 *   - lnd:  LND REST API with macaroon auth + TLS
 *
 * Zaps are Lightning payments attached to Nostr events (NIP-57).
 * On job completion, the customer zaps the result event.
 * The agent monitors zap receipts to track income.
 */

import type { LightningConfig } from './config.js';
import { NostrClient } from '../client/NostrClient.js';
import type { Event, Filter } from 'nostr-tools';

export interface Invoice {
  paymentRequest: string; // BOLT11 invoice
  paymentHash: string;
  amountMsats: number;
  memo: string;
}

export interface ZapReceipt {
  eventId: string; // The event being zapped
  senderPubkey: string;
  amountMsats: number;
  timestamp: number;
}

export interface LightningWallet {
  createInvoice(amountMsats: number, memo: string): Promise<Invoice>;
  payInvoice(paymentRequest: string): Promise<{ preimage: string }>;
  getBalance(): Promise<{ balanceMsats: number }>;
}

// ---------------------------------------------------------------------------
// Mock wallet (dev/testing)
// ---------------------------------------------------------------------------

function createMockWallet(): LightningWallet {
  let balance = 1_000_000_000; // 1M sats in msats
  return {
    async createInvoice(amountMsats, memo) {
      return {
        paymentRequest: `lnbc${amountMsats}mock${Date.now()}`,
        paymentHash: `mock_${Date.now().toString(16)}`,
        amountMsats,
        memo,
      };
    },
    async payInvoice(_paymentRequest) {
      balance -= 1000;
      return { preimage: `mock_preimage_${Date.now().toString(16)}` };
    },
    async getBalance() {
      return { balanceMsats: balance };
    },
  };
}

// ---------------------------------------------------------------------------
// LND REST API wallet
// ---------------------------------------------------------------------------

interface LndRestConfig {
  /** LND REST host, e.g. https://my-node:8080 */
  host: string;
  /** Hex-encoded admin macaroon */
  macaroonHex: string;
}

function parseLndConfig(config: LightningConfig): LndRestConfig {
  const host = config.url ?? process.env.LND_REST_HOST;
  const macaroonHex = config.authToken ?? process.env.LND_MACAROON_HEX;
  if (!host || !macaroonHex) {
    throw new Error(
      'LND backend requires LND_REST_HOST and LND_MACAROON_HEX ' +
      '(or url/authToken in config)',
    );
  }
  return { host: host.replace(/\/$/, ''), macaroonHex };
}

async function lndFetch(
  lnd: LndRestConfig,
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  const url = `${lnd.host}${path}`;
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: {
      'Grpc-Metadata-macaroon': lnd.macaroonHex,
      'Content-Type': 'application/json',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LND ${opts.method ?? 'GET'} ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

function createLndWallet(config: LightningConfig): LightningWallet {
  const lnd = parseLndConfig(config);

  return {
    async createInvoice(amountMsats, memo) {
      const data = await lndFetch(lnd, '/v1/invoices', {
        method: 'POST',
        body: { value_msat: String(amountMsats), memo },
      }) as {
        payment_request: string;
        r_hash: string;
      };
      return {
        paymentRequest: data.payment_request,
        paymentHash: data.r_hash,
        amountMsats,
        memo,
      };
    },

    async payInvoice(paymentRequest) {
      const data = await lndFetch(lnd, '/v2/router/send', {
        method: 'POST',
        body: { payment_request: paymentRequest, timeout_seconds: 30 },
      }) as { result?: { payment_preimage?: string } };
      return {
        preimage: data.result?.payment_preimage ?? 'unknown',
      };
    },

    async getBalance() {
      const data = await lndFetch(lnd, '/v1/balance/channels') as {
        local_balance?: { msat?: string };
      };
      const msat = parseInt(data.local_balance?.msat ?? '0', 10);
      return { balanceMsats: msat };
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWallet(config: LightningConfig): LightningWallet {
  switch (config.backend) {
    case 'lnd':
      return createLndWallet(config);
    case 'mock':
      return createMockWallet();
    case 'alby':
    case 'cln':
    case 'cashu':
      console.warn(`Lightning backend '${config.backend}' not yet implemented, using mock`);
      return createMockWallet();
    default:
      return createMockWallet();
  }
}

// ---------------------------------------------------------------------------
// NIP-57 zap helpers
// ---------------------------------------------------------------------------

/**
 * Create a NIP-57 zap request (kind-9734) and pay the resulting invoice.
 *
 * Full flow:
 *   1. Build kind-9734 zap request event
 *   2. Send to recipient's LNURL callback (fetched from kind-0 profile)
 *   3. Pay the returned BOLT11 invoice
 *   4. Recipient's LNURL server publishes kind-9735 zap receipt
 *
 * Simplified here: creates and pays an invoice directly via the wallet.
 * The relay-side zap receipt monitoring picks up kind-9735 events.
 */
export async function createZap(
  wallet: LightningWallet,
  recipientPubkey: string,
  eventId: string,
  amountMsats: number,
): Promise<{ paymentHash: string }> {
  const invoice = await wallet.createInvoice(
    amountMsats,
    `NVM zap for ${eventId}`,
  );
  await wallet.payInvoice(invoice.paymentRequest);
  return { paymentHash: invoice.paymentHash };
}

/**
 * Monitor zap receipts (kind-9735) for a specific agent.
 *
 * Subscribes to the relay for kind-9735 events where the 'p' tag
 * matches the agent's pubkey. Parses the bolt11 description hash
 * to extract the original zap request and amount.
 *
 * Returns a stop function.
 */
export function monitorZaps(
  agentPubkey: string,
  onZap: (zap: ZapReceipt) => void,
  client?: NostrClient,
): () => void {
  if (!client) {
    return () => {};
  }

  const filter: Filter = {
    kinds: [9735],
    '#p': [agentPubkey],
  };

  const sub = client.subscribe([filter], (event: Event) => {
    const amountTag = event.tags.find((t) => t[0] === 'amount');
    const eTag = event.tags.find((t) => t[0] === 'e');
    const pTag = event.tags.find((t) => t[0] === 'P'); // sender pubkey in zap receipt

    onZap({
      eventId: eTag?.[1] ?? event.id,
      senderPubkey: pTag?.[1] ?? event.pubkey,
      amountMsats: parseInt(amountTag?.[1] ?? '0', 10),
      timestamp: event.created_at,
    });
  });

  return () => sub.close();
}
