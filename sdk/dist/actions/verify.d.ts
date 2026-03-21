import { type WalletClient, type PublicClient, type Hash, type Hex } from "viem";
import type { ChainAddresses } from "../addresses.js";
/**
 * Convert a vr.dev SHA-256 evidence hash (64-char hex string) to a bytes32 Hex.
 * Accepts both "0x"-prefixed and bare hex strings.
 */
export declare function evidenceHashToBytes32(evidenceHash: string): Hex;
/**
 * Submit a verified completion to CompletionTracker, using the vr.dev evidence
 * hash as the taskId. This binds the on-chain completion record to the
 * off-chain verification evidence.
 *
 * Caller must be the source (msg.sender = source).
 */
export declare function submitVerifiedCompletion(walletClient: WalletClient, addrs: ChainAddresses, taskTypeId: Hex, sink: `0x${string}`, evidenceHash: string, sinkSignature: Hex): Promise<Hash>;
/**
 * Submit a verified OpenClaw skill execution, using the vr.dev evidence hash
 * as the executionId. Both agent and requester signatures are required.
 */
export declare function submitVerifiedExecution(walletClient: WalletClient, addrs: ChainAddresses, agentId: Hash, skillTypeId: Hash, evidenceHash: string, agentOperator: `0x${string}`, agentSig: Hex, requesterSig: Hex): Promise<Hash>;
/**
 * Report a verified outcome to the OpenClaw reputation bridge.
 * PASS verdicts call reportCompletion; FAIL verdicts call reportFailure.
 *
 * Caller must be an authorized reporter on OpenClawReputationBridge.
 */
export declare function reportVerifiedOutcome(walletClient: WalletClient, addrs: ChainAddresses, operator: `0x${string}`, skillTypeId: Hash, passed: boolean): Promise<Hash>;
/**
 * Anchor a Merkle root from vr.dev's evidence chain on-chain.
 * Reverts if the root was already anchored.
 */
export declare function anchorMerkleRoot(walletClient: WalletClient, addrs: ChainAddresses, merkleRoot: Hex): Promise<Hash>;
/**
 * Check whether a Merkle root has been anchored.
 */
export declare function isAnchored(publicClient: PublicClient, addrs: ChainAddresses, merkleRoot: Hex): Promise<boolean>;
