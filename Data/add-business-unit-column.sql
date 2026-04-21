-- Add business_unit column to rrfs table
-- Run this inside Docker container or directly on database

ALTER TABLE rrfs 
ADD COLUMN IF NOT EXISTS business_unit VARCHAR(50);

-- Verify column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'rrfs' AND column_name = 'business_unit';

-- Check existing form config
SELECT field_name, field_label, is_active 
FROM rrf_form_configs 
WHERE field_name = 'businessUnit';
