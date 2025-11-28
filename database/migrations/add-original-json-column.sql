-- Migration: Add original_json column to books table
-- Date: 2025-11-10
-- Purpose: Store raw JSON from import files for auditing and re-processing

-- Add the column
ALTER TABLE books
ADD COLUMN IF NOT EXISTS original_json JSONB;

-- Add a comment for documentation
COMMENT ON COLUMN books.original_json IS 'Original JSON from source file (for auditing and re-processing)';

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'books' AND column_name = 'original_json';
