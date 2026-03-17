import type { DiagramProps } from "../components/AnimatedDiagram";
import type { SequenceProps } from "../components/AnimatedSequence";

/* ────────────────────────────────────────────────────────────────
   16 diagram configs for the explainer page.
   Positions use relative coords (0-1) mapped to canvas at render time.
   ──────────────────────────────────────────────────────────────── */

// ── #1  Problem: 3 agents → 1 overloaded LLM ───────────────────
export const problemDiagram: DiagramProps = {
  direction: "LR",
  height: 220,
  ariaLabel: "Three agents overwhelm a single LLM agent with payment streams",
  nodes: [
    { id: "A", label: "Translation Agent\nSending $10/min", x: 0.05, y: 0.15, color: "#6366f1" },
    { id: "C", label: "Chat Agent\nSending $5/min",        x: 0.05, y: 0.50, color: "#6366f1" },
    { id: "D", label: "Writing Agent\nSending $8/min",     x: 0.05, y: 0.85, color: "#6366f1" },
    { id: "B", label: "LLM Agent\nAt capacity!",           x: 0.85, y: 0.50, color: "#be123c" },
  ],
  edges: [
    { from: "A", to: "B", label: "payment stream" },
    { from: "C", to: "B", label: "payment stream" },
    { from: "D", to: "B", label: "payment stream" },
  ],
};

// ── #2  Solution: weighted routing ──────────────────────────────
export const solutionDiagram: DiagramProps = {
  direction: "LR",
  height: 200,
  ariaLabel: "Translation agent routes $7/min to a 70%-free agent and $3/min to a 30%-free agent",
  nodes: [
    { id: "A", label: "Translation Agent\nSending $10/min", x: 0.05, y: 0.50, color: "#6366f1" },
    { id: "B", label: "LLM Agent A\n70% free",              x: 0.85, y: 0.20, color: "#0d9488" },
    { id: "C", label: "LLM Agent B\n30% free",              x: 0.85, y: 0.80, color: "#a16207" },
  ],
  edges: [
    { from: "A", to: "B", label: "$7/min" },
    { from: "A", to: "C", label: "$3/min" },
  ],
};

// ── #3  Pipeline: 5-step flow ───────────────────────────────────
export const pipelineDiagram: DiagramProps = {
  direction: "TB",
  height: 340,
  ariaLabel: "Five-step BPE pipeline: Declare, Verify, Price, Route, Buffer",
  nodes: [
    { id: "S1", label: "1 · DECLARE\nAgents announce capacity",         x: 0.50, y: 0.05, color: "#2563eb" },
    { id: "S2", label: "2 · VERIFY\nSystem checks truthfulness",        x: 0.50, y: 0.25, color: "#6366f1" },
    { id: "S3", label: "3 · PRICE\nBusy agents cost more",              x: 0.50, y: 0.45, color: "#d97706" },
    { id: "S4", label: "4 · ROUTE\nPayments flow to capacity",          x: 0.50, y: 0.65, color: "#0d9488" },
    { id: "S5", label: "5 · BUFFER\nOverflow held in escrow",           x: 0.50, y: 0.85, color: "#a16207" },
  ],
  edges: [
    { from: "S1", to: "S2" },
    { from: "S2", to: "S3" },
    { from: "S3", to: "S4" },
    { from: "S4", to: "S5" },
  ],
};

// ── #4  Declare / Stake sublinearity ────────────────────────────
export const stakeDiagram: DiagramProps = {
  direction: "LR",
  height: 200,
  ariaLabel: "Depositing 100 tokens gives capacity 10; depositing 400 tokens gives capacity 20 (sublinear)",
  nodes: [
    { id: "A", label: "Agent deposits\n100 tokens",        x: 0.05, y: 0.25, color: "#374151" },
    { id: "B", label: "Capacity: 10",                      x: 0.55, y: 0.25, color: "#2563eb" },
    { id: "C", label: "Agent deposits\n400 tokens",        x: 0.05, y: 0.75, color: "#374151" },
    { id: "D", label: "Capacity: 20",                      x: 0.55, y: 0.75, color: "#2563eb" },
  ],
  edges: [
    { from: "A", to: "B", label: "stake" },
    { from: "C", to: "D", label: "stake" },
  ],
};

