import { randomBytes, createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const KEYS_FILE = join(DATA_DIR, "keys.json");

export interface ApiKeyRecord {
  /** The hashed key (sha256 hex) — stored, never the raw key */
  hash: string;
  /** Key prefix for display (first 8 chars) */
  prefix: string;
  /** Optional label */
  label: string;
  /** Linked wallet address (set later) */
  wallet: string | null;
  /** Total requests made */
  requests: number;
  /** Created timestamp */
  createdAt: string;
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ─── Storage backend selection ───
// Uses Upstash Redis when configured, otherwise JSON file.

import { useRedis, getRedisUrl, getRedisToken } from "./redis-config";

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${getRedisUrl()}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${getRedisToken()}` },
  });
  const data = await res.json() as { result: string | null };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  await fetch(`${getRedisUrl()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", key, value]),
  });
}

async function redisSMembers(key: string): Promise<string[]> {
  const res = await fetch(`${getRedisUrl()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SMEMBERS", key]),
  });
  const data = await res.json() as { result: string[] };
  return data.result ?? [];
}

async function redisSAdd(key: string, member: string): Promise<void> {
  await fetch(`${getRedisUrl()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRedisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SADD", key, member]),
  });
}

// ─── JSON file backend (local dev / fallback) ───

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadKeysFile(): ApiKeyRecord[] {
  ensureDataDir();
  if (!existsSync(KEYS_FILE)) return [];
  return JSON.parse(readFileSync(KEYS_FILE, "utf-8"));
}

function saveKeysFile(keys: ApiKeyRecord[]) {
  ensureDataDir();
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// ─── Public API ───

export function generateKey(label = ""): { raw: string; record: ApiKeyRecord } {
  const raw = `pura_${randomBytes(24).toString("hex")}`;
  const record: ApiKeyRecord = {
    hash: hashKey(raw),
    prefix: raw.slice(0, 13),
    label,
    wallet: null,
    requests: 0,
    createdAt: new Date().toISOString(),
  };

  if (useRedis()) {
    // Fire-and-forget: store record and add hash to index set
    const h = record.hash;
    redisSet(`pura:key:${h}`, JSON.stringify(record)).catch(() => {});
    redisSAdd("pura:keys", h).catch(() => {});
  } else {
    const keys = loadKeysFile();
    keys.push(record);
    saveKeysFile(keys);
  }

  return { raw, record };
}

export function validateKey(raw: string): ApiKeyRecord | null {
  const hash = hashKey(raw);

  if (useRedis()) {
    // Synchronous path not possible with fetch — use a cached approach.
    // The chat route already hashes the key; we do a sync lookup from the
    // in-memory cache populated on first hit (see validateKeyAsync).
    return keyCache.get(hash) ?? null;
  }

  const keys = loadKeysFile();
  return keys.find((k) => k.hash === hash) ?? null;
}

// Async validation for Redis backend (called from auth.ts)
export async function validateKeyAsync(raw: string): Promise<ApiKeyRecord | null> {
  const hash = hashKey(raw);

  if (useRedis()) {
    const data = await redisGet(`pura:key:${hash}`);
    if (!data) return null;
    const record = JSON.parse(data) as ApiKeyRecord;
    keyCache.set(hash, record);
    return record;
  }

  const keys = loadKeysFile();
  return keys.find((k) => k.hash === hash) ?? null;
}

// Per-request cache so validateKey (sync) works after validateKeyAsync loads the record
const keyCache = new Map<string, ApiKeyRecord>();

export function incrementRequests(raw: string): void {
  const hash = hashKey(raw);

  if (useRedis()) {
    // Read-modify-write via Redis
    (async () => {
      const data = await redisGet(`pura:key:${hash}`);
      if (!data) return;
      const record = JSON.parse(data) as ApiKeyRecord;
      record.requests++;
      await redisSet(`pura:key:${hash}`, JSON.stringify(record));
      keyCache.set(hash, record);
    })().catch(() => {});
    return;
  }

  const keys = loadKeysFile();
  const key = keys.find((k) => k.hash === hash);
  if (key) {
    key.requests++;
    saveKeysFile(keys);
  }
}

export function linkWallet(raw: string, wallet: string): boolean {
  const hash = hashKey(raw);

  if (useRedis()) {
    (async () => {
      const data = await redisGet(`pura:key:${hash}`);
      if (!data) return;
      const record = JSON.parse(data) as ApiKeyRecord;
      record.wallet = wallet;
      await redisSet(`pura:key:${hash}`, JSON.stringify(record));
      keyCache.set(hash, record);
    })().catch(() => {});
    return true;
  }

  const keys = loadKeysFile();
  const key = keys.find((k) => k.hash === hash);
  if (!key) return false;
  key.wallet = wallet;
  saveKeysFile(keys);
  return true;
}

export function listKeys(): ApiKeyRecord[] {
  if (useRedis()) {
    // Return cached keys (populated lazily); full list requires async
    return Array.from(keyCache.values());
  }
  return loadKeysFile();
}

export async function listKeysAsync(): Promise<ApiKeyRecord[]> {
  if (useRedis()) {
    const hashes = await redisSMembers("pura:keys");
    const records: ApiKeyRecord[] = [];
    for (const h of hashes) {
      const data = await redisGet(`pura:key:${h}`);
      if (data) {
        const record = JSON.parse(data) as ApiKeyRecord;
        keyCache.set(h, record);
        records.push(record);
      }
    }
    return records;
  }
  return loadKeysFile();
}
