# Absorbing vr.dev into the Pura monorepo

## Thesis

vr.dev (Verifiable Rewards) is a standalone agent verification platform: a Python SDK, 38-verifier registry, composition engine, evidence chain, and on-chain anchoring on Base L2. Its verification pipeline maps directly onto Pura's completion receipt infrastructure. Both systems answer the same question — did the agent actually do the work? — using overlapping primitives (dual-signed receipts, on-chain evidence, reputation scoring from verified outcomes).

Absorbing vr.dev eliminates duplicated on-chain anchoring infrastructure, gives Pura a production-grade verification mechanism to replace the minimal dual-signature implementation in DarkSource, and creates a single narrative: Pura routes, prices, and settles capacity. vr.dev verifies the work happened.

buildlog.ai stays separate. The user profile (developers recording Cursor sessions) has no overlap with capacity-market participants. No natural integration point exists today.

---

## Current state of vr.dev

Source repos: `github.com/espetey/vrdev` (website) + `github.com/vrDotDev/vr-dev` (Python SDK + registry)

| Component | Stack | Notes |
|-----------|-------|-------|
| Website | Next.js 15, Mantine UI, Clerk auth, Prisma + NeonDB, Vercel | Different from Pura's Next.js 16 + CSS Modules pattern |
| Python SDK | `pip install vrdev`, 38 verifiers, 19 domains | HARD / SOFT / AGENTIC tiers, composition engine, BYOS pattern |
| CLI | `vr verify`, `vr compose`, `vr test` | Wraps SDK |
| REST API | `api.vr.dev/v1`, Bearer auth | Hosted verification + evidence storage |
| Evidence chain | SHA-256 content hashing, Ed25519 signing, Merkle log | Optional on-chain anchoring on Base L2 (append-only contract) |
| MCP server | FastMCP, 6 tools | Claude Desktop / Cursor integration |
| Training export | TRL, VERL, OpenClaw adapters | Drop-in reward functions |
| Pricing | Free local, USDC micropayments via x402 on Base | $0.005 HARD, $0.05 SOFT, $0.15 AGENTIC |
| Users | Zero | Blank slate — absorption has no migration cost |

---

## Integration surfaces

Five points where vr.dev maps onto existing Pura contracts and SDK.

### I1: CompletionTracker receipts

`CompletionTracker.sol` verifies dual-signed EIP-712 completion receipts and tracks per-sink completion rates over rolling 5-minute epochs. Currently the receipt contains a `taskId` and two signatures. It says "task happened" but not "task was verified as correct."

vr.dev's evidence chain produces a structured record per verification: verifier ID, verdict (PASS/FAIL), score (0.0–1.0), raw evidence, and a SHA-256 content hash. That evidence hash can serve as the `taskId` in a CompletionTracker receipt, binding on-chain records to off-chain evidence payloads. PASS → generate receipt. FAIL → no receipt. The CompletionTracker's existing slash threshold (50% completion rate) and 3-epoch consecutive-failure trigger remain unchanged; they now operate on verification outcomes rather than raw self-reports.

### I2: OpenClawCompletionVerifier

`OpenClawCompletionVerifier.sol` bridges OpenClaw skill execution receipts to CompletionTracker via a `SkillExecution` EIP-712 typehash. Flow: agent + requester co-sign → contract verifies both signatures → forwards `recordCompletion()` to CompletionTracker.

vr.dev already has an OpenClaw adapter (`vrdev.adapters.openclaw`) that wraps composed verifier pipelines as skill reward functions. The bridge: a vr.dev pipeline runs HARD+SOFT verification → if it passes, the SDK generates the co-signed `SkillExecution` receipt → submits it to OpenClawCompletionVerifier. The evidence hash gets embedded in the receipt's `executionId` field.

### I3: OpenClawReputationBridge

`OpenClawReputationBridge.sol` accepts completion/failure reports from authorized reporters and pushes them to `ReputationLedger.sol` (10 points per completion, 10 × 3x multiplier per failure). Currently reporting is manual or off-chain triggered.

