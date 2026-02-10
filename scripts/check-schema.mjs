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

    // 0. Verificar si existe la columna channel
    console.log('0️⃣ Verificando columna channel...');
    const channelColumn = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'channel'
    `;

    if (channelColumn.length === 0) {
      console.log('   ❌ Columna channel NO existe. Creando...');
      await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp'`;
      console.log('   ✅ Columna channel creada');
    } else {
      console.log('   ✅ Columna channel existe');
    }

    // 0.1 Verificar si existe la columna external_user_id
    console.log('\n0️⃣.1 Verificando columna external_user_id...');
    const externalUserIdColumn = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'external_user_id'
    `;

    if (externalUserIdColumn.length === 0) {
      console.log('   ❌ Columna external_user_id NO existe. Creando...');
      await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255) DEFAULT NULL`;
      console.log('   ✅ Columna external_user_id creada');
    } else {
      console.log('   ✅ Columna external_user_id existe');
    }
    
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
            // Enum labels in Postgres must be string literals and cannot be parameterized.
            // Values are controlled by us, so this usage is safe.
            await sql.unsafe(
              `ALTER TYPE conversations_status_enum ADD VALUE IF NOT EXISTS '${String(value).replace(/'/g, "''")}'`,
            );
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

    // 4. Verificar tabla macros y columna created_by
    console.log('\n4️⃣ Verificando tabla macros / columna created_by...');

    const usersTable = await sql`SELECT to_regclass('public.users') as name`;
    const usersIdInfo = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
      LIMIT 1
    `;
    const usersIdUdt = usersIdInfo?.[0]?.udt_name;
    const createdByTypeSql = usersIdUdt === 'uuid' ? 'UUID' : 'INTEGER';

    const macrosTable = await sql`SELECT to_regclass('public.macros') as name`;
    if (!macrosTable?.[0]?.name) {
      console.log('   ❌ Tabla macros NO existe. Creando...');
      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS macros (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          shortcut VARCHAR(50),
          created_by ${createdByTypeSql},
          usage_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('   ✅ Tabla macros creada');
    } else {
      console.log('   ✅ Tabla macros existe');
    }

    const macrosCreatedByInfo = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'macros' AND column_name = 'created_by'
      LIMIT 1
    `;

    if (macrosCreatedByInfo.length === 0) {
      console.log('   ❌ Columna macros.created_by NO existe. Creando...');
      await sql.unsafe(`ALTER TABLE macros ADD COLUMN IF NOT EXISTS created_by ${createdByTypeSql}`);
      console.log(`   ✅ Columna macros.created_by creada (${createdByTypeSql})`);
    } else {
      const macrosCreatedByUdt = macrosCreatedByInfo?.[0]?.udt_name;
      const expectedUdt = usersIdUdt === 'uuid' ? 'uuid' : 'int4';
      if (macrosCreatedByUdt !== expectedUdt) {
        console.log(`   ⚠️  macros.created_by tiene tipo ${macrosCreatedByUdt}, se espera ${expectedUdt}`);
        const nonNullCount = await sql`
          SELECT COUNT(*)::int as count
          FROM macros
          WHERE created_by IS NOT NULL
        `;
        if ((nonNullCount?.[0]?.count ?? 0) === 0) {
          console.log('   🔧 Corrigiendo tipo de macros.created_by (sin datos)...');
          try {
            await sql`ALTER TABLE macros DROP COLUMN created_by`;
          } catch (error) {
            console.log('   ⚠️  No se pudo borrar columna created_by:', error.message);
          }
          await sql.unsafe(`ALTER TABLE macros ADD COLUMN IF NOT EXISTS created_by ${createdByTypeSql}`);
          console.log(`   ✅ macros.created_by actualizado a ${createdByTypeSql}`);
        } else {
          console.log('   ⚠️  No se corrige tipo automáticamente (hay datos no nulos).');
        }
      } else {
        console.log('   ✅ Columna macros.created_by existe y coincide con users.id');
      }
    }

    if (usersTable?.[0]?.name) {
      const fkExists = await sql`
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'macros_created_by_fkey'
        LIMIT 1
      `;

      if (fkExists.length === 0) {
        try {
          await sql`
            ALTER TABLE macros
            ADD CONSTRAINT macros_created_by_fkey
            FOREIGN KEY (created_by)
            REFERENCES users(id)
            ON DELETE SET NULL
          `;
          console.log('   ✅ FK macros.created_by -> users.id creada');
        } catch (error) {
          console.log('   ⚠️  No se pudo crear FK macros_created_by_fkey:', error.message);
        }
      } else {
        console.log('   ✅ FK macros_created_by_fkey existe');
      }
    } else {
      console.log('   ⚠️  Tabla users no existe; se omite FK de macros.created_by');
    }

    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_macros_created_by ON macros(created_by)`;
    } catch (error) {
      console.log('   ⚠️  No se pudo crear índice idx_macros_created_by:', error.message);
    }

    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkAndFixSchema();
