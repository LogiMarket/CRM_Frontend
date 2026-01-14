import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
});

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración 005_add_comments.sql...');
    
    const migrationPath = join(process.cwd(), 'scripts', '005_add_comments.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.toLowerCase().includes('alter table')) {
        console.log('  📝 Agregando columna comments...');
        await sql.unsafe(statement);
      } else if (statement.toLowerCase().includes('select')) {
        console.log('  ✅ Verificando columna...');
        const result = await sql.unsafe(statement);
        console.log('  ', result);
      }
    }
    
    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
