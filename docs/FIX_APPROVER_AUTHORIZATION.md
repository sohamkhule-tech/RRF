# Fix for "You are not authorized to approve this RRF" Error

## Problem
When trying to approve an RRF, you get the error:
```
Error: You are not authorized to approve this RRF
```

This happens because:
1. **Root Cause**: When RRFs were created/submitted before the fix, no approvers were assigned to them in the `rrf_approvers` table
2. **The Fix Applied**: The backend now automatically assigns all users with `APPROVALS.APPROVE` permission as approvers when an RRF is submitted

## What Was Fixed

### Backend Changes Made:
1. **Auto-assign approvers on submit** - Modified `rrf.service.ts` to automatically assign all approvers when an RRF status changes from DRAFT to PENDING
2. **Updated approval workflow** - When any approver approves an RRF, it immediately gets approved (other pending approvals are marked as "skipped")
3. **Added utility endpoint** - Created `/rrf/:id/assign-approvers` endpoint to fix existing RRFs

### Frontend Changes Made:
1. **Fixed route permissions** - Changed `/approvals` to `/approver` in permissions mapping

## How to Fix Existing RRFs

### Option 1: Quick Browser Console Fix (Recommended)

1. **Login to the RRF Portal** at http://localhost:3000
2. **Open Developer Tools** (Press F12)
3. **Go to Console tab**
4. **Paste and run this code**:

```javascript
// Fix all pending RRFs without approvers
async function fixPendingRRFs() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('❌ Not logged in! Please login first.');
    return;
  }

  console.log('🔍 Fetching pending RRFs...');
  
  // Get all pending RRFs
  const rrfsResponse = await fetch('http://localhost:4000/rrf?status=pending', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const rrfsData = await rrfsResponse.json();
  
  if (!rrfsData.success) {
    console.error('❌ Failed to fetch RRFs:', rrfsData.message);
    return;
  }

  const pendingRRFs = rrfsData.data || [];
  console.log(`📋 Found ${pendingRRFs.length} pending RRFs`);
  
  let fixed = 0;
  
  for (const rrf of pendingRRFs) {
    const hasApprovers = rrf.approvers && rrf.approvers.length > 0;
    
    if (!hasApprovers) {
      console.log(`🔧 Fixing RRF-${rrf.rrfNumber}...`);
      
      const fixResponse = await fetch(`http://localhost:4000/rrf/${rrf.id}/assign-approvers`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const fixData = await fixResponse.json();
      
      if (fixData.success) {
        console.log(`✅ Fixed RRF-${rrf.rrfNumber}`);
        fixed++;
      } else {
        console.log(`❌ Failed to fix RRF-${rrf.rrfNumber}:`, fixData.message);
      }
    }
  }
  
  console.log(`\n✨ Done! Fixed ${fixed} RRF(s)`);
  console.log('🔄 Refresh the page to see updated data');
}

// Run the fix
fixPendingRRFs();
```

### Option 2: Using the Node.js Script

1. **Get your JWT token**:
   - Login at http://localhost:3000
   - Open Developer Tools (F12) > Console
   - Run: `localStorage.getItem('token')`
   - Copy the token

2. **Update the script**:
   - Open `fix-existing-rrfs.js`
   - Replace `YOUR_JWT_TOKEN_HERE` with your actual token

3. **Run the script**:
   ```bash
   cd c:\Users\SohamKhule\Downloads\RRF_2
   node fix-existing-rrfs.js
   ```

### Option 3: Manual Fix (Per RRF)

If you know the specific RRF ID that needs fixing:

```javascript
// In browser console:
const token = localStorage.getItem('token');
const rrfId = 1; // Replace with actual RRF ID

fetch(`http://localhost:4000/rrf/${rrfId}/assign-approvers`, {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

## Going Forward

### For New RRFs:
✅ **No action needed!** All new RRFs will automatically have approvers assigned when submitted.

### When Creating RRFs:
1. Create RRF (stays as DRAFT)
2. Submit RRF → Automatically assigns all users with `APPROVALS.APPROVE` permission
3. Any assigned approver can approve it

### Approval Workflow:
- When an RRF is submitted, ALL active users with `APPROVALS.APPROVE` permission are assigned as approvers
- ANY one of them can approve the RRF
- Once approved by anyone, the RRF status changes to APPROVED
- Other pending approvals are marked as "skipped"

## Testing the Fix

1. **Create a new RRF** as a Hiring Manager
2. **Submit it for approval**
3. **Login as an Approver**
4. **Go to Approver Dashboard**
5. **Try to approve the RRF** - It should work now! ✅

## Technical Details

### What Changed:

#### `rrf.service.ts`:
- Added `getApprovers()` method to query all users with `APPROVALS.APPROVE` permission
- Modified `submit()` to auto-assign approvers
- Updated `approve()` to mark other pending approvals as skipped
- Added `assignApproversToRrf()` utility method

#### `rrf.controller.ts`:
- Added `POST /rrf/:id/assign-approvers` endpoint

#### `rrf.module.ts`:
- Added User and Permission entities to TypeORM imports

#### `utils/permissions.js` (Frontend):
- Fixed route mapping: `/approvals` → `/approver`
- Added `/pmo` and `/hr` routes

## Verification

After running the fix, verify in the database:

```sql
-- Check if approvers are assigned
SELECT 
  r.rrf_number,
  r.status,
  COUNT(ra.id) as approver_count
FROM rrfs r
LEFT JOIN rrf_approvers ra ON r.id = ra.rrf_id
WHERE r.status = 'pending'
GROUP BY r.id, r.rrf_number, r.status;
```

All pending RRFs should have at least 1 approver assigned.

## Need Help?

If you still face issues:
1. Check backend logs: `docker logs rrf-backend`
2. Check frontend console for errors
3. Verify your user has the `APPROVALS.APPROVE` permission
4. Make sure the backend restarted successfully
