-- Migration: Add approved_by_name column to rrfs table
-- Stores denormalized approver name for fast reads (no join needed)
-- Date: 2026-04-28

ALTER TABLE rrfs ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255);

-- Backfill existing approved records from the users table
UPDATE rrfs r
SET approved_by_name = u.full_name
FROM users u
WHERE r.approved_by_id = u.id
  AND r.approved_by_name IS NULL
  AND r.approved_by_id IS NOT NULL;
