# Roles Menu Setup Guide

## ✅ What Was Fixed

### 1. **Added "Roles" Menu to Admin Sidebar**
   - Location: `rrf-portal-nextjs/components/admin/AdminSidebar.jsx`
   - Icon: KeyOutlined (🔑)
   - Position: Between "Users" and "RRF Management"
   - Route: `/admin/roles`

### 2. **Added ROLES Permissions Constants**
   - Location: `rrf-portal-nextjs/utils/permissions.js`
   - Added:
     ```javascript
     ROLES: {
       READ: 'ROLES.READ',
       UPDATE: 'ROLES.UPDATE',
     }
     ```

### 3. **Created Database Setup Script**
   - Location: `setup-roles-permissions.sql`
   - Adds ROLES module and permissions to database
   - Assigns permissions to ADMIN role

---

## 🚀 Quick Start

### Step 1: Run Database Setup Script

```bash
# Connect to your PostgreSQL database
psql -U your_username -d rrf_portal

# Run the setup script
\i setup-roles-permissions.sql
```

Or manually run the SQL script using your preferred database tool (pgAdmin, DBeaver, etc.)

### Step 2: Verify Database Setup

```sql
-- Check if ROLES permissions exist
SELECT 
  m.module_code,
  p.permission_code,
  CONCAT(m.module_code, '.', p.permission_code) as full_permission_code
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES';

-- Expected output:
-- module_code | permission_code | full_permission_code
-- ROLES       | READ            | ROLES.READ
-- ROLES       | UPDATE          | ROLES.UPDATE
```

### Step 3: Verify ADMIN Has Permissions

```sql
-- Check ADMIN role has ROLES permissions
SELECT 
  r.role_name,
  CONCAT(m.module_code, '.', p.permission_code) as permission
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE r.role_code = 'ADMIN' AND m.module_code = 'ROLES';

-- Expected output:
-- role_name | permission
-- Admin     | ROLES.READ
-- Admin     | ROLES.UPDATE
```

### Step 4: Restart Frontend & Backend

```bash
# Backend
cd rrf-portal-backend
npm run start:dev

# Frontend (in another terminal)
cd rrf-portal-nextjs
npm run dev
```

### Step 5: Test the Feature

1. **Login** as an admin user
2. **Navigate** to the admin panel
3. **Look for "Roles"** in the sidebar (should appear between "Users" and "RRF Management")
4. **Click "Roles"** → Should open the Roles Management page
5. **Click "Permissions"** button on any role → Modal should open with permission checkboxes

---

## 🔍 Troubleshooting

### Issue: "Roles" Menu Not Visible

**Cause 1: Browser Cache**
- Solution: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Or clear browser cache and reload

**Cause 2: Frontend Not Rebuilt**
- Solution: 
  ```bash
  cd rrf-portal-nextjs
  rm -rf .next
  npm run dev
  ```

**Cause 3: Wrong Sidebar Component**
- Check: Admin layout should use `AdminSidebar`, not `PermissionBasedSidebar`
- Verify in: `rrf-portal-nextjs/app/admin/layout.jsx`

---

### Issue: 403 Forbidden on API Calls

**Cause: Missing Database Permissions**

1. **Check if permissions exist:**
   ```sql
   SELECT * FROM permissions p
   JOIN modules m ON p.module_id = m.id
   WHERE m.module_code = 'ROLES';
   ```

2. **Check if ADMIN has permissions:**
   ```sql
   SELECT * FROM role_permissions rp
   WHERE rp.role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN')
     AND rp.permission_id IN (
       SELECT p.id FROM permissions p
       JOIN modules m ON p.module_id = m.id
       WHERE m.module_code = 'ROLES'
     );
   ```

3. **If missing, run the setup script:** `setup-roles-permissions.sql`

---

### Issue: Empty Permissions List in Modal

**Cause 1: Modules Table Empty**
- Solution: Ensure `modules` table is populated
- Run:
  ```sql
  SELECT * FROM modules WHERE is_active = true;
  ```

**Cause 2: Permissions Have No Module**
- Solution: Check for orphaned permissions
- Run:
  ```sql
  SELECT p.id, p.permission_name 
  FROM permissions p
  LEFT JOIN modules m ON p.module_id = m.id
  WHERE m.id IS NULL;
  ```

