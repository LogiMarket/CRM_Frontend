const postgres = require('postgres');

async function migrate() {
  const sql = postgres('postgresql://postgres:dlUgCToYuJzffefYdmhInjPvQMlIjdnC@switchyard.proxy.rlwy.net:54324/railway', {
    ssl: false,
    max: 1
  });

  try {
    console.log('Conectando a la base de datos...');
    console.log('Agregando columna comments...');
    
    // Check if column already exists first
    const checkExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'comments'
    `;
    
    console.log('Columna comments existe?', checkExists.length > 0 ? 'SI' : 'NO');
    
    if (checkExists.length === 0) {
      await sql`ALTER TABLE conversations ADD COLUMN comments TEXT DEFAULT ''`;
      console.log('Columna comments agregada exitosamente!');
    } else {
      console.log('Columna comments ya existe, saltando...');
    }
    
    const verify = await sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'comments'
    `;
    
    console.log('Verificacion final:', verify);
    
    await sql.end();
    console.log('Migracion completada!');
    process.exit(0);
  } catch (error) {
    console.error('Error en la migracion:', error.message);
    console.error('Stack:', error.stack);
    try {
      await sql.end();
    } catch (e) {}
    process.exit(1);
  }
}

migrate();
