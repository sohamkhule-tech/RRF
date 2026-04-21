# Quick Fix for Admin Dashboard Statistics

## ❌ Problem
Admin dashboard shows 0 for all RRF statistics with error:
```
403 Forbidden: You don't have permission to perform this action. Required: RRF.READ
```

## ✅ Root Cause
ADMIN role is missing RRF.READ permission in the database.

## 🚀 Fix (Choose ONE method)

### Method 1: Direct SQL Fix (FASTEST - 30 seconds)

**Option A: Using Docker Desktop GUI**
1. Open Docker Desktop
2. Click on `rrf-postgres` container
3. Click "Exec" tab (terminal icon)
4. Run these commands:
   ```bash
   psql -U postgres -d rrf_portal
   ```
5. Paste this SQL:
   ```sql
   -- Add RRF.READ permission to ADMIN role
   INSERT INTO role_permissions ("roleId", "permissionId")
   SELECT 
       r.id as role_id,
       p.id as permission_id
   FROM roles r
   CROSS JOIN permissions p
   JOIN modules m ON p."moduleId" = m.id
   WHERE r."roleCode" = 'ADMIN'
   AND m."moduleCode" = 'RRF'
   AND p."permissionCode" = 'READ'
   AND NOT EXISTS (
       SELECT 1 FROM role_permissions rp2
       WHERE rp2."roleId" = r.id AND rp2."permissionId" = p.id
   );
   
   -- Verify
   SELECT 'SUCCESS: Admin now has RRF.READ permission' as result;
   ```
6. Exit with: `\q`

**Option B: Using Command Line (PowerShell as Administrator)**
1. **Right-click PowerShell → Run as Administrator**
2. Navigate to project:
   ```powershell
   cd C:\Users\SohamKhule\Downloads\RRF_2
   ```
3. Run this one command:
   ```powershell
   docker exec -it rrf-postgres psql -U postgres -d rrf_portal -c "INSERT INTO role_permissions (""roleId"", ""permissionId"") SELECT r.id, p.id FROM roles r CROSS JOIN permissions p JOIN modules m ON p.""moduleId"" = m.id WHERE r.""roleCode"" = 'ADMIN' AND m.""moduleCode"" = 'RRF' AND p.""permissionCode"" = 'READ' AND NOT EXISTS (SELECT 1 FROM role_permissions rp2 WHERE rp2.""roleId"" = r.id AND rp2.""permissionId"" = p.id);"
   ```

---

### Method 2: Re-seed Database (CLEAN - 2 minutes)

**Steps:**
1. Open PowerShell (normal, no admin needed)
2. Run:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:4000/seed" -Method POST
   ```
3. Login again:
   ```powershell
   curl -X POST http://localhost:4000/auth/login `
     -H "Content-Type: application/json" `
     -d '{\"userId\":\"admin001\",\"password\":\"admin123\"}'
   ```

**⚠ Note:** Method 2 requires Docker rebuild for seed.service.ts changes to take effect. Use Method 1 instead!

---

### Method 3: Rebuild Backend (PERMANENT - 5 minutes)

**Prerequisites: Run Docker Desktop as Administrator**

1. Stop containers:
   ```powershell
   docker-compose down
   ```

2. Rebuild backend:
   ```powershell
   docker-compose build backend
   ```

3. Start containers:
   ```powershell
   docker-compose up -d
   ```

4. Re-seed database:
   ```powershell
   Start-Sleep -Seconds 15  # Wait for backend to start
   Invoke-WebRequest -Uri "http://localhost:4000/seed" -Method POST
   ```

---

## ✅ Verify the Fix

After applying ANY method above, test the statistics API:

```powershell
# 1. Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"userId":"admin001","password":"admin123"}'

$token = $loginResponse.access_token

# 2. Test statistics
$stats = Invoke-RestMethod -Uri "http://localhost:4000/rrf/statistics?all=true" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }

# 3. Display results
$stats.data | ConvertTo-Json

# Expected output:
# {
#   "total": X,
#   "byStatus": {
#     "draft": X,
#     "pending": X,
#     "approved": X,
#     ...
#   }
# }
```

✅ If you see numbers (not zeros), **it's working!**

---

## 🎯 Test in Browser

1. Open http://localhost:3000
2. Login with:
   - **User ID:** admin001
   - **Password:** admin123
3. Admin dashboard should now show real statistics!

---

## 📝 What Changed

**File Modified:** `rrf-portal-backend/src/database/seed.service.ts`

**Change:**
```typescript
// BEFORE (Line 403)
ADMIN: [
  // Admin: Full access to Users, Settings, Dashboard, Reports (NO business operations)
  'DASHBOARD.READ',
  'USERS.CREATE',
  // ... (no RRF.READ)
],

// AFTER
ADMIN: [
  // Admin: Full access to Users, Settings, Dashboard, Reports + Read RRF for statistics
  'DASHBOARD.READ',
  'RRF.READ',  // ← ADDED THIS LINE
  'USERS.CREATE',
  // ...
],
```

This allows ADMIN role to view RRF statistics on the dashboard while maintaining separation of concerns (admin still can't create/update/delete RRFs, only read them for statistics).

---

## 🐛 Troubleshooting

**Still getting 403 error?**
- Make sure you logged in AFTER fixing permissions
- Clear browser localStorage: Press F12 → Console → Run: `localStorage.clear(); location.reload()`

**Docker permission denied?**
- Close Docker Desktop completely
- Right-click Docker Desktop icon → Run as Administrator
- Retry the fix

**Statistics still showing 0?**
- Check database has records: `docker exec -it rrf-postgres psql -U postgres -d rrf_portal -c "SELECT COUNT(*) FROM rrfs;"`
- If count is 0, run seed endpoint: `curl -X POST http://localhost:4000/seed`

---

## ✨ Summary

**Root Cause:** ADMIN role missing RRF.READ permission  
**Solution:** Add permission via SQL or re-seed  
**Time to Fix:** 30 seconds (Method 1) - 5 minutes (Method 3)  
**Impact:** Admin dashboard will now show real RRF statistics instead of zeros

**Recommended: Use Method 1 (Direct SQL) - fastest and cleanest!**
