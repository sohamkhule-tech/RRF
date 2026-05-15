-- ============================================================
-- Verify Admin Permissions for RRF Actions
-- ============================================================

-- Check if ADMIN role exists
SELECT 
  r.id AS role_id,
  r."roleName" AS role_name,
  r."isActive" AS is_active
FROM roles r
WHERE UPPER(r."roleName") = 'ADMIN';

-- ============================================================
-- Check which permissions ADMIN role has
-- ============================================================
SELECT 
  r."roleName" AS role,
  p.code AS permission_code,
  p.description AS permission_description,
  m.name AS module_name
FROM role_permissions rp
INNER JOIN roles r ON r.id = rp.role_id
INNER JOIN permissions p ON p.id = rp.permission_id
LEFT JOIN modules m ON m.id = p.module_id
WHERE UPPER(r."roleName") = 'ADMIN'
ORDER BY m.name, p.code;

-- ============================================================
-- Check specifically for action permissions needed
-- ============================================================
SELECT 
  p.code AS permission_code,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM role_permissions rp
      INNER JOIN roles r ON r.id = rp.role_id
      WHERE r."roleName" = 'ADMIN' AND rp.permission_id = p.id
    ) THEN '✓ GRANTED'
    ELSE '✗ MISSING'
  END AS admin_has_permission
FROM permissions p
WHERE p.code IN (
  'APPROVALS.APPROVE',
  'APPROVALS.REJECT',
  'RRF.UPDATE',
  'RRF.VIEW',
  'ROLES.UPDATE'
)
ORDER BY p.code;

-- ============================================================
-- If any permissions are missing, add them with this script
-- ============================================================
-- UNCOMMENT AND RUN THESE IF PERMISSIONS ARE MISSING:

-- INSERT INTO role_permissions (role_id, permission_id, "createdAt", "updatedAt")
-- SELECT 
--   r.id AS role_id,
--   p.id AS permission_id,
--   NOW() AS "createdAt",
--   NOW() AS "updatedAt"
-- FROM roles r
-- CROSS JOIN permissions p
-- WHERE UPPER(r."roleName") = 'ADMIN'
--   AND p.code IN ('APPROVALS.APPROVE', 'APPROVALS.REJECT', 'RRF.UPDATE', 'RRF.VIEW', 'ROLES.UPDATE')
--   AND NOT EXISTS (
--     SELECT 1 FROM role_permissions rp2
--     WHERE rp2.role_id = r.id AND rp2.permission_id = p.id
--   );

-- ============================================================
-- After adding permissions, verify again:
-- ============================================================
-- SELECT COUNT(*) AS total_admin_permissions
-- FROM role_permissions rp
-- INNER JOIN roles r ON r.id = rp.role_id
-- WHERE UPPER(r."roleName") = 'ADMIN';
