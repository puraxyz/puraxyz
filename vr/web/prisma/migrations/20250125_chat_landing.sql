-- Migration for Chat Landing prompts (anonymous user prompts before signup)
-- Run this on Neon PostgreSQL

-- Chat Landing - stores prompts from non-signed-in users
CREATE TABLE IF NOT EXISTS chat_landing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  session_id VARCHAR(100),  -- browser fingerprint or session for carry-over
  user_agent TEXT,
  ip_address VARCHAR(45),
  converted BOOLEAN DEFAULT FALSE,  -- did they sign up?
  converted_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_landing_session ON chat_landing(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_landing_created ON chat_landing(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_landing_converted ON chat_landing(converted);

COMMENT ON TABLE chat_landing IS 'Stores prompts from anonymous users before signup for conversion tracking';
