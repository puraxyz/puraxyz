#!/usr/bin/env npx tsx
import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL as string)

async function run() {
  console.log('Running add_step_tracking migration...')

  await sql`ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS step_index INTEGER`
  console.log('  step_index column OK')

  await sql`ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS is_terminal BOOLEAN`
  console.log('  is_terminal column OK')

  await sql`ALTER TABLE verification_logs ADD COLUMN IF NOT EXISTS cost_usd DOUBLE PRECISION`
  console.log('  cost_usd column OK')

  await sql`CREATE INDEX IF NOT EXISTS idx_verification_logs_session_id ON verification_logs(session_id)`
  console.log('  session_id index OK')

  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'verification_logs' AND column_name = 'cost_usd'`
  console.log('  Verified cost_usd exists:', cols.length > 0)

  console.log('Migration complete')
}

run().catch(e => { console.error('Failed:', e.message); process.exit(1) })
