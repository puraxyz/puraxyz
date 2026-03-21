#!/usr/bin/env python3
"""Add Phase 15 Trust & Security doc entries to docs.ts."""
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_PATH = os.path.join(SCRIPT_DIR, "..", "src", "app", "docs", "docs.ts")

TRUST_MODEL = r"""    {
        title: 'Trust Model',
        slug: 'trust-model',
        description: 'How vr.dev ensures verification integrity through evidence chaining, deterministic checks, and transparency.',
        content: `
# Trust Model

vr.dev is built on a simple premise: **verification results must be trustworthy enough to train on**. This page explains the mechanisms that make that possible.

## The Trust Problem

When you use an LLM-as-judge to evaluate agent work, you inherit the LLM's failure modes: hallucination, sycophancy, inconsistency. Training on these weak signals propagates errors into model weights.

vr.dev addresses this with a layered trust architecture.

## Three Layers of Trust

### Layer 1: Deterministic Verification (HARD tier)

HARD verifiers produce binary pass/fail verdicts by querying actual system state. No LLM in the loop. No ambiguity.

- Database verifier checks the row exists
- File verifier reads bytes from disk
- API verifier makes a real HTTP request

**Trust guarantee**: If the system state matches, the verdict is correct. Period.

### Layer 2: Gated Composition

The composition engine enforces a critical invariant: **SOFT scores are only counted when HARD checks pass first**.

\`\`\`
Episode reward = HARD_gate(order_cancelled) AND HARD_gate(refund_processed)
                ? SOFT_score(email_tone) * weight
                : 0.0
\`\`\`

This prevents reward hacking. An agent cannot earn reward for a well-written email about an order it failed to actually cancel.

### Layer 3: Evidence Chain

Every verification produces an immutable evidence record:

\`\`\`json
{
  "verifier_id": "vr/tau2.retail.order_cancelled",
  "verdict": "PASS",
  "score": 1.0,
  "evidence": {
    "query": "SELECT status FROM orders WHERE id = 42",
    "result": {"status": "cancelled"},
    "snapshot_at": "2026-03-15T10:30:00Z"
  },
  "content_hash": "sha256:a1b2c3...",
  "parent_hash": "sha256:d4e5f6...",
  "verifier_version": "0.1.0"
}
\`\`\`

Evidence records are chained via \`parent_hash\`, creating a Merkle-style append-only log. This makes it computationally infeasible to alter past results without detection.

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Agent claims success but state disagrees | HARD verifiers check real state |
| Agent games soft metrics while violating constraints | Gated composition blocks soft rewards |
| Verification results altered after the fact | Content-hashed evidence chain |
| LLM judge is inconsistent | HARD tier avoids LLM entirely; SOFT tier uses rubrics |
| Verifier code has bugs | Per-verifier fixture tests (positive, negative, adversarial) |
| Prompt injection via agent output | Verifiers never execute agent text; they query state independently |

## Verification Integrity Score

Each verifier's registry entry includes an operational scorecard:

- **Determinism**: Is the result reproducible? (deterministic / probabilistic)
- **Evidence quality**: What kind of proof? (hard-state / rubric-llm / browser-observed)
- **Permissions**: What access does the verifier need? (fs:read, db:read, net:http)
- **Gating**: Should this verifier gate downstream rewards?
`,
    },"""

SANDBOX = r"""    {
        title: 'Execution Sandbox',
        slug: 'execution-sandbox',
        description: 'Security model for verifier execution: permissions, isolation, and safe defaults.',
        content: `
# Execution Sandbox

Verifiers run in your environment, not ours. This page documents the security model.

## Permission Model

Every verifier declares the permissions it requires in its registry entry:

| Permission | What it allows | Example verifiers |
|-----------|---------------|-------------------|
| \`fs:read\` | Read files from disk | document.json.valid, filesystem.file_created |
| \`db:read\` | Execute SELECT queries | database.row.exists, database.row.updated |
| \`net:http\` | Make outbound HTTP GET requests | api.http.status_ok |
| \`shell:exec\` | Run shell commands | code.python.tests_pass, code.python.lint_ruff |
| \`llm:call\` | Call an LLM API | rubric.summary.faithful |
| \`browser:read\` | Read browser DOM state | web.browser.element_visible |

## Security Guarantees

### No Write Operations

HARD verifiers are read-only by design. They observe state but never modify it:

- Database verifiers use SELECT, never INSERT/UPDATE/DELETE
- File verifiers open in read mode only
- API verifiers use GET requests only

### No Agent Text Execution

Verifiers never \`eval()\` or execute agent completions. The agent's text output is compared against ground truth, but never treated as code or commands.

### Scoped Network Access

API verifiers only contact URLs specified in \`ground_truth\`. They don't follow redirects to different hosts or resolve DNS dynamically.

### Timeout Enforcement

All external operations (HTTP, database, shell) enforce configurable timeouts:

- HTTP: 10 seconds default
- Database: 5 seconds default
- Shell: 30 seconds default

## BYOS Bypass

The \`pre_result\` pattern (see [BYOS docs](/docs/byos)) lets you skip all external access entirely. When \`pre_result\` is provided, the verifier performs pure in-memory comparison with zero system access.

## Docker Isolation

For production deployments, the vrdev API server runs in a minimal Docker container:

\`\`\`dockerfile
FROM python:3.11-slim
# No shell tools, no network tools, minimal attack surface
RUN pip install vrdev
\`\`\`

The container has no access to host filesystem, databases, or network beyond what you explicitly configure.
`,
    },"""

