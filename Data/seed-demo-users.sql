-- ================================================================
-- Demo Users Seed Script
-- Passwords are bcrypt hashed (10 salt rounds)
-- hm123, pmo123, app123, hr123
-- ================================================================

-- Step 1: Insert roles (skip if already exist)
INSERT INTO roles (role_name, role_code, description, priority, is_active)
VALUES
  ('Hiring Manager',      'HM',       'Creates and manages RRF requests',              2, true),
  ('PMO',                 'PMO',      'Project Management Office reviewer',            3, true),
  ('Approver',            'APPROVER', 'Final approver for RRF requests',               4, true),
  ('Talent Acquisition',  'TA',       'HR / Talent Acquisition team',                  5, true)
ON CONFLICT (role_code) DO NOTHING;

-- Step 2: Insert demo users
-- hm001 / hm123   → bcrypt hash of 'hm123'
-- pmo001 / pmo123 → bcrypt hash of 'pmo123'
-- app001 / app123 → bcrypt hash of 'app123'
-- hr001  / hr123  → bcrypt hash of 'hr123'

INSERT INTO users (user_id, email, password_hash, full_name, department, is_active, role_id)
VALUES
  (
    'hm001',
    'hm001@rrfportal.com',
    '$2b$10$fEq3IqTX4Zb483yjIoWlDO5DgctsbnkbzrRTWKtOqqiLocVyxiUpi',
    'John Doe',
    'Engineering',
    true,
    (SELECT id FROM roles WHERE role_code = 'HM')
  ),
  (
    'pmo001',
    'pmo001@rrfportal.com',
    '$2b$10$m5ygnqVe3dmE/iOYXhsb1.nCXPGcSCUHZBnJjz776KtcOaMJ1TMU2',
    'Priya Sharma',
    'PMO',
    true,
    (SELECT id FROM roles WHERE role_code = 'PMO')
  ),
  (
    'app001',
    'app001@rrfportal.com',
    '$2b$10$n5UyXyzKcDF9ERdQkfobVuWahO1vt67sDwOr.hGgcCAVsCKdJJGHW',
    'Amit Verma',
    'Management',
    true,
    (SELECT id FROM roles WHERE role_code = 'APPROVER')
  ),
  (
    'hr001',
    'hr001@rrfportal.com',
    '$2b$10$9XhZaf/i5gkZWxh4CBwiJ.TJ.rBWJ3iUB8ukfBEwM/Zk5WQzDkBkq',
    'Sara Khan',
    'Human Resources',
    true,
    (SELECT id FROM roles WHERE role_code = 'TA')
  )
ON CONFLICT (user_id) DO NOTHING;
