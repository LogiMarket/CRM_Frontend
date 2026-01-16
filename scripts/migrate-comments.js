const postgres = require('postgres');

// Use DATABASE_URL from environment or default to Railway public URL
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:JLXuRZdhCKgfMfGVMvOPxjzGKTKSLjlf@junction.proxy.rlwy.net:48006/railway';

console.log('Connecting to database...');

const sql = postgres(connectionString, {
  ssl: false,
  max: 1
});

async function migrate() {
  try {
    console.log('Adding comments column to conversations table...');
    
    await sql`
      ALTER TABLE conversations 
      ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT ''
    `;
    
    console.log('✅ Comments column added successfully!');
    
    // Verify the column was added
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'conversations' AND column_name = 'comments'
    `;
    
    console.log('Verification:', result);
    
    await sql.end();
    console.log('Migration completed successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

migrate();
