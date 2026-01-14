import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
});

async function checkAndFixSchema() {
  try {
    console.log('🔍 Verificando esquema de base de datos...\n');
    
    // 1. Verificar si existe la columna comments
    console.log('1️⃣ Verificando columna comments...');
    const commentsColumn = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'comments'
    `;
    
    if (commentsColumn.length === 0) {
      console.log('   ❌ Columna comments NO existe. Creando...');
      await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT NULL`;
      console.log('   ✅ Columna comments creada');
    } else {
      console.log('   ✅ Columna comments existe');
    }
    
    // 2. Verificar valores del enum status
    console.log('\n2️⃣ Verificando enum de status...');
    const enumValues = await sql`
      SELECT e.enumlabel as value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'conversations_status_enum'
      ORDER BY e.enumsortorder
    `;
    
    if (enumValues.length > 0) {
      console.log('   Valores actuales del enum:', enumValues.map(v => v.value).join(', '));
      
      // Verificar si necesitamos agregar nuevos valores
      const currentValues = enumValues.map(v => v.value);
      const requiredValues = ['open', 'assigned', 'resolved', 'closed'];
      const missingValues = requiredValues.filter(v => !currentValues.includes(v));
      
      if (missingValues.length > 0) {
        console.log('   ⚠️  Valores faltantes:', missingValues.join(', '));
        for (const value of missingValues) {
          try {
            await sql`ALTER TYPE conversations_status_enum ADD VALUE IF NOT EXISTS ${sql(value)}`;
            console.log(`   ✅ Agregado valor: ${value}`);
          } catch (error) {
            console.log(`   ⚠️  No se pudo agregar ${value}:`, error.message);
          }
        }
      } else {
        console.log('   ✅ Todos los valores necesarios existen');
      }
    } else {
      console.log('   ❌ Enum conversations_status_enum no existe');
      console.log('   Intentando cambiar status a VARCHAR...');
      
      // Cambiar a VARCHAR si el enum no existe
      await sql`ALTER TABLE conversations ALTER COLUMN status TYPE VARCHAR(50)`;
      console.log('   ✅ Columna status cambiada a VARCHAR');
    }
    
    // 3. Verificar estructura de la tabla conversations
    console.log('\n3️⃣ Verificando estructura de tabla conversations...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'conversations'
      ORDER BY ordinal_position
    `;
    
    console.log('\n   Columnas de la tabla conversations:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
    });
    
    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkAndFixSchema();
