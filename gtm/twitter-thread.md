# Twitter/X thread

Copy-paste each numbered block as a separate tweet. Post from personal account using "I" voice.

---

1/

I built an LLM gateway that routes your inference calls across four providers and settles on Lightning.

One API key. OpenAI-compatible. You send a prompt, the gateway picks the cheapest model that can handle it, streams the response, and pays per-token via Lightning.

pura.xyz

---

2/

The problem: every AI agent app hard-codes one provider. When that provider goes down or gets expensive, your agent stops working.

Pura sits between your agent and the LLM. It picks the best available provider for each request based on cost, latency, and task complexity.

---

3/

How routing works:

Simple prompt? Goes to Groq (Llama 3.3 70B) at $0.00059/1K tokens.
Needs code or structured output? GPT-4o at $0.005/1K.
Long-context analysis? Claude Sonnet at $0.003/1K.
Fallback? Gemini catches overflow.

You see one endpoint. The gateway decides.

---

4/

Payment is per-request via Lightning. No subscriptions. No prepaid credits that expire. Your agent pays exactly what it uses and can stop at any time.

The gateway exposes balance and cost in response headers: X-Pura-Cost, X-Pura-Budget-Remaining, X-Pura-Model.

---

5/

Free tier: 5,000 requests. No credit card. Takes 30 seconds to get an API key.

After that, fund your account with a Lightning invoice. The smallest useful deposit is about 1,000 sats (~$0.30), good for roughly 500 routed completions.

---

6/

Why not just use OpenRouter or LiteLLM?

Because they charge you platform margin on top of provider costs, and they keep your usage data. Pura runs open source. You can self-host the gateway, bring your own provider keys, and pay nothing except raw model costs.

---

7/

Under the hood: 35 contracts on Base. 319 passing tests. The on-chain layer handles capacity registration, completion verification, and backpressure routing. The gateway is the first consumer of that protocol.

Research paper: pura.xyz/paper

---

8/

Try it now. Drop-in replacement for the OpenAI SDK:

```
from openai import OpenAI
client = OpenAI(base_url="https://api.pura.xyz/v1", api_key="pura_...")
```

pura.xyz/docs/getting-started-gateway
github.com/puraxyz/puraxyz

---

## Notes

- Post from personal account, use "I" voice throughout
- Screenshot the DemoTerminal from pura.xyz for tweet 3
- Tag: @BuildOnBase, @OpenClaw
- Pin the thread after posting

---

## One-off posts

Post individually. Not a thread. Same "I" voice. Each stands alone.

---

Every AI agent framework picks one LLM provider and hard-codes it. That works until the provider raises prices, goes down, or rate-limits you at 2am. I built a gateway that routes around all three problems. pura.xyz

---

Agents should pay per-request on Lightning, not per-month on Stripe. A subscription assumes steady usage. Agent usage is bursty and unpredictable. Lightning invoices match the actual usage curve.

---

The OpenAI SDK already supports custom base URLs. That means any agent built on it can switch to Pura by changing one line. No new SDK. No new auth flow. Just a different base_url and an API key.

---

If your agent calls GPT-4o for every request including "what time is it," you are burning money. Pura scores task complexity and routes simple requests to Llama 3.3 on Groq. The agent does not notice. The bill drops 80%.

---

Self-hosting the Pura gateway: clone the repo, add your own provider API keys, run `npm run dev`. No platform fees, no usage tracking, no vendor lock-in. Your keys, your data, your routing rules.

---

35 contracts. 319 tests. 4 LLM providers. Lightning settlement. One API endpoint. The whole thing is MIT-licensed. pura.xyz

---

The gateway tracks which providers are up, how fast they respond, and what they cost per token. When a provider degrades, traffic shifts automatically. Your agent never sees a 500 error.

---

OpenClaw skills can ship with a Pura gateway config baked in. Install the skill, it brings its own routing and payment. No manual provider setup. The skill author chose the tradeoffs. You just run it.

---

Hot take: the first AI agent platform that actually works at scale will not have the best models. It will have the best routing. Who handles the request, at what cost, and what happens when the provider is down.
