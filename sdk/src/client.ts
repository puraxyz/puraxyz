/**
 * High-level Pura client — three functions: route, deploy, monitor.
 *
 * Wraps the low-level action modules into a simple interface for the
 * common case: send a request through the Pura gateway, deploy a
 * provider into a pool, or read live protocol state.
 */

import type { PublicClient, WalletClient, Hash } from "viem";
import type { ChainAddresses } from "./addresses.js";
import { abis } from "./abis/index.js";
import { read, write } from "./helpers.js";

// ── Types ──

export interface RouteOptions {
  /** Gateway base URL. Defaults to https://api.pura.xyz */
  gateway?: string;
  /** Model identifier (OpenAI-compatible). Defaults to gpt-4o-mini */
  model?: string;
  /** API key (pura_... format) */
  apiKey: string;
  /** Chat messages array */
  messages: Array<{ role: string; content: string }>;
  /** If true, return a ReadableStream of SSE chunks */
  stream?: boolean;
}

export interface RouteResult {
  content: string;
  provider: string | null;
  requestId: string | null;
  remainingRequests: string | null;
}

export interface DeployOptions {
  taskTypeId: Hash;
  initialCapacity: bigint;
  stakeAmount: bigint;
}

export interface ProtocolState {
  sinkCount: bigint;
  poolTotalUnits: bigint;
  bufferBalance: bigint;
  baseFee: bigint;
}

// ── route ──

/**
 * Send a chat completion through the Pura gateway.
 * Returns the response content plus routing metadata headers.
 */
export async function route(opts: RouteOptions): Promise<RouteResult> {
  const base = (opts.gateway ?? "https://api.pura.xyz").replace(/\/$/, "");
  const url = `${base}/v1/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? "gpt-4o-mini",
      messages: opts.messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pura gateway ${res.status}: ${text}`);
  }

  const json = await res.json();
  return {
    content: json.choices?.[0]?.message?.content ?? "",
    provider: res.headers.get("x-pura-provider"),
    requestId: res.headers.get("x-pura-request-id"),
    remainingRequests: res.headers.get("x-ratelimit-remaining"),
  };
}

// ── deploy ──

/**
 * Register as a provider: register capacity, stake, and join the pool.
 * Returns the three transaction hashes.
 */
export async function deploy(
  walletClient: WalletClient,
  addrs: ChainAddresses,
  opts: DeployOptions,
): Promise<{ registerTx: Hash; stakeTx: Hash; connectTx: Hash }> {
  // 1. Register capacity
  const registerTx = await write(walletClient, {
    address: addrs.capacityRegistry,
    abi: abis.CapacityRegistry,
    functionName: "registerSink",
    args: [opts.taskTypeId, opts.initialCapacity],
  });

  // 2. Approve + stake
  const stakeTx = await write(walletClient, {
    address: addrs.stakeManager,
    abi: abis.StakeManager,
    functionName: "stake",
    args: [opts.stakeAmount],
  });

  // 3. Connect to pool (units set from capacity)
  const connectTx = await write(walletClient, {
    address: addrs.backpressurePool,
    abi: abis.BackpressurePool,
    functionName: "connectSink",
    args: [opts.taskTypeId],
  });

  return { registerTx, stakeTx, connectTx };
}

// ── monitor ──

/**
 * Read live protocol state: sink count, pool units, buffer balance, base fee.
 */
export async function monitor(
  publicClient: PublicClient,
  addrs: ChainAddresses,
): Promise<ProtocolState> {
  const [sinkCount, poolTotalUnits, bufferBalance, baseFee] = await Promise.all([
    read<bigint>(publicClient, {
      address: addrs.capacityRegistry,
      abi: abis.CapacityRegistry,
      functionName: "sinkCount",
    }),
    read<bigint>(publicClient, {
      address: addrs.backpressurePool,
      abi: abis.BackpressurePool,
      functionName: "totalUnits",
    }),
    read<bigint>(publicClient, {
      address: addrs.escrowBuffer,
      abi: abis.EscrowBuffer,
      functionName: "totalBuffered",
    }),
    read<bigint>(publicClient, {
      address: addrs.pricingCurve,
      abi: abis.PricingCurve,
      functionName: "baseFee",
    }),
  ]);

  return { sinkCount, poolTotalUnits, bufferBalance, baseFee };
}
