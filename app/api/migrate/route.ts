import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { authorization } = Object.fromEntries(request.headers.entries())
    
    // Simple auth - you can replace with proper auth
    const authToken = process.env.MIGRATION_TOKEN || "migrate_secret_2026"
    if (authorization !== `Bearer ${authToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🔄 Iniciando migración 003: Multi-channel support...')

    // 1. Contacts table
    console.log('📋 1/4 Actualizando tabla contacts...')
    await sql!`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp'`
    await sql!`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255)`
    await sql!`CREATE INDEX IF NOT EXISTS idx_contacts_external_user ON contacts(external_user_id, channel)`
    
    // 2. Conversations table
    console.log('📋 2/4 Actualizando tabla conversations...')
    await sql!`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp'`
    await sql!`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255)`
    await sql!`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_conversation_id VARCHAR(255)`
    await sql!`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS comments TEXT`
    await sql!`CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel)`
    await sql!`CREATE INDEX IF NOT EXISTS idx_conversations_external_user ON conversations(external_user_id)`
    
    // 3. Messages table
    console.log('📋 3/4 Actualizando tabla messages...')
    await sql!`ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp'`
    await sql!`ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(255)`
    await sql!`ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'inbound'`
    
    // Drop unique constraint if exists
    try {
      await sql!`DROP INDEX IF EXISTS messages_external_message_id_key`
    } catch (e) {
      // Ignore if doesn't exist
    }
    
    await sql!`CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id)`
    await sql!`CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction)`
    
    // 4. Webhook logs table
    console.log('📋 4/4 Creando tabla webhook_logs...')
    await sql!`
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
    await sql!`CREATE INDEX IF NOT EXISTS idx_webhook_logs_channel ON webhook_logs(channel)`
    await sql!`CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed)`

    console.log('✅ Migración completada exitosamente')

    // Verificar tablas
    const tables = await sql!`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('contacts', 'conversations', 'messages', 'webhook_logs')
      ORDER BY table_name
    `

    // Verificar columnas agregadas
    const columns = await sql!`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name IN ('contacts', 'conversations', 'messages')
        AND column_name IN ('channel', 'external_user_id', 'external_message_id', 'direction', 'comments')
      ORDER BY table_name, column_name
    `

    return NextResponse.json({
      success: true,
      message: "Migración 003 ejecutada exitosamente",
      tables: tables.map(t => t.table_name),
      columns_added: columns.map(c => ({
        table: c.table_name,
        column: c.column_name,
        type: c.data_type
      }))
    })

  } catch (error) {
    console.error('❌ Error en migración:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// GET para verificar el estado
export async function GET(request: Request) {
  try {
    const { authorization } = Object.fromEntries(request.headers.entries())
    
    const authToken = process.env.MIGRATION_TOKEN || "migrate_secret_2026"
    if (authorization !== `Bearer ${authToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verificar si la migración ya se ejecutó
    const columns = await sql!`
      SELECT 
        table_name,
        column_name
      FROM information_schema.columns
      WHERE table_name IN ('contacts', 'conversations', 'messages')
        AND column_name IN ('channel', 'external_user_id')
      ORDER BY table_name, column_name
    `

    const webhookLogsExists = await sql!`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'webhook_logs'
      ) as exists
    `

    const migrationApplied = columns.length >= 4 && webhookLogsExists[0].exists

    return NextResponse.json({
      migration_applied: migrationApplied,
      columns_found: columns.map(c => `${c.table_name}.${c.column_name}`),
      webhook_logs_table_exists: webhookLogsExists[0].exists
    })

  } catch (error) {
    console.error('❌ Error verificando migración:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}
