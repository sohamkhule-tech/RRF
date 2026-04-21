# Fix for Missing RRF Workflow Permissions

## ❌ Problem
Getting 403 Forbidden errors when trying to use RRF workflow features:
- **Fill from Bench**: `RRF.FILL_FROM_BENCH` permission missing
- **Open for Hiring**: `RRF.OPEN_FOR_HIRING` permission missing  
- **Close RRF**: `RRF.CLOSE` permission missing

## ✅ Root Cause
These 3 workflow permissions exist in the controller but were **never added to the database seed data**.

## 🚀 Quick Fix (30 seconds)

**Open PowerShell as Administrator** and run this one command:

```powershell
docker exec -it rrf-postgres psql -U postgres -d rrf_portal <<'EOF'
BEGIN;
DO $BODY$
DECLARE
    v_rrf_module_id INTEGER;
    v_perm_id INTEGER;
    v_pmo_id INTEGER;
    v_hr_id INTEGER;
BEGIN
    SELECT id INTO v_rrf_module_id FROM modules WHERE "moduleCode" = 'RRF';
    SELECT id INTO v_pmo_id FROM roles WHERE "roleCode" = 'PMO';
    SELECT id INTO v_hr_id FROM roles WHERE "roleCode" = 'HR';
    
    -- 1. OPEN_FOR_HIRING
    INSERT INTO permissions ("moduleId", "permissionName", "permissionCode", "description", "isActive")
    VALUES (v_rrf_module_id, 'Open for Hiring', 'OPEN_FOR_HIRING', 'Mark RRF as open for hiring', true)
    ON CONFLICT ("moduleId", "permissionCode") DO UPDATE SET "isActive" = true
    RETURNING id INTO v_perm_id;
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_pmo_id, v_perm_id) ON CONFLICT DO NOTHING;
    
    -- 2. FILL_FROM_BENCH
    INSERT INTO permissions ("moduleId", "permissionName", "permissionCode", "description", "isActive")
    VALUES (v_rrf_module_id, 'Fill from Bench', 'FILL_FROM_BENCH', 'Fill position from bench resources', true)
    ON CONFLICT ("moduleId", "permissionCode") DO UPDATE SET "isActive" = true
    RETURNING id INTO v_perm_id;
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_pmo_id, v_perm_id) ON CONFLICT DO NOTHING;
    
    -- 3. CLOSE
    INSERT INTO permissions ("moduleId", "permissionName", "permissionCode", "description", "isActive")
    VALUES (v_rrf_module_id, 'Close RRF', 'CLOSE', 'Close resource requisition forms', true)
    ON CONFLICT ("moduleId", "permissionCode") DO UPDATE SET "isActive" = true
    RETURNING id INTO v_perm_id;
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_pmo_id, v_perm_id) ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions ("roleId", "permissionId")
    VALUES (v_hr_id, v_perm_id) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'SUCCESS: Added 3 missing RRF workflow permissions';
END $BODY$;
COMMIT;
EOF
```

**Note:** If you get syntax errors with the heredoc (`<<'EOF'`), use the SQL file instead:

```powershell
docker cp Data/add-missing-rrf-permissions.sql rrf-postgres:/tmp/fix.sql
docker exec -it rrf-postgres psql -U postgres -d rrf_portal -f /tmp/fix.sql
```

## ✅ Verify the Fix

After running the fix, verify the permissions were added:

```powershell
# Login with PMO user (who has the workflow permissions)
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"userId":"pmo001","password":"pmo123"}'

$token = $loginResponse.access_token
Write-Host "Logged in as PMO" -ForegroundColor Green

# Test Fill from Bench (replace RRF ID with a valid one)
$fillResponse = Invoke-RestMethod -Uri "http://localhost:4000/rrf/1/fill-by-bench" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body '{"notes":"Filled from internal bench"}'

Write-Host "Fill from Bench: $($fillResponse.message)" -ForegroundColor $(if($fillResponse.success){'Green'}else{'Red'})
```

✅ If you see `"Position filled by bench successfully"` - **it's working!**

## 🎯 What Users Have These Permissions Now

After the fix:

| Permission | PMO | HR | Hiring Manager | Approver | Admin |
|------------|-----|----|----------------|----------|--------|
| **RRF.OPEN_FOR_HIRING** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **RRF.FILL_FROM_BENCH** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **RRF.CLOSE** | ✅ | ✅ | ❌ | ❌ | ❌ |

**PMO** can perform all workflow actions (open for hiring, fill from bench, close)  
**HR** can close completed positions  
**Other roles** cannot perform these actions

## 📝 Files Modified

1. **[seed.service.ts](../rrf-portal-backend/src/database/seed.service.ts)** - Lines 320-333, 420-429, 447-452
   - Added 3 new RRF permissions
   - Assigned to PMO and HR roles

2. **[add-missing-rrf-permissions.sql](../Data/add-missing-rrf-permissions.sql)**
   - SQL script to add permissions directly to database

## 🐛 Troubleshooting

### Still getting 403 error?

**Check which user you're logged in as:**
```powershell
# Login returns user info
$response = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"userId":"pmo001","password":"pmo123"}'

Write-Host "Role: $($response.user.role.roleName)"
```

**If not PMO or HR, you need to login as a user with those roles:**
- **PMO User:** userId=`pmo001`, password=`pmo123`
- **HR User:** userId=`hr001`, password=`hr123`

### Permission added but still 403?

**Clear browser cache and re-login:**
```javascript
// F12 Console
localStorage.clear();
location.reload();
```

Then login again with PMO/HR credentials.

### Need to add permission to other roles?

**To add these permissions to HIRING_MANAGER role (so they can close their own RRFs):**

```sql
-- Add via SQL
INSERT INTO role_permissions ("roleId", "permissionId")
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
JOIN modules m ON p."moduleId" = m.id
WHERE r."roleCode" = 'HIRING_MANAGER'
AND m."moduleCode" = 'RRF'
AND p."permissionCode" IN ('CLOSE', 'OPEN_FOR_HIRING')
ON CONFLICT DO NOTHING;
```

## 🔄 For Future: Re-seed with New Permissions

After rebuilding backend (when Docker permissions issue is resolved):

```powershell
# Rebuild backend
docker-compose build backend

# Restart
docker-compose up -d

# Re-seed (this will add all missing permissions)
Start-Sleep -Seconds 15
Invoke-WebRequest -Uri "http://localhost:4000/seed" -Method POST
```

## ✨ Summary

**Problem:** Missing 3 RRF workflow permissions in database  
**Solution:** Add permissions via SQL and assign to PMO/HR roles  
**Time to Fix:** 30 seconds  
**Impact:** PMO and HR can now perform workflow actions (fill from bench, open for hiring, close)

**Recommended: Use the one-liner PowerShell command above for fastest fix!**
