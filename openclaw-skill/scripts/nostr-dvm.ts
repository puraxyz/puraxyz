#!/usr/bin/env npx ts-node
/**
 * Nostr DVM worker — listens for NIP-90 job requests and routes them
 * through the Pura gateway, posting results back as kind-6xxx events.
 *
 * This makes an OpenClaw agent a first-class participant in the NVM.
 *
 * Usage:
 *   NVM_PRIVATE_KEY=<hex> NVM_RELAYS=wss://relay.damus.io PURA_API_KEY=pura_... \
 *     npx ts-node openclaw-skill/scripts/nostr-dvm.ts
 */

import { SimplePool, finalizeEvent, getPublicKey } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';

const SUPPORTED_KINDS = [5100]; // text-generation DVM
const RESULT_KIND_OFFSET = 1000;

function loadConfig() {
  const privKeyHex = process.env.NVM_PRIVATE_KEY;
  if (!privKeyHex) throw new Error('NVM_PRIVATE_KEY required (hex)');
  const secretKey = Uint8Array.from(Buffer.from(privKeyHex, 'hex'));
  const pubkey = getPublicKey(secretKey);
  const relays = (process.env.NVM_RELAYS ?? 'wss://relay.damus.io').split(',');
  const gatewayUrl = process.env.PURA_GATEWAY_URL ?? 'https://api.pura.xyz';
  const apiKey = process.env.PURA_API_KEY;

  return { secretKey, pubkey, relays, gatewayUrl, apiKey };
}

async function handleJobRequest(
  event: Event,
  config: ReturnType<typeof loadConfig>,
  pool: SimplePool,
): Promise<void> {
  console.log(`[DVM] Job request ${event.id.slice(0, 8)}… kind=${event.kind}`);

  // Extract input from tags
  const inputTag = event.tags.find((t) => t[0] === 'i');
  const input = inputTag?.[1] ?? event.content;

  if (!config.apiKey) {
    console.warn('[DVM] No PURA_API_KEY — returning echo result');
    await publishResult(event, `[echo] ${input}`, config, pool);
    return;
  }

  // Route through Pura gateway
  try {
    const response = await fetch(`${config.gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: input }],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    await publishResult(event, content, config, pool);
  } catch (err) {
    console.error(`[DVM] Job failed:`, err);
    await publishError(event, String(err), config, pool);
  }
}

async function publishResult(
  jobEvent: Event,
  content: string,
  config: ReturnType<typeof loadConfig>,
  pool: SimplePool,
): Promise<void> {
  const resultKind = jobEvent.kind + RESULT_KIND_OFFSET;
  const unsigned = {
    kind: resultKind,
    pubkey: config.pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', jobEvent.id],
      ['p', jobEvent.pubkey],
      ['status', 'success'],
    ],
    content,
  };
  const signed = finalizeEvent(unsigned, config.secretKey);
  await Promise.allSettled(pool.publish(config.relays, signed));
  console.log(`[DVM] Published result ${signed.id.slice(0, 8)}…`);
}

async function publishError(
  jobEvent: Event,
  errorMsg: string,
  config: ReturnType<typeof loadConfig>,
  pool: SimplePool,
): Promise<void> {
  const resultKind = jobEvent.kind + RESULT_KIND_OFFSET;
  const unsigned = {
    kind: resultKind,
    pubkey: config.pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', jobEvent.id],
      ['p', jobEvent.pubkey],
      ['status', 'error'],
    ],
    content: errorMsg,
  };
  const signed = finalizeEvent(unsigned, config.secretKey);
  await Promise.allSettled(pool.publish(config.relays, signed));
}

async function main() {
  const config = loadConfig();
  console.log(`[DVM] Agent pubkey: ${config.pubkey.slice(0, 16)}…`);
  console.log(`[DVM] Relays: ${config.relays.join(', ')}`);
  console.log(`[DVM] Listening for job kinds: ${SUPPORTED_KINDS.join(', ')}`);

  const pool = new SimplePool();

  const filter: Filter = {
    kinds: SUPPORTED_KINDS,
    '#p': [config.pubkey],
    since: Math.floor(Date.now() / 1000),
  };

  pool.subscribeMany(config.relays, [filter], {
    onevent: (event: Event) => {
      handleJobRequest(event, config, pool).catch((err) =>
        console.error('[DVM] Unhandled error:', err),
      );
    },
    oneose: () => {
      console.log('[DVM] Subscription caught up — listening for new events');
    },
  });

  // Keep alive
  process.on('SIGINT', () => {
    console.log('[DVM] Shutting down…');
    pool.close(config.relays);
    process.exit(0);
  });
}

main().catch(console.error);
