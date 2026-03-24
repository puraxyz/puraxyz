# Next steps: ship to mainnet

## Where things stand

The codebase has 32 contracts (319 tests), a streaming LLM gateway with three providers (OpenAI, Anthropic, Groq), an SDK with 23 action modules, and a full documentation site. Everything compiles and passes. What's left is operational: deploy, verify, publish, and push the word out.

### What's done (code)

- `contracts/script/DeployMainnet.s.sol` — deploys 12 contracts (core 8 + demurrage 2 + relay 2) to Base mainnet using real USDC
- Gateway hardened: Upstash KV key storage (JSON fallback for local dev), Redis-backed rate limiting, Groq as third provider, token estimation, structured JSON logging
- SDK relay actions exported, reference integration script at `sdk/scripts/relay-register.ts`
- Grant applications updated with current numbers (32 contracts, 319 tests, 23 modules)

### What's left (operations)

Everything below requires manual steps: wallet funding, Vercel deploys, form submissions, content publishing. Ordered by dependency chain.

---

## 1. Commit and tag

Push all unstaged changes as a single commit. Tag `v0.1.0-pre-mainnet`.

## 2. Deploy contracts to Base mainnet

Fund deployer wallet with ~0.05 ETH on Base. Then:

```bash
cd contracts
forge script script/DeployMainnet.s.sol \
  --rpc-url base_mainnet \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

After deployment:
- Copy addresses to `contracts/deployments/base-mainnet.json`
- Update `sdk/src/addresses.ts` chain 8453 entries (currently all zeros)
- Rebuild SDK, then rebuild consuming apps

## 3. Deploy gateway to Vercel

Generate a fresh operator wallet (separate from deployer). Fund with ~0.01 ETH on Base.

Register sinks and create pool:

```bash
cd gateway
CHAIN_ID=8453 \
RPC_URL=https://mainnet.base.org \
OPERATOR_PRIVATE_KEY=0x... \
OPENAI_SINK_ADDRESS=<EOA> \
ANTHROPIC_SINK_ADDRESS=<EOA> \
GROQ_SINK_ADDRESS=<EOA> \
npx tsx scripts/setup.ts
```

Create Vercel project linked to `gateway/`. Set env vars: `CHAIN_ID=8453`, `RPC_URL`, `OPERATOR_PRIVATE_KEY`, all three provider API keys, all three sink addresses, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Domain: `api.pura.xyz`.

Set provider spend caps ($100/mo per provider).

Verify: `curl https://api.pura.xyz/api/health` should return `{"status":"ok","chain":"8453"}`.

## 4. Deploy pura.xyz to Vercel

Create Vercel project linked to `pura/`. Set `NEXT_PUBLIC_GATEWAY_URL=https://api.pura.xyz`. Domain: `pura.xyz`.

Compile lite paper PDF (`cd docs/paper/lite && pdflatex main.tex && pdflatex main.tex`), host at `pura/public/bpe-lite.pdf`.

## 5. End-to-end proof

This is the "anyone can interact" moment.

```bash
# Generate key
curl -X POST https://api.pura.xyz/api/keys \
  -H "Content-Type: application/json" \
  -d '{"label":"first-mainnet-key"}'

# Send completion
curl https://api.pura.xyz/v1/chat/completions \
  -H "Authorization: Bearer pura_..." \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is backpressure routing?"}],"stream":true}'
```

Check response headers (`X-Pura-Provider`, `X-Pura-Request-Id`). Query `/api/state` for pool data. Look up operator wallet on Basescan for completion epoch transactions.

Screen-record the whole flow. Cut to under 2 minutes.

## 6. Publish SDK + paper

```bash
cd sdk && npm publish --access public
# publishes @puraxyz/sdk@0.1.0
```

Post lite paper PDF on pura.xyz. Consider arXiv submission.

## 7. GTM execution (days 4-21)

All materials exist in `gtm/`.

**Grants** (days 4-7): Submit to Base Builders, Superfluid Ecosystem, OpenClaw. Each grant doc is in `gtm/grant-*.md` — adapt to platform format, include mainnet tx links.

**LinkedIn** (days 4-7): 4 posts — problem statement, product announcement, building in public, three-project vision. Link blog post from `gtm/blog-post.md`.

**Twitter/Bluesky/Nostr** (days 4-14): 8-tweet core thread from `gtm/twitter-thread.md`, standalone tweets, reply-first engagement.

**Reddit** (days 7-14): Comments first in r/ethereum, r/defi, r/MachineLearning, r/LocalLLaMA. Then staggered posts from `gtm/community-posts.md`.

**Direct outreach** (days 7-14): 3-5 DMs/day using `gtm/outreach-dm.md` templates. Focus on AI agent builders, Base ecosystem, Superfluid builders, relay operators.

**Catalini window** (days 4-18, time-sensitive): Follow `gtm/swarm-catalini.md` playbook — verification-bottleneck framing on LinkedIn, connection request, 7-tweet mapping thread.

**Show HN** (day ~14): "Show HN: Open-source LLM gateway with on-chain capacity routing (live on Base)". Tuesday/Wednesday, 9-10am ET.

**Feedback form** (day 4): Deploy 9-question form from `gtm/feedback-form.md` on Tally. Link from pura.xyz footer.

## 8. Nostr relay integration (days 14-28)

The relay contracts deploy in step 2. This step proves BPE generalizes beyond LLMs.

Reference script at `sdk/scripts/relay-register.ts` shows: register relay → join pool → verify capacity. Run it against a live Nostr relay (strfry or nostream) to submit periodic capacity attestations.

Write a blog post: how BPE generalizes from LLMs to relays. Post in Nostr developer channels.

## 9. Ongoing hardening

- **Monitoring**: Forward Vercel logs to Axiom (free tier). Set up Checkly on `api.pura.xyz/api/health`. Alert on gateway down, provider error rate > 10%, operator balance < 0.005 ETH.
- **Formal audit**: Commission Cyfrin or Code4rena for the 12 mainnet contracts before opening to external stakers. Budget $15-30k, timeline 2-4 weeks.

---

## Critical path

```
commit → deploy contracts → deploy gateway → e2e proof
                           ↘ deploy pura.xyz ↗
                             publish SDK
                             GTM (start day 4)
                             relay integration (start day 14)
                             hardening (ongoing)
```

Gateway and pura.xyz deploy in parallel. GTM starts as soon as the e2e proof works. Relay integration and hardening are independent tracks.

## Scope boundaries

Included: everything needed to make a live, usable system on Base mainnet that anyone can interact with, plus GTM to get people to do so.

Excluded: thermodynamic layer (v0.2), V2 composition contracts, OpenClaw integration (pending partnership), Lightning contracts (separate phase).
