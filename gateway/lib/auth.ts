import { validateKey, validateKeyAsync, type ApiKeyRecord } from "./keys";

const FREE_TIER_LIMIT = 100;

export interface AuthResult {
  valid: boolean;
  record: ApiKeyRecord | null;
  walletRequired: boolean;
  error?: string;
}

/**
 * Authenticate a request using the Authorization header.
 * Uses async Redis lookup when Upstash is configured, sync JSON fallback otherwise.
 */
export async function authenticate(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, record: null, walletRequired: false, error: "Missing API key" };
  }

  const raw = authHeader.slice(7);
  const record = await validateKeyAsync(raw);

  if (!record) {
    return { valid: false, record: null, walletRequired: false, error: "Invalid API key" };
  }

  // Check if wallet is required (past free tier with no wallet linked)
  if (record.requests >= FREE_TIER_LIMIT && !record.wallet) {
    return {
      valid: true,
      record,
      walletRequired: true,
      error: `Free tier exhausted (${FREE_TIER_LIMIT} requests). Link a wallet to continue.`,
    };
  }

  return { valid: true, record, walletRequired: false };
}
