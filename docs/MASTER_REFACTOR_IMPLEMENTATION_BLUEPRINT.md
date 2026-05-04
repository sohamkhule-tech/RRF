# MASTER REFACTOR IMPLEMENTATION BLUEPRINT (See below for Implementation Blueprint)

> **Note:** The Current System Operational Manual is maintained as a separate document at `docs/CURRENT_SYSTEM_OPERATIONAL_MANUAL.md`

---

# MASTER REFACTOR IMPLEMENTATION BLUEPRINT

## RRF Portal — Enterprise Architecture Transformation

**Document Type:** Read-Only Forensic Analysis + Implementation Blueprint  
**Date:** April 30, 2026  
**Approach:** Strangler Fig Pattern — Zero Business Breakage  
**Target:** Permission-Driven + Workflow-Aware + Feature-Driven Architecture  

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Section 1 — Runtime Truth Mapping](#section-1--runtime-truth-mapping)
3. [Section 2 — Full Workflow Bible](#section-2--full-workflow-bible)
4. [Section 3 — Action Eligibility Bible](#section-3--action-eligibility-bible)
5. [Section 4 — RBAC Truth Audit](#section-4--rbac-truth-audit)
6. [Section 5 — Dynamic Role Creation Truth](#section-5--dynamic-role-creation-truth)
7. [Section 6 — Universal View RRF Blueprint](#section-6--universal-view-rrf-blueprint)
8. [Section 7 — Unified Sidebar Blueprint](#section-7--unified-sidebar-blueprint)
9. [Section 8 — Unified Dashboard Blueprint](#section-8--unified-dashboard-blueprint)
10. [Section 9 — Dynamic Role Engine Blueprint](#section-9--dynamic-role-engine-blueprint)
11. [Section 10 — Backend Impact Analysis](#section-10--backend-impact-analysis)
12. [Section 11 — Strangler Migration Blueprint](#section-11--strangler-migration-blueprint)
13. [Section 12 — Final Executive Recommendation](#section-12--final-executive-recommendation)

---

## 1. EXECUTIVE SUMMARY

### System Overview

The RRF Portal is a Resource Requisition Form management application tracking hiring requests through a multi-role approval workflow. Built with:

- **Frontend:** Next.js 14 (App Router) + Ant Design + Tailwind CSS
- **Backend:** NestJS + TypeORM + PostgreSQL
- **Auth:** JWT (passport-jwt) + Permission Guard
- **Notifications:** Event-Driven (EventEmitter2) + WebSocket Gateway

### Critical Finding

The system operates as a **paradox architecture**:

| Layer | Approach | Status |
|-------|----------|--------|
| Database | Permission-driven RBAC (modules, permissions, role_permissions) | ✅ Enterprise-grade |
| Backend Guards | Generic permission-based (`@RequirePermission`) | ✅ Scalable |
| Backend Services | Hybrid (permission guard + hardcoded role checks) | ⚠️ 13 hardcoded checks |
| Frontend Routing | Role-folder driven (one folder per role) | ❌ Breaks dynamic roles |
| Frontend Sidebar | Hybrid (permission + role identity checks) | ⚠️ Not fully dynamic |
| Frontend Dashboard | 5 separate implementations, duplicated | ❌ Not scalable |

### Bottom Line

The **backend RBAC plumbing is already enterprise-grade**. The `modules` table already stores `route_path`, `icon`, `display_order` — the metadata needed for a dynamic navigation engine. The refactor is primarily a **frontend architecture transformation** with minimal backend additions.

---

## SECTION 1 — RUNTIME TRUTH MAPPING

### 1.1 Login Flow

| Step | File | What Happens |
|------|------|--------------|
| 1 | `rrf-portal-nextjs/app/login/page.jsx` | User enters userId + password |
| 2 | `rrf-portal-nextjs/app/login/page.jsx:37` | `fetch('http://localhost:4000/auth/login', { method: 'POST' })` |
| 3 | `rrf-portal-backend/src/auth/auth.controller.ts:17` | `@UseGuards(LocalAuthGuard)` validates credentials |
| 4 | `rrf-portal-backend/src/auth/local.strategy.ts` | Calls `AuthService.validateUser()` |
| 5 | `rrf-portal-backend/src/auth/auth.service.ts:14` | `UsersService.validateUser(userId, password)` bcrypt compare |
| 6 | `rrf-portal-backend/src/auth/auth.service.ts:24` | `PermissionsService.getUserPermissions(user.id)` — SQL join query |
| 7 | `rrf-portal-backend/src/auth/auth.service.ts:29` | JWT signed with payload: `{ userId, sub, roleCode }` |
| 8 | `rrf-portal-backend/src/auth/auth.service.ts:31-48` | Returns `{ access_token, user: { id, name, role: {code}, permissions: [...] } }` |
| 9 | `rrf-portal-nextjs/app/login/page.jsx:49` | `login(data.user, data.access_token)` — stores in AuthContext |
| 10 | `rrf-portal-nextjs/contexts/AuthContext.jsx:68-73` | Stores token, user, permissions in localStorage |
| 11 | `rrf-portal-nextjs/app/login/page.jsx:53-54` | `getHomePageByRole(roleCode)` → routes to hardcoded dashboard |

### 1.2 JWT Generation & Payload

**File:** `rrf-portal-backend/src/auth/auth.service.ts:29`

```typescript
const payload = { userId: user.id, sub: user.id, roleCode: user.role.roleCode };
```

**CRITICAL:** Permissions are NOT in the JWT. JWT only carries `roleCode`. Permissions are:
- Fetched from DB at login and returned in response body
- Stored in localStorage on frontend
- Re-fetched from DB on EVERY backend request by `PermissionGuard`

### 1.3 JWT Validation (Every API Request)

| Step | File | What Happens |
|------|------|--------------|
| 1 | `rrf-portal-backend/src/auth/jwt.strategy.ts:16` | Extracts Bearer token from Authorization header |
| 2 | `rrf-portal-backend/src/auth/jwt.strategy.ts:17` | Validates with `JWT_SECRET` (no fallback — `getOrThrow`) |
| 3 | `rrf-portal-backend/src/auth/jwt.strategy.ts:21-31` | Loads fresh user from DB: `usersService.findById(payload.sub)` |
| 4 | `rrf-portal-backend/src/auth/jwt.strategy.ts:23-25` | Checks `user.isActive` — inactive users rejected |
| 5 | `rrf-portal-backend/src/guards/permission.guard.ts:16-19` | Reads `@RequirePermission()` decorator metadata |
| 6 | `rrf-portal-backend/src/guards/permission.guard.ts:33-36` | `PermissionsService.checkUserPermission(user.id, requiredPermission)` |
| 7 | `rrf-portal-backend/src/permissions/permissions.service.ts:13-28` | SQL queries `users → roles → role_permissions → permissions → modules` |

### 1.4 Permission Loading (DB Query)

**File:** `rrf-portal-backend/src/permissions/permissions.service.ts:13-28`

```sql
SELECT DISTINCT CONCAT(m.module_code, '.', p.permission_code) as permission_code
FROM users u
INNER JOIN roles r ON u.role_id = r.id
INNER JOIN role_permissions rp ON r.id = rp.role_id
INNER JOIN permissions p ON rp.permission_id = p.id
INNER JOIN modules m ON p.module_id = m.id
WHERE u.id = $1
  AND u.is_active = true
  AND r.is_active = true
  AND p.is_active = true
  AND m.is_active = true
ORDER BY permission_code
```

**Result format:** Array of strings like `["DASHBOARD.READ", "RRF.CREATE", "RRF.READ", ...]`

### 1.5 Sidebar Rendering

**File:** `rrf-portal-nextjs/components/PermissionBasedSidebar.jsx`

**Execution flow:**
1. Extract role identity: `user?.role?.code || user?.role` (line 46)
2. Hardcode role booleans: `isAdmin`, `isHR`, `isApprover`, `isPMO`, `isHiringManager` (lines 47-51)
3. Determine dashboard route by role identity (lines 53-58)
4. Build menu items using **BOTH** permission checks (`hasPermission`) and role identity checks (`!isApprover && !isPMO`)
5. Render menu items as links

**Hybrid Evidence:**
- Permission check: `hasPermission(PERMISSIONS.DASHBOARD.READ)` ✅
- Role check: `if (hasPermission(PERMISSIONS.RRF.READ) && !isApprover && !isPMO && !isHR)` ❌
- Role check: `if (isPMO)` for "Edit Form" and "Requests" ❌
- Route determination: `if (isHR) dashboardRoute = '/hr'` ❌

### 1.6 Dashboard Rendering

Each role has a **completely separate** dashboard page:

| Role | Dashboard File | API Calls |
|------|---------------|-----------|
| Admin | `app/admin/page.jsx` | `rrfApi.getStatistics(true)`, `usersApi.getAll()` |
| PMO | `app/pmo/page.jsx` | `rrfApi.getPMODashboardStats()`, `rrfApi.getOpenPositions()` |
| HR | `app/hr/page.jsx` | `rrfApi.getAll()`, `rrfApi.getOpenForHiring()` |
| Approver | `app/approver/page.jsx` | `rrfApi.getPendingApprovals()`, `rrfApi.getStatistics(true)` |
| HM | `app/hiring-manager/dashboard/page.jsx` | `useRRFStatistics()`, `useMyRequests()` |

### 1.7 Route Protection

| Mechanism | File | How | Scope |
|-----------|------|-----|-------|
| Auth redirect | `components/ClientLayout.jsx:56-58` | useEffect checks `!user` → `/login` | All routes |
| Admin role gate | `app/admin/layout.jsx:50` | `roleCode !== 'ADMIN'` → redirect | Admin only |
| ProtectedRoute | `components/ProtectedRoute.jsx` | Permission-based wrapper | Individual pages |
| Backend guard | `guards/permission.guard.ts` | `@RequirePermission()` decorator | Every API endpoint |

**Gap:** No Next.js middleware.ts exists. Route protection is purely client-side.

### 1.8 Module Loading

**File:** `rrf-portal-nextjs/app/layout.jsx`
- Root wraps children in `ClientLayout`
- `ClientLayout` provides `AuthProvider` + `NotificationProvider`
- Admin pages skip `PermissionBasedSidebar` (own layout: `app/admin/layout.jsx`)
- All other pages get `PermissionBasedSidebar` + `Header`

### 1.9 Notification Flow

**Architecture:** Event-driven via NestJS `EventEmitter2`

| Component | File | Role |
|-----------|------|------|
| Emitter | `rrf.service.ts`, `users.service.ts` | Emits events after successful business operations |
| Listener | `notifications/notification.listener.ts` | Subscribes to events, resolves recipients |
| Resolver | `notifications/notification-recipient.resolver.ts` | Determines who receives notification |
| Template | `notifications/notification-template.service.ts` | Generates notification text |
| Gateway | `notifications/notifications.gateway.ts` | WebSocket push to connected clients |
| Service | `notifications/notifications.service.ts` | Persists to DB |

**Recipient resolution uses hardcoded role codes:**
- `resolveByRole('PMO')` — all users with PMO role
- `resolveByRole('HR')` — all users with HR role
- `resolveByRole('ADMIN')` — all users with ADMIN role

### 1.10 Reports Flow

**File:** `rrf-portal-backend/src/reports/reports.service.ts`

- 5 KPIs: Revenue Loss, Average Delay, Sourced Internally, Opportunity Lost, Avg Closing Time
- All endpoints require `RRF.READ` permission only
- **No hardcoded role checks** in reports service
- Data filtered by status and closure reason, not by role
- Export endpoints return full datasets or current filtered view

---

## SECTION 2 — FULL WORKFLOW BIBLE

### 2.1 Complete Workflow State Machine

```
                    ┌─────────────────────────────────────────────────────┐
                    │                                                     │
DRAFT ──(submit)──► PENDING ──(approve)──► APPROVED ──(openForHiring)──► IN_PROGRESS ──(close)──► CLOSED
  │                   │  │                     │                                          │
  │                   │  ├──(decline)──► DECLINED                                        │
  │                   │  │                  │                                             │
  │                   │  ├──(on-hold)──► ON_HOLD                                         │
  │                   │  │                                                               │
  │                   │  └──(reject)──► REJECTED                                         │
  │                   │                                                                  │
  │                   └───────────────── PMO DIRECT ──► IN_PROGRESS ─────────────────────┘
  │                                                        │
  │                                                        └──(fillByBench)──► CLOSED
  │
  └──(submit)──► [same flow]
```

### 2.2 Workflow Transition Matrix

| # | Actor | Action | Entry Status | Exit Status | Conditions | Auto-Assignment | Notification Recipients | Endpoint | Service Method | File Reference |
|---|-------|--------|-------------|-------------|-----------|----------------|------------------------|----------|----------------|---------------|
| 1 | HM | Create | (none) | DRAFT | Must have `RRF.CREATE` | subId generated | Creator | `POST /rrf` | `create()` | `rrf.service.ts:175` |
| 2 | HM | Submit (first) | DRAFT | PENDING | `createdById === userId` | Approvers auto-assigned from `user_subfunctions` by subFunctionId | Assigned approvers | `POST /rrf/:id/submit` | `submit()` | `rrf.service.ts:569` |
| 3 | HM | Resubmit | DECLINED, REJECTED | PENDING | `createdById === userId` | Existing approvers reset to PENDING | Assigned approvers | `POST /rrf/:id/submit` | `submit()` | `rrf.service.ts:569` |
| 4 | PMO | Submit (direct) | DRAFT | IN_PROGRESS | `user.role.roleCode === 'PMO'` | rrfNumber generated, sentToHrAt set | Creator + HR role | `POST /rrf/:id/submit` | `submit()` | `rrf.service.ts:590` |
| 5 | Approver | Approve | PENDING | APPROVED | Must be assigned approver with PENDING status | Other approvers SKIPPED, approvedByName set | Creator + PMO role | `POST /rrf/:id/approve` | `approve()` | `rrf.service.ts:712` |
| 6 | Approver | Reject | PENDING | REJECTED | Must be assigned approver with PENDING status, comments required | — | Creator | `POST /rrf/:id/reject` | `reject()` | `rrf.service.ts:772` |
| 7 | Approver | Decline | PENDING | DECLINED | Must be assigned approver with PENDING status, reason required | declinedByName set | Creator | `POST /rrf/:id/decline` | `decline()` | `rrf.service.ts:943` |
| 8 | Approver | Put On Hold | PENDING | ON_HOLD | Must be assigned approver with PENDING status, reason required | onHoldByName set | Creator + PMO role | `POST /rrf/:id/on-hold` | `putOnHold()` | `rrf.service.ts:1002` |
| 9 | PMO | Open for Hiring | APPROVED | IN_PROGRESS | `RRF.OPEN_FOR_HIRING` permission | rrfNumber generated, sentToHrAt set | Creator + HR role | `POST /rrf/:id/open-for-hiring` | `openForHiring()` | `rrf.service.ts:1052` |
| 10 | PMO | Fill by Bench | APPROVED, IN_PROGRESS, OPEN_FOR_HIRING | CLOSED | `RRF.FILL_FROM_BENCH` permission | internalRrfNo generated | Creator + Approvers | `POST /rrf/:id/fill-by-bench` | `fillByBench()` | `rrf.service.ts:1130` |
| 11 | HR/PMO | Close RRF | IN_PROGRESS, OPEN_FOR_HIRING, APPROVED | CLOSED | `RRF.CLOSE` permission | closeReason derived from closureStatus | Creator + PMO role | `POST /rrf/:id/close` | `closeRrf()` | `rrf.service.ts:1298` |
| 12 | HM/Approver | Update | DRAFT, PENDING, DECLINED | (unchanged) | `RRF.UPDATE` + (creator OR assigned approver) | lastEditedById set | Conditional: approvers or creator | `PUT /rrf/:id` | `update()` | `rrf.service.ts:420` |
| 13 | PMO/Admin | Delete | DRAFT, REJECTED | (removed) | `RRF.DELETE` permission | — | Creator | `DELETE /rrf/:id` | `remove()` | `rrf.service.ts:814` |

### 2.3 Approver Resolution Logic

**File:** `rrf-portal-backend/src/rrf/rrf.service.ts:503-543`

```
getApprovers(subFunctionId):
  IF subFunctionId provided:
    1. Find users WHERE role.roleCode = 'APPROVER' AND user_subfunctions.subfunction_id = subFunctionId AND user.isActive = true
    2. IF found → return these approvers
    3. IF empty → FALLBACK to all ADMIN users
  ELSE (no subFunctionId):
    Return ALL active users with APPROVER role
```

**Critical insight:** Approver assignment is **role-coded** (`roleCode === 'APPROVER'`), NOT permission-based. A dynamically-created role like "Regional Approver" would NOT be discovered by this logic.

### 2.4 Closure Reasons

**File:** `rrf-portal-backend/src/rrf/rrf.service.ts:1282-1286`

| Human Label | Machine Key | Special Behavior |
|-------------|-------------|------------------|
| Resource Hired (External Candidate) | `RESOURCE_HIRED_EXTERNAL` | Standard close |
| Sourced Internally | `SOURCED_INTERNALLY` | Auto-generates `internalRrfNo` (RRF-INT-XXX) |
| Closed/Cancelled by Business | `CLOSED_BY_BUSINESS` | Standard close |

### 2.5 Status History Tracking

Every status transition appends to `rrf.statusHistory` (JSONB column):
```json
{ "status": "approved", "changedById": 3, "changedAt": "2026-04-15T10:30:00Z", "reason": "Looks good" }
```

---

## SECTION 3 — ACTION ELIGIBILITY BIBLE

### 3.1 Complete Action Eligibility Matrix

| Action | API Permission | Actor Eligibility (Backend) | Status Eligibility | Scope Check | Policy Validation | Frontend Visibility | File Ref (Backend) | File Ref (Frontend) |
|--------|---------------|---------------------------|-------------------|-------------|-------------------|--------------------|--------------------|---------------------|
| Create RRF | `RRF.CREATE` | Any user with permission | N/A (new entity) | None | Budget min < max, Experience min < max | `canCreateRRF` flag | `rrf.controller.ts:40` | `PermissionBasedSidebar.jsx:87` |
| Submit | `RRF.UPDATE` | `rrf.createdById === userId` OR PMO role | DRAFT, DECLINED, REJECTED | Creator match | At least 1 approver exists (non-PMO path) | Status-based button show | `rrf.controller.ts:278` | `hiring-manager/view-rrf/[id]/page.jsx` |
| Approve | `APPROVALS.APPROVE` | Must be assigned approver with PENDING approval_status | PENDING | Approver assignment | None beyond assignment check | `hasPermission(PERMISSIONS.APPROVALS.APPROVE)` + status === 'pending' | `rrf.controller.ts:291` | `approver/view-rrf/[id]/page.jsx` |
| Reject | `APPROVALS.REJECT` | Must be assigned approver with PENDING approval_status | PENDING | Approver assignment | Comments required | Same as approve | `rrf.controller.ts:309` | `approver/view-rrf/[id]/page.jsx` |
| Decline | `APPROVALS.APPROVE` | Must be assigned approver with PENDING approval_status | PENDING | Approver assignment | Reason required (non-empty) | Same as approve | `rrf.controller.ts:358` | `approver/view-rrf/[id]/page.jsx` |
| Put On Hold | `APPROVALS.ON_HOLD` | Must be assigned approver with PENDING approval_status | PENDING | Approver assignment | Reason required (non-empty) | Same as approve | `rrf.controller.ts:374` | `approver/view-rrf/[id]/page.jsx` |
| Open for Hiring | `RRF.OPEN_FOR_HIRING` | Any user with permission | APPROVED | None | None | Status === 'approved' on PMO view | `rrf.controller.ts:393` | `pmo/view-rrf/[id]/page.jsx` |
| Fill by Bench | `RRF.FILL_FROM_BENCH` | Any user with permission | APPROVED, IN_PROGRESS, OPEN_FOR_HIRING | None | None | Status-based on PMO view | `rrf.controller.ts:410` | `pmo/view-rrf/[id]/page.jsx` |
| Close RRF | `RRF.CLOSE` | Any user with permission | IN_PROGRESS, OPEN_FOR_HIRING, APPROVED | None | None | Status `in-progress` or `open-for-hiring` on HR/PMO view | `rrf.controller.ts:450` | `hr/view-rrf/[id]/page.jsx`, `pmo/view-rrf/[id]/page.jsx` |
| Update | `RRF.UPDATE` | Creator OR assigned approver | NOT (approved, in-progress, closed) | Creator/Approver match | Budget/experience validation | Editable statuses check | `rrf.controller.ts:262` | `hiring-manager/view-rrf/[id]/page.jsx` |
| Delete | `RRF.DELETE` | Any user with permission | DRAFT, REJECTED | None | None | Status-based | `rrf.controller.ts:331` | N/A |
| Read | `RRF.READ` | Any user with permission | Any | Approver: filtered by subfunction. HM: own only (list). | None | Always visible if permission | `rrf.controller.ts:61,75` | All pages |
| View Statistics | `RRF.READ` | Any user with permission | N/A | APPROVER: subfunction-filtered. HM: own. ADMIN: all. | `viewAll` param | Dashboard cards | `rrf.controller.ts:86` | All dashboards |
| View Reports | `RRF.READ` | Any user with permission | N/A | None (all IN_PROGRESS + CLOSED) | None | `canViewReports` permission flag | `reports.controller.ts` | Sidebar check |

### 3.2 Future Capability Engine Design

The action eligibility matrix above defines the exact signature for a future `can(action, user, rrf)` engine:

```
can(action, user, rrf) =
  hasPermission(action.permission, user.permissions)       // Permission Layer
  && meetsActorEligibility(action, user, rrf)             // Scope Layer
  && meetsStatusEligibility(action, rrf.status)           // Workflow Layer
  && meetsPolicyValidation(action, rrf, payload)          // Policy Layer
```

---

## SECTION 4 — RBAC TRUTH AUDIT

### 4.1 Database Schema (Verified from Entities)

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌─────────────┐
│   roles     │     │ role_permissions  │     │ permissions  │     │   modules   │
│             │     │                  │     │              │     │             │
│ id          │◄────│ role_id          │     │ id           │◄────│ id          │
│ role_name   │     │ permission_id    │────►│ module_id    │────►│ module_code │
│ role_code   │     │ granted_at       │     │ perm_code    │     │ module_name │
│ is_active   │     │                  │     │ perm_name    │     │ route_path  │
│ priority    │     └──────────────────┘     │ is_active    │     │ icon        │
└─────────────┘                              └──────────────┘     │ display_order│
      │                                                           │ is_active   │
      │                                                           └─────────────┘
      ▼
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   users     │     │ user_subfunctions    │     │  subfunctions    │
│             │     │                      │     │                  │
│ id          │◄────│ user_id              │     │ id               │
│ user_id     │     │ subfunction_id       │────►│ name             │
│ role_id     │────►│                      │     │ function_id      │
│ is_active   │     └──────────────────────┘     │ is_active        │
└─────────────┘                                  └──────────────────┘
```

### 4.2 End-to-End Permission Flow — Verified

| Step | Component | Works? | Evidence |
|------|-----------|--------|----------|
| Admin selects permissions in UI | `app/admin/roles/page.jsx` | ✅ | Calls `rolesApi.updatePermissions(roleId, permissionIds)` |
| API receives update | `role-permissions.controller.ts` | ✅ | `@RequirePermission('ROLES.UPDATE')` + `PUT /roles/:roleId/permissions` |
| Transaction saves to DB | `role-permissions.service.ts:73-92` | ✅ | Atomic: DELETE all existing → INSERT new mappings |
| User logs in after change | `auth.service.ts:24` | ✅ | `getUserPermissions(user.id)` fresh SQL query |
| Permissions in login response | `auth.service.ts:44` | ✅ | `permissions: permissions` array included |
| Frontend stores permissions | `AuthContext.jsx:68-73` | ✅ | `localStorage.setItem('permissions', ...)` |
| Frontend sidebar reads | `PermissionBasedSidebar.jsx:33` | ✅ | `usePermission()` → reads from AuthContext |
| Frontend actions check | `hooks/usePermission.js` | ✅ | `hasPermission(permission, permissions)` — array.includes() |
| Backend guard enforces | `guards/permission.guard.ts:33-36` | ✅ | Queries DB in real-time (not from JWT!) |

### 4.3 Critical Gaps Found

| # | Gap | Severity | Evidence |
|---|-----|----------|----------|
| 1 | **Stale frontend permissions** — If Admin changes permissions while user is logged in, frontend shows old state until re-login | MEDIUM | `AuthContext.jsx` reads from localStorage only at init/login |
| 2 | **JWT doesn't carry permissions** — Payload is `{userId, sub, roleCode}` only | LOW (backend re-queries anyway) | `auth.service.ts:29` |
| 3 | **Sidebar uses role identity** — New roles get wrong/broken navigation | HIGH | `PermissionBasedSidebar.jsx:47-58` |
| 4 | **AdminSidebar has zero permission checks** — Hardcoded static array | MEDIUM | `components/admin/AdminSidebar.jsx:14-22` |
| 5 | **No permission refresh mechanism** — No periodic re-fetch, no event-based update | MEDIUM | No code exists for this |
| 6 | **Notification routing uses hardcoded role codes** — `resolveByRole('PMO')` | MEDIUM | `notification-recipient.resolver.ts:51` |
| 7 | **Approver resolution hardcoded** — Only finds `roleCode === 'APPROVER'` users | HIGH | `rrf.service.ts:510` |
| 8 | **No role inheritance** — Each role is isolated, no parent-child hierarchy | LOW (by design) | `role.entity.ts` has no `parentId` |
| 9 | **No permission overrides** — Cannot grant extra permissions to individual users | LOW | No user_permissions table exists |

### 4.4 Security Assessment

| Aspect | Status | Evidence |
|--------|--------|----------|
| API endpoints protected | ✅ Every controller uses `@UseGuards(JwtAuthGuard, PermissionGuard)` | All controllers |
| Rate limiting on login | ✅ `@Throttle({ default: { ttl: 60000, limit: 5 } })` | `auth.controller.ts:11` |
| Password hashing | ✅ bcrypt with salt rounds | `users.service.ts` |
| Inactive user rejection | ✅ JWT strategy checks `user.isActive` | `jwt.strategy.ts:23-25` |
| RBAC bypass possible? | ❌ Not possible at API level | Permission guard always queries DB |
| Frontend-only restrictions | ⚠️ Some route protection is client-side only | No middleware.ts |
| Secrets handling | ✅ `configService.getOrThrow('JWT_SECRET')` — fails if missing | `jwt.strategy.ts:16` |
| Input validation | ✅ NestJS ValidationPipe + class-validator DTOs | Controller params |

---

## SECTION 5 — DYNAMIC ROLE CREATION TRUTH

### 5.1 What Happens When Admin Creates a New Role

**Example:** Admin creates "Interviewer" via the Roles page and assigns permissions: `DASHBOARD.READ`, `RRF.READ`

| System Layer | What Happens | Works? |
|-------------|--------------|--------|
| DB: roles table | New row: `{roleName: 'Interviewer', roleCode: 'INTERVIEWER'}` | ✅ |
| DB: role_permissions | Permission IDs mapped to new role | ✅ |
| User assigned new role | `users.role_id` updated | ✅ |
| User logs in | JWT generated, permissions array returned correctly | ✅ |
| Backend API calls | `PermissionGuard` correctly allows `RRF.READ` endpoints | ✅ |
| Frontend: login redirect | `getHomePageByRole('INTERVIEWER')` → fallback to `/hiring-manager/dashboard` | ⚠️ Wrong page |
| Frontend: sidebar | `dashboardRoute` defaults to `/hiring-manager/dashboard` (no match) | ❌ Broken |
| Frontend: dashboard | Route `/hiring-manager/dashboard` loads HM-specific data | ❌ Wrong context |
| Frontend: view-rrf | No `/interviewer/view-rrf/[id]` route exists | ❌ 404 |
| Backend: workflow | `getApprovers()` won't find "Interviewer" role users | ✅ (not relevant) |
| Backend: notifications | `resolveByRole('INTERVIEWER')` would work IF called | ✅ |
| Backend: statistics | Would filter as "other" — shows own data only | ✅ |

### 5.2 Root Causes — Why Dynamic Roles Break Frontend

| # | Root Cause | File | Line | What It Does |
|---|-----------|------|------|-------------|
| 1 | Hardcoded role→route map | `utils/permissions.js:137-148` | `getHomePageByRole()` only maps 5 roles | Unknown roles → `/hiring-manager/dashboard` |
| 2 | Hardcoded role booleans | `PermissionBasedSidebar.jsx:47-51` | `isAdmin`, `isHR`, `isApprover`, `isPMO`, `isHiringManager` | Unknown roles match none |
| 3 | Hardcoded dashboard route | `PermissionBasedSidebar.jsx:54-58` | `if (isHR) dashboardRoute = '/hr'` | Unknown roles get HM dashboard |
| 4 | Role-folder routing | `app/admin/`, `app/pmo/`, `app/hr/`, etc. | Filesystem-based routing | No folder = no page |
| 5 | Admin role gate | `app/admin/layout.jsx:50` | `roleCode !== 'ADMIN'` → redirect | Only ADMIN can access admin |
| 6 | ModernRRFForm role redirect | `components/ModernRRFForm.jsx:641,777` | `userRole === 'pmo' ? '/pmo' : '/hiring-manager/...'` | Binary role assumption |
| 7 | Unauthorized page | `app/unauthorized/page.jsx:12-22` | Hardcoded role-based "go home" routing | Unknown roles → HM |

### 5.3 What Would Need to Change for Dynamic Roles

**Frontend (Major):**
1. Replace `getHomePageByRole()` with universal `/dashboard` route
2. Replace role booleans in sidebar with pure permission checks
3. Create universal `/requests/[id]` route replacing all view-rrf pages
4. Remove role-folder routing dependency
5. Add `/modules/navigation` API consumption for dynamic sidebar

**Backend (Minor):**
1. Add `GET /modules/navigation` endpoint — returns user's accessible modules
2. Add `GET /dashboard/config` endpoint — returns permission-filtered widget config
3. Convert `getApprovers()` to use permission (`APPROVALS.APPROVE`) instead of roleCode
4. Convert `resolveByRole()` in notifications to `resolveByPermission()`
5. Convert statistics filtering to use permissions instead of roleCode

---

## SECTION 6 — UNIVERSAL VIEW RRF BLUEPRINT

### 6.1 Current Duplication Matrix

| Feature | PMO View | HR View | Approver View | HM View |
|---------|----------|---------|---------------|---------|
| **File** | `app/pmo/view-rrf/[id]/page.jsx` | `app/hr/view-rrf/[id]/page.jsx` | `app/approver/view-rrf/[id]/page.jsx` | `app/hiring-manager/view-rrf/[id]/page.jsx` |
| **Lines** | ~590 | ~220 | ~530 | ~200 |
| **Data hook** | Manual useState/useEffect | `useRRFDetail(id)` | `useRRFDetail` + `useApproverRequests` | `useRRFDetail(id)` |
| **Shared component** | ❌ Inline sections | ✅ `RRFContentSections` | ❌ Inline sections | ✅ `RRFContentSections` |
| **Split-panel layout** | ✅ | ✅ | ✅ | ✅ |
| **Section navigation** | ✅ Identical | ✅ Identical | ✅ Identical | ✅ Identical |
| **Print/Export logic** | ✅ Duplicated | ✅ Duplicated | ✅ Duplicated | ✅ Duplicated |
| **Status badge** | Simple text | `StatusWithDetails` | Condition-based | `StatusWithDetails` |
| **Action: Close** | ✅ (modal) | ✅ (modal) | ❌ | ❌ |
| **Action: Open for Hiring** | ✅ | ❌ | ❌ | ❌ |
| **Action: Fill by Bench** | ✅ | ❌ | ❌ | ❌ |
| **Action: Approve/Reject/Hold** | ❌ | ❌ | ✅ | ❌ |
| **Action: Edit** | ❌ | ❌ | ✅ (redirect) | ✅ (redirect) |

### 6.2 Verdict: Can One Page Replace All?

**YES — Confidence: 90%**

All four pages share:
- Identical split-panel layout (left sticky nav + right content)
- Identical data model (single RRF entity by ID)
- Identical content sections (handled by `RRFContentSections` component)
- Identical print/export logic

**Only difference:** Action buttons, which are determined by: `permission + rrf.status + approver_assignment`

### 6.3 Universal View RRF Architecture

```
/requests/[id]/page.jsx
├── Data: useRRFDetail(id)
├── Layout: SplitPanelLayout (left nav + right content)
├── Content: <RRFContentSections rrfData={data} activeSection={section} />
├── Status: <StatusBadge status={rrf.status} details={rrf} />
├── Actions: <ActionBar rrf={rrf} user={user} />
│   ├── ActionEngine.canPerform('submit', user, rrf) → Submit button
│   ├── ActionEngine.canPerform('approve', user, rrf) → Approve button
│   ├── ActionEngine.canPerform('decline', user, rrf) → Decline button
│   ├── ActionEngine.canPerform('on-hold', user, rrf) → Hold button
│   ├── ActionEngine.canPerform('open-for-hiring', user, rrf) → Open button
│   ├── ActionEngine.canPerform('fill-by-bench', user, rrf) → Bench button
│   ├── ActionEngine.canPerform('close', user, rrf) → Close button
│   └── ActionEngine.canPerform('edit', user, rrf) → Edit button
└── Print: <PrintExport rrf={rrf} /> (shared component)
```

### 6.4 Action Engine Implementation (Concept)

```javascript
// config/action-registry.js
const ACTION_REGISTRY = {
  submit: {
    permission: 'RRF.UPDATE',
    statuses: ['draft', 'declined', 'rejected'],
    actorCheck: (user, rrf) => rrf.createdById === user.id,
  },
  approve: {
    permission: 'APPROVALS.APPROVE',
    statuses: ['pending'],
    actorCheck: (user, rrf) => rrf.approvers?.some(a => a.userId === user.id && a.approvalStatus === 'pending'),
  },
  'open-for-hiring': {
    permission: 'RRF.OPEN_FOR_HIRING',
    statuses: ['approved'],
    actorCheck: () => true, // Any user with permission
  },
  close: {
    permission: 'RRF.CLOSE',
    statuses: ['in-progress', 'open-for-hiring', 'approved'],
    actorCheck: () => true,
  },
  edit: {
    permission: 'RRF.UPDATE',
    statuses: ['draft', 'pending', 'declined', 'rejected'],
    actorCheck: (user, rrf) => rrf.createdById === user.id || rrf.approvers?.some(a => a.userId === user.id),
  },
}
```

### 6.5 Migration Path

1. Create `/app/(portal)/requests/[id]/page.jsx` — universal page
2. Implement `ActionEngine` using registry above
3. Route old paths via Next.js rewrites: `/pmo/view-rrf/[id]` → `/requests/[id]`
4. Validate all actions work for each role
5. Remove old view-rrf pages after validation

### 6.6 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Action visibility regression | Medium | High | Automated test: for each role, verify correct buttons appear |
| Approver assignment check fails | Low | High | Keep existing `useApproverRequests` hook logic |
| Print/Export breaks | Low | Low | Reuse exact existing `handlePrint`/`handleExport` |
| Status badge differences | Low | Low | Use `StatusWithDetails` for all (already handles all statuses) |

---

## SECTION 7 — UNIFIED SIDEBAR BLUEPRINT

### 7.1 Current Sidebar Truth

**Two completely separate sidebar implementations exist:**

| Sidebar | File | Mechanism | Scope |
|---------|------|-----------|-------|
| PermissionBasedSidebar | `components/PermissionBasedSidebar.jsx` | Hybrid (permission + role) | All non-admin routes |
| AdminSidebar | `components/admin/AdminSidebar.jsx` | 100% hardcoded static array | Admin routes only |

**PermissionBasedSidebar analysis:**

| Menu Item | Permission Check | Role Check | Verdict |
|-----------|-----------------|------------|---------|
| Dashboard | `DASHBOARD.READ` ✅ | Route determined by `isHR/isApprover/isPMO/isAdmin` ❌ | Hybrid |
| Requests (HM) | `RRF.READ` ✅ | `!isApprover && !isPMO && !isHR` ❌ | Hybrid |
| Requests (PMO) | None | `isPMO` ❌ | Role-driven |
| Drafts | `canCreateRRF` ✅ | `!isPMO` ❌ | Hybrid |
| Reports | `canViewReports` ✅ | `!isHR && (isPMO \|\| isApprover)` ❌ | Hybrid |
| Edit Form | None | `isPMO` ❌ | Role-driven |
| Users | `canManageUsers` ✅ | None | Permission-driven |
| Settings | `canManageSettings` ✅ | None | Permission-driven |

### 7.2 Existing DB Foundation

The `modules` table ALREADY has navigation metadata:

```typescript
// module.entity.ts — EXISTING fields
@Column({ name: 'route_path', length: 255, nullable: true })
routePath: string;

@Column({ length: 50, nullable: true })
icon: string;

@Column({ name: 'display_order', default: 0 })
displayOrder: number;

@Column({ name: 'parent_module_id', nullable: true })
parentModuleId: number;
```

This means the sidebar can be driven ENTIRELY from the `modules` table combined with the user's permissions.

### 7.3 Dynamic Navigation Engine Architecture

```
Backend Endpoint: GET /modules/navigation
Response:
[
  {
    "moduleCode": "DASHBOARD",
    "moduleName": "Dashboard",
    "routePath": "/dashboard",
    "icon": "HomeOutlined",
    "displayOrder": 1,
    "parentModuleId": null,
    "children": []
  },
  {
    "moduleCode": "RRF",
    "moduleName": "Requests",
    "routePath": "/requests",
    "icon": "FileTextOutlined",
    "displayOrder": 2,
    "parentModuleId": null,
    "children": [
      { "moduleCode": "RRF_DRAFTS", "moduleName": "Drafts", "routePath": "/requests/drafts", ... }
    ]
  },
  ...
]
```

**Logic:** Return only modules where user has at least one permission in that module (already implementable via `canAccessModule()` on backend).

### 7.4 Migration Path

**Phase 1:** Add `GET /modules/navigation` endpoint (backend)
**Phase 2:** Create `NavigationEngine` component that consumes this endpoint
**Phase 3:** Run `NavigationEngine` alongside `PermissionBasedSidebar` (feature flag)
**Phase 4:** Validate all roles see correct items
**Phase 5:** Switch to `NavigationEngine` for all users
**Phase 6:** Remove `PermissionBasedSidebar` and `AdminSidebar`

### 7.5 Navigation Schema Requirements

```typescript
interface NavItem {
  moduleCode: string;
  moduleName: string;
  routePath: string;
  icon: string;
  displayOrder: number;
  parentModuleId: number | null;
  badge?: { type: 'count' | 'dot'; source: string }; // e.g., unread notifications
  children: NavItem[];
}
```

**What's needed beyond current DB:**
- Populate `route_path` and `icon` for all module rows (data migration only)
- Add child modules for nested menus (e.g., RRF_DRAFTS under RRF)
- Badge configuration (optional enhancement)

### 7.6 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Module data incomplete | Medium | Medium | Pre-populate in seed migration |
| Missing menu items for existing users | Medium | High | Run both sidebars in parallel during migration |
| Admin sees wrong items | Low | Medium | Admin module already has all permissions |
| Mobile responsiveness regression | Low | Low | Keep same CSS structure |

---

## SECTION 8 — UNIFIED DASHBOARD BLUEPRINT

### 8.1 Current Dashboard Comparison

| Feature | Admin | PMO | HR | Approver | HM |
|---------|-------|-----|-----|----------|-----|
| **Stat cards** | Total, Pending, Approved, In Progress, Closed, Users | Request Positions, Open for Hiring, Closed, Sourced, Closed by Business, Processed | Open Positions, Closed | Pending, byStatus counts | In Progress, Pending, Approved, On Hold, Declined, All |
| **API for stats** | `getStatistics(all=true)` | `getPMODashboardStats()` | computed from `getAll()` | `getStatistics(all=true)` | `useRRFStatistics(false)` |
| **Table** | None | Recent open positions | Open for hiring list | Pending approvals | Recent requests |
| **API for table** | None | `getOpenPositions()` | `getOpenForHiring()` | `getPendingApprovals()` | `useMyRequests()` |
| **StatCard component** | ✅ Shared | ✅ Shared | ✅ Shared | ✅ Shared | ✅ Shared (via custom hook) |
| **Unique widgets** | User count | Closure breakdown | — | — | — |
| **Data fetching pattern** | useEffect + state | useSmartFetch | useSmartFetch | useSmartFetch | Custom hooks |

### 8.2 Common Implementation Across All Dashboards

All dashboards use:
- `StatCard` component (identical across all)
- Grid layout (`grid-cols-2 md:grid-cols-3`)
- Recent items table (top 5-6 entries)
- Search/filter on table
- Priority/Status badges (duplicated badge logic)
- Refresh mechanism

### 8.3 Can One Dashboard Engine Replace All?

**YES — Confidence: 80%**

**Strategy:** Permission-to-widget mapping

```javascript
const WIDGET_REGISTRY = [
  // Stats widgets
  { id: 'total-rrfs', type: 'stat', permission: 'DASHBOARD.READ', scope: 'all', api: 'statistics.total' },
  { id: 'pending-count', type: 'stat', permission: 'APPROVALS.READ', scope: 'assigned', api: 'statistics.pending' },
  { id: 'open-positions', type: 'stat', permission: 'RRF.OPEN_FOR_HIRING', scope: 'all', api: 'pmoStats.openedPositions' },
  { id: 'my-pending', type: 'stat', permission: 'RRF.CREATE', scope: 'own', api: 'statistics.pending' },
  { id: 'user-count', type: 'stat', permission: 'USERS.READ', scope: 'all', api: 'users.count' },
  
  // Table widgets
  { id: 'pending-approvals', type: 'table', permission: 'APPROVALS.APPROVE', api: 'pendingApprovals' },
  { id: 'open-for-hiring', type: 'table', permission: 'RRF.OPEN_FOR_HIRING', api: 'openForHiring' },
  { id: 'my-requests', type: 'table', permission: 'RRF.CREATE', api: 'myRequests' },
  { id: 'recent-positions', type: 'table', permission: 'RRF.READ', scope: 'pmo', api: 'openPositions' },
]
```

### 8.4 Dashboard Engine Architecture

```
DashboardEngine
├── useWidgetConfig(user) → filters WIDGET_REGISTRY by user.permissions
├── StatCardGrid
│   ├── for each stat widget:
│   │   └── <StatCard title={w.title} value={data[w.api]} icon={w.icon} color={w.color} />
├── TableWidgets
│   └── for each table widget:
│       └── <DashboardTable columns={w.columns} data={data[w.api]} />
└── LazyLoad + Suspense for each widget independently
```

### 8.5 Backend Requirements

**New endpoint needed:** `GET /dashboard/data`

Returns all data the user is authorized to see:
```json
{
  "statistics": { "total": 45, "pending": 8, ... },
  "pmoStats": { "openedPositions": 3, "sentToHR": 8, ... },
  "tables": {
    "pendingApprovals": [...],
    "openForHiring": [...],
    "myRequests": [...]
  }
}
```

OR: Frontend calls existing individual endpoints lazily per widget (less backend change).

### 8.6 Migration Path

1. Create `DashboardEngine` component + widget registry (config file)
2. Create universal `/dashboard` route
3. Wire up existing APIs (no new endpoints initially)
4. Run in parallel: old dashboards still active at `/pmo`, `/hr`, etc.
5. Validate each role sees correct widgets
6. Redirect old dashboard paths → `/dashboard`
7. Remove old dashboard pages

---

## SECTION 9 — DYNAMIC ROLE ENGINE BLUEPRINT

### 9.1 Enterprise Model: What Admin Creates Should Automatically Work

**Target state:**
```
Admin creates role → Assigns permissions → User assigned role → System auto-provides:
  ✅ Correct dashboard widgets (permission-filtered)
  ✅ Correct sidebar modules (permission-filtered from modules table)
  ✅ Correct page access (permission-guarded routes)
  ✅ Correct action buttons (action eligibility engine)
  ✅ Correct data scope (permission-based filtering)
```

### 9.2 Required Registries

| Registry | Source | Consumer | Exists Today? |
|----------|--------|----------|---------------|
| Permission Registry | `modules` + `permissions` tables | Backend guard, Frontend `usePermission` | ✅ Fully exists |
| Navigation Registry | `modules` table (route_path, icon, display_order) | Sidebar engine | ✅ Schema exists, needs population |
| Widget Registry | Config file (permission → widget mapping) | Dashboard engine | ❌ Must create |
| Action Registry | Config file (permission + status + actor → action) | View RRF action bar | ❌ Must create |
| Workflow Actor Registry | `user_subfunctions` + permission check | Approver resolution, notifications | ⚠️ Partial (uses roleCode today) |

### 9.3 What Already Exists in DB (Ready to Use)

| Table | Navigation-Ready Fields | Status |
|-------|------------------------|--------|
| `modules` | `module_code`, `module_name`, `route_path`, `icon`, `display_order`, `parent_module_id` | ✅ Schema ready, needs data |
| `permissions` | `permission_code`, `permission_name`, `module_id` | ✅ Fully populated |
| `role_permissions` | Links roles ↔ permissions | ✅ Fully functional |
| `roles` | `role_code`, `role_name`, `priority` | ✅ Supports new roles |

### 9.4 What's Missing

| Component | What's Needed | Where | Effort |
|-----------|--------------|-------|--------|
| Modules data population | Fill `route_path` and `icon` for all modules | SQL data migration | Low |
| Backend navigation endpoint | `GET /modules/navigation` — filtered by user perms | New controller method | Low |
| Frontend navigation engine | Replaces hardcoded sidebar | New component | Medium |
| Widget registry config | JSON mapping permission → widget component | Frontend config file | Low |
| Dashboard engine | Renders widgets by permission | New component | Medium |
| Action registry config | JSON mapping action → eligibility rules | Frontend config file | Low |
| Action engine | `canPerform(action, user, rrf)` function | Frontend utility | Low |
| Universal view-rrf page | Single page with action engine | New page | Medium |
| Workflow actor resolution (optional) | Use permission instead of roleCode for approver finding | Service refactor | Medium |
| Notification resolution (optional) | Use permission instead of roleCode | Service refactor | Medium |

### 9.5 Immediate vs. Deferred Changes

**Immediate (enable dynamic roles):**
- Navigation engine (sidebar) — removes role-identity routing
- Universal dashboard with widget registry — removes role-folder dashboards
- Universal view-rrf with action engine — removes role-specific view pages
- Remove `getHomePageByRole()` — replace with `/dashboard`

**Deferred (enhance but not blocking):**
- Workflow actor resolution by permission (requires migration strategy for existing approvers)
- Notification routing by permission
- Backend statistics filtering by permission instead of roleCode

---

## SECTION 10 — BACKEND IMPACT ANALYSIS

### 10.1 Impact Matrix

| Backend Component | Change Required? | Reason | Urgency |
|-------------------|-----------------|--------|---------|
| `auth.service.ts` | ❌ No | JWT + permissions work correctly | — |
| `auth.controller.ts` | ❌ No | Login/verify work correctly | — |
| `jwt.strategy.ts` | ❌ No | Validates correctly | — |
| `permission.guard.ts` | ❌ No | Generic, works for any permission | — |
| `require-permission.decorator.ts` | ❌ No | Generic | — |
| `permissions.service.ts` | ❌ No | Query is role→permission agnostic | — |
| `role-permissions.service.ts` | ❌ No | CRUD works for any role | — |
| `role-permissions.controller.ts` | ❌ No | Endpoints work | — |
| `rrf.controller.ts` | ❌ No | All endpoints have correct permissions | — |
| `rrf.service.ts:getApprovers()` | ⚠️ Optional | Uses `roleCode === 'APPROVER'` hardcoded | Phase 5+ |
| `rrf.service.ts:submit()` | ⚠️ Optional | Uses `roleCode === 'PMO'` for direct-submit | Phase 5+ |
| `rrf.service.ts:getStatistics()` | ⚠️ Optional | Filters by roleCode | Phase 5+ |
| `rrf.service.ts:getPendingApprovals()` | ⚠️ Optional | Filters by roleCode for non-ADMIN | Phase 5+ |
| `rrf.service.ts:findAll()` | ⚠️ Optional | Filters APPROVER by subfunction | Phase 5+ |
| `users.service.ts:createUser()` | ⚠️ Optional | Validates subfunctions only for APPROVER role | Phase 5+ |
| `notification-recipient.resolver.ts` | ⚠️ Optional | `resolveByRole('PMO')`, `resolveByRole('HR')` | Phase 5+ |
| `reports.service.ts` | ❌ No | No role checks, only permission gate | — |
| **NEW: modules.controller.ts** | ✅ Required | `GET /modules/navigation` endpoint | Phase 1 |

### 10.2 New Backend Endpoints Required

| Endpoint | Purpose | Guard | Logic | Phase |
|----------|---------|-------|-------|-------|
| `GET /modules/navigation` | Return user's accessible modules with metadata | `JwtAuthGuard` | Query modules where user has ≥1 permission, include route_path, icon, children | Phase 1 |
| `GET /modules/all` | Return all modules for admin config (optional) | `JwtAuthGuard + ROLES.UPDATE` | Return full tree | Phase 1 |

### 10.3 What Does NOT Need to Change

The entire existing API contract remains stable:
- All existing endpoints keep their paths
- All existing request/response formats stay same
- All existing permission requirements stay same
- All existing business logic stays same
- All existing workflow transitions stay same
- All existing notifications stay same
- All existing database schema stays same

---

## SECTION 11 — STRANGLER MIGRATION BLUEPRINT

### Phase 0 — Prerequisites (Foundation)

**Scope:**
- Populate `modules` table with `route_path` and `icon` for all modules
- Create backend `GET /modules/navigation` endpoint
- Create frontend configuration files (widget registry, action registry, navigation schema)
- Set up feature flags infrastructure

**Impacted Files (New Only):**
- `rrf-portal-backend/src/modules/modules.controller.ts` (add method)
- `rrf-portal-nextjs/config/widget-registry.js` (new config)
- `rrf-portal-nextjs/config/action-registry.js` (new config)

**Dependencies:** None
**Risk:** LOW — adds only, changes nothing existing
**Rollback:** Delete new files
**Validation:** Module navigation endpoint returns correct filtered modules for each role
**Success Criteria:** `GET /modules/navigation` returns correct items per role

---

### Phase 1 — Capability Engine

**Scope:**
- Create `ActionEngine` utility: `canPerform(action, user, rrf)` function
- Uses action-registry.js configuration
- Evaluates permission + status + actor eligibility
- Pure function, no side effects, fully testable

**Impacted Files (New Only):**
- `rrf-portal-nextjs/lib/engines/ActionEngine.js`
- `rrf-portal-nextjs/lib/engines/__tests__/ActionEngine.test.js`

**Dependencies:** Phase 0 (action registry config)
**Risk:** LOW — new utility, no integration yet
**Rollback:** Delete files
**Validation:** Unit tests pass for all 13 actions × all 5 roles × all 11 statuses
**Success Criteria:** 100% match between ActionEngine output and current hardcoded visibility

---

### Phase 2 — Universal View RRF

**Scope:**
- Create `/app/(portal)/requests/[id]/page.jsx`
- Uses `useRRFDetail` hook (already exists)
- Uses `RRFContentSections` component (already exists)
- Uses `ActionEngine` for button visibility
- Add Next.js rewrites for old paths → new path

**Impacted Files:**
- `rrf-portal-nextjs/app/(portal)/requests/[id]/page.jsx` (new)
- `rrf-portal-nextjs/next.config.js` (add rewrites)

**Dependencies:** Phase 1 (ActionEngine)
**Risk:** MEDIUM — must verify all action flows work
**Rollback:** Remove rewrites, old pages still exist
**Validation Checklist:**
- [ ] HM sees Submit + Edit for DRAFT/DECLINED
- [ ] Approver sees Approve/Decline/Hold for PENDING (only if assigned)
- [ ] PMO sees Open for Hiring for APPROVED
- [ ] PMO sees Fill by Bench for APPROVED/IN_PROGRESS
- [ ] HR sees Close for IN_PROGRESS
- [ ] Print/Export works
- [ ] All sections render correctly
**Success Criteria:** All existing view-rrf test cases pass on new page

---

### Phase 3 — Dynamic Sidebar (Navigation Engine)

**Scope:**
- Create `NavigationEngine` component consuming `GET /modules/navigation`
- Runs ALONGSIDE existing `PermissionBasedSidebar` (feature flag)
- No role-identity checks — pure permission + module metadata
- Handles nested menus, active state, mobile

**Impacted Files:**
- `rrf-portal-nextjs/components/NavigationEngine.jsx` (new)
- `rrf-portal-nextjs/components/ClientLayout.jsx` (feature flag toggle)

**Dependencies:** Phase 0 (backend endpoint + populated modules data)
**Risk:** MEDIUM — sidebar UX change visible to all users
**Rollback:** Feature flag → revert to old sidebar
**Validation:**
- [ ] Each role sees exactly same menu items as before
- [ ] Active states work correctly
- [ ] Mobile responsive behavior preserved
- [ ] Collapsed state works
**Success Criteria:** UI parity test passes for all 5 existing roles

---

### Phase 4 — Unified Dashboard

**Scope:**
- Create `DashboardEngine` component
- Create `/app/(portal)/dashboard/page.jsx`
- Widget registry maps permissions → widgets
- Each widget fetches its own data (existing APIs)
- Add route: login redirects to `/dashboard` instead of role-specific page

**Impacted Files:**
- `rrf-portal-nextjs/components/engines/DashboardEngine.jsx` (new)
- `rrf-portal-nextjs/app/(portal)/dashboard/page.jsx` (new)
- `rrf-portal-nextjs/utils/permissions.js` (modify `getHomePageByRole` → return `/dashboard`)

**Dependencies:** Phase 0 (widget registry)
**Risk:** MEDIUM-HIGH — dashboard is primary entry point
**Rollback:** Revert `getHomePageByRole` change, old dashboards still at original paths
**Validation:**
- [ ] Admin → sees Total RRFs, Pending, Approved, Users widgets
- [ ] PMO → sees Open Positions, Sent to HR, Closure breakdown
- [ ] HR → sees Open for Hiring table, Closed count
- [ ] Approver → sees Pending count, approval table
- [ ] HM → sees status counts, my requests table
**Success Criteria:** Each role's dashboard shows same data as before

---

### Phase 5 — Role-by-Role Migration

**Scope:**
- Migrate each role's pages to universal routes:
  - `/pmo/view-rrf/[id]` → redirect to `/requests/[id]`
  - `/hr/view-rrf/[id]` → redirect to `/requests/[id]`
  - `/approver/view-rrf/[id]` → redirect to `/requests/[id]`
  - `/hiring-manager/view-rrf/[id]` → redirect to `/requests/[id]`
  - `/pmo` → redirect to `/dashboard`
  - `/hr` → redirect to `/dashboard`
  - `/approver` → redirect to `/dashboard`
  - `/hiring-manager/dashboard` → redirect to `/dashboard`
- Convert backend hardcoded role checks (optional, deferred)

**Impacted Files:**
- `rrf-portal-nextjs/next.config.js` (redirects)
- Role-specific page files (add redirects, keep originals)

**Dependencies:** Phases 2, 3, 4 validated
**Risk:** MEDIUM — URL changes affect bookmarks/links
**Rollback:** Remove redirects
**Validation:** All existing user flows work via new routes
**Success Criteria:** Users can complete full workflow without hitting old role-specific pages

---

### Phase 6 — Remove Legacy Role Folders

**Scope:**
- After Phase 5 validated for minimum 2 weeks in production
- Remove: `app/pmo/`, `app/hr/`, `app/approver/`, `app/hiring-manager/`
- Remove: `components/admin/AdminSidebar.jsx`
- Remove: `components/PermissionBasedSidebar.jsx`
- Remove: `components/UnifiedDashboard.jsx` (partially-implemented prototype)
- Merge admin layout into universal layout

**Impacted Files:** ~30 files deleted
**Dependencies:** Phase 5 validation period complete
**Risk:** HIGH — irreversible removal of fallback
**Rollback:** Git revert
**Validation:** Full regression test of all workflows
**Success Criteria:** Zero errors for 1 week post-removal

---

### Phase 7 — Backend Hardcoded Role Removal (Optional)

**Scope:**
- Convert `getApprovers()` to use `APPROVALS.APPROVE` permission lookup
- Convert `submit()` PMO skip-approval to check permission (e.g., `RRF.SKIP_APPROVAL`)
- Convert `getStatistics()` filtering from roleCode to permission-based scope
- Convert `notification-recipient.resolver.ts` from `resolveByRole()` to `resolveByPermission()`

**Impacted Files:**
- `rrf-portal-backend/src/rrf/rrf.service.ts` (6 methods)
- `rrf-portal-backend/src/notifications/notification-recipient.resolver.ts`
- `rrf-portal-backend/src/users/users.service.ts` (subfunction validation)

**Dependencies:** Phase 6 complete, all roles migrated
**Risk:** HIGH — changes core business logic
**Rollback:** Revert service changes (backward-compatible DB)
**Validation:** Full workflow integration test
**Success Criteria:** Dynamic roles can participate in workflows without code changes

---

## SECTION 12 — FINAL EXECUTIVE RECOMMENDATION

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Frontend Architecture | **4/10** | Role-folder structure, massive duplication, not scalable for new roles |
| Backend Architecture | **7.5/10** | Clean module structure, generic guards, but 13 hardcoded role checks |
| RBAC System | **6.5/10** | DB + guard fully enterprise-grade; frontend undermines it with role coupling |
| Workflow Engine | **5.5/10** | Correct business logic, but embedded in service (not configurable) |
| Scalability | **3/10** | Adding a role requires new folder + pages + dashboard + sidebar logic |
| Maintainability | **4/10** | ~1100 LOC duplicated across view-rrf pages; 5 dashboard implementations |
| Security | **7.5/10** | API fully protected; rate limiting; bcrypt; active user checks; no RBAC bypass |

### Refactor Urgency: **HIGH**

The system cannot support dynamic roles without code changes. Every new role requires a developer to create frontend pages. The backend is already enterprise-ready — the frontend is the bottleneck.

### Recommended Path: **Moderate Phased Transformation (Strangler Fig)**

Not a rewrite. Not a patch. A controlled architectural transformation that:
- Preserves all existing behavior at every phase
- Adds new architecture alongside old
- Migrates traffic gradually
- Removes old code only after full validation

### Confidence Level: **85%**

The high confidence comes from:
1. Backend permission system already works end-to-end
2. `modules` table already has navigation metadata fields
3. `RRFContentSections` component already exists for 2/4 view pages
4. `StatCard` is already a shared component
5. `useRRFDetail` hook already exists
6. Action eligibility can be derived directly from existing backend checks

### Timeline Estimate (Relative Effort)

| Phase | Complexity | Dependencies |
|-------|-----------|-------------|
| Phase 0 | Low | None |
| Phase 1 | Low | Phase 0 |
| Phase 2 | Medium | Phase 1 |
| Phase 3 | Medium | Phase 0 |
| Phase 4 | Medium-High | Phase 0 |
| Phase 5 | Low (mostly redirects) | Phases 2-4 |
| Phase 6 | Low (deletion) | Phase 5 + validation period |
| Phase 7 | High (optional) | Phase 6 |

### Final Recommendation

**Execute Phases 0-4 in parallel tracks.** The ActionEngine, NavigationEngine, and DashboardEngine are independent of each other and can be developed simultaneously. Phase 5 is the integration point. Phase 6 is cleanup. Phase 7 is optional but recommended for full enterprise-grade dynamic role support.

**The single biggest impact item:** Replace `getHomePageByRole()` with a universal `/dashboard` route. This single change + DashboardEngine eliminates the primary blocker for dynamic roles.

---

## APPENDIX A — File Reference Index

### Frontend Key Files

| File | Purpose | Role Coupling? |
|------|---------|---------------|
| `contexts/AuthContext.jsx` | Auth state, localStorage management | ❌ |
| `hooks/usePermission.js` | Permission checking utility | ❌ |
| `utils/permissions.js` | Permission constants + `getHomePageByRole` | ⚠️ Role map |
| `components/PermissionBasedSidebar.jsx` | Main sidebar | ⚠️ Heavy hybrid |
| `components/admin/AdminSidebar.jsx` | Admin sidebar | ❌ Hardcoded |
| `components/ClientLayout.jsx` | Root layout orchestrator | ⚠️ Skips admin |
| `components/StatCard.jsx` | Reusable KPI card | ❌ Clean |
| `components/RRFContentSections.jsx` | Shared RRF sections | ❌ Clean |
| `components/ProtectedRoute.jsx` | Permission-based route guard | ❌ Clean |
| `components/UnifiedDashboard.jsx` | Prototype (uses permission heuristics) | ⚠️ Fragile |
| `app/admin/layout.jsx` | Admin-only layout with role gate | ❌ Hardcoded |
| `app/login/page.jsx` | Login + role-based redirect | ⚠️ Role map |
| `app/unauthorized/page.jsx` | Access denied + role redirect | ⚠️ Role map |
| `components/ModernRRFForm.jsx` | RRF create/edit form | ⚠️ Role redirect |

### Backend Key Files

| File | Purpose | Role Coupling? |
|------|---------|---------------|
| `auth/auth.service.ts` | Login + JWT + permissions | ❌ Clean |
| `auth/jwt.strategy.ts` | JWT validation | ❌ Clean |
| `guards/permission.guard.ts` | Generic permission enforcement | ❌ Clean |
| `decorators/require-permission.decorator.ts` | Permission decorator | ❌ Clean |
| `permissions/permissions.service.ts` | Permission query + check | ❌ Clean |
| `role-permissions/role-permissions.service.ts` | Role↔permission CRUD | ❌ Clean |
| `rrf/rrf.controller.ts` | All RRF endpoints | ❌ Clean |
| `rrf/rrf.service.ts` | Business logic + workflow | ⚠️ 13 role checks |
| `users/users.service.ts` | User CRUD + subfunction | ⚠️ 2 role checks |
| `notifications/notification-recipient.resolver.ts` | Who gets notified | ⚠️ Role-based |
| `notifications/notification.listener.ts` | Event handlers | ⚠️ Routes by role |
| `reports/reports.service.ts` | KPI calculations | ❌ Clean |
| `modules/module.entity.ts` | Module metadata (has route_path, icon!) | ❌ Ready |

---

## APPENDIX B — Hardcoded Role Check Registry

Every hardcoded role reference that must eventually be replaced:

| # | File | Line | Code | Alternative |
|---|------|------|------|-------------|
| 1 | `rrf.service.ts` | 262 | `user.role.roleCode === 'APPROVER'` | Check if user has `APPROVALS.APPROVE` permission |
| 2 | `rrf.service.ts` | 338 | `user.role.roleCode === 'APPROVER'` | Same |
| 3 | `rrf.service.ts` | 590 | `user?.role?.roleCode === 'PMO'` | Check for new `RRF.SKIP_APPROVAL` permission |
| 4 | `rrf.service.ts` | 892 | `user.role.roleCode === 'APPROVER'` | Permission + scope check |
| 5 | `rrf.service.ts` | 902 | `user.role.roleCode === 'HIRING_MANAGER'` | Check if NOT admin/pmo permissions |
| 6 | `rrf.service.ts` | 1349 | `user.role.roleCode !== 'ADMIN'` | Check for `APPROVALS.VIEW_ALL` permission |
| 7 | `users.service.ts` | 132 | `role.roleCode === 'APPROVER'` | Check if role has `APPROVALS.APPROVE` permission |
| 8 | `users.service.ts` | 215 | `role.roleCode === 'APPROVER'` | Same |
| 9 | `notification-recipient.resolver.ts` | Various | `resolveByRole('PMO')` | `resolveByPermission('RRF.OPEN_FOR_HIRING')` |
| 10 | `notification-recipient.resolver.ts` | Various | `resolveByRole('HR')` | `resolveByPermission('RRF.CLOSE')` |
| 11 | `notification-recipient.resolver.ts` | Various | `resolveByRole('ADMIN')` | `resolveByPermission('USERS.CREATE')` |
| 12 | `PermissionBasedSidebar.jsx` | 47-51 | `roleCode === 'ADMIN'` etc. | Remove entirely (use NavigationEngine) |
| 13 | `utils/permissions.js` | 137-148 | `getHomePageByRole()` | Return universal `/dashboard` |
| 14 | `app/admin/layout.jsx` | 50 | `roleCode !== 'ADMIN'` | Check for `canManageUsers` or admin-level permission |
| 15 | `app/unauthorized/page.jsx` | 12-22 | Role-based redirect | Navigate to `/dashboard` |
| 16 | `ModernRRFForm.jsx` | 641, 777, 1028 | `userRole === 'pmo'` | Navigate to `/requests` |

---

## APPENDIX C — Zero Breakage Guarantee Validation

### What MUST Remain Identical After Each Phase

| Business Rule | Verification Method |
|--------------|-------------------|
| Login flow produces same JWT + permissions | Compare login response payload |
| HM can only submit own RRFs | Test: submit as different user → 403 |
| Approver only sees assigned subfunctions | Test: query pending with unassigned user → empty |
| PMO submission skips approval | Test: PMO submits → status = IN_PROGRESS (not PENDING) |
| Decline requires reason | Test: decline without reason → 400 |
| Close generates internal RRF number for sourced internally | Test: close with SOURCED_INTERNALLY → internalRrfNo populated |
| Notifications reach correct recipients | Test: approve → creator + PMO notified |
| Statistics filtered by role scope | Test: HM sees own, Approver sees subfunction, Admin sees all |
| Reports show IN_PROGRESS + CLOSED only | Test: query reports → no DRAFT/PENDING in results |
| Admin can assign permissions to any role | Test: full CRUD cycle on role_permissions |
| Form config editable by PMO | Test: RRF.UPDATE permission allows form-config endpoints |
| Rate limiting on login | Test: 6th attempt in 60s → 429 |
| Inactive user cannot access | Test: deactivate user → next API call → 401 |

---

*END OF DOCUMENT*

*This blueprint is based on verified codebase evidence as of April 30, 2026.*
*No assumptions. No code changes. Read-only forensic analysis.*
