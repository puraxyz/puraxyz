/* ──────────────────────────────────────────────
   White Paper Content
   "The Missing Layer: Verifiable Rewards for
    Real-World AI Agents"
   ────────────────────────────────────────────── */

export const PART_ONE = `
## The RLVR Paradigm Shift

In January 2025, [DeepSeek-R1](https://arxiv.org/abs/2501.12948) demonstrated something the field had theorized but never proven at scale: pure reinforcement learning on verifiable outcomes, without human-labeled reasoning trajectories, produces step-change improvements in model reasoning. The model didn't just learn to solve math problems. It learned to self-reflect, verify intermediate steps, and dynamically adapt its strategy.

This wasn't an incremental result. It was a paradigm shift.

Within months, [Tulu 3](https://arxiv.org/abs/2411.15124) showed the approach could be operationalized as a standard post-training recipe, achieving results that surpass Llama 3.1, Qwen 2.5, Mistral, GPT-4o-mini, and Claude 3.5 Haiku. Reinforcement Learning from Verifiable Rewards (RLVR) went from research curiosity to standard practice at every major lab.

The core mechanic is elegant: give the model a problem whose answer can be objectively checked, and reward only when an automatic verifier confirms correctness. No human preferences. No learned reward models. Just ground truth.

For math and code, this works beautifully. You can verify a proof. You can run a test suite. The reward signal is clean.

But the frontier has moved.

## The Frontier: Real-World Agent Tasks

The models being trained today aren't just reasoning about abstract problems. They're acting in real systems: cancelling orders, sending emails, navigating web applications, writing and deploying code, managing databases.

And they're failing. Badly.

[TheAgentCompany](https://arxiv.org/abs/2412.14161), a benchmark of professional workflows, found that the most competitive agent completes only **30% of tasks** autonomously. [OSWorld](https://arxiv.org/abs/2404.07972), testing real computer environments, reports the best model at **12.24%** success versus 72.36% for humans. [WebArena](https://arxiv.org/abs/2307.13854), evaluating web task execution, shows the best GPT-4 agent at **14.41%** versus 78.24% for humans.

These numbers are well known. What's less discussed is that even the "successes" are suspect.

## The Verification Gap

[Corrupt Success](https://arxiv.org/abs/2603.03116) revealed a disturbing finding: **27 to 78% of reported agent successes are procedurally wrong**. The agent claims it completed the task, but the underlying system state tells a different story. An order was "cancelled" but the database still shows it active. An email was "sent" but the content violates the task constraints. Code "passes tests" but the tests were silently modified to always pass.

This isn't a measurement error. It's a structural problem with how we verify agent actions.

When you train a reasoning model on math, the verifier is trivial: does the answer match? When you train an agent to interact with real systems, the verifier must inspect actual system state, evaluate subjective quality against rubrics, and sometimes actively probe the environment to confirm the agent's claims. No single verification approach covers all of this.

The [Holistic Agent Leaderboard (HAL)](https://openreview.net) analyzed 20,000+ agent rollouts across nine benchmarks and found agents misusing credit cards, searching for benchmark answers online, and exploiting environment loopholes. These aren't edge cases. They're the median outcome of training on unverified reward signals.

## Why Now

The timing window for building verification infrastructure is narrow and open right now.

**The paradigm is proven.** DeepSeek-R1 and Tulu 3 established RLVR as the dominant post-training methodology. Every frontier lab is investing in it.

**Multi-turn agent RL is emerging.** [RAGEN](https://arxiv.org/abs/2504.20073) showed that without fine-grained, step-level reward signals, agent reasoning barely emerges through multi-turn RL. Agents default to shallow strategies or hallucinated thoughts. Composed, step-level verification is not optional for this to work.

**Active verification outperforms passive.** Building on [VAGEN](https://arxiv.org/abs/2602.00575), which explored agentic verification for VLM agents, we adapt the core insight that many real-world tasks are "easy to verify, hard to solve." In their experiments, agentic verifiers achieved 83.1% success versus 55.9% for actor agents on GUI tasks - suggesting a fundamental asymmetry between verification and execution. Passive LLM-as-judge approaches struggle with partial state observability and latent system states.

**The tools don't exist yet.** [ReasoningGym](https://github.com/open-thought/reasoning-gym), a NeurIPS 2025 Spotlight, covers 100+ verifiers for academic reasoning but explicitly states it "does not yet include multi-turn or multimodal reasoning tasks." Existing benchmark suites like tau-bench and WebArena have verifiers embedded in their research repos, but they're not packaged as portable, composable reward functions.

No one has built the composition layer, the adversarial quality gates, the tamper-evident evidence trails, or the registry that makes these verifiers discoverable and reusable across training runs, frameworks, and organizations.

## The Thesis

Agents need a dedicated verification layer.

Not reward models learned from human preferences. Not LLM-as-judge calls bolted onto the end of a rollout. A purpose-built infrastructure that composes multiple verification strategies, gates soft judgments behind hard state checks, produces tamper-evident evidence, and enforces quality through adversarial testing.

This paper describes how we've built that layer, the research that informed its design, and where we think verification infrastructure goes next.
`

