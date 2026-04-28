-- Migration: Add denormalised audit name columns to rrfs table
-- Date: 2026-04-28
-- Columns: declined_by_name, on_hold_by_id, on_hold_by_name

ALTER TABLE rrfs ADD COLUMN IF NOT EXISTS declined_by_name VARCHAR(255);
ALTER TABLE rrfs ADD COLUMN IF NOT EXISTS on_hold_by_id INTEGER;
ALTER TABLE rrfs ADD COLUMN IF NOT EXISTS on_hold_by_name VARCHAR(255);

-- Backfill declined_by_name from users table
UPDATE rrfs r
SET declined_by_name = u.full_name
FROM users u
WHERE r.declined_by_id = u.id
  AND r.declined_by_name IS NULL
  AND r.declined_by_id IS NOT NULL
  AND r.status IN ('declined', 'rejected');

-- Note: on_hold_by_id / on_hold_by_name cannot be backfilled
-- because on-hold records previously reused declined_by_id.
-- New on-hold actions will populate these columns going forward.
