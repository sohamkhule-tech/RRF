-- ============================================
-- Migration: Patch Job Descriptions Schema
-- Purpose: Add missing subFunction column to existing table
-- Date: April 21, 2026
-- ============================================

-- Add the missing subFunction column
ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS subFunction VARCHAR(255);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_job_descriptions_subfunction ON job_descriptions(subFunction);

-- Update verification
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_descriptions' AND column_name='subfunction') THEN
        RAISE NOTICE 'Column subFunction successfully added to job_descriptions table.';
    ELSE
        RAISE EXCEPTION 'Failed to add subFunction column.';
    END IF;
END $$;
