-- Migration: Add step-level tracking and cost columns to verification_logs (Phase B2/B4)

-- Step-level verification columns
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS step_index INTEGER;
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS is_terminal BOOLEAN;

-- Cost transparency column (B4)
ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS cost_usd DOUBLE PRECISION;

-- Session-based step queries need an index on session_id
CREATE INDEX IF NOT EXISTS idx_verification_logs_session_id ON verification_logs(session_id);
