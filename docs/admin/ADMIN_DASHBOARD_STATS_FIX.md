# Admin Dashboard Statistics Fix - Diagnostic Guide

## 🔍 Problem Analysis

Your Admin Dashboard shows 0 for all statistics despite having RRF records in the database.

### Current Setup:

**Backend API (Line 88-97, rrf.controller.ts):**
```typescript
@Get('statistics')
@RequirePermission('RRF.READ')
async getStatistics(@CurrentUser() user: AuthUser, @Query('all') all?: string) {
  const userId = all === 'true' ? undefined : user.id;
  const stats = await this.rrfService.getStatistics(userId);
  return {
    success: true,
    data: stats,
  };
}
```

**Backend Service (Line 522-564, rrf.service.ts):**
```typescript
async getStatistics(userId?: number): Promise<object> {
  const qb = this.rrfRepository
    .createQueryBuilder('rrf')
    .select('rrf.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('rrf.status');

  if (userId) {
    qb.where('rrf.createdById = :userId', { userId });
  }

  const rows: StatusCount[] = await qb.getRawMany();
  // ... counts logic ...
}
```

**Frontend Admin Dashboard (Line 22-28, admin/page.jsx):**
```javascript
const [statsRes, usersRes] = await Promise.all([
  rrfApi.getStatistics(true),  // Calls GET /rrf/statistics?all=true
  usersApi.getAll(),
])
```

---

## 🚀 Step-by-Step Diagnostic

### **Step 1: Verify Backend is Running**

```powershell
# Check backend container
docker ps | findstr rrf-backend

# Check backend logs
docker logs rrf-backend --tail 30

# Expected: "🚀 RRF Portal Backend API running on http://localhost:4000"
```

### **Step 2: Check Database Has RRF Records**

```powershell
# Access PostgreSQL
docker exec -it rrf-postgres psql -U postgres -d rrf_portal

# Check RRF records
SELECT id, rrf_number, position_title, status, created_by_id 
FROM rrfs 
ORDER BY created_at DESC 
LIMIT 10;

# Check status values (CRITICAL - case sensitive!)
SELECT status, COUNT(*) as count 
FROM rrfs 
GROUP BY status;

# Expected output example:
#    status    | count
# -------------+-------
#  draft       |   1
#  pending     |   2
#  approved    |   1
#  in-progress |   1
#  closed      |   1
```

