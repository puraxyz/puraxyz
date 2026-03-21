// Run a migration using the Neon serverless driver
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('Running migration: add_link_is_primary.sql');
  
  try {
    // Add is_primary column to uplift_links
    await sql`ALTER TABLE uplift_links ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE`;
    console.log('✓ Added is_primary column to uplift_links');
    
    // Add caption column to uplift_models
    await sql`ALTER TABLE uplift_models ADD COLUMN IF NOT EXISTS caption VARCHAR(160)`;
    console.log('✓ Added caption column to uplift_models');
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
