# 🚀 Quick Start Guide - Permission-Based UI

## 5-Minute Implementation Guide

This guide shows you how to quickly start using the new permission-based system in your components.

---

## 1️⃣ CHECK PERMISSIONS IN COMPONENTS

### Import the Hook:
```javascript
import { usePermission } from '@/hooks/usePermission'
```

### Use in Your Component:
```javascript
export default function MyComponent() {
  const { canCreateRRF, canApprove, canDeleteRRF } = usePermission()

  return (
    <div>
      {canCreateRRF && <button>Create RRF</button>}
      {canApprove && <button>Approve</button>}
      {canDeleteRRF && <button>Delete</button>}
    </div>
  )
}
```

---

## 2️⃣ PROTECT A PAGE

### Wrap Your Page Component:
```javascript
import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'

export default function CreateRRFPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.RRF.CREATE}>
      <div>
        {/* Your create RRF form */}
      </div>
    </ProtectedRoute>
  )
}
```

---

## 3️⃣ UPDATE SIDEBAR

### Replace Old Sidebar:
```javascript
// ❌ OLD (components/ClientLayout.jsx)
import Sidebar from '@/components/Sidebar'
<Sidebar role={user.role} />

// ✅ NEW
import PermissionBasedSidebar from '@/components/PermissionBasedSidebar'
<PermissionBasedSidebar isCollapsed={sidebarCollapsed} />
```

---

## 4️⃣ CONDITIONAL RENDERING PATTERNS

### Pattern 1: Single Permission
```javascript
import { usePermission } from '@/hooks/usePermission'

const { canCreateRRF } = usePermission()

{canCreateRRF && (
  <button className="bg-blue-600 text-white px-4 py-2 rounded">
    Create New RRF
  </button>
)}
```

### Pattern 2: Multiple Permissions (OR Logic)
```javascript
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'

const { hasAnyPermission } = usePermission()

const canEdit = hasAnyPermission([
  PERMISSIONS.RRF.UPDATE,
  PERMISSIONS.RRF.DELETE
])

{canEdit && <button>Edit</button>}
```

### Pattern 3: Multiple Permissions (AND Logic)
```javascript
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'

const { hasAllPermissions } = usePermission()

const canApproveAndExport = hasAllPermissions([
  PERMISSIONS.APPROVALS.APPROVE,
  PERMISSIONS.REPORTS.EXPORT
])

{canApproveAndExport && <button>Approve & Export</button>}
```

### Pattern 4: Using Constants (Recommended)
```javascript
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'

const { hasPermission } = usePermission()

{hasPermission(PERMISSIONS.RRF.CREATE) && (
  <Link href="/create-rrf">
    <button>Create RRF</button>
  </Link>
)}
```

---

## 5️⃣ TABLE ACTIONS

### Before (Role-Based):
```javascript
// ❌ OLD
<td>
  {user.role === 'hiring-manager' && <button>Edit</button>}
  {user.role === 'pmo' && <button>Delete</button>}
  {user.role === 'approver' && <button>Approve</button>}
</td>
```

### After (Permission-Based):
```javascript
// ✅ NEW
import { usePermission } from '@/hooks/usePermission'

export default function RRFTable() {
  const { canUpdateRRF, canDeleteRRF, canApprove } = usePermission()

  return (
    <td className="flex gap-2">
      {canUpdateRRF && (
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Edit
        </button>
      )}
      
      {canDeleteRRF && (
        <button className="px-4 py-2 bg-red-600 text-white rounded">
          Delete
        </button>
      )}
      
      {canApprove && (
        <button className="px-4 py-2 bg-green-600 text-white rounded">
          Approve
        </button>
      )}
    </td>
  )
}
```

---

## 6️⃣ DYNAMIC STATS/CARDS

