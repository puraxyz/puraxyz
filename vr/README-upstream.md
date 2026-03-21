# vr.dev - Verifiable Rewards for Real-World AI Agent Tasks

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)

> **Open-source verification layer for AI agents.**
> Verify what AI agents actually changed — not what they claimed.

vr.dev is an open registry and composition layer for verifiable reward functions
targeting real-world agentic tasks. Each verifier returns structured evidence
artifacts - not just scores - making agent behavior auditable, debuggable, and
trainable.

## Quick Start

```bash
pip install vrdev
```

```python
from vrdev import compose
from vrdev.tasks.aiv import email_sent_reward
from vrdev.tasks.tau2 import retail_order_cancelled

# Compose verifiers with hard gating
reward = compose(
    [retail_order_cancelled, email_sent_reward],
    require_hard=True,  # If hard check fails, score = 0.0
)
```

## Three Verification Tiers

| Tier | Type | Example | Source |
|---|---|---|---|
| **HARD** | Deterministic state check | Did the order cancel in the DB? | τ²-bench |
| **SOFT** | Rubric-based LLM judge | Was the email tone professional? | Simonds |
| **AGENTIC** | Active environment probing | Is the email in the Sent folder? | VAGEN |

## Evidence, Not Just Scores

Every verifier returns a `VerificationResult` with:
- `verdict`: PASS / FAIL / UNVERIFIABLE / ERROR
- `score`: float [0.0, 1.0]
- `evidence`: what was actually checked (IMAP result, DB query, file stat)
- `provenance`: verifier version, benchmark citation, trace ID

## Works With

- **trl** (HuggingFace GRPOTrainer) - drop-in reward function
- **verl** (ReasoningGym) - compute_score adapter
- **OpenClaw** - agent skill for runtime verification

## Project Structure

```
packages/vrdev/       # Python SDK (pip install vrdev)
packages/vr-api/      # Hosted verification API (FastAPI)
registry/verifiers/   # Verifier metadata + test fixtures (38 verifiers)
registry/skills/      # Skill metadata + fixtures
registry/schemas/     # JSON Schema validation
contracts/            # Solidity evidence anchor (Base L2)
demos/                # Runnable examples and benchmarks
docs/                 # Additional documentation
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add
verifiers, including a table of [verifier ideas](CONTRIBUTING.md#ideas-for-verifiers)
waiting to be built. You can also [request a verifier](https://github.com/vrDotDev/vr-dev/issues/new?template=verifier_request.md)
via GitHub Issues.

## Community

- **Website**: [vr.dev](https://vr.dev)
- **GitHub**: [github.com/vrDotDev/vr-dev](https://github.com/vrDotDev/vr-dev)
- **Bluesky**: [@vr.dev](https://bsky.app/profile/vr.dev)

## License

MIT - see [LICENSE](LICENSE).

## Citation

If you use vr.dev in your research, please cite:
```bibtex
@software{vrdev2026,
  title={vr.dev: Verifiable Rewards for Real-World AI Agent Tasks},
  url={https://github.com/vrDotDev/vr-dev},
  year={2026}
}
```
