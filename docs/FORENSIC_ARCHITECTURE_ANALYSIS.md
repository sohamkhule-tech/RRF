# RRF Portal — Forensic Architecture Analysis

> **Generated**: Read-only deep analysis of the existing codebase  
> **Scope**: Full-stack — NestJS backend + Next.js frontend + PostgreSQL  
> **Status**: No code changes made. Document-only.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Authentication System](#2-authentication-system)
3. [RBAC & Permission Engine](#3-rbac--permission-engine)
4. [User Creation & Lifecycle](#4-user-creation--lifecycle)
5. [Permission Assignment Flow](#5-permission-assignment-flow)
6. [RRF Workflow Engine](#6-rrf-workflow-engine)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Database Schema Map](#8-database-schema-map)
9. [API Surface Inventory](#9-api-surface-inventory)
10. [Security Audit](#10-security-audit)
11. [Technical Debt Registry](#11-technical-debt-registry)
12. [Refactor Readiness Score](#12-refactor-readiness-score)

---

## 1. System Overview

### Stack

| Layer      | Technology                     | Config Location                          |
|------------|-------------------------------|------------------------------------------|
| Backend    | NestJS (TypeScript)           | `rrf-portal-backend/`                    |
| ORM        | TypeORM                       | `src/config/typeorm.config.ts`           |
| Database   | PostgreSQL                    | env `DB_HOST`, `DB_PORT`, `DB_DATABASE`  |
| Frontend   | Next.js 14 (App Router, JSX) | `rrf-portal-nextjs/`                     |
| Styling    | Tailwind CSS + Ant Design     | `tailwind.config.js`                     |
| Auth       | Passport.js (JWT + Local)     | `src/auth/`                              |
| Rate Limit | @nestjs/throttler             | `app.module.ts`                          |
| Security   | Helmet                        | `src/main.ts`                            |

### Runtime Topology

```
Browser ──► Next.js (port 3000) ──► NestJS API (port 4000) ──► PostgreSQL (port 5432)
                │                                                     │
                └─ /api/auth/* (DEAD CODE - mock routes)              └─ TypeORM sync (dev)
```

### Module Map (backend `app.module.ts`)

```
AppModule
├── ConfigModule (global, .env)
├── TypeOrmModule (postgres, pool=20, cache=30s)
├── ThrottlerModule (100 req/60s global)
├── AuthModule
├── UsersModule
├── RolesModule
├── ModulesModule
├── PermissionsModule
├── RolePermissionsModule
├── FunctionsModule
├── SubfunctionsModule
├── UserSubfunctionsModule
├── JobDescriptionsModule
├── SeedModule
├── RrfModule
└── ReportsModule
```

---

## 2. Authentication System

### Login Flow

```
1. POST /auth/login  (throttled: 5 req/60s)
   ├── LocalStrategy.validate(userId, password)
   │   └── usersService.validateUser(userId, password)
   │       └── bcrypt.compare(password, user.passwordHash)
   ├── AuthService.login(user)
   │   ├── permissionsService.getUserPermissions(user.id)  ← DB query
   │   ├── usersService.updateLastLogin(user.id)
   │   └── jwtService.sign({ userId: user.id, sub: user.id, roleCode: user.role.roleCode })
   └── Returns: { access_token, user: { ...userData, permissions: string[] } }
```

### JWT Configuration

| Property       | Value                                       |
|----------------|---------------------------------------------|
| Secret         | `process.env.JWT_SECRET` (getOrThrow)       |
| Expiry         | `process.env.JWT_EXPIRES_IN` or `'24h'`     |
| Algorithm      | HS256 (default)                              |
| Payload        | `{ userId, sub, roleCode }` — no permissions |
| Refresh Token  | **None** — single token, 24h hard expiry    |

### Request Authentication (every guarded endpoint)

```
1. JwtAuthGuard extracts Bearer token from Authorization header
2. JwtStrategy.validate(payload):
   ├── usersService.findById(payload.sub)  ← DB query on EVERY request
   ├── Checks user.isActive === true
   └── Returns { id, userId, email, fullName, role, department } → request.user
3. PermissionGuard (if @RequirePermission decorator present):
   ├── Reads 'permission' metadata from handler
   ├── permissionsService.checkUserPermission(user.id, requiredPermission)
   │   └── getUserPermissions(user.id) ← ANOTHER DB query (raw SQL join)
   │       └── SELECT DISTINCT CONCAT(m.module_code, '.', p.permission_code)
   │           FROM users → roles → role_permissions → permissions → modules
   └── Returns: permissions.includes(requiredPermission)
```

### Key Findings — Auth

| Finding | Severity | Detail |
|---------|----------|--------|
| No refresh token | Medium | Session dies after 24h; no silent renewal possible |
| No token revocation | Medium | Logout only clears localStorage; token remains valid until expiry |
| 2 DB queries per guarded request | High (perf) | `findById` + `getUserPermissions` on every request — no caching |
| `checkUserPermission` fetches ALL perms | Medium (perf) | Fetches entire permission list just to check one |
| Permissions not in JWT | Design choice | Pro: permissions always fresh. Con: 2 extra queries/request |
| Frontend stores token in localStorage | Medium (sec) | Vulnerable to XSS; httpOnly cookie would be safer |
| Dead mock API routes exist | Low | `app/api/auth/login/route.js` and `app/api/auth/verify/route.js` contain hardcoded mock users with plaintext passwords — never used in production flow (frontend hits `localhost:4000` directly), but a code hygiene risk |

---

## 3. RBAC & Permission Engine

### Entity Relationship

```
roles (1) ──► (N) role_permissions (N) ◄── (1) permissions (N) ──► (1) modules
  │
  └── (1) users (N)
         │
         └── (N) user_subfunctions (N) ──► (1) subfunctions (N) ──► (1) functions
```

### Permission Resolution Algorithm

```sql
-- Executed on every @RequirePermission check (no caching)
SELECT DISTINCT CONCAT(m.module_code, '.', p.permission_code) AS permission
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN modules m ON p.module_id = m.id
WHERE u.id = $1
  AND u.is_active = true
  AND r.is_active = true
  AND p.is_active = true
  AND m.is_active = true
```

### Seeded Roles

| Priority | Role Name           | Code            | Purpose                              |
|----------|---------------------|-----------------|--------------------------------------|
| 1        | Admin               | `ADMIN`         | Full system access, user management  |
| 2        | PMO                 | `PMO`           | RRF workflow management, form config |
| 3        | Approver            | `APPROVER`      | Approve/decline/hold RRFs            |
| 4        | Talent Acquisition  | `HR`            | Process approved RRFs                |
| 5        | Hiring Manager      | `HIRING_MANAGER`| Create and submit RRFs               |

### Permission Matrix (from `PERMISSIONS` constants in frontend)

| Module      | Actions                                           |
|-------------|--------------------------------------------------|
| DASHBOARD   | READ                                              |
| RRF         | CREATE, READ, UPDATE, DELETE, OPEN_FOR_HIRING, FILL_FROM_BENCH, CLOSE |
| APPROVALS   | READ, APPROVE, REJECT, ON_HOLD                   |
| USERS       | CREATE, READ, UPDATE, DELETE                      |
| ROLES       | READ, UPDATE                                      |
| REPORTS     | READ, EXPORT                                      |
| SETTINGS    | READ, UPDATE                                      |

### Module Entity (`modules` table)

Supports hierarchical modules via `parent_module_id` self-reference, `route_path` for frontend routing association, `icon` field, and `display_order` for UI ordering.

### Key Findings — RBAC

| Finding | Severity | Detail |
|---------|----------|--------|
| No per-user permission overrides | Design limitation | Users inherit ALL permissions from role only; no way to grant/revoke individual permissions per user |
| No permission caching | High (perf) | Every guarded request executes the full 5-table SQL join |
| Role permission update = full overwrite | Medium | `updateRolePermissions()` DELETEs all existing + INSERTs new (transaction-safe, but not incremental) |
| Immediate propagation | Feature | Role permission changes take effect on the very next request (no stale cache to invalidate) |
| Frontend permission check is array `.includes()` | OK | Simple O(n) check on `user.permissions[]` — efficient for the expected permission count (~20-30) |

---

## 4. User Creation & Lifecycle

### Create User Flow

```
POST /users (requires USERS.CREATE)
│
├── Validate: no duplicate userId
├── Validate: no duplicate email
├── Validate: role exists and is active
├── If role === 'APPROVER': require subfunctionIds[]
├── Hash password: bcrypt.hash(password, 10)
├── Save user entity
├── If subfunctionIds provided:
│   └── assignSubfunctions(user.id, subfunctionIds)
│       ├── DELETE FROM user_subfunctions WHERE user_id = $1 (full wipe)
│       └── INSERT INTO user_subfunctions (user_id, subfunction_id) VALUES ... (for each)
└── Return saved user with role relation
```

### Update User Flow

```
PUT /users/:id (requires USERS.UPDATE)
│
├── Find existing user (404 if not found)
├── If roleId changes: validate new role exists
├── Update user fields (Object.assign pattern)
├── If subfunctionIds provided:
│   └── Replace all subfunctions (DELETE + INSERT pattern)
└── Save and return
```

### Key Entity: `users` table

| Column         | Type      | Constraints          | Notes                              |
|----------------|-----------|---------------------|------------------------------------|
| id             | serial PK |                     | Internal auto-increment            |
| user_id        | varchar   | UNIQUE, NOT NULL    | Login identifier (e.g., "hm001")  |
| email          | varchar   | UNIQUE              | Display-only, not used for auth    |
| password_hash  | varchar   |                     | bcrypt salt 10                     |
| full_name      | varchar   |                     |                                    |
| department     | varchar   | nullable            |                                    |
| phone          | varchar   | nullable            |                                    |
| is_active      | boolean   | default true        | Soft-delete flag                   |
| last_login     | timestamp | nullable            | Updated on each login              |
| role_id        | FK→roles  | ManyToOne, EAGER    | Single role per user               |
| technologies   | jsonb     | nullable            | Array of technology strings        |
| created_at     | timestamp | auto                |                                    |
| updated_at     | timestamp | auto                |                                    |

---

## 5. Permission Assignment Flow

### How Permissions Reach a User

```
Admin assigns Role to User
         │
         ▼
Admin edits Role's Permissions
         │
         ▼
PUT /roles/:roleId/permissions  →  { permissionIds: [1, 2, 5, 8, ...] }
         │
         ├── Validate role exists
         ├── Validate each permissionId exists
         ├── Deduplicate permissionIds
         ├── BEGIN TRANSACTION
         │   ├── DELETE FROM role_permissions WHERE role_id = :roleId
         │   └── INSERT INTO role_permissions (role_id, permission_id) VALUES ...
         └── COMMIT
```

### Permission Evaluation Timeline

```
T₀: Admin updates Role X permissions → changes role_permissions table
T₁: User A (role X) makes next API call → JwtStrategy loads user → PermissionGuard runs
T₂: getUserPermissions(user.id) → fresh SQL query → returns NEW permissions immediately
```

There is **zero delay** between permission changes and enforcement. This is because:
- Permissions are NOT cached anywhere (backend or frontend during API calls)
- Permissions are NOT embedded in JWT
- Every request re-queries the database

However, the **frontend** caches permissions in localStorage at login time. If an admin changes a user's role permissions while that user is logged in, the frontend sidebar/UI won't reflect the change until:
- The user refreshes the page (re-reads localStorage)
- The user re-logs in (gets fresh permissions from `/auth/login`)

### Subfunction-Based Access Control

Approvers are scoped to specific subfunctions via the `user_subfunctions` junction table:

```
Approver User ──► user_subfunctions ──► subfunctions
                                           │
RRF.subFunctionId ─────────────────────────┘

Rule: Approvers can only see/act on RRFs whose subFunctionId is in their assigned subfunctions.
```

This is enforced in:
- `rrf.service.findAll()` — WHERE clause filters by approver's subfunctions
- `rrf.service.findOne()` — throws ForbiddenException if RRF subfunction not in scope
- `rrf.service.getStatistics()` — WHERE clause scopes stats

---

## 6. RRF Workflow Engine

### Status State Machine

```
                                               ┌──────────────┐
                                               │  ON_HOLD     │
                                               │ (Approver)   │
                                               └──────┬───────┘
                                                      │ HM resubmit
                                                      ▼
┌───────┐     HM submit     ┌──────────┐   Approver    ┌──────────┐
│ DRAFT ├───────────────────►│ PENDING  ├──────────────►│ APPROVED │
└───────┘                    └────┬─────┘   approve     └─────┬────┘
                                  │                           │
                          Approver│decline              PMO   │ openForHiring
                                  ▼                           ▼
                            ┌──────────┐              ┌─────────────┐
                            │ DECLINED │              │ IN_PROGRESS │
                            └────┬─────┘              └──────┬──────┘
                                 │ HM resubmit               │
                                 └──────► PENDING             │
                                                              │ HR close
                          Approver│reject                     ▼
                                  ▼                     ┌──────────┐
                            ┌──────────┐                │  CLOSED  │
                            │ REJECTED │                └──────────┘
                            └────┬─────┘
                                 │ HM resubmit
                                 └──────► PENDING

PMO DIRECT PATH (skip approval):
┌───────┐    PMO submit     ┌─────────────┐
│ DRAFT ├───────────────────►│ IN_PROGRESS │
└───────┘                    └─────────────┘

PMO BENCH FILL (from APPROVED or IN_PROGRESS):
┌──────────┐/┌─────────────┐    fillByBench    ┌──────────────┐
│ APPROVED │ │ IN_PROGRESS ├───────────────────►│    CLOSED    │
└──────────┘ └─────────────┘                    │(closed_by_bench)│
                                                └──────────────┘
```

### Status Enum Values

```typescript
enum RrfStatus {
  DRAFT          = 'draft'
  PENDING        = 'pending'
  SUBMITTED      = 'submitted'      // alias used but maps to PENDING behavior
  APPROVED       = 'approved'
  DECLINED       = 'declined'
  REJECTED       = 'rejected'
  ON_HOLD        = 'on_hold'
  IN_PROGRESS    = 'in_progress'
  OPEN_FOR_HIRING = 'open_for_hiring'
  CLOSED_BY_BENCH = 'closed_by_bench'
  CLOSED         = 'closed'
}
```

### Workflow Action Details

#### `submit(id, userId)` — HM submits for approval

1. Validates caller is the RRF creator
2. Allowed from: `DRAFT`, `DECLINED`, `REJECTED`
3. **PMO shortcut**: If submitter has `PMO` role → skip approval entirely:
   - Status → `IN_PROGRESS`
   - Auto-assigns `rrfNumber` (RRF-XXX)
   - Records `sentToHrAt`
4. **First submission (DRAFT→PENDING)**:
   - `getApprovers(subFunctionId)` — finds APPROVER-role users assigned to that subfunction
   - Fallback: if none found → all ADMIN users become approvers
   - Creates `rrf_approvers` records (all L1, all PENDING)
5. **Resubmission (DECLINED/REJECTED→PENDING)**:
   - Resets existing approver records to PENDING (doesn't create new ones)
   - Clears `declineReason`

#### `approve(id, userId, comments?)` — Approver approves

1. Finds the caller's approver record (must be PENDING)
2. Marks that record as APPROVED
3. **Marks ALL other pending approvers as SKIPPED** (any-one-approves model)
4. RRF → `APPROVED`, records `approvedAt`, `approvedById`, `approvedByName`
5. Does NOT generate `rrfNumber` (deferred to PMO's `openForHiring`)

#### `decline(id, userId, reason)` — Approver declines

1. Validates caller has pending approver record
2. Only from `PENDING` status
3. Requires non-empty reason
4. RRF → `DECLINED`, records decline details

#### `reject(id, userId, comments)` — Approver rejects

1. Similar to decline but sets status to `REJECTED`
2. Can happen from any status where approver has pending record

#### `putOnHold(id, userId, reason)` — Approver holds

1. Only from `PENDING`
2. RRF → `ON_HOLD`
3. **Reuses decline fields** (declineReason, declinedAt, declinedById) — no dedicated schema columns

#### `openForHiring(id, userId)` — PMO sends to HR

1. Only from `APPROVED`
2. Generates `rrfNumber` (RRF-XXX) if not already present
3. RRF → `IN_PROGRESS`
4. Records `sentToHrAt`
5. Uses optimized direct UPDATE query (not save())

#### `fillByBench(id, userId, candidateName?, joiningDate?)` — PMO bench fill

1. Allowed from: `APPROVED`, `IN_PROGRESS`, `OPEN_FOR_HIRING`
2. RRF → `CLOSED` with `closureStatus = 'filled-by-bench'`
3. Auto-generates `internalRrfNo` (IRRF-YYMMDD-XXX)
4. Uses optimized direct UPDATE with JSONB append

### ID Generation System

| ID Type        | Format            | Sequence                    | Generated When          |
|----------------|-------------------|-----------------------------|------------------------|
| sub_id         | `REQ-001`         | `rrfs_sub_id_seq`           | RRF creation (DRAFT)   |
| rrf_number     | `RRF-001`         | `rrfs_rrf_number_seq`       | `openForHiring` (PMO)  |
| internal_rrf_no| `IRRF-260613-001` | `rrfs_internal_rrf_number_seq` | `fillByBench` (PMO) |

Sequences are bootstrapped on module init (`onModuleInit`) to sync with existing max values.

### Approver Resolution

```
getApprovers(subFunctionId):
  1. Find active users with role APPROVER + assigned to subFunctionId via user_subfunctions
  2. If none found → fallback to all active ADMIN users
  3. All assigned as L1 approvers (no multi-level hierarchy used)
```

### Approval Model

**Any-of-N**: When any single approver approves, all other pending approvers are SKIPPED. There is no sequential chain or consensus requirement.

---

## 7. Frontend Architecture

### App Router Structure

```
app/
├── layout.jsx              ← Root layout (imports ClientLayout)
├── page.jsx                ← Landing/redirect
├── login/page.jsx          ← Login form (hits localhost:4000/auth/login directly)
├── unauthorized/page.jsx
├── api/auth/               ← DEAD CODE (mock routes, not used)
│   ├── login/route.js
│   └── verify/route.js
├── hiring-manager/
│   ├── dashboard/page.jsx
│   ├── dashboard/in-progress/page.jsx
│   ├── create-rrf/page.jsx
│   ├── edit-rrf/[id]/page.jsx
│   ├── view-rrf/[id]/page.jsx
│   ├── my-requests/page.jsx
│   └── drafts/page.jsx
├── pmo/
│   ├── page.jsx            ← PMO Dashboard
│   ├── create-rrf/page.jsx
│   ├── my-requests/page.jsx
│   ├── requests/page.jsx
│   ├── pending/page.jsx
│   ├── open-positions/page.jsx
│   ├── sent-to-approvers/page.jsx
│   ├── view-rrf/[id]/page.jsx
│   ├── form-config/page.jsx
│   ├── reports/page.jsx
│   └── closed/page.jsx
├── approver/
│   ├── page.jsx            ← Approver Dashboard
│   ├── pending/page.jsx
│   ├── approved/page.jsx
│   ├── declined/page.jsx
│   ├── on-hold/page.jsx
│   ├── view-rrf/[id]/page.jsx
│   ├── edit-rrf/[id]/page.jsx
│   ├── reports/page.jsx
│   └── closed/page.jsx
├── hr/
│   ├── page.jsx            ← HR Dashboard
│   ├── open-hiring/page.jsx
│   ├── open-for-hiring/page.jsx
│   ├── view-rrf/[id]/page.jsx
│   └── closed/page.jsx
├── admin/
│   ├── layout.jsx          ← Separate admin layout
│   ├── page.jsx
│   ├── users/page.jsx
│   ├── roles/page.jsx
│   ├── form-config/page.jsx
│   └── rrf-management/
│       ├── page.jsx
│       └── [id]/page.jsx
└── test-api/page.jsx
```

### Layout Architecture

```
RootLayout (app/layout.jsx)
└── ClientLayout (components/ClientLayout.jsx)
    ├── AuthProvider (contexts/AuthContext.jsx)  ← wraps everything
    ├── Toaster (react-hot-toast)
    └── LayoutContent
        ├── If pathname === '/login' → render children only
        ├── If pathname.startsWith('/admin') → render children only (admin has own layout)
        └── Otherwise:
            ├── PermissionBasedSidebar  ← dynamic menu based on permissions
            ├── Header                  ← with user info, logout, sidebar toggle
            └── Content (children)
```

### State Management

- **No Redux / Zustand / global store** — purely React Context + localStorage
- **AuthContext**: Stores `user`, `token`, `permissions` in React state + localStorage
- **API Cache**: Custom `apiCache.js` — in-memory Map with TTL (30s lists, 60s stats, 5min config)
- **Smart Fetch**: `useSmartFetch` hook — cache-aware, deduplicating fetch wrapper
- **Visibility Refresh**: `useVisibilityRefresh` hook — refreshes data on tab focus + interval

### Frontend Auth Flow

```
1. Login page submits to http://localhost:4000/auth/login directly (NOT through Next.js API route)
2. On success:
   ├── AuthContext.login(userData, token) → stores in localStorage + React state
   ├── Permissions stored separately in localStorage('permissions')
   └── Router navigates to permission-based home page:
       ├── HR → /hr
       ├── APPROVER → /approver
       ├── PMO → /pmo
       └── Default (HM/Admin) → /hiring-manager/dashboard
3. On every page load:
   └── AuthContext reads from localStorage → hydrates user state
4. On 401 from API:
   └── apiConfig.handleUnauthorized() → clears localStorage → dispatches storage event → redirect to /login
```

### Frontend Permission Checking

```javascript
// Route-level protection:
<ProtectedRoute requiredPermission="RRF.CREATE">
  <CreateRRFPage />
</ProtectedRoute>

// Component-level:
const { canCreateRRF, canApprove, hasPermission } = usePermission()
{canCreateRRF && <button>Create RRF</button>}

// Sidebar generation:
PermissionBasedSidebar uses usePermission() to determine:
├── Which dashboard route to show (role inference from permissions combo)
├── Which menu items to display
└── Which routes to expose
```

### API Layer

| File | Purpose |
|------|---------|
| `lib/api/apiConfig.js` | Base `apiRequest()` with auth headers, 401 handling |
| `lib/api/rrfApi.js` | All RRF CRUD + workflow actions |
| `lib/api/usersApi.js` | User management |
| `lib/api/rolesApi.js` | Role CRUD |
| `lib/api/permissionsApi.js` | Permission queries |
| `lib/api/subfunctionsApi.js` | Subfunction CRUD |
| `lib/api/functionsApi.js` | Function CRUD |
| `lib/api/jobDescriptionsApi.js` | Job description templates |
| `lib/api/formConfig.js` | RRF form configuration |
| `lib/api/reportsApi.js` | Reports/analytics endpoints |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `usePermission` | Permission checking with convenient flags (`canCreateRRF`, `canApprove`, etc.) |
| `useRRFs` | Fetch/cache RRF lists |
| `useRRFDetail` | Fetch/cache single RRF |
| `useRRFStatistics` | Fetch/cache statistics |
| `useMyRequests` | Fetch user's own RRFs |
| `useApproverRequests` | Fetch pending approvals |
| `useFormConfig` | Fetch form configuration |

### Key Findings — Frontend

| Finding | Severity | Detail |
|---------|----------|--------|
| Login hits backend directly | Low | `fetch('http://localhost:4000/auth/login')` hardcoded — not using `apiConfig` or env var |
| Dead API routes | Low | `app/api/auth/login/route.js` has hardcoded mock users with plaintext passwords |
| Role inference from permissions | High (fragile) | Sidebar determines role by permission combos (e.g., "has REPORTS.EXPORT but NOT RRF.CREATE = HR") — extremely brittle, will break if permissions change |
| Duplicate sidebar components | Low | Both `Sidebar.jsx` (role-based, legacy) and `PermissionBasedSidebar.jsx` (permission-based, current) exist |
| Permissions cached in localStorage | Medium | Stale until re-login if admin changes role permissions while user is active |
| No Next.js middleware for auth | Medium | Auth check happens client-side only — no server-side route protection |
| `console.log` in production API calls | Low | Debug logging in `apiConfig.js` and `rrfApi.js` left in |

---

## 8. Database Schema Map

### Entity-Table Mapping

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CORE RBAC TABLES                             │
│                                                                     │
│  roles ◄──── users ────► user_subfunctions ────► subfunctions       │
│    │                                                  │              │
│    └──► role_permissions ◄──── permissions              functions    │
│                                     │                     │          │
│                                  modules              subfunctions   │
│                                                      (FK function_id)│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       RRF WORKFLOW TABLES                            │
│                                                                     │
│  rrfs ◄──── rrf_approvers                                           │
│    │                                                                 │
│    ├── createdBy → users                                             │
│    ├── approvedBy → users                                            │
│    ├── declinedBy → users                                            │
│    ├── onHoldBy → users                                              │
│    ├── closedBy → users                                              │
│    ├── pmoVerifiedBy → users                                         │
│    └── assignedToHr → users                                          │
│                                                                     │
│  rrf_form_configs (dropdown options for RRF form fields)             │
│  job_descriptions (reusable JD templates)                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Table Details

#### `rrfs` (main RRF table)

| Column Category | Columns |
|----------------|---------|
| Identity | `id`, `sub_id` (REQ-xxx), `rrf_number` (RRF-xxx), `internal_rrf_no` (IRRF-xxx) |
| Position Info | `position_title`, `department`, `entity`, `organisation`, `customer_name`, `project_name`, `headcount` |
| Classification | `requisition_type`, `non_billable_sub_type`, `function`, `sub_function`, `sub_function_id` (FK), `business_unit` |
| Skills/Tech | `required_skills`, `preferred_skills`, `technologies`, `job_description` |
| Experience | `experience_min`, `experience_max` |
| Budget | `budget_min`, `budget_max`, `billing_rate` |
| Employment | `employment_type`, `priority`, `location`, `interview_panel` (jsonb) |
| Workflow Status | `status` (enum), `status_history` (jsonb array) |
| Workflow Timestamps | `submitted_at`, `approved_at`, `sent_to_hr_at`, `rejected_at`, `declined_at`, `closed_at` |
| Actor Tracking | `created_by_id`, `approved_by_id/name`, `declined_by_id/name`, `on_hold_by_id/name`, `closed_by_id` |
| Closure | `candidate_name`, `joining_date`, `closure_status`, `close_reason`, `notes` |
| Collaboration | `last_edited_by_id`, `last_edited_by_role`, `last_edited_at` |
| System | `created_at`, `updated_at` |

#### `rrf_approvers` (approval chain)

| Column | Type | Notes |
|--------|------|-------|
| `id` | PK | |
| `rrf_id` | FK→rrfs | CASCADE delete |
| `user_id` | FK→users | eager load |
| `approval_level` | enum | L1, L2, L3, final (only L1 used currently) |
| `approval_status` | enum | pending, approved, rejected, skipped |
| `approval_order` | int | Ordering within level |
| `comments` | text | Approver's comments |
| `approved_at` | timestamp | |
| `rejected_at` | timestamp | |
| `is_mandatory` | boolean | Always false (not enforced) |
| Unique | `[rrf_id, user_id, approval_level]` | |

#### `rrf_form_configs` (dynamic form fields)

| Column | Purpose |
|--------|---------|
| `field_name` | Unique key (e.g., "requisition_type") |
| `field_label` | Display label |
| `field_options` | jsonb array of dropdown values |
| `field_type` | "dropdown" (only type used) |
| `is_required` | Validation flag |
| `step` / `section` | Form wizard placement |

### TypeORM Configuration

| Setting | Value | Impact |
|---------|-------|--------|
| `synchronize` | `true` in dev, `false` in prod | Auto-creates/alters tables in dev |
| `poolSize` | 20 | Max concurrent DB connections |
| `connectTimeoutMS` | 10,000 | 10s connection timeout |
| `maxQueryExecutionTime` | 5,000 | Logs slow queries >5s |
| `cache.type` | `'database'` | TypeORM query cache stored in `typeorm_cache` table |
| `cache.duration` | 30,000 | 30s cache TTL |

---

## 9. API Surface Inventory

### Auth Endpoints

| Method | Path | Guard | Permission | Rate Limit |
|--------|------|-------|------------|------------|
| POST | `/auth/login` | LocalAuthGuard | None | 5/60s |
| POST | `/auth/verify` | None | None | Global |

### RRF Endpoints

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/rrf` | `RRF.CREATE` | Create new RRF |
| GET | `/rrf` | `RRF.READ` | List all RRFs (paginated, filtered) |
| GET | `/rrf/my-requests` | `RRF.READ` | Creator's own RRFs |
| GET | `/rrf/statistics` | `RRF.READ` | Dashboard stats (role-scoped) |
| GET | `/rrf/pending-approvals` | `APPROVALS.READ` | Approver's queue |
| GET | `/rrf/pmo/open-positions` | `RRF.READ` | PMO open positions |
| GET | `/rrf/pmo/dashboard-stats` | `RRF.READ` | PMO-specific stats |
| GET | `/rrf/:id` | `RRF.READ` | Single RRF detail |
| PUT | `/rrf/:id` | `RRF.UPDATE` | Update RRF |
| DELETE | `/rrf/:id` | `RRF.DELETE` | Delete (DRAFT/REJECTED only) |
| POST | `/rrf/:id/submit` | `RRF.CREATE` | Submit for approval |
| POST | `/rrf/:id/approve` | `APPROVALS.APPROVE` | Approve |
| POST | `/rrf/:id/reject` | `APPROVALS.REJECT` | Reject |
| POST | `/rrf/:id/decline` | `APPROVALS.REJECT` | Decline with reason |
| POST | `/rrf/:id/on-hold` | `APPROVALS.ON_HOLD` | Put on hold |
| POST | `/rrf/:id/open-for-hiring` | `RRF.OPEN_FOR_HIRING` | PMO sends to HR |
| POST | `/rrf/:id/fill-by-bench` | `RRF.FILL_FROM_BENCH` | PMO bench fill |
| POST | `/rrf/:id/close` | `RRF.CLOSE` | HR close |

### CRUD Endpoints

| Resource | List | Create | Update | Delete | Special |
|----------|------|--------|--------|--------|---------|
| Users | GET /users | POST /users | PUT /users/:id | — | GET /users/roles, GET /users/profile |
| Roles | GET /roles | — | — | — | GET /roles/:id/permissions, PUT /roles/:id/permissions |
| Permissions | GET /permissions | — | — | — | |
| Functions | GET /functions | POST /functions | PUT /functions/:id | DELETE /functions/:id | GET /functions/:id/subfunctions |
| Subfunctions | GET /subfunctions | POST /subfunctions | PUT /subfunctions/:id | DELETE /subfunctions/:id | |
| Job Descriptions | GET /job-descriptions | POST /job-descriptions | PUT /job-descriptions/:id | DELETE /job-descriptions/:id | |
| Form Config | GET /rrf/form-config | POST /rrf/form-config | PUT /rrf/form-config/:id | DELETE /rrf/form-config/:id | |
| Reports | GET /reports | — | — | — | GET /reports/summary, GET /reports/export |

### Seed/Migration Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/seed/run` | Run full database seed |
| POST | `/seed/permissions` | Seed permissions only |

---

## 10. Security Audit

### Positive Security Controls ✅

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt with salt rounds 10 |
| JWT authentication | passport-jwt with env-based secret |
| Input validation | class-validator with whitelist + forbidNonWhitelisted |
| Rate limiting | @nestjs/throttler — 100/60s global, 5/60s on login |
| Security headers | Helmet middleware |
| CORS | Configurable via ALLOWED_ORIGINS env |
| Permission guards | Every protected route has `@RequirePermission` decorator |
| SQL injection mitigation | TypeORM parameterized queries (mostly) |
| Request sanitization | ValidationPipe with `transform: true` |
| Global exception filter | Catches all errors, returns consistent format, logs stack traces |
| Subfunction-scoped access | Approvers can only see RRFs in their subfunctions |

### Vulnerabilities & Risks ⚠️

| # | Finding | Severity | Detail |
|---|---------|----------|--------|
| 1 | **Token in localStorage** | Medium | JWT stored in `localStorage` is accessible to any XSS exploit. Should use httpOnly cookies. |
| 2 | **No CSRF protection** | Medium | With cookie-based auth this would be critical; with localStorage-based auth, XSS is the primary vector instead. |
| 3 | **JSON.stringify in raw SQL** | High | `openForHiring()` and `fillByBench()` use string interpolation to build JSONB values: `'${JSON.stringify(statusHistoryEntry)}'::jsonb`. If any field contains a single quote, this breaks or enables SQL injection. Should use parameterized queries. |
| 4 | **Dead mock auth routes** | Low | `app/api/auth/login/route.js` contains hardcoded credentials (hm001/hm123, pmo001/pmo123, etc.). These routes aren't used but shouldn't exist. |
| 5 | **No token revocation** | Medium | Logout only clears client-side storage. The JWT remains valid for up to 24h after logout. No server-side blacklist. |
| 6 | **Debug logging in production** | Low | `console.log('[API Debug] Token:', ...)` in `apiConfig.js`; `console.log('FINAL RRF PAYLOAD', ...)` in `rrfApi.js`. Leaks sensitive info to browser console. |
| 7 | **`synchronize: true` in dev** | Medium | TypeORM auto-alters schema. A bug in entity definitions could silently drop columns. |
| 8 | **No password complexity enforcement** | Low | `CreateUserDto` has `@IsString()` only — no min length, no complexity rules. Backend relies on bcrypt but accepts "a" as a valid password. |
| 9 | **ON_HOLD reuses decline columns** | Low | `putOnHold()` writes to `declineReason`, `declinedAt`, `declinedById` — overwriting any previous decline data. Data integrity issue. |
| 10 | **Hardcoded localhost in login page** | Medium | Login page uses `fetch('http://localhost:4000/auth/login')` instead of `process.env.NEXT_PUBLIC_API_URL` — will break in any non-local deployment. |

---

## 11. Technical Debt Registry

### High Priority

| # | Item | Location | Impact |
|---|------|----------|--------|
| 1 | **No permission caching** | `permissions.service.ts` | 2 DB queries per guarded request. At scale: N×2 queries/second where N = concurrent users |
| 2 | **SQL string interpolation in JSONB operations** | `rrf.service.ts` (`openForHiring`, `fillByBench`) | Potential SQL injection via crafted status history fields |
| 3 | **Role inference from permissions in frontend** | `PermissionBasedSidebar.jsx` | Sidebar uses fragile permission combos to guess role (e.g., "has REPORTS.EXPORT but NOT RRF.CREATE = HR"). Any permission matrix change breaks routing |
| 4 | **Login page hardcoded URL** | `app/login/page.jsx` | `http://localhost:4000` hardcoded — deployment-breaking |
| 5 | **No refresh token mechanism** | `auth.module.ts` | 24h hard expiry with no renewal path; users get logged out mid-work |

### Medium Priority

| # | Item | Location | Impact |
|---|------|----------|--------|
| 6 | **Deprecated `function` string column** | `subfunction.entity.ts` | Both `function` (string) and `functionEntity` (FK) exist; migration incomplete |
| 7 | **Dead API routes** | `app/api/auth/` | Mock auth with plaintext passwords persists in codebase |
| 8 | **Duplicate Sidebar components** | `Sidebar.jsx` + `PermissionBasedSidebar.jsx` | Legacy role-based sidebar still exists alongside permission-based one |
| 9 | **Frontend permission stale cache** | `AuthContext.jsx` | User's permissions in localStorage only refresh on login, not on role permission changes |
| 10 | **ON_HOLD reuses decline columns** | `rrf.service.ts` `putOnHold()` | Overwrites decline reason/date/user data — should have dedicated columns |
| 11 | **`checkUserPermission` inefficiency** | `permissions.service.ts` | Fetches ALL user permissions just to check one; should use `EXISTS` SQL query |
| 12 | **No server-side route protection** | Frontend `middleware.js` missing | All auth/permission checks are client-side; direct URL access possible before React hydrates |

### Low Priority

| # | Item | Location | Impact |
|---|------|----------|--------|
| 13 | Console.log debug statements | `apiConfig.js`, `rrfApi.js`, `rrf.service.ts` | Noise in production logs/console |
| 14 | `SUBMITTED` status exists but barely used | `rrf.entity.ts` | Status enum has SUBMITTED but workflow uses PENDING everywhere |
| 15 | `approval_level` supports L1-L3+final but only L1 used | `rrf-approver.entity.ts` | Multi-level approval infrastructure exists but unused |
| 16 | `is_mandatory` in approvers always false | `rrf.service.ts` | Mandatory approval concept exists in schema but not enforced |
| 17 | Seed endpoint exposed | `seed.controller.ts` | POST `/seed/run` could reset data in production if not disabled |

---

## 12. Refactor Readiness Score

### Scoring Criteria (1-10)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Modularity** | 7/10 | Clean NestJS module boundaries. Each domain (auth, rrf, users, roles) is properly isolated. Entities, services, controllers, DTOs in standard structure. |
| **Separation of Concerns** | 6/10 | Backend: good. Frontend: permission-based role inference in sidebar mixes routing with authorization logic. ClientLayout handles too many responsibilities (auth check + layout + redirect). |
| **Type Safety** | 5/10 | Backend is TypeScript with DTOs and class-validator. Frontend is plain JSX — no TypeScript, no prop types. Permission strings are untyped magic strings. |
| **Test Coverage** | 1/10 | No test files found anywhere in the codebase. Zero unit tests, integration tests, or E2E tests. |
| **API Design** | 7/10 | RESTful, consistent response format `{ success, data, message }`. Good use of DTOs with validation. Proper HTTP status codes. |
| **Security Posture** | 6/10 | Fundamentals in place (bcrypt, JWT, Helmet, rate limiting, ValidationPipe). Weakened by localStorage token storage, SQL string interpolation, no CSRF, no token revocation. |
| **Performance** | 5/10 | Permission queries on every request are the main bottleneck. Good: connection pooling, TypeORM query cache, frontend API cache, optimized direct UPDATE queries for workflow actions. Bad: no permission caching, `checkUserPermission` fetches all to check one. |
| **Deployment Readiness** | 4/10 | Hardcoded URLs, `synchronize: true`, seed endpoints exposed, dead mock routes, no Dockerfile health checks, no environment validation beyond JWT_SECRET. |
| **Code Hygiene** | 5/10 | Debug console.logs, deprecated columns, duplicate components, dead code. But: consistent coding style, good comments on complex logic, proper error handling. |
| **Documentation** | 7/10 | Extensive `/docs/` folder. Inline comments explain workflow decisions. TODO markers for future work. This analysis document adds comprehensive coverage. |

### Overall Refactor Readiness: **5.3/10**

### Priority Refactor Recommendations (ordered by impact)

1. **Add permission caching layer** — Redis or in-memory with TTL invalidation on role-permission changes. Eliminates 2 DB queries per request. Estimated: 1-2 days.

2. **Fix SQL string interpolation** — Replace `JSON.stringify` in raw queries with parameterized JSONB operations. Security-critical. Estimated: 2 hours.

3. **Store role code in user context** — Stop inferring role from permission combinations. Return `roleCode` from login and use it directly for routing. Estimated: 4 hours.

4. **Add Next.js middleware** — Server-side auth check before page render. Prevents flash of unauthorized content. Estimated: 4 hours.

5. **Environment-based API URLs** — Replace all hardcoded `localhost:4000` with `NEXT_PUBLIC_API_URL`. Estimated: 1 hour.

6. **Add test infrastructure** — Set up Jest for backend, Testing Library for frontend. Start with auth and workflow service tests. Estimated: 2-3 days for foundation.

7. **Remove dead code** — Delete `app/api/auth/` mock routes, legacy `Sidebar.jsx`, deprecated `function` column (after data migration). Estimated: 2 hours.

8. **Implement refresh tokens** — Add refresh token endpoint, store refresh token in httpOnly cookie, implement silent renewal. Estimated: 1-2 days.

---

*End of forensic analysis. No code was modified during this investigation.*