### Show Different Stats Based on Permissions:
```javascript
import { usePermission } from '@/hooks/usePermission'
import StatCard from '@/components/StatCard'

export default function Dashboard() {
  const { canCreateRRF, canApprove, hasPermission } = usePermission()

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Show for RRF creators */}
      {canCreateRRF && (
        <StatCard
          title="My Requests"
          value="14"
          icon={<FileTextOutlined />}
          href="/my-requests"
        />
      )}

      {/* Show for approvers */}
      {canApprove && (
        <StatCard
          title="Pending Approvals"
          value="8"
          icon={<ClockCircleOutlined />}
          href="/approvals/pending"
        />
      )}

      {/* Show for PMO (has delete permission) */}
      {hasPermission('RRF.DELETE') && (
        <StatCard
          title="Total RRFs"
          value="120"
          icon={<DatabaseOutlined />}
        />
      )}
    </div>
  )
}
```

---

## 7️⃣ FORM ACCESS CONTROL

### Disable Form Fields Based on Permissions:
```javascript
import { usePermission } from '@/hooks/usePermission'

export default function RRFForm() {
  const { canUpdateRRF } = usePermission()

  return (
    <form>
      <input
        type="text"
        disabled={!canUpdateRRF}
        placeholder="Position Title"
      />
      
      <select disabled={!canUpdateRRF}>
        <option>Department</option>
      </select>

      {canUpdateRRF ? (
        <button type="submit">Save Changes</button>
      ) : (
        <div className="text-gray-500 text-sm">
          You don't have permission to edit this form
        </div>
      )}
    </form>
  )
}
```

---

## 8️⃣ NAVIGATION LINKS

### Conditional Navigation:
```javascript
import { usePermission } from '@/hooks/usePermission'
import Link from 'next/link'

export default function QuickActions() {
  const { canCreateRRF, canViewReports, canManageUsers } = usePermission()

  return (
    <div className="flex gap-4">
      {canCreateRRF && (
        <Link href="/create-rrf">
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg">
            Create RRF
          </button>
        </Link>
      )}

      {canViewReports && (
        <Link href="/reports">
          <button className="px-6 py-3 bg-purple-600 text-white rounded-lg">
            View Reports
          </button>
        </Link>
      )}

      {canManageUsers && (
        <Link href="/users">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg">
            Manage Users
          </button>
        </Link>
      )}
    </div>
  )
}
```

---

## 9️⃣ MODULE ACCESS CHECK

### Show/Hide Entire Sections:
```javascript
import { usePermission } from '@/hooks/usePermission'

export default function Dashboard() {
  const { canAccessModule } = usePermission()

  const hasRRFAccess = canAccessModule('RRF')
  const hasApprovalAccess = canAccessModule('APPROVALS')
  const hasReportsAccess = canAccessModule('REPORTS')

  return (
    <div>
      {hasRRFAccess && (
        <section className="mb-8">
          <h2>RRF Management</h2>
          {/* RRF related content */}
        </section>
      )}

      {hasApprovalAccess && (
        <section className="mb-8">
          <h2>Approvals</h2>
          {/* Approval related content */}
        </section>
      )}

      {hasReportsAccess && (
        <section className="mb-8">
          <h2>Reports & Analytics</h2>
          {/* Reports related content */}
        </section>
      )}
    </div>
  )
}
```

---

## 🔟 DEBUG PERMISSIONS

### Show Current Permissions (Development Only):
```javascript
import { usePermission } from '@/hooks/usePermission'

export default function DebugPanel() {
  const { permissions } = usePermission()

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg text-xs">
      <h3 className="font-bold mb-2">Your Permissions:</h3>
      <ul className="space-y-1">
        {permissions.map(permission => (
          <li key={permission} className="text-green-400">
            ✓ {permission}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 🎯 CHEAT SHEET

### Available Permission Flags:

```javascript
const {
  // RRF Permissions
  canCreateRRF,      // Can create RRFs
  canReadRRF,        // Can view RRFs
  canUpdateRRF,      // Can edit RRFs
  canDeleteRRF,      // Can delete RRFs
  
  // Approval Permissions
  canApprove,        // Can approve RRFs
  canReject,         // Can reject RRFs
  canViewApprovals,  // Can view approval queue
  
  // Dashboard
  canViewDashboard,  // Can view dashboard
  
  // User Management
  canManageUsers,    // Can create/edit/delete users
  
  // Reports
  canViewReports,    // Can view reports
  canExportReports,  // Can export reports
  
  // Settings
  canManageSettings, // Can modify settings
  
  // Generic Functions
  hasPermission(permission),           // Check single permission
  hasAnyPermission([permissions]),     // Check if has ANY
  hasAllPermissions([permissions]),    // Check if has ALL
  canAccessModule(moduleName),         // Check module access
  permissions,                          // Raw array

} = usePermission()
```

### Available Permission Constants:

```javascript
import { PERMISSIONS } from '@/utils/permissions'