// ── #5  Verify: sequence diagram ────────────────────────────────
export const verifySequence: SequenceProps = {
  height: 280,
  ariaLabel: "Sequence: Source sends task to Sink, Sink does work, returns signed receipt, Source submits to blockchain, blockchain counts completions and may slash",
  participants: [
    { id: "source", label: "App (Source)",      color: "#6366f1" },
    { id: "sink",   label: "AI Agent (Sink)",   color: "#0d9488" },
    { id: "chain",  label: "Blockchain",        color: "#d97706" },
  ],
  messages: [
    { from: "source", to: "sink",   label: "Send task request" },
    { from: "sink",   to: "sink",   label: "Do the work", self: true },
    { from: "sink",   to: "source", label: "Return result + sign receipt" },
    { from: "source", to: "chain",  label: "Submit receipt (both sigs)" },
    { from: "chain",  to: "chain",  label: "Count completions vs declared", self: true },
  ],
  notes: [
    { over: "chain", text: "If completions < 50% for 3 periods → slash!" },
  ],
};

// ── #6  Price: 3-tier escalation ────────────────────────────────
export const priceDiagram: DiagramProps = {
  direction: "LR",
  height: 200,
  ariaLabel: "Pricing escalation: low demand $1/task, medium demand $1.80/task, high demand $5/task",
  nodes: [
    { id: "A1", label: "Low demand\nQueue: 2",     x: 0.0,  y: 0.50, color: "#0d9488" },
    { id: "B1", label: "$1.00/task",               x: 0.20, y: 0.50, color: "#0d9488", shape: "pill" },
    { id: "A2", label: "Medium demand\nQueue: 10",  x: 0.38, y: 0.50, color: "#a16207" },
    { id: "B2", label: "$1.80/task",               x: 0.58, y: 0.50, color: "#a16207", shape: "pill" },
    { id: "A3", label: "High demand\nQueue: 50",    x: 0.76, y: 0.50, color: "#be123c" },
    { id: "B3", label: "$5.00/task",               x: 0.96, y: 0.50, color: "#be123c", shape: "pill" },
  ],
  edges: [
    { from: "A1", to: "B1" },
    { from: "B1", to: "A2" },
    { from: "A2", to: "B2" },
    { from: "B2", to: "A3" },
    { from: "A3", to: "B3" },
  ],
};

// ── #7  Route: sources → pool → agents ──────────────────────────
export const routeDiagram: DiagramProps = {
  direction: "TB",
  height: 300,
  ariaLabel: "Three payment sources flow into a Backpressure Pool which routes to three agents weighted by capacity",
  nodes: [
    { id: "P1",   label: "Source 1\n$5/min",       x: 0.15, y: 0.05, color: "#a1a1aa" },
    { id: "P2",   label: "Source 2\n$3/min",       x: 0.50, y: 0.05, color: "#a1a1aa" },
    { id: "P3",   label: "Source 3\n$7/min",       x: 0.85, y: 0.05, color: "#a1a1aa" },
    { id: "Pool", label: "Backpressure Pool\n$15/min total", x: 0.50, y: 0.45, color: "#2563eb" },
    { id: "S1",   label: "Agent A — 50% cap\nGets $7.50/min", x: 0.15, y: 0.90, color: "#0d9488" },
    { id: "S2",   label: "Agent B — 30% cap\nGets $4.50/min", x: 0.50, y: 0.90, color: "#0d9488" },
    { id: "S3",   label: "Agent C — 20% cap\nGets $3.00/min", x: 0.85, y: 0.90, color: "#0d9488" },
  ],
  edges: [
    { from: "P1", to: "Pool" },
    { from: "P2", to: "Pool" },
    { from: "P3", to: "Pool" },
    { from: "Pool", to: "S1" },
    { from: "Pool", to: "S2" },
    { from: "Pool", to: "S3" },
  ],
};

// ── #8  Buffer: decision → pool or escrow ───────────────────────
export const bufferDiagram: DiagramProps = {
  direction: "LR",
  height: 220,
  ariaLabel: "Incoming payments checked for capacity: if available route to pool, otherwise hold in escrow buffer",
  nodes: [
    { id: "IN",     label: "Incoming\n$20/min",           x: 0.0,  y: 0.40, color: "#a1a1aa" },
    { id: "CHECK",  label: "Any capacity\navailable?",    x: 0.30, y: 0.40, color: "#475569", shape: "diamond" },
    { id: "POOL",   label: "Backpressure Pool\nRoutes to agents", x: 0.75, y: 0.15, color: "#0d9488" },
    { id: "BUFFER", label: "Escrow Buffer\nHolds excess safely",  x: 0.75, y: 0.70, color: "#a16207" },
  ],
  edges: [
    { from: "IN", to: "CHECK" },
    { from: "CHECK", to: "POOL", label: "Yes" },
    { from: "CHECK", to: "BUFFER", label: "No" },
    { from: "BUFFER", to: "POOL", label: "When capacity frees up", dashed: true },
  ],
};