After absorption, the vr.dev pipeline becomes an authorized reporter. PASS verdicts trigger `reportCompletion()`. FAIL verdicts trigger `reportFailure()`. Reputation scores in DarkSource then reflect verified outcomes rather than self-reported ones.

### I4: On-chain anchoring consolidation

vr.dev publishes Merkle roots to an append-only contract on Base L2. Pura also deploys on Base. After absorption, the Merkle root contract can be shared (or closely co-located) with CompletionTracker's evidence anchoring. Single deployment, single source of truth for tamper-evident verification records.

### I5: SDK bridging

The Pura SDK (`@puraxyz/sdk`, TypeScript) has an `openclaw` action module with `verifyExecution()`, `reportCompletion()`, and `reportFailure()`. The vr.dev SDK (`vrdev`, Python) has `verify()`, `compose()`, and training export functions.

After absorption, two SDK entry points serve two audiences:
- TypeScript SDK (`@puraxyz/sdk`) for on-chain operations: registering agents, submitting receipts, querying reputation
- Python SDK (`vrdev`) for off-chain verification: running verifiers, composing pipelines, generating evidence, feeding training loops

The Python SDK calls the TypeScript SDK's contract interactions via the REST API or a direct viem bridge for on-chain submission.

---

## Repo structure after absorption

```
synthesi/
├── contracts/          (unchanged)
├── sdk/                (unchanged — TypeScript SDK)
├── gateway/            (Mandalay)
├── relay-dash/         (Relay.Gold)
├── lightning-dash/     (Lightning.Gold)
├── agent-explorer/     (DarkSource)
├── router/             (internal simulation demo)
├── vr/                 (NEW — absorbed from espetey/vrdev)
│   ├── web/            (vr.dev Next.js website, keeps Mantine/Clerk stack)
│   ├── sdk/            (Python SDK — the vrdev package)
│   │   ├── vrdev/      (package source)
│   │   ├── setup.py
│   │   └── pyproject.toml
│   ├── registry/       (verifier definitions — VERIFIER.json + fixtures)
│   │   └── verifiers/
│   ├── api/            (hosted API server)
│   └── README.md
├── web/                (pura.xyz marketing site)
├── docs/               (paper)
├── plan/
├── gtm/
├── simulation/
├── scripts/
└── website/            (MkDocs documentation)
```

The `vr/` directory is a self-contained subtree. The Python SDK continues to publish to PyPI as `vrdev`. The website continues to deploy to vr.dev. No UI framework merge — vr.dev keeps Mantine, Pura products keep CSS Modules.

---

## What changes in agent-explorer (DarkSource)

DarkSource currently polls `openclaw.getAgentsForSkill()` and displays agent reputation from the ReputationLedger. After absorption:

1. The `/api/state` endpoint additionally fetches recent verification evidence for each agent (via the vr.dev API or direct SDK call)
2. Agent cards display verification-backed reputation: completion counts sourced from CompletionTracker records that map to vr.dev evidence hashes, not just raw `reportCompletion()` tallies
3. A "verify" action becomes available: requesters can trigger a vr.dev verification pipeline against an agent's last execution and see the evidence payload
4. The FAQ section explains that reputation scores come from verified outcomes, linking to vr.dev docs

## What changes in contracts

Nothing. The existing interfaces (`ICompletionTracker`, `OpenClawCompletionVerifier`, `OpenClawReputationBridge`, `ReputationLedger`) already support the absorption without modification. The integration is at the SDK/application layer — it generates the same EIP-712 signed receipts and calls the same functions. The only new on-chain artifact is potentially consolidating vr.dev's Merkle root anchor contract with the existing deployment, which is additive.

## What changes in the Pura SDK

Add a `verify` action module (`sdk/src/actions/verify.ts`) that:
- Accepts a vr.dev evidence hash and converts it to a CompletionTracker-compatible `taskId`
- Wraps the `recordCompletion()` flow with evidence hash embedding
- Provides `submitVerifiedCompletion()` that takes a vr.dev pipeline result and generates + submits the dual-signed receipt in one call

About 50 lines of TypeScript wrapping the existing `completion.recordCompletion()` with the evidence hash as the taskId.

