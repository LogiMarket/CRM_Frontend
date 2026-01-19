import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:VgzGsJBXCtKRiSAPAOTZdnTVRBkgvuBY@junction.proxy.rlwy.net:33845/railway"

console.log('🔌 Conectando a la base de datos...')
const sql = postgres(databaseUrl, { 
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
})

async function runMigration() {
  try {
    console.log('📋 Migración 003: Multi-channel support\n')
    
    // Contacts
    console.log('1️⃣ Agregando campos a contacts...')
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp'`
    await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_external_user ON contacts(external_user_id, channel)`
    console.log('✅ Contacts actualizado')
    
    // Conversations
    console.log('2️⃣ Agregando campos a conversations...')
    await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp'`
    await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255)`
    await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_conversation_id VARCHAR(255)`
    await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS comments TEXT`
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel)`
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_external_user ON conversations(external_user_id)`
    console.log('✅ Conversations actualizado')
    
    // Messages
    console.log('3️⃣ Agregando campos a messages...')
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp'`
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(255)`
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'inbound'`
    
    // Drop unique constraint if exists and recreate
    try {
      await sql`DROP INDEX IF EXISTS messages_external_message_id_key`
    } catch (e) {
      // Ignore if doesn't exist
    }
    
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction)`
    console.log('✅ Messages actualizado')
    
    // Webhook logs
    console.log('4️⃣ Creando tabla webhook_logs...')
    await sql`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        channel VARCHAR(50) NOT NULL,
        external_id VARCHAR(255),
        payload JSONB,
        processed BOOLEAN DEFAULT FALSE,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_logs_channel ON webhook_logs(channel)`
    await sql`CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed)`
    console.log('✅ Webhook_logs creado')
    
    console.log('\n🎉 Migración completada exitosamente!\n')
    
    // Verificar
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('contacts', 'conversations', 'messages', 'webhook_logs')
      ORDER BY table_name
    `
    console.log('📊 Tablas actualizadas:', tables.map(t => t.table_name).join(', '))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  } finally {
    await sql.end()
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
