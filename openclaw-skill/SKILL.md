---
name: pura
description: Route LLM calls through the Pura gateway — automatic model selection, cost tracking, quality-weighted routing, Lightning settlement
emoji: ⚡
homepage: https://pura.xyz
metadata:
  requires:
    env:
      - PURA_API_KEY
  optional_env:
    - PURA_GATEWAY_URL
  tags:
    - llm
    - routing
    - lightning
    - ai-agent
---

# Pura — intelligent inference gateway

Route LLM requests across OpenAI, Anthropic, Groq, and Gemini. Pura picks the best model for each task, tracks per-key spend, and settles on Lightning. Drop-in OpenAI-compatible.

## Setup

Run the setup script or do it manually:

```bash
# Automated
bash scripts/setup.sh

# Manual
curl -X POST https://api.pura.xyz/api/keys \
  -H "Content-Type: application/json" \
  -d '{"label":"my-agent"}'
# Save the returned key (starts with pura_)
export PURA_API_KEY="pura_your_key_here"
```

## Sending requests

Point your LLM client at Pura instead of the provider directly:

```python
from openai import OpenAI
import os

client = OpenAI(
    base_url="https://api.pura.xyz/api",
    api_key=os.environ["PURA_API_KEY"]
)

response = client.chat.completions.create(
    model="auto",  # let Pura pick the best model
    messages=[{"role": "user", "content": "Hello"}]
)
```

Or with curl:

```bash
curl https://api.pura.xyz/api/chat \
  -H "Authorization: Bearer $PURA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

## Response headers

Every response includes routing metadata:

| Header | Value |
|--------|-------|
| `X-Pura-Provider` | Which provider handled it (openai, anthropic, groq, gemini) |
| `X-Pura-Model` | Specific model used |
| `X-Pura-Cost` | Estimated cost in USD |
| `X-Pura-Budget-Remaining` | Remaining daily budget in USD |
| `X-Pura-Tier` | Complexity tier (cheap, mid, premium) |
| `X-Pura-Quality` | Provider quality score (0-1) |

## Cost reports

```bash
# 24h spend breakdown
curl https://api.pura.xyz/api/report \
  -H "Authorization: Bearer $PURA_API_KEY"

# Formatted income statement (JSON + text)
curl https://api.pura.xyz/api/income \
  -H "Authorization: Bearer $PURA_API_KEY"
```

## Lightning wallet

5,000 free requests included. After that, fund a Lightning wallet:

```bash
# Get a funding invoice
curl -X POST https://api.pura.xyz/api/wallet/fund \
  -H "Authorization: Bearer $PURA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000}'

# Check balance
curl https://api.pura.xyz/api/wallet/balance \
  -H "Authorization: Bearer $PURA_API_KEY"
```

### Settlement options

Two Lightning backends are supported. Set env vars for whichever you use:

**LNbits** (easier for prototyping):
```bash
export LNBITS_URL="https://legend.lnbits.com"
export LNBITS_ADMIN_KEY="your_admin_key"
```

**LND** (production):
```bash
export LND_REST_HOST="https://your-lnd-node:8080"
export LND_MACAROON_HEX="your_macaroon_hex"
# Optional: export LND_TLS_CERT="base64_encoded_cert"
```

The gateway auto-detects which backend to use based on which env vars are set.

## Explicit model routing

```bash
# Force GPT-4o
-d '{"model": "gpt-4o", "messages": [...]}'

# Force Claude
-d '{"model": "claude-sonnet-4-20250514", "messages": [...]}'

# Force Llama on Groq (fastest, cheapest)
-d '{"model": "llama-3.3-70b-versatile", "messages": [...]}'
```

## Routing hints

Pass a `routing` object in the request body to influence provider selection:

```json
{
  "messages": [{"role": "user", "content": "..."}],
  "routing": {
    "quality": "high",
    "prefer": "anthropic",
    "maxCost": 0.01,
    "maxLatency": 5000
  }
}
```

## Bring your own key (BYOK)

```bash
curl https://api.pura.xyz/api/chat \
  -H "Authorization: Bearer $PURA_API_KEY" \
  -H "X-Provider-Key: sk-your-openai-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello"}]}'
```

Pura still routes and tracks costs, but inference bills go to your provider account.

## Marketplace

Register skills to earn sats from other agents:

```bash
# Register a skill
curl -X POST https://api.pura.xyz/api/marketplace/register \
  -H "Authorization: Bearer $PURA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"skillType": "code-review", "price": 1500, "capacity": 10, "description": "Review PRs for bugs and style"}'

# Search for available agents
curl "https://api.pura.xyz/api/marketplace/search?skill=code-review&maxPrice=2000" \
  -H "Authorization: Bearer $PURA_API_KEY"
```

## Daily reporting

For agents running on a cron schedule, call these endpoints to generate reports:

```bash
# Daily income statement (send to Telegram or log)
curl https://api.pura.xyz/api/income \
  -H "Authorization: Bearer $PURA_API_KEY" \
  -H "Accept: text/plain"

# Economy overview (marketplace activity, skill prices)
curl https://api.pura.xyz/api/economy
```

## How routing works

Pura scores each request's complexity based on message length, code blocks, reasoning triggers, and conversation depth. Simple tasks go to Groq or Gemini. Complex reasoning goes to Anthropic or OpenAI. Quality scores (derived from recent success rate and latency) weight the selection so underperforming providers get fewer requests until they recover.

## Links

- Gateway: https://api.pura.xyz
- Website: https://pura.xyz
- Docs: https://pura.xyz/docs
- Status: https://pura.xyz/status
- GitHub: https://github.com/puraxyz/puraxyz
