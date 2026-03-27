/**
 * Event builders — construct unsigned Nostr events for each NVM kind.
 *
 * Each builder produces an UnsignedEvent (no `id` or `sig`).
 * Sign with nostr-tools `finalizeEvent()` before publishing.
 */

import type { UnsignedEvent } from 'nostr-tools';
import { NVM_KINDS } from './kinds.js';
import type {
  CapacityAttestation,
  CompletionReceipt,
  QualityScore,
  JobAssignment,
  PipelineSpec,
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
} from './kinds.js';

function now(): number {
  return Math.floor(Date.now() / 1000);
}

/** Kind 31900 — capacity attestation (parameterized replaceable, d = skillType). */
export function buildCapacityAttestation(
  pubkey: string,
  data: CapacityAttestation,
): UnsignedEvent {
  const tags: string[][] = [
    ['d', data.skillType],
    ['capacity', String(data.capacity)],
    ['latency_ms', String(data.latencyMs)],
    ['error_rate_bps', String(data.errorRateBps)],
    ['price_msats', String(data.priceMsats)],
    ['max_concurrent', String(data.maxConcurrent)],
  ];
  if (data.model) tags.push(['model', data.model]);
  if (data.stakeProof) tags.push(['stake_proof', data.stakeProof]);
  if (data.relay) tags.push(['relay', data.relay]);

  const content: Record<string, string> = {};
  if (data.name) content.name = data.name;
  if (data.about) content.about = data.about;

  return {
    kind: NVM_KINDS.CAPACITY_ATTESTATION,
    pubkey,
    created_at: now(),
    tags,
    content: JSON.stringify(content),
  };
}

/** Kind 31901 — completion receipt (regular event, dual-signed). */
export function buildCompletionReceipt(
  agentPubkey: string,
  data: CompletionReceipt,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.COMPLETION_RECEIPT,
    pubkey: agentPubkey,
    created_at: now(),
    tags: [
      ['e', data.jobRequestEventId],
      ['e', data.jobResultEventId],
      ['p', data.customerPubkey],
      ['d', data.skillType],
      ['quality', String(data.qualityBps)],
      ['latency_ms', String(data.latencyMs)],
      ['customer_sig', data.customerSig],
    ],
    content: '',
  };
}

/** Kind 31902 — quality score (parameterized replaceable, d = agent pubkey). */
export function buildQualityScore(
  routerPubkey: string,
  data: QualityScore,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.QUALITY_SCORE,
    pubkey: routerPubkey,
    created_at: now(),
    tags: [
      ['d', data.agentPubkey],
      ['score', String(data.scoreBps)],
      ['completions', String(data.totalCompletions)],
      ['completion_rate_bps', String(data.completionRateBps)],
      ['avg_latency_ms', String(data.avgLatencyMs)],
      ['error_rate_bps', String(data.errorRateBps)],
      ['epoch', String(data.epoch)],
      ['window', String(data.window)],
    ],
    content: '',
  };
}

/** Kind 31903 — job assignment (regular event). */
export function buildJobAssignment(
  routerPubkey: string,
  data: JobAssignment,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.JOB_ASSIGNMENT,
    pubkey: routerPubkey,
    created_at: now(),
    tags: [
      ['e', data.jobRequestEventId],
      ['p', data.assignedAgentPubkey],
      ['p', data.customerPubkey],
      ['routing_score', String(data.routingScore)],
      ['explored', data.explored ? 'true' : 'false'],
      ['price_msats', String(data.priceMsats)],
      ['alternatives', String(data.alternatives)],
    ],
    content: '',
  };
}

/** Kind 31904 — pipeline specification (parameterized replaceable, d = pipelineId). */
export function buildPipelineSpec(
  customerPubkey: string,
  data: PipelineSpec,
): UnsignedEvent {
  const tags: string[][] = [
    ['d', data.pipelineId],
    ['budget_msats', String(data.budgetMsats)],
    ['deadline', String(data.deadline)],
  ];
  for (const node of data.nodes) {
    tags.push([
      'node',
      node.id,
      String(node.jobKind),
      node.dependsOn.join(','),
      JSON.stringify(node.params),
    ]);
  }

  return {
    kind: NVM_KINDS.PIPELINE_SPEC,
    pubkey: customerPubkey,
    created_at: now(),
    tags,
    content: JSON.stringify({ name: data.name, description: data.description }),
  };
}