// ── #9  Big Picture: off-chain / on-chain architecture ──────────
export const bigPictureDiagram: DiagramProps = {
  direction: "TB",
  height: 380,
  ariaLabel: "Full BPE architecture: off-chain attestations feed on-chain aggregator, registry, pool, pricing, escrow, and completion tracker",
  groups: [
    { id: "offchain", label: "Off-chain (fast, free)",      x: 0.25, y: 0.0, w: 0.50, h: 0.12, color: "#475569" },
    { id: "onchain",  label: "On-chain (secure, permanent)", x: 0.0,  y: 0.22, w: 1.0, h: 0.78, color: "#334155" },
  ],
  nodes: [
    { id: "ATTEST", label: "Agents sign capacity\nattestations off-chain", x: 0.50, y: 0.05, color: "#374151" },
    { id: "AGG",    label: "Aggregator\nBatches attestations",  x: 0.25, y: 0.30, color: "#6366f1" },
    { id: "SM",     label: "Stake Manager\nDeposits & caps",   x: 0.75, y: 0.30, color: "#2563eb" },
    { id: "REG",    label: "Capacity Registry\nTracks capacity", x: 0.50, y: 0.48, color: "#2563eb" },
    { id: "POOL",   label: "Backpressure Pool\nRoutes payments", x: 0.30, y: 0.68, color: "#0d9488" },
    { id: "PRICE",  label: "Pricing Curve\nDynamic fees",       x: 0.70, y: 0.68, color: "#d97706" },
    { id: "GDA",    label: "Superfluid Streams\nContinuous payments", x: 0.15, y: 0.88, color: "#0d9488" },
    { id: "BUF",    label: "Escrow Buffer\nOverflow safety",    x: 0.45, y: 0.88, color: "#a16207" },
    { id: "COMP",   label: "Completion Tracker\nVerifies work", x: 0.78, y: 0.88, color: "#be123c" },
  ],
  edges: [
    { from: "ATTEST", to: "AGG" },
    { from: "AGG", to: "REG" },
    { from: "SM", to: "REG" },
    { from: "REG", to: "POOL" },
    { from: "REG", to: "PRICE" },
    { from: "POOL", to: "GDA" },
    { from: "POOL", to: "BUF" },
    { from: "COMP", to: "SM", label: "slash if lying", dashed: true, color: "#be123c" },
  ],
};

// ── #10  Five Domains ───────────────────────────────────────────
export const domainsDiagram: DiagramProps = {
  direction: "TB",
  height: 300,
  ariaLabel: "Five domains (AI Agents, Lightning, Nostr, Demurrage, OpenClaw) connect to Core BPE which connects to Platform Layer",
  nodes: [
    { id: "AI",    label: "AI Agents\n8 contracts",   x: 0.10, y: 0.05, color: "#0d9488" },
    { id: "LN",    label: "Lightning\n3 contracts",    x: 0.30, y: 0.05, color: "#a16207" },
    { id: "NOSTR", label: "Nostr Relays\n2 contracts", x: 0.50, y: 0.05, color: "#6366f1" },
    { id: "DEM",   label: "Demurrage\n2 contracts",    x: 0.70, y: 0.05, color: "#d97706" },
    { id: "OC",    label: "OpenClaw\n3 contracts",     x: 0.90, y: 0.05, color: "#be123c" },
    { id: "CORE",  label: "Core BPE\nCapacity Registry · Stake Manager\nBackpressure Pool · Pricing\nCompletion Tracker · Buffer", x: 0.50, y: 0.50, color: "#2563eb" },
    { id: "PLAT",  label: "Platform Layer\nUniversal Adapter + Reputation", x: 0.50, y: 0.92, color: "#374151" },
  ],
  edges: [
    { from: "AI",    to: "CORE" },
    { from: "LN",    to: "CORE" },
    { from: "NOSTR", to: "CORE" },
    { from: "DEM",   to: "CORE" },
    { from: "OC",    to: "CORE" },
    { from: "CORE",  to: "PLAT" },
  ],
};

