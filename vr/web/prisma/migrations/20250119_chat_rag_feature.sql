-- Migration for AI Chat / RAG feature
-- Run this on Neon PostgreSQL to create the chat tables

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources_json JSONB,
  feedback INTEGER CHECK (feedback IN (-1, 1)),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Chat Usage (rate limiting)
CREATE TABLE IF NOT EXISTS chat_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_count INTEGER DEFAULT 0,
  last_reset_date TIMESTAMP DEFAULT NOW()
);

-- RAG Documentation Sources
CREATE TABLE IF NOT EXISTS rag_doc_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  last_indexed TIMESTAMP,
  chunk_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_sources_platform ON rag_doc_sources(platform);
CREATE INDEX IF NOT EXISTS idx_rag_sources_active ON rag_doc_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_rag_sources_priority ON rag_doc_sources(priority);

-- RAG Document Chunks with vector embeddings
CREATE TABLE IF NOT EXISTS rag_doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES rag_doc_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  metadata_json JSONB,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_doc_chunks(source_id);

-- Create HNSW index for fast vector similarity search
-- This is much faster than IVFFlat for small-medium datasets
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding 
ON rag_doc_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add is_admin column to users if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for chat_conversations
DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for rag_doc_sources  
DROP TRIGGER IF EXISTS update_rag_doc_sources_updated_at ON rag_doc_sources;
CREATE TRIGGER update_rag_doc_sources_updated_at
    BEFORE UPDATE ON rag_doc_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions if using a separate role
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_role;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_role;

COMMENT ON TABLE chat_conversations IS 'User chat sessions with the AI assistant';
COMMENT ON TABLE chat_messages IS 'Individual messages in chat conversations';
COMMENT ON TABLE chat_usage IS 'Rate limiting tracker - 20 queries/day free tier';
COMMENT ON TABLE rag_doc_sources IS 'Documentation sources for RAG retrieval';
COMMENT ON TABLE rag_doc_chunks IS 'Chunked documentation with vector embeddings';
