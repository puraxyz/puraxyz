export type Doc = {
    title: string
    slug: string
    description: string
    content: string
}

const docs: Doc[] = [
    {
        title: 'Quickstart',
        slug: 'quickstart',
        description: 'Get up and running with the vrdev SDK in under 5 minutes.',
        content: `
# Quickstart

Get from zero to verified in under 5 minutes. No API key needed; everything runs locally.

## Install the SDK

\`\`\`bash
pip install vrdev
\`\`\`

## Verify your first result

The simplest way to start: verify pre-fetched state with a BYOS (Bring Your Own State) example. No database, no API, no credentials needed:

\`\`\`python
from vrdev import get_verifier, VerifierInput

v = get_verifier("vr/document.json.valid")
result = v.verify(VerifierInput(
    completions=["Generated valid JSON config"],
    ground_truth={
        "file_path": "config.json",
        "pre_result": {"valid": True, "content": {"name": "my-app", "version": "1.0"}},
    },
))
print(result[0].passed)    # True
print(result[0].score)     # 1.0
print(result[0].evidence)  # dict with validation details
\`\`\`

## Verify against live state

If you have a Python project with tests, try verifying against real system state:

\`\`\`python
from vrdev import get_verifier, VerifierInput

v = get_verifier("vr/code.python.tests_pass")
result = v.verify(VerifierInput(
    completions=["Tests pass"],
    ground_truth={"repo": ".", "test_cmd": "pytest"},
))
print(result[0].passed)    # True / False
print(result[0].score)     # 1.0 or 0.0
print(result[0].evidence)  # dict with raw test output
\`\`\`

## CLI usage

\`\`\`bash
vr verify \\
  --verifier vr/code.python.tests_pass \\
  --ground-truth '{"repo": ".", "test_cmd": "pytest"}'

# ✓ PASS  score=1.0  evidence=test-output
\`\`\`

## Compose a reward pipeline

Chain verifiers into a pipeline. HARD verifiers act as gates: if they fail, SOFT scores are discarded.

\`\`\`python
from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

pipeline = compose(
    [get_verifier("vr/tau2.retail.order_cancelled"),
     get_verifier("vr/rubric.email.tone_professional")],
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = pipeline.verify(VerifierInput(
    completions=["Order cancelled and confirmation sent"],
    ground_truth={"order_id": "ORD-42"},
))
print(result[0].passed)        # True only if HARD gate passes
print(result[0].evidence)      # dict with evidence
\`\`\`

## Optional: Hosted API

For tamper-evident evidence, team dashboards, and multi-language access:

1. Sign up at [vr.dev](https://vr.dev)
2. Navigate to **API Keys** and create a key
3. Use the hosted API (see [Local vs Hosted](/docs/local-vs-hosted))

## Next steps

- Browse the [Verifier Registry](/registry) to find verifiers for your domain
- Read the [API Reference](/docs/api-reference) for full endpoint docs
- Understand the [Concepts](/docs/concepts) behind the 3-tier taxonomy
- Learn to [author your own verifiers](/docs/verifier-authoring)
`,
    },
    {
        title: 'Concepts',
        slug: 'concepts',
        description: 'Understand the 3-tier taxonomy, composition engine, and trust model.',
        content: `
# Concepts

## The Problem

Research shows that **27-78% of agent "successes" are procedurally wrong**. The agent claims it completed a task, but the underlying state tells a different story. An order was "cancelled" but the database still shows it active. An email was "sent" but the content is gibberish. Code "passes tests" but the tests were modified to always pass.

RL training on unverified rewards propagates these false successes into the model weights, creating agents that learn to *appear* correct rather than *be* correct.

## Three Tiers of Verification

### HARD: Deterministic State Checks

Binary pass/fail. No LLM in the loop. The verifier queries actual system state (database records, API responses, file contents) and compares against the expected ground truth.

**Examples:** \`tau2.retail.order_cancelled\`, \`code.python.tests_pass\`, \`git.commit_present\`

### SOFT: Rubric-Based LLM Judges

Probabilistic scoring against a rubric. An LLM evaluates a text artifact (email body, summary, code review) against criteria you define. Returns a confidence-weighted score.

**Examples:** \`rubric.email.tone_professional\`, \`rubric.summary.faithful\`, \`rubric.code.logic_correct\`

### AGENTIC: Agent-Driven Probing

A secondary agent inspects the environment to verify the primary agent's work. The verifier *interacts* with the system: clicking through UI, querying APIs, reading DOM state.

**Examples:** \`web.browser.element_visible\`, \`web.browser.screenshot_match\`, \`aiv.email.sent_folder_confirmed\`

## Composition Engine

Verifiers are composed into **reward pipelines** using the \`compose()\` function. Four policy modes:

- **\`fail_closed\`** (recommended): HARD verifiers must pass before SOFT scores are counted. This prevents reward hacking, since an agent cannot game a soft metric while violating hard constraints.
- **\`fail_open\`**: ERROR and UNVERIFIABLE states are excluded from scoring; only explicit FAIL blocks the pipeline.
- **\`escalation\`**: Run tiers in order (HARD \u2192 SOFT \u2192 AGENTIC), stop when a tier passes.
- **\`ensemble\`**: Run all verifiers and aggregate scores.

## Evidence & Trust Model

Every verification produces an **evidence record** containing:

- Raw system state snapshot (API response, DOM, test output)
- Verdict (pass/fail) and score (0.0-1.0)
- Timestamp and verifier version
- SHA-256 content hash

Three levels of trust are available:

1. **Auditability** (local SDK + hosted API): Every result carries raw evidence, so you can always inspect *why* a verdict was issued.
2. **Integrity** (hosted API): Evidence records are Ed25519-signed and chained into a Merkle-style log, making post-hoc tampering detectable.
3. **On-chain anchoring** (optional): Merkle roots are periodically published to Base L2 for third-party-verifiable integrity.

## Integration

Export evidence to training frameworks:

\`\`\`python
from vrdev import export_to_trl, export_to_verl

# Generate TRL-compatible reward dataset
export_to_trl(pipeline_results, output="rewards.jsonl")

# Or VERL format
export_to_verl(pipeline_results, output="verl_rewards/")
\`\`\`
`,
    },
    {
        title: 'API Reference',
        slug: 'api-reference',
        description: 'Complete REST API documentation for the vr.dev verification service.',
        content: `
# API Reference

Base URL: \`https://api.vr.dev/v1\`

All requests require an \`Authorization: Bearer <api_key>\` header.

---

## POST /verify

Run a single verifier against a ground truth payload.

**Request:**

\`\`\`json
{
  "verifier_id": "vr/code.python.tests_pass",
  "completions": ["def add(a, b): return a + b"],
  "ground_truth": {
    "repo": ".",
    "test_cmd": "pytest"
  },
  "context": {}
}
\`\`\`

**Response:**

\`\`\`json
{
  "passed": true,
  "score": 1.0,
  "evidence": {
    "test_output": "3 passed in 0.42s",
    "exit_code": 0
  },
  "evidence_hash": "sha256:a3f1b2c4...",
  "verifier_id": "vr/code.python.tests_pass",
  "tier": "HARD",
  "duration_ms": 1250
}
\`\`\`

---

## POST /compose

Run a pipeline of verifiers in sequence.

**Request:**

\`\`\`json
{
  "verifier_ids": [
    "vr/tau2.retail.order_cancelled",
    "vr/rubric.email.tone_professional"
  ],
  "completions": ["Order cancelled and confirmation sent"],
  "ground_truth": {
    "order_id": "ORD-42"
  },
  "policy_mode": "fail_closed",
  "require_hard": true
}
\`\`\`

**Response:**

\`\`\`json
{
  "all_passed": true,
  "results": [
    { "verifier_id": "vr/tau2.retail.order_cancelled", "passed": true, "score": 1.0, "tier": "HARD" },
    { "verifier_id": "vr/rubric.email.tone_professional", "passed": true, "score": 0.92, "tier": "SOFT" }
  ],
  "evidence_hash": "sha256:b4c2d1e5...",
  "duration_ms": 2100
}
\`\`\`

---

## POST /batch

Verify multiple ground truth payloads against the same verifier or pipeline. Useful for evaluation runs.

**Request:**

\`\`\`json
{
  "verifier": "tau2.retail.order_cancelled",
  "items": [
    { "ground_truth": { "order_id": "ORD-1" } },
    { "ground_truth": { "order_id": "ORD-2" } },
    { "ground_truth": { "order_id": "ORD-3" } }
  ]
}
\`\`\`

**Response:**

\`\`\`json
{
  "results": [
    { "passed": true, "score": 1.0 },
    { "passed": false, "score": 0.0 },
    { "passed": true, "score": 1.0 }
  ],
  "summary": { "total": 3, "passed": 2, "failed": 1 }
}
\`\`\`

---

## POST /export

Export verification results to training framework formats.

**Request:**

\`\`\`json
{
  "format": "trl",
  "pipeline_run_id": "run_abc123"
}
\`\`\`

**Formats:** \`trl\`, \`verl\`, \`jsonl\`

---

## GET /registry

List all available verifiers with metadata.

**Query parameters:**

| Param  | Type   | Description |
|--------|--------|-------------|
| tier   | string | Filter: HARD, SOFT, AGENTIC |
| domain | string | Filter by domain |

**Response:**

\`\`\`json
{
  "verifiers": [
    {
      "id": "vr/code.python.tests_pass",
      "tier": "HARD",
      "domain": "code_quality",
      "description": "..."
    }
  ],
  "total": 38
}
\`\`\`

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400  | Invalid request body |
| 401  | Missing or invalid API key |
| 402  | Free tier exhausted; payment required (x402 USDC) |
| 404  | Verifier not found |
| 429  | Rate limit exceeded |
| 500  | Internal verifier error |
`,
    },
    {
        title: 'Verifier Authoring',
        slug: 'verifier-authoring',
        description: 'Create, test, and publish your own verifiers to the registry.',
        content: `
# Verifier Authoring Guide

## Directory Structure

Every verifier lives under \`registry/verifiers/\`:

\`\`\`
my_org.domain.verifier_name/
├── VERIFIER.json        # Metadata, scorecard, and tier
├── verify.py            # Verification logic
├── positive.json        # Fixtures that should pass (≥3)
├── negative.json        # Fixtures that should fail (≥3)
└── adversarial.json     # Edge cases and attack vectors (≥3)
\`\`\`

## VERIFIER.json

\`\`\`json
{
  "id": "vr/my_org.domain.verifier_name",
  "version": "0.1.0",
  "tier": "HARD",
  "domain": "code_quality",
  "task_type": "code_verification",
  "description": "Verifies that...",
  "scorecard": {
    "determinism": "deterministic",
    "evidence_quality": "high",
    "intended_use": "CI gating",
    "gating_required": false,
    "recommended_gates": [],
    "attack_surface": {
      "prompt_injection": "low",
      "evidence_tampering": "low"
    }
  },
  "permissions_required": ["filesystem"],
  "contributor": "your-github-handle"
}
\`\`\`

## Tier Requirements

| Tier | Determinism | Fixture Requirement | Attack Surface |
|------|-------------|---------------------|----------------|
| **HARD** | Deterministic, binary | 3+ positive, 3+ negative, 3+ adversarial | Must document and mitigate |
| **SOFT** | Probabilistic, 0-1 score | 3+ each, plus inter-rater calibration data | Must declare prompt injection risk |
| **AGENTIC** | Agent-dependent | 3+ each, plus timeout/retry tests | Must declare interaction surface |

## Adversarial Fixtures

Every verifier must include adversarial test cases that attempt to fool the verification. Examples:

- **HARD:** DB record exists but with wrong status; API returns 200 with error in body
- **SOFT:** Prompt-injected text that asks the LLM judge to always return high scores
- **AGENTIC:** DOM elements that look correct visually but have wrong underlying data

## Testing Locally

\`\`\`bash
# Validate structure and scorecard
python scripts/validate_registry.py

# Run all fixture types
vr test --verifier my_org.domain.verifier_name

# Run only adversarial fixtures
vr test --verifier my_org.domain.verifier_name --type adversarial
\`\`\`

## Publishing

1. Fork the \`vr-dev\` repository
2. Add your verifier directory under \`registry/verifiers/\`
3. Each fixture file must have ≥ 3 test cases
4. Run \`python scripts/validate_registry.py\`
5. Open a pull request. CI will run all fixtures automatically
`,
    },
    {
        title: 'CLI Reference',
        slug: 'cli-reference',
        description: 'Command-line interface documentation for the vr tool.',
        content: `
# CLI Reference

## Installation

\`\`\`bash
pip install vrdev
\`\`\`

## Authentication

\`\`\`bash
export VR_API_KEY=vr_live_...
\`\`\`

## Commands

### vr verify

Run a single verifier.

\`\`\`bash
vr verify --verifier <id> --ground-truth '<json>'
\`\`\`

| Flag | Description |
|------|-------------|
| \`--verifier\` | Verifier ID (e.g., \`code.python.tests_pass\`) |
| \`--ground-truth\` | JSON string with input data |
| \`--config\` | Optional JSON config overrides |
| \`--output\` | Output format: \`json\`, \`table\`, \`minimal\` |

### vr compose

Run a pipeline of verifiers.

\`\`\`bash
vr compose \\
  --verifiers tau2.retail.order_cancelled,rubric.email.tone_professional \\
  --ground-truth '{"order_id": "ORD-42"}' \\
  --policy fail_closed
\`\`\`

| Flag | Description |
|------|-------------|
| \`--verifiers\` | Comma-separated list of verifier IDs |
| \`--policy\` | \`fail_closed\` (default), \`fail_open\`, \`escalation\`, or \`ensemble\` |
| \`--ground-truth\` | JSON string with input data |

### vr batch

Run verifier against multiple inputs.

\`\`\`bash
vr batch --verifier tau2.retail.order_cancelled --input batch.jsonl
\`\`\`

### vr list

List available verifiers.

\`\`\`bash
vr list
vr list --tier HARD
vr list --domain code_quality
\`\`\`

### vr test

Run fixtures against a local verifier (for authoring).

\`\`\`bash
vr test --verifier my_org.domain.verifier_name
vr test --verifier my_org.domain.verifier_name --type adversarial
\`\`\`

### vr export

Export results to training formats.

\`\`\`bash
vr export --run run_abc123 --format trl --output rewards.jsonl
\`\`\`
`,
    },
    {
        title: 'Integration Guide',
        slug: 'integration-guide',
        description: 'Connect vr.dev to LangChain, LangGraph, TRL, VERL, OpenClaw, and your agent pipeline.',
        content: `
# Integration Guide

## LangChain / LangGraph

Install with LangChain support:

\`\`\`bash
pip install vrdev[langchain]
\`\`\`

### Option 1: Verify Tool (agent self-verification)

Give your agent a tool it can call to verify its own work:

\`\`\`python
from vrdev import get_verifier, compose
from vrdev.adapters.langchain import VrdevVerifyTool

pipeline = compose([
    get_verifier("vr/tau2.retail.order_cancelled"),
    get_verifier("vr/rubric.email.tone_professional"),
], policy_mode="fail_closed")

tool = VrdevVerifyTool(pipeline)

# Add to any LangChain agent
from langchain.agents import create_react_agent
agent = create_react_agent(llm, tools=[search_tool, api_tool, tool])
\`\`\`

The tool accepts JSON input with \`completion\` and \`ground_truth\` keys and returns the verdict, score, and evidence.

### Option 2: Callback Handler (automatic post-action verification)

Auto-verify when the agent finishes, with results injected into run metadata (visible in LangSmith):

\`\`\`python
from vrdev import get_verifier
from vrdev.adapters.langchain import VrdevCallbackHandler

verifier = get_verifier("vr/tau2.retail.order_cancelled")
handler = VrdevCallbackHandler(
    verifier,
    ground_truth={"order_id": "ORD-42"},
)

result = agent.invoke(
    {"input": "Cancel order ORD-42"},
    config={"callbacks": [handler]},
)

# Check the verdict
print(handler.last_result)
# {"verdict": "PASS", "score": 1.0, "passed": True, ...}
\`\`\`

### Option 3: LangGraph Verification Node

Add verification as a step in your LangGraph workflow:

\`\`\`python
from langgraph.graph import StateGraph
from vrdev import get_verifier, compose
from vrdev.adapters.langgraph import verify_node

pipeline = compose([
    get_verifier("vr/tau2.retail.order_cancelled"),
], policy_mode="fail_closed")

graph = StateGraph(dict)
graph.add_node("act", act_fn)
graph.add_node("verify", verify_node(
    pipeline,
    completion_key="output",
    ground_truth_key="expected",
))
graph.add_edge("act", "verify")
graph.set_entry_point("act")

# The "verify" node reads state["output"] and state["expected"],
# runs the pipeline, and writes the result to state["verification"].
\`\`\`

### When to use which

| Pattern | When to use | Runs |
|---------|-------------|------|
| **VrdevVerifyTool** | Agent decides when to verify (self-check) | On agent tool call |
| **VrdevCallbackHandler** | Auto-verify every agent run | On agent finish |
| **verify_node** | Verification is a graph step with routing logic | As LangGraph node |
| **pipeline.verify()** | Direct call in any Python code | Anywhere |

## TRL (Transformer Reinforcement Learning)

Export verified rewards directly to TRL format:

\`\`\`python
from vrdev import get_verifier, compose, VerifierInput, export_to_trl
from vrdev.core.types import PolicyMode

pipeline = compose(
    [get_verifier("vr/tau2.retail.order_cancelled"),
     get_verifier("vr/rubric.email.tone_professional")],
    require_hard=True,
    policy_mode=PolicyMode.FAIL_CLOSED,
)

# Run verification across your eval set
results = [pipeline.verify(episode) for episode in eval_set]

# Export TRL-compatible reward dataset
export_to_trl(results, output="rewards.jsonl")
\`\`\`

The output JSONL contains one record per verification with the reward signal, evidence hash, and trajectory reference.

## VERL

For VERL-based training:

\`\`\`python
from vrdev import export_to_verl

export_to_verl(results, output="verl_rewards/")
\`\`\`

This generates the directory structure VERL expects, including reward shaping metadata.

## OpenClaw Adapter

The \`openclaw.cancel_and_email\` skill in the registry shows how to integrate vr.dev verifiers as the reward function for an OpenClaw skill:

\`\`\`python
from openclaw import Skill
from vrdev import compose

reward_fn = compose([
    "tau2.retail.order_cancelled",
    "aiv.email.sent_folder_confirmed",
    "rubric.email.tone_professional",
], policy_mode="fail_closed")

skill = Skill(
    name="cancel_and_email",
    reward=reward_fn,
    max_steps=15,
)
\`\`\`

## Custom Training Loops

For arbitrary training frameworks, use the raw result objects:

\`\`\`python
from vrdev import get_verifier, VerifierInput

v = get_verifier("vr/code.python.tests_pass")
result = v.verify(VerifierInput(
    completions=["agent output here"],
    ground_truth={"repo": ".", "test_cmd": "pytest"},
))

reward = result[0].score          # float 0.0-1.0
passed = result[0].passed         # bool
evidence = result[0].evidence     # dict
hash = result[0].evidence_hash    # str, sha256:...
\`\`\`

Map these to your framework's reward format as needed.

## CI/CD Integration

Add verification to your CI pipeline:

\`\`\`yaml
# .github/workflows/verify.yml
- name: Verify agent outputs
  run: |
    pip install vrdev
    vr compose \\
      --verifiers code.python.lint_ruff,code.python.tests_pass \\
      --ground-truth '{"repo": "."}' \\
      --policy fail_closed \\
      --output json
\`\`\`
`,
    },
    {
        title: 'Examples',
        slug: 'examples',
        description: 'End-to-end demo scripts and benchmark results showing verifiers in action.',
        content: `
# Examples

Runnable demos showing how to compose verifiers into real pipelines.

## Support Operations Pipeline

Cancel an order, process a refund, and verify inventory was updated:

\`\`\`python
from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

chain = compose(
    [get_verifier("vr/tau2.retail.order_cancelled"),
     get_verifier("vr/tau2.retail.refund_processed"),
     get_verifier("vr/tau2.retail.inventory_updated")],
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = chain.verify(VerifierInput(
    completions=["Order cancelled and refund issued"],
    ground_truth={"order_id": "ORD-42"},
))
print(result[0].passed)  # True only if ALL verifiers pass
\`\`\`

## Code Agent Pipeline

Lint, test, and verify a git commit:

\`\`\`python
chain = compose(
    [get_verifier("vr/code.python.lint_ruff"),
     get_verifier("vr/code.python.tests_pass"),
     get_verifier("vr/git.commit_present")],
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = chain.verify(VerifierInput(
    completions=["Fixed the bug and committed"],
    ground_truth={"repo": ".", "test_cmd": "pytest"},
))
\`\`\`

## Benchmark: HARD Gating Impact

Run 100 episodes comparing HARD-gated vs ungated rewards:

\`\`\`bash
python demos/benchmark_gating.py
\`\`\`

Key finding: **100% of soft false positives are blocked** by HARD gates, reducing reward contamination to 0%.

## Source Code

All demos are in the \`demos/\` directory of the vrdev repository:

\`\`\`
demos/
  demo_support_ops.py     # Retail cancel -> refund -> inventory
  demo_code_agent.py      # Lint -> test -> git commit
  demo_browser_agent.py   # E-commerce order + refund
  benchmark_gating.py     # 100-episode HARD vs SOFT benchmark
  CASE_STUDY.md           # Written case study with analysis
\`\`\`
`,
    },
    {
        title: 'Bring Your Own State (BYOS)',
        slug: 'byos',
        description: 'Use the pre_result pattern to verify agent work against any state source.',
        content: `
# Bring Your Own State (BYOS)

Many verifiers need to check system state: a database row, an HTTP response, a file on disk. By default they query the system directly, but the **pre_result pattern** lets you inject pre-fetched state for testing, replay, or custom backends.

## The Problem

Running verifiers against live systems during RL training adds latency, requires credentials, and creates flaky loops. You want deterministic, fast verification without external dependencies.

## The pre_result Pattern

Every database, API, and file verifier accepts an optional \`pre_result\` dict in \`ground_truth\`. When present, the verifier skips the live query and uses your data directly.

### Database Example

\`\`\`python
from vrdev import get_verifier, VerifierInput

v = get_verifier("vr/database.row.exists")

# Live query (requires a real database)
result = v.verify(VerifierInput(
    completions=["I inserted the user record"],
    ground_truth={
        "connection_string": "sqlite:///app.db",
        "table": "users",
        "match_columns": {"email": "alice@example.com"},
    },
))

# BYOS: inject your own state (no database needed)
result = v.verify(VerifierInput(
    completions=["I inserted the user record"],
    ground_truth={
        "table": "users",
        "match_columns": {"email": "alice@example.com"},
        "pre_result": {"exists": true},
    },
))
\`\`\`

### API Example

\`\`\`python
v = get_verifier("vr/api.http.status_ok")

# BYOS: inject a pre-fetched HTTP response
result = v.verify(VerifierInput(
    completions=["I called the API"],
    ground_truth={
        "expected_status": 200,
        "pre_result": {"status_code": 200},
    },
))
\`\`\`

### HTTP Response Body

\`\`\`python
v = get_verifier("vr/api.http.response_matches")

result = v.verify(VerifierInput(
    completions=["API returns the order"],
    ground_truth={
        "expected_substrings": ["order_id", "confirmed"],
        "pre_result": {"body": '{"order_id": "ORD-42", "status": "confirmed"}'},
    },
))
\`\`\`

## pre_result Schemas

Each verifier domain has its own pre_result shape:

| Verifier | pre_result Shape |
|----------|-----------------|
| \`database.row.exists\` | \`{"exists": bool}\` |
| \`database.row.updated\` | \`{"row": {col: val, ...}}\` |
| \`database.table.row_count\` | \`{"count": int}\` |
| \`api.http.status_ok\` | \`{"status_code": int}\` |
| \`api.http.response_matches\` | \`{"body": str}\` |
| \`api.http.header_present\` | \`{"headers": {name: val}}\` |

## When to Use BYOS

- **RL training loops**: Inject state from episode logs for deterministic reward computation
- **Unit tests**: Test verifier logic without standing up databases or HTTP servers
- **Replay**: Re-verify historical episodes from stored evidence
- **Custom backends**: Query your own systems and feed results to standard verifiers

## Composing with BYOS

BYOS works seamlessly with the composition engine:

\`\`\`python
from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

chain = compose(
    [get_verifier("vr/database.row.updated"),
     get_verifier("vr/api.http.status_ok")],
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = chain.verify(VerifierInput(
    completions=["Order cancelled via API"],
    ground_truth={
        "table": "orders",
        "match_columns": {"id": 42},
        "expected_values": {"status": "cancelled"},
        "pre_result": {"row": {"status": "cancelled"}},
    },
))
\`\`\`
`,
    },
    {
        title: 'Trust Model',
        slug: 'trust-model',
        description: 'How vr.dev ensures verification integrity through evidence chaining, deterministic checks, and transparency.',
        content: `
# Trust Model

vr.dev is built on a simple premise: **verification results must be trustworthy enough to train on**. This page explains the mechanisms that make that possible.

## The Trust Problem

When you use an LLM-as-judge to evaluate agent work, you inherit the LLM's failure modes: hallucination, sycophancy, inconsistency. Training on these weak signals propagates errors into model weights.

vr.dev addresses this with a layered trust architecture.

## Four Layers of Trust

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

### Layer 3: Evidence & Integrity

Every verification produces a structured evidence record:

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
  "signature": "ed25519:base64...",
  "signing_key_id": "088e71d4...",
  "verifier_version": "0.1.0"
}
\`\`\`

This layer provides two distinct guarantees:

**Auditability (local SDK + hosted API)**: Every result carries the raw evidence (the actual query, its result, the snapshot timestamp). You can always inspect *why* a verdict was issued. This travels with the reward signal through training pipelines. No separate audit system needed; the evidence *is* the audit trail.

**Integrity (hosted API)**: Evidence records are content-hashed (SHA-256) and signed with Ed25519 keys. Records are chained via \`parent_hash\`, creating a Merkle-style append-only log. This makes it computationally infeasible to alter past results without detection. Note: integrity signing requires the hosted API. The local SDK produces evidence payloads but does not sign them.

### Layer 4: On-Chain Anchoring (optional, hosted API only)

The hosted API periodically publishes Merkle roots to an append-only smart contract on Base (Ethereum L2). This provides an external, immutable timestamp and integrity proof for batches of evidence records. Inclusion proofs can verify that any individual evidence record was part of an anchored batch via \`GET /v1/evidence/{hash}/proof\`.

**This layer is entirely optional.** If you don't need third-party-verifiable evidence integrity (e.g., for compliance or dispute resolution), skip it entirely. The local SDK and hosted API work without on-chain anchoring. It exists for use cases where evidence must be independently auditable by parties who don't trust the vr.dev execution environment.

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Agent claims success but state disagrees | HARD verifiers check real state |
| Agent games soft metrics while violating constraints | Gated composition blocks soft rewards |
| Can't explain why a verdict was issued | Evidence payloads carry raw data (query, result, timestamp) everywhere |
| Verification results altered after the fact | Content-hashed + Ed25519-signed evidence chain (hosted API) |
| Need third-party-verifiable integrity | Optional on-chain Merkle root anchoring on Base L2 |
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
    },
    {
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

### Minimal Write Surface

Most HARD verifiers are read-only. They observe state but never modify target systems:

- Database verifiers use SELECT, never INSERT/UPDATE/DELETE
- File verifiers open in read mode only
- API verifiers use GET requests only

**Exception: Code verifiers.** \`code.python.tests_pass\` and \`code.python.lint_ruff\` require \`fs:write_tmp\` permission. They write agent-generated code to an isolated temp directory and execute it via pytest/ruff. These verifiers never modify your source tree; writes are confined to OS-managed temp directories that are cleaned up after execution. The permission is declared explicitly in each verifier's registry entry.

### No Agent Text Execution in Non-Code Verifiers

Non-code verifiers never \`eval()\` or execute agent completions. The agent's text output is compared against ground truth, but never treated as code or commands. Code verifiers (\`code.python.tests_pass\`, \`code.python.lint_ruff\`) do execute agent-provided code, but only in sandboxed temp environments, never in your working directory.

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
    },
    {
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

### Percentile Breakdown

| Tier | p50 | p95 | p99 | Notes |
|------|-----|-----|-----|-------|
| HARD (live DB) | 12ms | 45ms | 95ms | Network-bound SELECT |
| HARD (BYOS/pre_result) | 0.05ms | 0.1ms | 0.3ms | Pure computation |
| HARD (file parse) | 3ms | 8ms | 15ms | JSON/CSV/YAML |
| SOFT (GPT-4o) | 780ms | 1400ms | 2200ms | LLM API latency dominates |
| SOFT (Claude Sonnet) | 1100ms | 1800ms | 2800ms | Slightly higher base |
| SOFT (local LLM) | 200ms | 800ms | 1500ms | Depends on hardware |
| AGENTIC (browser) | 3.2s | 7.5s | 12s | DOM load + interaction |

For RL training loops, use BYOS (pre_result) mode to keep HARD verifiers at sub-millisecond p99. SOFT tier latency is dominated by LLM inference; use local models to eliminate network variance.

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
    },
    {
        title: 'Local Execution',
        slug: 'local-execution',
        description: 'Run verifiers locally without any HTTP calls - ideal for RL training loops.',
        content: `
# Local Execution

vr.dev is designed to run entirely locally. No API server required. No dependency on vr.dev infrastructure in the hot path. No cloud lock-in.

## Why Local?

RL training loops run thousands of episodes. Each episode needs fast, deterministic reward computation. HTTP overhead kills throughput.

> **Note:** "Local" means no dependency on the hosted API. HARD verifiers may still talk directly to target systems (databases, filesystems, HTTP endpoints) unless you use BYOS/pre_result to avoid all live I/O. AGENTIC verifiers require network access to probe external services (browsers, IMAP, etc.).

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
# TRL integration - local, no hosted-API dependency
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
    },
    {
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
| GET | /v1/evidence/{hash}/proof | Retrieve Merkle inclusion proof for on-chain anchoring |
| GET | /v1/evidence | List evidence records (paginated) |
| POST | /v1/replay | Replay verification from stored evidence |
`,
    },
    {
        title: 'End-to-End Walkthrough',
        slug: 'walkthrough',
        description: 'A complete worked example: install, verify, compose, and export rewards.',
        content: `
# End-to-End Walkthrough

This guide walks through a complete verification pipeline - from installing the SDK to exporting rewards for RL training.

## 1. Install

\`\`\`bash
pip install vrdev
\`\`\`

## 2. Run a Single Verifier

\`\`\`python
from vrdev import get_verifier, VerifierInput

v = get_verifier("vr/code.python.tests_pass")
result = v.verify(VerifierInput(
    completions=["def add(a, b): return a + b"],
    ground_truth={"repo": ".", "test_cmd": "pytest tests/"},
))

print(result[0].passed)    # True
print(result[0].score)     # 1.0
print(result[0].evidence)  # {"stdout": "...", "exit_code": 0}
\`\`\`

## 3. Compose a Pipeline

Chain HARD and SOFT verifiers. HARD verifiers act as gates - if they fail, SOFT scores are discarded via \`fail_closed\`.

\`\`\`python
from vrdev import compose
from vrdev.core.types import PolicyMode

pipeline = compose(
    [
        get_verifier("vr/code.python.lint_ruff"),    # HARD gate
        get_verifier("vr/code.python.tests_pass"),   # HARD gate
    ],
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = pipeline.verify(VerifierInput(
    completions=["def add(a, b): return a + b"],
    ground_truth={"repo": ".", "test_cmd": "pytest"},
))

print(result[0].passed)        # True only if ALL gates pass
print(result[0].score)         # Aggregated score
print(result[0].breakdown)     # Per-verifier breakdown
\`\`\`

## 4. Use Adversarial Fixtures

Every verifier ships with adversarial fixtures that test edge cases.

\`\`\`bash
vr test --verifier code.python.tests_pass --type adversarial
\`\`\`

Adversarial fixtures include cases like empty submissions, unicode manipulation, path traversal attempts, and outputs that look correct but aren't.

## 5. Export for RL Training

\`\`\`python
from vrdev import export_to_trl

# Verify a batch of episodes
results = [pipeline.verify(episode) for episode in episodes]

# Export to TRL reward format
export_to_trl(results, output="rewards.jsonl")
\`\`\`

The exported file contains one JSON line per episode with \`score\`, \`passed\`, and \`evidence_hash\` fields - ready to use as rewards in TRL, VERL, or OpenClaw training loops.

## 6. Verify via the Hosted API

If you prefer HTTP over local execution:

\`\`\`bash
curl -X POST https://api.vr.dev/v1/verify \\
  -H "Authorization: Bearer vr_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "verifier_id": "vr/code.python.tests_pass",
    "completions": ["def add(a, b): return a + b"],
    "ground_truth": {"repo": ".", "test_cmd": "pytest"}
  }'
\`\`\`

The hosted API adds evidence anchoring, tamper-proof audit trails, and team dashboards on top of the same verification logic.
`,
    },
    {
        title: 'AGENTIC Verifier Maintenance',
        slug: 'agentic-maintenance',
        description: 'How AGENTIC verifiers work and how to maintain them as target systems change.',
        content: `
# AGENTIC Verifier Maintenance

AGENTIC verifiers are the most powerful - and most fragile - tier. They launch sub-agents that interact with real systems (browsers, APIs, calendars). This page explains how they work and how to keep them healthy.

## How AGENTIC Verifiers Work

Unlike HARD verifiers (deterministic state checks) and SOFT verifiers (LLM judges), AGENTIC verifiers:

1. **Launch a sub-agent** (browser automation, API client, etc.)
2. **Interact with the target system** (navigate pages, read calendar events, query APIs)
3. **Extract state** and compare against expected outcomes
4. **Return structured evidence** with screenshots, API responses, or DOM snapshots

\`\`\`python
# Example: calendar event verification
v = get_verifier("vr/aiv.calendar.event_created")
result = v.verify(VerifierInput(
    completions=["Meeting scheduled for 3pm"],
    ground_truth={
        "calendar_id": "primary",
        "expected_summary": "Team standup",
        "expected_time": "2026-03-07T15:00:00Z",
    },
))
\`\`\`

## Why They Break

AGENTIC verifiers can break when target systems change:

| Change | Impact | Detection |
|--------|--------|-----------|
| UI redesign | Browser selectors fail | Adversarial fixture failure |
| API version bump | Response schema changes | Negative fixture failure |
| Auth flow change | Login steps fail | All fixture types fail |
| Rate limiting | Intermittent failures | Flaky positive fixtures |

## Maintenance Checklist

### Weekly
- Run \`vr test --tier AGENTIC\` to catch regressions
- Check for API deprecation notices from target services

### On Failure
1. Run the adversarial fixtures first - they're designed to catch common breakage patterns
2. Check evidence output for DOM snapshots or API error responses
3. Update selectors/schemas in the verifier implementation
4. Re-run all three fixture types (positive, negative, adversarial)

### Versioning
When you update an AGENTIC verifier's implementation, bump the version in \`VERIFIER.json\`:

\`\`\`json
{
  "version": "0.2.0",
  "changelog": "Updated browser selectors for new calendar UI"
}
\`\`\`

## AGENTIC vs HARD Fallbacks

For critical pipelines, compose an AGENTIC verifier with a HARD fallback:

\`\`\`python
pipeline = compose(
    [
        get_verifier("vr/aiv.calendar.event_created"),   # AGENTIC: full check
        get_verifier("vr/api.http.status_ok"),            # HARD: API fallback
    ],
    policy_mode=PolicyMode.ESCALATION,
)
\`\`\`

If the AGENTIC verifier times out or errors, the HARD verifier provides a baseline check.

## Cost Considerations

AGENTIC verifiers are the most expensive tier ($0.15/call) because they launch sub-agents. For RL training loops, prefer HARD verifiers for speed and use AGENTIC verifiers only for final evaluation.
`,
    },
    {
        title: 'Local vs Hosted',
        slug: 'local-vs-hosted',
        description: 'Compare local SDK execution against the hosted API - features, trade-offs, and when to use each.',
        content: `
# Local vs Hosted

vr.dev runs in two modes. Choose based on your use case.

## Comparison

| Feature | Local SDK | Hosted API |
|---------|-----------|------------|
| **Cost** | Free (MIT) | Pay-per-call (USDC) |
| **Latency** | Sub-millisecond (BYOS) to seconds | Network RTT + verification |
| **Evidence anchoring** | None (local only) | SHA-256 Merkle chain + Base L2 |
| **Tamper evidence** | None | Ed25519 signed + on-chain |
| **Team dashboards** | None | Yes |
| **API keys / auth** | Not needed | Required |
| **Language support** | Python only | Any (REST API) |
| **RL training loops** | Ideal (fast, no overhead) | Too slow for training |
| **Production audits** | Not suitable | Designed for this |
| **Offline / air-gapped** | Yes | No |

## When to Use Local

- **RL training loops**: Thousands of episodes need sub-millisecond reward computation. HTTP overhead is unacceptable.
- **Development & testing**: Iterate on verifier pipelines without API keys or network.
- **CI/CD gating**: Run verification in your pipeline without external dependencies.
- **Air-gapped environments**: HARD verifiers with BYOS/pre_result need no network access at all.

\`\`\`bash
pip install vrdev
# No API key, no hosted dependency - just works
python -c "from vrdev import get_verifier, VerifierInput; v = get_verifier('vr/code.python.tests_pass'); print(v.verify(VerifierInput(completions=['ok'], ground_truth={'repo': '.', 'test_cmd': 'pytest'}))[0].passed)"
\`\`\`

## When to Use Hosted

- **Production verification**: Tamper-evident evidence chain for audits and compliance.
- **Multi-language teams**: Call from TypeScript, Go, Rust, or any language via REST.
- **Team visibility**: Shared dashboards, usage tracking, and evidence history.
- **Evidence replay**: Re-verify historical episodes from stored evidence records.

\`\`\`bash
curl -X POST https://api.vr.dev/v1/verify \\
  -H "Authorization: Bearer vr_live_..." \\
  -d '{"verifier_id": "vr/code.python.tests_pass", ...}'
\`\`\`

## Hybrid Approach

Many teams use both:

1. **Train locally** - fast reward computation with the SDK
2. **Evaluate via API** - tamper-evident results for final benchmarks
3. **Audit via evidence replay** - re-verify any historical result

The SDK and API use identical verification logic. Results are deterministic and reproducible.
`,
    },
    {
        title: 'MCP Server',
        slug: 'mcp',
        description: 'Use vr.dev verifiers as tools in Claude Desktop, Cursor, and other MCP-compatible clients.',
        content: `
# MCP Server

The vr.dev SDK includes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that exposes verifiers as tools for AI assistants like Claude Desktop and Cursor.

## Install

\`\`\`bash
pip install vrdev[mcp]
\`\`\`

This installs the \`mcp\` optional dependency alongside the core SDK.

## Start the Server

\`\`\`bash
# stdio transport (for Claude Desktop / Cursor)
python -m vrdev.adapters.mcp_server
\`\`\`

## Claude Desktop Setup

Add to your \`claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "vrdev": {
      "command": "python",
      "args": ["-m", "vrdev.adapters.mcp_server"]
    }
  }
}
\`\`\`

## Cursor Setup

In Cursor settings, add a new MCP server:

- **Name**: vrdev
- **Command**: \`python -m vrdev.adapters.mcp_server\`
- **Transport**: stdio

## Available Tools

The MCP server exposes 6 tools:

### list_verifiers

List all registered verifier IDs in the vr.dev registry.

\`\`\`
→ list_verifiers()
← ["vr/filesystem.file_created", "vr/code.python.lint_ruff", ...]
\`\`\`

Use this to discover available verifiers before running them.

### run_verifier

Run a single verifier against agent completions. Returns verdict (PASS/FAIL), score, and evidence.

\`\`\`
→ run_verifier(
    verifier_id="vr/filesystem.file_created",
    completions=["Created output.txt"],
    ground_truth={"expected_path": "/tmp/output.txt"}
  )
← { verdict: "PASS", score: 1.0, evidence: { ... } }
\`\`\`

### compose_chain

Run a composed chain of verifiers with hard-gating. With \`fail_closed\` policy, if any HARD verifier fails, the entire chain scores 0.0, preventing agents from gaming SOFT judges.

\`\`\`
→ compose_chain(
    verifier_ids=["vr/tau2.retail.order_cancelled", "vr/rubric.email.tone_professional"],
    completions=["I cancelled order ORD-42 and sent confirmation"],
    ground_truth={"order_id": "ORD-42"},
    policy="fail_closed"
  )
← { verdict: "PASS", score: 0.85, breakdown: { ... } }
\`\`\`

### explain_failure

Run a verifier and get a human-readable markdown explanation of why it passed or failed. Useful for debugging agent behavior.

\`\`\`
→ explain_failure(
    verifier_id="vr/code.python.lint_ruff",
    completions=["import os\\nimport os"],
    ground_truth={"file_path": "example.py"}
  )
← "## Verification: vr/code.python.lint_ruff\\n- Verdict: FAIL\\n..."
\`\`\`

### search_verifiers

Search verifiers by keyword across IDs, descriptions, and domains.

\`\`\`
→ search_verifiers(query="database")
← ["vr/database.row.exists", "vr/database.row.updated", "vr/database.table.row_count"]
\`\`\`

### gem_reward

Compute a GEM-compatible reward score from verification results. Useful for training integrations that expect the GEM reward format.

\`\`\`
→ gem_reward(
    verifier_id="vr/code.python.tests_pass",
    completions=["def add(a, b): return a + b"],
    ground_truth={"repo": ".", "test_cmd": "pytest"}
  )
← { reward: 1.0, metadata: { ... } }
\`\`\`

## Example Workflow in Claude

1. **Ask Claude**: "Check if my Python file passes linting"
2. Claude calls \`search_verifiers(query="lint")\` → finds \`vr/code.python.lint_ruff\`
3. Claude calls \`run_verifier("vr/code.python.lint_ruff", ...)\`
4. Claude reports the verdict and any linting issues

## Example: Composed Verification

1. **Ask Claude**: "Verify that the order was cancelled and the email was sent"
2. Claude calls \`compose_chain(["vr/tau2.retail.order_cancelled", "vr/aiv.email.sent_folder_confirmed"], ..., policy="fail_closed")\`
3. If the order check fails, the entire pipeline fails, even if the email looks fine

## Programmatic Usage

You can also create the MCP server programmatically:

\`\`\`python
from vrdev.adapters.mcp_server import create_mcp_server

mcp = create_mcp_server()
mcp.run()  # starts stdio transport
\`\`\`

This is useful for embedding the MCP server in a larger application or custom transport.
`,
    },
    {
        title: 'Golden Pipeline Templates',
        slug: 'golden-pipelines',
        description: 'Copy-paste verification pipelines for common agent tasks.',
        content: `
# Golden Pipeline Templates

Pre-composed verification pipelines for common agent tasks. Copy, paste, and adapt.

Each template uses the \`compose()\` API with \`policy_mode="fail_closed"\`. SOFT scores only count if all HARD checks pass first.

---

## 1. Cancel Order and Verify (Retail)

**Use case**: Agent cancels an order, processes a refund, and sends a notification email.

**Verifiers**: 2× HARD + 1× AGENTIC (\`fail_closed\`)

\`\`\`python
from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

pipeline = compose(
    [get_verifier("vr/tau2.retail.order_cancelled"),
     get_verifier("vr/tau2.retail.refund_processed"),
     get_verifier("vr/aiv.email.sent_folder_confirmed")],
    require_hard=True,
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = pipeline.verify(VerifierInput(
    completions=["Order cancelled and confirmation sent"],
    ground_truth={
        "order_id": "ORD-42",
        "expected_refund_amount": 49.99,
        "email_subject": "Your order has been cancelled",
    },
))

print(result[0].passed)     # True only if ALL checks pass
print(result[0].score)      # 1.0 or 0.0
print(result[0].breakdown)  # per-verifier results
\`\`\`

**Why this works**: Even if the agent writes a perfect cancellation email, the pipeline fails if the order is still active or the refund wasn't processed.

---

## 2. Code Agent with Quality Gate (Dev)

**Use case**: Agent writes or modifies code. Must pass linting and tests before style is scored.

**Verifiers**: 2× HARD gate + 1× SOFT scorer

\`\`\`python
from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

pipeline = compose(
    [get_verifier("vr/code.python.lint_ruff"),
     get_verifier("vr/code.python.tests_pass"),
     get_verifier("vr/rubric.code.logic_correct")],
    require_hard=True,
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = pipeline.verify(VerifierInput(
    completions=["Fixed the bug and committed"],
    ground_truth={
        "file_path": "src/handler.py",
        "repo": ".",
        "test_cmd": "pytest tests/ -q",
    },
))

# If linting or tests fail, rubric score is zeroed out
# Agent can't get a high score by writing "nice-looking" broken code
print(f"Score: {result[0].score:.2f}")
\`\`\`

**Why this works**: The SOFT rubric only contributes to the score if both HARD gates pass. An agent can't game the LLM judge score while submitting code that doesn't lint or pass tests.

---

## 3. Email with Tone Check (Support)

**Use case**: Agent sends a customer email. Must verify the email was actually sent (AGENTIC) before scoring tone quality (SOFT).

**Verifiers**: 1× AGENTIC gate + 1× SOFT scorer

\`\`\`python
from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

pipeline = compose(
    [get_verifier("vr/aiv.email.sent_folder_confirmed"),
     get_verifier("vr/rubric.email.tone_professional")],
    policy_mode=PolicyMode.FAIL_CLOSED,
)

result = pipeline.verify(VerifierInput(
    completions=["Sent a response to the customer"],
    ground_truth={
        "email_subject": "Re: Your support ticket #1234",
        "expected_recipient": "customer@example.com",
    },
))

# SOFT score only counts if the email was actually sent
print(f"Sent: {result[0].passed}")
print(f"Score: {result[0].score:.2f}")
\`\`\`

**Why this works**: An agent that generates a beautifully written email but never actually sends it gets a score of 0.0.

---

## Adapting Templates

### Change the policy mode

- \`fail_closed\` (default): Any HARD/AGENTIC FAIL or ERROR → score 0.0
- \`fail_open\`: Only explicit FAIL blocks the pipeline; ERROR is tolerated
- \`escalation\`: Run tiers in order, stop when a tier passes
- \`ensemble\`: Run all verifiers and aggregate scores

### Use with the CLI

\`\`\`bash
vr compose \\
  --verifiers vr/tau2.retail.order_cancelled,vr/tau2.retail.refund_processed \\
  --policy fail_closed \\
  --ground-truth '{"order_id": "ORD-42"}'
\`\`\`

### Export for RL training

\`\`\`python
from vrdev import export_to_trl

# Run pipeline on many episodes, export for GRPO/DPO
export_to_trl(results, output="training_data.jsonl")
\`\`\`

## Building Your Own Pipeline

1. Browse the [Registry](/registry) to find verifiers for your domain
2. Compose HARD checks first (state verification), then SOFT (quality scoring)
3. Use \`fail_closed\` to prevent reward hacking
4. Test with adversarial inputs: use each verifier's built-in adversarial fixtures
5. Export results to your training framework

See also: [Composition Engine](/docs/concepts#composition-engine) · [BYOS Pattern](/docs/byos) · [Integration Guide](/docs/integration-guide)
`,
    },
]

export default docs
