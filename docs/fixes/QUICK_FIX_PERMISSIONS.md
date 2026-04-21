# 🚀 Quick Fix: "Failed to Load Permissions" 

## 🎯 Most Likely Cause & Fix

**Problem:** ADMIN role is missing the `ROLES.UPDATE` permission.

**Solution:** Run the setup script.

```bash
# In your PostgreSQL database
cd rrf-portal-backend
psql -U postgres -d rrf_portal -f ../setup-roles-permissions.sql
```

Then restart your frontend:
```bash
cd rrf-portal-nextjs
npm run dev
```

**Test:** Click "Permissions" button on any role. It should now work!

---

## 📋 Step-by-Step Diagnosis

### 1️⃣ Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Click "Permissions" on any role
4. Look for log messages:

**✅ Good signs:**
```
📋 Opening permissions modal for role: {...}
🌐 API Base URL: http://localhost:4000
✅ All permissions response: {...}
✅ Role permissions response: {...}
✅ Modal loaded successfully
```

**❌ Bad signs:**
```
❌ Failed to load permissions: Cannot connect to backend
❌ Failed to load permissions: Access denied
❌ Failed to load permissions: Forbidden
```

---

### 2️⃣ Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Click "Permissions" on any role
4. Look for request to `/permissions`

**Check the status:**

| Status | Meaning | Solution |
|--------|---------|----------|
| 200 ✅ | Success | Working! |
| 403 ❌ | Forbidden | Run `setup-roles-permissions.sql` |
| 401 ❌ | Unauthorized | Logout and login again |
| 404 ❌ | Not Found | Backend API not registered |
| 500 ❌ | Server Error | Check backend logs |
| Failed | Cannot connect | Backend not running |

---

### 3️⃣ Common Error Messages & Fixes

#### "Cannot connect to backend. Ensure backend is running on port 4000."

**Cause:** Backend server is not running

**Fix:**
```bash
cd rrf-portal-backend
npm install  # First time only
npm run start:dev
```

**Confirm:** Visit http://localhost:4000 - should not show "site can't be reached"

---

#### "Access denied. Ensure ROLES.UPDATE permission is assigned to ADMIN role."

**Cause:** ADMIN role missing `ROLES.UPDATE` permission

**Fix:**
```bash
# Run the setup script
psql -U postgres -d rrf_portal -f setup-roles-permissions.sql
```

**Verify:**
```sql
-- Check ADMIN has ROLES permissions
SELECT r.role_name, CONCAT(m.module_code, '.', p.permission_code)
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE r.role_code = 'ADMIN' AND m.module_code = 'ROLES';

-- Should show:
-- Admin  |  ROLES.READ
-- Admin  |  ROLES.UPDATE
```

---

#### "Session expired. Please login again."

**Cause:** JWT token expired or invalid

**Fix:**
1. Logout
2. Login again
3. Try clicking "Permissions" again

---

#### Empty modal (no error, just blank/loading forever)

**Cause:** API returns empty array or malformed data

**Fix:**
```sql
-- Check if permissions exist
SELECT COUNT(*) FROM permissions WHERE is_active = true;

-- Should be > 0
-- If 0, run seed.sql to populate database
```

---

### 4️⃣ Test API Manually

**Quick test using the test script:**

```bash
# Navigate to project root
cd rrf-portal-backend/..

# Test with login
node test-permissions-api.js login admin your_password

# Should show:
# ✅ Login successful
# ✅ API Response: {...}
# 📋 Total permissions: XX
```

**If test script fails, that confirms the issue is backend/database, not frontend.**

---

### 5️⃣ Verify Database Setup

Run diagnostic queries:

```bash
psql -U postgres -d rrf_portal -f debug-permissions-api.sql
```

**Key checks:**

1. **Modules exist:**
   ```sql
   SELECT COUNT(*) FROM modules WHERE is_active = true;
   -- Should be > 0
   ```

2. **Permissions exist:**
   ```sql
   SELECT COUNT(*) FROM permissions WHERE is_active = true;
   -- Should be > 0
   ```

3. **ROLES permissions exist:**
   ```sql
   SELECT * FROM permissions p
   JOIN modules m ON p.module_id = m.id
   WHERE m.module_code = 'ROLES';
   -- Should return ROLES.READ and ROLES.UPDATE
   ```

