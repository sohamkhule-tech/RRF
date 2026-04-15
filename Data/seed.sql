INSERT INTO rrf_form_configs (field_name, field_label, field_options, step, section, display_order)
VALUES 
('entity', 'Entity', '["DataFortune Inc", "Techfortune Inc"]'::jsonb, 1, 'Organization', 1),
('function', 'Function', '["Delivery", "Sales", "Support"]'::jsonb, 1, 'Organization', 2),
('subFunction', 'Sub Function', '["SGINTL", "VR", "PMO", "BDE", "Sales", "MR", "Marketing", "Human Resources", "Talent Acquisition", "Accounts", "IT Networking"]'::jsonb, 1, 'Organization', 3),
('requisitionType', 'Requisition Type', '["Billable", "Non-Billable"]'::jsonb, 1, 'Request Type', 4),
('nonBillableSubType', 'Non-Billable Sub Type', '["Bench", "Pipeline"]'::jsonb, 1, 'Request Type', 5),
('positionType', 'Position Type', '["New Position", "Replacement", "Additional"]'::jsonb, 2, 'Position Information', 1),
('employmentType', 'Employment Type', '["Full-time", "Part-time", "Contract"]'::jsonb, 2, 'Position Information', 2),
('priority', 'Priority', '["Low", "Medium", "High", "Critical"]'::jsonb, 2, 'Position Information', 3),
('workMode', 'Work Mode', '["Remote", "Hybrid", "On-site"]'::jsonb, 2, 'Position Information', 4),
('location', 'Location', '["Pune", "Chennai", "Bengaluru", "US", "Other"]'::jsonb, 2, 'Position Information', 5)
ON CONFLICT (field_name) DO UPDATE SET 
    step = EXCLUDED.step,
    section = EXCLUDED.section,
    display_order = EXCLUDED.display_order;
