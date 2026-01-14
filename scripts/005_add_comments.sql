-- Migration 005: Add comments field to conversations table

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT NULL;

-- Verify the migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'comments';
