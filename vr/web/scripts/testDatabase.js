import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function testDatabase() {
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Testing database connection...');
    
    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS openai_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        endpoint VARCHAR(255)
      );
    `;
    console.log('✓ Table created/verified');

    // Create index if it doesn't exist
    await sql`
      CREATE INDEX IF NOT EXISTS idx_openai_usage_user_created 
      ON openai_usage (user_id, created_at);
    `;
    console.log('✓ Index created/verified');

    // Test insert
    const testUserId = 999999; // Use a test user ID
    await sql`
      INSERT INTO openai_usage (user_id, created_at, endpoint)
      VALUES (${testUserId}, NOW(), 'test')
    `;
    console.log('✓ Test record inserted');

    // Test query
    const count = await sql`
      SELECT COUNT(*) as count
      FROM openai_usage 
      WHERE user_id = ${testUserId}
    `;
    console.log('✓ Query result:', count[0]);

    // Clean up test record
    await sql`
      DELETE FROM openai_usage 
      WHERE user_id = ${testUserId}
    `;
    console.log('✓ Test record cleaned up');

    // Check table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'openai_usage'
      ORDER BY ordinal_position;
    `;
    console.log('✓ Table structure:', tableInfo);

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();