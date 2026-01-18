-- Add multi-channel support (WhatsApp, Facebook Messenger, etc)

-- Alter contacts table to store external IDs
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_contacts_external_user ON contacts(external_user_id, channel);

-- Alter conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_user_id VARCHAR(255);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_conversation_id VARCHAR(255);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS comments TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_external_user ON conversations(external_user_id);

-- Alter messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'whatsapp';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(255) UNIQUE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'inbound';
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages(external_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

-- Add status field to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID;

-- Create webhook_logs table for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  channel VARCHAR(50) NOT NULL,
  external_id VARCHAR(255),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_channel ON webhook_logs(channel);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
