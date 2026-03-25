/**
 * Lightning settlement via LND REST API.
 * Second SettlementProvider implementation — swap in via env var.
 * Requires: LND_REST_HOST, LND_MACAROON_HEX. Optional: LND_TLS_CERT.
 */

import type { SettlementProvider, Invoice, BalanceInfo } from "./settlement";

const LND_REST_HOST = process.env.LND_REST_HOST ?? "";
const LND_MACAROON_HEX = process.env.LND_MACAROON_HEX ?? "";

const SATS_PER_USD = 2500;
const AVG_COST_SATS = Math.ceil(0.003 * SATS_PER_USD);

// In-memory balance store (same pattern as lightning.ts)
const balances = new Map<string, number>();

function useRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
  });
  const data = (await res.json()) as { result: string | null };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", key, value]),
  });
}

async function getBalance(keyHash: string): Promise<number> {
  if (useRedis()) {
    const val = await redisGet(`pura:balance:${keyHash}`);
    return val ? Number(val) : 0;
  }
  return balances.get(keyHash) ?? 0;
}

async function setBalance(keyHash: string, sats: number): Promise<void> {
  if (useRedis()) {
    await redisSet(`pura:balance:${keyHash}`, String(Math.max(0, sats)));
    return;
  }
  balances.set(keyHash, Math.max(0, sats));
}

function lndHeaders(): Record<string, string> {
  return {
    "Grpc-Metadata-macaroon": LND_MACAROON_HEX,
    "Content-Type": "application/json",
  };
}

/** Build fetch options with optional TLS cert handling */
function lndFetchOptions(init?: RequestInit): RequestInit {
  // Node 18+ fetch doesn't support custom CA directly —
  // in production, set NODE_EXTRA_CA_CERTS or use a proper TLS setup.
  // LND_TLS_CERT is documented for completeness but handled at the OS/Node level.
  return { ...init, headers: { ...lndHeaders(), ...init?.headers } };
}

export const lndSettlement: SettlementProvider = {
  name: "lightning-lnd",

  async createInvoice(keyHash: string, amountSats: number, memo?: string): Promise<Invoice> {
    if (!LND_REST_HOST || !LND_MACAROON_HEX) {
      const id = `dev_lnd_${Date.now()}_${keyHash.slice(0, 8)}`;
      return {
        paymentRequest: `lnbc${amountSats}n1stub_lnd_dev`,
        amount: amountSats,
        id,
        expiresAt: Date.now() + 600_000,
      };
    }

    const res = await fetch(`${LND_REST_HOST}/v1/invoices`, lndFetchOptions({
      method: "POST",
      body: JSON.stringify({
        value: String(amountSats),
        memo: memo ?? `Pura gateway funding: ${keyHash.slice(0, 8)}`,
        expiry: "600",
      }),
    }));

    if (!res.ok) {
      throw new Error(`LND invoice creation failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      r_hash: string;
      payment_request: string;
    };

    // r_hash comes as base64 from LND REST
    const hashHex = Buffer.from(data.r_hash, "base64").toString("hex");

    return {
      paymentRequest: data.payment_request,
      amount: amountSats,
      id: hashHex,
      expiresAt: Date.now() + 600_000,
    };
  },

  async checkBalance(keyHash: string): Promise<BalanceInfo> {
    const sats = await getBalance(keyHash);
    return {
      balance: sats,
      estimatedRequests: AVG_COST_SATS > 0 ? Math.floor(sats / AVG_COST_SATS) : 0,
      rail: "lightning-lnd",
    };
  },

  async deductBalance(keyHash: string, amountSats: number): Promise<boolean> {
    const current = await getBalance(keyHash);
    if (current < amountSats) return false;
    await setBalance(keyHash, current - amountSats);
    return true;
  },

  async isInvoicePaid(invoiceId: string): Promise<boolean> {
    if (!LND_REST_HOST || !LND_MACAROON_HEX) return false;

    const hashBase64 = Buffer.from(invoiceId, "hex").toString("base64url");
    const res = await fetch(
      `${LND_REST_HOST}/v1/invoice/${encodeURIComponent(hashBase64)}`,
      lndFetchOptions(),
    );

    if (!res.ok) return false;

    const data = (await res.json()) as { settled: boolean };
    return data.settled === true;
  },
};

/** Credit sats to a key's balance (after invoice payment confirmed) */
export async function creditBalanceLnd(keyHash: string, sats: number): Promise<number> {
  const current = await getBalance(keyHash);
  const newBalance = current + sats;
  await setBalance(keyHash, newBalance);
  return newBalance;
}