/** Kind 31905 — pipeline state (parameterized replaceable, d = pipeline event id). */
export function buildPipelineState(
  orchestratorPubkey: string,
  data: PipelineState,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.PIPELINE_STATE,
    pubkey: orchestratorPubkey,
    created_at: now(),
    tags: [
      ['d', data.pipelineEventId],
      ['status', data.status],
      ['completed', data.completedNodes.join(',')],
      ['pending', data.pendingNodes.join(',')],
      ['failed', data.failedNodes.join(',')],
      ['spent_msats', String(data.spentMsats)],
      ['elapsed_s', String(data.elapsedSeconds)],
    ],
    content: '',
  };
}

// ---------------------------------------------------------------------------
// Advanced system builders (31910–31922)
// ---------------------------------------------------------------------------

/** Kind 31910 — credit line (parameterized replaceable, d = debtor pubkey). */
export function buildCreditLine(
  creditorPubkey: string,
  data: CreditLine,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.CREDIT_LINE,
    pubkey: creditorPubkey,
    created_at: now(),
    tags: [
      ['d', data.debtorPubkey],
      ['amount_msats', String(data.amountMsats)],
      ['expires', String(data.expires)],
      ['interest_rate_bps', String(data.interestRateBps)],
      ['collateral', String(data.collateralQualityBps)],
    ],
    content: '',
  };
}

/** Kind 31911 — capacity future (parameterized replaceable, d = future ID). */
export function buildCapacityFuture(
  agentPubkey: string,
  data: CapacityFuture,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.CAPACITY_FUTURE,
    pubkey: agentPubkey,
    created_at: now(),
    tags: [
      ['d', data.futureId],
      ['skill_type', data.skillType],
      ['capacity', String(data.capacity)],
      ['price_msats', String(data.priceMsats)],
      ['settlement_epoch', String(data.settlementEpoch)],
      ['collateral_msats', String(data.collateralMsats)],
    ],
    content: '',
  };
}

/** Kind 31912 — spawning event (regular event). */
export function buildSpawningEvent(
  parentPubkey: string,
  data: SpawningEvent,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.SPAWNING_EVENT,
    pubkey: parentPubkey,
    created_at: now(),
    tags: [
      ['d', data.childPubkey],
      ['investment_msats', String(data.investmentMsats)],
      ['revenue_share_bps', String(data.revenueShareBps)],
      ['skill_type', data.skillType],
      ['rationale', data.rationale],
    ],
    content: '',
  };
}

/** Kind 31913 — agent economic profile (parameterized replaceable, d = "profile"). */
export function buildAgentProfile(
  agentPubkey: string,
  data: AgentProfile,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.AGENT_PROFILE,
    pubkey: agentPubkey,
    created_at: now(),
    tags: [
      ['d', 'profile'],
      ['total_completions', String(data.totalCompletions)],
      ['total_earned_msats', String(data.totalEarnedMsats)],
      ['avg_quality_bps', String(data.avgQualityBps)],
      ['skill_types', data.skillTypes.join(',')],
      ['active_since', String(data.activeSince)],
      ['credit_extended_msats', String(data.creditExtendedMsats)],
      ['credit_received_msats', String(data.creditReceivedMsats)],
      ['children_spawned', String(data.childrenSpawned)],
      ['guild_memberships', data.guildMemberships.join(',')],
      ['futures_fulfilled', String(data.futuresFulfilled)],
      ['futures_defaulted', String(data.futuresDefaulted)],
    ],
    content: '',
  };
}

/** Kind 31914 — bridge config (parameterized replaceable, d = "bridge-config"). */
export function buildBridgeConfig(
  bridgePubkey: string,
  data: BridgeConfig,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.BRIDGE_CONFIG,
    pubkey: bridgePubkey,
    created_at: now(),
    tags: [
      ['d', 'bridge-config'],
      ['private_relay', data.privateRelay],
      ['public_relay', data.publicRelay],
      ['export_skills', data.exportSkills.join(',')],
      ['import_skills', data.importSkills.join(',')],
      ['sanitization_level', data.sanitizationLevel],
      ['max_export_capacity_pct', String(data.maxExportCapacityPct)],
    ],
    content: '',
  };
}

/** Kind 31915 — protocol proposal (parameterized replaceable, d = protocol ID). */
export function buildProtocolProposal(
  proposerPubkey: string,
  data: ProtocolProposal,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.PROTOCOL_PROPOSAL,
    pubkey: proposerPubkey,
    created_at: now(),
    tags: [
      ['d', data.protocolId],
      ['title', data.title],
      ['description', data.description],
      ['activation_threshold', String(data.activationThreshold)],
      ['implementation', data.implementation],
    ],
    content: '',
  };
}

