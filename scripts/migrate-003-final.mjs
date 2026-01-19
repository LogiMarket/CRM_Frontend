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

async function runMigration() {
  const envVars = loadEnv();
  
  // Intenta conexión directa sin SSL primero, Railway a veces no lo requiere desde local
  const configs = [
    {
      name: 'Direct (no SSL)',
      url: `postgresql://postgres:dlUgCToYuJzffefYdmhInjPvQMlIjdnC@switchyard.proxy.rlwy.net:54324/railway`
    },
    {
      name: 'With SSL require',
      url: `postgresql://postgres:dlUgCToYuJzffefYdmhInjPvQMlIjdnC@switchyard.proxy.rlwy.net:54324/railway?sslmode=require`
    },
    {
      name: 'Internal host',
      url: `postgresql://postgres:dlUgCToYuJzffefYdmhInjPvQMlIjdnC@postgres.railway.internal:5432/railway?sslmode=require`
    }
  ];

  let sql = null;
  
  for (const cfg of configs) {
    try {
      console.log(`\n🔄 Intentando conexión: ${cfg.name}...`);
      sql = postgres(cfg.url, {
        max: 1,
        ssl: cfg.url.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
      });
      
      // Test connection
      await sql`SELECT 1`;
      console.log(`✅ Conexión exitosa: ${cfg.name}`);
      break;
    } catch (err) {
      console.log(`❌ Falló ${cfg.name}: ${err.message}`);
      if (sql) await sql.end();
      sql = null;
    }
  }

  if (!sql) {
    console.error('\n❌ No se pudo conectar a PostgreSQL con ninguna configuración');
    process.exit(1);
  }

  try {
    console.log('\n🔄 Ejecutando migración 003_add_multichannel_support.sql...\n');
    
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
          console.log(`  ✅ ${statement.substring(0, 70)}...`);
        } else if (statement.toLowerCase().includes('create')) {
          console.log(`  ✅ ${statement.substring(0, 70)}...`);
        }
      } catch (err) {
        // Si ya existe, continuar
        if (err.message.includes('already exists') || err.message.includes('does not exist')) {
          console.log(`  ℹ️  ${statement.substring(0, 70)}... (saltado)`);
        } else {
          throw err;
        }
      }
    }
    
    console.log(`\n✅ Migración 003 completada: ${count} statements ejecutados exitosamente`);
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
