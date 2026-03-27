/**
 * NVM Nostr event kind definitions.
 *
 * Six new kinds for the agent economy coordination layer.
 * Parameterized replaceable (30000-39999) for mutable state,
 * regular events for immutable records.
 *
 * On-chain equivalents:
 *   Kind 31900 ↔ CapacityRegistry.sol (same EWMA, same α=0.3)
 *   Kind 31901 ↔ CompletionTracker.sol (same dual-sig verification)
 *   Kind 31902 ↔ ReputationLedger.sol (same weighted scoring)
 *   Kind 31903 ↔ BackpressurePool.sol rebalance (same max-weight routing)
 *   Kind 31904 ↔ Pipeline.sol (DAG composition)
 *   Kind 31905 — no on-chain equivalent (live orchestrator state)
 */

/** Event kind constants for the NVM protocol. */
export const NVM_KINDS = {
  // -- Base layer (31900–31905) --
  /** Parameterized replaceable. d-tag = skill type. Published by agents. */
  CAPACITY_ATTESTATION: 31900,
  /** Regular event. Dual-signed proof of completed work. */
  COMPLETION_RECEIPT: 31901,
  /** Parameterized replaceable. d-tag = agent pubkey. Published by routers. */
  QUALITY_SCORE: 31902,
  /** Regular event. Router assigns a job to a specific agent. */
  JOB_ASSIGNMENT: 31903,
  /** Parameterized replaceable. d-tag = pipeline unique ID. DAG workflow. */
  PIPELINE_SPEC: 31904,
  /** Parameterized replaceable. d-tag = pipeline event ID. Live state. */
  PIPELINE_STATE: 31905,

  // -- Advanced systems (31910–31922) --
  /** Parameterized replaceable. d-tag = debtor pubkey. Bilateral credit line. */
  CREDIT_LINE: 31910,
  /** Parameterized replaceable. d-tag = future unique ID. Capacity commitment. */
  CAPACITY_FUTURE: 31911,
  /** Regular event. Records parent→child agent spawn. */
  SPAWNING_EVENT: 31912,
  /** Parameterized replaceable. d-tag = "profile". Aggregated economic resume. */
  AGENT_PROFILE: 31913,
  /** Parameterized replaceable. d-tag = "bridge-config". Cross-NVM bridge setup. */
  BRIDGE_CONFIG: 31914,
  /** Parameterized replaceable. d-tag = protocol ID. Agent-proposed protocol change. */
  PROTOCOL_PROPOSAL: 31915,
  /** Regular event. Endorses a protocol proposal. */
  PROTOCOL_ENDORSEMENT: 31916,
  /** Parameterized replaceable. d-tag = "genome". Agent configuration snapshot. */
  AGENT_GENOME: 31917,
  /** Regular event. Credit line settlement (debt repaid via Lightning). */
  CREDIT_SETTLEMENT: 31918,
  /** Regular event. Credit line default (debtor failed to settle). */
  CREDIT_DEFAULT: 31919,
  /** Regular event. Capacity future matched (buyer ↔ seller execution). */
  FUTURES_EXECUTION: 31920,
  /** Parameterized replaceable. d-tag = agent pubkey. Cross-NVM reputation voucher. */
  REPUTATION_ATTESTATION: 31921,
  /** Regular event. Protocol proposal activated (threshold met). */
  PROTOCOL_ACTIVATION: 31922,
} as const;

// ---------------------------------------------------------------------------
// Typed payloads for each kind
// ---------------------------------------------------------------------------

/** Kind 31900 — agent's declaration of what it can do and current capacity. */
export interface CapacityAttestation {
  skillType: string;
  /** Jobs-per-epoch (epoch = 300s, matching paper). */
  capacity: number;
  /** p50 response time in ms. */
  latencyMs: number;
  /** Errors per 10,000 requests (basis points). */
  errorRateBps: number;
  /** Minimum price per job in millisatoshis. */
  priceMsats: number;
  /** Max simultaneous jobs. */
  maxConcurrent: number;
  /** Model identifier if applicable. */
  model?: string;
  /** Optional reference to on-chain stake tx. */
  stakeProof?: string;
  /** Preferred relay for this agent. */
  relay?: string;
  /** Human-readable metadata. */
  name?: string;
  about?: string;
}

/** Kind 31901 — dual-signed proof that work was completed. */
export interface CompletionReceipt {
  jobRequestEventId: string;
  jobResultEventId: string;
  customerPubkey: string;
  agentPubkey: string;
  skillType: string;
  /** Customer quality rating, 0-10000 (basis points). */
  qualityBps: number;
  /** Actual completion time in ms. */
  latencyMs: number;
  /** Customer's Schnorr signature over receipt hash. */
  customerSig: string;
}

/** Kind 31902 — composite quality score for an agent. */
export interface QualityScore {
  agentPubkey: string;
  /** Composite quality 0-10000 bps. */
  scoreBps: number;
  totalCompletions: number;
  /** Completion rate in bps. */
  completionRateBps: number;
  /** EWMA-smoothed average latency. */
  avgLatencyMs: number;
  /** EWMA-smoothed error rate in bps. */
  errorRateBps: number;
  epoch: number;
  /** Number of epochs in computation window. */
  window: number;
}

/** Kind 31903 — router assigns a job to a specific agent. */
export interface JobAssignment {
  jobRequestEventId: string;
  assignedAgentPubkey: string;
  customerPubkey: string;
  /** The BPE weight score that won the selection. */
  routingScore: number;
  /** True if this was an exploration selection. */
  explored: boolean;
  /** Dynamic price computed for this job (msats). */
  priceMsats: number;
  /** Number of candidate agents considered. */
  alternatives: number;
}

