# 13 — Thermodynamic Adoption Plan

Source: `.local/research-1.md`
Repo: `synthesi` (branch `main`, commit `b7627fc`)

---

## TL;DR

Integrate 6 physics-derived mechanisms (Boltzmann routing, virial ratio, osmotic escrow pressure, exploration bonus, adaptive demurrage, circuit breakers) into the Backproto protocol. Restructure brand (backproto.io → spec-only, vr.dev → absorbed into pura.xyz/verify, bit.recipes → Bitcoin-native cookbook). Rewrite the paper as "Thermodynamic Foundations of Capacity Control for Autonomous Service Networks." Ship a reference NIP-90 DVM, shadow mode sidecar, interactive benchmark, and 5 new recipes.

99 items across 12 execution groups. Critical path: Group 1 → Group 2 → (Groups 3+4+5 parallel) → Group 6 → Group 10 → Group 11.

---

## Pressure-testing and objections

These are things to be aware of before and during execution.

### 1. On-chain exp() is expensive
Boltzmann weights require exp(c_i/τ). Research correctly recommends off-chain computation via OffchainAggregator with EIP-712 signed pre-computed shares. The existing OffchainAggregator already handles exactly this pattern. No architectural change needed — just extend the attestation type.

### 2. Superfluid GDA unit ceiling
"GDA pool does not allow the total amount of units to be higher than the flow rate." When Boltzmann weights are converted to integer GDA units, downscaling could distort the intended distribution. After deploying modified BackpressurePool, write a fork test that verifies unit assignment under various flow rates and provider counts. If distortion exceeds 5%, add a scaling normalization step.

### 3. Virial equilibrium is empirical
Research says "determine exact equilibrium value empirically through simulation." Adaptive demurrage (item 19) depends on this value. Deploy with configurable equilibrium target (start at 1.0), run simulation (Group 6), then tune. This means Group 2 deploys with parameterized constants, not hardcoded ones.

### 4. Temperature floor trap
When all providers report identical capacity, variance → 0, temperature → τ_min (0.1). Near-deterministic routing concentrates on whichever provider has marginally more spare — could cause oscillation between two close providers. Mitigation: set τ_min no lower than 0.5, or add minimum exploration ε ≥ 0.05 as a floor that guarantees spread regardless of temperature.

### 5. Circuit breaker timing
3 epochs × 5 min = 15 minutes before circuit breaker triggers. For sudden infrastructure failures (AWS region down), 15 minutes of cascade is too slow. Add an immediate trigger for extreme conditions: escrow > 95% OR throughput < 5% of declared (not 20%) in a single epoch.

### 6. NIP acceptance requires 2 clients + 1 relay
The reference DVM (Group 4) counts as 1 client. Need at least one more independent implementation. This is a long-tail dependency — plan for it but don't block on it. The NIP PR (item 33) starts the process; acceptance comes later.

### 7. Shadow mode bootstrap
Shadow mode observes NIP-90 traffic. If the only DVM is yours, shadow mode observes only your own traffic. Existing NIP-90 DVMs in the wild (DVMDash reports ~15 active kinds) can serve as observation targets for early shadow mode demos.

### 8. vr.dev stack mismatch
vr.dev uses Clerk auth + Prisma + Mantine UI. Pura uses CSS modules, no ORM, no auth. Decision: port to pura's stack. This means rewriting verification UI components with CSS modules, replacing Prisma with direct contract reads or flat-file storage, and either adding Clerk to pura or building simpler auth. Scope this as a multi-step effort within Group 1.

### 9. Paper is a full rewrite
Current paper is 13 MDX sections covering "backpressure routing for payments." The new paper is "thermodynamic foundations of capacity control." Most existing sections need restructuring, not just appendixes. Plan for this to take significant writing effort in Group 11.

### 10. Gas benchmarks needed
TemperatureOracle and VirialMonitor add cross-contract reads. BackpressurePool.rebalance() will call TemperatureOracle.getTemperature(). Add gas benchmarks to GasBenchmark.t.sol for all new and modified functions.

---

## Phase 1 — Narrative and surface cleanup (items 1–12)

### Prerequisites
None. This is the starting phase.

### Items

- [ ] **1. Audit repo for actual contract/test counts**
  - Count .sol files in `contracts/src/`, `contracts/test/`, and subdirectories
  - Current: 22 contracts in src/ (including subdirectories), 20 test files, 2 fork tests, 4 mocks
  - Update any docs that reference stale counts

- [ ] **2. Update backproto.io homepage**
  - File: `web/app/page.tsx`
  - New headline: "Capacity Control Plane for Machine Services"
  - Strip product showcase (the 2 ref product cards added in commit b7627fc)
  - Replace with protocol spec overview: what BPE is, the 6 standard objects, the thermodynamic framework
  - Link to pura.xyz for operations, bit.recipes for recipes

- [ ] **3. Strip backproto.io of product/deploy content**
  - File: `web/content/docs/products.mdx` — rewrite as spec overview (no deployment instructions)
  - File: `web/content/docs/getting-started.mdx` — redirect to pura.xyz/docs
  - File: `web/content/docs/getting-started-*.mdx` (5 files) — redirect or remove
  - File: `web/content/docs/hosted.mdx` — remove (operations are pura.xyz)
  - File: `web/content/docs/router.mdx` — keep as spec reference only
  - Keep: `web/content/docs/contracts.mdx`, `sdk.mdx`, `simulation.mdx`, `nip-xx.mdx`, `economy-factory.mdx`

