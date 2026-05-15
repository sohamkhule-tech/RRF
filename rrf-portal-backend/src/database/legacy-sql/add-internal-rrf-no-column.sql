-- Migration: Add internal_rrf_no column to rrfs table
-- Date: April 16, 2026
-- Purpose: Auto-generated Internal RRF Number for Fill From Bench workflow

-- Step 1: Add the column (nullable initially for existing records)
ALTER TABLE rrfs 
ADD COLUMN IF NOT EXISTS internal_rrf_no VARCHAR(50);

-- Step 2: Add unique constraint
ALTER TABLE rrfs
ADD CONSTRAINT uq_internal_rrf_no UNIQUE (internal_rrf_no);

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_internal_rrf_no ON rrfs(internal_rrf_no);

-- Step 4: Add comment
COMMENT ON COLUMN rrfs.internal_rrf_no IS 'Auto-generated internal RRF number in format RRF-INT-XXX';

-- Verification query
SELECT 
  column_name, 
  data_type, 
  character_maximum_length, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rrfs' 
  AND column_name = 'internal_rrf_no';
