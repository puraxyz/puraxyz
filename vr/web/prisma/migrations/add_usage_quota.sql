-- Migration: add_usage_quota
-- Adds apiKeyId + evidenceHash to verification_logs,
-- creates usage_records and quota_records tables.
-- Run against NeonDB: psql $DATABASE_URL < prisma/migrations/add_usage_quota.sql

BEGIN;

-- ── Enhance verification_logs ────────────────────────────────────────────────
ALTER TABLE verification_logs
  ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_hash VARCHAR(71);

CREATE INDEX IF NOT EXISTS idx_verification_logs_api_key
  ON verification_logs(api_key_id);

-- ── Usage tracking (per-request) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_records (
  id            SERIAL PRIMARY KEY,
  api_key_id    UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint      VARCHAR(256) NOT NULL,
  method        VARCHAR(8)   NOT NULL,
  status_code   INTEGER      NOT NULL,
  latency_ms    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_api_key
  ON usage_records(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_created_at
  ON usage_records(created_at);

-- ── Quota management (per-key limits) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quota_records (
  id             SERIAL PRIMARY KEY,
  api_key_id     UUID NOT NULL UNIQUE REFERENCES api_keys(id) ON DELETE CASCADE,
  daily_limit    INTEGER     NOT NULL DEFAULT 1000,
  monthly_limit  INTEGER     NOT NULL DEFAULT 10000,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
