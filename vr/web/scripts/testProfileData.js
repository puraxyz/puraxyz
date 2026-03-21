// Quick test to check profile data fetching
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function testProfile() {
  const sql = neon(process.env.DATABASE_URL);
  
  // List all users
  console.log('=== All Users ===');
  const users = await sql`SELECT id, username, first_name, last_name, url_avatar FROM users LIMIT 10`;
  console.log(users);
  
  // Check uplift_profiles
  console.log('\n=== Uplift Profiles ===');
  const profiles = await sql`SELECT * FROM uplift_profiles LIMIT 10`;
  console.log(profiles);
  
  // Check uplift_links
  console.log('\n=== Uplift Links ===');
  const links = await sql`SELECT * FROM uplift_links LIMIT 10`;
  console.log(links);
  
  // Check uplift_models
  console.log('\n=== Uplift Models ===');
  const models = await sql`SELECT * FROM uplift_models LIMIT 10`;
  console.log(models);
  
  // Test a specific profile lookup
  if (users.length > 0 && users[0].username) {
    const username = users[0].username.toLowerCase();
    console.log(`\n=== Testing lookup for "${username}" ===`);
    
    const result = await sql`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.url_avatar,
        up.bio,
        up.tagline,
        COALESCE(up.theme, 'dark') as theme
      FROM users u
      LEFT JOIN uplift_profiles up ON u.id = up.user_id
      WHERE LOWER(u.username) = ${username}
      LIMIT 1;
    `;
    console.log('Profile result:', result);
  }
}

testProfile().catch(console.error);
