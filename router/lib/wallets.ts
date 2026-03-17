import type { WalletClient } from "viem";
import { walletClient } from "./chain";

function requireEnv(key: string): `0x${string}` {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val as `0x${string}`;
}

export function getWallets(): {
  atlas: WalletClient;
  beacon: WalletClient;
  cipher: WalletClient;
  dispatch: WalletClient;
} {
  return {
    atlas: walletClient(requireEnv("ATLAS_PRIVATE_KEY")),
    beacon: walletClient(requireEnv("BEACON_PRIVATE_KEY")),
    cipher: walletClient(requireEnv("CIPHER_PRIVATE_KEY")),
    dispatch: walletClient(requireEnv("DISPATCH_PRIVATE_KEY")),
  };
}

export type AgentName = "atlas" | "beacon" | "cipher";
export type WalletMap = ReturnType<typeof getWallets>;
