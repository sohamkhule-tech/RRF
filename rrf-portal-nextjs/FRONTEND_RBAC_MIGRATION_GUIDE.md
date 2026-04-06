# 🔄 Frontend RBAC Migration Guide
## From Role-Based to Permission-Based UI

This guide explains how to refactor your existing Next.js frontend from role-based checks to permission-based checks **without rewriting everything**.

---

## 📊 MIGRATION OVERVIEW

### Current State (Role-Based):
```javascript
// ❌ OLD: Role-based check
if (user.role === 'pmo') {
  // Show PMO features
}
```

### Target State (Permission-Based):
```javascript
// ✅ NEW: Permission-based check
if (hasPermission('RRF.CREATE')) {
  // Show create feature
}
```

---

## 🎯 KEY CHANGES MADE

### 1. **New Files Created**

| File | Purpose |
|------|---------|
| `utils/permissions.js` | Permission checking utilities and constants |
| `hooks/usePermission.js` | React hook for permission checks in components |
| `components/PermissionBasedSidebar.jsx` | New permission-based sidebar |

### 2. **Modified Files**

| File | Changes |
|------|---------|
| `contexts/AuthContext.jsx` | Now stores and manages permissions array |
| `app/login/page.jsx` | Uses permission-based routing instead of role-based |

---

## 📚 STEP-BY-STEP USAGE GUIDE

### STEP 1: Using the Permission Hook

```javascript
'use client'

import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'

export default function MyComponent() {
  const {
    hasPermission,
    canCreateRRF,
    canApprove,
    canViewReports,
    permissions
  } = usePermission()

  return (
    <div>
      {/* Method 1: Using convenience flags */}
      {canCreateRRF && (
        <button>Create RRF</button>
      )}

      {/* Method 2: Using hasPermission function */}
      {hasPermission('APPROVALS.APPROVE') && (
        <button>Approve</button>
      )}

      {/* Method 3: Using PERMISSIONS constants (recommended) */}
      {hasPermission(PERMISSIONS.RRF.UPDATE) && (
        <button>Edit RRF</button>
      )}

      {/* Debug: Show all permissions */}
      <div>Your permissions: {permissions.join(', ')}</div>
    </div>
  )
}
```

---

### STEP 2: Updating Existing Components

#### **BEFORE: Role-Based Button Visibility**

```javascript
// ❌ OLD APPROACH (app/dashboard/page.jsx)
export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      {user.role === 'hiring-manager' && (
        <Link href="/create-rrf">
          <button>Create RRF</button>
        </Link>
      )}

      {user.role === 'approver' && (
        <button onClick={handleApprove}>Approve</button>
      )}

      {(user.role === 'pmo' || user.role === 'hr') && (
        <button onClick={handleExport}>Export</button>
      )}
    </div>
  )
}
```

#### **AFTER: Permission-Based Button Visibility**

```javascript
// ✅ NEW APPROACH
'use client'

import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'

export default function DashboardPage() {
  const { hasPermission, canCreateRRF, canApprove } = usePermission()

  return (
    <div>
      {/* Show create button if user has RRF.CREATE permission */}
      {canCreateRRF && (
        <Link href="/create-rrf">
          <button>Create RRF</button>
        </Link>
      )}

      {/* Show approve button if user has APPROVALS.APPROVE permission */}
      {canApprove && (
        <button onClick={handleApprove}>Approve</button>
      )}

      {/* Show export button if user has REPORTS.EXPORT permission */}
      {hasPermission(PERMISSIONS.REPORTS.EXPORT) && (
        <button onClick={handleExport}>Export</button>
      )}
    </div>
  )
}
```

---

### STEP 3: Updating the Sidebar

#### **Option A: Use New Permission-Based Sidebar (Recommended)**

