#!/usr/bin/env npx tsx

/**
 * Run SQL migration against Neon database
 * Usage: npx tsx scripts/run-migration.ts
 */

import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'

// Load environment
import 'dotenv/config'

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  
  const migrationPath = path.join(__dirname, '../prisma/migrations/20250119_chat_rag_feature.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8')
  
  console.log('🚀 Running migration: 20250119_chat_rag_feature.sql')
  console.log('='.repeat(50))
  
  // Split into statements (rough split by semicolons, handling $$ blocks)
  // For complex migrations, it's better to run them in Neon console
  
  try {
    // Run the entire migration as a single transaction
    // Note: Some statements like CREATE EXTENSION may need to be run separately
    
    // First, try to enable pgvector
    console.log('📦 Enabling pgvector extension...')
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS vector;`
      console.log('   ✅ pgvector enabled')
    } catch (e: any) {
      console.log('   ⚠️  pgvector:', e.message)
    }
    
    // Create chat_conversations table
    console.log('📝 Creating chat_conversations table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);`
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);`
    console.log('   ✅ chat_conversations created')
    
    // Create chat_messages table
    console.log('📝 Creating chat_messages table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        sources_json JSONB,
        feedback INTEGER CHECK (feedback IN (-1, 1)),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);`
    await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);`
    console.log('   ✅ chat_messages created')
    
    // Create chat_usage table
    console.log('📝 Creating chat_usage table...')
    await sql`
      CREATE TABLE IF NOT EXISTS chat_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query_count INTEGER DEFAULT 0,
        last_reset_date TIMESTAMP DEFAULT NOW()
      );
    `
    console.log('   ✅ chat_usage created')
    
    // Create rag_doc_sources table
    console.log('📝 Creating rag_doc_sources table...')
    await sql`
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
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_sources_platform ON rag_doc_sources(platform);`
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_sources_active ON rag_doc_sources(is_active);`
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_sources_priority ON rag_doc_sources(priority);`
    console.log('   ✅ rag_doc_sources created')
    
    // Create rag_doc_chunks table
    console.log('📝 Creating rag_doc_chunks table...')
    await sql`
      CREATE TABLE IF NOT EXISTS rag_doc_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id UUID NOT NULL REFERENCES rag_doc_sources(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding vector(1536),
        metadata_json JSONB,
        token_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_doc_chunks(source_id);`
    console.log('   ✅ rag_doc_chunks created')
    
    // Create HNSW index for vector search
    console.log('📝 Creating vector search index...')
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding 
        ON rag_doc_chunks 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
      `
      console.log('   ✅ HNSW vector index created')
    } catch (e: any) {
      console.log('   ⚠️  Vector index:', e.message)
    }
    
    // Add is_admin column to users
    console.log('📝 Adding is_admin column to users...')
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;`
      console.log('   ✅ is_admin column added')
    } catch (e: any) {
      // Column might already exist
      console.log('   ⚠️  is_admin:', e.message)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('✅ Migration complete!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
