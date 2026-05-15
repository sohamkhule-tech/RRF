-- ====================================================================
-- ADD STATUS_HISTORY COLUMN TO RRFS TABLE
-- ====================================================================
-- Purpose: Track status change history for RRF workflow
-- Date: April 17, 2026
-- Fixes: "column 'status_history' does not exist" error on fill-by-bench
-- ====================================================================

-- Add status_history column as JSONB with default empty array
ALTER TABLE rrfs
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- ====================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ====================================================================

-- 1. Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'rrfs' AND column_name = 'status_history';

-- Expected output:
--  column_name    | data_type | column_default
-- ----------------+-----------+------------------
--  status_history | jsonb     | '[]'::jsonb

-- 2. Test query (should not error)
SELECT id, status, status_history FROM rrfs LIMIT 1;

-- 3. Count rows with null status_history (should be 0 after migration)
SELECT COUNT(*) FROM rrfs WHERE status_history IS NULL;

-- ====================================================================
-- ROLLBACK (if needed)
-- ====================================================================
-- ALTER TABLE rrfs DROP COLUMN IF EXISTS status_history;

-- ====================================================================
-- NOTES
-- ====================================================================
-- - JSONB is more efficient than JSON for querying and indexing
-- - Default '[]'::jsonb ensures new rows have empty array
-- - IF NOT EXISTS prevents error if column already exists
-- - This migration is safe to run multiple times (idempotent)
