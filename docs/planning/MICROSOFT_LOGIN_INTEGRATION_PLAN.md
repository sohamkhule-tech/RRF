# Microsoft Entra ID (Azure AD) Integration — Master Implementation Plan

> **Document Type**: Read-only architecture planning — NO code changes made  
> **Target System**: RRF Portal (NestJS + Next.js 14 + PostgreSQL)  
> **Date**: April 30, 2026  
> **Author**: Principal Identity Architect analysis

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Auth Analysis](#2-current-auth-analysis)
3. [Microsoft Integration Feasibility](#3-microsoft-integration-feasibility)
4. [Recommended Auth Architecture](#4-recommended-auth-architecture)
5. [User Onboarding Architecture](#5-user-onboarding-architecture)
6. [Role Assignment Architecture](#6-role-assignment-architecture)
7. [RBAC Integration](#7-rbac-integration)
8. [Admin UX Changes](#8-admin-ux-changes)
9. [DB Schema Changes](#9-db-schema-changes)
10. [Frontend Change Map](#10-frontend-change-map)
11. [Backend Change Map](#11-backend-change-map)
12. [Security Design](#12-security-design)
13. [Login UX Planning](#13-login-ux-planning)
14. [Session Architecture](#14-session-architecture)
15. [Migration Plan](#15-migration-plan)
16. [Risk Register](#16-risk-register)
17. [Final Recommendation](#17-final-recommendation)

---

## 1. Executive Summary

### What This Document Covers

A complete architecture plan for integrating **Microsoft Entra ID / Azure AD** single sign-on into the existing RRF Portal, verified against every relevant source file in the codebase.

### Core Recommendation (TL;DR)

| Decision | Recommendation |
|----------|---------------|
| **Auth Model** | **Hybrid** — Microsoft SSO as primary + local login retained for service/fallback accounts |
| **Onboarding Model** | **Model A (Admin Pre-Creates)** with auto-link on first Microsoft login via email match |
| **Role Assignment** | **Admin assigns role** at user creation time; Microsoft provides identity only, not authorization |
| **Session Model** | Keep backend-issued JWT; Microsoft tokens used only for initial authentication, then exchanged for internal JWT |
| **Frontend Library** | MSAL.js (@azure/msal-browser) directly — no NextAuth.js dependency |
| **Migration Strategy** | 3-phase zero-downtime rollout with full backward compatibility |

### Feasibility Score: **8.5 / 10** — Highly feasible

The existing architecture is well-structured for this integration. The backend's Passport.js + JWT model, combined with the frontend's token-based auth via AuthContext, provides clean insertion points for Microsoft authentication without requiring fundamental restructuring.

---

## 2. Current Auth Analysis

### 2.1 Current Authentication Lifecycle — Step by Step

Verified from actual source code. Every reference below is a real file and line.

#### Step 1: User Enters Credentials

**File**: [app/login/page.jsx](../rrf-portal-nextjs/app/login/page.jsx)

- User enters `userId` (not email) and `password` into the login form
- Form submits via `fetch('http://localhost:4000/auth/login', ...)` ← **hardcoded URL** (not using apiConfig)
- Payload: `{ userId, password }`

#### Step 2: Backend LocalStrategy Validates

**File**: [src/auth/local.strategy.ts](../rrf-portal-backend/src/auth/local.strategy.ts)

```
LocalStrategy configured with:
  usernameField: 'userId'    ← not email
  passwordField: 'password'
```

- Calls `authService.validateUser(userId, password)`

**File**: [src/auth/auth.service.ts](../rrf-portal-backend/src/auth/auth.service.ts)

- `validateUser()` → calls `usersService.validateUser(userId, password)`

**File**: [src/users/users.service.ts](../rrf-portal-backend/src/users/users.service.ts)

- `validateUser()` → `findByUserId(userId)` → loads user with role relation
- Checks `user.isActive === true`
- Compares `bcrypt.compare(password, user.passwordHash)`
- Returns full user object or `null`

#### Step 3: Controller Invokes Login

**File**: [src/auth/auth.controller.ts](../rrf-portal-backend/src/auth/auth.controller.ts)

- Route: `POST /auth/login` — guarded by `LocalAuthGuard`, throttled (5 req/60s)
- Calls `authService.login(req.user)`

#### Step 4: JWT Token Issued with Permissions

**File**: [src/auth/auth.service.ts](../rrf-portal-backend/src/auth/auth.service.ts) — `login()` method

1. `permissionsService.getUserPermissions(user.id)` — raw SQL join across 5 tables
2. `usersService.updateLastLogin(user.id)` — records login timestamp
3. Signs JWT: `{ userId: user.id, sub: user.id, roleCode: user.role.roleCode }`
4. Returns:
   ```json
   {
     "success": true,
     "access_token": "<JWT>",
     "user": {
       "id": 1,
       "userId": "hm001",
       "name": "John Doe",
       "email": "john@company.com",
       "role": { "id": 5, "code": "HIRING_MANAGER", "name": "Hiring Manager" },
       "department": "Engineering",
       "permissions": ["RRF.CREATE", "RRF.READ", "DASHBOARD.READ", ...]
     }
   }
   ```

#### Step 5: Frontend Stores Token + User

**File**: [contexts/AuthContext.jsx](../rrf-portal-nextjs/contexts/AuthContext.jsx)

- `login(userData, token)` stores to:
  - `localStorage('token')` — JWT string
  - `localStorage('user')` — user JSON (includes permissions)
  - `localStorage('permissions')` — permissions array separately

#### Step 6: Frontend Routes to Home

**File**: [app/login/page.jsx](../rrf-portal-nextjs/app/login/page.jsx) + [utils/permissions.js](../rrf-portal-nextjs/utils/permissions.js)

- Calls `getHomePageByPermissions(permissions)` → determines landing page:
  - `USERS.CREATE` → `/admin`
  - `REPORTS.EXPORT && !RRF.CREATE` → `/hr`
  - `APPROVALS.APPROVE` → `/approver`
  - `RRF.DELETE && !USERS.CREATE` → `/pmo`
  - Default → `/hiring-manager/dashboard`

#### Step 7: Subsequent API Calls

**File**: [lib/api/apiConfig.js](../rrf-portal-nextjs/lib/api/apiConfig.js)

- Every API call reads `localStorage('token')`
- Attaches `Authorization: Bearer <token>` header
- On 401: clears localStorage, dispatches storage event → redirect to `/login`

#### Step 8: Backend Validates Each Request

**File**: [src/auth/jwt.strategy.ts](../rrf-portal-backend/src/auth/jwt.strategy.ts)

- Extracts Bearer token from header
- Verifies JWT signature + expiry
- Calls `usersService.findById(payload.sub)` — **DB query every request**
- Checks `user.isActive === true`
- Returns `{ id, userId, email, fullName, role, department }` → attached to `request.user`

**File**: [src/guards/permission.guard.ts](../rrf-portal-backend/src/guards/permission.guard.ts)

- If `@RequirePermission` decorator present on handler:
  - Calls `permissionsService.checkUserPermission(user.id, requiredPermission)` — **another DB query**
  - 5-table JOIN: `users → roles → role_permissions → permissions → modules`

#### Step 9: Logout

**File**: [contexts/AuthContext.jsx](../rrf-portal-nextjs/contexts/AuthContext.jsx)

- Clears `localStorage` (token, user, permissions)
- Clears API cache (`clearAllCache()`)
- `router.push('/login')`
- **No server-side token revocation** — JWT remains valid until natural expiry (24h)

### 2.2 Architecture Diagram — Current State

```
┌────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js 14, port 3000)                           │
│                                                            │
│  login/page.jsx                                            │
│       │ POST { userId, password }                          │
│       ▼                                                    │
│  AuthContext.login(user, token)                             │
│       │ stores in localStorage                             │
│       ▼                                                    │
│  PermissionBasedSidebar / ProtectedRoute                   │
│       │ reads permissions from user state                  │
│       ▼                                                    │
│  apiConfig.apiRequest()                                    │
│       │ Authorization: Bearer <jwt>                        │
└───────┼────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│ BACKEND (NestJS, port 4000)                                │
│                                                            │
│  POST /auth/login                                          │
│       │ LocalAuthGuard → LocalStrategy                     │
│       │ → bcrypt compare → issue JWT                       │
│       ▼                                                    │
│  JwtAuthGuard → JwtStrategy                                │
│       │ verify JWT → findById(sub) → check isActive        │
│       ▼                                                    │
│  PermissionGuard                                           │
│       │ checkUserPermission(id, 'MODULE.ACTION')           │
│       │ → 5-table SQL JOIN                                 │
│       ▼                                                    │
│  Controller → Service → Repository                         │
└────────────────────────────────────────────────────────────┘
```

### 2.3 Critical Auth Properties

| Property | Current Value | Implication for Microsoft Integration |
|----------|--------------|--------------------------------------|
| Login identifier | `user_id` (string, e.g., "hm001") | Microsoft returns email/OID — need matching strategy |
| Password storage | `bcrypt` hash in `password_hash` column | Microsoft users won't have passwords — column must become nullable |
| JWT payload | `{ userId, sub, roleCode }` | Can remain unchanged — payload doesn't depend on auth method |
| JWT secret | `process.env.JWT_SECRET` | Internal JWT remains — Microsoft tokens exchanged for internal JWT |
| Token expiry | 24h, no refresh | Unchanged — internal token lifecycle independent of Microsoft token |
| Permission source | Database (runtime) | Unchanged — permissions loaded from DB regardless of auth provider |
| Session storage | `localStorage` | Unchanged for internal JWT (though should migrate to httpOnly cookies) |
| No Next.js middleware | Confirmed: no `middleware.js` exists | Client-side auth only; should add server-side middleware in parallel |

---

## 3. Microsoft Integration Feasibility

### 3.1 Compatibility Analysis

| System Component | Compatible? | Assessment |
|-----------------|-------------|-----------|
| **Frontend auth architecture** | ✅ Yes | `AuthContext.login(userData, token)` is provider-agnostic — accepts any user object + JWT. Microsoft flow would call the same function. |
| **Backend auth module** | ✅ Yes | Passport.js supports multiple strategies. A new `MicrosoftStrategy` can coexist with `LocalStrategy`. Both produce the same internal JWT. |
| **JWT compatibility** | ✅ Yes | Internal JWT issued by backend is completely independent of Microsoft tokens. Microsoft token is only used once (at authentication) then exchanged for internal JWT. |
| **RBAC compatibility** | ✅ Yes | Permission system is decoupled from authentication. `PermissionGuard` checks `user.id` against `role_permissions` table — doesn't care how user authenticated. |
| **Permission guard compatibility** | ✅ Yes | `permission.guard.ts` reads `request.user.id` — set by `JwtStrategy.validate()`. As long as `JwtStrategy` returns the same shape, guard works for both auth methods. |
| **Role routing compatibility** | ✅ Yes | Frontend routes by permission, not by auth method. Microsoft-authenticated users get the same `permissions[]` array from the same DB query. |
| **Workflow compatibility** | ✅ Yes | RRF workflow (submit/approve/decline) uses `user.id` from `request.user`. Auth method is irrelevant to workflow logic. |
| **Session compatibility** | ⚠️ Partial | `localStorage` works but is XSS-vulnerable. Recommended: migrate to httpOnly cookies as part of this work, but not blocking. |

### 3.2 Blockers

| # | Blocker | Severity | Resolution |
|---|---------|----------|-----------|
| 1 | `password_hash` column is `NOT NULL` in `user.entity.ts` | Medium | Must alter to `nullable: true` for Microsoft-only users |
| 2 | `user_id` column is required and unique | Low | Microsoft users need a `user_id` too — can auto-generate from email prefix or assign manually by admin |
| 3 | Login page hardcodes `http://localhost:4000` | Low | Must use `NEXT_PUBLIC_API_URL` — fix needed regardless |
| 4 | No Next.js middleware exists | Low | Not a blocker — Microsoft redirect can be handled client-side via MSAL.js |

### 3.3 Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Microsoft Entra ID (Azure AD) app registration | OAuth 2.0 client credentials | Requires Azure admin to create |
| `@azure/msal-browser` (frontend) | MSAL.js library for browser-based auth | npm install |
| `@azure/msal-node` or `passport-azure-ad` (backend) | Server-side token validation | npm install |
| Tenant ID + Client ID + Redirect URI | Azure app registration parameters | Must be provisioned |
| Company email domain | For email matching (e.g., `@company.com`) | Already exists in `users.email` |

### 3.4 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Azure AD app registration delays | Medium | High — blocks all development | Start app registration process immediately as Day 0 task |
| Email mismatch between AD and local DB | Low | Medium — user can't link accounts | Admin UI to manually link Microsoft ID to user record |
| Multi-tenant complexity | Low | Low — this is single-org | Restrict to single tenant ID |
| Token validation edge cases | Low | Medium | Use Microsoft's official MSAL libraries, not custom JWT parsing |

### 3.5 Migration Complexity

| Component | Complexity | Reason |
|-----------|-----------|--------|
| Backend auth module | **Medium** | Add new strategy + new endpoint; existing code untouched |
| Frontend login page | **Low** | Add "Login with Microsoft" button; existing form unchanged |
| Database schema | **Low** | 4-5 new nullable columns on `users` table |
| User onboarding | **Medium** | New admin workflow for Microsoft user pre-creation/linking |
| RBAC system | **None** | Completely unaffected |
| RRF workflow | **None** | Completely unaffected |

### Feasibility Score: **8.5 / 10**

The architecture is highly compatible. The clean separation between authentication (who you are) and authorization (what you can do) means Microsoft auth slots in as a new identity provider without disrupting the existing RBAC, workflow, or permission systems.

---

## 4. Recommended Auth Architecture

### 4.1 Options Evaluation

#### Option A: Microsoft Login Only (Replace Local Entirely)

| Pros | Cons |
|------|------|
| Single auth flow to maintain | No fallback if Azure AD is down |
| Enforced enterprise SSO | Service accounts (batch jobs, API integrations) need Microsoft licenses |
| Simpler UX | Existing users must all have Microsoft accounts |
| | Can't test locally without Azure connectivity |

**Verdict**: ❌ Not recommended for this project. Too risky for an internal portal that may have service accounts, demo environments, or contractors without Microsoft licenses.

#### Option B: Hybrid Auth (Microsoft + Local)

| Pros | Cons |
|------|------|
| Microsoft SSO for all enterprise employees | Two auth paths to maintain |
| Local login retained for service accounts, admins, testing | Slightly more complex login UI |
| Zero-downtime migration — local works during transition | |
| Fallback if Azure AD has outage | |

**Verdict**: ✅ **Recommended.** Best fit for internal enterprise application. Provides the convenience of SSO while retaining the safety net of local auth.

#### Option C: Progressive Migration (Start Hybrid → Move to Microsoft-Only)

| Pros | Cons |
|------|------|
| Safest migration path | Over-engineered for this scale |
| Phased risk reduction | Requires separate "migration complete" milestone |

**Verdict**: ⚠️ Acceptable but unnecessary — Option B (hybrid) can remain permanent. No need to plan for local auth removal.

### 4.2 Recommended Architecture: Option B — Hybrid

```
┌──────────────────────────────────────────────────────────────────┐
│ LOGIN PAGE                                                        │
│                                                                    │
│  ┌──────────────────────────────────┐                              │
│  │  [ Sign in with Microsoft ]  ◄──── Primary (top of page)       │
│  │                                  │                              │
│  │  ─── or ────────────────         │                              │
│  │                                  │                              │
│  │  [ User ID ]  [ Password ]       │                              │
│  │  [ Login ]               ◄──── Secondary (below divider)       │
│  └──────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
                    │                            │
      Microsoft Path│                  Local Path│
                    ▼                            ▼
         ┌──────────────────┐          ┌──────────────────┐
         │ MSAL.js redirect │          │ POST /auth/login  │
         │ to Microsoft     │          │ (existing flow)   │
         │ login.microsoft  │          └────────┬─────────┘
         └────────┬─────────┘                   │
                  │ callback with                │
                  │ Microsoft ID token           │
                  ▼                              │
         ┌──────────────────┐                    │
         │ POST /auth/       │                    │
         │ microsoft-login   │                    │
         │ { msToken }       │                    │
         └────────┬─────────┘                    │
                  │                              │
                  ▼                              ▼
         ┌─────────────────────────────────────────────┐
         │ BACKEND: Validate + Find/Link User           │
         │                                              │
         │ 1. Verify Microsoft token (MSAL Node)        │
         │ 2. Extract email/OID from token              │
         │ 3. Find user by email in users table         │
         │ 4. Check user.isActive and has role          │
         │ 5. Issue INTERNAL JWT (same as local login)  │
         │ 6. Return { access_token, user, permissions }│
         └─────────────────────────┬────────────────────┘
                                   │
                                   ▼
         ┌──────────────────────────────────────────────┐
         │ Same internal JWT for both paths              │
         │ Same permissions resolution                   │
         │ Same AuthContext.login(user, token)            │
         │ Same role routing                             │
         │ Same PermissionGuard on backend               │
         └──────────────────────────────────────────────┘
```

### 4.3 Key Design Principle

> **Microsoft handles AUTHENTICATION (who are you?).**  
> **The existing RBAC system handles AUTHORIZATION (what can you do?).**

Microsoft tokens are **never used as session tokens**. They are exchanged for an internal JWT at the backend. After that exchange, the system is identical to local login.

---

## 5. User Onboarding Architecture

### 5.1 Options Evaluation

#### Model A: Admin Pre-Creates User → Microsoft Login Matches Email

```
1. Admin creates user in Admin Panel (existing flow):
   - Sets userId, email, fullName, role, department, subfunctions
   - Sets auth_provider = 'microsoft' (new field)
   - Does NOT set password (password_hash = null)
2. User clicks "Sign in with Microsoft" on login page
3. Backend validates Microsoft token → extracts email
4. Backend finds user by email → user.auth_provider = 'microsoft'
5. Links Microsoft OID to user record (one-time)
6. Issues internal JWT
7. User has immediate access with pre-configured role + permissions
```

**Pros**:
- Admin retains full control — no surprise users
- Role is assigned before first login — instant access, no waiting
- Matches current workflow (admin creates user manually)
- Zero workflow disruption
- Security: no unauthorized user creation

**Cons**:
- Admin must create account before employee can log in
- Requires admin to know employee's Microsoft email upfront

#### Model B: User Logs In First → Auto-Created as Pending → Admin Assigns Role

```
1. User clicks "Sign in with Microsoft"
2. Microsoft token validated → email extracted
3. No user found in DB → auto-create with:
   - status: 'pending_approval'
   - role: null (no permissions)
   - email from Microsoft token
   - fullName from Microsoft profile
4. User sees "Your account is pending admin approval"
5. Admin sees new pending user in admin panel
6. Admin assigns role, department, subfunctions
7. Admin activates user
8. User logs in again → now has full access
```

**Pros**:
- Employee doesn't need to wait for admin pre-creation
- Self-service first step

**Cons**:
- Users exist with no role — edge case complexity
- Requires new "pending" user status concept
- Admin must monitor for new pending users
- Security risk: anyone with a company Microsoft account auto-creates records
- Breaks current assumption that all users have roles

#### Model C: Hybrid (Both Supported)

- Admin can pre-create users (Model A)
- Auto-creation also enabled (Model B) as fallback
- Admin approves any auto-created users

**Pros**: Maximum flexibility  
**Cons**: Maximum complexity; two different user creation paths to maintain

### 5.2 Recommendation: **Model A — Admin Pre-Creates User**

**Rationale** (enterprise-grade):

1. **Security**: An internal enterprise portal should have admin-controlled user provisioning. Not every person with a company Microsoft account should get RRF Portal access.

2. **Role assignment timing**: The RRF Portal requires specific role + subfunction assignment. Auto-creating users without roles would break the permission system (zero permissions = blocked everywhere).

3. **Consistency**: The existing admin user creation flow already works. Model A extends it with one additional field (`auth_provider`) rather than introducing an entirely new pending-user state machine.

4. **Subfunction criticality**: Approvers MUST have subfunctions assigned at creation (enforced in `users.service.ts` line 120+). Auto-creation cannot satisfy this requirement.

5. **Minimal disruption**: Admin Panel already has Create User dialog. Adding a "Microsoft Auth" toggle and removing the password field when toggled is trivial UI work.

### 5.3 Detailed Onboarding Flow — Model A

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Admin Creates User (Admin Panel)                         │
│                                                                   │
│  Admin → /admin/users → "Create User" button                     │
│                                                                   │
│  ┌─ New Field ──────────────────────────────────────┐            │
│  │ Auth Method:  ○ Local (userId + password)         │            │
│  │               ● Microsoft SSO                     │            │
│  └───────────────────────────────────────────────────┘            │
│                                                                   │
│  If Microsoft SSO selected:                                       │
│    - userId: auto-generated from email prefix (e.g., john.doe)   │
│    - email: REQUIRED (must match Microsoft account)              │
│    - password: HIDDEN (not required)                             │
│    - role: required (from dropdown)                              │
│    - department: required                                        │
│    - subfunctions: required for APPROVER role                    │
│                                                                   │
│  Backend saves with:                                              │
│    auth_provider = 'microsoft'                                    │
│    password_hash = null                                           │
│    is_active = true                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Employee Clicks "Sign in with Microsoft"                  │
│                                                                   │
│  1. MSAL.js redirects to Microsoft login                          │
│  2. Employee signs in with company Microsoft account              │
│  3. Microsoft redirects back with ID token                        │
│  4. Frontend sends ID token to backend:                           │
│     POST /auth/microsoft-login { token: "<MS ID token>" }        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Backend Validates + Links + Issues JWT                    │
│                                                                   │
│  1. Validate Microsoft token (signature, audience, tenant)        │
│  2. Extract: email, oid (Azure Object ID), displayName            │
│  3. Find user: SELECT * FROM users WHERE email = :email           │
│     AND auth_provider = 'microsoft' AND is_active = true          │
│  4. If NOT FOUND:                                                 │
│     → Return 403: "No account found. Contact your administrator." │
│  5. If FOUND but first login:                                     │
│     → UPDATE users SET microsoft_id = :oid WHERE id = :userId     │
│  6. Get permissions: getUserPermissions(user.id)                  │
│  7. Issue JWT: { userId: user.id, sub: user.id, roleCode: ... }  │
│  8. Return same response shape as local login                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Frontend Receives Login Response                          │
│                                                                   │
│  Identical to current local login from this point:                │
│  - AuthContext.login(data.user, data.access_token)                │
│  - Router navigates to permission-based home page                 │
│  - All subsequent requests use internal JWT                       │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Edge Cases

| Scenario | Handling |
|----------|---------|
| Microsoft user not pre-created | Return 403 with clear message: "No RRF Portal account found for {email}. Please contact your administrator." |
| Email exists but `auth_provider = 'local'` | Return 403: "This account uses local authentication. Please use User ID/Password." (prevents account takeover) |
| Microsoft user is `is_active = false` | Return 403: "Your account has been deactivated." |
| User has Microsoft account but email differs from DB | No match — user sees "Contact administrator" message. Admin must update email in user record. |
| Admin changes user's auth from local to Microsoft | Set `auth_provider = 'microsoft'`, keep `password_hash` for rollback. Clear `microsoft_id` (will be re-linked on next Microsoft login). |

---

## 6. Role Assignment Architecture

### 6.1 Options Evaluation

| Method | How It Works | Verdict |
|--------|-------------|---------|
| **Email match** | Find user by email, use pre-assigned role | ✅ **Recommended** — simple, reliable, matches Model A |
| **Employee ID match** | Match Azure AD `employeeId` claim to user record | ⚠️ Optional secondary — requires HR systems integration |
| **Provider ID (OID) match** | Match Azure Object ID to `microsoft_id` column | ✅ Used after first login — more reliable than email for ongoing auth |
| **Domain mapping** | All `@company.com` users get a default role | ❌ Too broad — different users need different roles |
| **Admin approval** | Auto-create user, admin assigns role later | ❌ Rejected (Model B) — too complex for this use case |
| **Microsoft Entra ID group mapping** | Map Azure AD groups to RRF roles | ⚠️ Future enhancement — requires Azure admin to configure groups |

### 6.2 Recommended Model: Email Match (Pre-Assigned) + OID Binding

**First login**: Match by email → bind OID  
**Subsequent logins**: Match by `microsoft_id` (OID) first, fall back to email

```
Login attempt with Microsoft token
│
├── Extract: email, oid (Azure Object ID)
│
├── Try: SELECT * FROM users WHERE microsoft_id = :oid AND is_active = true
│   ├── FOUND → use this user, proceed to JWT issuance
│   └── NOT FOUND
│       │
│       ├── Try: SELECT * FROM users WHERE email = :email 
│       │        AND auth_provider = 'microsoft' AND is_active = true
│       │   ├── FOUND → UPDATE microsoft_id = :oid → proceed to JWT
│       │   └── NOT FOUND → return 403 "No account found"
│       │
│       └── (email match on auth_provider = 'local' → reject)
```

### 6.3 Why NOT Group Mapping (Now)

Azure AD group-to-role mapping is tempting but adds significant complexity:

1. Requires Azure admin to configure security groups matching RRF roles
2. Group membership can change without admin knowledge in RRF Portal
3. The RRF Portal has subfunction assignments that have NO Azure AD equivalent
4. Would require syncing Azure groups continuously

**Recommendation**: Defer group mapping to a future Phase 4. Role assignment by admin in the RRF Portal admin panel is the correct model for now.

---

## 7. RBAC Integration

### 7.1 How Microsoft-Authenticated Users Get Permissions

**The RBAC path is identical to local users.** Microsoft changes only Step 1 (authentication); Steps 2-5 are unchanged.

```
Step 1: IDENTITY VERIFICATION
  ├─ Local: userId + password → bcrypt compare
  └─ Microsoft: MS ID token → MSAL validation + email match
                    │
                    ▼ (both produce same internal user record)

Step 2: USER LOOKUP (unchanged)
  users table → id, role_id, isActive, department

Step 3: JWT ISSUANCE (unchanged)
  payload: { userId: user.id, sub: user.id, roleCode: user.role.roleCode }

Step 4: PERMISSION RESOLUTION (unchanged, on every guarded request)
  JwtStrategy.validate(payload) → findById(payload.sub) → return request.user
  PermissionGuard → getUserPermissions(user.id)
    → SELECT DISTINCT CONCAT(m.module_code, '.', p.permission_code)
      FROM users → roles → role_permissions → permissions → modules
      WHERE u.id = :userId AND all is_active checks

Step 5: AUTHORIZATION DECISION (unchanged)
  permissions.includes('RRF.CREATE') → allow/deny
```

### 7.2 What Gets Carried Over Automatically

| RBAC Component | Works for Microsoft Users? | Reason |
|----------------|---------------------------|--------|
| Role assignment | ✅ Yes | Role is in `users.role_id` — same for both auth methods |
| Permissions | ✅ Yes | Derived from role via `role_permissions` table — auth-agnostic |
| Subfunction assignment | ✅ Yes | `user_subfunctions` table links user.id to subfunctions — auth-agnostic |
| Technologies | ✅ Yes | `users.technologies` jsonb column — auth-agnostic |
| Approver routing | ✅ Yes | RRF `subFunctionId` → `user_subfunctions` join — uses user.id |
| isInterviewer (future) | ✅ Yes | Would be a `users` table column — auth-agnostic |

### 7.3 Permission Lifecycle for Microsoft User

```
T₀  Admin creates user record: email=john@company.com, role=APPROVER, 
    subfunctions=[SGINTL, VR], auth_provider=microsoft

T₁  John clicks "Sign in with Microsoft" → Microsoft token validated
    → email match → microsoft_id set → internal JWT issued
    → permissions: [DASHBOARD.READ, APPROVALS.READ, APPROVALS.APPROVE, 
       APPROVALS.REJECT, APPROVALS.ON_HOLD, RRF.READ]
    → frontend routes to /approver

T₂  John accesses /approver dashboard → API calls with JWT
    → PermissionGuard checks APPROVALS.READ → passes
    → RRF service filters by John's subfunctions (SGINTL, VR)

T₃  Admin changes John's role to PMO via admin panel
    → Next API call: JwtStrategy loads John → new role in DB
    → PermissionGuard resolves new permissions → immediate effect
```

---

## 8. Admin UX Changes

### 8.1 Current Admin Users Page

**File**: [app/admin/users/page.jsx](../rrf-portal-nextjs/app/admin/users/page.jsx)

Currently the Create User modal has:
- User ID (text input)
- Email (text input)
- Password (text input)
- Full Name
- Department
- Phone
- Role (dropdown)
- Subfunctions (multi-select, required for APPROVER)
- Technologies (multi-select)

### 8.2 Proposed Changes

#### Create User Modal — Enhanced

```
┌──────────────────────────────────────────────────────┐
│ CREATE NEW USER                                       │
│                                                       │
│ Authentication Method:                                │
│   ● Microsoft SSO                                     │
│   ○ Local (User ID + Password)                        │
│                                                       │
│ ──── When "Microsoft SSO" selected: ─────────────     │
│                                                       │
│ Microsoft Email *:  [ john.doe@company.com ]          │
│ Full Name *:        [ John Doe ]                      │
│ User ID:            [ john.doe ]  (auto-generated)    │
│ Department:         [ Engineering ▼ ]                 │
│ Phone:              [ +91 98765... ]                  │
│ Role *:             [ Approver ▼ ]                    │
│ Subfunctions *:     [ ☑ SGINTL  ☑ VR  ☐ PMO ]       │
│ Technologies:       [ ☑ Java  ☑ React ]              │
│                                                       │
│ NOTE: No password required. User will authenticate    │
│ via their Microsoft account.                          │
│                                                       │
│ ──── When "Local" selected: ──────────────────────    │
│                                                       │
│ User ID *:          [ hm002 ]                         │
│ Email *:            [ ... ]                           │
│ Password *:         [ ••••••• ]                       │
│ (rest same as current)                                │
│                                                       │
│            [ Cancel ]   [ Create User ]               │
└──────────────────────────────────────────────────────┘
```

#### Users List Table — Enhanced

New columns:
- **Auth Method**: badge showing `Microsoft` or `Local`
- **Microsoft Linked**: ✅ (if OID bound) or ⏳ (pending first login)

#### New Admin Actions

| Action | Description |
|--------|------------|
| **Create Microsoft user** | Create user with `auth_provider = 'microsoft'`, no password |
| **Switch auth method** | Change existing user from local → Microsoft or vice versa |
| **View Microsoft link status** | See if Microsoft OID has been bound (first login completed) |
| **Deactivate user** | `is_active = false` — blocks both local and Microsoft login |
| **Re-link Microsoft** | Clear `microsoft_id` to force re-binding on next login |

### 8.3 Files That Need Changes (Admin Panel)

| File | Change |
|------|--------|
| `app/admin/users/page.jsx` | Add auth method toggle in create/edit modals, add auth method column to table |
| `lib/api/usersApi.js` | Add `authProvider` field to create/update payloads |
| No new pages needed | All changes fit within existing admin users page |

---

## 9. DB Schema Changes

### 9.1 Current `users` Table

**File**: [src/users/user.entity.ts](../rrf-portal-backend/src/users/user.entity.ts)

```
users
├── id              serial PK
├── user_id         varchar(50) UNIQUE NOT NULL
├── email           varchar(100) UNIQUE NOT NULL
├── password_hash   varchar(255) NOT NULL        ← must become NULLABLE
├── full_name       varchar(100) NOT NULL
├── department      varchar(100) nullable
├── phone           varchar(20) nullable
├── is_active       boolean default true
├── last_login      timestamp nullable
├── role_id         FK → roles
├── technologies    jsonb default '[]'
├── created_at      timestamp
├── updated_at      timestamp
```

### 9.2 Proposed Schema Changes

#### New Columns

| Column | Type | Nullable | Default | Unique | Index | Purpose |
|--------|------|----------|---------|--------|-------|---------|
| `auth_provider` | `varchar(20)` | NO | `'local'` | NO | YES | Identifies auth method: `'local'` or `'microsoft'` |
| `microsoft_id` | `varchar(100)` | YES | NULL | YES (where not null) | YES | Azure AD Object ID (OID) — bound on first Microsoft login |
| `tenant_id` | `varchar(100)` | YES | NULL | NO | NO | Azure AD tenant ID — for multi-tenant future-proofing |
| `email_verified` | `boolean` | NO | `false` | NO | NO | TRUE after Microsoft confirms email ownership |
| `last_login_source` | `varchar(20)` | YES | NULL | NO | NO | `'local'` or `'microsoft'` — records HOW user last logged in |
| `profile_photo_url` | `varchar(500)` | YES | NULL | NO | NO | Microsoft profile photo URL (optional enrichment) |

#### Column Modifications

| Column | Current | Proposed | Reason |
|--------|---------|----------|--------|
| `password_hash` | `NOT NULL` | **`NULLABLE`** | Microsoft users don't have passwords |

#### Columns NOT Recommended

| Column | Reason to Exclude |
|--------|------------------|
| `employee_id` | Not available from standard Azure AD tokens without custom claims. Adds complexity without value. Defer to Phase 4 if HR integration needed. |

### 9.3 Index Strategy

```sql
-- Existing indexes (keep)
CREATE UNIQUE INDEX idx_users_user_id ON users(user_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- New indexes
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE UNIQUE INDEX idx_users_microsoft_id ON users(microsoft_id) WHERE microsoft_id IS NOT NULL;
CREATE INDEX idx_users_auth_email ON users(auth_provider, email);  -- composite for Microsoft login query
```

### 9.4 Migration Strategy for Existing Users

```sql
-- Migration: Add Microsoft auth columns
-- Safe: all new columns are nullable or have defaults

ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN microsoft_id VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN last_login_source VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN profile_photo_url VARCHAR(500) NULL;

-- Make password_hash nullable (for Microsoft users)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Mark existing users as email-verified (they were admin-created with known emails)
UPDATE users SET email_verified = true WHERE auth_provider = 'local';

-- Indexes
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
CREATE UNIQUE INDEX idx_users_microsoft_id ON users(microsoft_id) WHERE microsoft_id IS NOT NULL;
```

**Impact**: Zero downtime. All changes are additive (new nullable columns + new defaults). No data loss. Existing users automatically get `auth_provider = 'local'`.

### 9.5 Entity Update Plan

**File to change**: `src/users/user.entity.ts`

New properties:
```
@Column({ name: 'auth_provider', default: 'local', length: 20 })
authProvider: string;

@Column({ name: 'microsoft_id', nullable: true, unique: true, length: 100 })
microsoftId: string;

@Column({ name: 'tenant_id', nullable: true, length: 100 })
tenantId: string;

@Column({ name: 'email_verified', default: false })
emailVerified: boolean;

@Column({ name: 'last_login_source', nullable: true, length: 20 })
lastLoginSource: string;

@Column({ name: 'profile_photo_url', nullable: true, length: 500 })
profilePhotoUrl: string;
```

Modified property:
```
@Column({ name: 'password_hash', length: 255, nullable: true })  // was NOT NULL
passwordHash: string;
```

---

## 10. Frontend Change Map

### 10.1 Files Requiring Changes

| # | File | Change Type | Complexity | Description |
|---|------|-----------|-----------|-------------|
| 1 | `app/login/page.jsx` | **Major** | Medium | Add "Sign in with Microsoft" button, MSAL.js integration, keep local login below divider |
| 2 | `contexts/AuthContext.jsx` | **Minor** | Low | Add `authProvider` field to stored user object; no logic changes needed — `login()` is already provider-agnostic |
| 3 | `lib/api/apiConfig.js` | **None** | None | Already provider-agnostic (attaches Bearer token regardless of origin) |
| 4 | `hooks/usePermission.js` | **None** | None | Reads `permissions[]` from user — doesn't care about auth method |
| 5 | `components/ProtectedRoute.jsx` | **None** | None | Checks permissions, not auth method |
| 6 | `components/PermissionBasedSidebar.jsx` | **None** | None | Permission-driven, auth-agnostic |
| 7 | `components/ClientLayout.jsx` | **None** | None | Reads `user` from AuthContext — shape doesn't change |
| 8 | `components/Header.jsx` | **Minor** | Low | Optionally show Microsoft profile photo if available; show "Microsoft" badge next to user name |
| 9 | `utils/permissions.js` | **None** | None | Pure permission logic, auth-agnostic |
| 10 | `app/admin/users/page.jsx` | **Medium** | Medium | Add auth method toggle in create/edit modals |
| 11 | `lib/api/usersApi.js` | **Minor** | Low | Add `authProvider` field to create/update DTOs |
| 12 | **NEW**: `lib/msal/msalConfig.js` | **New file** | Low | MSAL.js configuration (client ID, tenant ID, redirect URI) |
| 13 | **NEW**: `lib/msal/msalInstance.js` | **New file** | Low | MSAL PublicClientApplication singleton |

### 10.2 Package Dependencies

```json
// New dependency in rrf-portal-nextjs/package.json
"@azure/msal-browser": "^3.x"
```

No NextAuth.js needed. MSAL.js handles the Microsoft redirect flow directly.

### 10.3 Login Page Change Detail

Current login page ([app/login/page.jsx](../rrf-portal-nextjs/app/login/page.jsx)) structure:

```
Current:
  Logo + Title
  UserId Input
  Password Input
  Login Button
  Demo Credentials (dev only)

Proposed:
  Logo + Title
  [ Sign in with Microsoft ] ← NEW prominent button
  ── or ── divider           ← NEW
  UserId Input               ← Existing (moved below Microsoft button)
  Password Input             ← Existing
  Login Button               ← Existing
  Demo Credentials (dev only)← Existing
```

### 10.4 Microsoft Login Flow (Frontend)

```javascript
// Pseudocode — NOT actual implementation
const handleMicrosoftLogin = async () => {
  // 1. MSAL.js redirect to Microsoft
  const msalInstance = getMsalInstance()
  const response = await msalInstance.loginPopup({
    scopes: ['openid', 'profile', 'email', 'User.Read']
  })
  
  // 2. Send Microsoft token to backend
  const backendResponse = await fetch(`${API_URL}/auth/microsoft-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: response.idToken })
  })
  const data = await backendResponse.json()
  
  // 3. Use EXISTING AuthContext login function (same as local)
  login(data.user, data.access_token)
  
  // 4. Route to home page (same logic as local login)
  const homePage = getHomePageByPermissions(data.user.permissions)
  router.push(homePage)
}
```

### 10.5 Logout Enhancement

**File**: [contexts/AuthContext.jsx](../rrf-portal-nextjs/contexts/AuthContext.jsx)

Current logout clears localStorage only. For Microsoft users, should also:
1. Clear MSAL cache (`msalInstance.clearCache()`)
2. Optionally trigger Microsoft logout (`msalInstance.logoutRedirect()`) — configurable

---

## 11. Backend Change Map

### 11.1 Files Requiring Changes

| # | File | Change Type | Complexity | Description |
|---|------|-----------|-----------|-------------|
| 1 | `src/auth/auth.module.ts` | **Medium** | Low | Register new `MicrosoftStrategy` provider, import `ConfigModule` values for Azure AD |
| 2 | `src/auth/auth.controller.ts` | **Medium** | Low | Add `POST /auth/microsoft-login` endpoint |
| 3 | `src/auth/auth.service.ts` | **Medium** | Medium | Add `loginWithMicrosoft(msToken)` method — validate MS token, find user, issue internal JWT |
| 4 | `src/users/user.entity.ts` | **Medium** | Low | Add new columns (see DB Schema section) |
| 5 | `src/users/users.service.ts` | **Medium** | Medium | Add `findByMicrosoftId()`, `findByEmailAndProvider()`, `linkMicrosoftId()`, update `createUser()` for Microsoft users |
| 6 | `src/users/dto/create-user.dto.ts` | **Minor** | Low | Add `authProvider?` field, make `password` conditional |
| 7 | `src/auth/jwt.strategy.ts` | **None** | None | Unchanged — validates internal JWT regardless of auth origin |
| 8 | `src/auth/local.strategy.ts` | **None** | None | Unchanged — only invoked for local login path |
| 9 | `src/guards/permission.guard.ts` | **None** | None | Unchanged — checks permissions by user.id |
| 10 | `src/permissions/permissions.service.ts` | **None** | None | Unchanged — resolves permissions by user.id |
| 11 | `src/config/typeorm.config.ts` | **None** | None | Entity auto-discovered via glob pattern |
| 12 | `src/main.ts` | **None** | None | CORS already configurable via env |
| 13 | **NEW**: `src/auth/microsoft.strategy.ts` | **New file** | Medium | Microsoft token validation strategy (optional — can also be done in auth.service directly) |
| 14 | **NEW**: `src/auth/dto/microsoft-login.dto.ts` | **New file** | Low | DTO for `{ token: string }` |

### 11.2 New Environment Variables

```env
# Microsoft Entra ID Configuration
AZURE_AD_CLIENT_ID=<from Azure app registration>
AZURE_AD_TENANT_ID=<your organization's tenant ID>
AZURE_AD_CLIENT_SECRET=<optional, for confidential client flow>
AZURE_AD_REDIRECT_URI=http://localhost:3000/auth/callback
```

### 11.3 Package Dependencies

```json
// New dependencies in rrf-portal-backend/package.json
"@azure/msal-node": "^2.x",        // Server-side token validation
"jwks-rsa": "^3.x"                 // JWKS key retrieval for token verification
```

Alternative: `passport-azure-ad` — but MSAL Node is Microsoft's recommended library.

### 11.4 New Endpoint Detail

```
POST /auth/microsoft-login
Body: { token: string }  ← Microsoft ID token from MSAL.js

Response (success):
{
  success: true,
  access_token: "<internal JWT>",
  user: {
    id: 42,
    userId: "john.doe",
    name: "John Doe",
    email: "john.doe@company.com",
    role: { id: 3, code: "APPROVER", name: "Approver" },
    department: "Engineering",
    permissions: ["DASHBOARD.READ", "APPROVALS.APPROVE", ...],
    authProvider: "microsoft"
  }
}

Response (no account):
{
  success: false,
  statusCode: 403,
  message: "No RRF Portal account found for john.doe@company.com. Please contact your administrator."
}
```

### 11.5 Backend Microsoft Login Flow (Pseudocode)

```typescript
// auth.service.ts — new method
async loginWithMicrosoft(msIdToken: string) {
  // 1. Validate Microsoft ID token
  const msPayload = await this.validateMicrosoftToken(msIdToken);
  // msPayload contains: email, oid (Object ID), tid (Tenant ID), name
  
  // 2. Restrict to company tenant
  if (msPayload.tid !== configService.get('AZURE_AD_TENANT_ID')) {
    throw new UnauthorizedException('Invalid organization');
  }
  
  // 3. Find user — first by microsoft_id, then by email
  let user = await this.usersService.findByMicrosoftId(msPayload.oid);
  
  if (!user) {
    user = await this.usersService.findByEmailAndProvider(msPayload.email, 'microsoft');
    if (user) {
      // First Microsoft login — bind OID
      await this.usersService.linkMicrosoftId(user.id, msPayload.oid, msPayload.tid);
    }
  }
  
  if (!user || !user.isActive) {
    throw new ForbiddenException('No RRF Portal account found. Contact administrator.');
  }
  
  if (!user.role) {
    throw new ForbiddenException('Account not yet configured. Contact administrator.');
  }
  
  // 4. Get permissions (same as local login)
  const permissions = await this.permissionsService.getUserPermissions(user.id);
  
  // 5. Update last login
  await this.usersService.updateLastLogin(user.id);
  await this.usersService.updateLoginSource(user.id, 'microsoft');
  
  // 6. Issue INTERNAL JWT (identical to local login)
  const payload = { userId: user.id, sub: user.id, roleCode: user.role.roleCode };
  
  return {
    success: true,
    access_token: this.jwtService.sign(payload),
    user: {
      id: user.id,
      userId: user.userId,
      name: user.fullName,
      email: user.email,
      role: {
        id: user.role.id,
        code: user.role.roleCode,
        name: user.role.roleName,
      },
      department: user.department,
      permissions,
      authProvider: 'microsoft',
    },
  };
}
```

---

## 12. Security Design

### 12.1 Token Validation

| Requirement | Implementation |
|------------|---------------|
| **Microsoft token signature verification** | Use `@azure/msal-node` `ConfidentialClientApplication.acquireTokenOnBehalfOf()` or manual JWKS verification via Microsoft's published keys at `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys` |
| **Token audience validation** | Verify `aud` claim matches `AZURE_AD_CLIENT_ID` |
| **Token issuer validation** | Verify `iss` matches `https://login.microsoftonline.com/{tenant}/v2.0` |
| **Token expiry validation** | Check `exp` claim — reject expired tokens |
| **Nonce validation** | If using auth code flow, validate nonce to prevent replay |

### 12.2 Tenant Restriction

```
CRITICAL: Restrict Microsoft login to company tenant only.

Backend MUST check:
  msPayload.tid === process.env.AZURE_AD_TENANT_ID

This prevents:
  - Personal Microsoft accounts (outlook.com, hotmail.com)
  - Other organization's accounts
  - Guest accounts from other tenants
```

### 12.3 Domain Restriction (Defense in Depth)

Even with tenant restriction, verify email domain as a secondary check:

```
Allowed domains: ['@company.com', '@subsidiary.com']
if (!allowedDomains.some(d => msPayload.email.endsWith(d))) {
  throw new ForbiddenException('Email domain not allowed');
}
```

### 12.4 MFA

**Microsoft Entra ID handles MFA natively.** If the Azure AD admin has configured Conditional Access policies requiring MFA, users MUST complete MFA before receiving the token. The RRF Portal backend does not need to implement MFA logic — it's transparent.

**Recommendation**: Request Azure AD admin to enable MFA for all users via Conditional Access policy. This gives RRF Portal MFA for free.

### 12.5 Conditional Access

Microsoft Entra ID supports:
- Device compliance requirements
- Location-based access restrictions
- Risk-based authentication
- Application-specific policies

All of these are configured in Azure portal, NOT in RRF Portal code. The RRF Portal benefits from them automatically.

### 12.6 Token Revocation / Logout

| Scenario | Current | Proposed |
|----------|---------|---------|
| User clicks Logout | Clear localStorage | Clear localStorage + clear MSAL cache + optionally redirect to Microsoft logout endpoint |
| Admin deactivates user | Next API call returns 401 (JwtStrategy checks `isActive`) | Same — unchanged and effective |
| JWT expires | 24h hard expiry, no refresh | Same — consider adding refresh token mechanism in Phase 3 |
| Microsoft session revoked by IT | No effect (internal JWT is independent) | No effect (by design — internal JWT is self-contained) |

### 12.7 Audit Logging

New audit fields in `users` table:
- `last_login_source` — records `'local'` or `'microsoft'` per login
- `email_verified` — set true when Microsoft confirms email ownership

**Recommended future addition**: Separate `auth_audit_log` table:

```sql
CREATE TABLE auth_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  auth_provider VARCHAR(20),
  event_type VARCHAR(50),  -- 'login_success', 'login_failed', 'logout', 'account_linked'
  ip_address VARCHAR(50),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Recommendation**: Defer audit log table to Phase 3. Priority is getting Microsoft login working.

### 12.8 Security Comparison

| Threat | Local Auth | Microsoft Auth |
|--------|-----------|---------------|
| Brute force | Throttled (5/60s) | N/A — Microsoft handles lockout |
| Password reuse | User's responsibility | N/A — no password |
| Phishing | Vulnerable | Resistant (FIDO2, MFA via Azure) |
| Session hijacking | localStorage XSS risk | Same (internal JWT still in localStorage) |
| Account takeover | Password compromise | Requires compromising Microsoft account (much harder) |
| Credential stuffing | Possible | Not applicable |

---

## 13. Login UX Planning

### 13.1 Options

#### Option A: Microsoft Only

```
┌────────────────────────┐
│   [ Sign in with       │
│     Microsoft ]         │
└────────────────────────┘
```

**Verdict**: ❌ Too restrictive. No fallback for service accounts or Azure outages.

#### Option B: Microsoft Primary + Local Secondary

```
┌────────────────────────┐
│   [ Sign in with       │
│     Microsoft ]         │
│                        │
│   ─── or ─────────     │
│                        │
│   User ID: [____]      │
│   Password: [____]     │
│   [ Login ]            │
└────────────────────────┘
```

**Verdict**: ✅ **Recommended.** Clear visual hierarchy — Microsoft is primary (top, prominent). Local login is secondary (below divider, subtle). Covers all use cases.

#### Option C: Email Detection → Auto-Redirect

```
┌────────────────────────┐
│   Email: [john@co.com] │
│   [ Continue ]         │
│                        │
│   Detects @company.com │
│   → auto-redirect to   │
│   Microsoft login       │
└────────────────────────┘
```

**Verdict**: ❌ Over-engineered for an internal portal. Adds latency. Not standard for enterprise apps.

### 13.2 Recommendation: **Option B**

Design specifications:
- Microsoft button: full-width, Microsoft brand colors (#2F2F2F background, white text), Microsoft logo icon
- Divider: "or" with lines
- Local login: lighter styling, collapsed or secondary visual weight
- In production: consider hiding local login behind "Use local account" expandable section
- In development: show demo credentials panel below local login form

---

## 14. Session Architecture

### 14.1 Options

| Option | Description | Verdict |
|--------|-----------|---------|
| **Keep JWT in localStorage** | Current approach. Internal JWT stored client-side. | ⚠️ Works but XSS-vulnerable |
| **httpOnly secure cookie** | Backend sets JWT as httpOnly cookie. Frontend can't read it but it auto-attaches. | ✅ More secure |
| **Refresh token flow** | Short-lived access token (15min) + long-lived refresh token in httpOnly cookie | ✅ Best practice but more complex |
| **NextAuth.js / Auth.js** | Framework-managed sessions with built-in Microsoft provider | ❌ Too invasive; rewrites entire auth layer |
| **Backend-managed session** | Server-side session store (Redis) | ❌ Adds infrastructure; overkill for this scale |

### 14.2 Recommendation: **Keep JWT localStorage for Phase 1, migrate to httpOnly cookie in Phase 2**

**Rationale**:

Phase 1 priority is Microsoft login integration. Changing the session mechanism simultaneously introduces too much risk. The current localStorage approach works and the same session mechanism applies regardless of auth provider.

Phase 2 adds httpOnly cookies:
- Backend sets `Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict`
- Frontend's `apiConfig.js` stops attaching `Authorization` header (cookie auto-attaches)
- Eliminates XSS token theft risk

Phase 3 adds refresh tokens:
- Access token: 15-minute expiry
- Refresh token: 7-day expiry, httpOnly cookie, rotates on use
- New endpoint: `POST /auth/refresh`

---

## 15. Migration Plan

### Phase 1: Foundation (Week 1-2)

**Goal**: Microsoft login working alongside local login. Zero changes to existing functionality.

| Task | Owner | Files |
|------|-------|-------|
| Azure AD app registration | Azure Admin | Azure portal (not code) |
| Add new DB columns (migration) | Backend | `user.entity.ts`, new migration file |
| Make `password_hash` nullable | Backend | `user.entity.ts`, migration |
| Create `POST /auth/microsoft-login` endpoint | Backend | `auth.controller.ts`, `auth.service.ts` |
| Add Microsoft token validation logic | Backend | New: `microsoft.strategy.ts` or in `auth.service.ts` |
| Add `findByMicrosoftId`, `findByEmailAndProvider` | Backend | `users.service.ts` |
| Update `CreateUserDto` — optional password, add authProvider | Backend | `create-user.dto.ts` |
| Install `@azure/msal-browser` | Frontend | `package.json` |
| Create MSAL config | Frontend | New: `lib/msal/msalConfig.js` |
| Add "Sign in with Microsoft" to login page | Frontend | `app/login/page.jsx` |
| Test: Microsoft login → existing pre-created user | QA | — |
| Test: Local login still works unchanged | QA | — |

**Risk**: Azure AD app registration requires Azure admin involvement — **start this on Day 0**.

### Phase 2: Admin Panel Enhancement (Week 2-3)

**Goal**: Admin can create Microsoft-auth users from the admin panel.

| Task | Owner | Files |
|------|-------|-------|
| Add auth method toggle to Create User modal | Frontend | `app/admin/users/page.jsx` |
| Update user creation API to accept `authProvider` | Backend | `users.service.ts`, `create-user.dto.ts` |
| Add auth method column to users list table | Frontend | `app/admin/users/page.jsx` |
| Show Microsoft link status (OID bound / pending) | Frontend | `app/admin/users/page.jsx` |
| Add "Switch auth method" action for existing users | Backend + Frontend | `users.service.ts`, `app/admin/users/page.jsx` |
| Migrate httpOnly cookie session (optional) | Backend + Frontend | `auth.service.ts`, `apiConfig.js` |

### Phase 3: Hardening (Week 3-4)

**Goal**: Production-grade security and monitoring.

| Task | Owner | Files |
|------|-------|-------|
| Add domain restriction (defense in depth) | Backend | `auth.service.ts` |
| Add auth audit logging | Backend | New: `auth_audit_log` table + service |
| Microsoft logout integration (clear MSAL cache) | Frontend | `AuthContext.jsx` |
| Show Microsoft profile photo in header | Frontend | `Header.jsx` |
| Add Next.js middleware for server-side auth | Frontend | New: `middleware.js` |
| Add refresh token mechanism (optional) | Backend + Frontend | `auth.service.ts`, `apiConfig.js` |
| Remove dead mock API routes | Frontend | Delete `app/api/auth/` |
| Performance: cache permission queries | Backend | `permissions.service.ts` |

### Zero-Downtime Guarantee

Every phase is backward-compatible:
- **Phase 1**: Local login untouched. New endpoint added. New DB columns are nullable/defaulted.
- **Phase 2**: Admin panel enhanced but existing create flow unchanged. Users created before Phase 2 keep working.
- **Phase 3**: Hardening only. No functional changes to auth flow.

No migration requires downtime. No existing data is modified destructively.

---

## 16. Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Phase |
|---|------|-----------|--------|-----------|-------|
| 1 | **Azure AD app registration delayed** | Medium | High (blocks all Microsoft work) | Start registration process immediately; continue Phase 1 backend work in parallel using test tenant | 1 |
| 2 | **Email mismatch** — AD email differs from local DB email | Low | Medium | Admin UI allows editing email before Microsoft linking; backend validates email format | 1 |
| 3 | **Token validation failure** in production | Low | High | Use Microsoft's official MSAL Node library (not custom JWT parsing); comprehensive error responses | 1 |
| 4 | **Existing users can't login** after migration | Very Low | Critical | No existing code paths are modified; local login is tested in every phase | 1-3 |
| 5 | **localStorage XSS** token theft | Medium | High | Phase 2 migrates to httpOnly cookies; Phase 1 accepts existing risk (unchanged from today) | 2 |
| 6 | **Admin creates Microsoft user with wrong email** | Medium | Low | User simply can't link — admin corrects email in user record; no data corruption | 2 |
| 7 | **Azure AD outage** blocks all Microsoft logins | Low | Medium | Local login remains available as fallback (hybrid model); critical users have local accounts | Ongoing |
| 8 | **Microsoft token replay attack** | Very Low | Medium | Validate token `nonce`, `exp`, and `iat` claims; use MSAL's built-in replay protection | 1 |
| 9 | **Multi-tenant exposure** | Low | High | Hardcode tenant ID validation; reject tokens from other tenants | 1 |
| 10 | **Frontend MSAL.js upgrade breaks** | Low | Low | Pin `@azure/msal-browser` version; test before upgrading | Ongoing |

---

## 17. Final Recommendation

### Master Architecture Decision Record

| Decision | Choice | Confidence |
|----------|--------|-----------|
| **Auth model** | Hybrid: Microsoft SSO primary + local login retained | 95% |
| **Onboarding model** | Model A: Admin pre-creates users; Microsoft login matches by email | 90% |
| **Role assignment model** | Admin assigns role at user creation; Microsoft provides identity only | 95% |
| **Session model** | Phase 1: keep localStorage JWT; Phase 2: migrate to httpOnly cookies | 90% |
| **Frontend library** | `@azure/msal-browser` (no NextAuth.js) | 85% |
| **Backend library** | `@azure/msal-node` + `jwks-rsa` for token validation | 85% |
| **DB changes** | 6 new columns, 1 nullable modification, 3 new indexes | 95% |
| **Migration approach** | 3-phase zero-downtime rollout | 95% |

### Required DB Changes Summary

```
users table:
  + auth_provider VARCHAR(20) DEFAULT 'local'      ← NEW
  + microsoft_id VARCHAR(100) UNIQUE NULLABLE       ← NEW  
  + tenant_id VARCHAR(100) NULLABLE                 ← NEW
  + email_verified BOOLEAN DEFAULT false             ← NEW
  + last_login_source VARCHAR(20) NULLABLE           ← NEW
  + profile_photo_url VARCHAR(500) NULLABLE          ← NEW
  ~ password_hash: NOT NULL → NULLABLE               ← MODIFIED
```

### Required Frontend Changes Summary

| File | Priority | Scope |
|------|----------|-------|
| `app/login/page.jsx` | P0 | Add Microsoft button, MSAL integration |
| `app/admin/users/page.jsx` | P1 | Auth method toggle in create/edit modals |
| `contexts/AuthContext.jsx` | P2 | Add MSAL cache clear on logout |
| `components/Header.jsx` | P3 | Optional: show auth provider badge, profile photo |
| New: `lib/msal/msalConfig.js` | P0 | MSAL configuration |
| New: `lib/msal/msalInstance.js` | P0 | MSAL singleton |

### Required Backend Changes Summary

| File | Priority | Scope |
|------|----------|-------|
| `src/users/user.entity.ts` | P0 | New columns |
| `src/auth/auth.controller.ts` | P0 | New `POST /auth/microsoft-login` endpoint |
| `src/auth/auth.service.ts` | P0 | New `loginWithMicrosoft()` method |
| `src/users/users.service.ts` | P0 | New lookup methods (`findByMicrosoftId`, `findByEmailAndProvider`) |
| `src/users/dto/create-user.dto.ts` | P1 | Optional password, authProvider field |
| `src/auth/auth.module.ts` | P0 | Register new config values |
| New: migration file | P0 | DB schema changes |
| New: `src/auth/dto/microsoft-login.dto.ts` | P0 | Request DTO |

### Rollout Roadmap

```
Week 0:  Azure AD app registration (admin task)
Week 1:  Phase 1 backend (DB migration, new endpoint, token validation)
Week 1:  Phase 1 frontend (MSAL.js, login page, Microsoft button)
Week 2:  Phase 1 testing + Phase 2 backend (user creation enhancements)
Week 2:  Phase 2 frontend (admin panel auth method toggle)
Week 3:  Phase 3 hardening (audit logs, httpOnly cookies, middleware)
Week 4:  Production deployment + monitoring
```

### What Stays Completely Unchanged

- **JwtStrategy** — validates internal JWT, doesn't care about auth origin
- **PermissionGuard** — checks permissions by user.id
- **PermissionsService** — resolves permissions by user.id via role chain
- **All RRF workflow logic** — submit, approve, decline, hold, openForHiring, close
- **All exported APIs** — response shapes identical for both auth methods
- **Sidebar, routing, protected routes** — permission-based, auth-agnostic
- **apiConfig.js** — attaches Bearer token from localStorage (unchanged)
- **usePermission hook** — reads permissions array (unchanged)
- **All role-permission mappings** — database content unchanged

---

*End of planning document. No code was modified. All references verified against actual source files.*