```javascript
// In app/layout.jsx or components/ClientLayout.jsx

// ❌ OLD
import Sidebar from '@/components/Sidebar'

export default function Layout({ children }) {
  const { user } = useAuth()

  return (
    <div>
      <Sidebar role={user.role} />
      {children}
    </div>
  )
}

// ✅ NEW
import PermissionBasedSidebar from '@/components/PermissionBasedSidebar'

export default function Layout({ children }) {
  return (
    <div>
      <PermissionBasedSidebar />
      {children}
    </div>
  )
}
```

#### **Option B: Gradually Update Existing Sidebar**

If you want to keep the existing Sidebar component and update it gradually:

```javascript
// components/Sidebar.jsx

'use client'

import { usePermission } from '@/hooks/usePermission'

export default function Sidebar({ role, isCollapsed = false }) {
  const { canCreateRRF, canViewApprovals, canViewReports } = usePermission()

  // Build menu items based on permissions instead of role
  const getMenuItems = () => {
    const items = []

    items.push({
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: 'Dashboard',
      href: '/dashboard'
    })

    if (canCreateRRF) {
      items.push({
        key: '/create-rrf',
        icon: <PlusOutlined />,
        label: 'Create RRF',
        href: '/create-rrf'
      })
    }

    if (canViewApprovals) {
      items.push({
        key: '/approvals',
        icon: <CheckCircleOutlined />,
        label: 'Approvals',
        href: '/approvals'
      })
    }

    if (canViewReports) {
      items.push({
        key: '/reports',
        icon: <BarChartOutlined />,
        label: 'Reports',
        href: '/reports'
      })
    }

    return items
  }

  const menuItems = getMenuItems()

  // ... rest of sidebar rendering
}
```

---

### STEP 4: Updating Dashboard Components

#### **Strategy: Merge Multiple Dashboards into One**

Instead of having separate dashboards for each role (`/pmo`, `/approver`, `/hr`), create one unified dashboard that shows/hides sections based on permissions.

```javascript
// app/dashboard/page.jsx - UNIFIED DASHBOARD

'use client'

import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import StatCard from '@/components/StatCard'

export default function UnifiedDashboard() {
  const {
    canCreateRRF,
    canViewApprovals,
    canApprove,
    hasPermission,
    permissions
  } = usePermission()

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Section - Show different stats based on permissions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Show for RRF creators */}
        {canCreateRRF && (
          <>
            <StatCard title="My Requests" value="14" color="blue" href="/my-requests" />
            <StatCard title="Drafts" value="3" color="orange" href="/drafts" />
          </>
        )}

        {/* Show for approvers */}
        {canApprove && (
          <>
            <StatCard title="Pending Approvals" value="8" color="orange" href="/approvals/pending" />
            <StatCard title="Approved" value="45" color="green" href="/approvals/approved" />
          </>
        )}

        {/* Show for PMO */}
        {hasPermission(PERMISSIONS.RRF.DELETE) && (
          <StatCard title="Total RRFs" value="120" color="purple" />
        )}

        {/* Show for HR */}
        {hasPermission(PERMISSIONS.RRF.READ) && !canCreateRRF && (
          <>
            <StatCard title="Open Positions" value="15" color="cyan" href="/hr/open-hiring" />
            <StatCard title="Closed" value="28" color="gray" href="/hr/closed" />
          </>
        )}
      </div>

      {/* Action Buttons Section */}
      <div className="flex gap-4">
        {canCreateRRF && (
          <Link href="/create-rrf">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg">
              Create New RRF
            </button>
          </Link>
        )}

        {hasPermission(PERMISSIONS.REPORTS.EXPORT) && (
          <button onClick={handleExport} className="px-6 py-3 bg-green-600 text-white rounded-lg">
            Export Report
          </button>
        )}
      </div>

      {/* Recent Items Table - Filter by permissions */}
      <RecentItemsTable permissions={permissions} />
    </div>
  )
}
```

---

### STEP 5: Route Protection Middleware

Create a route protection component to prevent unauthorized access:

