-- Add Business Unit field to Form Config
-- This makes Business Unit appear in the Form Config UI and RRF forms

INSERT INTO rrf_form_configs (field_name, field_label, field_options, step, section, display_order, is_active)
VALUES (
  'businessUnit',
  'Business Unit',
  '["SG", "VR", "PMO"]'::jsonb,
  1,
  'Organization',
  6,
  true
)
ON CONFLICT (field_name) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_options = EXCLUDED.field_options,
  is_active = EXCLUDED.is_active;

-- Verify insertion
SELECT * FROM rrf_form_configs WHERE field_name = 'businessUnit';
