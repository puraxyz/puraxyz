import { type WalletClient, type PublicClient, type Hash, type Hex } from "viem";
import type { ChainAddresses } from "../addresses.js";
import { write, read } from "../helpers.js";
import { abis } from "../abis/index.js";

// ──────────────────── Helpers ────────────────────

/**
 * Convert a vr.dev SHA-256 evidence hash (64-char hex string) to a bytes32 Hex.
 * Accepts both "0x"-prefixed and bare hex strings.
 */
export function evidenceHashToBytes32(evidenceHash: string): Hex {
  const stripped = evidenceHash.startsWith("0x") ? evidenceHash.slice(2) : evidenceHash;
  if (stripped.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(stripped)) {
    throw new Error(`Invalid evidence hash: expected 64 hex chars, got "${evidenceHash}"`);
  }
  return `0x${stripped}` as Hex;
}

// ──────────────────── Verified Completion ────────────────────

/**
 * Submit a verified completion to CompletionTracker, using the vr.dev evidence
 * hash as the taskId. This binds the on-chain completion record to the
 * off-chain verification evidence.
 *
 * Caller must be the source (msg.sender = source).
 */
export async function submitVerifiedCompletion(
  walletClient: WalletClient,
  addrs: ChainAddresses,
  taskTypeId: Hex,
  sink: `0x${string}`,
  evidenceHash: string,
  sinkSignature: Hex,
): Promise<Hash> {
  const taskId = evidenceHashToBytes32(evidenceHash);
  return write(walletClient, {
    address: addrs.completionTracker, abi: abis.CompletionTracker,
    functionName: "recordCompletion", args: [taskTypeId, sink, taskId, sinkSignature],
  });
}

// ──────────────────── Verified Execution (OpenClaw) ────────────────────

/**
 * Submit a verified OpenClaw skill execution, using the vr.dev evidence hash
 * as the executionId. Both agent and requester signatures are required.
 */
export async function submitVerifiedExecution(
  walletClient: WalletClient,
  addrs: ChainAddresses,
  agentId: Hash,
  skillTypeId: Hash,
  evidenceHash: string,
  agentOperator: `0x${string}`,
  agentSig: Hex,
  requesterSig: Hex,
): Promise<Hash> {
  const executionId = evidenceHashToBytes32(evidenceHash);
  return write(walletClient, {
    address: addrs.openClawCompletionVerifier, abi: abis.OpenClawCompletionVerifier,
    functionName: "verifyExecution",
    args: [agentId, skillTypeId, executionId, agentOperator, agentSig, requesterSig],
  });
}

// ──────────────────── Reputation Reporting ────────────────────

/**
 * Report a verified outcome to the OpenClaw reputation bridge.
 * PASS verdicts call reportCompletion; FAIL verdicts call reportFailure.
 *
 * Caller must be an authorized reporter on OpenClawReputationBridge.
 */
export async function reportVerifiedOutcome(
  walletClient: WalletClient,
  addrs: ChainAddresses,
  operator: `0x${string}`,
  skillTypeId: Hash,
  passed: boolean,
): Promise<Hash> {
  const functionName = passed ? "reportCompletion" : "reportFailure";
  return write(walletClient, {
    address: addrs.openClawReputationBridge, abi: abis.OpenClawReputationBridge,
    functionName, args: [operator, skillTypeId],
  });
}

// ──────────────────── Merkle Root Anchoring ────────────────────

/**
 * Anchor a Merkle root from vr.dev's evidence chain on-chain.
 * Reverts if the root was already anchored.
 */
export async function anchorMerkleRoot(
  walletClient: WalletClient,
  addrs: ChainAddresses,
  merkleRoot: Hex,
): Promise<Hash> {
  return write(walletClient, {
    address: addrs.merkleRootAnchor, abi: abis.MerkleRootAnchor,
    functionName: "anchor", args: [merkleRoot],
  });
}

/**
 * Check whether a Merkle root has been anchored.
 */
export async function isAnchored(
  publicClient: PublicClient,
  addrs: ChainAddresses,
  merkleRoot: Hex,
): Promise<boolean> {
  return read<boolean>(publicClient, {
    address: addrs.merkleRootAnchor, abi: abis.MerkleRootAnchor,
    functionName: "isAnchored", args: [merkleRoot],
  });
}
