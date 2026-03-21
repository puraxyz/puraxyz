# vr.dev — Verifiable Rewards

Agent verification platform absorbed into the Backproto monorepo. Provides a Python SDK, 38-verifier registry, composition engine, evidence chain, and on-chain anchoring on Base L2.

See [plan/12-VR-ABSORB.md](../plan/12-VR-ABSORB.md) for the absorption rationale and integration plan.

## Structure

```
vr/
├── web/        Next.js website (Mantine UI, Clerk auth) — deploys to vr.dev
├── sdk/        Python SDK — publishes to PyPI as `vrdev`
├── registry/   Verifier definitions (schemas, skills, verifiers)
├── api/        Hosted verification API server
└── contracts/  EvidenceAnchor.sol (Merkle root anchoring)
```

## Integration with Backproto

vr.dev's evidence hashes feed into Backproto's completion receipt infrastructure:

- **CompletionTracker**: evidence hash serves as `taskId` in dual-signed receipts
- **OpenClawCompletionVerifier**: evidence hash serves as `executionId` in skill execution receipts
- **OpenClawReputationBridge**: PASS/FAIL verdicts trigger `reportCompletion()`/`reportFailure()`

The bridge lives in two places:
- `sdk/src/actions/verify.ts` (TypeScript, on-chain submission)
- `vr/sdk/src/vrdev/adapters/backproto.py` (Python, calls TS SDK via REST)

## Independent operation

Each subdirectory builds, tests, and deploys independently:

```bash
# Website
cd vr/web && npm install && npm run build

# Python SDK
cd vr/sdk && pip install -e ".[dev]" && pytest

# API
cd vr/api && pip install -e ".[dev]" && pytest
```
