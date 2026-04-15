-- ============================================================
-- Add New Permissions for Unified RRF Detail Page
-- ============================================================
-- This script adds missing permissions for PMO and HR actions
-- and assigns them to appropriate roles

-- ============================================================
-- STEP 1: Add New Permissions
-- ============================================================

-- Get the module IDs
DO $$
DECLARE
  approvals_module_id INTEGER;
  rrf_module_id INTEGER;
  approver_role_id INTEGER;
  pmo_role_id INTEGER;
  hr_role_id INTEGER;
  admin_role_id INTEGER;
  permission_id INTEGER;
BEGIN
  -- Get module IDs
  SELECT id INTO approvals_module_id FROM modules WHERE code = 'APPROVALS';
  SELECT id INTO rrf_module_id FROM modules WHERE code = 'RRF';
  
  -- Get role IDs (case-insensitive)
  SELECT id INTO approver_role_id FROM roles WHERE UPPER("roleName") = 'APPROVER';
  SELECT id INTO pmo_role_id FROM roles WHERE UPPER("roleName") = 'PMO';
  SELECT id INTO hr_role_id FROM roles WHERE UPPER("roleName") = 'HR';
  SELECT id INTO admin_role_id FROM roles WHERE UPPER("roleName") = 'ADMIN';

  -- ============================================================
  -- 1. Add APPROVALS.ON_HOLD permission
  -- ============================================================
  INSERT INTO permissions (code, description, module_id, "isActive", "createdAt", "updatedAt")
  VALUES (
    'APPROVALS.ON_HOLD',
    'Put RRF on hold with reason',
    approvals_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO NOTHING;

  -- ============================================================
  -- 2. Add RRF.OPEN_FOR_HIRING permission
  -- ============================================================
  INSERT INTO permissions (code, description, module_id, "isActive", "createdAt", "updatedAt")
  VALUES (
    'RRF.OPEN_FOR_HIRING',
    'Open approved RRF for hiring process',
    rrf_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO NOTHING;

  -- ============================================================
  -- 3. Add RRF.FILL_FROM_BENCH permission
  -- ============================================================
  INSERT INTO permissions (code, description, module_id, "isActive", "createdAt", "updatedAt")
  VALUES (
    'RRF.FILL_FROM_BENCH',
    'Fill position from internal bench resources',
    rrf_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO NOTHING;

  -- ============================================================
  -- 4. Add RRF.CLOSE permission
  -- ============================================================
  INSERT INTO permissions (code, description, module_id, "isActive", "createdAt", "updatedAt")
  VALUES (
    'RRF.CLOSE',
    'Close RRF with candidate/closure details',
    rrf_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (code) DO NOTHING;

  -- ============================================================
  -- STEP 2: Assign Permissions to Roles
  -- ============================================================

  -- Approver gets APPROVALS.ON_HOLD
  SELECT id INTO permission_id FROM permissions WHERE code = 'APPROVALS.ON_HOLD';
  IF permission_id IS NOT NULL AND approver_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, "createdAt", "updatedAt")
    VALUES (approver_role_id, permission_id, NOW(), NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- PMO gets RRF.OPEN_FOR_HIRING
  SELECT id INTO permission_id FROM permissions WHERE code = 'RRF.OPEN_FOR_HIRING';
  IF permission_id IS NOT NULL AND pmo_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, "createdAt", "updatedAt")
    VALUES (pmo_role_id, permission_id, NOW(), NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- PMO gets RRF.FILL_FROM_BENCH
  SELECT id INTO permission_id FROM permissions WHERE code = 'RRF.FILL_FROM_BENCH';
  IF permission_id IS NOT NULL AND pmo_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, "createdAt", "updatedAt")
    VALUES (pmo_role_id, permission_id, NOW(), NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- HR gets RRF.CLOSE
  SELECT id INTO permission_id FROM permissions WHERE code = 'RRF.CLOSE';
  IF permission_id IS NOT NULL AND hr_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id, "createdAt", "updatedAt")
    VALUES (hr_role_id, permission_id, NOW(), NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Admin gets all new permissions
  FOR permission_id IN 
    SELECT id FROM permissions 
    WHERE code IN ('APPROVALS.ON_HOLD', 'RRF.OPEN_FOR_HIRING', 'RRF.FILL_FROM_BENCH', 'RRF.CLOSE')
  LOOP
    IF admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, "createdAt", "updatedAt")
      VALUES (admin_role_id, permission_id, NOW(), NOW())
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Permissions added and assigned successfully!';
END $$;

-- ============================================================
-- STEP 3: Verify the changes
-- ============================================================

-- Check newly added permissions
SELECT 
  p.id,
  p.code,
  p.description,
  m.name AS module_name,
  p."isActive"
FROM permissions p
LEFT JOIN modules m ON m.id = p.module_id
WHERE p.code IN (
  'APPROVALS.ON_HOLD',
  'RRF.OPEN_FOR_HIRING',
  'RRF.FILL_FROM_BENCH',
  'RRF.CLOSE'
)
ORDER BY p.code;

-- Check role assignments
SELECT 
  r."roleName" AS role,
  p.code AS permission,
  p.description
FROM role_permissions rp
INNER JOIN roles r ON r.id = rp.role_id
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE p.code IN (
  'APPROVALS.ON_HOLD',
  'RRF.OPEN_FOR_HIRING',
  'RRF.FILL_FROM_BENCH',
  'RRF.CLOSE'
)
ORDER BY r."roleName", p.code;

-- ============================================================
-- Expected Output:
-- ============================================================
-- Approver: APPROVALS.ON_HOLD
-- PMO: RRF.OPEN_FOR_HIRING, RRF.FILL_FROM_BENCH
-- HR: RRF.CLOSE
-- Admin: All four permissions