// ── #11  Lightning ──────────────────────────────────────────────
export const lightningDiagram: DiagramProps = {
  direction: "TB",
  height: 340,
  ariaLabel: "Lightning nodes submit attestations to a capacity oracle which feeds a routing pool. A cross-protocol router selects Lightning, Superfluid, or on-chain",
  groups: [
    { id: "lnodes", label: "Lightning Nodes", x: 0.10, y: 0.0, w: 0.80, h: 0.16, color: "#a16207" },
  ],
  nodes: [
    { id: "N1", label: "Node A\n5 BTC capacity",     x: 0.20, y: 0.06, color: "#a16207" },
    { id: "N2", label: "Node B\n2 BTC capacity",     x: 0.50, y: 0.06, color: "#a16207" },
    { id: "N3", label: "Node C\n0.5 BTC capacity",   x: 0.80, y: 0.06, color: "#a16207" },
    { id: "ORACLE", label: "Lightning Capacity\nOracle (EWMA)", x: 0.50, y: 0.35, color: "#a16207" },
    { id: "RPOOL",  label: "Lightning Routing\nPool",           x: 0.50, y: 0.58, color: "#0d9488" },
    { id: "ROUTER", label: "Cross-Protocol\nRouter",            x: 0.50, y: 0.82, color: "#2563eb" },
    { id: "LN",     label: "Lightning",    x: 0.15, y: 0.95, color: "#a16207", shape: "pill" },
    { id: "SF",     label: "Superfluid",   x: 0.50, y: 0.95, color: "#0d9488", shape: "pill" },
    { id: "OC",     label: "On-chain",     x: 0.85, y: 0.95, color: "#6366f1", shape: "pill" },
  ],
  edges: [
    { from: "N1", to: "ORACLE", label: "signed attestation" },
    { from: "N2", to: "ORACLE", label: "signed attestation" },
    { from: "N3", to: "ORACLE", label: "signed attestation" },
    { from: "ORACLE", to: "RPOOL" },
    { from: "RPOOL", to: "N1", label: "Most incentives", dashed: true },
    { from: "RPOOL", to: "N3", label: "Fewer incentives", dashed: true },
    { from: "ROUTER", to: "LN" },
    { from: "ROUTER", to: "SF" },
    { from: "ROUTER", to: "OC" },
  ],
};

// ── #12  Nostr ──────────────────────────────────────────────────
export const nostrDiagram: DiagramProps = {
  direction: "LR",
  height: 260,
  ariaLabel: "Nostr relay operators submit capacity attestations to a registry, which feeds a Superfluid GDA payment pool funded by Nostr users",
  groups: [
    { id: "relays", label: "Relay Operators", x: 0.0, y: 0.0, w: 0.25, h: 0.95, color: "#6366f1" },
  ],
  nodes: [
    { id: "R1", label: "Relay A\nHigh capacity",    x: 0.08, y: 0.15, color: "#6366f1" },
    { id: "R2", label: "Relay B\nMedium capacity",  x: 0.08, y: 0.50, color: "#6366f1" },
    { id: "R3", label: "Relay C\nLow capacity",     x: 0.08, y: 0.85, color: "#6366f1" },
    { id: "REG",  label: "Relay Capacity\nRegistry",    x: 0.48, y: 0.50, color: "#6366f1" },
    { id: "POOL", label: "Relay Payment Pool\n(Superfluid GDA)", x: 0.82, y: 0.50, color: "#0d9488" },
    { id: "USERS", label: "Nostr Users\nSubscription streams", x: 0.82, y: 0.92, color: "#a1a1aa" },
  ],
  edges: [
    { from: "R1", to: "REG", label: "capacity attestations" },
    { from: "R2", to: "REG" },
    { from: "R3", to: "REG" },
    { from: "REG", to: "POOL" },
    { from: "POOL", to: "R1", label: "60% of revenue", dashed: true },
    { from: "POOL", to: "R3", label: "10% of revenue", dashed: true },
    { from: "USERS", to: "POOL" },
  ],
};

// ── #13  Demurrage: standard vs decaying ────────────────────────
export const demurrageDiagram: DiagramProps = {
  direction: "LR",
  height: 220,
  ariaLabel: "Comparison: standard token stays at 1000 over time while demurrage token decays from 1000 to 951 over a year",
  groups: [
    { id: "std", label: "Standard Token",               x: 0.0,  y: 0.0, w: 0.45, h: 0.95, color: "#374151" },
    { id: "dem", label: "Demurrage Token (5% decay/yr)", x: 0.52, y: 0.0, w: 0.48, h: 0.95, color: "#a16207" },
  ],
  nodes: [
    { id: "A1", label: "Day 1: 1000",    x: 0.05, y: 0.25, color: "#374151", shape: "pill" },
    { id: "A2", label: "Day 30: 1000",   x: 0.22, y: 0.55, color: "#374151", shape: "pill" },
    { id: "A3", label: "Day 365: 1000",  x: 0.40, y: 0.85, color: "#374151", shape: "pill" },
    { id: "B1", label: "Day 1: 1000",    x: 0.57, y: 0.25, color: "#a16207", shape: "pill" },
    { id: "B2", label: "Day 30: ~996",   x: 0.74, y: 0.55, color: "#a16207", shape: "pill" },
    { id: "B3", label: "Day 365: ~951",  x: 0.92, y: 0.85, color: "#d97706", shape: "pill" },
  ],
  edges: [
    { from: "A1", to: "A2" },
    { from: "A2", to: "A3" },
    { from: "B1", to: "B2" },
    { from: "B2", to: "B3" },
  ],
};

