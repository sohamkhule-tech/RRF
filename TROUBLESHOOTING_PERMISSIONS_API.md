# 🔍 Troubleshooting "Failed to Load Permissions" 

## Quick Diagnosis Checklist

Run through these steps in order:

### ✅ Step 1: Check Backend is Running

```bash
# Backend should be running on port 4000
curl http://localhost:4000

# Or check in browser - should see some response (not error page)
```

**If backend is NOT running:**
```bash
cd rrf-portal-backend
npm install
npm run start:dev
```

---

### ✅ Step 2: Check Frontend Environment

```bash
# Check .env.local file (or create it)
cd rrf-portal-nextjs

# Should contain:
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

**Then restart frontend:**
```bash
npm run dev
```

---

### ✅ Step 3: Test API Endpoint Manually

**Using curl:**
```bash
# First, login to get token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin","password":"your_password"}'

# Copy the token from response, then test permissions endpoint
curl http://localhost:4000/permissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Using Browser DevTools:**
1. Open http://localhost:3000/admin/roles
2. Open DevTools (F12) → Console tab
3. Click "Permissions" button on any role
4. Look for errors in Console
5. Check Network tab → Look for failed requests

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "permissionName": "Create Users",
      "permissionCode": "CREATE",
      "module": {
        "moduleCode": "USERS",
        "moduleName": "User Management"
      }
    }
  ]
}
```

---

### ✅ Step 4: Check Database

Run the diagnostic script:

```bash
psql -U postgres -d rrf_portal -f debug-permissions-api.sql
```

**Critical checks:**

1. **Do permissions exist?**
   ```sql
   SELECT COUNT(*) FROM permissions;
   -- Should be > 0
   ```

2. **Do modules exist?**
   ```sql
   SELECT COUNT(*) FROM modules;
   -- Should be > 0
   ```

3. **Does ROLES.UPDATE permission exist?**
   ```sql
   SELECT * FROM permissions p
   JOIN modules m ON p.module_id = m.id
   WHERE m.module_code = 'ROLES' AND p.permission_code = 'UPDATE';
   -- Should return 1 row
   ```

4. **Does ADMIN have ROLES.UPDATE?**
   ```sql
   SELECT r.role_name, CONCAT(m.module_code, '.', p.permission_code)
   FROM role_permissions rp
   JOIN roles r ON rp.role_id = r.id
   JOIN permissions p ON rp.permission_id = p.id
   JOIN modules m ON p.module_id = m.id
   WHERE r.role_code = 'ADMIN' AND m.module_code = 'ROLES';
   -- Should show ADMIN has ROLES.READ and ROLES.UPDATE
   ```

---

### ✅ Step 5: Common Errors & Solutions

#### Error: "Cannot connect to backend"

**Cause:** Backend not running or wrong port

**Solution:**
```bash
# Check if backend is running
netstat -ano | findstr :4000

# Start backend
cd rrf-portal-backend
npm run start:dev
```

---

#### Error: "403 Forbidden"

**Cause:** ADMIN role missing ROLES.UPDATE permission

**Solution:**
```sql
-- Run setup-roles-permissions.sql
\i setup-roles-permissions.sql

-- OR manually add permission:
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'ADMIN'),
  p.id,
  CURRENT_TIMESTAMP
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES' 
  AND p.permission_code IN ('READ', 'UPDATE')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN')
      AND rp.permission_id = p.id
  );
```

---

#### Error: "401 Unauthorized"

**Cause:** Session expired or invalid token

**Solution:**
- Logout and login again
- Clear browser localStorage
- Check if JWT token is valid

---

#### Error: Empty permissions list (no error, just empty)

**Cause:** Permissions exist but have inactive modules or are inactive themselves

**Solution:**
```sql
-- Check for inactive permissions
SELECT p.id, p.permission_name, p.is_active 
FROM permissions p
WHERE p.is_active = false;

-- Activate all permissions
UPDATE permissions SET is_active = true;

-- Check for inactive modules
SELECT m.id, m.module_name, m.is_active
FROM modules m
WHERE m.is_active = false;

-- Activate all modules
UPDATE modules SET is_active = true;
```

---

#### Error: "Permissions with NULL modules"

**Cause:** Some permissions don't have module_id

**Solution:**
```sql
-- Find orphaned permissions
SELECT p.id, p.permission_name, p.module_id
FROM permissions p
LEFT JOIN modules m ON p.module_id = m.id
WHERE m.id IS NULL;

