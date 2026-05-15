-- ============================================================
-- Verification Query: APPROVALS.ON_HOLD Permission
-- ============================================================
-- Run this to verify the permission exists and is assigned correctly

-- 1. Check permission exists
SELECT 
  p.id,
  CONCAT(m.module_code, '.', p.permission_code) AS full_permission_code,
  p.permission_name,
  p.description,
  m.module_name,
  p.is_active
FROM permissions p
INNER JOIN modules m ON m.id = p.module_id
WHERE m.module_code = 'APPROVALS' 
  AND p.permission_code = 'ON_HOLD';

-- Expected Output:
-- full_permission_code: APPROVALS.ON_HOLD
-- permission_name: On Hold
-- description: Put RRF on hold with reason
-- is_active: true

-- 2. Check role assignments
SELECT 
  r.role_name,
  r.role_code,
  CONCAT(m.module_code, '.', p.permission_code) AS permission,
  p.permission_name,
  rp.created_at AS assigned_at
FROM role_permissions rp
INNER JOIN roles r ON r.id = rp.role_id
INNER JOIN permissions p ON p.id = rp.permission_id
INNER JOIN modules m ON m.id = p.module_id
WHERE m.module_code = 'APPROVALS' 
  AND p.permission_code = 'ON_HOLD'
ORDER BY r.role_name;

-- Expected Output:
-- ADMIN role: APPROVALS.ON_HOLD
-- APPROVER role: APPROVALS.ON_HOLD

-- 3. Check if any users currently have this permission
SELECT 
  u.user_id,
  u.full_name,
  r.role_name,
  CONCAT(m.module_code, '.', p.permission_code) AS permission
FROM users u
INNER JOIN roles r ON r.id = u.role_id
INNER JOIN role_permissions rp ON rp.role_id = r.id
INNER JOIN permissions p ON p.id = rp.permission_id
INNER JOIN modules m ON m.id = p.module_id
WHERE m.module_code = 'APPROVALS' 
  AND p.permission_code = 'ON_HOLD'
  AND u.is_active = true
ORDER BY r.role_name, u.full_name;

-- Expected Output:
-- All active APPROVER and ADMIN users will have APPROVALS.ON_HOLD permission