/** A single node in a pipeline DAG. */
export interface PipelineNode {
  id: string;
  /** NIP-90 job request kind number. */
  jobKind: number;
  /** Node IDs this depends on. Empty for root nodes. */
  dependsOn: string[];
  /** Parameters passed to the job request. */
  params: Record<string, unknown>;
}

/** Kind 31904 — a DAG workflow specification (the NVM "program"). */
export interface PipelineSpec {
  pipelineId: string;
  name: string;
  description?: string;
  /** Total budget in millisatoshis. */
  budgetMsats: number;
  /** Unix timestamp deadline. 0 = no deadline. */
  deadline: number;
  nodes: PipelineNode[];
}

/** Kind 31905 — live execution state of a pipeline. */
export interface PipelineState {
  pipelineEventId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  completedNodes: string[];
  pendingNodes: string[];
  failedNodes: string[];
  spentMsats: number;
  elapsedSeconds: number;
}

// ---------------------------------------------------------------------------
// Advanced system payloads (31910–31922)
// ---------------------------------------------------------------------------

/** Kind 31910 — bilateral credit line between two agents. */
export interface CreditLine {
  debtorPubkey: string;
  /** Max outstanding credit in millisatoshis. */
  amountMsats: number;
  /** Unix timestamp when the credit line expires. */
  expires: number;
  /** Annual interest rate in basis points (50 = 0.50%). */
  interestRateBps: number;
  /** Debtor's quality score at extension time (bps). Serves as collateral. */
  collateralQualityBps: number;
}

/** Kind 31911 — commitment to provide future capacity at a fixed price. */
export interface CapacityFuture {
  futureId: string;
  skillType: string;
  /** Number of jobs committed. */
  capacity: number;
  /** Locked price per job (msats). */
  priceMsats: number;
  /** Epoch number at which the future settles. */
  settlementEpoch: number;
  /** Collateral posted by the seller (msats). */
  collateralMsats: number;
}

/** Kind 31912 — records a parent agent spawning a child agent. */
export interface SpawningEvent {
  childPubkey: string;
  /** Sats invested in the child agent. */
  investmentMsats: number;
  /** Parent's ongoing revenue share in basis points (1500 = 15%). */
  revenueShareBps: number;
  skillType: string;
  /** Why the parent decided to spawn this child. */
  rationale: string;
}

/** Kind 31913 — aggregated economic profile / resume for an agent. */
export interface AgentProfile {
  totalCompletions: number;
  totalEarnedMsats: number;
  avgQualityBps: number;
  skillTypes: string[];
  /** Unix timestamp of first completion. */
  activeSince: number;
  creditExtendedMsats: number;
  creditReceivedMsats: number;
  childrenSpawned: number;
  guildMemberships: string[];
  futuresFulfilled: number;
  futuresDefaulted: number;
}

/** Kind 31914 — cross-NVM bridge configuration. */
export interface BridgeConfig {
  privateRelay: string;
  publicRelay: string;
  exportSkills: string[];
  importSkills: string[];
  sanitizationLevel: 'high' | 'medium' | 'low';
  /** Max % of internal capacity to export (0–100). */
  maxExportCapacityPct: number;
}

/** Kind 31915 — agent-proposed protocol change. */
export interface ProtocolProposal {
  protocolId: string;
  title: string;
  description: string;
  /** Number of qualified endorsements needed for activation. */
  activationThreshold: number;
  /** URL or event reference to the implementation spec. */
  implementation: string;
}

/** Kind 31916 — endorsement of a protocol proposal. */
export interface ProtocolEndorsement {
  /** Event ID of the kind-31915 proposal being endorsed. */
  proposalEventId: string;
  /** Endorser's quality score at time of endorsement (bps). */
  endorserQualityBps: number;
}

/** Kind 31917 — agent genome / configuration snapshot at spawn time. */
export interface AgentGenome {
  parentPubkey: string | null;
  generation: number;
  mutationDescription: string;
  /** Quality-adjusted net earnings per epoch. */
  fitness: number;
  /** SHA-256 hash of the full skill configuration. */
  skillConfigHash: string;
}

/** Kind 31918 — settlement of an outstanding credit line. */
export interface CreditSettlement {
  debtorPubkey: string;
  /** Event ID of the original kind-31910 credit line. */
  creditLineEventId: string;
  principalMsats: number;
  interestMsats: number;
  /** Lightning payment proof. */
  paymentPreimage: string;
  status: 'settled';
}

/** Kind 31919 — credit default (debtor failed to settle by expiration). */
export interface CreditDefault {
  debtorPubkey: string;
  creditLineEventId: string;
  outstandingMsats: number;
  /** Penalty applied to debtor's quality score (bps). */
  penaltyBps: number;
}

/** Kind 31920 — capacity future matched (buyer ↔ seller execution). */
export interface FuturesExecution {
  buyerPubkey: string;
  sellerPubkey: string;
  skillType: string;
  capacity: number;
  priceMsats: number;
  settlementEpoch: number;
  collateralLockedMsats: number;
  buyerBidEventId: string;
  sellerOfferEventId: string;
}

/** Kind 31921 — cross-NVM reputation voucher from a bridge agent. */
export interface ReputationAttestation {
  agentPubkey: string;
  privateCompletions: number;
  privateAvgQualityBps: number;
  /** Start of the attested period (unix timestamp). */
  attestationPeriodStart: number;
  attestationPeriodEnd: number;
  /** Sats staked by the bridge to back this attestation. */
  bridgeStakeMsats: number;
}

/** Kind 31922 — protocol proposal activation event. */
export interface ProtocolActivation {
  proposalEventId: string;
  status: 'activated';
  /** Pubkeys of qualified endorsers. */
  endorserPubkeys: string[];
}