-- These won't appear in API response - need to assign to a module
```

---

### ✅ Step 6: Enable Debug Logging

The code has been updated with console.log statements. Check browser console:

1. Open DevTools → Console
2. Click "Permissions" on any role
3. Look for logs starting with:
   - `📋 Opening permissions modal...`
   - `🌐 API Base URL:...`
   - `✅ All permissions response:...`
   - `❌ Failed to load permissions:...` (if error)

Check backend logs:
```bash
# In backend terminal, you should see requests coming in
# Look for:
# [Nest] Info  - GET /permissions
# [Nest] Error - (if any errors)
```

---

### ✅ Step 7: Temporarily Disable Permission Guard (Debug Only)

**⚠️ FOR TESTING ONLY - Remove after debugging**

Edit `rrf-portal-backend/src/permissions/permissions.controller.ts`:

```typescript
@Controller('permissions')
@UseGuards(JwtAuthGuard) // Remove PermissionGuard temporarily
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  // @RequirePermission('ROLES.UPDATE') // Comment this out
  @Get()
  async findAll() {
    const permissions = await this.permissionsService.findAllWithModules();
    return {
      success: true,
      data: permissions,
    };
  }
}
```

**If this fixes it:** The problem is permissions (ROLES.UPDATE not assigned)

**If still broken:** The problem is database, CORS, or service logic

**Remember to re-enable guards after testing!**

---

### ✅ Step 8: Verify CORS Settings

Check `rrf-portal-backend/src/main.ts`:

```typescript
app.enableCors({
  origin: ['http://localhost:3000'], // Frontend URL
  credentials: true,
});
```

Should allow requests from localhost:3000 (default Next.js port).

---

### ✅ Step 9: Test with Postman

1. **Login:**
   - POST `http://localhost:4000/auth/login`
   - Body: `{ "userId": "admin", "password": "yourpassword" }`
   - Copy `access_token` from response

2. **Get Permissions:**
   - GET `http://localhost:4000/permissions`
   - Headers: `Authorization: Bearer <your_token>`

**Expected:** JSON response with permissions array

**If 403:** Permission issue (ADMIN needs ROLES.UPDATE)

**If 500:** Backend error (check logs)

**If connection error:** Backend not running

---

## 🎯 Most Common Solutions

### Solution 1: Database Not Set Up
```bash
cd rrf-portal-backend
psql -U postgres -d rrf_portal -f seed.sql
psql -U postgres -d rrf_portal -f setup-roles-permissions.sql
```

### Solution 2: Backend Not Running
```bash
cd rrf-portal-backend
npm run start:dev
```

### Solution 3: Missing Environment Variable
```bash
cd rrf-portal-nextjs
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

### Solution 4: Permission Not Assigned
```sql
-- Add ROLES.UPDATE to ADMIN
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
  (SELECT id FROM roles WHERE role_code = 'ADMIN'),
  p.id,
  CURRENT_TIMESTAMP
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE m.module_code = 'ROLES' AND p.permission_code = 'UPDATE';
```

---

## 🔬 Advanced Debugging

### Check Network Request Details

In Browser DevTools → Network tab:

1. Click "Permissions" button
2. Find the request to `/permissions`
3. Click on it
4. Check:
   - **Headers** → Request URL (should be http://localhost:4000/permissions)
   - **Headers** → Authorization header (should have Bearer token)
   - **Response** → Response body (check for error message)
   - **Status** → HTTP status code (200, 403, 500, etc.)

### Check Backend Logs

Backend console should show:
```
[Nest] 12345  - 04/13/2026, 10:30:15 AM     LOG [RouterExplorer] Mapped {/permissions, GET} route
```

When you make a request:
```
[Nest] 12345  - 04/13/2026, 10:30:20 AM     LOG [PermissionsController] GET /permissions
```

If you see errors in backend logs, that's your problem.

---

## ✅ Success Indicators

When working correctly, you should see:

1. ✅ No error toast
2. ✅ Console logs show successful API calls
3. ✅ Modal opens with loading spinner
4. ✅ Permissions grouped by module appear
5. ✅ Checkboxes are functional
6. ✅ Network tab shows 200 OK status

---

## 📞 Still Not Working?

1. Share the **exact error message** from browser console
2. Share the **HTTP status code** from Network tab
3. Share the **backend log output**
4. Run `debug-permissions-api.sql` and share results
5. Share your **environment** (OS, Node version, database version)