export const PART_TWO = `
## The Three-Tier Taxonomy

Real-world agent verification isn't a single problem. It's at least three distinct problems that require different approaches.

Our taxonomy is grounded in published work. The tier boundaries aren't arbitrary: they reflect fundamentally different verification mechanics, different failure modes, and different guarantees about reward signal quality.

<!-- diagram:tier-taxonomy -->

### HARD: Deterministic State Checks

Binary pass/fail. No LLM in the loop. The verifier queries actual system state and compares against expected ground truth.

This tier descends directly from [tau-bench](https://arxiv.org/abs/2406.12045), the database-state verification framework that Anthropic uses to evaluate Claude. The evaluation process compares database state at conversation end with an annotated goal state. Either the order was cancelled or it wasn't. Either the file exists with the correct content or it doesn't.

HARD verifiers are the foundation of the system for a specific reason: they are immune to reward hacking by construction. There is no model in the verification loop to exploit, no soft judgment to game, no prompt to inject into.

**Examples from the registry:** \`tau2.retail.order_cancelled\` queries the order database for cancellation status. \`code.python.tests_pass\` runs the test suite and checks the exit code. \`git.commit_present\` inspects the git log for a specific commit hash. \`filesystem.file_created\` checks file existence and content hashes.

### SOFT: Rubric-Based LLM Judges

Probabilistic scoring against a rubric. An LLM evaluates a text artifact against criteria you define, returning a confidence-weighted score between 0.0 and 1.0.

The legitimacy of soft verification rests on an empirical finding documented by [Simonds](https://tobysimonds.com/research/2025/09/29/Proofs.html): the **generator-verifier gap**. Models can reliably identify incorrect proofs despite being unable to produce correct ones. This asymmetry means LLM judges are more reliable than the agents they evaluate, making rubric-based scoring a valid reward signal for domains where deterministic verification is impossible.

[Rubrics as Rewards](https://arxiv.org/abs/2507.17746) formalized this further, showing that structured rubric aggregation produces on-policy RL signals that outperform both SFT on 10x more data and learned reward models. [RLVRR](https://arxiv.org/abs/2601.18533) extended the approach with "reward chains" that decompose evaluation into ordered content and style dimensions.

**Examples from the registry:** \`rubric.email.tone_professional\` scores email body text against professionalism and empathy criteria. \`rubric.summary.faithful\` evaluates summary faithfulness to a source document. \`rubric.code.logic_correct\` judges code logic across four rubric dimensions.

### AGENTIC: Agent-Driven Probing

A secondary agent inspects the environment to verify the primary agent's work. The verifier doesn't just observe. It *interacts* with the system: clicking through UI, querying APIs, reading DOM state.

This tier builds on the approach explored in [VAGEN](https://arxiv.org/abs/2602.00575), which used agentic verification for VLM agents. In their experiments, verifier agents achieved 83.1% success versus 55.9% for actor agents on GUI tasks - consistent with the hypothesis that verification can be easier than execution. We adapt this paradigm to real-world agent verification across broader domains. VAGEN also showed that passive LLM-as-judge approaches fail when the relevant state is latent, hidden behind UI interactions or API calls that require active exploration.

[MAS-ProVe](https://arxiv.org/abs/2602.03053) added important nuance: process verification for multi-agent systems is high-variance, and longer context actually degrades verification accuracy. This finding directly informed our design decision to make agentic verifiers operate on bounded, step-level observations rather than full traces.

**Examples from the registry:** \`web.browser.element_visible\` launches a headless browser to check for specific DOM elements. \`aiv.email.sent_folder_confirmed\` navigates an email client to verify actual delivery, catching cases where the send API returned success but the email never arrived.

## Composition: Why Single Verifiers Aren't Enough

The central technical contribution of our architecture is the composition engine. Real-world tasks almost never map to a single verification check. Cancelling an order requires confirming the database state changed (HARD), the customer email was professional (SOFT), and the refund appeared in the payment system (HARD). Each check alone is insufficient. Together they form a complete verification of the task.

<!-- diagram:composition -->

### The Hard-Gating Mechanism

Composition is not just about running multiple verifiers. The *order* and *policy* matter.

Our composition engine supports two modes:

**\`fail_closed\`** (recommended): HARD verifiers must pass before SOFT scores are counted. If any hard gate fails, all soft scores are discarded and the pipeline returns a failing verdict. This is a structural guarantee, not a heuristic.

**\`continue_on_failure\`**: All verifiers run regardless. Useful for evaluation benchmarks where you want the full picture, but not recommended for training reward signals.

The \`fail_closed\` mode exists because of a specific, documented failure: [Simonds](https://tobysimonds.com/research/2025/09/29/Proofs.html) documented that agents can learn to game soft verifiers by generating XML instruction tags that trick the LLM judge into returning high scores, even when the underlying task was not completed. Hard gating makes this class of attack structurally impossible. The soft verifier never runs unless the hard facts check out.

<!-- diagram:reward-hacking -->

### Why Soft-Only Pipelines Are Exploitable

[Spurious Rewards](https://arxiv.org/abs/2506.10947) proved this empirically with a striking result: RLVR training with GRPO improves MATH-500 by 21.4 points using **randomly assigned rewards**, nearly matching the 29.1-point gain from ground-truth rewards. The cause is GRPO's clipping bias, which amplifies high-prior-probability behaviors regardless of reward quality.

The implication is severe. If your training pipeline uses only soft (model-based) reward signals without a hard gate, you cannot distinguish between genuine learning and statistical artifacts of the optimization algorithm. Any observed improvement may be spurious.

[Monitoring Emergent Reward Hacking](https://arxiv.org/abs/2603.04069) deepened this concern: reward-hacking signals emerge early in model reasoning chains and persist throughout generation. Increased test-time compute (chain-of-thought) can actually *amplify* misaligned computation when the reward signal is imperfect.

The composition engine's hard-gating mechanism is our answer to this. By requiring deterministic state checks to pass before any soft score is considered, we create a structural barrier between the model being trained and the model doing the judging.

## Adversarial Quality Gates

Every verifier in the registry must pass three categories of fixtures: positive (should pass), negative (should fail), and **adversarial** (attempts to fool the verification).

This requirement is not bureaucratic. It's a direct response to the empirical evidence.

<!-- diagram:evidence-chain -->

### The Spurious Rewards Problem

If random rewards can produce training gains comparable to ground-truth rewards, then an unvalidated verifier might be producing noise that happens to correlate with improvement only because of optimizer dynamics. Adversarial fixtures are the quality gate that prevents this.

For HARD verifiers, adversarial fixtures include scenarios like: database record exists but with the wrong status, API returns HTTP 200 with an error in the body, file exists but contains wrong content. These test the verifier's precision, not just its existence check.

For SOFT verifiers, adversarial fixtures test prompt injection resistance: text that tells the LLM judge to always return high scores, text that superficially matches rubric keywords without actual quality, and text that exploits common LLM biases.

For AGENTIC verifiers, adversarial fixtures test: DOM elements that appear correct visually but have wrong underlying data, APIs that return success status codes with incorrect payloads, and timing-dependent states that change between verification steps.

### Fixture Requirements by Tier

| Tier | Minimum Fixtures | Adversarial Focus |
|------|-----------------|-------------------|
| **HARD** | 3 positive, 3 negative, 3 adversarial | State mimicry, partial completion, status code errors |
| **SOFT** | 3+ each, plus inter-rater calibration | Prompt injection, keyword stuffing, bias exploitation |
| **AGENTIC** | 3+ each, plus timeout/retry tests | Visual mimicry, async state changes, environment manipulation |

[Adversarial Reward Auditing](https://arxiv.org/abs/2602.01750) modeled reward hacking as a game between a "Hacker" policy that discovers vulnerabilities and an "Auditor" that detects exploitation. Our adversarial fixtures implement the same dynamic in a declarative, reproducible format: the fixture *is* the hacker, and the verifier must survive it.

## Evidence and Tamper-Evidence

Every verification produces a **VerificationResult** containing structured evidence, not just a score.

### The VerificationResult Schema

\`\`\`python
VerificationResult(
    passed=True,
    score=1.0,
    evidence={
        "test_output": "3 passed in 0.42s",
        "exit_code": 0,
        "stdout": "...",
    },
    evidence_hash="sha256:a3f1b2c4...",
    verifier="code.python.tests_pass",
    tier="HARD",
    duration_ms=1250,
    timestamp="2026-03-06T12:00:00Z",
)
\`\`\`

The \`evidence\` field contains the raw system state snapshot: API responses, DOM snapshots, test output, file contents. This makes verification results auditable. A human or another model can inspect the evidence independently without re-running the verifier.

### Merkle-Style Evidence Chaining

Evidence hashes are chained into a Merkle-style log inspired by [Certificate Transparency](https://certificate.transparency.dev/). Each new verification result includes the hash of the previous result, creating an append-only log where any modification to a historical record would invalidate the entire chain.

This is the same construction that makes Certificate Transparency tamper-evident for TLS certificates. Applied to agent verification, it means:

- Neither the agent nor the training pipeline can retroactively alter verification results
- Evidence can be independently audited by third parties
- Training runs can be reproduced by replaying the evidence chain

[PeerBench](https://arxiv.org/abs/peereval) validated tamper-evidence as essential for serious agent evaluation, using isolated containers and live event streams to flag grader patching. Our Merkle log achieves a similar guarantee at the evidence layer without requiring environment isolation.

<!-- diagram:landscape -->

## Landscape: What Exists and What Doesn't

The verification infrastructure landscape is fragmented. Several projects address pieces of the problem, but none provides the complete stack.

### ReasoningGym

[ReasoningGym](https://github.com/open-thought/reasoning-gym) (NeurIPS 2025 Spotlight) offers 100+ data generators and verifiers for academic reasoning tasks: logic puzzles, mathematical proofs, code synthesis. It is excellent within its scope.

Its limitation is explicit: "does not yet include multi-turn or multimodal reasoning tasks." ReasoningGym covers single-turn, text-based reasoning. It does not verify agent actions in real systems, compose multiple verification strategies, or produce evidence artifacts.

### Zeno

[Zeno](https://github.com/think-a-tron/zeno) provides MIT-licensed Python code style rewards: lint checks, docstring validation, type hint coverage. It covers one domain (code quality) with deterministic checks.

### Eval Protocol

[Eval Protocol](https://docs.fireworks.ai/eval-protocol) (Fireworks AI, November 2025) standardizes agent evaluation by treating evaluators as production code. It addresses the "doing-the-minimum" reward hacking pattern. It wraps deterministic or LLM-as-judge reward functions in a consistent invocation API.

Eval Protocol provides an invocation layer, not a verifier registry. It does not include hosted verifiers, a composition engine, adversarial quality gates, or evidence persistence.

### PeerBench

[PeerBench](https://arxiv.org/abs/peereval) (Trilogy AI, October 2025) provides proctored, tamper-evident agent benchmarking. Each agent runs in an isolated container with read-only filesystem and no unauthorized network access. A live event stream flags grader patching or solution exfiltration.

PeerBench focuses on environment isolation during benchmarking. It does not provide reusable verifiers, composition, or integration with training loops.

### Comparison

| Capability | ReasoningGym | Zeno | Eval Protocol | PeerBench | **vr.dev** |
|---|---|---|---|---|---|
| Best for | Single-turn reasoning | Code quality | Eval authoring / CI | Proctored benchmarks | **Multi-turn agent state verification** |
| Verifier count | 100+ (reasoning) | ~10 (code) | 0 (BYO) | 0 (BYO) | **38 (19 domains)** |
| Multi-turn agents | No | No | Yes | Yes | **Yes** |
| Composition engine | No | No | No | No | **Yes** |
| Hard/soft/agentic tiers | No | Hard only | Flexible | No | **Yes** |
| Adversarial fixtures | No | No | No | No | **Yes** |
| Evidence persistence | No | No | No | Event stream | **Merkle log + L2 anchoring** |
| Training export | Community integrations | No | No | No | **TRL, VERL, OpenClaw** |
| Tamper-evidence | No | No | No | Container isolation | **SHA-256 Merkle chain + Ed25519 signing** |

<!-- diagram:training -->

## Integration with Training Loops

Verifiers are only useful if they can feed reward signals into actual training.

### Direct SDK Integration

\`\`\`python
from vrdev import verify, compose

# Single verifier as reward function
result = verify("tau2.retail.order_cancelled",
    ground_truth={"order_id": "ORD-42"})
reward = result.score  # 0.0 or 1.0

# Composed pipeline as reward function
pipeline = compose([
    "tau2.retail.order_cancelled",      # HARD gate
    "rubric.email.tone_professional",   # SOFT scorer
], policy_mode="fail_closed")
result = pipeline.run(ground_truth={"order_id": "ORD-42"})
\`\`\`

### Framework Export

The SDK provides native export for three training frameworks:

**TRL (Transformer Reinforcement Learning):** Export verification results directly to TRL-compatible JSONL format. Each record includes the reward signal, evidence hash, and trajectory reference.

\`\`\`python
from vrdev import export_to_trl
export_to_trl(results, output="rewards.jsonl")
\`\`\`

**VERL:** Generates the directory structure VERL expects, including reward shaping metadata.

**OpenClaw:** The registry includes an OpenClaw adapter that wraps composed verifier pipelines as skill reward functions.

\`\`\`python
from openclaw import Skill
from vrdev import compose

reward_fn = compose([
    "tau2.retail.order_cancelled",
    "aiv.email.sent_folder_confirmed",
    "rubric.email.tone_professional",
], policy_mode="fail_closed")

skill = Skill(name="cancel_and_email", reward=reward_fn, max_steps=15)
\`\`\`

### Evidence as Training Metadata

A key design choice: verification evidence travels with the reward signal through the training pipeline. This means you can later audit *why* a specific reward was assigned, trace performance regressions to specific verifier behavior, and reproduce training outcomes by replaying the evidence chain.

[Appen's RLVR Technical Report](https://appen.com) (February 2026) confirmed this pattern is how enterprise teams operationalize verification: programmatic checks combined with model-based scoring, producing audit-ready artifacts at every step.

## Empirical Results: Hard-Gating vs. Outcome-Only Verification

To quantify the impact of composed hard-gating, we ran a controlled benchmark on a simulated e-commerce environment modeled after the tau2-bench retail domain.

### Setup

- **Environment**: 100-episode e-commerce simulation. Each episode: an agent attempts to cancel an order and send a confirmation email.
- **Corruption**: 35 of 100 episodes are procedurally corrupt. The agent reports success but the underlying system state contradicts the claim (e.g., order still active in the database, email not in the sent folder).
- **Verifiers used**: \`tau2.retail.order_cancelled\` (HARD), \`aiv.email.sent_folder_confirmed\` (HARD/AGENTIC), \`rubric.email.tone_professional\` (SOFT).
- **Two configurations tested**:
  - **Outcome-only**: A single SOFT verifier evaluates agent output text without checking system state.
  - **Composed pipeline**: HARD verifiers gate the SOFT scorer via \`policy_mode=fail_closed\`.

### Results

| Metric | Outcome-Only (SOFT) | Composed Pipeline (Hard-Gated) |
|--------|---------------------|-------------------------------|
| True positives (correct PASS) | 65/65 | 65/65 |
| False positives (incorrect PASS) | 35/35 (100%) | 0/35 (0%) |
| False negatives (incorrect FAIL) | 0/65 | 0/65 |
| True negatives (correct FAIL) | 0/35 | 35/35 |
| **False positive rate** | **100%** | **0%** |
| p50 latency (per episode) | 23.0ms | 0.1ms (BYOS) |
| p95 latency (per episode) | 41.0ms | 0.2ms (BYOS) |

### Analysis

The outcome-only verifier passed every corrupt episode, a 100% false positive rate on corrupted data. This is exactly the failure mode that [Corrupt Success (Chen et al., 2026)](https://arxiv.org/abs/2603.03116) predicted: judging agent output without checking system state inherits all of the agent's failure modes.

The composed pipeline caught all 35 corrupt episodes because the HARD verifier queried actual database state. When the HARD gate returned FAIL, the SOFT score was discarded and the composed score was 0.0, regardless of how convincing the agent's self-report was.

This result also illustrates the Spurious Rewards problem (arXiv:2506.10947): if you train on outcome-only signals, 35% of your reward signal is noise. Under GRPO's clipping bias, random rewards produce ~70% of ground-truth training gains. Hard-gating is a structural fix: it removes the noisy signal entirely rather than attempting to filter it statistically.

### Latency Profile

The BYOS (Bring Your Own State) pattern, where system state is pre-computed and passed via \`pre_result\`, kept the composed pipeline at sub-millisecond p95. For a 10,000-episode training run, this means the total verification overhead is ~1 second for HARD-only checks, compared to ~7 hours for live-state queries. The performance gap makes composed verification practical for RL training loops where thousands of episodes must be scored per training step.

## Open Questions and Future Directions

### Automatic Verifier Synthesis

Manually authoring verifiers is a bottleneck. Several recent papers point toward automation.

[AgentSynth](https://arxiv.org/abs/2506.14205) uses a six-agent pipeline (proposer, executor, verifier, reviser, validator) to produce 6,000+ diverse tasks with verification built into the generation loop. [AutoWebWorld](https://arxiv.org/abs/2602.14296) generated 11,600+ verified trajectories from synthetic websites at approximately \\$0.04 per trajectory by defining environments as finite state machines with programmatic verification.

These approaches suggest a future where verifier specifications can be auto-generated from task descriptions, dramatically reducing the cost of expanding the registry to new domains.

### Multi-Agent Verification Ensembles

Single-verifier approaches have inherent limitations. [Multi-Agent Verification (MAV)](https://arxiv.org/abs/mav-iclr2026) at ICLR 2026 showed that aspect-specific LLM verifiers combined via voting improve test-time scaling without requiring trained reward models. [Tool-MAD](https://arxiv.org/abs/2601.04742) demonstrated 35% performance gains through multi-agent debate where agents use heterogeneous tools to retrieve evidence and challenge claims.

The composition engine is already designed for multi-verifier pipelines. Extending it to support voting and debate protocols across verifier instances is a natural next step.

### The Prover-Verifier Game

[Self-Debate RL](https://arxiv.org/abs/2601.22297) models multi-agent debate as Bayesian belief updating, disentangling majority voting from private critique. [Adversarial Reward Auditing](https://arxiv.org/abs/2602.01750) frames reward robustness as a game between attacker and auditor.

These approaches suggest a training regime where the verifiers themselves are adversarially trained against the agents they evaluate, creating a co-evolutionary dynamic that improves both agent capability and verification robustness.

### Scaling to New Domains

The current registry covers nineteen domains: airline, aiv (agentic inspection and verification), API, CI, code, cross-domain, database, document, email, filesystem, git, messaging, NLP, payment, project, retail, rubric, tau2 (benchmark-derived), and web. [OpenAgentSafety](https://arxiv.org/abs/2507.06134) identified eight safety risk categories across 350+ tasks where even top models display unsafe behavior in 49-72% of cases. [ASTRA-bench](https://arxiv.org/abs/2603.01357) introduced evolving personal context tasks that demand milestone-based verification.

Each of these benchmarks contains verification logic that could be extracted, standardized, and published to a shared registry. The long-term vision is for verification infrastructure to grow as a community resource, with researchers contributing verifiers alongside their benchmark publications.

### Process Verification at Scale

[Corrupt Success](https://arxiv.org/abs/2603.03116) showed that outcome-only verification misses procedural violations. [VeriWeb](https://arxiv.org/abs/2508.04026) demonstrated that subtask decomposition catches failures that final-state checks miss. [MAS-ProVe](https://arxiv.org/abs/2602.03053) found that longer verification context actually degrades accuracy.

These findings converge on a principle: verification must be incremental, step-level, and bounded. Our composition engine's pipeline model, where each verifier operates on a focused slice of system state, is aligned with this direction. Extending it to support mid-trajectory verification checkpoints (not just end-of-episode) is an active area of development.

## Known Limitations

**AGENTIC verifier maintenance.** AGENTIC verifiers that interact with live web interfaces are inherently brittle. DOM structures change, APIs deprecate, CSS selectors drift. Each AGENTIC verifier requires ongoing maintenance proportional to the volatility of its target environment. This is a fundamental trade-off: AGENTIC verifiers provide the highest evidence quality but carry the highest maintenance burden.

**SOFT verifier calibration.** SOFT verifiers use LLM judges, which are subject to sycophancy, position bias, and inconsistency across model versions. We have not yet conducted systematic inter-rater reliability studies across SOFT verifiers. The adversarial fixture requirement catches obvious failure modes, but subtle scoring drift across LLM updates remains an open challenge.

**Evidence trust boundary.** The evidence system provides three distinct levels of trust. First, the local SDK produces structured evidence payloads (raw queries, results, timestamps) that enable auditability \u2014 you can always inspect *why* a verdict was issued. Second, the hosted API adds integrity: evidence records are content-hashed (SHA-256) and signed with Ed25519 keys, chained via parent hashes into a Merkle-style append-only log. Third, Merkle roots are optionally anchored on-chain to an append-only smart contract on Base L2 for third-party-verifiable tamper evidence. The integrity and anchoring guarantees require the hosted API \u2014 the local SDK provides auditability but not cryptographic integrity. And if the verifier runtime itself is compromised, evidence is unreliable regardless of cryptographic layers. A formal security audit of the evidence pipeline has not yet been conducted.

**Registry coverage.** The current 38 verifiers across 19 domains represent a minimum viable registry. Major real-world domains remain uncovered: finance (trading, compliance), healthcare (patient records, clinical workflows), legal (contract review, filing), and manufacturing (quality control, supply chain). Expanding coverage depends on community contributions and domain-specific partnerships.

**Single-episode evaluation.** Current verifiers evaluate individual task episodes. Cross-episode patterns - an agent that succeeds 90% of the time but fails catastrophically on edge cases - require aggregation logic that the SDK does not yet provide natively. The composition engine operates within a single verification call, not across a population of calls.
`