```javascript
// components/ProtectedRoute.jsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermission } from '@/hooks/usePermission'
import { canAccessRoute } from '@/utils/permissions'

export default function ProtectedRoute({ children, requiredPermission }) {
  const router = useRouter()
  const { hasPermission, permissions } = usePermission()

  useEffect(() => {
    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push('/access-denied')
    }
  }, [requiredPermission, hasPermission, router])

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this page</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return children
}
```

**Usage:**

```javascript
// app/create-rrf/page.jsx

import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'

export default function CreateRRFPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.RRF.CREATE}>
      {/* Your create RRF form */}
    </ProtectedRoute>
  )
}
```

---

## 🔄 MIGRATION CHECKLIST

### Phase 1: Setup (Already Done ✅)
- [x] Create `utils/permissions.js`
- [x] Create `hooks/usePermission.js`
- [x] Update `AuthContext` to handle permissions
- [x] Update login to use permission-based routing
- [x] Create `PermissionBasedSidebar`

### Phase 2: Update Components (Your Task)
- [ ] Update `ClientLayout.jsx` to use `PermissionBasedSidebar`
- [ ] Merge `/dashboard`, `/pmo`, `/approver`, `/hr` into one unified dashboard
- [ ] Update all button visibility checks from role to permission
- [ ] Update table action buttons (Edit, Delete, Approve, etc.)
- [ ] Update form access controls

### Phase 3: Route Protection (Your Task)
- [ ] Create `ProtectedRoute` component
- [ ] Wrap protected pages with `ProtectedRoute`
- [ ] Create Access Denied page
- [ ] Test all routes with different user roles

### Phase 4: Cleanup (Final Step)
- [ ] Remove old Sidebar component (after confirming new one works)
- [ ] Remove role-specific page folders (`/pmo`, `/approver`, `/hr`)
- [ ] Remove all `if (role === 'something')` checks
- [ ] Update API calls to include Authorization header with token

---

## 🎨 CODE EXAMPLES

### Example 1: Conditional Rendering

```javascript
// ❌ BEFORE
{user.role === 'approver' && <ApproveButton />}

// ✅ AFTER
import { usePermission } from '@/hooks/usePermission'
const { canApprove } = usePermission()
{canApprove && <ApproveButton />}
```

### Example 2: Multiple Conditions

```javascript
// ❌ BEFORE
{(user.role === 'pmo' || user.role === 'admin') && <DeleteButton />}

// ✅ AFTER
import { PERMISSIONS } from '@/utils/permissions'
const { hasPermission } = usePermission()
{hasPermission(PERMISSIONS.RRF.DELETE) && <DeleteButton />}
```

### Example 3: Complex Logic

```javascript
// ❌ BEFORE
const canEdit = user.role === 'hiring-manager' || user.role === 'pmo'
const canDelete = user.role === 'pmo' || user.role === 'admin'

// ✅ AFTER
const { hasPermission } = usePermission()
const canEdit = hasPermission(PERMISSIONS.RRF.UPDATE)
const canDelete = hasPermission(PERMISSIONS.RRF.DELETE)
```

### Example 4: Table Actions

```javascript
// ❌ BEFORE
<td>
  {user.role === 'hiring-manager' && <button>Edit</button>}
  {user.role === 'pmo' && <button>Delete</button>}
  {user.role === 'approver' && <button>Approve</button>}
</td>

// ✅ AFTER
import { usePermission } from '@/hooks/usePermission'

const { canUpdateRRF, canDeleteRRF, canApprove } = usePermission()

<td className="flex gap-2">
  {canUpdateRRF && <button>Edit</button>}
  {canDeleteRRF && <button>Delete</button>}
  {canApprove && <button>Approve</button>}
</td>
```

---

## 🏗️ RECOMMENDED FOLDER STRUCTURE

