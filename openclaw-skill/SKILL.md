# Pura — intelligent inference gateway

Routes LLM requests across providers (OpenAI, Anthropic, Groq, Gemini), picks the cheapest model that fits the task, and tracks per-key spend. Settles on Lightning. Drop-in OpenAI-compatible API.

## What this skill does

- Routes all agent LLM calls through `api.pura.xyz` instead of direct provider APIs
- Automatic model selection based on task complexity (cheap/mid/premium tiers)
- Per-key budget enforcement with daily spend caps
- Cost tracking with overnight reports
- Lightning wallet for prepaid balance (optional — 5,000 free requests included)
- Falls back across providers on failure (OpenAI → Anthropic → Groq → Gemini)

## Setup

1. Get an API key:

```bash
curl -X POST https://api.pura.xyz/api/keys -H "Content-Type: application/json" -d '{"label":"my-agent"}'
```

Save the `key` value from the response. It starts with `pura_`.

2. Set environment variable:

```bash
export PURA_API_KEY="pura_your_key_here"
```

3. Point your agent's LLM client at Pura:

```python
from openai import OpenAI

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

| Header | Description |
|--------|-------------|
| `X-Pura-Provider` | Which provider handled the request (openai, anthropic, groq, gemini) |
| `X-Pura-Model` | Specific model used |
| `X-Pura-Cost` | Estimated cost in USD |
| `X-Pura-Budget-Remaining` | Remaining daily budget in USD |
| `X-Pura-Tier` | Complexity tier assigned (cheap, mid, premium) |

## Budget and cost reports

Check your spend:

```bash
curl https://api.pura.xyz/api/report \
  -H "Authorization: Bearer $PURA_API_KEY"
```

Returns a JSON breakdown of past 24h spend by model, request count, and average cost.

## Lightning wallet (optional)

The free tier covers 5,000 requests. After that, fund a Lightning wallet:

```bash
# Get a funding invoice (default 10,000 sats)
curl -X POST https://api.pura.xyz/api/wallet/fund \
  -H "Authorization: Bearer $PURA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000}'

# Check balance
curl https://api.pura.xyz/api/wallet/balance \
  -H "Authorization: Bearer $PURA_API_KEY"
```

## Explicit model routing

Pass a specific model name to bypass automatic selection:

```bash
# Force GPT-4o
-d '{"model": "gpt-4o", "messages": [...]}'

# Force Claude
-d '{"model": "claude-sonnet-4-20250514", "messages": [...]}'

# Force Llama on Groq (cheapest)
-d '{"model": "llama-3.3-70b-versatile", "messages": [...]}'
```

## Bring your own key (BYOK)

Pass your own provider API key to use your account directly:

```bash
curl https://api.pura.xyz/api/chat \
  -H "Authorization: Bearer $PURA_API_KEY" \
  -H "X-Provider-Key: sk-your-openai-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello"}]}'
```

With BYOK, Pura still routes and tracks costs, but the inference bill goes to your provider account.

## How routing works

Pura scores each request's complexity based on message length, code blocks, reasoning triggers, and conversation depth. Cheap tasks go to Groq or Gemini. Complex reasoning goes to Anthropic or OpenAI. On-chain capacity weights (GDA pool units on Base) break ties between providers in the same tier.

## Links

- Gateway: https://api.pura.xyz
- Website: https://pura.xyz
- Docs: https://pura.xyz/docs
- Status: https://pura.xyz/status
- GitHub: https://github.com/puraxyz/puraxyz
