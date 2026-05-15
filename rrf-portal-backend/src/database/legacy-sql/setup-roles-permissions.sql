-- ================================================================
-- Role-Permission Management - Database Setup Script
-- ================================================================
-- This script adds ROLES module and permissions to the database
-- Run this script to enable the Roles Management feature
-- ================================================================

-- Step 1: Check if ROLES module exists, if not create it
-- ================================================================
INSERT INTO modules (module_name, module_code, description, display_order, is_active)
SELECT 
  'Roles Management', 
  'ROLES', 
  'Manage role-permission assignments for users',
  4,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM modules WHERE module_code = 'ROLES'
);

-- Get the module ID for ROLES (needed for permissions)
-- ================================================================

-- Step 2: Create ROLES permissions
-- ================================================================
-- Note: Replace <ROLES_MODULE_ID> with actual module ID from modules table
-- You can find it by running: SELECT id FROM modules WHERE module_code = 'ROLES';

INSERT INTO permissions (module_id, permission_name, permission_code, description, is_active)
SELECT 
  (SELECT id FROM modules WHERE module_code = 'ROLES'),
  'Read Roles',
  'READ',
  'View roles and their permissions',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p
  JOIN modules m ON p.module_id = m.id
  WHERE m.module_code = 'ROLES' AND p.permission_code = 'READ'
);

INSERT INTO permissions (module_id, permission_name, permission_code, description, is_active)
SELECT 
  (SELECT id FROM modules WHERE module_code = 'ROLES'),
  'Update Roles',
  'UPDATE',
  'Modify role-permission assignments',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p
  JOIN modules m ON p.module_id = m.id
  WHERE m.module_code = 'ROLES' AND p.permission_code = 'UPDATE'
);

-- Step 3: Assign ROLES permissions to ADMIN role
-- ================================================================
-- This ensures admin users can manage role permissions

-- Get the ADMIN role ID
-- SELECT id FROM roles WHERE role_code = 'ADMIN';

-- Assign ROLES.READ to ADMIN
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'ADMIN'),
  p.id,
  CURRENT_TIMESTAMP
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES' 
  AND p.permission_code = 'READ'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN')
      AND rp.permission_id = p.id
  );

-- Assign ROLES.UPDATE to ADMIN
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'ADMIN'),
  p.id,
  CURRENT_TIMESTAMP
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES' 
  AND p.permission_code = 'UPDATE'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN')
      AND rp.permission_id = p.id
  );

-- ================================================================
-- Verification Queries
-- ================================================================
-- Run these queries to verify the setup is complete

-- 1. Verify ROLES module exists
SELECT * FROM modules WHERE module_code = 'ROLES';

-- 2. Verify ROLES permissions exist
SELECT 
  m.module_name,
  m.module_code,
  p.permission_name,
  p.permission_code,
  CONCAT(m.module_code, '.', p.permission_code) as full_permission_code
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES'
ORDER BY p.permission_code;

-- Expected result:
-- module_name        | module_code | permission_name | permission_code | full_permission_code
-- Roles Management   | ROLES       | Read Roles      | READ            | ROLES.READ
-- Roles Management   | ROLES       | Update Roles    | UPDATE          | ROLES.UPDATE

-- 3. Verify ADMIN has ROLES permissions
SELECT 
  r.role_name,
  r.role_code,
  m.module_code,
  p.permission_code,
  CONCAT(m.module_code, '.', p.permission_code) as full_permission_code,
  rp.granted_at
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE r.role_code = 'ADMIN'
  AND m.module_code = 'ROLES'
ORDER BY p.permission_code;

-- Expected result should show:
-- role_name | role_code | module_code | permission_code | full_permission_code | granted_at
-- Admin     | ADMIN     | ROLES       | READ            | ROLES.READ           | <timestamp>
-- Admin     | ADMIN     | ROLES       | UPDATE          | ROLES.UPDATE         | <timestamp>

-- 4. Check for UNIQUE constraint on role_permissions table
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'role_permissions' 
  AND constraint_type = 'UNIQUE';

-- Expected: Should show a UNIQUE constraint on (role_id, permission_id)
-- If not present, run:
-- ALTER TABLE role_permissions ADD CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id);

-- ================================================================
-- Troubleshooting
-- ================================================================

-- If you get duplicate key errors, check for existing mappings:
SELECT * FROM role_permissions 
WHERE role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN')
  AND permission_id IN (
    SELECT p.id FROM permissions p
    JOIN modules m ON p.module_id = m.id
    WHERE m.module_code = 'ROLES'
  );

-- If ADMIN role doesn't exist, check available roles:
SELECT id, role_name, role_code FROM roles WHERE is_active = true;

-- ================================================================
-- Cleanup (if you need to remove ROLES permissions)
-- ================================================================
-- CAUTION: Only run this if you want to remove the feature

-- Delete role_permissions mappings for ROLES
-- DELETE FROM role_permissions 
-- WHERE permission_id IN (
--   SELECT p.id FROM permissions p
--   JOIN modules m ON p.module_id = m.id
--   WHERE m.module_code = 'ROLES'
-- );

-- Delete ROLES permissions
-- DELETE FROM permissions 
-- WHERE module_id = (SELECT id FROM modules WHERE module_code = 'ROLES');

-- Delete ROLES module
-- DELETE FROM modules WHERE module_code = 'ROLES';