/** Kind 31916 — protocol endorsement (regular event). */
export function buildProtocolEndorsement(
  endorserPubkey: string,
  data: ProtocolEndorsement,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.PROTOCOL_ENDORSEMENT,
    pubkey: endorserPubkey,
    created_at: now(),
    tags: [
      ['e', data.proposalEventId],
      ['endorser_quality_bps', String(data.endorserQualityBps)],
    ],
    content: '',
  };
}

/** Kind 31917 — agent genome (parameterized replaceable, d = "genome"). */
export function buildAgentGenome(
  agentPubkey: string,
  data: AgentGenome,
): UnsignedEvent {
  const tags: string[][] = [
    ['d', 'genome'],
    ['generation', String(data.generation)],
    ['mutation_description', data.mutationDescription],
    ['fitness', String(data.fitness)],
    ['skill_config_hash', data.skillConfigHash],
  ];
  if (data.parentPubkey) tags.push(['parent', data.parentPubkey]);
  return {
    kind: NVM_KINDS.AGENT_GENOME,
    pubkey: agentPubkey,
    created_at: now(),
    tags,
    content: '',
  };
}

/** Kind 31918 — credit settlement (regular event). */
export function buildCreditSettlement(
  creditorPubkey: string,
  data: CreditSettlement,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.CREDIT_SETTLEMENT,
    pubkey: creditorPubkey,
    created_at: now(),
    tags: [
      ['p', data.debtorPubkey],
      ['credit_line', data.creditLineEventId],
      ['principal_msats', String(data.principalMsats)],
      ['interest_msats', String(data.interestMsats)],
      ['payment_preimage', data.paymentPreimage],
      ['status', data.status],
    ],
    content: '',
  };
}

/** Kind 31919 — credit default (regular event). */
export function buildCreditDefault(
  creditorPubkey: string,
  data: CreditDefault,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.CREDIT_DEFAULT,
    pubkey: creditorPubkey,
    created_at: now(),
    tags: [
      ['p', data.debtorPubkey],
      ['credit_line', data.creditLineEventId],
      ['outstanding_msats', String(data.outstandingMsats)],
      ['penalty_bps', String(data.penaltyBps)],
    ],
    content: '',
  };
}

/** Kind 31920 — futures execution (regular event). */
export function buildFuturesExecution(
  matchingEnginePubkey: string,
  data: FuturesExecution,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.FUTURES_EXECUTION,
    pubkey: matchingEnginePubkey,
    created_at: now(),
    tags: [
      ['p', data.buyerPubkey],
      ['p', data.sellerPubkey],
      ['skill_type', data.skillType],
      ['capacity', String(data.capacity)],
      ['price_msats', String(data.priceMsats)],
      ['settlement_epoch', String(data.settlementEpoch)],
      ['collateral_locked_msats', String(data.collateralLockedMsats)],
      ['buyer_bid_event', data.buyerBidEventId],
      ['seller_offer_event', data.sellerOfferEventId],
    ],
    content: '',
  };
}

/** Kind 31921 — reputation attestation (parameterized replaceable, d = agent pubkey). */
export function buildReputationAttestation(
  bridgePubkey: string,
  data: ReputationAttestation,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.REPUTATION_ATTESTATION,
    pubkey: bridgePubkey,
    created_at: now(),
    tags: [
      ['d', data.agentPubkey],
      ['private_completions', String(data.privateCompletions)],
      ['private_avg_quality_bps', String(data.privateAvgQualityBps)],
      ['attestation_period_start', String(data.attestationPeriodStart)],
      ['attestation_period_end', String(data.attestationPeriodEnd)],
      ['bridge_stake_msats', String(data.bridgeStakeMsats)],
    ],
    content: '',
  };
}

/** Kind 31922 — protocol activation (regular event). */
export function buildProtocolActivation(
  routerPubkey: string,
  data: ProtocolActivation,
): UnsignedEvent {
  return {
    kind: NVM_KINDS.PROTOCOL_ACTIVATION,
    pubkey: routerPubkey,
    created_at: now(),
    tags: [
      ['e', data.proposalEventId],
      ['status', data.status],
      ...data.endorserPubkeys.map((p) => ['p', p]),
    ],
    content: '',
  };
}
