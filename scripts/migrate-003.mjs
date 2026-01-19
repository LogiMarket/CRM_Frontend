import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer .env.local manualmente
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  
  const env = {};
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const eqIndex = line.indexOf('=');
      if (eqIndex > -1) {
        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        env[key] = value;
      }
    }
  });
  
  return env;
}

const envVars = loadEnv();

// Prefer discrete settings to avoid parser issues
const cfg = {
  host: envVars.PGHOST || envVars.PGHOSTADDR || 'switchyard.proxy.rlwy.net',
  port: Number(envVars.PGPORT || 54324),
  user: envVars.PGUSER || 'postgres',
  password: envVars.PGPASSWORD || envVars.POSTGRES_PASSWORD,
  database: envVars.PGDATABASE || envVars.POSTGRES_DB || 'railway',
  ssl: { rejectUnauthorized: false },
};

// Fallback: if DATABASE_URL provided, let postgres parse it
const DATABASE_URL = envVars.DATABASE_URL || envVars.DATABASE_PUBLIC_URL;

const sql = DATABASE_URL
  ? postgres(
      DATABASE_URL.includes('sslmode=')
        ? DATABASE_URL
        : `${DATABASE_URL}${DATABASE_URL.includes('?') ? '&' : '?'}sslmode=require`,
      { max: 1, ssl: { rejectUnauthorized: false } }
    )
  : postgres(cfg);

if (!cfg.password && !DATABASE_URL) {
  console.error('❌ No hay credenciales de Postgres: define DATABASE_URL o PGPASSWORD en .env.local');
  process.exit(1);
}

console.log('📦 Conectando a Railway PostgreSQL...');

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración 003_add_multichannel_support.sql...\n');
    
    const migrationPath = join(__dirname, '003_add_multichannel_support.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let count = 0;
    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        count++;
        
        if (statement.toLowerCase().includes('alter')) {
          console.log(`  ✅ ALTER: ${statement.substring(0, 50)}...`);
        } else if (statement.toLowerCase().includes('create')) {
          console.log(`  ✅ CREATE: ${statement.substring(0, 50)}...`);
        }
      } catch (err) {
        // Si ya existe, continuar (típico de IF NOT EXISTS)
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          console.log(`  ℹ️  ${statement.substring(0, 50)}... (ya existe, saltado)`);
        } else {
          throw err;
        }
      }
    }
    
    console.log(`\n✅ Migración 003 completada: ${count} statements ejecutados`);
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