---

## Build sequence

### Phase 1: Repo migration (no code changes)

1. Clone `espetey/vrdev` into `synthesi/vr/web/`
2. Clone `vrDotDev/vr-dev` (Python SDK + registry) into `synthesi/vr/sdk/` and `synthesi/vr/registry/`
3. Update `.gitignore` and root-level tooling to recognize the `vr/` subtree
4. Verify `vr/web/` builds independently (`npm install && npm run build` from `vr/web/`)
5. Verify `vr/sdk/` tests pass independently (`pip install -e . && pytest`)
6. Commit: "Absorb vr.dev into monorepo"

### Phase 2: SDK bridge (*depends on Phase 1*)

7. Create `sdk/src/actions/verify.ts` with `submitVerifiedCompletion()` that takes an evidence hash and generates a CompletionTracker receipt
8. Export the new module from `sdk/src/index.ts`
9. Add a thin Python wrapper in `vr/sdk/vrdev/adapters/pura.py` that calls the TypeScript SDK's contract functions via REST or direct viem RPC to submit verified completions on-chain
10. Write tests: given a mock vr.dev pipeline result, verify the correct EIP-712 receipt is generated and `recordCompletion()` is called with the evidence hash as taskId

### Phase 3: DarkSource integration (*depends on Phase 2*)

11. Update `agent-explorer/app/api/state/route.ts` to include verification evidence alongside reputation data
12. Update `agent-explorer/app/page.tsx` to display verification-sourced reputation (evidence hash links, verified completion counts)
13. Add an `/api/verify` endpoint that triggers a vr.dev pipeline run for a given agent execution
14. Update the DarkSource README

### Phase 4: Evidence anchoring consolidation (*parallel with Phase 3*)

15. Deploy a shared Merkle root anchor contract on Base Sepolia (or reuse the existing vr.dev contract if it's already there)
16. Update `vr/sdk/` on-chain anchoring config to point at the shared contract
17. Update deployment addresses in `contracts/deployments/base-sepolia.json`

### Phase 5: Cross-linking and content (*depends on Phases 3–4*)

18. Update `web/content/docs/products.mdx` to describe vr.dev as the verification layer
19. Update `website/explainer.md` and `website/index.md` with vr.dev integration description
20. Add a blog post: how vr.dev verification feeds into Pura reputation
21. Update `gtm/` materials to reference the integrated verification story
22. Update `plan/README.md` document index to include this file

---

## Decisions

- **D1: vr.dev keeps its own UI framework.** Mantine + Clerk differs from the CSS Modules approach in gateway/relay-dash/lightning-dash/agent-explorer. Forcing a rewrite adds work with no user benefit. The vr.dev website deploys to vr.dev independently.
- **D2: Python SDK continues publishing to PyPI as `vrdev`.** The package name and install path are established. No rename.
- **D3: No contract changes required.** CompletionTracker, OpenClawCompletionVerifier, and ReputationLedger interfaces accommodate vr.dev evidence hashes without modification.
- **D4: buildlog.ai stays separate.** No overlapping user profile, no natural protocol integration point, different product category.
- **D5: The `vr/` subtree is self-contained.** It builds, tests, and deploys independently. Integration lives at the SDK bridge layer (`sdk/src/actions/verify.ts` + `vr/sdk/vrdev/adapters/pura.py`).
- **D6: vr.dev's x402 USDC micropayments stay unchanged.** Per-verification fees (x402 on Base) and Pura's Superfluid streaming payments operate at different granularities and serve different purposes.

---

## Scope

**Included:**
- Repo migration (clone into monorepo)
- TypeScript SDK bridge (`verify.ts`)
- Python SDK adapter (`pura.py`)
- DarkSource UI updates for verification-backed reputation
- Evidence anchoring consolidation
- Content and GTM updates

**Excluded:**
- Rewriting vr.dev's website to match Pura's UI framework
- Migrating vr.dev's NeonDB/Prisma backend into Pura infrastructure
- Building new verifiers
- Changing the `vrdev` package name or public API
- Absorbing buildlog.ai
