# Outreach DM templates

All DMs first person singular. Short. Specific. No pitch deck language.

---

## AI agent builders (primary target)

Subject: drop-in LLM routing for your agents

Hey, I saw your work on [specific project/post]. I built something that might save you integration headaches.

Pura is a gateway that routes LLM calls across four providers (OpenAI, Anthropic, Groq, Gemini) and picks the cheapest model that can handle each request. OpenAI SDK compatible. Your agent points at api.pura.xyz instead of api.openai.com and gets automatic failover, cost-based routing, and per-request Lightning settlement.

Free tier is 5,000 requests. Takes 30 seconds to get a key.

Would 15 minutes be useful? I can walk you through the routing logic and show how it handles provider failures.

pura.xyz

---

## AI framework developers (LangChain, CrewAI, AutoGen contributors)

Subject: provider routing layer for multi-agent frameworks

Hey, I have been following your contributions to [framework]. I built a gateway that sits between agent code and LLM providers.

It scores task complexity, routes to the cheapest capable model, and fails over automatically when a provider goes down. OpenAI SDK compatible, so any framework that supports custom base URLs works out of the box.

The routing is backed by on-chain capacity contracts on Base (35 contracts, 319 tests). Settlement is Lightning. The whole thing is MIT-licensed.

Is provider selection / cost optimization something your framework handles internally, or do your users manage that themselves?

pura.xyz/docs/getting-started-gateway

---

## OpenClaw skill developers

Subject: ship LLM routing with your skill

Hey, I saw your OpenClaw skill [specific skill]. I built a gateway that OpenClaw skills can bundle as part of their config.

When someone installs your skill, it already knows which LLM providers to use, what routing rules to apply, and how to pay per-request on Lightning. No manual API key setup for the end user.

The gateway handles GPT-4o, Claude Sonnet, Llama 3.3 on Groq, and Gemini. Task complexity scoring routes simple prompts to cheap models automatically.

Would a 15-minute walkthrough be useful? I can show you the skill config format.

pura.xyz

---

## Base / onchain AI builders

Subject: LLM gateway with on-chain settlement on Base

Hey, I shipped an LLM routing gateway backed by 35 contracts on Base. The gateway routes inference across four providers, scores complexity to pick the cheapest capable model, and settles per-request on Lightning.

Core contracts handle capacity registration, completion verification, and backpressure routing. 319 passing tests. TypeScript SDK with 23 action modules.

Free tier is 5,000 requests. The gateway is live at api.pura.xyz.

Would you be up for 15 minutes? I can walk through the architecture.

Router contract: 0x8e999a246afea241cf3c1d400dd7786cf591fa88

---

## Lightning builders

Subject: per-request LLM settlement on Lightning

Hey, I built an LLM gateway that settles per-request on Lightning via LNbits. No subscriptions, no prepaid credits. Your agent pays exactly what it uses.

The gateway routes across OpenAI, Anthropic, Groq, and Gemini. Cost per request ranges from $0.0003 (simple prompts on Groq) to $0.02 (long-context Claude). Each response includes X-Pura-Cost and X-Pura-Budget-Remaining headers so the agent can track spend.

Funding is via LNURL. Minimum useful deposit is about 1,000 sats.

Would a quick walkthrough be useful?

pura.xyz

---

## Warm follow-up (after initial contact, no response after 5+ days)

Subject: Re: [original subject]

Hey, circling back. No pressure.

Quick version: Pura is an LLM gateway. Four providers. Routes by cost and complexity. Settles on Lightning. OpenAI SDK compatible. Free tier is 5,000 requests.

15-minute walkthrough is open if you are curious.

pura.xyz
