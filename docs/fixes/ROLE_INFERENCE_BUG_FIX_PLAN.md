# Role Inference Bug Fix Plan

**Date:** 2026-04-30  
**Scope:** Frontend only — no backend, DB, or API changes  
**Priority:** Critical — identity corruption bug  

---

## Problem Statement

The frontend was deriving user *role identity* from combinations of permissions.  
This causes identity corruption: assigning an extra permission (e.g., `REPORTS.EXPORT`)
to an Approver silently re-routes them to the HR dashboard on next login.

### Root Cause

`getHomePageByPermissions()` and `PermissionBasedSidebar.getAllMenuItems()` both used  
`hasPermission('REPORTS.EXPORT') && !hasPermission('RRF.CREATE')` as a proxy for "is HR".  
Because the HR check evaluated **before** the Approver check, any Approver with `REPORTS.EXPORT`
was mistakenly treated as HR.

---

## Correct Architecture

| Concern | Source | Correct? |
|---|---|---|
| Role identity (who am I?) | `user.role?.code` from `localStorage('user')` | ✅ should be |
| Post-login route | `getHomePageByRole(roleCode)` | ✅ after fix |
| Menu item visibility | `hasPermission(...)` per item | ✅ keep |
| Button/action visibility | `hasPermission(...)` | ✅ keep |
| Dashboard type | `user.role?.code` | ✅ after fix |
| Page guard | `ProtectedRoute` + `hasPermission(...)` | ✅ keep |

Permissions must **never** determine role identity, home page route, or sidebar type.

---

## Files Changed

### 1. `rrf-portal-nextjs/hooks/usePermission.js`

**Function:** `usePermission` — return object  
**Change:** Add `user` to the returned object

**Old:** No `user` exposed  
**New:** `user` is returned alongside the existing permission helpers

**Reason:** `PermissionBasedSidebar` uses this hook. Adding `user` here lets the sidebar  
read `user.role` without adding a second `useAuth` call.

---

### 2. `rrf-portal-nextjs/app/login/page.jsx`

**Function:** `handleLogin` — post-login redirect block  
**Change:** Replace permission-based routing with role-based routing

**Old:**
```js
const homePage = data.user.permissions && data.user.permissions.length > 0
  ? getHomePageByPermissions(data.user.permissions)
  : getHomePageByRole(data.user.role?.code || data.user.role)
```

**New:**
```js
const roleCode = data.user.role?.code || data.user.role
const homePage = getHomePageByRole(roleCode)
```

**Import change:** Remove `getHomePageByPermissions` from the import line.

**Regression risk:** Low. `getHomePageByRole` already exists, already has all 5 role mappings  
(`ADMIN`, `PMO`, `APPROVER`, `HR`, `HIRING_MANAGER`), and falls back to `/hiring-manager/dashboard`.  
The old hybrid logic only called `getHomePageByRole` as a fallback anyway.

---

### 3. `rrf-portal-nextjs/components/PermissionBasedSidebar.jsx`

**Function:** `getAllMenuItems`  
**Change:** Replace all permission-inferred role flags with role-code–based flags

**Old (three separate definitions scattered through the function):**
```js
// Block 1 — dashboard route
if (hasPermission('REPORTS.EXPORT') && !canCreateRRF) { dashboardRoute = '/hr' }
else if (hasPermission('APPROVALS.APPROVE') || hasPermission('APPROVALS.REJECT')) { dashboardRoute = '/approver' }
else if (hasPermission('RRF.DELETE') && !hasPermission('USERS.CREATE')) { dashboardRoute = '/pmo' }

// Block 2 — RRF section
const isApprover = hasPermission('APPROVALS.APPROVE') || hasPermission('APPROVALS.REJECT')
const isPMO = hasPermission('RRF.DELETE') && !hasPermission('USERS.CREATE')
const isHR = hasPermission('REPORTS.EXPORT') && !hasPermission('RRF.CREATE')

// Block 3 — Reports section  
const isHR = hasPermission('REPORTS.EXPORT') && !canCreateRRF           // duplicate!
const isPMORole = hasPermission('RRF.DELETE') && !hasPermission('USERS.CREATE')  // duplicate!
const isApproverRole = hasPermission('APPROVALS.APPROVE') || ...         // duplicate!
```