COST_LATENCY = r"""    {
        title: 'Cost & Latency Profile',
        slug: 'cost-latency',
        description: 'Performance characteristics and cost model for each verification tier.',
        content: `
# Cost & Latency Profile

Verification speed matters for RL training loops. Here is the performance profile by tier.

## Per-Tier Latency

| Tier | Typical Latency | Cost | LLM Required |
|------|----------------|------|--------------|
| HARD | 1-50ms | Free | No |
| SOFT | 500-2000ms | LLM API cost | Yes |
| AGENTIC | 2-10s | LLM + browser | Yes |

## HARD Tier Details

HARD verifiers are the fastest because they perform simple state checks:

| Verifier Type | Latency | Notes |
|--------------|---------|-------|
| File read + parse | 1-10ms | JSON, CSV, YAML, text |
| Database SELECT | 10-50ms | Single-row lookups |
| HTTP GET | 50-200ms | Network-bound |
| Shell command | 100-5000ms | Depends on command (pytest, ruff) |

### With BYOS (pre_result)

When using the \`pre_result\` pattern, all HARD verifiers drop to **sub-millisecond** latency since they skip external I/O entirely:

| Verifier Type | Latency with pre_result |
|--------------|------------------------|
| Database checks | < 0.1ms |
| API checks | < 0.1ms |
| File checks | < 0.1ms (if content pre-loaded) |

## SOFT Tier Details

SOFT verifiers call an LLM to evaluate text against a rubric:

- **GPT-4o**: ~800ms, ~$0.003/verification
- **Claude Sonnet**: ~1200ms, ~$0.003/verification
- **Local models**: Variable, no API cost

## At Scale: RL Training Loops

For a typical RL training episode with 3 HARD + 1 SOFT verifier:

| Scenario | Total Latency | Cost per Episode |
|----------|--------------|-----------------|
| Live state + LLM | ~2.5s | ~$0.003 |
| BYOS + LLM | ~1.2s | ~$0.003 |
| BYOS only (HARD) | < 1ms | Free |

### 10,000 Episodes

| Mode | Total Time | Total Cost |
|------|-----------|------------|
| Live | ~7 hours | ~$30 |
| BYOS + LLM | ~3.3 hours | ~$30 |
| BYOS HARD-only | ~10 seconds | Free |

## Optimization Tips

1. **Use BYOS for training**: Pre-compute state once, verify thousands of times
2. **Run HARD first**: Gate expensive SOFT calls behind cheap HARD checks
3. **Batch API calls**: Use \`/v1/batch\` endpoint for bulk verification
4. **Cache LLM results**: SOFT verifier results are deterministic for same input + rubric
`,
    },"""

LOCAL_EXEC = r"""    {
        title: 'Local Execution',
        slug: 'local-execution',
        description: 'Run verifiers locally without any HTTP calls - ideal for RL training loops.',
        content: `
# Local Execution

vr.dev is designed to run entirely locally. No API server required. No network calls. No cloud dependency.

## Why Local?

RL training loops run thousands of episodes. Each episode needs fast, deterministic reward computation. HTTP overhead kills throughput.

## SDK-First Architecture

The vrdev Python SDK contains all verifier logic. The API server is optional - it wraps the same SDK for remote access.

\`\`\`python
# This runs 100% locally - no HTTP, no API key needed
from vrdev import get_verifier, VerifierInput

v = get_verifier("vr/code.python.tests_pass")
result = v.verify(VerifierInput(
    completions=["Tests pass"],
    ground_truth={"repo": ".", "test_cmd": "pytest"},
))
\`\`\`

## Local + BYOS = Maximum Speed

Combine local execution with \`pre_result\` for sub-millisecond verification:

\`\`\`python
# No database, no HTTP, no filesystem - pure computation
v = get_verifier("vr/database.row.exists")
result = v.verify(VerifierInput(
    completions=["Row inserted"],
    ground_truth={
        "table": "users",
        "match_columns": {"id": 1},
        "pre_result": {"exists": True},
    },
))
# Takes < 0.1ms
\`\`\`

## When to Use the API Server

The API server (\`vr-api\`) is useful for:

- **Multi-language teams**: Call from TypeScript, Go, Rust via REST
- **Centralized evidence storage**: Evidence records stored in one place
- **Dashboard**: View verification history and statistics
- **CI/CD integration**: Webhook-based verification triggers

## Installation for Local Use

\`\`\`bash
pip install vrdev
\`\`\`

That's it. No Docker, no database, no API keys. The SDK includes all 38 verifiers.

## RL Framework Integration

\`\`\`python
# TRL integration - local, no network
from vrdev import get_verifier, compose, export_to_trl
from vrdev.core.types import PolicyMode

pipeline = compose(
    [get_verifier("vr/tau2.retail.order_cancelled"),
     get_verifier("vr/tau2.retail.refund_processed")],
    policy_mode=PolicyMode.FAIL_CLOSED,
)

# Verify batch of episodes
results = [pipeline.verify(episode) for episode in episodes]

# Export to TRL reward format
export_to_trl(results, output="rewards.jsonl")
\`\`\`
`,
    },"""

