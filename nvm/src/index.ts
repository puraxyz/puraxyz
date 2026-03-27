/**
 * NVM — Nostr Virtual Machine
 *
 * Capacity-aware agent routing on Nostr + Lightning.
 * Implements the BPE (Backpressure Economics) protocol over Nostr events,
 * with Lightning payments via NIP-57 zaps.
 *
 * Same math as the on-chain contracts (CapacityRegistry, BackpressurePool,
 * PricingCurve, CompletionTracker), different transport.
 */

// Client
export { NostrClient } from './client/NostrClient.js';
export type { NostrClientConfig, RelayStatus } from './client/NostrClient.js';
export { generateKeypair, loadKeypair, npubEncode, nsecEncode } from './client/keys.js';

// Event kinds and builders
export { NVM_KINDS } from './events/kinds.js';
export type {
  CapacityAttestation,
  CompletionReceipt,
  QualityScore,
  JobAssignment,
  PipelineSpec,
  PipelineNode,
  PipelineState,
  CreditLine,
  CapacityFuture,
  SpawningEvent,
  AgentProfile,
  BridgeConfig,
  ProtocolProposal,
  ProtocolEndorsement,
  AgentGenome,
  CreditSettlement,
  CreditDefault,
  FuturesExecution,
  ReputationAttestation,
  ProtocolActivation,
} from './events/kinds.js';
export {
  buildCapacityAttestation,
  buildCompletionReceipt,
  buildQualityScore,
  buildJobAssignment,
  buildPipelineSpec,
  buildPipelineState,
  buildCreditLine,
  buildCapacityFuture,
  buildSpawningEvent,
  buildAgentProfile,
  buildBridgeConfig,
  buildProtocolProposal,
  buildProtocolEndorsement,
  buildAgentGenome,
  buildCreditSettlement,
  buildCreditDefault,
  buildFuturesExecution,
  buildReputationAttestation,
  buildProtocolActivation,
} from './events/builders.js';
export { validateCapacityAttestation, validateCompletionReceipt } from './events/validators.js';

// Capacity
export { EWMACapacityCache } from './capacity/cache.js';
export { CapacityPublisher } from './capacity/publisher.js';
export { ewma } from './capacity/ewma.js';
export { measureLoad } from './capacity/metrics.js';

// Routing
export { routeJob } from './routing/router.js';
export { computeWeight, coefficientOfVariation } from './routing/scoring.js';
export { computeDynamicPrice, adjustBaseFee } from './routing/pricing.js';
export { ROUTING_DEFAULTS } from './routing/config.js';
export type { RoutingConfig } from './routing/config.js';
export { publishAssignment } from './routing/assigner.js';

// Verification
export { createReceipt, verifyReceipt } from './verification/receipts.js';
export { QualityComputer } from './verification/quality.js';
export { compositeScore, normalizeLatency, normalizeErrorRate } from './verification/scoring.js';

// Payments
export { createZap, monitorZaps } from './payments/lightning.js';
export { IncomeTracker } from './payments/income.js';
export type { LightningConfig } from './payments/config.js';

// Orchestrator
export { DAG } from './orchestrator/dag.js';
export { parsePipelineEvent } from './orchestrator/parser.js';
export { PipelineExecutor } from './orchestrator/executor.js';
export { PipelineStatePublisher } from './orchestrator/state.js';

// Relay
export { AgentRelay } from './relay/index.js';
export { CapacityIndex } from './relay/capacityIndex.js';
export { RoutingService } from './relay/routingService.js';
export { QualityComputerService } from './relay/qualityComputer.js';

// Reputation
export { ReputationComputer } from './reputation/computer.js';
export { ReputationPublisher } from './reputation/publisher.js';

// Credit
export { CreditGraph } from './credit/graph.js';
export { dispatchWithCredit } from './credit/dispatch.js';
export { CreditSettler } from './credit/settlement.js';

// Spawning
export { detectOpportunities } from './spawning/detector.js';
export type { MarketOpportunity } from './spawning/detector.js';
export { executeSpawn, checkEligibility, SPAWN_DEFAULTS } from './spawning/pipeline.js';
export type { SpawnConfig, SpawnResult } from './spawning/pipeline.js';
export { SpawningManager } from './spawning/manager.js';

// Genome
export { GenomeTracker } from './genome/tracker.js';
export type { TrackedGenome } from './genome/tracker.js';
export { buildPhylogenyTree, phylogenyStats } from './genome/phylogeny.js';
export type { PhylogenyNode } from './genome/phylogeny.js';

// Futures
export { FuturesOrderbook } from './futures/orderbook.js';
export type { OrderbookEntry } from './futures/orderbook.js';
export { findMatches } from './futures/matcher.js';
export type { FuturesMatch } from './futures/matcher.js';
export { priceSnapshot, allPriceSnapshots } from './futures/oracle.js';
export type { PriceSnapshot } from './futures/oracle.js';

// Bridge
export { BridgeRegistry } from './bridge/agent.js';
export type { TrackedBridge } from './bridge/agent.js';
export { sanitizeForBridge, hasBridgeAttestation } from './bridge/sanitizer.js';
export { AttestationStore, publishAttestation } from './bridge/attestation.js';
export type { AttestationRecord } from './bridge/attestation.js';

// Protocol
export { ProposalRegistry } from './protocol/proposal.js';
export type { TrackedProposal } from './protocol/proposal.js';
export { ProtocolRegistry } from './protocol/registry.js';
export type { ActiveProtocol } from './protocol/registry.js';
