# RRF Detail Page Refactoring - Analysis & Implementation Plan

## 📊 Current State Analysis

### Existing Role-Based Views

| Role | File Path | Actions Available |
|------|-----------|-------------------|
| **Hiring Manager** | `app/hiring-manager/view-rrf/[id]/page.jsx` | Edit RRF, View, Print, Export PDF |
| **Approver** | `app/approver/view-rrf/[id]/page.jsx` | Approve, Reject, On Hold, View, Print, Export PDF |
| **PMO** | `app/pmo/view-rrf/[id]/page.jsx` | Open for Hiring, Fill from Bench, View, Print, Export PDF |
| **HR** | `app/hr/view-rrf/[id]/page.jsx` | Close RRF, View, Print, Export PDF |
| **Admin** | `app/admin/rrf-management/[id]/page.jsx` | Approve, Reject, On Hold, Edit, View, Print, Export PDF |

---

## 🎯 Action-to-Permission Mapping

### Current Actions Across All Roles

| Action | Description | Current Roles | Status Requirement | Permission Code |
|--------|-------------|---------------|-------------------|-----------------|
| **View RRF** | View all RRF details | All roles | Any status | `RRF.VIEW` |
| **Edit RRF** | Modify RRF data | Hiring Manager, Admin | draft, pending, declined, on-hold | `RRF.UPDATE` |
| **Approve** | Approve RRF request | Approver, Admin | pending | `APPROVALS.APPROVE` |
| **Reject/Decline** | Reject RRF with reason | Approver, Admin | pending | `APPROVALS.REJECT` |
| **On Hold** | Put RRF on hold with reason | Approver, Admin | pending | `APPROVALS.ON_HOLD` |
| **Open for Hiring** | Send to HR for recruitment | PMO | approved | `RRF.OPEN_FOR_HIRING` |
| **Fill from Bench** | Close with internal candidate | PMO | approved | `RRF.FILL_FROM_BENCH` |
| **Close RRF** | Close with candidate/reason | HR | in-progress, open-for-hiring | `RRF.CLOSE` |
| **Print** | Print RRF | All roles | Any status | `RRF.VIEW` |
| **Export PDF** | Download PDF | All roles | Any status | `RRF.VIEW` |

---

## 🔐 Permission Definitions Needed

### New Permissions to Add

```javascript
APPROVALS: {
  READ: 'APPROVALS.READ',
  APPROVE: 'APPROVALS.APPROVE',
  REJECT: 'APPROVALS.REJECT',
  ON_HOLD: 'APPROVALS.ON_HOLD',     // ✨ NEW
}

RRF: {
  CREATE: 'RRF.CREATE',
  VIEW: 'RRF.VIEW',                   // Alias for RRF.READ
  READ: 'RRF.READ',
  UPDATE: 'RRF.UPDATE',               // Used for Edit
  DELETE: 'RRF.DELETE',
  OPEN_FOR_HIRING: 'RRF.OPEN_FOR_HIRING',    // ✨ NEW
  FILL_FROM_BENCH: 'RRF.FILL_FROM_BENCH',    // ✨ NEW
  CLOSE: 'RRF.CLOSE',                        // ✨ NEW
}
```

---

## 👥 Role-to-Permission Assignment

### Permission Matrix

