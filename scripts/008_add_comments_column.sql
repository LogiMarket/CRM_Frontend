-- Migration: Add comments column to conversations table
-- Date: 2026-01-16

-- Add comments column to store conversation notes/comments
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT '';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversations' AND column_name = 'comments';
