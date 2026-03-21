# vr.dev - Verifiable Rewards for Real-World AI Agent Tasks

**v1.0.0 - 38 verifiers, 19 domains, composition engine, Merkle evidence**

> Evidence-bearing, auditable verification of AI agent completions across
> filesystem, API, email, calendar, code-quality, e-commerce, git, and telecom domains.
> Now with async support, a hosted FastAPI service, and evidence persistence.

```
pip install vrdev            # core
pip install vrdev[llm]       # + OpenAI judge
pip install vrdev[mcp]       # + MCP server
pip install vrdev[all]       # everything
pip install vrdev[dev]       # + pytest, pytest-asyncio & ruff
```

---

## Quick Start

### Python API

```python
from vrdev import get_verifier, VerifierInput

v = get_verifier("vr/filesystem.file_created")
result = v.verify(VerifierInput(
    completions=["I created the file"],
    ground_truth={"expected_path": "/tmp/output.txt"},
))
print(result[0].verdict)   # PASS or FAIL
print(result[0].score)     # 0.0 – 1.0
print(result[0].evidence)  # {"file_exists": True, ...}
```

### Async API

```python
import asyncio
from vrdev import get_verifier, VerifierInput

async def main():
    v = get_verifier("vr/filesystem.file_created")
    result = await v.async_verify(VerifierInput(
        completions=["I created the file"],
        ground_truth={"expected_path": "/tmp/output.txt"},
    ))
    print(result[0].verdict)

asyncio.run(main())
```

### CLI

```bash
# Run a verifier
vr verify vr/filesystem.file_created \
  --completion "done" \
  --ground-truth '{"expected_path": "/tmp/out.txt"}'

# List all verifiers
vr registry list

# Search verifiers
vr registry search email

# Run test fixtures
vr test vr/filesystem.file_created

# Show config
vr config show

# Initialize config file
vr config init
```

### MCP Server (Claude Desktop / Cursor)

```bash
vr mcp serve
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vrdev": {
      "command": "vr",
      "args": ["mcp", "serve"]
    }
  }
}
```

The MCP server exposes 5 tools:

| Tool | Description |
|------|-------------|
| `list_verifiers` | List all registered verifier IDs |
| `run_verifier` | Run a verifier with input |
| `compose_chain` | Run composed verifier chain |
| `explain_failure` | Get human-readable failure explanation |
| `search_verifiers` | Keyword search across verifiers |

---

## Configuration

Config lives at `~/.vrdev/config.toml` with `VRDEV_*` env var overrides.

```bash
vr config init   # create default config
vr config show   # display current config
```

```toml
[openai]
api_key = ""
model = "gpt-4o-mini"
temperature = 0.0
max_tokens = 1024

[imap]
host = "localhost"
port = 993
username = ""
password = ""

[http]
timeout = 15.0
```

Environment variable overrides (highest precedence):

```bash
export VRDEV_OPENAI_API_KEY="sk-..."
export VRDEV_OPENAI_MODEL="gpt-4o"
export VRDEV_IMAP_HOST="imap.example.com"
export VRDEV_HTTP_TIMEOUT="30.0"
```

---

## Verifiers (19)

| ID | Tier | Domain | Source |
|----|------|--------|--------|
| `vr/filesystem.file_created` | HARD | Filesystem | OSWorld |
| `vr/git.commit_present` | HARD | Git | SWE-bench |
| `vr/code.python.lint_ruff` | HARD | Code quality | Zeno-bench |
| `vr/code.python.tests_pass` | HARD | Code quality | SWE-bench |
| `vr/tau2.retail.order_cancelled` | HARD | Retail API | τ²-bench |
| `vr/tau2.retail.refund_processed` | HARD | Retail API | τ²-bench |
| `vr/tau2.retail.inventory_updated` | HARD | Retail API | τ²-bench |
| `vr/tau2.policy.constraint_not_violated` | HARD | Policy | τ²-bench |
| `vr/tau2.airline.rebooking_correct` | HARD | Airline API | τ²-bench |
| `vr/tau2.telecom.plan_changed` | HARD | Telecom CRM | τ²-bench |
| `vr/web.ecommerce.order_placed` | HARD | E-commerce | WebArena |
| `vr/web.browser.element_visible` | HARD | Browser DOM | WebArena |
| `vr/web.browser.screenshot_match` | HARD | Browser visual | WebArena |
| `vr/aiv.email.sent_folder_confirmed` | AGENTIC | Email/IMAP | VAGEN |
| `vr/aiv.calendar.event_created` | AGENTIC | Calendar API | VAGEN |
| `vr/aiv.shell.state_probe` | AGENTIC | Shell | VAGEN |
| `vr/rubric.email.tone_professional` | SOFT | Email rubric | Proofs paper |
| `vr/rubric.code.logic_correct` | SOFT | Code logic | Proofs paper |
| `vr/rubric.summary.faithful` | SOFT | NLP | Proofs paper |

### Verification Tiers

- **HARD** - Deterministic, state-based checks (API calls, file existence, lint output)
- **SOFT** - LLM-judged rubric evaluation (stochastic, requires `vrdev[llm]`)
- **AGENTIC** - Latent-state verification via external systems (IMAP, CalDAV)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Adapters                       │
│  CLI (click)  │  MCP Server  │  Python API      │
├───────────────┼──────────────┼──────────────────┤
│              Composition Engine                   │
│       compose() · z_score_normalize()            │
├──────────────────────────────────────────────────┤
│              Base Verifier (ABC)                  │
│   verify(VerifierInput) → [VerificationResult]   │
├──────────────────────────────────────────────────┤
│                   Runners                         │
│  Sandbox │ HTTP │ IMAP │ Managed IMAP │ Browser  │
│               LLM Judge (OpenAI)                  │
├──────────────────────────────────────────────────┤
│                Core Types (Pydantic)              │
│  Verdict · Tier · VerificationResult · Scorecard │
└──────────────────────────────────────────────────┘
```

---

## Composition

Chain multiple verifiers with AND logic and policy control:

```python
from vrdev import get_verifier, compose, VerifierInput
from vrdev.core.types import PolicyMode