| Permission | Hiring Manager | Approver | PMO | HR | Admin |
|------------|----------------|----------|-----|-----|-------|
| `RRF.VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `RRF.CREATE` | ✅ | ❌ | ❌ | ❌ | ✅ |
| `RRF.UPDATE` | ✅ | ❌ | ❌ | ❌ | ✅ |
| `APPROVALS.APPROVE` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `APPROVALS.REJECT` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `APPROVALS.ON_HOLD` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `RRF.OPEN_FOR_HIRING` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `RRF.FILL_FROM_BENCH` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `RRF.CLOSE` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 🏗️ Unified Page Architecture

### Single RRF Detail Page Location

**Path:** `/app/view-rrf/[id]/page.jsx`

**Why this location?**
- Neutral path (not role-specific)
- Accessible to all authenticated users
- Permission-based rendering controls what actions are visible

### Component Structure

```jsx
export default function UnifiedRRFDetailPage() {
  // 1. Fetch user permissions
  const { hasPermission } = usePermission()
  
  // 2. Fetch RRF data
  const { rrf, loading, error } = useRRFDetail(id)
  
  // 3. Permission checks
  const canView = hasPermission('RRF.VIEW')
  const canEdit = hasPermission('RRF.UPDATE')
  const canApprove = hasPermission('APPROVALS.APPROVE')
  const canReject = hasPermission('APPROVALS.REJECT')
  const canOnHold = hasPermission('APPROVALS.ON_HOLD')
  const canOpenForHiring = hasPermission('RRF.OPEN_FOR_HIRING')
  const canFillFromBench = hasPermission('RRF.FILL_FROM_BENCH')
  const canClose = hasPermission('RRF.CLOSE')
  
  // 4. Status-based rendering logic
  const isPending = rrf?.status === 'pending'
  const isApproved = rrf?.status === 'approved'
  const isInProgress = rrf?.status === 'in-progress' || rrf?.status === 'open-for-hiring'
  
  // 5. Combined permission + status checks
  const showEditButton = canEdit && ['draft', 'pending', 'declined', 'on-hold'].includes(rrf?.status)
  const showApprovalButtons = isPending && (canApprove || canReject || canOnHold)
  const showPMOButtons = isApproved && (canOpenForHiring || canFillFromBench)
  const showCloseButton = isInProgress && canClose
  
  // 6. Render actions dynamically
  return (
    <div>
      {/* Action Buttons */}
      {showEditButton && <button>Edit</button>}
      {canApprove && isPending && <button>Approve</button>}
      {canReject && isPending && <button>Reject</button>}
      {canOnHold && isPending && <button>On Hold</button>}
      {canOpenForHiring && isApproved && <button>Open for Hiring</button>}
      {canFillFromBench && isApproved && <button>Fill from Bench</button>}
      {canClose && isInProgress && <button>Close RRF</button>}
      
      {/* RRF Details - Same for all users */}
      <RRFDetailsView data={rrf} />
    </div>
  )
}
```

---

## 🔄 Migration Strategy

### Phase 1: Add Missing Permissions (Backend)
1. Update permissions table with new permissions:
   - `APPROVALS.ON_HOLD`
   - `RRF.OPEN_FOR_HIRING`
   - `RRF.FILL_FROM_BENCH`
   - `RRF.CLOSE`

2. Assign permissions to existing roles:
   ```sql
   -- Approver gets ON_HOLD
   -- PMO gets OPEN_FOR_HIRING, FILL_FROM_BENCH
   -- HR gets CLOSE
   -- Admin gets all new permissions
   ```

### Phase 2: Update Permission Constants (Frontend)
1. Update `utils/permissions.js` with new permission constants
2. Ensure `RRF.VIEW` is available (alias or separate constant)

### Phase 3: Create Unified Page
1. Create `/app/view-rrf/[id]/page.jsx`
2. Implement permission-based action rendering
3. Combine all modals (approve, reject, on-hold, open-for-hiring, fill-from-bench, close)
4. Test all permission combinations

### Phase 4: Update Navigation & Links
1. Update all links pointing to role-specific detail pages:
   - Change `/hiring-manager/view-rrf/{id}` → `/view-rrf/{id}`
   - Change `/approver/view-rrf/{id}` → `/view-rrf/{id}`
   - Change `/pmo/view-rrf/{id}` → `/view-rrf/{id}`
   - Change `/hr/view-rrf/{id}` → `/view-rrf/{id}`
   - Change `/admin/rrf-management/{id}` → `/view-rrf/{id}`

2. Update dashboard components (UnifiedDashboard.jsx, etc.)

### Phase 5: Remove Old Role-Based Pages
1. Delete or deprecated old view pages
2. Add redirects if needed for backward compatibility

### Phase 6: Database Migration
1. Run SQL script to add new permissions
2. Run SQL script to assign permissions to roles

---

## ✅ Benefits of Unified Approach

### Before (Role-Based)
- ❌ 5 separate RRF detail pages to maintain
- ❌ Duplication of UI code
- ❌ Hard to add new roles
- ❌ Inconsistent UX across roles
- ❌ Business logic tied to roles

### After (Permission-Based)
- ✅ 1 unified RRF detail page
- ✅ Shared UI components
- ✅ Easy to add new permissions
- ✅ Consistent UX for all users
- ✅ Business logic tied to permissions
- ✅ Flexible permission combinations
- ✅ Scalable architecture

---

## 🧪 Testing Matrix

| User Type | Permissions | Expected Visible Actions | RRF Status |
|-----------|-------------|--------------------------|------------|
| Hiring Manager | RRF.UPDATE, RRF.VIEW | Edit button (if status allows), Print, Export | draft, pending, declined |
| Approver | APPROVALS.APPROVE, APPROVALS.REJECT, APPROVALS.ON_HOLD, RRF.VIEW | Approve, Reject, On Hold, Print, Export | pending |
| PMO | RRF.OPEN_FOR_HIRING, RRF.FILL_FROM_BENCH, RRF.VIEW | Open for Hiring, Fill from Bench, Print, Export | approved |
| HR | RRF.CLOSE, RRF.VIEW | Close RRF, Print, Export | in-progress, open-for-hiring |
| Admin | All permissions | All actions based on status | Any |
| Read-Only User | RRF.VIEW only | No action buttons, only Print/Export | Any |

---

## 📋 Implementation Checklist

### Backend Tasks
- [ ] Add `APPROVALS.ON_HOLD` permission to database
- [ ] Add `RRF.OPEN_FOR_HIRING` permission to database
- [ ] Add `RRF.FILL_FROM_BENCH` permission to database
- [ ] Add `RRF.CLOSE` permission to database
- [ ] Assign new permissions to Approver role (ON_HOLD)
- [ ] Assign new permissions to PMO role (OPEN_FOR_HIRING, FILL_FROM_BENCH)
- [ ] Assign new permissions to HR role (CLOSE)
- [ ] Assign all new permissions to Admin role
- [ ] Verify API endpoints support all actions

### Frontend Tasks
- [ ] Update `utils/permissions.js` with new permission constants
- [ ] Create unified `/app/view-rrf/[id]/page.jsx`
- [ ] Implement permission-based action button rendering
- [ ] Add Approve modal with confirmation
- [ ] Add Reject modal with reason field
- [ ] Add On Hold modal with reason field
- [ ] Add Open for Hiring modal
- [ ] Add Fill from Bench modal with candidate details
- [ ] Add Close RRF modal with closure options
- [ ] Implement status-based button visibility
- [ ] Test all permission combinations
- [ ] Update all dashboard links to use new path
- [ ] Update sidebar navigation links
- [ ] Add redirects from old paths to new path
- [ ] Remove old role-specific view pages
- [ ] Test complete user flows for each role

### Documentation Tasks
- [ ] Document new permission codes
- [ ] Update API documentation
- [ ] Create user guide for unified view
- [ ] Update testing documentation

---

## 🚀 Next Steps

1. **Update permissions.js** - Add new permission constants
2. **Create database migration** - Add new permissions to DB
3. **Build unified page** - Implement `/app/view-rrf/[id]/page.jsx`
4. **Test thoroughly** - Verify all permission combinations work
5. **Update links** - Change all navigation to use new path
6. **Clean up** - Remove old role-based pages

---

## 📝 Notes

- The unified page maintains the SAME UI layout as current pages (left panel with summary, right panel with sections)
- Actions appear in the top action bar based on permissions + status
- All modals are included in the same file for maintainability
- Permission checks happen at render time, not at route level
- Status-based logic ensures users only see relevant actions (e.g., can't approve an already-approved RRF)
