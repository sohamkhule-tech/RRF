-- ================================================================
-- DEBUG: Permissions API Troubleshooting Script
-- ================================================================
-- Run these queries to diagnose "Failed to load permissions" issue
-- ================================================================

-- ================================================================
-- 1. CHECK IF PERMISSIONS TABLE HAS DATA
-- ================================================================
SELECT 
  COUNT(*) as total_permissions,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_permissions,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_permissions
FROM permissions;

-- Expected: Should have multiple permissions
-- If count is 0, run seed.sql to populate database

-- ================================================================
-- 2. CHECK IF MODULES TABLE HAS DATA
-- ================================================================
SELECT 
  id,
  module_name,
  module_code,
  is_active
FROM modules
ORDER BY display_order;

-- Expected: Should see modules like RRF, USERS, ROLES, etc.
-- If empty, run seed.sql to populate database

-- ================================================================
-- 3. CHECK PERMISSIONS WITH MODULE RELATIONSHIPS
-- ================================================================
SELECT 
  p.id,
  p.permission_name,
  p.permission_code,
  m.module_code,
  m.module_name,
  CONCAT(m.module_code, '.', p.permission_code) as full_permission_code,
  p.is_active as permission_active,
  m.is_active as module_active
FROM permissions p
LEFT JOIN modules m ON p.module_id = m.id
ORDER BY m.module_code, p.permission_code;

-- Expected: All permissions should have a valid module
-- If module is NULL, that's a problem - permission missing module_id

-- ================================================================
-- 4. CHECK FOR ORPHANED PERMISSIONS (No Module)
-- ================================================================
SELECT 
  p.id,
  p.permission_name,
  p.permission_code,
  p.module_id
FROM permissions p
LEFT JOIN modules m ON p.module_id = m.id
WHERE m.id IS NULL;

-- Expected: Empty result (no orphaned permissions)
-- If any results, those permissions won't show in API

-- ================================================================
-- 5. CHECK IF ROLES.UPDATE PERMISSION EXISTS
-- ================================================================
SELECT 
  p.id,
  p.permission_name,
  CONCAT(m.module_code, '.', p.permission_code) as full_code,
  m.module_code,
  p.permission_code
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES' 
  AND p.permission_code = 'UPDATE';

-- Expected: Should return 1 row with ROLES.UPDATE
-- If empty, run setup-roles-permissions.sql

-- ================================================================
-- 6. CHECK IF ADMIN ROLE HAS ROLES.UPDATE PERMISSION
-- ================================================================
SELECT 
  r.role_name,
  r.role_code,
  CONCAT(m.module_code, '.', p.permission_code) as permission_code,
  rp.granted_at
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE r.role_code = 'ADMIN'
  AND m.module_code = 'ROLES'
  AND p.permission_code = 'UPDATE';

-- Expected: Should return 1 row showing ADMIN has ROLES.UPDATE
-- If empty, ADMIN cannot access /permissions endpoint (403 error)

-- ================================================================
-- 7. CHECK ALL PERMISSIONS ADMIN HAS
-- ================================================================
SELECT 
  CONCAT(m.module_code, '.', p.permission_code) as permission
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE r.role_code = 'ADMIN'
ORDER BY m.module_code, p.permission_code;

-- This shows all permissions the ADMIN role has
-- Should include ROLES.UPDATE

-- ================================================================
-- 8. SIMULATE BACKEND API QUERY
-- ================================================================
-- This is what the backend API runs
SELECT 
  p.id,
  p.permission_name,
  p.permission_code,
  p.description,
  m.id as module_id,
  m.module_code,
  m.module_name
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE p.is_active = true 
  AND m.is_active = true
ORDER BY m.display_order ASC, p.permission_name ASC;

-- Expected: Should return multiple rows with all active permissions
-- If empty, check:
--   1. Are permissions marked is_active = true?
--   2. Are modules marked is_active = true?

-- ================================================================
-- 9. CHECK FOR INACTIVE PERMISSIONS/MODULES
-- ================================================================
SELECT 
  'Inactive Permissions' as issue_type,
  COUNT(*) as count
FROM permissions
WHERE is_active = false

UNION ALL

SELECT 
  'Inactive Modules',
  COUNT(*)
FROM modules
WHERE is_active = false

UNION ALL

SELECT 
  'Permissions with Inactive Modules',
  COUNT(*)
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE p.is_active = true AND m.is_active = false;

-- If "Permissions with Inactive Modules" > 0, those won't appear in API

-- ================================================================
-- 10. TEST USER'S ACTUAL PERMISSIONS
-- ================================================================
-- Replace <YOUR_USER_ID> with your actual user ID
-- Find your user ID: SELECT id, user_id, email FROM users WHERE email = 'your@email.com';

SELECT 
  u.id as user_id,
  u.user_id as username,
  u.email,
  r.role_name,
  r.role_code,
  CONCAT(m.module_code, '.', p.permission_code) as permission
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE u.id = 1  -- Replace with your user ID
ORDER BY m.module_code, p.permission_code;

-- This shows what permissions YOU have when logged in
-- Must include ROLES.UPDATE to access /permissions endpoint

-- ================================================================
-- QUICK FIXES
-- ================================================================

-- Fix 1: If ROLES module/permissions missing, create them:
-- Run: setup-roles-permissions.sql

-- Fix 2: If ADMIN missing ROLES.UPDATE, add it:
/*
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'ADMIN'),
  p.id,
  CURRENT_TIMESTAMP
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES' AND p.permission_code = 'UPDATE'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN')
      AND rp.permission_id = p.id
  );
*/

-- Fix 3: Activate all permissions and modules:
/*
UPDATE permissions SET is_active = true WHERE is_active = false;
UPDATE modules SET is_active = true WHERE is_active = false;
*/

-- Fix 4: Check for duplicate role_permissions (shouldn't exist with UNIQUE constraint):
/*
SELECT role_id, permission_id, COUNT(*) 
FROM role_permissions 
GROUP BY role_id, permission_id 
HAVING COUNT(*) > 1;
*/

-- ================================================================
-- EXPECTED API RESPONSE FORMAT
-- ================================================================
-- When you GET /permissions, backend should return:
/*
{
  "success": true,
  "data": [
    {
      "id": 1,
      "permissionName": "Create Users",
      "permissionCode": "CREATE",
      "description": "...",
      "module": {
        "id": 1,
        "moduleCode": "USERS",
        "moduleName": "User Management"
      }
    },
    ...
  ]
}
*/
