-- ============================================
-- Migration: Add Functions Table & Update Subfunctions
-- Purpose: Implement ID-based Function<->Subfunction mapping
-- Date: April 20, 2026
-- ============================================

-- Step 1: Create Functions table
CREATE TABLE IF NOT EXISTS functions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create indexes for Functions
CREATE INDEX IF NOT EXISTS idx_functions_name ON functions(name);
CREATE INDEX IF NOT EXISTS idx_functions_is_active ON functions(is_active);

-- Step 3: Add function_id column to subfunctions table
ALTER TABLE subfunctions 
ADD COLUMN IF NOT EXISTS function_id INTEGER;

-- Step 4: Add foreign key constraint
ALTER TABLE subfunctions
ADD CONSTRAINT fk_subfunctions_function FOREIGN KEY (function_id) 
REFERENCES functions(id) ON DELETE SET NULL;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_subfunctions_function_id ON subfunctions(function_id);

-- ============================================
-- Data Migration: Migrate existing data
-- ============================================

-- Step 6: Extract unique function names from subfunctions and create Function records
INSERT INTO functions (name, description, display_order)
SELECT DISTINCT 
  function AS name,
  'Migrated from subfunctions' AS description,
  0 AS display_order
FROM subfunctions
WHERE function IS NOT NULL AND function != ''
ON CONFLICT (name) DO NOTHING;

-- Step 7: Update subfunctions to link tothe new function records
UPDATE subfunctions sf
SET function_id = f.id
FROM functions f
WHERE sf.function = f.name
AND sf.function IS NOT NULL;

-- ============================================
-- Verification Queries
-- ============================================

-- Check Functions table
-- SELECT * FROM functions ORDER BY name;

-- Check Subfunctions with their Function
-- SELECT 
--   sf.id, 
--   sf.name AS subfunction_name,
--   sf.function AS old_function_name,
--   f.id AS function_id,
--   f.name AS function_name
-- FROM subfunctions sf
-- LEFT JOIN functions f ON sf.function_id = f.id
-- ORDER BY f.name, sf.name;

-- Check unmapped subfunctions
-- SELECT id, name, function 
-- FROM subfunctions 
-- WHERE function_id IS NULL;

-- ============================================
-- Rollback Script (if needed)
-- ============================================

-- Uncomment to rollback:
-- ALTER TABLE subfunctions DROP CONSTRAINT IF EXISTS fk_subfunctions_function;
-- ALTER TABLE subfunctions DROP COLUMN IF EXISTS function_id;
-- DROP INDEX IF EXISTS idx_subfunctions_function_id;
-- DROP TABLE IF EXISTS functions;