EVIDENCE_REPLAY = r"""    {
        title: 'Evidence Replay',
        slug: 'evidence-replay',
        description: 'Re-verify historical episodes from stored evidence records.',
        content: `
# Evidence Replay

Every verification produces an evidence record. These records can be replayed to re-verify historical results.

## How Evidence Works

When a verifier runs, it captures:

1. **Input**: The completions and ground truth it received
2. **State snapshot**: The actual system state it observed (DB row, API response, file content)
3. **Verdict**: PASS/FAIL/ERROR with score
4. **Metadata**: Verifier ID, version, timestamp, content hash

\`\`\`json
{
  "id": "ev_abc123",
  "verifier_id": "vr/tau2.retail.order_cancelled",
  "verifier_version": "0.1.0",
  "timestamp": "2026-03-15T10:30:00Z",
  "input": {
    "completions": ["I cancelled the order"],
    "ground_truth": {"order_id": "ORD-42"}
  },
  "evidence": {
    "query": "SELECT status FROM orders WHERE id = 42",
    "result": {"status": "cancelled"}
  },
  "verdict": "PASS",
  "score": 1.0,
  "content_hash": "sha256:a1b2c3..."
}
\`\`\`

## Replay Use Cases

### 1. Audit Trail

Re-run verification against stored evidence to confirm original results:

\`\`\`python
from vrdev import get_verifier, VerifierInput

# Load stored evidence
evidence = load_evidence("ev_abc123")

# Replay using pre_result (state from original evidence)
v = get_verifier(evidence["verifier_id"])
result = v.verify(VerifierInput(
    completions=evidence["input"]["completions"],
    ground_truth={
        **evidence["input"]["ground_truth"],
        "pre_result": evidence["evidence"]["result"],
    },
))

assert result[0].verdict == evidence["verdict"]
\`\`\`

### 2. Regression Testing

When you update a verifier, replay historical evidence to check for regressions:

\`\`\`bash
vr replay --evidence-dir ./evidence/ --verifier vr/tau2.retail.order_cancelled
\`\`\`

### 3. Training Data Curation

Filter evidence records to build clean training datasets:

\`\`\`python
# Only keep episodes where ALL verifiers passed
clean_episodes = [
    ep for ep in episodes
    if all(e["verdict"] == "PASS" for e in ep["evidence"])
]

export_to_trl(clean_episodes, output="clean_rewards.jsonl")
\`\`\`

## Evidence Chain Integrity

Evidence records are chained using content hashes:

\`\`\`
Record N:   content_hash = sha256(payload_N)
Record N+1: parent_hash  = content_hash_N
            content_hash = sha256(payload_N+1)
\`\`\`

To verify chain integrity:

\`\`\`python
from vrdev.core.evidence import verify_chain

valid = verify_chain(evidence_records)
# Returns True if all hashes are consistent
\`\`\`

If any record was tampered with, the chain breaks and \`verify_chain\` returns False.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/evidence/{hash} | Retrieve a single evidence record |
| GET | /v1/evidence | List evidence records (paginated) |
| POST | /v1/replay | Replay verification from stored evidence |
`,
    },"""


def main():
    with open(DOCS_PATH, "r") as f:
        content = f.read()

    marker = "`,\n    },\n]\n\nexport default docs"
    if marker not in content:
        print("ERROR: Could not find insertion point")
        return

    replacement = (
        "`,\n    },\n"
        + TRUST_MODEL + "\n"
        + SANDBOX + "\n"
        + COST_LATENCY + "\n"
        + LOCAL_EXEC + "\n"
        + EVIDENCE_REPLAY + "\n"
        + "]\n\nexport default docs"
    )
    content = content.replace(marker, replacement)

    with open(DOCS_PATH, "w") as f:
        f.write(content)
    print(f"Done - added 5 Phase 15 doc entries")


if __name__ == "__main__":
    main()
