#!/usr/bin/env npx tsx
/**
 * Reference: Nostr relay integration with Pura BPE
 *
 * Shows how a relay operator registers capacity on-chain,
 * joins payment pools, and earns streaming payments proportional
 * to their attested capacity.
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx scripts/relay-register.ts
 *
 * Requires a funded wallet on Base with relay contracts deployed.
 */

import { createWalletClient, createPublicClient, http, toHex } from "viem";
import { base, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getAddresses, relay } from "@puraxyz/sdk";

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Set PRIVATE_KEY env var");
    process.exit(1);
  }

  const chainId = Number(process.env.CHAIN_ID ?? "84532");
  const chain = chainId === 8453 ? base : baseSepolia;
  const rpcUrl = process.env.RPC_URL ?? chain.rpcUrls.default.http[0];
  const addrs = getAddresses(chainId);

  const account = privateKeyToAccount(pk as `0x${string}`);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // A Nostr relay's pubkey (hex-encoded, 32 bytes).
  // In production this comes from the relay's NIP-11 info document.
  const nostrPubkey =
    (process.env.NOSTR_PUBKEY as `0x${string}`) ??
    toHex(Buffer.from("example-relay-pubkey".padEnd(32, "\0")));

  console.log(`Chain: ${chain.name} (${chainId})`);
  console.log(`Operator: ${account.address}`);
  console.log(`Nostr pubkey: ${nostrPubkey}`);

  // 1. Register relay with initial capacity
  console.log("\n--- Registering relay ---");
  const regTx = await relay.registerRelay(walletClient, addrs, nostrPubkey, {
    eventsPerSecond: 500n,
    storageGB: 100n,
    bandwidthMbps: 200n,
  });
  console.log(`Register tx: ${regTx}`);

  // 2. Join the WRITE pool (type 0)
  console.log("\n--- Joining WRITE pool ---");
  const joinTx = await relay.joinRelayPool(walletClient, addrs, 0, nostrPubkey);
  console.log(`Join tx: ${joinTx}`);

  // 3. Read back state
  console.log("\n--- Verifying ---");
  const operator = await relay.getRelayOperator(publicClient, addrs, nostrPubkey);
  console.log(`Registered operator: ${operator}`);

  const capacity = await relay.getCompositeCapacity(publicClient, addrs, nostrPubkey);
  console.log(`Composite capacity score: ${capacity}`);

  const allRelays = await relay.getAllRelays(publicClient, addrs);
  console.log(`Total registered relays: ${allRelays.pubkeys.length}`);

  const antiSpam = await relay.getAntiSpamMinimum(publicClient, addrs, 0);
  console.log(`WRITE pool anti-spam minimum: ${antiSpam}`);

  console.log("\nRelay registered and connected to payment pool.");
  console.log("Streaming payments will flow proportional to attested capacity.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
