-- ============================================================
-- Add Workflow Permissions for Unified RRF Detail Page
-- ============================================================
-- This script adds missing permissions for Approver, PMO, and HR actions
-- and assigns them to appropriate roles
--
-- CRITICAL FIXES:
-- - Uses correct column names: permission_code, permission_name, module_code, role_name
-- - Properly separates UPDATE (edit) from CLOSE (HR), FILL_FROM_BENCH (PMO)
-- - PMO does NOT get CLOSE permission (uses FILL_FROM_BENCH instead)

-- ============================================================
-- STEP 1: Add New Permissions
-- ============================================================

DO $$
DECLARE
  approvals_module_id INTEGER;
  rrf_module_id INTEGER;
  approver_role_id INTEGER;
  pmo_role_id INTEGER;
  hr_role_id INTEGER;
  admin_role_id INTEGER;
  perm_id INTEGER;
BEGIN
  -- Get module IDs using correct column name
  SELECT id INTO approvals_module_id FROM modules WHERE module_code = 'APPROVALS';
  SELECT id INTO rrf_module_id FROM modules WHERE module_code = 'RRF';
  
  RAISE NOTICE 'APPROVALS module_id: %', approvals_module_id;
  RAISE NOTICE 'RRF module_id: %', rrf_module_id;
  
  -- Get role IDs (use correct column name)
  SELECT id INTO approver_role_id FROM roles WHERE UPPER(role_name) = 'APPROVER';
  SELECT id INTO pmo_role_id FROM roles WHERE UPPER(role_name) = 'PMO';
  SELECT id INTO hr_role_id FROM roles WHERE UPPER(role_name) = 'HR';
  SELECT id INTO admin_role_id FROM roles WHERE UPPER(role_name) = 'ADMIN';
  
  RAISE NOTICE 'Approver role_id: %', approver_role_id;
  RAISE NOTICE 'PMO role_id: %', pmo_role_id;
  RAISE NOTICE 'HR role_id: %', hr_role_id;
  RAISE NOTICE 'Admin role_id: %', admin_role_id;

  -- ============================================================
  -- 1. Add APPROVALS.ON_HOLD permission
  -- ============================================================
  INSERT INTO permissions (permission_code, permission_name, description, module_id, is_active, created_at, updated_at)
  VALUES (
    'ON_HOLD',
    'On Hold',
    'Put RRF on hold with reason',
    approvals_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (module_id, permission_code) DO NOTHING;

  RAISE NOTICE 'Added APPROVALS.ON_HOLD permission';

  -- ============================================================
  -- 2. Add RRF.OPEN_FOR_HIRING permission
  -- ============================================================
  INSERT INTO permissions (permission_code, permission_name, description, module_id, is_active, created_at, updated_at)
  VALUES (
    'OPEN_FOR_HIRING',
    'Open for Hiring',
    'Open approved RRF for hiring process',
    rrf_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (module_id, permission_code) DO NOTHING;

  RAISE NOTICE 'Added RRF.OPEN_FOR_HIRING permission';

  -- ============================================================
  -- 3. Add RRF.FILL_FROM_BENCH permission
  -- ============================================================
  INSERT INTO permissions (permission_code, permission_name, description, module_id, is_active, created_at, updated_at)
  VALUES (
    'FILL_FROM_BENCH',
    'Fill from Bench',
    'Fill position from internal bench resources (auto-closes RRF)',
    rrf_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (module_id, permission_code) DO NOTHING;

  RAISE NOTICE 'Added RRF.FILL_FROM_BENCH permission';

  -- ============================================================
  -- 4. Add RRF.CLOSE permission
  -- ============================================================
  INSERT INTO permissions (permission_code, permission_name, description, module_id, is_active, created_at, updated_at)
  VALUES (
    'CLOSE',
    'Close',
    'Close RRF with candidate/closure details (HR manual close)',
    rrf_module_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (module_id, permission_code) DO NOTHING;

  RAISE NOTICE 'Added RRF.CLOSE permission';

  -- ============================================================
  -- STEP 2: Assign Permissions to Roles
  -- ============================================================

  -- Approver gets APPROVALS.ON_HOLD
  SELECT p.id INTO perm_id 
  FROM permissions p
  INNER JOIN modules m ON m.id = p.module_id
  WHERE m.module_code = 'APPROVALS' AND p.permission_code = 'ON_HOLD';
  
  IF perm_id IS NOT NULL AND approver_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (approver_role_id, perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    RAISE NOTICE 'Assigned APPROVALS.ON_HOLD to Approver';
  END IF;

  -- PMO gets RRF.OPEN_FOR_HIRING
  SELECT p.id INTO perm_id 
  FROM permissions p
  INNER JOIN modules m ON m.id = p.module_id
  WHERE m.module_code = 'RRF' AND p.permission_code = 'OPEN_FOR_HIRING';
  
  IF perm_id IS NOT NULL AND pmo_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (pmo_role_id, perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    RAISE NOTICE 'Assigned RRF.OPEN_FOR_HIRING to PMO';
  END IF;

  -- PMO gets RRF.FILL_FROM_BENCH (auto-closes, NOT manual CLOSE!)
  SELECT p.id INTO perm_id 
  FROM permissions p
  INNER JOIN modules m ON m.id = p.module_id
  WHERE m.module_code = 'RRF' AND p.permission_code = 'FILL_FROM_BENCH';
  
  IF perm_id IS NOT NULL AND pmo_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (pmo_role_id, perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    RAISE NOTICE 'Assigned RRF.FILL_FROM_BENCH to PMO';
  END IF;

  -- HR gets RRF.CLOSE (manual close, NOT FILL_FROM_BENCH!)
  SELECT p.id INTO perm_id 
  FROM permissions p
  INNER JOIN modules m ON m.id = p.module_id
  WHERE m.module_code = 'RRF' AND p.permission_code = 'CLOSE';
  
  IF perm_id IS NOT NULL AND hr_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (hr_role_id, perm_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    RAISE NOTICE 'Assigned RRF.CLOSE to HR';
  END IF;

  -- Admin gets all new permissions
  FOR perm_id IN 
    SELECT p.id 
    FROM permissions p
    INNER JOIN modules m ON m.id = p.module_id
    WHERE (m.module_code = 'APPROVALS' AND p.permission_code = 'ON_HOLD')
       OR (m.module_code = 'RRF' AND p.permission_code IN ('OPEN_FOR_HIRING', 'FILL_FROM_BENCH', 'CLOSE'))
  LOOP
    IF admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (admin_role_id, perm_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Assigned all new permissions to Admin';

  RAISE NOTICE '✅ Permissions added and assigned successfully!';
END $$;

-- ============================================================
-- STEP 3: Verify the changes
-- ============================================================

-- Check newly added permissions
SELECT 
  p.id,
  CONCAT(m.module_code, '.', p.permission_code) AS full_code,
  p.permission_name,
  p.permission_code,
  p.description,
  m.module_name,
  p.is_active
FROM permissions p
INNER JOIN modules m ON m.id = p.module_id
WHERE (m.module_code = 'APPROVALS' AND p.permission_code = 'ON_HOLD')
   OR (m.module_code = 'RRF' AND p.permission_code IN ('OPEN_FOR_HIRING', 'FILL_FROM_BENCH', 'CLOSE'))
ORDER BY m.module_code, p.permission_code;

-- Check role assignments
SELECT 
  r.role_name AS role,
  CONCAT(m.module_code, '.', p.permission_code) AS permission,
  p.permission_name,
  p.description
FROM role_permissions rp
INNER JOIN roles r ON r.id = rp.role_id
INNER JOIN permissions p ON p.id = rp.permission_id
INNER JOIN modules m ON m.id = p.module_id
WHERE (m.module_code = 'APPROVALS' AND p.permission_code = 'ON_HOLD')
   OR (m.module_code = 'RRF' AND p.permission_code IN ('OPEN_FOR_HIRING', 'FILL_FROM_BENCH', 'CLOSE'))
ORDER BY r.role_name, m.module_code, p.permission_code;

-- ============================================================
-- Expected Output:
-- ============================================================
-- Permissions table should show:
--   APPROVALS.ON_HOLD       | Approver
--   RRF.OPEN_FOR_HIRING     | PMO, Admin
--   RRF.FILL_FROM_BENCH     | PMO, Admin (auto-closes to closed-by-bench)
--   RRF.CLOSE               | HR, Admin (manual close to closed)
--
-- Role assignments should show:
--   Admin     | APPROVALS.ON_HOLD
--   Admin     | RRF.CLOSE
--   Admin     | RRF.FILL_FROM_BENCH
--   Admin     | RRF.OPEN_FOR_HIRING
--   Approver  | APPROVALS.ON_HOLD
--   HR        | RRF.CLOSE
--   PMO       | RRF.FILL_FROM_BENCH
--   PMO       | RRF.OPEN_FOR_HIRING
--
-- CRITICAL: PMO does NOT have RRF.CLOSE (uses FILL_FROM_BENCH instead!)
