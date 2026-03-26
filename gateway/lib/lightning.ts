/**
 * Lightning settlement via LNbits REST API.
 * Implements SettlementProvider — the rest of the gateway imports from settlement.ts only.
 */

import type { SettlementProvider, Invoice, BalanceInfo } from "./settlement";
import { useRedis, getRedisUrl, getRedisToken } from "./redis-config";

const LNBITS_URL = process.env.LNBITS_URL ?? "https://legend.lnbits.com";
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY ?? "";

// Sats per USD (rough estimate, updated lazily)
const SATS_PER_USD = 2500; // ~$40k/BTC

// In-memory balance store (Redis in production)
const balances = new Map<string, number>();

// useRedis, getRedisUrl, getRedisToken imported from redis-config

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${getRedisUrl()}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${getRedisToken()}` },
  });
  const data = (await res.json()) as { result: string | null };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  await fetch(`${getRedisUrl()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
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

/** Average cost per request in sats (based on ~$0.003 per request) */
const AVG_COST_SATS = Math.ceil(0.003 * SATS_PER_USD);

export const lightningSettlement: SettlementProvider = {
  name: "lightning",

  async createInvoice(keyHash: string, amountSats: number, memo?: string): Promise<Invoice> {
    if (!LNBITS_ADMIN_KEY) {
      // No LNbits configured — return a stub invoice for dev/testing
      const id = `dev_${Date.now()}_${keyHash.slice(0, 8)}`;
      return {
        paymentRequest: `lnbc${amountSats}n1stub_dev_invoice`,
        amount: amountSats,
        id,
        expiresAt: Date.now() + 600_000, // 10 min
      };
    }

    const res = await fetch(`${LNBITS_URL}/api/v1/payments`, {
      method: "POST",
      headers: {
        "X-Api-Key": LNBITS_ADMIN_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        out: false,
        amount: amountSats,
        memo: memo ?? `Pura gateway funding: ${keyHash.slice(0, 8)}`,
        unit: "sat",
      }),
    });

    if (!res.ok) {
      throw new Error(`LNbits invoice creation failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      payment_hash: string;
      payment_request: string;
    };

    return {
      paymentRequest: data.payment_request,
      amount: amountSats,
      id: data.payment_hash,
      expiresAt: Date.now() + 600_000,
    };
  },

  async checkBalance(keyHash: string): Promise<BalanceInfo> {
    const sats = await getBalance(keyHash);
    return {
      balance: sats,
      estimatedRequests: AVG_COST_SATS > 0 ? Math.floor(sats / AVG_COST_SATS) : 0,
      rail: "lightning",
    };
  },

  async deductBalance(keyHash: string, amountSats: number): Promise<boolean> {
    const current = await getBalance(keyHash);
    if (current < amountSats) return false;
    await setBalance(keyHash, current - amountSats);
    return true;
  },

  async isInvoicePaid(invoiceId: string): Promise<boolean> {
    if (!LNBITS_ADMIN_KEY) return false;

    const res = await fetch(`${LNBITS_URL}/api/v1/payments/${encodeURIComponent(invoiceId)}`, {
      headers: { "X-Api-Key": LNBITS_ADMIN_KEY },
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { paid: boolean };
    return data.paid === true;
  },
};

/** Credit sats to a key's balance (after invoice payment confirmed) */
export async function creditBalance(keyHash: string, sats: number): Promise<number> {
  const current = await getBalance(keyHash);
  const newBalance = current + sats;
  await setBalance(keyHash, newBalance);
  return newBalance;
}
