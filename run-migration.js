const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:dIUgCToYuJzffefYdmhInjPvQMlIjdnC@switchyard.proxy.rlwy.net:54324/railway'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'scripts', '003_add_multichannel_support.sql'), 'utf8');
    await client.query(sql);
    console.log('✓ Migración ejecutada exitosamente');
  } catch (error) {
    console.error('✗ Error en migración:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
