-- ============================================================
-- ADMIN ROLE SEED SCRIPT
-- Run this ONCE to create the Admin role, permissions, and user
-- ============================================================

-- 1. Insert ADMIN role (skip if exists)
INSERT INTO roles (role_name, role_code, description, priority, is_active)
VALUES ('Administrator', 'ADMIN', 'Full system administrator with all permissions', 0, true)
ON CONFLICT (role_code) DO NOTHING;

-- 2. Get the ADMIN role ID
DO $$
DECLARE
  admin_role_id INTEGER;
  perm_id INTEGER;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE role_code = 'ADMIN';

  -- 3. Grant ALL active permissions to ADMIN role
  FOR perm_id IN
    SELECT p.id FROM permissions p
    INNER JOIN modules m ON p.module_id = m.id
    WHERE p.is_active = true AND m.is_active = true
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (admin_role_id, perm_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 4. Create default admin user (password: admin123)
  -- bcrypt hash for 'admin123' with 10 salt rounds
  INSERT INTO users (user_id, email, password_hash, full_name, department, is_active, role_id)
  VALUES (
    'admin001',
    'admin@rrfportal.com',
    '$2b$10$GulhWYpP3EOVu74Ri6r2ZOH8d./gXwgjqTCJsR2pYIeZPyszAjx5a',
    'System Administrator',
    'IT Administration',
    true,
    admin_role_id
  )
  ON CONFLICT (user_id) DO NOTHING;

END $$;