- [ ] **4. Write 6 standard object JSON schemas**
  - New file: `web/content/docs/objects.mdx` (or `web/content/docs/spec-objects.mdx`)
  - Objects: CapacityAttestation (with confidence block), PriceSignal (with escrow_pressure + system_state), VerificationReceipt, SettlementReceipt, SystemState (new), PipelineState
  - Publish at backproto.io/docs/objects

- [ ] **5. Update pura.xyz homepage**
  - File: `pura/app/page.tsx`
  - New headline: per research spec — "Deploy. Monitor. Verify. Earn."
  - Add problem cards: "Why your agent pipeline leaks money"
  - System state panel: live temperature, virial ratio, escrow pressure, phase badge
  - Service type cards: relay, DVM, agent, LLM gateway
  - Verification section (absorbed from vr.dev)
  - CTA: "Deploy your first service" / "Start shadow mode"

- [ ] **6. Remove all "connecting..." placeholder states**
  - Grep pura/ for "connecting", "loading", placeholder states
  - Replace with real on-chain data (already wired from commit b7627fc) or "testnet — awaiting providers" label
  - File: `pura/app/page.tsx`, any dashboard components in `pura/app/components/`

- [ ] **7. Remove offline simulator from Pura public view**
  - Audit `pura/app/api/sim/` routes — if simulation is mock/offline, either remove or gate behind /dev-only
  - Simulation lives on bit.recipes (item 11), not pura

- [ ] **8. Set up vr.dev → pura.xyz/verify redirect**
  - File: `vr/next.config.ts` or `vr/vercel.json` — add redirect rules
  - Transition page at `pura/app/verify/page.tsx` explaining the move
  - Redirect all vr.dev routes: /registry → /verify/registry, /docs → /verify/docs, etc.

- [ ] **9. Absorb vr.dev verification engine into pura**
  - Port key pages from `vr/src/app/` to `pura/app/verify/`:
    - `/verify/page.tsx` — verification workflow
    - `/verify/registry/page.tsx` — verifier registry browser
    - `/verify/registry/[id]/page.tsx` — individual verifier detail
    - `/verify/compose/page.tsx` — composition engine (NEW, from vr.dev concept)
    - `/verify/sdk/page.tsx` — SDK docs page
    - `/verify/docs/page.tsx` — verification documentation
  - Rewrite all Mantine components as CSS module components (match pura design system)
  - Replace Prisma ORM with direct contract reads via SDK (`sdk/src/actions/verify.ts`, `MerkleRootAnchor` ABI)
  - Decision on auth: defer Clerk integration; verification pages are read-only for now
  - Rebrand: references to "vr.dev" become "Pura Verify"

- [ ] **10. Update bit.recipes homepage**
  - File: `bitrecipes/app/page.tsx`
  - New tagline: "Composable patterns for Bitcoin-native machine services."
  - Add "Deploy on Pura →" buttons to HeroSimulation or recipe cards
  - File: `bitrecipes/components/RecipeCard.tsx` — add deploy button linking to pura.xyz/deploy

- [ ] **11. Consolidate simulation ownership**
  - bit.recipes owns simulation/benchmark/playground
  - pura owns operations (deploy, monitor, verify, earn)
  - Remove any simulation UI from pura (check `pura/lib/sim/`, `pura/app/api/sim/`)
  - Ensure bit.recipes `/simulate` and `/benchmark` routes exist

- [ ] **12. Cross-link all three sites**
  - Files: `pura/app/components/Footer.tsx`, `bitrecipes/components/Footer.tsx`, `web/app/components/Footer.tsx`
  - Consistent footer: backproto.io (spec) | pura.xyz (operate) | bit.recipes (build)
  - Add cross-links in navs where appropriate

### Files touched (Phase 1)
- `web/app/page.tsx`, `web/content/docs/products.mdx`, `web/content/docs/getting-started*.mdx`, `web/content/docs/hosted.mdx`
- `web/content/docs/objects.mdx` (NEW)
- `pura/app/page.tsx`, `pura/app/verify/` (NEW directory, multiple files)
- `pura/app/components/Footer.tsx`
- `bitrecipes/app/page.tsx`, `bitrecipes/components/RecipeCard.tsx`, `bitrecipes/components/Footer.tsx`
- `vr/next.config.ts` or `vr/vercel.json`
- Various vr/ source files (read for porting)

---

## Phase 2 — Physics-integrated contracts (items 13–25)

### Prerequisites
Phase 1 items 1–4 should be done (audit, clean narrative). Contract work can start once item 1 is complete.

### Items