4. **ADMIN has ROLES.UPDATE:**
   ```sql
   SELECT COUNT(*) FROM role_permissions rp
   WHERE rp.role_id = (SELECT id FROM roles WHERE role_code = 'ADMIN')
     AND rp.permission_id IN (
       SELECT p.id FROM permissions p
       JOIN modules m ON p.module_id = m.id
       WHERE m.module_code = 'ROLES'
     );
   -- Should be 2 (READ and UPDATE)
   ```

---

## 🛠️ Complete Setup Checklist

If starting fresh or nothing works, run through this:

### ✅ Backend Setup

```bash
cd rrf-portal-backend

# 1. Install dependencies
npm install

# 2. Set up environment
cp ../.env.example .env
# Edit .env with your database credentials

# 3. Create database (if needed)
createdb -U postgres rrf_portal

# 4. Run migrations/seeds
psql -U postgres -d rrf_portal -f seed.sql
psql -U postgres -d rrf_portal -f ../setup-roles-permissions.sql

# 5. Start backend
npm run start:dev

# Should see:
# 🚀 RRF Portal Backend API running on http://localhost:4000
```

---

### ✅ Frontend Setup

```bash
cd rrf-portal-nextjs

# 1. Install dependencies
npm install

# 2. Set up environment
cp ../.env.example .env.local

# 3. Start frontend
npm run dev

# Should see:
# ✓ Ready in 2.5s
# ○ Local:   http://localhost:3000
```

---

### ✅ Test the Feature

1. **Login:** http://localhost:3000/login
   - Use admin credentials

2. **Navigate:** http://localhost:3000/admin/roles
   - Should see roles table

3. **Click "Permissions"** on any role
   - Modal should open
   - Permissions should load (grouped by module)
   - No error toast

4. **Select/deselect** permissions
   - "Select All" checkbox should work
   - Save button should enable when changes made

5. **Click Save**
   - Should show success toast
   - Modal should close
   - Reopen modal - changes should persist

---

## 🔍 Advanced Debugging

### Enable Verbose Logging

The code now includes detailed console logs. Check:

**Browser Console:**
- `📋 Opening permissions modal...`
- `🌐 API Base URL: ...`
- `[permissionsApi] Fetching...`
- `[rolesApi] Fetching...`

**Backend Logs:**
```
[Nest] LOG [RouterExplorer] Mapped {/permissions, GET}
[Nest] LOG [PermissionsController] GET /permissions
```

---

### Test Individual Components

**1. Test backend directly:**
```bash
curl http://localhost:4000/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**2. Test from browser console:**
```javascript
// On any page, run:
fetch('http://localhost:4000/permissions', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log)
```

**3. Test database directly:**
```sql
-- Simulate backend query
SELECT 
  p.id, p.permission_name, p.permission_code,
  m.module_code, m.module_name
FROM permissions p
JOIN modules m ON p.module_id = m.id
WHERE p.is_active = true AND m.is_active = true;
```

---

## ✅ Success Indicators

When everything works:

- ✅ No error toast appears
- ✅ Console shows: `✅ Modal loaded successfully`
- ✅ Network tab shows: Status 200 for `/permissions`
- ✅ Modal displays grouped permissions with checkboxes
- ✅ "Select All" checkbox works
- ✅ Save button is disabled until changes made
- ✅ Save updates database successfully
- ✅ Reopening modal shows updated permissions

---

## 📞 Still Having Issues?

1. **Share console output:** Copy everything from browser console
2. **Share network response:** In Network tab, click the request, copy Response
3. **Share backend logs:** Copy the terminal output from backend
4. **Run diagnostic script:** 
   ```bash
   psql -d rrf_portal -f debug-permissions-api.sql > diagnosis.txt
   ```
   Share the output

5. **Run test script:**
   ```bash
   node test-permissions-api.js login admin password > test-results.txt
   ```
   Share the output

---

## 📚 Related Files

- **Troubleshooting Guide:** `TROUBLESHOOTING_PERMISSIONS_API.md`
- **Database Diagnostic:** `debug-permissions-api.sql`
- **Setup Script:** `setup-roles-permissions.sql`
- **Test Script:** `test-permissions-api.js`
- **Environment Example:** `.env.example`

---

**Most common fix:** Run `setup-roles-permissions.sql` 🎯