chain = compose(
    [get_verifier("vr/filesystem.file_created"),
     get_verifier("vr/tau2.retail.order_cancelled")],
    policy_mode=PolicyMode.FAIL_CLOSED,
)
results = chain.verify(VerifierInput(
    completions=["done"],
    ground_truth={"expected_path": "/tmp/out.txt", "order_id": "ORD-001"},
    context={"api_base_url": "http://localhost:8080"},
))
```

---

## Registry Validation

Validate VERIFIER.json / SKILL.json specs against schemas:

```bash
vr registry validate path/to/VERIFIER.json
```

```python
from vrdev import load_verifier_spec, validate_verifier_spec

errors = validate_verifier_spec(spec_dict)
if not errors:
    print("Valid!")
```

---

## Training-Data Export

Export verification results as JSONL for GRPO / DPO pipelines:

```bash
# CLI - export to file
vr export vr/filesystem.file_created completions.txt \
  -g ground_truth.json -o train.jsonl

# CLI - pipe to stdout
vr export vr/code.python.lint_ruff code_samples.json
```

```python
from vrdev import get_verifier, VerifierInput, export_jsonl

v = get_verifier("vr/filesystem.file_created")
inp = VerifierInput(completions=["done"], ground_truth={"expected_path": "/tmp/f"})
results = v.verify(inp)

with open("train.jsonl", "w") as f:
    export_jsonl(results, inp, "vr/filesystem.file_created", f)
```

Each JSONL line contains: `completion`, `score`, `verdict`, `verifier_id`,
`breakdown`, `provenance`, `ground_truth`, `artifact_hash`, `exported_at`.

---

## Hosted API (`vr-api`)

The `packages/vr-api/` directory contains a FastAPI service that wraps the
vrdev SDK with authentication, rate limiting, and evidence persistence.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/v1/verify` | Yes | Run a verifier |
| `POST` | `/v1/compose` | Yes | Run composed chain |
| `GET` | `/v1/verifiers` | Yes | List all verifiers |
| `POST` | `/v1/export` | Yes | Verify + export JSONL |
| `POST` | `/v1/batch` | Yes | Batch verify multiple inputs |
| `GET` | `/v1/evidence/{hash}` | Yes | Retrieve stored evidence |
| `GET` | `/v1/evidence` | Yes | List evidence records |
| `GET` | `/v1/usage` | Yes | Usage statistics |

### Running locally

```bash
# With Docker
cp packages/vr-api/.env.example packages/vr-api/.env
docker compose up

# Without Docker
pip install packages/vrdev packages/vr-api
uvicorn vr_api.app:app --reload
```

### Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///:memory:` | PostgreSQL / NeonDB connection string |
| `VR_API_KEYS` | *(empty = auth disabled)* | Comma-separated valid API keys |
| `VR_RATE_LIMIT_PER_MINUTE` | `60` | Per-key rate limit |
| `VR_EVIDENCE_TTL_DAYS` | `90` | Evidence retention period |

---

## Development

```bash
git clone https://github.com/vrDotDev/vr-dev.git
cd vr-dev/packages/vrdev
pip install -e ".[dev]"
pytest                  # run all tests
ruff check src/         # lint
```

### Test Suite

```
tests/
├── test_types.py           # Core type validation
├── test_compose.py         # Composition engine
├── test_normalize.py       # Z-score normalization
├── test_sandbox.py         # Sandbox runner
├── test_artifact.py        # Artifact hashing
├── test_router.py          # Skill router
├── test_filesystem.py      # FileCreatedVerifier
├── test_tau2.py            # τ²-bench verifiers (3)
├── test_telecom.py         # PlanChangedVerifier
├── test_aiv_email.py       # SentFolderConfirmedVerifier
├── test_rubric_email.py    # ToneProfessionalVerifier
├── test_rubric_code.py     # LogicCorrectVerifier
├── test_registry.py        # Verifier registry
├── test_llm.py             # LLM judge protocol
├── test_e2e.py             # End-to-end integration
├── test_config.py          # Config system
├── test_registry_loader.py # Registry validation
├── test_lint_ruff.py       # LintRuffVerifier
├── test_git_commit.py      # CommitPresentVerifier
├── test_webarena.py        # OrderPlacedVerifier
├── test_calendar.py        # EventCreatedVerifier
├── test_mcp.py             # MCP server
├── test_trl.py             # TRL adapter
├── test_verl.py            # veRL adapter
├── test_export.py          # JSONL export
├── test_http_runner.py     # HTTP runner
├── test_imap_runner.py     # IMAP runner
├── test_openclaw.py        # OpenClaw adapter
├── test_async.py           # Async wrappers
├── test_browser_runner.py  # Browser runner stub
├── test_managed_imap.py    # Managed IMAP pool
└── mocks/
    ├── tau2_server.py      # τ²-bench mock API
    ├── webarena_server.py  # WebArena mock API
    ├── calendar_server.py  # Calendar mock API
    ├── telecom_server.py   # Telecom CRM mock API
    └── imap_mock.py        # IMAP mock runner
```

---

## Verdict Enum

- **PASS** - verification succeeded
- **FAIL** - verification found a deficiency
- **UNVERIFIABLE** - could not determine (ambiguous state)
- **ERROR** - infrastructure/config failure (not an agent failure)

## License

MIT
