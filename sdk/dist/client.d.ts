/**
 * High-level Pura client — three functions: route, deploy, monitor.
 *
 * Wraps the low-level action modules into a simple interface for the
 * common case: send a request through the Pura gateway, deploy a
 * provider into a pool, or read live protocol state.
 */
import type { PublicClient, WalletClient, Hash } from "viem";
import type { ChainAddresses } from "./addresses.js";
export interface RouteOptions {
    /** Gateway base URL. Defaults to https://api.pura.xyz */
    gateway?: string;
    /** Model identifier (OpenAI-compatible). Defaults to gpt-4o-mini */
    model?: string;
    /** API key (pura_... format) */
    apiKey: string;
    /** Chat messages array */
    messages: Array<{
        role: string;
        content: string;
    }>;
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
/**
 * Send a chat completion through the Pura gateway.
 * Returns the response content plus routing metadata headers.
 */
export declare function route(opts: RouteOptions): Promise<RouteResult>;
/**
 * Register as a provider: register capacity, stake, and join the pool.
 * Returns the three transaction hashes.
 */
export declare function deploy(walletClient: WalletClient, addrs: ChainAddresses, opts: DeployOptions): Promise<{
    registerTx: Hash;
    stakeTx: Hash;
    connectTx: Hash;
}>;
/**
 * Read live protocol state: sink count, pool units, buffer balance, base fee.
 */
export declare function monitor(publicClient: PublicClient, addrs: ChainAddresses): Promise<ProtocolState>;
