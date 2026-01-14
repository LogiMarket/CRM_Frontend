import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
});

async function runMigration006() {
  try {
    console.log('🔄 Ejecutando migración 006: Fix status and comments...\n');
    
    // 1. Agregar columna comments si no existe
    console.log('1️⃣ Agregando columna comments...');
    try {
      await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT NULL`;
      console.log('   ✅ Columna comments creada/verificada');
    } catch (error) {
      console.log('   ⚠️  Error agregando comments:', error.message);
    }
    
    // 2. Cambiar status de ENUM a VARCHAR
    console.log('\n2️⃣ Cambiando status de ENUM a VARCHAR...');
    
    // Verificar el tipo actual
    const statusColumn = await sql`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'status'
    `;
    
    console.log('   Tipo actual:', statusColumn[0]?.data_type);
    
    if (statusColumn[0]?.data_type === 'USER-DEFINED') {
      console.log('   Convirtiendo ENUM a VARCHAR...');
      
      // Crear columna temporal
      await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status_temp VARCHAR(50)`;
      
      // Copiar valores
      await sql`UPDATE conversations SET status_temp = CAST(status AS VARCHAR)`;
      
      // Eliminar columna antigua
      await sql`ALTER TABLE conversations DROP COLUMN status CASCADE`;
      
      // Renombrar
      await sql`ALTER TABLE conversations RENAME COLUMN status_temp TO status`;
      
      // Valores por defecto
      await sql`ALTER TABLE conversations ALTER COLUMN status SET DEFAULT 'open'`;
      await sql`UPDATE conversations SET status = 'open' WHERE status IS NULL`;
      await sql`ALTER TABLE conversations ALTER COLUMN status SET NOT NULL`;
      
      console.log('   ✅ Status convertido a VARCHAR');
    } else {
      console.log('   ✅ Status ya es VARCHAR o compatible');
    }
    
    // 3. Verificar resultado
    console.log('\n3️⃣ Verificando resultado...');
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'conversations' AND column_name IN ('status', 'comments')
      ORDER BY column_name
    `;
    
    console.log('\n   Estructura final:');
    result.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    console.log('\n✅ Migración 006 completada exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration006();