**Common Issue:** Status values must match enum exactly:
- ✅ `'draft'` (lowercase)
- ✅ `'pending'` (lowercase)
- ✅ `'approved'` (lowercase)
- ❌ `'DRAFT'` (uppercase - won't match!)
- ❌ `'Draft'` (mixed case - won't match!)

### **Step 3: Test API Directly (Without Frontend)**

```powershell
# Get admin token first
$loginResponse = curl -X POST http://localhost:4000/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"userId\":\"admin001\",\"password\":\"admin123\"}' | ConvertFrom-Json

$token = $loginResponse.access_token

# Test statistics API with token
curl -X GET "http://localhost:4000/rrf/statistics?all=true" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "total": 5,
#     "byStatus": {
#       "draft": 1,
#       "pending": 2,
#       "approved": 1,
#       "declined": 0,
#       "onHold": 0,
#       "openForHiring": 1,
#       "closed": 1
#     }
#   }
# }
```

### **Step 4: Check Frontend API Call**

**Enable Browser Console Logging:**

1. Open http://localhost:3000/admin
2. Press F12 (Developer Console)
3. Go to Console tab
4. Look for errors or API calls

**Check Network Tab:**
1. F12 → Network tab
2. Filter: XHR
3. Look for request to `/rrf/statistics?all=true`
4. Check:
   - Status Code (should be 200)
   - Response body
   - Request headers (Authorization token present?)

---

## 🔧 Common Issues & Fixes

### **Issue 1: 401 Unauthorized**

**Symptoms:**
- API returns 401 error
- Console shows: "Unauthorized"

**Cause:** Missing or invalid auth token

**Fix:**
```javascript
// Check localStorage in browser console (F12)
console.log('Token:', localStorage.getItem('token'));

// If null, login again
// Clear cache and reload:
localStorage.clear();
window.location.reload();
```

### **Issue 2: Empty byStatus Object**

**Symptoms:**
- API returns `{ total: 5, byStatus: {} }`
- All counts show 0

**Cause:** Database status values don't match RrfStatus enum values

**Check Database:**
```sql
-- Find mismatched statuses
SELECT DISTINCT status FROM rrfs;

-- Should return lowercase values:
-- 'draft', 'pending', 'approved', 'in-progress', etc.
```

**Fix Database Values:**
```sql
-- If you have wrong case (e.g., 'PENDING' instead of 'pending')
UPDATE rrfs SET status = LOWER(status);

-- If you have wrong values
UPDATE rrfs SET status = 'pending' WHERE status = 'PENDING';
UPDATE rrfs SET status = 'approved' WHERE status = 'APPROVED';
UPDATE rrfs SET status = 'in-progress' WHERE status = 'IN_PROGRESS';
```

### **Issue 3: Wrong Enum Values Used**

**Backend enum values (rrf.entity.ts):**
```typescript
export enum RrfStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  DECLINED = 'declined',
  REJECTED = 'rejected',
  ON_HOLD = 'on-hold',
  IN_PROGRESS = 'in-progress',
  OPEN_FOR_HIRING = 'open-for-hiring',
  CLOSED_BY_BENCH = 'closed-by-bench',
  CLOSED = 'closed',
}
```

**Verify seed data uses correct values:**
```powershell
# Check seed service
docker exec -it rrf-backend sh -c "cat src/database/seed.service.ts | grep -A5 'status:'"
```

### **Issue 4: Admin Doesn't Have RRF.READ Permission**

**Symptoms:**
- 403 Forbidden error
- Console: "Permission denied"

**Fix:**
```powershell
# Check admin permissions
docker exec -it rrf-postgres psql -U postgres -d rrf_portal

SELECT u."userId", r."roleName", p."permissionCode"
FROM users u
JOIN roles r ON u."roleId" = r.id
LEFT JOIN role_permissions rp ON r.id = rp."roleId"
LEFT JOIN permissions p ON rp."permissionId" = p.id
WHERE u."userId" = 'admin001';

# Admin should have 'RRF.READ' permission
# If missing, re-run seed:
\q
curl -X POST http://localhost:4000/seed
```

### **Issue 5: CORS or Network Error**

**Symptoms:**
- Console: "CORS error" or "Failed to fetch"
- Network tab shows request failed

**Check:**
```powershell
# Verify backend CORS settings
docker exec rrf-backend printenv | findstr ALLOWED_ORIGINS

# Should show: ALLOWED_ORIGINS=http://localhost:3000
```

**Fix docker-compose.yml if wrong:**
```yaml
backend:
  environment:
    - ALLOWED_ORIGINS=http://localhost:3000
```

---

## 🎯 Quick Fix Script

Run this comprehensive test:

```powershell
Write-Host "`n=== RRF Statistics Diagnostic ===" -ForegroundColor Cyan

# 1. Check backend
Write-Host "`n[1] Backend Status:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr backend

# 2. Check database records
Write-Host "`n[2] Database Records:" -ForegroundColor Yellow
docker exec -it rrf-postgres psql -U postgres -d rrf_portal -c "SELECT status, COUNT(*) FROM rrfs GROUP BY status;"

# 3. Login and get token
Write-Host "`n[3] Getting Auth Token:" -ForegroundColor Yellow
$loginBody = @{
    userId = "admin001"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $loginBody

$token = $loginResponse.access_token
Write-Host "✓ Token obtained" -ForegroundColor Green

# 4. Test statistics API
Write-Host "`n[4] Testing Statistics API:" -ForegroundColor Yellow
$statsResponse = Invoke-RestMethod -Uri "http://localhost:4000/rrf/statistics?all=true" `
    -Method GET `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

Write-Host "API Response:" -ForegroundColor Cyan
$statsResponse | ConvertTo-Json -Depth 5

# 5. Check if data is returned
if ($statsResponse.success -and $statsResponse.data.total -gt 0) {
    Write-Host "`n✅ SUCCESS: Statistics working correctly!" -ForegroundColor Green
    Write-Host "Total RRFs: $($statsResponse.data.total)" -ForegroundColor Green
} else {
    Write-Host "`n❌ ISSUE: Statistics returning zero or empty" -ForegroundColor Red
    Write-Host "Check database status values match enum" -ForegroundColor Yellow
}
```

---

## 🔍 Backend Debug Logging

Add temporary logging to see what's happening:

```typescript
// src/rrf/rrf.service.ts - Line 522
async getStatistics(userId?: number): Promise<object> {
  console.log('📊 getStatistics called with userId:', userId);
  
  const qb = this.rrfRepository
    .createQueryBuilder('rrf')
    .select('rrf.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('rrf.status');

  if (userId) {
    qb.where('rrf.createdById = :userId', { userId });
  }

  // Log the query
  console.log('📊 Query:', qb.getSql());

  const rows: StatusCount[] = await qb.getRawMany();
  console.log('📊 Raw rows from DB:', rows);

  // ... rest of the method ...
  
  const result = {
    total,
    byStatus: { /* ... */ }
  };
  
  console.log('📊 Final result:', result);
  return result;
}
```

Then restart backend and check logs:
```powershell
docker-compose restart backend
docker logs rrf-backend -f

# Make API call and watch logs
curl -X GET "http://localhost:4000/rrf/statistics?all=true" `
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Expected Working Flow

1. **Browser loads admin dashboard**
   - Calls `rrfApi.getStatistics(true)`
   
2. **Frontend makes API call**
   - `GET http://localhost:4000/rrf/statistics?all=true`
   - Headers: `Authorization: Bearer <token>`
   
3. **Backend processes request**
   - Validates token
   - Checks RRF.READ permission
   - all=true → userId=undefined (get all RRFs)
   - Queries database: `SELECT status, COUNT(*) FROM rrfs GROUP BY status`
   
4. **Database returns counts**
   - Example: `[{status: 'pending', count: '2'}, {status: 'approved', count: '1'}]`
   
5. **Backend maps to response**
   ```json
   {
     "success": true,
     "data": {
       "total": 5,
       "byStatus": {
         "draft": 1,
         "pending": 2,  
         "approved": 1,
         "openForHiring": 1,
         "closed": 0
       }
     }
   }
   ```

6. **Frontend displays counts**
   - `stats.total` → Total RRFs card
   - `byStatus.pending` → Pending card
   - `byStatus.approved` → Approved card
   - etc.

---

## 🎯 Most Likely Causes (in order)

1. **Database status values don't match enum** (90% of cases)
   - Check: `SELECT DISTINCT status FROM rrfs;`
   - Fix: Update status values to lowercase

2. **No seed data in database** (5% of cases)
   - Check: `SELECT COUNT(*) FROM rrfs;`
   - Fix: Run `curl -X POST http://localhost:4000/seed`

3. **Missing authentication token** (3% of cases)
   - Check: F12 console for 401 errors
   - Fix: Re-login

4. **Missing RRF.READ permission** (2% of cases)
   - Check: Admin role has RRF.READ permission
   - Fix: Re-run seed

---

**Run the diagnostic script above and report back the output - that will tell us exactly what's wrong!** 🚀