- [ ] **13. Implement TemperatureOracle contract**
  - New file: `contracts/src/TemperatureOracle.sol`
  - State: temperature (uint256, 1e18 scaled), tauMin, tauMax, varianceWindow
  - Functions: `updateTemperature(uint256 attestationVariance, uint256 maxExpectedVariance)`, `getTemperature()`, `boltzmannWeight(uint256 spareCapacity)`
  - Authorization: only callable by OffchainAggregator or owner
  - New interface: `contracts/src/interfaces/ITemperatureOracle.sol`
  - Defaults: τ_min = 5e17 (0.5, raised from research's 0.1 per pressure-test #4), τ_max = 5e18 (5.0), window = 12 epochs

- [ ] **14. Implement VirialMonitor contract**
  - New file: `contracts/src/VirialMonitor.sol`
  - State: virialRatio (1e18), equilibriumTarget (configurable, start 1e18), deviationThreshold
  - Functions: `updateVirial(uint256 epochThroughputValue, uint256 totalStaked, uint256 totalEscrowed)`, `getVirialRatio()`, `recommendedDemurrageRate()`, `recommendedStakeAdjustment()`
  - Formula: V = 2 * throughput / (staked + escrowed)
  - Demurrage recommendation: δ = δ_min + (δ_max - δ_min) * max(0, 1 - V), with δ_min=100 (1% bps annual), δ_max=1000 (10% bps annual)
  - New interface: `contracts/src/interfaces/IVirialMonitor.sol`

- [ ] **15. Modify EscrowBuffer for pressure signal**
  - File: `contracts/src/EscrowBuffer.sol`
  - Add: `getEscrowPressure(bytes32 taskTypeId) external view returns (uint256)` — returns level * 1e18 / maxBuffer
  - Add: `event PressureChanged(bytes32 indexed taskTypeId, uint256 newPressure, uint256 timestamp)`
  - Modify: `deposit()` and `drain()` to emit PressureChanged after state change

- [ ] **16. Modify PricingCurve for escrow pressure and temperature**
  - File: `contracts/src/PricingCurve.sol`
  - Add state: `ITemperatureOracle public temperatureOracle`, `IEscrowBuffer public escrowBuffer`
  - Add constructor params or setter for these references
  - Modify `getPrice()`: price = baseFee * (1 + β * escrowPressure) * (1 + k * (u/(1-u))^α)
  - New params: β (escrowSensitivity, default 8e17 = 0.8)
  - Cap utilization at 99e16 (0.99) to avoid division by zero
  - All arithmetic in 1e18 fixed-point

- [ ] **17. Modify BackpressurePool for Boltzmann distribution**
  - File: `contracts/src/BackpressurePool.sol`
  - Current: `rebalance()` sets GDA units proportional to capacity
  - Change: accept pre-computed Boltzmann shares from OffchainAggregator via new function
  - Add: `rebalanceWithShares(bytes32 taskTypeId, address[] calldata sinks, uint256[] calldata shares)` — only callable by authorized aggregator
  - Add: `ITemperatureOracle public temperatureOracle` reference (for view functions / on-chain fallback)
  - Keep existing `rebalance()` as fallback (proportional routing if aggregator is offline)
  - Option B from research: off-chain Boltzmann computation, on-chain share submission via EIP-712

- [ ] **18. Add exploration bonus to BackpressurePool**
  - File: `contracts/src/BackpressurePool.sol`
  - Add state: `uint256 public explorationRate` (default 5e16 = 5%)
  - Applied in `rebalanceWithShares()`: final_share[i] = (1-ε)*boltzmann_share[i] + ε*(1/N)
  - Or: applied off-chain in OffchainAggregator before submitting shares (preferred — cheaper gas)
  - Add setter: `setExplorationRate(uint256 epsilon)` onlyOwner, capped at 20%

- [ ] **19. Modify DemurrageToken for adaptive decay**
  - File: `contracts/src/DemurrageToken.sol`
  - Add state: `IVirialMonitor public virialMonitor`, `uint256 public deltaMin`, `uint256 public deltaMax`
  - Modify: `_decayRate` is no longer a simple stored value — computed dynamically via `getDecayRate()`
  - `getDecayRate()`: reads virialMonitor.getVirialRatio(), computes δ = δ_min + (δ_max - δ_min) * max(0, 1 - V)
  - Add setter: `setVirialMonitor(address)`, `setDemurrageRange(uint256 min, uint256 max)` onlyOwner
  - Linear decay approximation per epoch (already the pattern in existing contract)

- [ ] **20. Add circuit breaker logic to Pipeline**
  - File: `contracts/src/Pipeline.sol`
  - Add enum: `PoolPhase { Steady, Bull, Shock, Recovery, Collapse }`
  - Add struct: `CircuitBreakerState { PoolPhase phase, uint256 lowThroughputStreak, bool decoupled, uint256 decoupledAtEpoch }`
  - Add state: `mapping(bytes32 pipelineId => mapping(uint256 stageIndex => CircuitBreakerState)) _breakerStates`
  - Add: `checkCircuitBreaker(bytes32 pipelineId, uint256 stageIndex)` public
  - Trigger conditions: throughput < 20% declared for 3 epochs, OR escrow > 90%, OR virial extreme (>5 or <0.2)
  - Immediate trigger: throughput < 5% in single epoch OR escrow > 95%
  - Add: `_decoupleStage()` internal — skips stage during pipeline rebalance
  - Add: `_recoupleStage()` when 3 healthy epochs pass
  - Events: `StageCollapse(bytes32 pipelineId, uint256 stageIndex)`, `StageRecovery(...)`

- [ ] **21. Implement SystemState event emission**
  - New file: `contracts/src/SystemStateEmitter.sol` (lightweight contract or library)
  - Aggregates temperature (from TemperatureOracle), virial (from VirialMonitor), escrow pressure (from EscrowBuffer), phase (from Pipeline circuit breakers)
  - Function: `emitSystemState(bytes32 scope)` — reads all sources, emits single event
  - Event: `SystemStateUpdate(bytes32 indexed scope, uint256 temperature, uint256 virialRatio, uint256 escrowPressure, uint8 phase, uint256 timestamp)`
  - Called per-epoch by OffchainAggregator or any keeper

- [ ] **22. Update OffchainAggregator**
  - File: `contracts/src/OffchainAggregator.sol`
  - Extend `submitBatch()` to also:
    1. Compute attestation variance from the batch
    2. Call TemperatureOracle.updateTemperature(variance, maxVariance)
    3. Call VirialMonitor.updateVirial(throughputValue, totalStaked, totalEscrowed)
  - Add: `submitBoltzmannShares(bytes32 taskTypeId, address[] sinks, uint256[] shares, bytes sig)` — EIP-712 signed
  - New EIP-712 type: BOLTZMANN_SHARES_TYPEHASH
  - Off-chain Node.js/TS service computes: Boltzmann weights from capacity data, aggregates per task type, signs, submits

- [ ] **23. Write tests for all new/modified contracts**
  - New files:
    - `contracts/test/TemperatureOracle.t.sol`
    - `contracts/test/VirialMonitor.t.sol`
    - `contracts/test/SystemStateEmitter.t.sol`
  - Modified test files:
    - `contracts/test/EscrowBuffer.t.sol` — test getEscrowPressure(), PressureChanged event
    - `contracts/test/PricingCurve.t.sol` — test osmotic pressure pricing formula
    - `contracts/test/BackpressurePool.fork.t.sol` — test rebalanceWithShares(), exploration bonus
    - `contracts/test/DemurrageToken.t.sol` — test adaptive decay with mock VirialMonitor
    - `contracts/test/Pipeline.fork.t.sol` — test circuit breaker trigger/recovery
    - `contracts/test/OffchainAggregator.t.sol` — test Boltzmann share submission
  - Add to: `contracts/test/GasBenchmark.t.sol` — gas for all new functions
  - Target: all tests passing, forge test -vvv clean
  - GDA unit distortion test: verify Boltzmann shares don't violate Superfluid unit ceiling

- [ ] **24. Deploy updated contracts to Base Sepolia**
  - Script: `contracts/script/DeployThermodynamic.s.sol` (NEW)
  - Deploy order: TemperatureOracle → VirialMonitor → SystemStateEmitter → redeploy modified contracts
  - Modified contracts must be redeployed (new bytecode): EscrowBuffer, PricingCurve, BackpressurePool, DemurrageToken, Pipeline
  - Wire references: PricingCurve needs TemperatureOracle + EscrowBuffer addresses, etc.
  - Run: `forge script script/DeployThermodynamic.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify`

- [ ] **25. Update all contract addresses**
  - File: `sdk/src/addresses.ts` — add temperatureOracle, virialMonitor, systemStateEmitter addresses
  - File: `web/app/page.tsx` — update any displayed addresses
  - File: `pura/.env.example` — add new contract addresses
  - Rebuild SDK: `cd sdk && npm run build`
  - Sync to pura: `cd pura && npm run sync-sdk`

### New SDK modules needed
- `sdk/src/actions/temperature.ts` — getTemperature(), boltzmannWeight()
- `sdk/src/actions/virial.ts` — getVirialRatio(), recommendedDemurrageRate()
- `sdk/src/actions/systemState.ts` — emitSystemState(), read system state events
- `sdk/src/abis/TemperatureOracle.json`, `VirialMonitor.json`, `SystemStateEmitter.json` (NEW)
- Update `sdk/src/abis/EscrowBuffer.json`, `PricingCurve.json`, `BackpressurePool.json`, `DemurrageToken.json`, `Pipeline.json` (recompiled ABIs)
- Update `sdk/src/abis/OffchainAggregator.json`

### Files touched (Phase 2)
- `contracts/src/TemperatureOracle.sol` (NEW)
- `contracts/src/VirialMonitor.sol` (NEW)
- `contracts/src/SystemStateEmitter.sol` (NEW)
- `contracts/src/interfaces/ITemperatureOracle.sol` (NEW)
- `contracts/src/interfaces/IVirialMonitor.sol` (NEW)
- `contracts/src/EscrowBuffer.sol` (MODIFIED)
- `contracts/src/PricingCurve.sol` (MODIFIED)
- `contracts/src/BackpressurePool.sol` (MODIFIED)
- `contracts/src/DemurrageToken.sol` (MODIFIED)
- `contracts/src/Pipeline.sol` (MODIFIED)
- `contracts/src/OffchainAggregator.sol` (MODIFIED)
- `contracts/test/` — 3 new + 6 modified test files
- `contracts/script/DeployThermodynamic.s.sol` (NEW)
- `sdk/src/addresses.ts`, `sdk/src/actions/` (3 new modules), `sdk/src/abis/` (3 new + 6 updated)

---

## Phase 3 — NIP-90 extension and Nostr adapter (items 26–34)

### Prerequisites
Phase 2 items 13–14 (TemperatureOracle, VirialMonitor deployed). Phase 1 item 4 (standard objects defined).

### Items

- [ ] **26. Write NIP-90 congestion control extension spec**
  - File: `docs/nips/NIP-XX-congestion-control.md` (NEW, or extend existing `docs/nips/NIP-XX-backpressure-relay-economics.md`)
  - Define kinds: 30090 (CapacityAttestation), 30091 (PriceSignal), 30092 (VerificationReceipt), 30093 (SystemState), 20090 (CongestionFeedback, ephemeral — use 20000+ range, not 1090)
  - All are NIP-33 parameterized replaceable events (30000-39999 range) except ephemeral
  - Tag schemas per research spec
  - Client routing algorithm: Boltzmann selection with temperature from kind 30093

- [ ] **27. Implement Nostr event publishing for CapacityAttestation (kind 30090)**
  - New file: `sdk/src/nostr/capacity-attestation.ts` (or add to existing relay module)
  - Uses `nostr-tools` for event creation + Schnorr signing
  - Maps from on-chain CapacityAttestation to Nostr event tags
  - Includes confidence block tags: attestation_variance, epochs_since_last_change, verification_hit_rate

- [ ] **28. Implement Nostr event publishing for PriceSignal (kind 30091)**
  - New file: `sdk/src/nostr/price-signal.ts`
  - Tags: base_fee_msat, queue_premium_msat, escrow_pressure_premium_msat, total_msat, utilization_pct
  - Includes system_state tags: temperature, virial-ratio, escrow-pressure, phase

- [ ] **29. Implement Nostr event publishing for VerificationReceipt (kind 30092)**
  - New file: `sdk/src/nostr/verification-receipt.ts`
  - Maps from CompletionTracker receipts to Nostr events
  - Regular event (not replaceable) — each receipt is unique

- [ ] **30. Implement Nostr event publishing for SystemState (kind 30093)**
  - New file: `sdk/src/nostr/system-state.ts`
  - Tags: temperature, virial-ratio, escrow-pressure, phase, demurrage-rate, exploration-epsilon, provider-count, total-spare-capacity, attestation-variance
  - Parameterized replaceable: d tag = pool identifier
  - Published once per epoch

- [ ] **31. Implement ephemeral CongestionFeedback event (kind 20090)**
  - New file: `sdk/src/nostr/congestion-feedback.ts`
  - Ephemeral (20000-29999 range) — not stored by relays
  - Real-time congestion signals between clients

- [ ] **32. Build reference NIP-90 client routing logic**
  - New file: `sdk/src/nostr/client-router.ts`
  - Steps: query kind 30090 → query kind 30093 → extract temperature → compute Boltzmann weights client-side → (1-ε) weighted selection + ε uniform → submit job (kind 5050)
  - Uses Jain's fairness index for routing quality metrics
  - This is the client-side counterpart to the on-chain BackpressurePool

- [ ] **33. Submit NIP extension as PR to nostr-protocol/nips**
  - Requires: working reference implementation (items 27-32)
  - Format per NIP-01 conventions
  - Reference implementation links to SDK and reference DVM (Group 4)

- [ ] **34. Publish long-form Nostr article (NIP-23)**
  - Explain the extension: why congestion control for DVMs, how Boltzmann routing works, what operators get
  - Publish via standard NIP-23 kind 30023 event
  - Cross-post to bit.recipes/blog

### Files touched (Phase 3)
- `docs/nips/NIP-XX-congestion-control.md` (NEW or MODIFIED)
- `sdk/src/nostr/` directory (NEW, 6 files)
- `sdk/package.json` — add `nostr-tools` dependency if not present

---

## Phase 4 — Reference DVM (items 35–43)

### Prerequisites
Phase 2 (contracts deployed), Phase 3 items 27-30 (Nostr event publishing).
Decision: build without OpenClaw. DVM uses direct CapacityRegistry + CompletionTracker, not OpenClawCapacityAdapter.

### Items

- [ ] **35. Choose DVM job type**
  - Recommend: text summarization (kind 5050) — simple, well-understood, easy to verify completeness
  - Alternative: text generation (kind 5050, different params) or content moderation

- [ ] **36. Build reference DVM backend**
  - New directory: `dvm/` (or `pura/lib/dvm/`)
  - TypeScript/Node.js service
  - Connects to relay(s) via nostr-tools
  - Subscribes to NIP-90 job requests (kind 5050)
  - Processes via OpenAI API (or local model)
  - Publishes job result (kind 6050) and feedback (kind 7000)
  - Config: relay URLs, model endpoint, capacity declaration, nostr private key

- [ ] **37. Deploy DVM on pura**
  - Run as background process or edge function
  - Alternative: standalone deployment on Railway/Fly.io
  - Listens for NIP-90 job requests, publishes results

- [ ] **38. Integrate capacity attestation publishing**
  - DVM publishes kind 30090 each epoch (5 min)
  - Reads own spare capacity: declared_max - current_queue_depth
  - Includes confidence block (variance from recent attestations, verification hit rate)
  - Uses SDK nostr/capacity-attestation.ts module

- [ ] **39. Integrate price signal publishing**
  - DVM publishes kind 30091
  - Price computed from PricingCurve contract (reads on-chain) + local queue state
  - Includes escrow_pressure_premium from EscrowBuffer

- [ ] **40. Integrate verification on completions**
  - On job completion: generate VerificationReceipt
  - Call CompletionTracker.recordCompletion() on-chain (dual-signed)
  - Publish kind 30092 to relay
  - Verification: check output non-empty, word count meets threshold, no repetition

- [ ] **41. Connect DVM to BackpressurePool**
  - DVM operator stakes via StakeManager
  - Registers as sink in CapacityRegistry
  - Joins BackpressurePool for its task type
  - Receives streaming payments via Superfluid GDA

- [ ] **42. Run reference DVM live**
  - Publish its npub and relay URLs at pura.xyz/docs/reference-dvm
  - Testable by anyone with Nostr client

- [ ] **43. Build DVM deployment flow in pura**
  - New route: `pura/app/deploy/dvm/page.tsx`
  - Steps: connect wallet → select job type → configure capacity → stake → deploy
  - Initially: guided manual deployment (copy commands + config)
  - Later: one-click deployment with NIP-07 signing

### Files touched (Phase 4)
- `dvm/` directory (NEW) — or `pura/lib/dvm/`
- `pura/app/deploy/dvm/page.tsx` (NEW)
- `pura/app/deploy/dvm/page.module.css` (NEW)
- SDK used for on-chain operations

---

## Phase 5 — Shadow mode (items 44–54)

### Prerequisites
Phase 2 (contracts), Phase 3 items 27-31 (Nostr publishing). Can run in parallel with Phase 4.

### Items

- [ ] **44. Build @pura/shadow npm package**
  - New directory: `shadow/` at repo root (or `pura/lib/shadow/`)
  - Core: event ingestion pipeline with pluggable inputs
  - package.json: name `@pura/shadow`

- [ ] **45. Implement webhook input mode**
  - HTTP endpoint that accepts JSON events (capacity updates, job completions)
  - Parses into internal CapacityAttestation / CompletionEvent types

- [ ] **46. Implement Nostr subscription input mode**
  - Subscribes to specified relay(s) for operator's NIP-90 events
  - Filters by operator pubkey
  - Parses kinds 5050 (requests), 6050 (results), 7000 (feedback), 30090 (capacity)

- [ ] **47. Implement log-tail input mode**
  - Reads from stdin or file path
  - Parses structured JSON log lines
  - For operators who log to files instead of events

- [ ] **48. Implement BPE simulation engine in sidecar**
  - Runs Boltzmann routing simulation over observed traffic
  - Computes: what would BPE have done differently?
  - Outputs: projected routing changes, revenue impact, congestion detection
  - Uses formulas from research: Boltzmann P(i), EWMA smoothing, Jain fairness

- [ ] **49. Implement pura-verify hook**
  - Optional: run verification checks on observed completions
  - Flag false-success rate (claimed completions that verification would reject)

- [ ] **50. Implement local JSON log output**
  - Shadow mode writes structured logs to configurable path
  - Format matches SystemState schema

- [ ] **51. Implement WebSocket feed**
  - Real-time push to connected dashboard clients
  - Pushes: system state updates, routing decisions, congestion events, verification results

- [ ] **52. Build /monitor dashboard UI**
  - New routes under `pura/app/monitor/`:
    - `pura/app/monitor/page.tsx` — overview
    - `pura/app/monitor/capacity/page.tsx` — capacity registry view (existing, may need updates)
    - `pura/app/monitor/system/page.tsx` (NEW) — thermodynamic state panel: temperature gauge, virial ratio, escrow pressure bar, phase badge
    - `pura/app/monitor/congestion/page.tsx` (NEW) — congestion signals, pricing chart
    - `pura/app/monitor/verify/page.tsx` (NEW) — verification results, completion audit trail
  - Components: temperature gauge (ASCII art or SVG), virial dial, pressure bar, phase state machine visualization
  - Data source: WebSocket from shadow sidecar or direct API reads

- [ ] **53. Write shadow mode integration docs**
  - New content: `pura/app/docs/shadow-mode/page.tsx` (or MDX)
  - Install guide, configuration, interpretation of dashboard metrics

- [ ] **54. Run shadow mode on reference DVM**
  - Connect shadow sidecar to reference DVM (Phase 4)
  - Generate real dashboard data for screenshots and demos
  - Verify end-to-end: DVM serves jobs → shadow observes → dashboard renders

### Files touched (Phase 5)
- `shadow/` directory (NEW, npm package)
- `pura/app/monitor/system/page.tsx` (NEW)
- `pura/app/monitor/congestion/page.tsx` (NEW)
- `pura/app/monitor/verify/page.tsx` (NEW)
- Various CSS module files for new pages

---

## Phase 6 — Benchmark (items 55–62)

### Prerequisites
Phase 2 (physics contracts implemented — needed for BPE-Boltzmann strategy).

### Items

- [ ] **55. Define benchmark workload specification**
  - YAML config: provider count, demand pattern (steady, bursty, growth), duration epochs, capacity distribution
  - Configurable for reproducibility

- [ ] **56. Implement benchmark simulation engine**
  - Extend `simulation/bpe_sim.py` or build new TypeScript engine at `bitrecipes/lib/benchmark/`
  - Agent-based: providers with capacity, sources with demand, routing layer
  - Metric collection per epoch: completion rate, latency, fairness, revenue, false-success, temperature adaptation

- [ ] **57. Implement 5 routing strategies**
  - Current simulation has 3 (backpressure, round-robin, random). Add:
  - Strategy 4: BPE-Deterministic (current proportional routing — the "old" BPE)
  - Strategy 5: BPE-Boltzmann (temperature-adaptive stochastic routing + osmotic pricing + exploration)
  - Key result: Strategy 5 beats Strategy 4, proving physics integration adds measurable value

- [ ] **58. Implement benchmark metric collection**
  - Metrics per research spec: completion rate, latency percentiles (p50/p95/p99), Jain fairness index, revenue capture %, false-success rate, burst recovery time
  - New physics metrics: temperature responsiveness, virial convergence time, exploration discovery rate, circuit breaker activation count

- [ ] **59. Build interactive benchmark UI at bit.recipes/benchmark**
  - New route: `bitrecipes/app/benchmark/page.tsx`
  - Interactive: select strategies, adjust parameters, run simulation, see live charts
  - Uses recharts (already in bitrecipes dependencies) for visualization
  - Head-to-head strategy comparison view

- [ ] **60. Run benchmark and record results**
  - Run all 5 strategies across standard workloads
  - Record numerical results for paper (Section 6)
  - Key numbers: BPE-Boltzmann vs BPE-Deterministic improvement %

- [ ] **61. Publish benchmark results blog post**
  - New content: `bitrecipes/content/blog/benchmark-results.md` (or MDX)
  - Accessible summary of what the benchmark shows
  - Charts embedded

- [ ] **62. Open-source benchmark code**
  - Ensure benchmark engine is in the public repo
  - README with reproduction instructions

### Files touched (Phase 6)
- `simulation/bpe_sim.py` (MODIFIED — add 2 strategies + new metrics)
- `bitrecipes/app/benchmark/page.tsx` (NEW)
- `bitrecipes/lib/benchmark/` directory (NEW)
- `bitrecipes/content/blog/benchmark-results.md` (NEW)

---

## Phase 7 — Stress test (items 63–66)

### Prerequisites
Phase 6 (benchmark engine built).

### Items

- [ ] **63. Build stress test simulator**
  - New route: `bitrecipes/app/simulate/stress-test/page.tsx`
  - Uses benchmark engine with extreme parameters

- [ ] **64. Implement scenarios**
  - 10x burst: sudden demand spike
  - Provider dishonesty: 30% of providers over-report capacity by 2x
  - Mass offline: 50% of providers go offline simultaneously
  - Stale data: attestations delayed by 10 epochs
  - Sybil attack: one entity splits into 10 identities
  - Pipeline cascade: one stage in a 3-stage pipeline collapses

- [ ] **65. Show with/without BPE-Boltzmann comparison**
  - Each scenario: show outcome under random, deterministic BPE, and Boltzmann BPE
  - Circuit breaker scenario: show cascade prevention

- [ ] **66. Publish stress test blog post**
  - "What Happens When Your Agent Economy Gets 10x Traffic"
  - `bitrecipes/content/blog/stress-test.md`

### Files touched (Phase 7)
- `bitrecipes/app/simulate/stress-test/page.tsx` (NEW)
- `bitrecipes/content/blog/stress-test.md` (NEW)
- Reuses benchmark engine from Phase 6

---

## Phase 8 — bit.recipes content (items 67–76)

### Prerequisites
Phase 2 (contracts exist for recipe references). Can run in parallel with Phases 3–5.

### Items

- [ ] **67. Add recipe: "NIP-90 DVM with Congestion Pricing"**
  - File: `bitrecipes/content/recipes/nip90-dvm-congestion-pricing.yaml`
  - Components: CapacityRegistry, PricingCurve (osmotic), TemperatureOracle, BackpressurePool (Boltzmann), CompletionTracker
  - Difficulty: intermediate

- [ ] **68. Add recipe: "Adaptive Demurrage Token Economy"**
  - File: `bitrecipes/content/recipes/adaptive-demurrage-economy.yaml`
  - Components: DemurrageToken, VirialMonitor, VelocityMetrics
  - Difficulty: advanced

- [ ] **69. Add recipe: "Cross-Protocol Settlement Router"**
  - File: `bitrecipes/content/recipes/cross-protocol-settlement.yaml`
  - Components: CrossProtocolRouter, Lightning + Superfluid adapters
  - Difficulty: advanced

- [ ] **70. Add recipe: "Shadow Mode Integration"**
  - File: `bitrecipes/content/recipes/shadow-mode-integration.yaml`
  - Components: @pura/shadow sidecar
  - Difficulty: beginner

- [ ] **71. Add recipe: "Agent Economy Thermometer"**
  - File: `bitrecipes/content/recipes/agent-economy-thermometer.yaml`
  - Components: TemperatureOracle, VirialMonitor, EscrowBuffer, SystemState
  - Difficulty: intermediate

- [ ] **72. Add pattern: "Boltzmann Routing"**
  - File: `bitrecipes/content/patterns/boltzmann-routing.yaml`
  - Interactive: temperature slider visualization (needs custom component)
  - Component: BackpressurePool + TemperatureOracle

- [ ] **73. Add pattern: "Virial Ratio Diagnostic"**
  - File: `bitrecipes/content/patterns/virial-ratio-diagnostic.yaml`
  - Component: VirialMonitor + VelocityMetrics

- [ ] **74. Add pattern: "Osmotic Escrow Pressure"**
  - File: `bitrecipes/content/patterns/osmotic-escrow-pressure.yaml`
  - Interactive: visualization of price curve shift as pressure increases
  - Component: EscrowBuffer + PricingCurve

- [ ] **75. Ensure every recipe has "Deploy on Pura →" button**
  - File: `bitrecipes/components/RecipeCard.tsx` and `bitrecipes/app/recipes/[slug]/page.tsx`
  - Add deploy link: `https://pura.xyz/deploy/{type}`

- [ ] **76. Ensure every recipe has "Fork on GitHub →" link**
  - Add to recipe YAML schema: `github_url` field
  - Display in recipe detail page

### Files touched (Phase 8)
- `bitrecipes/content/recipes/` — 5 new YAML files
- `bitrecipes/content/patterns/` — 3 new YAML files
- `bitrecipes/components/RecipeCard.tsx`, `bitrecipes/app/recipes/[slug]/page.tsx` (MODIFIED)
- Interactive components for patterns 72 and 74 (NEW)

---

## Phase 9 — Distribution and skills (items 77–80)

### Prerequisites
Phase 4 (reference DVM), Phase 5 (shadow mode) — working artifacts to distribute.

### Items

- [ ] **77. Build Pura MCP server**
  - New directory: `mcp/` or `pura/lib/mcp/`
  - Tools: deploy_service, check_capacity, get_shadow_metrics, run_benchmark, verify_completion
  - Exposes pura operations to AI agents via MCP protocol

- [ ] **78. Build OpenClaw skill for Pura**
  - Skill: monitor capacity, check system state, manage deployments from chat
  - Depends on OpenClaw being available (currently not deployed)
  - Fallback: build as standalone SDK wrapper, register when OpenClaw is live

- [ ] **79. Publish Buildlog integration recipes**
  - .buildlog files for:
    - Deploy your first DVM on Pura
    - Set up shadow mode for an existing relay
    - Integrate verification into your agent pipeline

- [ ] **80. Submit MCP server and skill to registries**
  - MCP: submit to MCP server registry
  - OpenClaw: submit when deployed

### Files touched (Phase 9)
- `mcp/` directory (NEW)
- Buildlog recipe files (NEW)

---

## Phase 10 — Design partner recruitment (items 81–86)

### Prerequisites
Phase 5 (shadow mode functional).

### Items

- [ ] **81. Identify 10 target operators**
- [ ] **82. Outreach with shadow mode offer**
- [ ] **83. Run customer discovery interviews**
- [ ] **84. Get 3-5 shadow mode installations running**
- [ ] **85. Collect metrics for 2+ weeks**
- [ ] **86. Write case study from first design partner**

---

## Phase 11 — Paper and credibility (items 87–93)

### Prerequisites
Phase 6 (benchmark results), Phase 10 (design partner data if available).

### Items

- [ ] **87. Write paper per revised outline**
- [ ] **88. Include benchmark results**
- [ ] **89. Include design partner data if available**
- [ ] **90. Submit to arXiv**
- [ ] **91. Identify peer-reviewed venue**
- [ ] **92. Prepare grant applications**
- [ ] **93. Submit grant applications**

---

## Phase 12 — Assessment and next direction (items 94–99)

### Prerequisites
Phases 6, 10, 11 complete.

### Items

- [ ] **94. Review shadow mode adoption metrics**
- [ ] **95. Review benchmark engagement (views, forks, runs)**
- [ ] **96. Review NIP PR feedback from Nostr community**
- [ ] **97. Review design partner feedback and conversion**
- [ ] **98. Decide direction: Nostr DVM path, HTTP/agent-framework expansion, or pivot**
- [ ] **99. Plan next sequence**

---

## Dependency graph

```
Phase 1 (Narrative) ──┬──> Phase 2 (Contracts) ──┬──> Phase 3 (NIP-90) ──> Phase 4 (DVM) ──┐
                       │                           │                                          │
                       │                           ├──> Phase 5 (Shadow) ──> Phase 10 (Partners)
                       │                           │                                          │
                       │                           ├──> Phase 6 (Benchmark) ──> Phase 7 (Stress)
                       │                           │                                          │
                       │                           └──> Phase 8 (Recipes) [parallel]          │
                       │                                                                      │
                       └──> (items 5-12 can overlap with Phase 2)                             │
                                                                                              │
                                                            Phase 9 (Distribution) <──────────┤
                                                                                              │
                                                            Phase 11 (Paper) <────────────────┘
                                                                    │
                                                                    v
                                                            Phase 12 (Assessment)
```

Parallelizable: Phases 3, 4, 5, 8 can run concurrently once Phase 2 is complete.
Critical path: Phase 1 → Phase 2 → Phase 5 → Phase 10 → Phase 11

---

## Summary statistics

- Total items: 99
- New contracts: 3 (TemperatureOracle, VirialMonitor, SystemStateEmitter)
- Modified contracts: 6 (EscrowBuffer, PricingCurve, BackpressurePool, DemurrageToken, Pipeline, OffchainAggregator)
- New test files: 3+
- Modified test files: 6+
- New SDK modules: 3 (temperature, virial, systemState) + 6 Nostr modules
- New pura routes: ~10 (verify/*, monitor/system, monitor/congestion, monitor/verify, deploy/dvm)
- New bitrecipes content: 5 recipes + 3 patterns + 1 benchmark page + 1 stress test page + 2 blog posts
- New NIP spec: 1 (congestion control extension with 5 event kinds)
- New npm package: 1 (@pura/shadow)
- Paper: full rewrite (13 sections)
- Existing contract test count to maintain: 213+ tests all passing