**New (single source at top of function, read from user.role):**
```js
const roleCode       = user?.role?.code || user?.role
const isAdmin        = roleCode === 'ADMIN'
const isHR           = roleCode === 'HR'
const isApprover     = roleCode === 'APPROVER'
const isPMO          = roleCode === 'PMO'
const isHiringManager = roleCode === 'HIRING_MANAGER'

// Dashboard route from role
let dashboardRoute = '/hiring-manager/dashboard'
if (isHR)       dashboardRoute = '/hr'
else if (isApprover) dashboardRoute = '/approver'
else if (isPMO) dashboardRoute = '/pmo'
else if (isAdmin) dashboardRoute = '/admin'
```

All downstream `if (isApprover)`, `if (isPMO)`, `if (isHR)` etc. use these hoisted variables —  
no further changes needed in the logic that was already correct (just used wrong variables).

**Regression risk:** Low. Same logical branches. Only the variable source changes.  
Existing capability guards (`canCreateRRF`, `canViewReports`, `hasPermission(...)`) unchanged.

---

### 4. `rrf-portal-nextjs/utils/permissions.js`

**Change:** Remove `getHomePageByPermissions` function entirely

**Reason:** After the login page fix, this function is never called. It embedded the  
permission-to-role inference anti-pattern. Keeping dead inference code is a future trap.

**`getHomePageByRole` is kept unchanged** — it's the correct, role-based replacement.

**Regression risk:** None. Confirmed via grep: only called from `login/page.jsx`, which  
we're also changing to not import it.

---

## Role → Route Mapping (Preserved)

| Role Code | Route |
|---|---|
| `ADMIN` | `/admin` |
| `PMO` | `/pmo` |
| `APPROVER` | `/approver` |
| `HR` | `/hr` |
| `HIRING_MANAGER` | `/hiring-manager/dashboard` |
| *(unknown/fallback)* | `/hiring-manager/dashboard` |

Source: `getHomePageByRole` in `utils/permissions.js` (unchanged).

---

## What Is NOT Changed

- Backend code — none
- Database schema — none
- Permission names/codes — none
- `ProtectedRoute` component — unchanged (uses `hasPermission` correctly for page guards)
- `admin/layout.jsx` — unchanged (already uses `user.role?.code === 'ADMIN'` correctly)
- `AdminSidebar.jsx` — unchanged (static menu, no permission inference)
- `AuthContext.jsx` — unchanged
- Any dashboard page (hr, pmo, approver, hiring-manager) — unchanged
- All button/action visibility logic using `hasPermission` — unchanged
- `canAccessRoute()` in `utils/permissions.js` — already dead code, left as-is (no harm)

---

## Regression Validation Checklist

| Case | Role | Extra Permission | Expected Route | Expected Sidebar |
|---|---|---|---|---|
| 1 | APPROVER | — | `/approver` | Approver sidebar |
| 2 | APPROVER | REPORTS.EXPORT | `/approver` | Approver sidebar + export button visible |
| 3 | PMO | REPORTS.EXPORT | `/pmo` | PMO sidebar |
| 4 | HR | — | `/hr` | HR sidebar |
| 5 | ADMIN | — | `/admin` | Admin sidebar |
| 6 | HIRING_MANAGER | — | `/hiring-manager/dashboard` | HM sidebar |

---

## Admin Area — No Change Required

`app/admin/layout.jsx` already correctly reads:
```js
const roleCode = user.role?.code || user.role
if (roleCode !== 'ADMIN') { router.push('/login') }
```

This is the correct, role-first pattern. No modification needed.