// ── #14  Platform / Reputation ──────────────────────────────────
export const reputationDiagram: DiagramProps = {
  direction: "TB",
  height: 280,
  ariaLabel: "AI Agent, Relay Operator, and Lightning Node feed reputation scores into a Reputation Ledger, which computes a combined score with 3x penalty for negatives, leading to stake discounts up to 50%",
  nodes: [
    { id: "AI",      label: "AI Agent\nReputation: 85",      x: 0.15, y: 0.05, color: "#0d9488" },
    { id: "RELAY",   label: "Relay Operator\nReputation: 92", x: 0.50, y: 0.05, color: "#6366f1" },
    { id: "LN",      label: "Lightning Node\nReputation: 78", x: 0.85, y: 0.05, color: "#a16207" },
    { id: "LEDGER",  label: "Reputation Ledger\nCross-domain scoring",    x: 0.50, y: 0.40, color: "#2563eb" },
    { id: "SCORE",   label: "Combined Score\nWeighted average\n3× penalty for negatives", x: 0.50, y: 0.68, color: "#6366f1" },
    { id: "DISCOUNT", label: "Stake Discount\nUp to 50% off deposit", x: 0.50, y: 0.92, color: "#0d9488" },
  ],
  edges: [
    { from: "AI", to: "LEDGER" },
    { from: "RELAY", to: "LEDGER" },
    { from: "LN", to: "LEDGER" },
    { from: "LEDGER", to: "SCORE" },
    { from: "SCORE", to: "DISCOUNT" },
  ],
};

// ── #15  OpenClaw: sequence diagram ─────────────────────────────
export const openclawSequence: SequenceProps = {
  height: 340,
  ariaLabel: "OpenClaw agent registration and task execution flow: Agent registers with adapter, requester assigns task, agent executes skill, updates capacity, verifies execution with dual signatures, and reports to reputation bridge",
  participants: [
    { id: "req",      label: "Requester",           color: "#a1a1aa" },
    { id: "agent",    label: "OpenClaw Agent",       color: "#be123c" },
    { id: "adapter",  label: "CapacityAdapter",      color: "#d97706" },
    { id: "verifier", label: "CompletionVerifier",   color: "#6366f1" },
    { id: "rep",      label: "ReputationBridge",     color: "#0d9488" },
  ],
  messages: [
    { from: "agent",    to: "adapter",  label: "registerAgent(skillType, stake)" },
    { from: "req",      to: "agent",    label: "Assign task via ClawHub" },
    { from: "agent",    to: "agent",    label: "Execute skill", self: true },
    { from: "agent",    to: "adapter",  label: "updateCapacity(throughput, latency, errorRate)" },
    { from: "adapter",  to: "adapter",  label: "EWMA smooth, normalize", self: true },
    { from: "agent",    to: "verifier", label: "verifyExecution(agentSig, requesterSig)" },
    { from: "verifier", to: "verifier", label: "Record completion on-chain", self: true },
    { from: "verifier", to: "rep",      label: "reportCompletion(agent)" },
    { from: "rep",      to: "rep",      label: "Update reputation", self: true },
  ],
};

// ── #16  Bitcoin: 5-step adoption chain ─────────────────────────
export const bitcoinDiagram: DiagramProps = {
  direction: "LR",
  height: 180,
  ariaLabel: "Chain: Real-time capacity signals lead to smarter routing, fewer failed payments, better Lightning UX, and more Bitcoin adoption",
  nodes: [
    { id: "A", label: "Real-time\ncapacity signals",  x: 0.02, y: 0.50, color: "#a16207" },
    { id: "B", label: "Smarter\nrouting",              x: 0.25, y: 0.50, color: "#a16207" },
    { id: "C", label: "Fewer failed\npayments",        x: 0.48, y: 0.50, color: "#0d9488" },
    { id: "D", label: "Better\nLightning UX",          x: 0.72, y: 0.50, color: "#0d9488" },
    { id: "E", label: "More Bitcoin\nadoption",         x: 0.96, y: 0.50, color: "#d97706" },
  ],
  edges: [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "D" },
    { from: "D", to: "E" },
  ],
};
