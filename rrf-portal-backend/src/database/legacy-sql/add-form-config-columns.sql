-- Add missing columns to rrf_form_configs table
-- This adds 'type' and 'is_required' columns to support the dynamic form config system

-- Add 'type' column (dropdown, text, etc.)
ALTER TABLE rrf_form_configs 
ADD COLUMN IF NOT EXISTS field_type VARCHAR(50) DEFAULT 'dropdown';

-- Add 'is_required' column for mandatory field validation
ALTER TABLE rrf_form_configs 
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- Update existing records to have correct type
UPDATE rrf_form_configs SET field_type = 'dropdown' WHERE field_type IS NULL;

-- Update Business Unit to be required
UPDATE rrf_form_configs SET is_required = true WHERE field_name = 'businessUnit';

-- Verify changes
SELECT field_name, field_label, field_type, is_required, step, section 
FROM rrf_form_configs 
ORDER BY step, display_order;
