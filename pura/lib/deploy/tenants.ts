import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join("/tmp", "pura-data");
const DB_FILE = join(DATA_DIR, "tenants.json");

export interface Tenant {
  pubkey: string;
  subdomain: string;
  customDomain?: string;
  plan: "free" | "pro" | "operator";
  superfluidStreamId?: string;
  relayName: string;
  relayDescription: string;
  allowedPubkeys: string[];
  maxEventSize: number;
  allowedKinds: number[];
  storageUsedBytes: number;
  eventCount: number;
  createdAt: number;
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readTenants(): Tenant[] {
  ensureDir();
  if (!existsSync(DB_FILE)) return [];
  return JSON.parse(readFileSync(DB_FILE, "utf-8"));
}

function writeTenants(tenants: Tenant[]) {
  ensureDir();
  writeFileSync(DB_FILE, JSON.stringify(tenants, null, 2));
}

export function getTenantByPubkey(pubkey: string): Tenant | undefined {
  return readTenants().find((t) => t.pubkey === pubkey);
}

export function getTenantBySubdomain(subdomain: string): Tenant | undefined {
  return readTenants().find((t) => t.subdomain === subdomain);
}

const RESERVED = new Set([
  "www", "api", "admin", "app", "relay", "mail", "smtp", "ftp",
  "ns1", "ns2", "dev", "staging", "test", "demo",
]);

const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function validateSubdomain(
  subdomain: string,
): { valid: true } | { valid: false; reason: string } {
  const s = subdomain.toLowerCase();
  if (!SUBDOMAIN_RE.test(s)) {
    return { valid: false, reason: "Must be 3-40 lowercase alphanumeric characters or hyphens" };
  }
  if (RESERVED.has(s)) {
    return { valid: false, reason: "Subdomain is reserved" };
  }
  if (getTenantBySubdomain(s)) {
    return { valid: false, reason: "Subdomain is taken" };
  }
  return { valid: true };
}

export function createTenant(pubkey: string, subdomain: string): Tenant {
  const tenants = readTenants();
  const tenant: Tenant = {
    pubkey,
    subdomain: subdomain.toLowerCase(),
    plan: "free",
    relayName: `${subdomain}'s relay`,
    relayDescription: `Personal Nostr relay at ${subdomain}.pura.xyz`,
    allowedPubkeys: [pubkey],
    maxEventSize: 65536,
    allowedKinds: [],
    storageUsedBytes: 0,
    eventCount: 0,
    createdAt: Date.now(),
  };
  tenants.push(tenant);
  writeTenants(tenants);
  return tenant;
}

export function updateTenant(
  pubkey: string,
  updates: Partial<Pick<Tenant, "relayName" | "relayDescription" | "allowedPubkeys" | "allowedKinds" | "customDomain">>,
): Tenant | null {
  const tenants = readTenants();
  const idx = tenants.findIndex((t) => t.pubkey === pubkey);
  if (idx === -1) return null;
  Object.assign(tenants[idx], updates);
  writeTenants(tenants);
  return tenants[idx];
}

export function upgradeTenant(
  pubkey: string,
  plan: Tenant["plan"],
  streamId?: string,
): Tenant | null {
  const tenants = readTenants();
  const idx = tenants.findIndex((t) => t.pubkey === pubkey);
  if (idx === -1) return null;
  tenants[idx].plan = plan;
  if (streamId) tenants[idx].superfluidStreamId = streamId;
  writeTenants(tenants);
  return tenants[idx];
}
