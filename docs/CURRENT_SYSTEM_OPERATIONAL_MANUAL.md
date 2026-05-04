# CURRENT SYSTEM OPERATIONAL MANUAL

## RRF Portal — Enterprise Operations Reference

**Document Type:** Runtime Truth Documentation — Read-Only Forensic Analysis  
**Date:** May 4, 2026  
**Sources:** All findings verified from actual codebase. Every claim has a file reference.

---

## TABLE OF CONTENTS

1. [System Overview](#section-1--system-overview)
2. [User Lifecycle](#section-2--user-lifecycle)
3. [Role & Permission Lifecycle](#section-3--role--permission-lifecycle)
4. [Login & Session Lifecycle](#section-4--login--session-lifecycle)
5. [Sidebar & Dashboard Visibility Logic](#section-5--sidebar--dashboard-visibility-logic)
6. [Full Request Lifecycle](#section-6--full-request-lifecycle)
7. [Scope / Subfunction Model](#section-7--scope--subfunction-model)
8. [Notification Operational Flow](#section-8--notification-operational-flow)
9. [Reports Operational Flow](#section-9--reports-operational-flow)
10. [Hidden Business Rules](#section-10--hidden-business-rules)
11. [Runtime Truth Summary](#section-11--runtime-truth-summary)

---

## SECTION 1 — SYSTEM OVERVIEW

### 1.1 What the System Does

The RRF (Resource Requisition Form) Portal manages the lifecycle of hiring requisitions within an enterprise. A Hiring Manager creates a request for headcount, which flows through approval, PMO processing, and HR fulfillment until the position is closed.

### 1.2 Technology Stack

| Layer | Technology | File Reference |
|-------|-----------|---------------|
| Frontend | Next.js 14 (App Router) + Ant Design + Tailwind CSS | `rrf-portal-nextjs/package.json` |
| Backend | NestJS + TypeORM + PostgreSQL | `rrf-portal-backend/package.json` |
| Auth | JWT via passport-jwt + bcrypt | `rrf-portal-backend/src/auth/` |
| Real-time | Socket.IO (WebSocket) | `rrf-portal-backend/src/notifications/notifications.gateway.ts` |
| Events | NestJS EventEmitter2 | `rrf-portal-backend/src/rrf/rrf.service.ts` |

### 1.3 Major Modules

| Module | Backend Path | Frontend Path | Purpose |
|--------|-------------|--------------|---------|
| Auth | `src/auth/` | `app/login/` | Login, JWT generation, token validation |
| Users | `src/users/` | `app/admin/users/` | User CRUD, role assignment |
| Roles | `src/roles/` | `app/admin/roles/` | Role listing |
| Permissions | `src/permissions/` | — | Permission management |
| Role-Permissions | `src/role-permissions/` | `app/admin/roles/` | Permission assignment to roles |
| Modules | `src/modules/` | — | Module metadata (grouping for permissions) |
| Functions | `src/functions/` | — | Organizational function hierarchy |
| Subfunctions | `src/subfunctions/` | — | Sub-function under functions |
| User-Subfunctions | `src/user-subfunctions/` | `app/admin/users/` | Approver ↔ subfunction mapping |
| RRF | `src/rrf/` | `app/*/` | Core business: request CRUD + workflow |
| Job Descriptions | `src/job-descriptions/` | — | Template library for positions |
| Reports | `src/reports/` | `app/*/reports/` | KPI calculations and data export |
| Notifications | `src/notifications/` | `contexts/NotificationContext.jsx` | Event-driven notification system |

### 1.4 Actor Types (Roles)

| Role Code | Role Name | Primary Function |
|-----------|-----------|-----------------|
| `HIRING_MANAGER` | Hiring Manager | Creates and submits requisition requests |
| `APPROVER` | Approver | Reviews and approves/declines requests in assigned subfunctions |
| `PMO` | PMO | Processes approved requests — opens for hiring or fills from bench |
| `HR` | HR | Manages open-for-hiring positions and closes them |
| `ADMIN` | Admin | System administration — users, roles, permissions, all RRF oversight |

### 1.5 Core Entities

| Entity | Table | Key Fields | File Reference |
|--------|-------|-----------|---------------|
| User | `users` | id, userId, email, passwordHash, fullName, department, role_id, isActive, technologies | `src/users/user.entity.ts` |
| Role | `roles` | id, roleName, roleCode, priority, isActive | `src/roles/role.entity.ts` |
| Module | `modules` | id, moduleCode, moduleName, routePath, icon, displayOrder, parentModuleId | `src/modules/module.entity.ts` |
| Permission | `permissions` | id, moduleId, permissionCode, permissionName, isActive | `src/permissions/permission.entity.ts` |
| RolePermission | `role_permissions` | id, roleId, permissionId, grantedAt | `src/role-permissions/role-permission.entity.ts` |
| Function | `functions` | id, name, isActive | `src/functions/` |
| Subfunction | `subfunctions` | id, name, functionId, isActive, displayOrder | `src/subfunctions/subfunction.entity.ts` |
| UserSubfunction | `user_subfunctions` | id, userId, subfunctionId, assignedAt | `src/user-subfunctions/user-subfunction.entity.ts` |
| Rrf | `rrfs` | id, subId, rrfNumber, positionTitle, status, createdById, subfunctionId, + 40 more fields | `src/rrf/entities/rrf.entity.ts` |
| RrfApprover | `rrf_approvers` | id, rrfId, userId, approvalLevel, approvalStatus, approvalOrder, comments | `src/rrf/entities/rrf-approver.entity.ts` |
| Notification | `notifications` | id, userId, title, message, type, priority, entityType, entityId, isRead, actionUrl | `src/notifications/notification.entity.ts` |
| JobDescription | `job_descriptions` | id, title, description, subFunction | `src/job-descriptions/` |
| RrfFormConfig | `rrf_form_configs` | id, fieldName, config | `src/rrf/entities/rrf-form-config.entity.ts` |

### 1.6 Entity Relationships

```
User ──(ManyToOne)──► Role
User ──(OneToMany)──► UserSubfunction ──(ManyToOne)──► Subfunction ──(ManyToOne)──► Function
Role ──(ManyToMany via role_permissions)──► Permission ──(ManyToOne)──► Module
Rrf ──(ManyToOne)──► User (createdBy)
Rrf ──(ManyToOne)──► Subfunction (via subfunctionId)
Rrf ──(OneToMany)──► RrfApprover ──(ManyToOne)──► User
Notification ──(ManyToOne)──► User
```

---

## SECTION 2 — USER LIFECYCLE

### 2.1 Create User Flow

**API:** `POST /users`  
**Permission:** `USERS.CREATE`  
**Controller:** `rrf-portal-backend/src/users/users.controller.ts`  
**Service:** `rrf-portal-backend/src/users/users.service.ts:createUser()`  
**Frontend:** `rrf-portal-nextjs/app/admin/users/page.jsx`

#### Fields

| Field | Type | Required | Validation | Default |
|-------|------|----------|-----------|---------|
| userId | string | ✅ | Unique, max 50 chars | — |
| email | string | ✅ | Unique, valid email | — |
| password | string | ✅ | Min 4 chars | — |
| fullName | string | ✅ | Max 100 chars | — |
| roleId | number | ✅ | Must exist in roles table | — |
| department | string | ❌ | Max 100 chars | null |
| phone | string | ❌ | Max 20 chars | null |
| subfunctionIds | number[] | Conditional | **Required if role is APPROVER** | [] |
| technologies | string[] | ❌ | Array of strings | [] |

**Source:** `rrf-portal-backend/src/users/dto/create-user.dto.ts`

#### Sequence

```
Admin fills form → POST /users
  1. Check duplicate userId → 409 ConflictException
  2. Check duplicate email → 409 ConflictException
  3. Validate role exists by roleId → 400 BadRequestException
  4. IF role.roleCode === 'APPROVER' AND subfunctionIds empty → 400 BadRequestException
  5. Hash password (bcrypt, 10 salt rounds)
  6. Create user entity with role relation
  7. Save user → DB INSERT
  8. IF subfunctionIds provided → assignSubfunctions(userId, subfunctionIds)
     → DELETE existing user_subfunctions for userId
     → INSERT new user_subfunctions rows
  9. Emit 'user.created' event → Notification sent to user + all ADMINs
  10. Return user (without passwordHash) + subfunctions
```

**File:** `rrf-portal-backend/src/users/users.service.ts:115-182`

### 2.2 Update User Flow

**API:** `PUT /users/:id`  
**Permission:** `USERS.UPDATE`  
**Service:** `rrf-portal-backend/src/users/users.service.ts:updateUser()`

#### Updatable Fields

| Field | Behavior |
|-------|---------|
| roleId | Validates role exists. If changed to APPROVER, subfunctions required |
| isActive | Enables/disables user. Disabled users cannot log in |
| fullName | Direct update |
| department | Direct update |
| phone | Direct update |
| technologies | Direct update (JSONB array) |
| subfunctionIds | Replaces ALL existing subfunction assignments |

#### Notification Emission Logic

The service detects WHAT changed and emits the appropriate event:

| Change Detected | Event | Recipients |
|----------------|-------|-----------|
| roleId changed | `user.role-changed` | Target user |
| isActive: false→true | `user.activated` | Target user |
| isActive: true→false | `user.deactivated` | All ADMINs |
| subfunctionIds changed | `user.subfunctions-changed` | Target user |
| Other fields only | `user.updated` | Target user |

**File:** `rrf-portal-backend/src/users/users.service.ts:252-310`

### 2.3 Subfunction Assignment

**Method:** `assignSubfunctions(userId, subfunctionIds)` (private)  
**Behavior:** **Full replacement** — deletes ALL existing assignments, then inserts new ones.

```sql
DELETE FROM user_subfunctions WHERE user_id = :userId;
INSERT INTO user_subfunctions (user_id, subfunction_id) VALUES (...);
```

**File:** `rrf-portal-backend/src/users/users.service.ts:327-340`

### 2.4 Activation / Deactivation

- Setting `isActive = false` does NOT delete the user
- Deactivated users are rejected at JWT validation: `jwt.strategy.ts:23-25` checks `user.isActive`
- Deactivated users remain in DB for audit trail
- Their permissions remain mapped but become unenforceable

### 2.5 There Is No Delete User Endpoint

No `DELETE /users/:id` exists. Users can only be deactivated.

---

## SECTION 3 — ROLE & PERMISSION LIFECYCLE

### 3.1 Permission Architecture

```
Module (e.g., "RRF")
  └── Permission (e.g., "CREATE", "READ", "UPDATE", "DELETE")
       → Stored as: "RRF.CREATE", "RRF.READ" etc.
       
Role (e.g., "HIRING_MANAGER")
  └── RolePermission → links to Permission IDs
```

### 3.2 Module List (from DB)

| Module Code | Typical Permissions |
|------------|-------------------|
| DASHBOARD | READ |
| RRF | CREATE, READ, UPDATE, DELETE, OPEN_FOR_HIRING, FILL_FROM_BENCH, CLOSE |
| APPROVALS | READ, APPROVE, REJECT, ON_HOLD |
| USERS | CREATE, READ, UPDATE, DELETE |
| ROLES | READ, UPDATE |
| REPORTS | READ, EXPORT |
| SETTINGS | READ, UPDATE |
| FORM_CONFIG | READ, CREATE, UPDATE, DELETE |

**Source:** `rrf-portal-nextjs/utils/permissions.js:78-133`

### 3.3 Role → Permission Assignment Flow

**Frontend:** `rrf-portal-nextjs/app/admin/roles/page.jsx`  
**API:** `PUT /roles/:roleId/permissions`  
**Permission required:** `ROLES.UPDATE`  
**Controller:** `rrf-portal-backend/src/role-permissions/role-permissions.controller.ts`  
**Service:** `rrf-portal-backend/src/role-permissions/role-permissions.service.ts`

#### Sequence

```
1. Admin opens Roles page → GET /users/roles (list all roles)
2. Admin clicks "Edit Permissions" on a role → GET /roles/:roleId/permissions
3. Admin sees checkbox grid of all permissions grouped by module
   → GET /permissions (all active permissions with modules)
4. Admin toggles checkboxes, clicks "Save"
5. Frontend sends PUT /roles/:roleId/permissions { permissionIds: [1, 2, 5, 8, ...] }
6. Backend:
   a. Validate role exists → 404 if not
   b. Deduplicate permissionIds
   c. Validate all permission IDs exist → 400 if any invalid
   d. BEGIN TRANSACTION
      - DELETE FROM role_permissions WHERE role_id = :roleId
      - INSERT INTO role_permissions (role_id, permission_id) VALUES ... for each ID
   e. COMMIT
7. Return updated permissions list
```

**File:** `rrf-portal-backend/src/role-permissions/role-permissions.service.ts:70-98`

### 3.4 Role Inheritance

**There is no role inheritance.** Each role is independent. No parent-child hierarchy exists. The `role.entity.ts` has no `parentId` column.

### 3.5 Permission Inheritance

**There is no permission inheritance.** Each permission must be explicitly assigned to each role. Having `RRF.READ` does NOT automatically grant `DASHBOARD.READ`.

### 3.6 New Role Creation

**There is no role creation endpoint in the backend.** The `roles.service.ts` only has `findAll()`. Roles are currently seeded and managed via direct DB operations.

**File:** `rrf-portal-backend/src/roles/roles.service.ts` — only `findAll()` method exists.

### 3.7 JWT Permission Loading

Permissions are loaded at login time via a SQL query:

```sql
SELECT DISTINCT CONCAT(m.module_code, '.', p.permission_code) as permission_code
FROM users u
INNER JOIN roles r ON u.role_id = r.id
INNER JOIN role_permissions rp ON r.id = rp.role_id
INNER JOIN permissions p ON rp.permission_id = p.id
INNER JOIN modules m ON p.module_id = m.id
WHERE u.id = $1
  AND u.is_active = true AND r.is_active = true
  AND p.is_active = true AND m.is_active = true
```

**Result:** Array of strings `["DASHBOARD.READ", "RRF.CREATE", "RRF.READ", ...]`

**File:** `rrf-portal-backend/src/permissions/permissions.service.ts:13-28`

### 3.8 Frontend Permission Usage

**Hook:** `rrf-portal-nextjs/hooks/usePermission.js`

```javascript
const { hasPermission, canCreateRRF, canApprove, canViewReports, ... } = usePermission()
```

Reads from `AuthContext` → which reads from `localStorage`.

**Utility:** `rrf-portal-nextjs/utils/permissions.js`

```javascript
hasPermission('RRF.CREATE', userPermissions)  // → true/false (array.includes)
canAccessModule('RRF', userPermissions)        // → true if any RRF.* permission exists
```

### 3.9 Backend Permission Enforcement

**Every API request** goes through:

1. `JwtAuthGuard` → validates token, loads fresh user from DB
2. `PermissionGuard` → reads `@RequirePermission('XXX.YYY')` decorator → queries DB for user's current permissions

The backend ALWAYS queries the database for current permissions. It does NOT trust the JWT payload.

**File:** `rrf-portal-backend/src/guards/permission.guard.ts`

---

## SECTION 4 — LOGIN & SESSION LIFECYCLE

### 4.1 Login Flow

```
User enters userId + password on login page
  → POST /auth/login (rate limited: 5 per 60 seconds)
  → LocalAuthGuard triggers
  → local.strategy.ts calls AuthService.validateUser(userId, password)
  → UsersService.findByUserId(userId) — loads user with role relation
  → IF user is null OR user.isActive is false → return null → 401 Unauthorized
  → bcrypt.compare(password, user.passwordHash)
  → IF mismatch → return null → 401 Unauthorized
  → AuthService.login(user):
      1. PermissionsService.getUserPermissions(user.id) → SQL query
      2. UsersService.updateLastLogin(user.id)
      3. JWT signed: { userId: user.id, sub: user.id, roleCode: user.role.roleCode }
      4. Return { success: true, access_token, user: { id, userId, name, email, role: {id, code, name}, department, permissions: [...] } }
```

**Files:**  
- `rrf-portal-backend/src/auth/auth.controller.ts:17`
- `rrf-portal-backend/src/auth/auth.service.ts:14-48`
- `rrf-portal-backend/src/auth/local.strategy.ts`

### 4.2 Token Payload

```json
{
  "userId": 3,
  "sub": 3,
  "roleCode": "HIRING_MANAGER",
  "iat": 1714790400,
  "exp": 1714876800
}
```

**IMPORTANT:** Permissions are NOT in the JWT. Only `roleCode` is present.  
Permissions are returned in the login response body, stored in `localStorage`, and consumed by the frontend.

### 4.3 Frontend Storage

| Key | Content | File |
|-----|---------|------|
| `token` | JWT string | `contexts/AuthContext.jsx:69` |
| `user` | JSON: `{id, userId, name, email, role: {id,code,name}, department, permissions: [...]}` | `contexts/AuthContext.jsx:70` |
| `permissions` | JSON array: `["DASHBOARD.READ", "RRF.CREATE", ...]` | `contexts/AuthContext.jsx:71` |

### 4.4 Session Validation on Page Load

When user refreshes or opens a new tab:

```
AuthContext useEffect runs:
  1. Read token, user, permissions from localStorage
  2. Parse user JSON, merge permissions
  3. Set user state → app renders
  NO token verification call is made to backend
```

**File:** `rrf-portal-nextjs/contexts/AuthContext.jsx:16-47`

### 4.5 Token Refresh

**There is no token refresh mechanism.** The JWT has a fixed expiry. When it expires:
- Backend returns 401
- Frontend `apiConfig.js:handleUnauthorized()` clears localStorage and dispatches a storage event
- `ClientLayout.jsx` detects missing user → redirects to `/login`

**File:** `rrf-portal-nextjs/lib/api/apiConfig.js:22-31`

### 4.6 Logout Flow

```
1. AuthContext.logout() called
2. clearAllCache() — wipes useSmartFetch cache
3. localStorage.removeItem('token', 'user', 'permissions')
4. setUser(null)
5. router.push('/login')
```

**File:** `rrf-portal-nextjs/contexts/AuthContext.jsx:83-89`

### 4.7 Stale Permission Issue

If an Admin changes a role's permissions while a user is logged in:
- **Backend:** Immediately enforced. PermissionGuard queries DB on every request.
- **Frontend:** NOT updated until user logs out and back in. Sidebar, buttons, and dashboard render based on stale `localStorage` data.

The `updatePermissions()` method exists in AuthContext but is never called automatically:

```javascript
const updatePermissions = (newPermissions) => {
  if (user && Array.isArray(newPermissions)) {
    const updatedUser = { ...user, permissions: newPermissions }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    localStorage.setItem('permissions', JSON.stringify(newPermissions))
    setUser(updatedUser)
  }
}
```

**File:** `rrf-portal-nextjs/contexts/AuthContext.jsx:91-97`

### 4.8 Post-Login Redirect

After successful login:
```javascript
const roleCode = data.user.role?.code || data.user.role
const homePage = getHomePageByRole(roleCode)
router.push(homePage)
```

`getHomePageByRole()` maps:

| roleCode | Redirect Path |
|----------|--------------|
| `HIRING_MANAGER` | `/hiring-manager/dashboard` |
| `PMO` | `/pmo` |
| `APPROVER` | `/approver` |
| `HR` | `/hr` |
| `ADMIN` | `/admin` |
| (unknown) | `/hiring-manager/dashboard` (fallback) |

**File:** `rrf-portal-nextjs/utils/permissions.js:136-148`

---

## SECTION 5 — SIDEBAR & DASHBOARD VISIBILITY LOGIC

### 5.1 Two Sidebar Implementations

| Sidebar | File | Used By | Logic Type |
|---------|------|---------|-----------|
| PermissionBasedSidebar | `components/PermissionBasedSidebar.jsx` | All non-admin routes | **Hybrid** (permission + role) |
| AdminSidebar | `components/admin/AdminSidebar.jsx` | Admin routes only | **100% hardcoded** static array |

### 5.2 PermissionBasedSidebar — How Each Item Is Shown/Hidden

| Menu Item | Visibility Condition | Type |
|-----------|---------------------|------|
| Dashboard | `hasPermission('DASHBOARD.READ')` | Permission ✅ |
| Dashboard route | `if (isHR) '/hr'; else if (isApprover) '/approver'...` | **Role identity** ❌ |
| Requests (HM variant) | `hasPermission('RRF.READ') && !isApprover && !isPMO && !isHR` | **Hybrid** |
| Requests (PMO variant) | `isPMO` | **Role identity** ❌ |
| Drafts | `canCreateRRF && !isPMO` | **Hybrid** |
| Reports | `canViewReports && !isHR && (isPMO \|\| isApprover)` | **Hybrid** |
| Edit Form | `isPMO` | **Role identity** ❌ |
| Users | `canManageUsers` | Permission ✅ |
| Settings | `canManageSettings` | Permission ✅ |

**File:** `rrf-portal-nextjs/components/PermissionBasedSidebar.jsx:40-145`

### 5.3 AdminSidebar — Static Menu

```javascript
const menuItems = [
  { key: '/admin', label: 'Dashboard', href: '/admin' },
  { key: '/admin/users', label: 'Users', href: '/admin/users' },
  { key: '/admin/roles', label: 'Roles', href: '/admin/roles' },
  { key: '/admin/rrf-management', label: 'RRF', href: '/admin/rrf-management' },
  { key: '/admin/form-config', label: 'Form Config', href: '/admin/form-config' },
  { key: '/admin/reports', label: 'Reports', href: null, disabled: true },
  { key: '/admin/audit-logs', label: 'Audit Logs', href: null, disabled: true },
]
```

No permission checks. All items always shown (some disabled). Only the Admin layout role-gate prevents non-admins from seeing this.

**File:** `rrf-portal-nextjs/components/admin/AdminSidebar.jsx:14-22`

### 5.4 Admin Layout Gate

```javascript
// app/admin/layout.jsx:49-51
if (!loading && user) {
  const roleCode = user.role?.code || user.role
  if (roleCode !== 'ADMIN') {
    router.push('/unauthorized')
  }
}
```

This is a **hardcoded role check**, not permission-based.

### 5.5 ClientLayout — Route Layout Selection

```
IF pathname === '/login' → render children only (no sidebar)
IF pathname starts with '/admin' → render children only (admin has its own layout)
ELSE → render PermissionBasedSidebar + Header + children
```

**File:** `rrf-portal-nextjs/components/ClientLayout.jsx:68-78`

### 5.6 Dashboard Visibility — What Each Role Sees

Each role is routed to a role-specific dashboard page. The dashboard content is NOT permission-driven — it is determined by which page the role folder loads.

| Role → Dashboard | Stat Cards Shown | Table Shown | API Calls |
|-----------------|-----------------|------------|-----------|
| **Admin** → `/admin` | Total RRFs, Pending, Approved, In Progress, Closed, Total Users | None | `rrfApi.getStatistics(true)`, `usersApi.getAll()` |
| **PMO** → `/pmo` | Request Positions, Open for Hiring, Closed, Sourced Internally, Closed by Business, Processed | Recent open positions (top 5) | `rrfApi.getPMODashboardStats()`, `rrfApi.getOpenPositions()` |
| **HR** → `/hr` | Open Positions, Positions Filled, Closed Requests | Open for hiring list | `rrfApi.getAll({limit:1000})`, `rrfApi.getOpenForHiring()` |
| **Approver** → `/approver` | Pending, Per-status counts from statistics | Pending approvals (top 5) | `rrfApi.getPendingApprovals()`, `rrfApi.getStatistics(true)` |
| **HM** → `/hiring-manager/dashboard` | In Progress, Pending Approval, Approved, On Hold, Declined, All Submissions | Recent requests (top 6) | `useRRFStatistics(false)`, `useMyRequests()` |

---

## SECTION 6 — FULL REQUEST LIFECYCLE

### 6.1 RRF Statuses (Enum)

| Status | Code | Description |
|--------|------|-------------|
| Draft | `draft` | Initial state when HM creates |
| Pending | `pending` | Submitted for approval |
| Submitted | `submitted` | Alias for pending (backward compat) |
| Approved | `approved` | Approver approved |
| Declined | `declined` | Approver declined (can resubmit) |
| Rejected | `rejected` | Approver rejected (backward compat alias) |
| On Hold | `on-hold` | Approver put on hold |
| In Progress | `in-progress` | PMO opened for hiring (sent to HR) |
| Open for Hiring | `open-for-hiring` | Deprecated alias for in-progress |
| Closed by Bench | `closed-by-bench` | PMO filled from bench (legacy) |
| Closed | `closed` | Final state — position filled or cancelled |

**File:** `rrf-portal-backend/src/rrf/entities/rrf.entity.ts:32-44`

### 6.2 RRF ID System

| ID Type | Format | When Generated | Purpose |
|---------|--------|---------------|---------|
| subId | `REQ-001`, `REQ-002` | At creation | Internal tracking number |
| rrfNumber | `RRF-001`, `RRF-002` | When PMO clicks "Open for Hiring" | External tracking number |
| internalRrfNo | `RRF-INT-001` | When closed as "Sourced Internally" or filled by bench | Internal fulfillment tracking |

Sequences are PostgreSQL `nextval()` based, synced to max existing values at startup.

**File:** `rrf-portal-backend/src/rrf/rrf.service.ts:131-143`

### 6.3 Complete Lifecycle — Sequence Diagram

```
HIRING MANAGER                SYSTEM              APPROVER            PMO                  HR
     │                          │                    │                 │                    │
     │──── Create RRF ─────────►│                    │                 │                    │
     │     (DRAFT, REQ-xxx)     │                    │                 │                    │
     │                          │                    │                 │                    │
     │──── Submit ─────────────►│                    │                 │                    │
     │                          │──Auto-assign───►   │                 │                    │
     │                          │  approvers by      │                 │                    │
     │                          │  subfunction       │                 │                    │
     │                          │                    │                 │                    │
     │                          │◄── Notify ────────►│                 │                    │
     │                          │  (PENDING)         │                 │                    │
     │                          │                    │                 │                    │
     │                          │              ┌─────┤                 │                    │
     │                          │              │ APPROVE               │                    │
     │                          │              │  → APPROVED           │                    │
     │◄── Notify (approved) ────│◄─────────────┘    │───Notify───────►│                    │
     │                          │                    │   (to PMO)      │                    │
     │                          │              ┌─────┤                 │                    │
     │                          │              │ DECLINE               │                    │
     │                          │              │  → DECLINED           │                    │
     │◄── Notify (declined) ────│◄─────────────┘    │                 │                    │
     │                          │                    │                 │                    │
     │──── Resubmit ───────────►│                    │                 │                    │
     │     (DECLINED→PENDING)   │──Reset approvers──►│                 │                    │
     │                          │                    │                 │                    │
     │                          │                    │           ┌─────┤                    │
     │                          │                    │           │ OPEN FOR HIRING          │
     │                          │                    │           │  → IN_PROGRESS           │
     │                          │                    │           │  RRF-xxx generated       │
     │◄── Notify ──────────────│◄───────────────────│───────────┘─────│──── Notify ───────►│
     │                          │                    │                 │                    │
     │                          │                    │           ┌─────┤                    │
     │                          │                    │           │ FILL BY BENCH            │
     │                          │                    │           │  → CLOSED                │
     │◄── Notify ──────────────│◄───────────────────│◄──Notify──┘     │                    │
     │                          │                    │                 │                    │
     │                          │                    │                 │              ┌─────┤
     │                          │                    │                 │              │ CLOSE
     │                          │                    │                 │              │  → CLOSED
     │◄── Notify ──────────────│◄───────────────────│─────────────────│◄─────────────┘     │
```

### 6.4 Complete Transition Matrix

| # | Action | Actor | Entry Status | Exit Status | API Endpoint | Permission | Service Method | Key Validations | Auto-Actions | Notification Recipients |
|---|--------|-------|-------------|-------------|-------------|-----------|----------------|-----------------|-------------|------------------------|
| 1 | **Create** | Any (HM/PMO) | — | DRAFT | `POST /rrf` | `RRF.CREATE` | `create()` | Budget min ≤ max, Exp min ≤ max | subId generated (REQ-xxx). Save-as-template optional. | Creator |
| 2 | **Submit (HM, first)** | HM (creator) | DRAFT | PENDING | `POST /rrf/:id/submit` | `RRF.UPDATE` | `submit()` | Must be creator. Must have ≥1 approver. | Approvers auto-assigned from `user_subfunctions` by subFunctionId. submittedAt set. | Assigned approvers |
| 3 | **Submit (PMO, direct)** | PMO | DRAFT | IN_PROGRESS | `POST /rrf/:id/submit` | `RRF.UPDATE` | `submit()` | `user.role.roleCode === 'PMO'` | Skips approval. rrfNumber generated. sentToHrAt set. | Creator + HR role |
| 4 | **Resubmit** | HM (creator) | DECLINED/REJECTED | PENDING | `POST /rrf/:id/submit` | `RRF.UPDATE` | `submit()` | Must be creator. | Existing approver records reset to PENDING. declineReason cleared. | Assigned approvers |
| 5 | **Approve** | Assigned approver | PENDING | APPROVED | `POST /rrf/:id/approve` | `APPROVALS.APPROVE` | `approve()` | Must be assigned approver with `approvalStatus=PENDING`. | Other pending approvers set to SKIPPED. approvedByName set. | Creator + PMO role |
| 6 | **Reject** | Assigned approver | PENDING | REJECTED | `POST /rrf/:id/reject` | `APPROVALS.REJECT` | `reject()` | Must be assigned approver. Comments required (implicitly). | rejectedAt set. | Creator |
| 7 | **Decline** | Assigned approver | PENDING | DECLINED | `POST /rrf/:id/decline` | `APPROVALS.APPROVE` | `decline()` | Must be assigned approver. Reason required (non-empty). Status must be PENDING. | declinedByName set. declineReason stored. | Creator |
| 8 | **Put On Hold** | Assigned approver | PENDING | ON_HOLD | `POST /rrf/:id/on-hold` | `APPROVALS.ON_HOLD` | `putOnHold()` | Must be assigned approver. Reason required. Status must be PENDING. | onHoldByName set. Reason stored in both `notes` and `declineReason`. | Creator + PMO role |
| 9 | **Open for Hiring** | PMO | APPROVED | IN_PROGRESS | `POST /rrf/:id/open-for-hiring` | `RRF.OPEN_FOR_HIRING` | `openForHiring()` | Status must be APPROVED. | rrfNumber generated (RRF-xxx). sentToHrAt set. Optimized direct UPDATE. | Creator + HR role |
| 10 | **Fill by Bench** | PMO | APPROVED/IN_PROGRESS/OPEN_FOR_HIRING | CLOSED | `POST /rrf/:id/fill-by-bench` | `RRF.FILL_FROM_BENCH` | `fillByBench()` | Valid statuses only. | internalRrfNo generated (RRF-INT-xxx). closureStatus='filled-by-bench'. | Creator + Approvers |
| 11 | **Close** | HR/PMO | IN_PROGRESS/OPEN_FOR_HIRING/APPROVED | CLOSED | `POST /rrf/:id/close` | `RRF.CLOSE` | `closeRrf()` | Valid statuses only. | closeReason derived from closureStatus. Auto-generates internalRrfNo if 'Sourced Internally'. | Creator + PMO role |
| 12 | **Update** | Creator/Approver | DRAFT/PENDING/DECLINED | (unchanged) | `PUT /rrf/:id` | `RRF.UPDATE` | `update()` | Must be creator OR assigned approver. Status must not be approved/in-progress/closed. | lastEditedById, lastEditedByRole, lastEditedAt set. | Conditional: approvers or creator |
| 13 | **Delete** | Any with permission | DRAFT/REJECTED | (removed) | `DELETE /rrf/:id` | `RRF.DELETE` | `remove()` | Status must be DRAFT or REJECTED. | Hard delete from DB. | Creator |

### 6.5 Closure Reasons

When closing via `closeRrf()`, the `closureStatus` label is mapped to a machine-readable `closeReason`:

| Human Label (closureStatus) | Machine Key (closeReason) | Special Behavior |
|-----------------------------|--------------------------|------------------|
| Resource Hired (External Candidate) | `RESOURCE_HIRED_EXTERNAL` | Standard close |
| Sourced Internally | `SOURCED_INTERNALLY` | Auto-generates `internalRrfNo` (RRF-INT-xxx) |
| Closed/Cancelled by Business | `CLOSED_BY_BUSINESS` | Standard close |

**File:** `rrf-portal-backend/src/rrf/rrf.service.ts:1282-1286`

### 6.6 Status History Tracking

Every transition appends to `rrf.statusHistory` (JSONB column):

```json
[
  { "status": "draft", "changedById": 3, "changedAt": "2026-04-10T09:00:00Z" },
  { "status": "pending", "changedById": 3, "changedAt": "2026-04-10T09:15:00Z" },
  { "status": "approved", "changedById": 5, "changedAt": "2026-04-11T14:00:00Z", "reason": "Looks good" }
]
```

### 6.7 Frontend API Layer for Workflow

| Action | Frontend Function | File |
|--------|------------------|------|
| Create | `rrfApi.create(data)` | `lib/api/rrfApi.js:97` |
| Update | `rrfApi.update(id, data)` | `lib/api/rrfApi.js:119` |
| Submit | `rrfApi.submit(id)` | `lib/api/rrfApi.js:126` |
| Approve | `rrfApi.approve(id, comments)` | `lib/api/rrfApi.js:133` |
| Reject | `rrfApi.reject(id, comments)` | `lib/api/rrfApi.js:140` |
| Decline | `rrfApi.decline(id, reason)` | `lib/api/rrfApi.js:147` |
| Put On Hold | `rrfApi.putOnHold(id, reason)` | `lib/api/rrfApi.js:154` |
| Open for Hiring | `rrfApi.openForHiring(id)` | `lib/api/rrfApi.js:161` |
| Close | `rrfApi.close(id, payload)` | `lib/api/rrfApi.js:168` |
| Delete | `rrfApi.delete(id)` | `lib/api/rrfApi.js:194` |

### 6.8 Frontend Hooks for Data

| Hook | Purpose | API Called | File |
|------|---------|-----------|------|
| `useRRFDetail(id)` | Single RRF detail | `GET /rrf/:id` | `hooks/useRRFDetail.js` |
| `useRRFStatistics(all)` | Status counts | `GET /rrf/statistics` | `hooks/useRRFStatistics.js` |
| `useMyRequests()` | HM's own RRFs (excludes drafts) | `GET /rrf/my-requests` | `hooks/useMyRequests.js` |
| `useApproverRequests(status)` | Paginated RRF list for approver | `GET /rrf?status=...` | `hooks/useApproverRequests.js` |

All hooks use `useSmartFetch` with TTL-based caching and deduplication.

---

## SECTION 7 — SCOPE / SUBFUNCTION MODEL

### 7.1 What Subfunctions Are

Subfunctions represent organizational business areas (e.g., "Cloud Engineering", "Data Analytics", "Mobile Development") grouped under Functions (e.g., "Engineering", "Operations").

### 7.2 Schema

```
functions (id, name, isActive)
  └── subfunctions (id, name, function_id, isActive, displayOrder)
       └── user_subfunctions (user_id, subfunction_id, assignedAt) [Unique constraint]
```

### 7.3 When Assigned

Subfunctions are assigned to users during **user creation or update** in the Admin Users page.

- The frontend shows a subfunction selector only when the selected role is `APPROVER`
- The backend validates: if `role.roleCode === 'APPROVER'` and no subfunctionIds provided → 400 error

**File:** `rrf-portal-backend/src/users/users.service.ts:132-135` (create), `users.service.ts:215-221` (update)

### 7.4 How Subfunctions Are Stored

```sql
-- Full replacement on every update:
DELETE FROM user_subfunctions WHERE user_id = :userId;
INSERT INTO user_subfunctions (user_id, subfunction_id) VALUES (:userId, :sfId1), (:userId, :sfId2);
```

### 7.5 How Subfunctions Filter RRF Visibility

| Context | Filter Logic | File |
|---------|-------------|------|
| **Approver: list all RRFs** | `WHERE rrf.subFunctionId IN (user's subfunctionIds)` | `rrf.service.ts:262-270` |
| **Approver: pending approvals** | Same subfunction filter | `rrf.service.ts:1349-1360` |
| **Approver: statistics** | `GROUP BY status` filtered by `subFunctionId IN (...)` | `rrf.service.ts:892-900` |
| **HM: my requests** | `WHERE rrf.createdById = userId` (no subfunction filter) | `rrf.service.ts:286` |
| **Admin: all** | No filter when `viewAll=true` | `rrf.service.ts:902` |
| **PMO/HR: dashboards** | No subfunction filter — see all relevant statuses | Various |

### 7.6 How Approvers Are Auto-Assigned to RRF

When HM submits an RRF, the system auto-assigns approvers:

```
getApprovers(subFunctionId):
  1. Query: users WHERE role.roleCode = 'APPROVER' 
            AND user_subfunctions.subfunction_id = subFunctionId
            AND user.isActive = true
  2. IF found → return these (assigned to RRF as rrf_approvers)
  3. IF none found → FALLBACK: return all active ADMIN users
  4. IF no subFunctionId → return ALL active APPROVER users
```

**File:** `rrf-portal-backend/src/rrf/rrf.service.ts:503-543`

### 7.7 Who Sees Which Requests

| Actor | Can See | Filter |
|-------|---------|--------|
| HM | Only own requests | `createdById = userId` |
| Approver | Only requests in assigned subfunctions | `subFunctionId IN (assigned subfunctions)` |
| PMO | All approved + in-progress + closed | Status filter only |
| HR | All in-progress (open-for-hiring) | Status filter only |
| Admin | Everything (when `all=true`) | No filter |

### 7.8 Who Approves Which Requests

An approver can ONLY approve/decline/hold an RRF that they are assigned to (recorded in `rrf_approvers` table). The approval methods verify:

```javascript
const approverRecord = rrf.approvers?.find(
  (a) => Number(a.userId) === numericUserId && a.approvalStatus === ApprovalStatus.PENDING
);
if (!approverRecord) throw new ForbiddenException('You are not authorized...');
```

**File:** `rrf-portal-backend/src/rrf/rrf.service.ts:720-726`

### 7.9 Fallback Logic

If NO approvers with APPROVER role are assigned to the RRF's subfunction:
- System falls back to ALL active ADMIN users as approvers
- Console warning is logged: `[WARNING] No APPROVER assigned to subFunctionId X`

**File:** `rrf-portal-backend/src/rrf/rrf.service.ts:528-530`

---

## SECTION 8 — NOTIFICATION OPERATIONAL FLOW

### 8.1 Architecture

```
Business Service (rrf.service / users.service)
  └── eventEmitter.emit('rrf.approved', { ... })
        └── NotificationListener @OnEvent('rrf.approved')
              └── NotificationRecipientResolver.resolveRrfCreator(rrfId)
              └── NotificationRecipientResolver.resolveByRole('PMO')
              └── NotificationTemplateService.getTemplate('RRF_APPROVED')
              └── NotificationTemplateService.render(template, vars)
              └── NotificationsService.createMany(notifications)
              └── NotificationsGateway.sendToUsers(recipientIds, notification) [WebSocket]
```

### 8.2 Complete Notification Matrix

| Event | Trigger | Recipients | Template Title | Action URL | Priority |
|-------|---------|-----------|---------------|------------|----------|
| `rrf.created` | HM/PMO creates RRF | Creator | "RRF Created" | `/hiring-manager/view-rrf/:id` | LOW |
| `rrf.submitted` | HM submits (first time) | Assigned approvers | "New RRF Awaiting Approval" | `/approver/review/:id` | HIGH |
| `rrf.resubmitted` | HM resubmits after decline | Assigned approvers | "RRF Resubmitted" | `/approver/review/:id` | HIGH |
| `rrf.approved` | Approver approves | Creator + all PMO users | "RRF Approved" | `/pmo/view-rrf/:id` | HIGH |
| `rrf.rejected` | Approver rejects | Creator | "RRF Rejected" | `/hiring-manager/view-rrf/:id` | HIGH |
| `rrf.declined` | Approver declines | Creator | "RRF Declined" | `/hiring-manager/view-rrf/:id` | HIGH |
| `rrf.on-hold` | Approver puts on hold | Creator + all PMO users | "RRF Put On Hold" | `/hiring-manager/view-rrf/:id` | MEDIUM |
| `rrf.opened-for-hiring` | PMO opens for hiring | Creator + all HR users | "RRF Opened for Hiring" | `/hr/view-rrf/:id` | HIGH |
| `rrf.filled-by-bench` | PMO fills from bench | Creator + assigned approvers | "RRF Filled from Bench" | `/pmo/view-rrf/:id` | MEDIUM |
| `rrf.closed` | HR/PMO closes | Creator + all PMO users | "RRF Closed" | `/pmo/view-rrf/:id` | MEDIUM |
| `rrf.updated` | Creator/Approver edits | Conditional (approvers or creator) | "RRF Updated" | `/hiring-manager/view-rrf/:id` | LOW |
| `rrf.deleted` | PMO deletes | Creator | (deletion confirm) | — | LOW |
| `user.created` | Admin creates user | New user + all ADMINs | "Welcome" | — | MEDIUM |
| `user.updated` | Admin updates user | Target user | "Profile Updated" | — | LOW |
| `user.role-changed` | Admin changes role | Target user | "Role Changed" | — | MEDIUM |
| `user.activated` | Admin activates | Target user | "Account Activated" | — | MEDIUM |
| `user.deactivated` | Admin deactivates | All ADMINs | "Account Deactivated" | — | MEDIUM |
| `user.subfunctions-changed` | Subfunctions updated | Target user | "Subfunctions Updated" | — | MEDIUM |

**Files:**
- Event emission: `rrf-portal-backend/src/rrf/rrf.service.ts` (throughout)
- Listener: `rrf-portal-backend/src/notifications/notification.listener.ts`
- Resolver: `rrf-portal-backend/src/notifications/notification-recipient.resolver.ts`
- Templates: `rrf-portal-backend/src/notifications/notification-template.service.ts`

### 8.3 Recipient Resolution

| Method | Logic |
|--------|-------|
| `resolveByUserId(id)` | Returns `[id]` |
| `resolveRrfCreator(rrfId)` | Queries `rrfs.createdById` |
| `resolveRrfApprovers(rrfId)` | Queries `rrf_approvers.userId` where `rrfId` matches |
| `resolveByRole(roleCode)` | Queries all active users with matching `role.roleCode` |
| `deduplicateAndExcludeActor(ids, actorId)` | Removes duplicates and the acting user |

**File:** `rrf-portal-backend/src/notifications/notification-recipient.resolver.ts`

### 8.4 Frontend Notification Consumption

- `NotificationContext.jsx` connects via Socket.IO to backend WebSocket gateway
- Unread count displayed in `NotificationBell` component in header
- Dropdown shows 10 most recent notifications
- Click → marks as read and navigates to `actionUrl`

**File:** `rrf-portal-nextjs/contexts/NotificationContext.jsx`

### 8.5 Deduplication

Notifications have a `dedupeKey` column with a unique partial index. The service checks for duplicates within 60 seconds before creating.

**File:** `rrf-portal-backend/src/notifications/notifications.service.ts:97`

---

## SECTION 9 — REPORTS OPERATIONAL FLOW

### 9.1 Available KPIs

| KPI | Data Source | Formula | Statuses |
|-----|-----------|---------|----------|
| Revenue Loss | IN_PROGRESS RRFs past billingStartDate | `billingRate × headcount × delayDays` | `in-progress` |
| Average Delay | IN_PROGRESS RRFs past expectedOnboardingDate | Average days overdue | `in-progress` |
| Sourced Internally | CLOSED with closeReason=SOURCED_INTERNALLY | Count | `closed` |
| Opportunity Lost | CLOSED with closeReason=CLOSED_BY_BUSINESS | Count | `closed` |
| Avg Closing Time | CLOSED with closeReason=RESOURCE_HIRED_EXTERNAL | Days from sentToHrAt to joiningDate | `closed` |

### 9.2 Endpoints

| Endpoint | Method | Permission | Purpose |
|----------|--------|-----------|---------|
| `/reports/kpis` | GET | `RRF.READ` | Returns 5 KPI aggregation cards |
| `/reports/dataset` | GET | `RRF.READ` | Paginated RRF data with KPI filters |
| `/reports/export/current` | GET | `RRF.READ` | Export current filtered view |
| `/reports/export/full` | GET | `RRF.READ` | Export all reportable RRFs |

### 9.3 Access Control

- **No role-based filtering** in reports service
- Only permission gate: `@RequirePermission('RRF.READ')`
- All users with `RRF.READ` see the same report data (IN_PROGRESS + CLOSED RRFs)
- No per-department or per-subfunction filtering in reports

### 9.4 Filters Supported

- `status`: Filter by RRF status
- `closeReason`: Filter by closure reason
- `search`: Search across rrfNumber, customerName, projectName
- `dateFrom` / `dateTo`: Date range on createdAt
- `kpiFilter`: Pre-built filters for each KPI type

**File:** `rrf-portal-backend/src/reports/reports.service.ts`

---

## SECTION 10 — HIDDEN BUSINESS RULES

### 10.1 Exhaustive Rule List

| # | Rule | Trigger | Evidence | File |
|---|------|---------|----------|------|
| 1 | **PMO bypasses approval** | When a user with `roleCode === 'PMO'` submits, the RRF goes directly to IN_PROGRESS, skipping PENDING | Hardcoded in `submit()` | `rrf.service.ts:590` |
| 2 | **Approver fallback to Admin** | If no APPROVER users are assigned to the RRF's subfunction, the system assigns ALL active ADMIN users as approvers | Fallback in `getApprovers()` | `rrf.service.ts:528-530` |
| 3 | **First approver wins** | When one approver approves, ALL other pending approvers are set to SKIPPED (not remaining pending) | In `approve()` method | `rrf.service.ts:740-748` |
| 4 | **Decline allows resubmit; reject also allows resubmit** | Both DECLINED and REJECTED states allow the HM to resubmit | `submittableStatuses` array | `rrf.service.ts:578-582` |
| 5 | **Resubmission resets ALL approvers** | On resubmit, existing approver records are reset to PENDING (not recreated) | In `submit()` resubmission path | `rrf.service.ts:634-644` |
| 6 | **rrfNumber generated at Open for Hiring, NOT at approval** | The RRF-xxx number is only assigned when PMO clicks "Open for Hiring" | Comment in `approve()`, logic in `openForHiring()` | `rrf.service.ts:762, 1077` |
| 7 | **PMO direct submit generates rrfNumber immediately** | When PMO submits, rrfNumber is generated at submit time (not later) | In PMO branch of `submit()` | `rrf.service.ts:596` |
| 8 | **On-hold reuses decline fields** | When approver puts on hold, the reason is stored in BOTH `notes` AND `declineReason`. The `declinedAt` and `declinedById` are also set. | Documented workaround to avoid schema migration | `rrf.service.ts:1024-1028` |
| 9 | **Save-as-template on create** | If `saveAsTemplate=true` in create payload, a job description template is also saved | In `create()` method | `rrf.service.ts:207-214` |
| 10 | **HM can only submit own RRFs** | `submit()` checks `rrf.createdById !== userId` and throws ForbiddenException | Ownership check | `rrf.service.ts:572-574` |
| 11 | **Update records last editor role** | On update, `lastEditedByRole` is set to `'HIRING_MANAGER'` if editor is creator, else `'APPROVER'` | Hardcoded string | `rrf.service.ts:476-477` |
| 12 | **Internal RRF number auto-gen on "Sourced Internally" close** | `closeRrf()` auto-generates `internalRrfNo` if `closeReason === 'SOURCED_INTERNALLY'` and none exists | In `closeRrf()` | `rrf.service.ts:1304-1307` |
| 13 | **Delete is hard delete** | `remove()` does `rrfRepository.delete(id)` — the RRF row is permanently removed, not soft-deleted | In `remove()` | `rrf.service.ts:822` |
| 14 | **Approver only if assigned** | Approval/reject/decline/hold all verify the user is in `rrf_approvers` with PENDING status for that specific RRF | Not just role-based; requires assignment record | `rrf.service.ts:720-726` |
| 15 | **Admin layout hardcoded gatekeeper** | Admin pages are accessible ONLY to users with `roleCode === 'ADMIN'` — this is a frontend-only check, not permission-based | Hardcoded in layout | `app/admin/layout.jsx:50` |
| 16 | **My Requests excludes drafts** | The `useMyRequests` hook transforms API response to filter out `status === 'draft'` | Frontend transform | `hooks/useMyRequests.js:23-26` |
| 17 | **Pending approvals shows displayId** | Frontend maps `displayId = rrfNumber || subId` — shows RRF-xxx if assigned, else REQ-xxx | In `getPendingApprovals()` frontend | `lib/api/rrfApi.js:185-190` |
| 18 | **Fill-by-bench valid from multiple statuses** | Can fill from bench when APPROVED, IN_PROGRESS, or OPEN_FOR_HIRING | Broader than expected | `rrf.service.ts:1146-1148` |
| 19 | **Suggested interviewers by technology** | Users are matched by their `technologies` JSONB array (case-insensitive) | Backend query | `rrf.service.ts:1490-1505` |
| 20 | **Payload sanitization on create/update** | Frontend converts array fields to comma-separated strings, strips empty values, removes unknown field names | Extensive sanitizer | `lib/api/rrfApi.js:12-60` |
| 21 | **Subfunction migration at startup** | On service init, RRFs with null `subfunctionId` but non-null `subFunction` string are auto-linked | Legacy migration in `onModuleInit()` | `rrf.service.ts:100-117` |
| 22 | **Sequence bootstrap at startup** | PostgreSQL sequences are created and synced to max existing values at startup | In `onModuleInit()` | `rrf.service.ts:58-98` |
| 23 | **User deactivation does not revoke sessions** | Deactivating a user does not invalidate existing JWTs. However, the next API call will fail because `jwt.strategy.ts` checks `user.isActive` | Security design | `src/auth/jwt.strategy.ts:23-25` |
| 24 | **Notification actor excluded** | The person who triggers an action does NOT receive a notification about their own action (deduplication logic) | In recipient resolution | `notification-recipient.resolver.ts:68-73` |
| 25 | **Statistics scoping by role** | APPROVER sees subfunction-filtered stats. HM sees own-only. ADMIN with `all=true` sees everything. Others see own. | Complex branching | `rrf.service.ts:888-905` |
| 26 | **Login rate limiting** | 5 login attempts per 60 seconds per IP | Throttle decorator | `auth.controller.ts:11` |
| 27 | **No password reset** | There is no forgot-password or reset-password endpoint | Missing feature | — |
| 28 | **ModernRRFForm redirects by role** | After creating/saving an RRF, redirect path is determined by `userRole === 'pmo' ? '/pmo' : '/hiring-manager/...'` | Binary hardcoded check | `components/ModernRRFForm.jsx:641,777,1028` |
| 29 | **Unauthorized page routes by role** | The "Go Home" button on unauthorized page uses hardcoded role→path mapping | Same as sidebar issue | `app/unauthorized/page.jsx:12-22` |

---

## SECTION 11 — RUNTIME TRUTH SUMMARY

### 11.1 Access Control Model Classification

The system is a **multi-layered hybrid** that does not fit neatly into one model:

| Layer | Model | Evidence |
|-------|-------|---------|
| Database schema | **RBAC** (Role-Based Access Control) | `roles → role_permissions → permissions → modules` |
| Backend API guards | **PBAC** (Permission-Based Access Control) | `@RequirePermission('RRF.CREATE')` — does not check role, only permission |
| Backend service logic | **RBAC + ABAC hybrid** | 13 hardcoded `roleCode` checks for workflow routing, data filtering, PMO bypass |
| Frontend sidebar | **RBAC + PBAC hybrid** | Mix of `hasPermission()` and `roleCode === 'PMO'` checks |
| Frontend routing | **Role-folder architecture** | Physical folders: `/admin/`, `/pmo/`, `/hr/`, `/approver/`, `/hiring-manager/` |
| Frontend dashboards | **Role-driven** | 5 separate dashboard implementations, one per role |
| Data scoping (Approver) | **ABAC** (Attribute-Based) | Filtered by user's assigned subfunctions (attribute) |
| Workflow transitions | **WBAC** (Workflow-Based) | Status + actor assignment determines next valid actions |
| Notification routing | **RBAC** | `resolveByRole('PMO')`, `resolveByRole('HR')` |

### 11.2 Precise Classification

> **The system is RBAC with Attribute-Based scoping and Workflow-Based transition control, partially implemented as Permission-Based at the API layer, but still Role-Identity-Driven at the frontend layer.**

### 11.3 What Works Well

- ✅ Backend permission guard is generic and enterprise-grade
- ✅ Permission assignment from Admin UI saves correctly to DB
- ✅ Every API endpoint is protected with correct permission
- ✅ Approver scoping by subfunction is correctly enforced
- ✅ Status history provides complete audit trail
- ✅ Notification system is event-driven and well-structured
- ✅ Rate limiting on login prevents brute force
- ✅ Inactive user check on every API request
- ✅ Reports have no hardcoded role checks

### 11.4 What Is Problematic

- ❌ Frontend cannot support dynamically-created roles (role-folder architecture)
- ❌ 13 hardcoded role checks in backend services
- ❌ Sidebar is hybrid (permission + role identity)
- ❌ Admin layout has hardcoded `roleCode !== 'ADMIN'` gate
- ❌ Permissions go stale on frontend after Admin changes them
- ❌ No token refresh mechanism
- ❌ No password reset functionality
- ❌ Notification action URLs point to role-specific paths that may not exist for dynamic roles
- ❌ Notification recipient resolution uses `resolveByRole()` which won't find dynamic roles
- ❌ ModernRRFForm and UnauthorizedPage have hardcoded role→path mappings
- ❌ `modules` table has `route_path` and `icon` fields but they're unused by frontend
- ❌ No Next.js middleware.ts for server-side route protection

### 11.5 The Paradox

The database and backend guards are designed for a **permission-driven** system where roles are just labels. But the frontend and several backend service methods treat roles as **identity** — requiring specific role codes for routing, filtering, and workflow decisions. This means the permission assignment feature in the Admin UI is only **partially effective**: it controls API access correctly, but it cannot control what the user sees or where they navigate.

---

*END OF DOCUMENT*

*Every finding in this document is verified from the actual codebase as of May 4, 2026.*  
*No assumptions. No theory. Only runtime truth.*
