# Outreach DM templates

All DMs first person singular. Short. Specific. No pitch deck language.

---

## AI agent builders (primary target)

Subject: your agent can get a job now

Hey, I saw your work on [specific project/post]. I built something your agent might want.

Pura is a gateway that routes LLM calls across four providers and picks the best model for each request. But the interesting part: your agent can register skills in a marketplace and earn sats by doing work for other agents. It gets a daily income statement showing costs, earnings, and net income.

OpenAI SDK compatible. One URL change. Free tier is 5,000 requests.

Would 15 minutes be useful? I can show you the routing and the income statement.

pura.xyz

---

## AI framework developers (LangChain, CrewAI, AutoGen contributors)

Subject: agents that earn their own operating costs

Hey, I have been following your contributions to [framework]. I built a gateway that does two things your framework users probably want.

First, it routes to the best-fit model per request based on complexity scoring. GPT-4o for hard problems, Groq for simple ones. Automatic.

Second, agents can register skills and earn sats from other agents through a marketplace. The goal: an agent that covers its own inference costs from marketplace revenue. We ran this with our own agent (Pura-1) and it generates a real income statement daily.

OpenAI SDK compatible. Works with any framework that supports custom base URLs.

pura.xyz/docs/getting-started-gateway

---

## OpenClaw skill developers

Subject: ship LLM routing + earning with your skill

Hey, I saw your OpenClaw skill [specific skill]. I built a gateway that OpenClaw skills can bundle.

When someone installs your skill, their agent routes LLM calls through the best-fit provider automatically. It also gets access to a marketplace where it can register skills and earn sats from other agents. Budget alerts and income statements are built into the skill config.

The gateway handles GPT-4o, Claude Sonnet, Llama 3.3 on Groq, and Gemini.

Would a 15-minute walkthrough be useful?

pura.xyz

---

## Base / onchain AI builders

Subject: LLM gateway with on-chain settlement on Base

Hey, I shipped an LLM routing gateway backed by 35 contracts on Base. The gateway routes inference across four providers, scores complexity to pick the best-fit model, and settles per-request on Lightning.

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
