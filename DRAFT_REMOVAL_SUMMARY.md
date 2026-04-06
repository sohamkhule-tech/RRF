# Draft RRFs Removal from Hiring Manager Section - Summary

## Changes Made

All draft RRFs have been removed from the main hiring manager views. Drafts are now only accessible through the dedicated **Drafts** page at `/hiring-manager/drafts`.

---

## Files Modified

### 1. **hooks/useMyRequests.js**
- **Change**: Filter out draft RRFs from the API response
- **Impact**: The hook now returns only non-draft RRFs by default
- **Code**: Added filter to exclude `status === 'draft'`

### 2. **app/hiring-manager/dashboard/page.jsx**
- **Change 1**: Recent requests now exclude draft RRFs
  ```javascript
  const recentRequests = (requests || [])
    .filter(req => req.status?.toLowerCase() !== 'draft')
    .slice(0, 6)
  ```
- **Change 2**: "All Submissions" stat card now shows total excluding drafts
  ```javascript
  const totalExcludingDrafts = (stats.total || 0) - (byStatus.draft || 0)
  ```
- **Impact**: Dashboard only shows submitted RRFs (pending, approved, etc.)

### 3. **app/hiring-manager/my-requests/page.jsx**
- **Change 1**: Removed "Draft" tab from the filter tabs
- **Change 2**: Updated "All Requests" count to exclude drafts
- **Change 3**: Removed 'draft' from valid status parameters
- **Change 4**: Simplified filtering logic (removed draft tab handling)
- **Impact**: My Requests page no longer shows or allows filtering for drafts

---

## User Impact

### What Users Will See:

✅ **Dashboard**:
- Recent requests table shows only submitted RRFs (no drafts)
- "All Submissions" count excludes drafts
- All other statistics remain the same

✅ **My Requests Page**:
- "All Requests" tab shows only submitted RRFs
- Draft tab has been removed
- Request counts exclude drafts

✅ **Drafts Page** (`/hiring-manager/drafts`):
- Still accessible via sidebar
- Shows all draft RRFs
- Users can continue to edit and submit drafts from here

### Workflow:

1. **Create RRF** → Saved as Draft → Accessible only in `/hiring-manager/drafts`
2. **Submit Draft** → Status changes to "Pending" → Now visible in Dashboard and My Requests
3. **Approval Process** → Visible in all hiring manager views

---

## Why This Change?

- **Cleaner Interface**: Drafts are works-in-progress and don't need to clutter the main views
- **Better Organization**: Dedicated Drafts section provides focused access to unfinished RRFs
- **Logical Separation**: Only submitted RRFs (pending onwards) appear in the main management views
- **Reduces Confusion**: Clear distinction between drafts (unsubmitted) and active requests

---

## Testing Checklist

To verify the changes work correctly:

- [ ] Navigate to Hiring Manager Dashboard
  - Verify recent requests table shows no draft RRFs
  - Check "All Submissions" count matches (total - drafts)

- [ ] Navigate to My Requests page
  - Verify "Draft" tab is no longer visible
  - Click "All Requests" tab - should show no drafts
  - Verify all counts are correct (excluding drafts)

- [ ] Navigate to Drafts page (`/hiring-manager/drafts`)
  - Verify all draft RRFs are still visible
  - Can still edit and submit drafts

- [ ] Create a new RRF
  - Should be saved as draft
  - Should NOT appear in Dashboard or My Requests
  - Should appear ONLY in Drafts page

- [ ] Submit a draft RRF
  - Should disappear from Drafts page
  - Should appear in Dashboard (recent requests)
  - Should appear in My Requests (All + Pending tabs)

---

## Rollback (If Needed)

If you need to revert these changes, the draft RRFs can be made visible again by:
1. Removing the `.filter(req => req.status?.toLowerCase() !== 'draft')` from the three files
2. Re-adding the Draft tab in my-requests/page.jsx
3. Restoring the original total calculation in dashboard/page.jsx

---

## Notes

- Draft RRFs are still stored in the database
- The backend API still returns drafts (filtering happens on frontend)
- Permissions and access controls remain unchanged
- This is purely a UI/UX improvement
