-- Migration: Add verification observability tables (Phase C)
-- This migration is ADDITIVE ONLY - no destructive changes
-- Run against production database: psql $DATABASE_URL -f prisma/migrations/add_verification_logs.sql

-- Verification Logs — records every verification API call for dashboard analytics
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    verifier_id VARCHAR(128) NOT NULL,
    verdict VARCHAR(16) NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    tier VARCHAR(16) NOT NULL,
    agent_name VARCHAR(128),
    agent_framework VARCHAR(64),
    session_id VARCHAR(128),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_verifier_id ON verification_logs(verifier_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at ON verification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_logs_agent_name ON verification_logs(agent_name);

-- Agent Profiles — tracks unique agents that have used the platform
CREATE TABLE IF NOT EXISTS agent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) UNIQUE NOT NULL,
    framework VARCHAR(64),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    total_verifications INTEGER NOT NULL DEFAULT 0,
    pass_rate DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_framework ON agent_profiles(framework);

COMMENT ON TABLE verification_logs IS 'Records every verification API call for dashboard analytics and observability';
COMMENT ON TABLE agent_profiles IS 'Tracks unique agent identities that have used the verification platform';
