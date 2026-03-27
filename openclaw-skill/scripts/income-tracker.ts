#!/usr/bin/env npx ts-node
/**
 * Income tracker — monitors NIP-57 zap receipts on Nostr and prints
 * periodic income statements.
 *
 * Watches for zap events (kind 9735) directed at this agent's pubkey,
 * tallies earnings, and logs them. Pairs with the DVM worker.
 *
 * Usage:
 *   NVM_PRIVATE_KEY=<hex> NVM_RELAYS=wss://relay.damus.io \
 *     npx ts-node openclaw-skill/scripts/income-tracker.ts
 */

import { SimplePool, getPublicKey } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';

const ZAP_RECEIPT_KIND = 9735;
const REPORT_INTERVAL_MS = 3600_000; // hourly summary

interface ZapEntry {
  timestamp: number;
  eventId: string;
  amountMsats: number;
  senderPubkey: string;
}

function loadConfig() {
  const privKeyHex = process.env.NVM_PRIVATE_KEY;
  if (!privKeyHex) throw new Error('NVM_PRIVATE_KEY required (hex)');
  const secretKey = Uint8Array.from(Buffer.from(privKeyHex, 'hex'));
  const pubkey = getPublicKey(secretKey);
  const relays = (process.env.NVM_RELAYS ?? 'wss://relay.damus.io').split(',');

  return { secretKey, pubkey, relays };
}

function extractAmountFromBolt11(bolt11: string): number {
  // Crude amount extraction from BOLT11 invoice.
  // Amount is encoded after "lnbc" prefix before the next letter.
  // Full parsing would need a proper BOLT11 decoder.
  const match = bolt11.match(/^lnbc(\d+)([munp]?)/i);
  if (!match) return 0;

  const num = parseInt(match[1], 10);
  const unit = match[2] || '';

  // Convert to msats
  switch (unit) {
    case '':
      return num * 100_000_000_000; // BTC→msats
    case 'm':
      return num * 100_000_000; // mBTC→msats
    case 'u':
      return num * 100_000; // μBTC→msats
    case 'n':
      return num * 100; // nBTC→msats
    case 'p':
      return num; // pBTC ≈ msats
    default:
      return 0;
  }
}

function extractZapAmount(event: Event): number {
  // Look for bolt11 tag in zap receipt
  const bolt11Tag = event.tags.find((t) => t[0] === 'bolt11');
  if (bolt11Tag?.[1]) {
    return extractAmountFromBolt11(bolt11Tag[1]);
  }

  // Fallback: look in description tag (NIP-57 zap request may have amount)
  const descTag = event.tags.find((t) => t[0] === 'description');
  if (descTag?.[1]) {
    try {
      const zapReq = JSON.parse(descTag[1]);
      const amountTag = zapReq.tags?.find((t: string[]) => t[0] === 'amount');
      if (amountTag?.[1]) return parseInt(amountTag[1], 10);
    } catch {
      // ignore
    }
  }

  return 0;
}

async function main() {
  const config = loadConfig();
  const pool = new SimplePool();
  const entries: ZapEntry[] = [];

  console.log(`[INCOME] Agent pubkey: ${config.pubkey.slice(0, 16)}…`);
  console.log(`[INCOME] Monitoring zap receipts on ${config.relays.join(', ')}`);

  const filter: Filter = {
    kinds: [ZAP_RECEIPT_KIND],
    '#p': [config.pubkey],
    since: Math.floor(Date.now() / 1000) - 86400, // last 24h
  };

  pool.subscribeMany(config.relays, [filter], {
    onevent: (event: Event) => {
      const amount = extractZapAmount(event);
      const sender = event.tags.find((t) => t[0] === 'P')?.[1] ?? event.pubkey;

      entries.push({
        timestamp: event.created_at,
        eventId: event.id,
        amountMsats: amount,
        senderPubkey: sender,
      });

      console.log(
        `[INCOME] Zap received: ${(amount / 1000).toFixed(0)} sats from ${sender.slice(0, 12)}…`,
      );
    },
    oneose: () => {
      console.log(`[INCOME] Historical sync complete — ${entries.length} zaps found`);
      printSummary(entries);
    },
  });

  // Periodic summary
  setInterval(() => {
    printSummary(entries);
  }, REPORT_INTERVAL_MS);

  process.on('SIGINT', () => {
    console.log('\n[INCOME] Final summary:');
    printSummary(entries);
    pool.close(config.relays);
    process.exit(0);
  });
}

function printSummary(entries: ZapEntry[]): void {
  const now = Math.floor(Date.now() / 1000);
  const last24h = entries.filter((e) => e.timestamp > now - 86400);
  const totalMsats = last24h.reduce((s, e) => s + e.amountMsats, 0);

  console.log('\n─── Income Summary (24h) ───');
  console.log(`Zaps received: ${last24h.length}`);
  console.log(`Total earned:  ${(totalMsats / 1000).toFixed(0)} sats`);
  console.log(`────────────────────────────\n`);
}

main().catch(console.error);