```
rrf-portal-nextjs/
├── app/
│   ├── dashboard/           # Unified dashboard (all roles)
│   ├── create-rrf/         # Protected by RRF.CREATE
│   ├── my-requests/        # Protected by RRF.READ
│   ├── approvals/          # Protected by APPROVALS.READ
│   ├── reports/            # Protected by REPORTS.READ
│   ├── users/              # Protected by USERS.READ
│   ├── settings/           # Protected by SETTINGS.READ
│   └── access-denied/      # Error page
│
├── components/
│   ├── PermissionBasedSidebar.jsx  # New sidebar
│   ├── ProtectedRoute.jsx          # Route guard
│   ├── Header.jsx
│   └── StatCard.jsx
│
├── contexts/
│   └── AuthContext.jsx     # Updated with permissions
│
├── hooks/
│   └── usePermission.js    # Permission hook
│
└── utils/
    └── permissions.js      # Permission utilities
```

---

## 🚀 TESTING GUIDE

### Test Each User Role:

1. **Hiring Manager (hm001 / hm123)**
   - ✅ Should see: Create RRF, My Requests, Drafts
   - ❌ Should NOT see: Approve buttons, PMO features

2. **PMO (pmo001 / pmo123)**
   - ✅ Should see: Create RRF, All RRFs, Delete buttons
   - ❌ Should NOT see: User management

3. **Approver (app001 / app123)**
   - ✅ Should see: Approvals, Approve/Reject buttons
   - ❌ Should NOT see: Create RRF, Delete buttons

4. **HR (hr001 / hr123)**
   - ✅ Should see: Open positions, Closed requests
   - ❌ Should NOT see: Create RRF, Approve buttons

5. **Admin (admin001 / admin123)**
   - ✅ Should see: User management, Settings
   - ❌ Should NOT see: Business operation buttons

---

## 💡 BEST PRACTICES

### DO:
✅ Use `PERMISSIONS` constants instead of hardcoded strings  
✅ Use `usePermission()` hook in components  
✅ Show meaningful error messages when access is denied  
✅ Test with all user roles before deploying  
✅ Keep permission checks consistent across frontend and backend  

### DON'T:
❌ Mix role-based and permission-based checks  
❌ Hardcode permission strings (`'RRF.CREATE'` everywhere)  
❌ Skip route protection (frontend only checks are not secure)  
❌ Remove all role-specific code at once (migrate incrementally)  
❌ Forget to handle missing permissions gracefully  

---

## 🐛 TROUBLESHOOTING

### Issue: "hasPermission is not a function"
**Solution:** Make sure you're importing from the correct path:
```javascript
import { usePermission } from '@/hooks/usePermission'
```

### Issue: Sidebar showing no items
**Solution:** Check if permissions array is populated:
```javascript
const { permissions } = usePermission()
console.log('User permissions:', permissions)
```

### Issue: Login returns role but no permissions
**Solution:** Backend must return permissions array. Check backend response:
```json
{
  "user": {
    "name": "John Doe",
    "role": { "code": "HIRING_MANAGER" },
    "permissions": ["DASHBOARD.READ", "RRF.CREATE", "RRF.READ"]
  }
}
```

---

## 📞 NEXT STEPS

1. **Immediate Actions:**
   - Test login with all 5 demo users
   - Verify permissions are stored in AuthContext
   - Check that PermissionBasedSidebar shows correct items

2. **This Week:**
   - Update ClientLayout to use PermissionBasedSidebar
   - Create unified dashboard component
   - Update 2-3 key pages with permission checks

3. **Next Week:**
   - Add ProtectedRoute to all protected pages
   - Remove role-based checks from all components
   - Create Access Denied page
   - Remove old `/pmo`, `/approver`, `/hr` folders

4. **Final Week:**
   - Full testing with all user roles
   - Remove old Sidebar component
   - Code cleanup and optimization
   - Documentation update

---

**🎉 Congratulations! You now have a permission-based frontend architecture!**

Your frontend is now scalable, maintainable, and perfectly synchronized with your backend RBAC system.
