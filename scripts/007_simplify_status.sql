-- Migration: Simplify conversation status to only 'active' and 'resolved'
-- Date: 2026-01-16

-- Update existing statuses to new simplified values
UPDATE conversations 
SET status = CASE 
  WHEN status IN ('open', 'assigned') THEN 'active'
  WHEN status IN ('closed', 'resolved') THEN 'resolved'
  ELSE 'active'
END;

-- Set default for new conversations
ALTER TABLE conversations 
ALTER COLUMN status SET DEFAULT 'active';

-- Verify the migration
SELECT status, COUNT(*) 
FROM conversations 
GROUP BY status;
