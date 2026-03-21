# vr.dev - Agent Verification Platform

Verify what AI agents actually changed. 38 verifiers across 19 domains, composed into trust pipelines for CI, evaluation, and training.

## Overview

vr.dev maintains a registry of **reward verifiers** - software modules that check whether an AI agent actually did what it claimed, by inspecting real system state (databases, APIs, file systems, browser DOM) rather than trusting the agent's self-report.

- **38 verifiers** across 19 domains: retail, airline, telecom, policy, email, calendar, shell, code, web, filesystem, document, database, API, git, messaging, payment, project, rubric, and evaluation
- **Three tiers:** HARD (deterministic state checks), SOFT (rubric-based LLM judges), AGENTIC (agent-driven probing)
- **Composition engine:** Chain verifiers with `fail_closed` policy - hard checks gate soft scores to prevent reward hacking
- **Evidence chain:** SHA-256 Merkle log with Ed25519 signing and on-chain anchoring (Base Sepolia)
- **Training export:** Drop-in reward functions for TRL, VERL, and OpenClaw
- **MCP server:** Claude Desktop / Cursor integration via FastMCP

## Quick Start

```bash
pip install vrdev
```

```python
from vrdev import verify, compose

# Single verifier - checks actual database state
result = verify("tau2.retail.order_cancelled",
    ground_truth={"order_id": "ORD-42"})

# Composed pipeline - HARD gate before SOFT scorer
pipeline = compose([
    "tau2.retail.order_cancelled",
    "rubric.email.tone_professional",
], policy_mode="fail_closed")

result = pipeline.run(ground_truth={"order_id": "ORD-42"})
```

Run locally - no API key, no network dependency. Or use the hosted API at `api.vr.dev`.

## Website (this repo)

This repository contains the **vr.dev website** - a Next.js 15 application with:

- **Registry browser** - search/filter 38 verifiers by tier, domain, latency
- **Dashboard** - verification analytics, agent performance tracking
- **Docs** - quickstart, API reference, verifier authoring, CLI reference
- **Paper** - research paper on verifiable rewards and the corrupt success problem
- **API key management** - create, revoke, copy keys (Clerk auth)

### Stack

- Next.js 15 (App Router)
- Mantine UI (dark theme, CSS Modules)
- Clerk authentication
- Prisma ORM → NeonDB PostgreSQL
- Vercel deployment

### Local Development

```bash
npm install
npm run dev
```

Create `.env.local` with:

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

### Build

```bash
npm run build    # production build
npm run lint     # ESLint validation
```

## Related Repositories

- **[vr-dev](https://github.com/vrDotDev/vr-dev)** - Python SDK, verifier registry, demos

## License

Website code: MIT. Python SDK: MIT. See individual repositories for details.

## Troubleshooting

- Ensure Neon/Postgres networking allows Prisma client connections.
- Large GLB files should stay under 50MB; compress textures (BasisU / Draco) for
  best scores.
- Configure `BLOB_READ_WRITE_TOKEN` in Vercel dashboard for signed uploads.