**Cause 3: Backend Not Running**
- Solution: Start backend server
  ```bash
  cd rrf-portal-backend
  npm run start:dev
  ```

---

### Issue: Save Button Not Working

**Cause 1: DTO Validation Failed**
- Check browser console for network errors
- Verify request body format:
  ```json
  {
    "permissionIds": [1, 2, 3]
  }
  ```

**Cause 2: Transaction Rollback**
- Check backend logs for errors
- Verify all permission IDs exist in database

**Cause 3: UNIQUE Constraint Violation**
- Ensure constraint exists:
  ```sql
  ALTER TABLE role_permissions 
  ADD CONSTRAINT unique_role_permission 
  UNIQUE (role_id, permission_id);
  ```

---

## 📊 Verify Complete Setup

Run this comprehensive verification query:

```sql
-- Complete Setup Verification
SELECT 
  'Modules' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FAIL' END as status
FROM modules WHERE module_code = 'ROLES'

UNION ALL

SELECT 
  'Permissions',
  COUNT(*),
  CASE WHEN COUNT(*) >= 2 THEN '✅ OK' ELSE '❌ FAIL' END
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES'

UNION ALL

SELECT 
  'Admin Permissions',
  COUNT(*),
  CASE WHEN COUNT(*) >= 2 THEN '✅ OK' ELSE '❌ FAIL' END
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE r.role_code = 'ADMIN' AND m.module_code = 'ROLES'

UNION ALL

SELECT 
  'UNIQUE Constraint',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FAIL' END
FROM information_schema.table_constraints
WHERE table_name = 'role_permissions' 
  AND constraint_type = 'UNIQUE';
```

**Expected Output:**
```
check_type         | count | status
Modules            | 1     | ✅ OK
Permissions        | 2     | ✅ OK
Admin Permissions  | 2     | ✅ OK
UNIQUE Constraint  | 1     | ✅ OK
```

If all show ✅ OK, your setup is complete!

---

## 🎯 Files Modified

### Backend (Already Implemented)
- ✅ `rrf-portal-backend/src/permissions/permissions.controller.ts` (created)
- ✅ `rrf-portal-backend/src/permissions/permissions.service.ts` (modified)
- ✅ `rrf-portal-backend/src/role-permissions/role-permissions.controller.ts` (created)
- ✅ `rrf-portal-backend/src/role-permissions/role-permissions.service.ts` (created)
- ✅ `rrf-portal-backend/src/role-permissions/dto/update-role-permissions.dto.ts` (created)

### Frontend (Just Modified)
- ✅ `rrf-portal-nextjs/components/admin/AdminSidebar.jsx` (added Roles menu)
- ✅ `rrf-portal-nextjs/utils/permissions.js` (added ROLES constants)
- ✅ `rrf-portal-nextjs/app/admin/roles/page.jsx` (already created)
- ✅ `rrf-portal-nextjs/lib/api/rolesApi.js` (already created)
- ✅ `rrf-portal-nextjs/lib/api/permissionsApi.js` (already created)

### Database Setup
- ✅ `setup-roles-permissions.sql` (created)

---

## 🎉 Success Indicators

When everything works correctly, you should see:

1. ✅ "Roles" menu visible in admin sidebar with key icon (🔑)
2. ✅ Clicking "Roles" loads the page without errors
3. ✅ Table displays all roles with "Permissions" button
4. ✅ Clicking "Permissions" opens modal with checkboxes
5. ✅ Checkboxes are pre-selected based on current role permissions
6. ✅ "Select All" checkbox works with indeterminate state
7. ✅ Save button is disabled when no changes
8. ✅ Saving updates database successfully
9. ✅ Success toast appears after save
10. ✅ Reopening modal shows updated permissions

---

## 📞 Support

If you still have issues after following this guide:

1. **Check browser console** for JavaScript errors
2. **Check backend logs** for API errors
3. **Verify database connection** is working
4. **Ensure all dependencies** are installed:
   ```bash
   cd rrf-portal-backend && npm install
   cd rrf-portal-nextjs && npm install
   ```
5. **Check environment variables** are correctly set

---

## 🔄 Next Steps

Once the Roles menu is visible and working:

1. **Assign ROLES permissions** to other roles if needed
2. **Test permission enforcement** by logging in as different roles
3. **Document** which roles should have role management access
4. **Consider adding audit logging** for permission changes (future enhancement)