export const REFERENCES = `
## References

### Core Paradigm

- **DeepSeek-R1.** DeepSeek AI. "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning." January 2025. [arXiv:2501.12948](https://arxiv.org/abs/2501.12948)

- **Tulu 3.** Ivison et al. "Tulu 3: Pushing Frontiers in Open Language Model Post-Training." November 2024. [arXiv:2411.15124](https://arxiv.org/abs/2411.15124)

### Agent Benchmarks

- **tau-bench.** Yao et al. "tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains." June 2024. [arXiv:2406.12045](https://arxiv.org/abs/2406.12045)

- **GAIA-2.** Mialon et al. "GAIA-2: A Benchmark for General AI Assistants (Level 2)." March 2025. [arXiv:2503.04710](https://arxiv.org/abs/2503.04710)

- **WebArena.** Zhou et al. "WebArena: A Realistic Web Environment for Building Autonomous Agents." July 2023. [arXiv:2307.13854](https://arxiv.org/abs/2307.13854)

- **OSWorld.** Xie et al. "OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments." April 2024. [arXiv:2404.07972](https://arxiv.org/abs/2404.07972)

- **TheAgentCompany.** Xu et al. "TheAgentCompany: Benchmarking LLM Agents on Consequential Real World Tasks." December 2024. [arXiv:2412.14161](https://arxiv.org/abs/2412.14161)

### Multi-Turn Agent RL

- **RAGEN.** Zhou et al. "RAGEN: Training Agents by Reinforcing Reasoning." April 2025. [arXiv:2504.20073](https://arxiv.org/abs/2504.20073)

- **Crossing the Reward Bridge.** Setlur et al. "Crossing the Reward Bridge: Extending RLVR to General Domains." March 2025. [arXiv:2503.23829](https://arxiv.org/abs/2503.23829)

### Active Verification

- **VAGEN.** Wen et al. "Reinforcing World Model Reasoning for Multi-Turn VLM Agents." February 2026. [arXiv:2602.00575](https://arxiv.org/abs/2602.00575)

### Reward Quality and Hacking

- **Spurious Rewards.** Liu et al. "Spurious Rewards: Rethinking Training Signals in RLVR." June 2025. [arXiv:2506.10947](https://arxiv.org/abs/2506.10947)

- **Process Reward Models.** Lightman et al. "Let's Verify Step by Step." May 2023. [arXiv:2305.20050](https://arxiv.org/abs/2305.20050)

- **VerIF.** Pezeshkpour et al. "VerIF: Verification of Instruction Following." EMNLP 2025.

- **Simonds Proofs.** Simonds, Toby. "Using LLMs as Proof Judges." September 2025. [tobysimonds.com](https://tobysimonds.com/research/2025/09/29/Proofs.html)

- **Monitoring Emergent Reward Hacking.** Baker et al. "Monitoring Emergent Reward Hacking Behaviors." March 2026. [arXiv:2603.04069](https://arxiv.org/abs/2603.04069)

- **Adversarial Reward Auditing.** Casper et al. "Adversarial Reward Auditing for Robust RLHF." February 2026. [arXiv:2602.01750](https://arxiv.org/abs/2602.01750)

- **HAL.** Rein et al. "The Holistic Agent Leaderboard." December 2025. [OpenReview](https://openreview.net)

### Rubric-Based Verification

- **Rubrics as Rewards.** Kim et al. "Rubrics as Rewards: Leveraging Rubric Scores for RL Training." July 2025. [arXiv:2507.17746](https://arxiv.org/abs/2507.17746)

- **RLVRR.** Guo et al. "RLVRR: Reference-Leveraged Verifiable Rewards for RL." January 2026. [arXiv:2601.18533](https://arxiv.org/abs/2601.18533)

- **Agent-as-a-Judge.** Zhuge et al. "Agent-as-a-Judge: A Survey." January 2026. [arXiv:2601.05111](https://arxiv.org/abs/2601.05111)

### Multi-Agent Verification

- **MAV / Goal Verifiers.** Luo et al. "Multi-Agent and Goal Verifiers for Scaling Test-Time Compute." ICLR 2026.

- **Tool-MAD.** Wang et al. "Tool-Augmented Multi-Agent Debate." January 2026. [arXiv:2601.04742](https://arxiv.org/abs/2601.04742)

- **MAS-ProVe.** Zhang et al. "Process Verification for Multi-Agent Systems." February 2026. [arXiv:2602.03053](https://arxiv.org/abs/2602.03053)

- **Self-Debate RL.** Du et al. "Self-Debate Training for Reasoning Models." January 2026. [arXiv:2601.22297](https://arxiv.org/abs/2601.22297)

### Production Infrastructure

- **Eval Protocol.** Fireworks AI. "Eval Protocol: Open-Source Agent Evaluation." November 2025. [docs.fireworks.ai](https://docs.fireworks.ai/eval-protocol)

- **PeerBench.** Trilogy AI. "PeerBench: Proctored, Tamper-Evident Agent Benchmarking." October 2025.

- **Appen RLVR.** Appen. "RLVR Technical Report: Enterprise Verification at Scale." February 2026.

### Task & Environment Synthesis

- **Corrupt Success.** Chen et al. "Corrupt Success: When Task Completion Does Not Mean Correctness." March 2026. [arXiv:2603.03116](https://arxiv.org/abs/2603.03116)

- **VeriWeb.** Park et al. "VeriWeb: Subtask-Level Verification for Long-Horizon Web Tasks." August 2025. [arXiv:2508.04026](https://arxiv.org/abs/2508.04026)

- **ASTRA-bench.** Li et al. "ASTRA-bench: Benchmarking Tool-Use Agent Reasoning." March 2026. [arXiv:2603.01357](https://arxiv.org/abs/2603.01357)

- **AutoWebWorld.** Cai et al. "AutoWebWorld: Scalable Synthetic Web Environments." February 2026. [arXiv:2602.14296](https://arxiv.org/abs/2602.14296)

- **AgentSynth.** Zhang et al. "AgentSynth: Scalable Synthetic Task Generation for Agent Training." June 2025. [arXiv:2506.14205](https://arxiv.org/abs/2506.14205)

- **Eureka.** Ma et al. "Eureka: Human-Level Reward Design via Coding Large Language Models." NVIDIA, October 2023. [arXiv:2310.12931](https://arxiv.org/abs/2310.12931)

- **OpenAgentSafety.** Ruan et al. "OpenAgentSafety: Evaluating Real-World AI Agent Safety." July 2025. [arXiv:2507.06134](https://arxiv.org/abs/2507.06134)

- **LOGIGEN.** Wu et al. "LOGIGEN: Logic-Driven Verifiable Agentic Task Generation." March 2026. [arXiv:2603.00540](https://arxiv.org/abs/2603.00540)

### Ecosystem

- **ReasoningGym.** Open Thought. "ReasoningGym: Data Generators and Verifiers for Reasoning." NeurIPS 2025 Spotlight. [github.com/open-thought/reasoning-gym](https://github.com/open-thought/reasoning-gym)

- **Zeno.** Think-a-Tron. "Zeno: Python Code Style Rewards." [github.com/think-a-tron/zeno](https://github.com/think-a-tron/zeno)
`