PERMISSIONS.DASHBOARD.READ

PERMISSIONS.RRF.CREATE
PERMISSIONS.RRF.READ
PERMISSIONS.RRF.UPDATE
PERMISSIONS.RRF.DELETE

PERMISSIONS.APPROVALS.READ
PERMISSIONS.APPROVALS.APPROVE
PERMISSIONS.APPROVALS.REJECT

PERMISSIONS.USERS.CREATE
PERMISSIONS.USERS.READ
PERMISSIONS.USERS.UPDATE
PERMISSIONS.USERS.DELETE

PERMISSIONS.REPORTS.READ
PERMISSIONS.REPORTS.EXPORT

PERMISSIONS.SETTINGS.READ
PERMISSIONS.SETTINGS.UPDATE
```

---

## ✅ TESTING CHECKLIST

Test with each user:

### Hiring Manager (hm001 / hm123)
```
✅ Can see "Create RRF" button
✅ Can see "My Requests"
✅ Can see "Drafts"
✅ Cannot see "Approve" buttons
✅ Cannot see "Delete" buttons
✅ Cannot see "User Management"
```

### PMO (pmo001 / pmo123)
```
✅ Can see "Create RRF" button
✅ Can see "Delete" buttons
✅ Can see "Reports"
✅ Cannot see "Approve" buttons
✅ Cannot see "User Management"
```

### Approver (app001 / app123)
```
✅ Can see "Approvals" menu
✅ Can see "Approve" and "Reject" buttons
✅ Cannot see "Create RRF" button
✅ Cannot see "Delete" buttons
```

### HR (hr001 / hr123)
```
✅ Can see "Open for Hiring"
✅ Can see "Closed Requests"
✅ Cannot see "Create RRF" button
✅ Cannot see "Approve" buttons
✅ Cannot see "Delete" buttons
```

### Admin (admin001 / admin123)
```
✅ Can see "Users" menu
✅ Can see "Settings" menu
✅ Can see "Reports"
✅ Cannot see "Approve" buttons (business operations)
✅ Cannot see "Create RRF" button
```

---

## 🚀 QUICK MIGRATION STEPS

1. **Update any component:**
   ```javascript
   // Add import at top
   import { usePermission } from '@/hooks/usePermission'
   
   // Inside component
   const { canCreateRRF, canApprove } = usePermission()
   
   // Replace role checks
   // ❌ {user.role === 'hiring-manager' && ...}
   // ✅ {canCreateRRF && ...}
   ```

2. **Update any page:**
   ```javascript
   // Add import at top
   import ProtectedRoute from '@/components/ProtectedRoute'
   import { PERMISSIONS } from '@/utils/permissions'
   
   // Wrap content
   return (
     <ProtectedRoute requiredPermission={PERMISSIONS.RRF.CREATE}>
       {/* Your page content */}
     </ProtectedRoute>
   )
   ```

3. **Update sidebar:**
   ```javascript
   // In ClientLayout.jsx
   // Replace: import Sidebar from '@/components/Sidebar'
   import PermissionBasedSidebar from '@/components/PermissionBasedSidebar'
   
   // Replace: <Sidebar role={user.role} />
   <PermissionBasedSidebar />
   ```

---

## 💡 TIPS

1. **Use convenience flags** for common checks (`canCreateRRF`, `canApprove`)
2. **Use PERMISSIONS constants** for specific checks
3. **Always test with all user roles** before deploying
4. **Remove role checks gradually** (don't break existing functionality)
5. **Add ProtectedRoute** to sensitive pages

---

**That's it! You're now ready to implement permission-based UI throughout your app. 🎉**

📖 For more details, see `FRONTEND_RBAC_MIGRATION_GUIDE.md`
