-- Migration: Convert comments from text format to JSON array format
-- This script handles both new empty comments and existing text comments

UPDATE conversations 
SET comments = CASE 
  WHEN comments IS NULL OR comments = '' THEN '[]'::jsonb
  WHEN comments ~ '^[\[]' THEN comments::jsonb
  ELSE jsonb_build_array(
    jsonb_build_object(
      'id', (extract(epoch from now()) * 1000)::text,
      'text', comments,
      'created_at', COALESCE(updated_at, created_at)::text
    )
  )
END
WHERE comments IS NOT NULL AND comments != '';

-- For NULL comments, set to empty array
UPDATE conversations 
SET comments = '[]'::jsonb
WHERE comments IS NULL OR comments = '';
