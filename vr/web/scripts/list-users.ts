#!/usr/bin/env npx tsx

/**
 * List users and manage admin status
 * Usage: 
 *   npx tsx scripts/list-users.ts               # List all users
 *   npx tsx scripts/list-users.ts --set-admin <neon_id>  # Set user as admin
 */

import { neon } from '@neondatabase/serverless'
import 'dotenv/config'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--set-admin') && args[args.indexOf('--set-admin') + 1]) {
    const neonId = args[args.indexOf('--set-admin') + 1]
    
    console.log(`Setting user ${neonId} as admin...`)
    
    const result = await sql`
      UPDATE users SET is_admin = true WHERE neon_id = ${neonId} RETURNING id, username;
    `
    
    if (result.length > 0) {
      console.log('✅ Admin set:', result[0])
    } else {
      console.log('❌ User not found with neon_id:', neonId)
    }
    return
  }
  
  // List users
  const users = await sql`
    SELECT id, neon_id, username, is_admin 
    FROM users 
    ORDER BY id;
  `
  
  console.log('Users in database:\n')
  console.table(users.map(u => ({
    id: u.id,
    neon_id: u.neon_id?.substring(0, 20) + '...',
    username: u.username,
    is_admin: u.is_admin
  })))
  
  console.log('\nTo set a user as admin, run:')
  console.log('  npx tsx scripts/list-users.ts --set-admin <neon_id>')
}

main().catch(console.error)
