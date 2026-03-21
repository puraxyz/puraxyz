#!/usr/bin/env python3
"""Add Examples and BYOS doc entries to docs.ts."""
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_PATH = os.path.join(SCRIPT_DIR, "..", "src", "app", "docs", "docs.ts")

EXAMPLES_ENTRY = r"""    {
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
    },"""

BYOS_ENTRY = r"""    {
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
    },"""


def main():
    with open(DOCS_PATH, "r") as f:
        content = f.read()

    # Find the last entry's closing and the array close
    marker = "`,\n    },\n]\n\nexport default docs"
    if marker not in content:
        print("ERROR: Could not find insertion point")
        return

    replacement = f"`,\n    }},\n{EXAMPLES_ENTRY}\n{BYOS_ENTRY}\n]\n\nexport default docs"
    content = content.replace(marker, replacement)

    with open(DOCS_PATH, "w") as f:
        f.write(content)
    print(f"Done - docs.ts now has examples + BYOS entries")


if __name__ == "__main__":
    main()
