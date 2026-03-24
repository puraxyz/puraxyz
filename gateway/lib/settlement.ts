/**
 * Settlement abstraction layer.
 * The routing engine and auth layer import from here, never from lightning.ts directly.
 * This makes it easy to swap in Superfluid or ERC-20 settlement later.
 */

export interface Invoice {
  /** Payment request string (BOLT11 for Lightning) */
  paymentRequest: string;
  /** Amount in the settlement unit (sats for Lightning) */
  amount: number;
  /** Unique ID for checking status */
  id: string;
  /** When the invoice expires */
  expiresAt: number;
}

export interface BalanceInfo {
  /** Available balance in settlement units (sats) */
  balance: number;
  /** Estimated requests remaining at current average cost */
  estimatedRequests: number;
  /** Settlement rail name */
  rail: string;
}

export interface SettlementProvider {
  /** Human name of the rail, e.g. "lightning", "superfluid" */
  readonly name: string;
  /** Create a funding invoice for the given amount (sats) */
  createInvoice(keyHash: string, amountSats: number, memo?: string): Promise<Invoice>;
  /** Read current balance for a key */
  checkBalance(keyHash: string): Promise<BalanceInfo>;
  /** Deduct amount from balance after a request. Returns false if insufficient. */
  deductBalance(keyHash: string, amountSats: number): Promise<boolean>;
  /** Check if a specific invoice has been paid */
  isInvoicePaid(invoiceId: string): Promise<boolean>;
}

// --- Active settlement provider ---

let activeProvider: SettlementProvider | null = null;

export function setSettlementProvider(provider: SettlementProvider): void {
  activeProvider = provider;
}

export function getSettlementProvider(): SettlementProvider | null {
  return activeProvider;
}
