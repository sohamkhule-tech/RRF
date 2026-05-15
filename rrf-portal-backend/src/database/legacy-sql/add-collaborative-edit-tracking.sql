-- ============================================================
-- Migration: Add collaborative edit tracking columns to rrfs
-- Date: 2026-04-22
-- Purpose: Track who last edited an RRF and in what role
--          (HIRING_MANAGER or APPROVER) for the collaborative
--          workflow system.
-- ============================================================

ALTER TABLE rrfs
  ADD COLUMN IF NOT EXISTS last_edited_by_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_edited_by_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_edited_at      TIMESTAMP;

-- Optional index for audit queries
CREATE INDEX IF NOT EXISTS idx_rrfs_last_edited_by_id ON rrfs(last_edited_by_id);
