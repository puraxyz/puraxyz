/**
 * Lightning payment configuration.
 *
 * Supports multiple wallet backends:
 *   - Alby (via MCP server or REST API)
 *   - LND (via gRPC or REST)
 *   - CLN (via commando or REST)
 *   - Cashu ecash (for development/testing)
 *
 * Decision D16: use existing Lightning tools, don't build custom infra.
 */

export type WalletBackend = 'alby' | 'lnd' | 'cln' | 'cashu' | 'mock';

export interface LightningConfig {
  /** Which wallet backend to use. */
  backend: WalletBackend;
  /** Connection URL (backend-specific). */
  url?: string;
  /** Auth token or macaroon (backend-specific). */
  authToken?: string;
  /** TLS cert path (for LND). */
  tlsCertPath?: string;
  /** Cashu mint URL (for ecash dev mode). */
  cashuMintUrl?: string;
}

/** Load Lightning config from environment variables. */
export function loadLightningConfig(): LightningConfig {
  const backend = (process.env.LN_BACKEND ?? 'mock') as WalletBackend;
  return {
    backend,
    url: process.env.LN_URL,
    authToken: process.env.LN_AUTH_TOKEN,
    tlsCertPath: process.env.LN_TLS_CERT_PATH,
    cashuMintUrl: process.env.CASHU_MINT_URL,
  };
}
