# Admin Unification Master Plan

**Status:** Planning — No implementation has started  
**Scope:** Frontend only — no backend changes required  
**Approach:** Incremental strangler-pattern migration, phase-gated

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Target Unified Architecture](#2-target-unified-architecture)
3. [Phased Migration Plan](#3-phased-migration-plan)
4. [Risk Analysis](#4-risk-analysis)
5. [Transition Strategy](#5-transition-strategy)
6. [File and Folder Impact Analysis](#6-file-and-folder-impact-analysis)
7. [Final Ideal Structure](#7-final-ideal-structure)
8. [Recommended Execution Order](#8-recommended-execution-order)

---

## 1. Current Architecture Analysis

### 1.1 Unified Architecture (HM / PMO / HR / Approver)

The four non-admin roles share a single layout engine introduced during the unified workflow migration.

**Layout pipeline:**

```
app/layout.jsx
  └── components/ClientLayout.jsx
        ├── components/UnifiedSidebar.jsx       ← config-driven
        ├── components/Header.jsx               ← unified header
        └── {page content}
```

**Key files:**

| File | Responsibility |
|---|---|
| `components/ClientLayout.jsx` | Root layout shell; sidebar collapse state; auth redirect; explicit admin bypass |
| `components/UnifiedSidebar.jsx` | Renders menu from `sidebarConfig.js`; permission-filtered |
| `components/Header.jsx` | Top bar; dynamic title via `getPageTitle()`; logout modal; `NotificationBell` |
| `lib/sidebarConfig.js` | `SIDEBAR_CONFIGS` map; `getSidebarItems(user)`; `isItemActive()`; permission experiment flag |
| `lib/workflowRoutes.js` | Route builders for `/workflow`, `/dashboard`, etc. |
| `hooks/usePermission.js` | Permission-checking hook wrapping `utils/permissions` |

**Sidebar configuration approach:**  
`UnifiedSidebar` calls `getSidebarItems(user)` which resolves the role code to a `SIDEBAR_CONFIGS` key, then filters by `hasPermission()`. Items are objects with `key`, `icon`, `label`, `href`, `permission`, `matchPaths`. Active state is computed by `isItemActive()` using `pathname` and optional `matchPaths` prefixes.

**Admin bypass in ClientLayout:**

```js
// components/ClientLayout.jsx, line 71
if (pathname.startsWith('/admin')) {
  return <>{children}</>
}
```

This means admin pages receive **no** sidebar, header, or layout from the unified system — they are completely invisible to `ClientLayout`.

---

### 1.2 Admin Architecture

Admin operates as an entirely separate, self-contained layout system.

**Layout pipeline:**

```
app/layout.jsx
  └── components/ClientLayout.jsx  (bypassed — returns children only)
        └── app/admin/layout.jsx
              ├── components/admin/AdminSidebar.jsx  ← hardcoded items
              ├── components/admin/AdminHeader.jsx   ← admin-specific header
              └── {admin page content}
```

**Key files:**

| File | Responsibility |
|---|---|
| `app/admin/layout.jsx` | Admin shell; ADMIN role guard; sidebar collapse state; mobile detection |
| `components/admin/AdminSidebar.jsx` | Hardcoded `menuItems` array; same visual gradient as `UnifiedSidebar` |
| `components/admin/AdminHeader.jsx` | Admin-specific top bar; own `getPageTitle()` with admin routes |

**Admin sidebar items (as of current state):**

| Label | Route | Status |
|---|---|---|
| Dashboard | `/admin` | Active |
| Users | `/admin/users` | Active |
| Roles | `/admin/roles` | Active |
| RRF | `/admin/rrf-management` | Active |
| Form Config | `/admin/form-config` | Active |
| Reports | `/admin/reports` | Disabled (Coming Soon) |
| Audit Logs | `/admin/audit-logs` | Disabled (Coming Soon) |

**Admin auth protection mechanism:**  
`app/admin/layout.jsx` applies a double guard:
1. `useEffect` redirect — pushes to `/login` if no user or non-ADMIN role
2. Synchronous render guard — returns a spinner/redirect UI until authenticated

This is stricter than `ClientLayout`'s single-`useEffect` redirect.

**localStorage key separation:**

| System | Key |
|---|---|
| Unified sidebar | `sidebarCollapsed` |
| Admin sidebar | `adminSidebarCollapsed` |

---

### 1.3 Duplicated Systems

| Concern | Unified | Admin | Notes |
|---|---|---|---|
| Layout shell | `ClientLayout.jsx` | `app/admin/layout.jsx` | Separate files, same purpose |
| Sidebar component | `UnifiedSidebar.jsx` | `AdminSidebar.jsx` | Identical visual design; different data source |
| Sidebar data | `lib/sidebarConfig.js` | Hardcoded array in `AdminSidebar.jsx` | Not config-driven in admin |
| Header | `Header.jsx` | `AdminHeader.jsx` | Same structure; separate `getPageTitle()` |
| `getPageTitle()` | In `Header.jsx` | In `AdminHeader.jsx` | Duplicated pattern |
| Logout modal | In `Header.jsx` | In `AdminHeader.jsx` | Identical implementation |
| Mobile detection | In `ClientLayout.jsx` | In `app/admin/layout.jsx` | Same `window.innerWidth < 768` logic |
| Sidebar collapse state | In `ClientLayout.jsx` | In `app/admin/layout.jsx` | Same pattern, different localStorage key |
| Auth redirect | `ClientLayout.jsx` | `app/admin/layout.jsx` | Admin has stricter double-guard |

---

### 1.4 Already Shared

| Concern | Component / File |
|---|---|
| Visual design language | Both sidebars use gradient `#0f172a → #1e293b → #4f46e5`; same icon sizes |
| Auth context | `contexts/AuthContext.jsx` (used by both) |
| Notification bell | `components/NotificationBell.jsx` (used by both headers) |
| API layer | `lib/api/rrfApi`, `lib/api/usersApi` (used by admin pages) |
| Stat cards | `components/StatCard.jsx` (used by admin dashboard) |
| Permission utilities | `utils/permissions` (used by `usePermission` hook) |
| Providers | `AuthProvider`, `NotificationProvider` (in root layout — wrap everything) |

---

### 1.5 Partial Overlap: ADMIN Entry in sidebarConfig.js

`lib/sidebarConfig.js` already contains a `SIDEBAR_CONFIGS.ADMIN` entry:

```js
ADMIN: [
  { key: 'dashboard', href: '/dashboard',      permission: PERMISSIONS.DASHBOARD.READ },
  { key: 'requests',  href: '/workflow?view=all', permission: PERMISSIONS.RRF.READ },
  { key: 'users',     href: '/admin/users',    permission: PERMISSIONS.USERS?.READ },
  { key: 'settings',  href: '/admin/roles',    permission: PERMISSIONS.SETTINGS?.READ },
]
```

This config is **incomplete** — it is missing Roles (as a distinct item), RRF Management, Form Config, and the coming-soon items. It is also **unused** by `AdminSidebar.jsx` since that component has a hardcoded items array. This partial config represents work-in-progress from an earlier planning pass.

---

### 1.6 Route Differences

| Routes | Owned by |
|---|---|
| `/dashboard`, `/workflow`, `/drafts`, `/reports`, `/requests/*` | Unified system |
| `/admin`, `/admin/users`, `/admin/roles`, `/admin/rrf-management`, `/admin/form-config` | Admin system |

Admin routes can remain under `/admin/*` after unification. Only the shell and navigation layer need to converge, not the URLs.

---

### 1.7 Permission Differences

Unified roles (HM, PMO, HR, Approver) use granular `PERMISSIONS` constants (e.g., `PERMISSIONS.RRF.CREATE`) loaded from `utils/permissions.js`. Admin's `sidebarConfig` entry uses optional-chaining fallbacks (`PERMISSIONS.USERS?.READ || 'USERS.READ'`) because `USERS` and `SETTINGS` modules may not have dedicated constants defined. This gap needs resolution before admin items can be permission-filtered through `UnifiedSidebar`.

---

## 2. Target Unified Architecture

### 2.1 Vision

One layout engine. One sidebar component. One header component. Admin routes remain under `/admin/*` but share the same shell as every other role.

```
app/layout.jsx
  └── components/ClientLayout.jsx              ← single layout for ALL roles
        ├── components/UnifiedSidebar.jsx       ← renders correct items per role
        ├── components/Header.jsx               ← single header for ALL roles
        └── {page content}                      ← /workflow, /admin/users, etc.
```

### 2.2 Navigation Data Flow (Target)

```
user.role ──► getSidebarItems(user)
                └── SIDEBAR_CONFIGS[role]        ← ADMIN entry fully populated
                      └── filter by hasPermission()
                            └── UnifiedSidebar renders items
```

Admin-specific items (`/admin/users`, `/admin/roles`, etc.) become regular entries in `SIDEBAR_CONFIGS.ADMIN`, just like HM items or PMO items.

### 2.3 Auth Protection (Target)

Rather than duplicating auth guard logic in every layout file, a single `ProtectedRoute` or layout-level guard handles:
- Unauthenticated → redirect to `/login`  
- Wrong role for an admin route → redirect to `/unauthorized`

The existing `components/ProtectedRoute.jsx` is a candidate for this role.

### 2.4 Header Page Titles (Target)

`Header.jsx`'s `getPageTitle()` is extended to cover admin routes, eliminating the need for a separate `AdminHeader.jsx`. Since the function is a simple `pathname`-to-string map, adding admin entries is non-breaking.

### 2.5 Admin-Specific UI Needs

Some admin-specific UI behaviors that must be preserved after convergence:

- **Disabled items with "Soon" badge** (Reports, Audit Logs) — needs a `disabled` property in `sidebarConfig.js` item schema and rendering support in `UnifiedSidebar`
- **ADMIN role gate** — admin pages must remain inaccessible to non-admin roles; this moves from layout-level to either `ProtectedRoute` or per-page middleware
- **Separate localStorage key** — can be consolidated to a single `sidebarCollapsed` key once layouts merge

---

## 3. Phased Migration Plan

Phases are ordered by risk and dependency. Each phase is independently deployable and rollback-safe.

---

### Phase 1 — Complete ADMIN Entry in sidebarConfig.js

**Goal:** Bring `SIDEBAR_CONFIGS.ADMIN` to parity with the hardcoded `AdminSidebar.jsx` items.

**Changes:**
- Add missing items to `SIDEBAR_CONFIGS.ADMIN`: Roles (as distinct item), RRF Management, Form Config
- Add `disabled: true` property to the schema for Reports and Audit Logs (coming soon items)
- Define or import proper permission constants for `USERS.READ`, `SETTINGS.READ`, `ROLES.READ`, `FORM_CONFIG.READ` in `utils/permissions.js`
- Verify `matchPaths` for all admin items

**Risk:** Zero — this is additive data change only. Admin still uses `AdminSidebar.jsx`; the config is not consumed by any admin component yet.

**Validation:** `sidebarConfig.js` ADMIN entry visually matches current `AdminSidebar.jsx` item list.

---

### Phase 2 — Add `disabled` Item Support to UnifiedSidebar

**Goal:** Allow `UnifiedSidebar` to render coming-soon / disabled items with the "Soon" badge, matching `AdminSidebar.jsx`'s current handling.

**Changes:**
- Add support for `item.disabled = true` in `UnifiedSidebar.jsx` render logic
- Render disabled items as non-clickable with the "Soon" badge (mirror the implementation in `AdminSidebar.jsx`)
- No schema or config changes needed (Phase 1 adds the flag to config)

**Risk:** Low — additive rendering path. Existing items are unaffected (they have no `disabled` flag).

**Validation:** Temporarily pass a disabled item to a test story/page and confirm it renders correctly without breaking active items.

---

### Phase 3 — Extend Header.jsx for Admin Routes

**Goal:** Make `Header.jsx`'s `getPageTitle()` aware of admin routes, so one header can serve all roles including admin.

**Changes in `Header.jsx`:**
```js
// Add to getPageTitle():
if (pathname === '/admin') return 'Dashboard'
if (pathname === '/admin/users') return 'User Management'
if (pathname === '/admin/roles') return 'Role Management'
if (pathname.startsWith('/admin/rrf-management')) return 'RRF Management'
if (pathname === '/admin/form-config') return 'Form Configuration'
if (pathname === '/admin/reports') return 'Reports'
if (pathname === '/admin/audit-logs') return 'Audit Logs'
```

**Risk:** Zero — additive changes to a simple `if/else` chain. Existing route mappings are untouched.

**Validation:** Existing unified routes still return correct titles. New admin route cases are covered.

---

### Phase 4 — Create a Shared AppShell Component

**Goal:** Extract the common layout shell (sidebar + header + collapse state + mobile detection) into a single reusable component, eliminating the duplication between `ClientLayout.jsx` and `app/admin/layout.jsx`.

**New file:** `components/AppShell.jsx`

**Responsibilities of AppShell:**
- Sidebar collapse state (`useState`, `localStorage` with a single `sidebarCollapsed` key)
- Mobile viewport detection (`useEffect` + `window.innerWidth`)
- Mobile sidebar open/close state
- Renders `UnifiedSidebar` + `Header` + `{children}`
- Accepts no role-specific props — sidebar content is resolved from `user.role` inside `UnifiedSidebar`

**ClientLayout.jsx changes:**
- Import and render `AppShell` instead of inline sidebar+header logic
- Remove admin bypass (`if pathname.startsWith('/admin')`) — admin routes now flow through AppShell

**admin/layout.jsx changes:**
- Remove sidebar + header rendering (AppShell handles it)
- Keep **only** the ADMIN role guard (auth protection stays admin-specific)

**Risk:** Medium — this is the largest structural change. Mitigate by:
- Building `AppShell` first without touching `ClientLayout` or `app/admin/layout.jsx`
- Testing `AppShell` in isolation with a temporary test route
- Swapping `ClientLayout` to use `AppShell` and running regression tests before touching admin layout

---

### Phase 5 — Wire Admin into UnifiedSidebar via AppShell

**Goal:** Admin users see their sidebar items from `SIDEBAR_CONFIGS.ADMIN` rendered by `UnifiedSidebar` inside `AppShell`.

**Changes:**
- Remove the admin bypass in `ClientLayout.jsx` (or in `AppShell` if Phase 4 is complete)
- Remove `AdminSidebar.jsx` rendering from `app/admin/layout.jsx`
- Remove `AdminHeader.jsx` rendering from `app/admin/layout.jsx`

**Verification before removal:**
- Admin user navigates to `/admin/*` and sees correct sidebar items
- Active state highlights correctly for all admin routes
- Sidebar collapse persists across page navigation
- Mobile behavior works correctly

**Risk:** Medium-High — this is the first time admin users see the new sidebar. Admin-specific items (disabled badge, non-standard routes) must work correctly before this phase.

---

### Phase 6 — Consolidate Auth Protection

**Goal:** Move the admin route RBAC guard from `app/admin/layout.jsx` into a reusable pattern.

**Options (choose one before Phase 6 implementation):**
- **Option A:** Middleware — Next.js `middleware.ts` at the root; inspect `user.role` from JWT/session cookie and redirect non-ADMIN requests to `/admin/*` → `/unauthorized`
- **Option B:** `ProtectedRoute` component — wrap admin page content with `<ProtectedRoute requiredRole="ADMIN">` (existing `components/ProtectedRoute.jsx` likely supports this)
- **Option C:** Keep auth guard in `app/admin/layout.jsx` — retain the useEffect guard but remove sidebar/header duplication only

**Recommendation:** Option B (ProtectedRoute) is the most consistent with the existing codebase pattern and requires no new infrastructure.

**Risk:** Low-Medium — auth logic is well-isolated. The existing double-guard in `app/admin/layout.jsx` can remain in place as a safety net even after `ProtectedRoute` is added.

---

### Phase 7 — Legacy Component Cleanup

**Goal:** Remove components that are no longer rendered after convergence.

**Candidates for removal:**
- `components/admin/AdminSidebar.jsx`
- `components/admin/AdminHeader.jsx`
- The `components/admin/` folder (if empty)

**Prerequisites:**
- Phase 5 is fully verified and stable in production
- No import of `AdminSidebar` or `AdminHeader` remains in the codebase (grep-verify before deletion)

**Risk:** Low — cleanup only. No behavior changes.

---

### Phase 8 — PermissionBasedSidebar Cleanup

**Goal:** Remove the legacy `PermissionBasedSidebar.jsx` from the codebase.

**Context:** `PermissionBasedSidebar.jsx` exists in `components/` but is no longer imported by `ClientLayout.jsx`. It is only referenced in documentation files. It was part of an earlier migration pass that was superseded by `UnifiedSidebar`.

**Prerequisites:**
- Confirm `PermissionBasedSidebar.jsx` has zero runtime imports (grep `import.*PermissionBasedSidebar`)
- Confirm `Sidebar.jsx` (also in `components/`) is similarly unused — verify before removing

**Risk:** Very Low — file is already dormant.

---

## 4. Risk Analysis

### 4.1 RBAC and Permission Risks

| Risk | Severity | Description |
|---|---|---|
| Admin items visible to non-admin users | **Critical** | If the admin bypass is removed before ADMIN role filtering is verified to work correctly in `getSidebarItems()`, non-admin users could see admin nav items. |
| Permission constants undefined for admin modules | **High** | `PERMISSIONS.USERS`, `PERMISSIONS.SETTINGS`, `PERMISSIONS.ROLES` may not be defined in `utils/permissions.js`, causing `hasPermission()` to silently return `false` and hide admin items. |
| Admin route accessible without role guard | **High** | If `app/admin/layout.jsx`'s auth guard is removed before an equivalent protection is added elsewhere, `/admin/*` pages become accessible to any authenticated user. |

**Mitigation:** Complete Phase 1 (fix permission constants), verify `getSidebarItems('ADMIN')` returns full item list, and keep the auth guard in `app/admin/layout.jsx` until Phase 6 is independently verified.

---

### 4.2 Route Break Risks

| Risk | Severity | Description |
|---|---|---|
| Active state mismatch for `/admin` routes | **Medium** | `isItemActive()` uses `pathname.startsWith(hrefPath)`. `/admin` items link to `/admin/users`, `/admin/roles`, etc. If `matchPaths` is not set correctly, the Dashboard item (`/admin`) could be active for all sub-routes. |
| `workflowRoutes.js` has no admin route builders | **Low** | Admin routes are not in `workflowRoutes.js`. This is by design — admin routes are not part of the workflow namespace. No changes needed. |

---

### 4.3 Sidebar Regression Risks

| Risk | Severity | Description |
|---|---|---|
| Disabled items clickable in UnifiedSidebar | **Medium** | `UnifiedSidebar` currently has no `disabled` rendering path. Phase 2 must be complete before admin items with `disabled: true` are rendered through `UnifiedSidebar`. |
| Sidebar collapse state conflict | **Low** | Both systems currently store collapse state to localStorage with different keys. Consolidating to one key is safe but needs a one-time migration for existing user preferences. |
| Admin sidebar still imports old component after Phase 5 | **Low** | If `app/admin/layout.jsx` is not updated, both `AdminSidebar` and `UnifiedSidebar` could render simultaneously. Guard with explicit removal step. |

---

### 4.4 Admin-Specific Behavior Risks

| Risk | Severity | Description |
|---|---|---|
| Mobile sidebar close on route change | **Low** | `ClientLayout.jsx` already closes mobile sidebar on route change. `app/admin/layout.jsx` does not. After convergence, this behavior is automatically inherited — but should be verified. |
| Admin header logo/branding differences | **Low** | Both sidebars currently use the same "R" logo and gradient. No visual regression expected. |
| Page titles for admin routes in Header.jsx | **Low** | Phase 3 adds admin titles to `Header.jsx`. If skipped, admin pages show generic fallback title "RRF Portal". Non-blocking but must be done before Phase 5. |

---

### 4.5 Rollout Risks

| Risk | Severity | Description |
|---|---|---|
| Admin regression not caught until production | **Medium** | Admin is used by a small set of users. Manual testing coverage must be thorough before each phase ships. |
| Parallel admin sessions using old vs new layout | **Low** | During transition, admin layout file still exists and guards the routes. No split-brain risk. |

---

## 5. Transition Strategy

### 5.1 Backward Compatibility

- Admin routes remain at `/admin/*` throughout all phases — no URL changes
- `AdminSidebar.jsx` and `AdminHeader.jsx` are not deleted until Phase 7, after full verification
- `app/admin/layout.jsx` retains its ADMIN role guard even after sidebar/header are migrated to the unified system (Phase 4–5), until Phase 6 explicitly addresses auth guard consolidation
- `PermissionBasedSidebar.jsx` remains in place until Phase 8

### 5.2 Incremental Rollout

Each phase is designed to be independently deployable:

| Phase | Can deploy independently? | Notes |
|---|---|---|
| 1 — Complete sidebarConfig ADMIN entry | Yes | Pure data change, no rendering impact |
| 2 — UnifiedSidebar disabled item support | Yes | Additive render path, no existing behavior changed |
| 3 — Header admin routes | Yes | Additive to `getPageTitle()` |
| 4 — AppShell extraction | Yes (with feature flag) | Introduce AppShell alongside existing layout; migrate one at a time |
| 5 — Wire admin into AppShell | Requires Phase 1–4 | First user-visible change for admin |
| 6 — Auth consolidation | Requires Phase 5 stable | Structural auth change; must be carefully validated |
| 7 — Remove AdminSidebar/AdminHeader | Requires Phase 5–6 complete | Cleanup only |
| 8 — Remove PermissionBasedSidebar | Independent | Already dormant |

### 5.3 Rollback Safety

- Phases 1–3 are pure additions — rollback is trivially reverting the added lines
- Phase 4 (AppShell): if `ClientLayout` still exists and AppShell is introduced alongside it, rollback is simply not switching `ClientLayout` to use `AppShell`
- Phase 5 (admin wiring): the admin bypass in `ClientLayout` (`if pathname.startsWith('/admin')`) acts as a feature flag. Restoring that single line completely reverts admin back to its own layout system
- Phase 7–8 (cleanup): these delete files that are no longer in use. Rollback requires restoring deleted files from version control

### 5.4 Testing Strategy

**Before Phase 4:**
- Unit test `getSidebarItems({ role: { code: 'ADMIN' } })` returns all expected items
- Unit test `isItemActive()` for admin route edge cases (exact `/admin` vs prefix `/admin/users`)
- Visual regression: take screenshots of current admin sidebar for comparison

**Before Phase 5:**
- Log into the app as ADMIN user with AppShell active
- Verify all 7 sidebar items render correctly (5 active + 2 disabled with "Soon" badge)
- Verify active highlighting for each route
- Verify sidebar collapse/expand and mobile drawer open/close
- Verify page title in header for each admin route

**Before Phase 6:**
- Verify non-ADMIN user cannot access `/admin/users` directly (test with HM credentials)
- Verify redirect goes to `/unauthorized` (not infinite loop)
- Verify ADMIN user can access all admin pages normally

### 5.5 Staged Cleanup Strategy

Only delete a file after:
1. No runtime import exists in the codebase (`grep -r "import.*AdminSidebar"` returns zero results)
2. The phase that replaced the component has been deployed and verified stable for at least one release cycle
3. A commit message clearly documents the deletion reason

---

## 6. File and Folder Impact Analysis

### 6.1 Directly Modified Files

| File | Phase | Change Type |
|---|---|---|
| `lib/sidebarConfig.js` | 1 | Add admin items; add `disabled` flag to schema |
| `components/UnifiedSidebar.jsx` | 2 | Add disabled item render path |
| `components/Header.jsx` | 3 | Add admin routes to `getPageTitle()` |
| `components/ClientLayout.jsx` | 4, 5 | Use AppShell; remove admin bypass |
| `app/admin/layout.jsx` | 4, 5, 6 | Remove sidebar/header; keep auth guard; eventually simplify |
| `utils/permissions.js` | 1 | Define `USERS`, `SETTINGS`, `ROLES`, `FORM_CONFIG` permission constants |

### 6.2 New Files to Create

| File | Phase | Purpose |
|---|---|---|
| `components/AppShell.jsx` | 4 | Shared layout shell for all roles |

### 6.3 Files to Delete

| File | Phase | Reason |
|---|---|---|
| `components/admin/AdminSidebar.jsx` | 7 | Replaced by `UnifiedSidebar` |
| `components/admin/AdminHeader.jsx` | 7 | Replaced by `Header.jsx` |
| `components/PermissionBasedSidebar.jsx` | 8 | Already dormant; superseded by `UnifiedSidebar` |
| `components/Sidebar.jsx` | 8 (verify) | Verify dormant before deleting |
| `components/admin/` folder | 7 | Will be empty after deletions |

### 6.4 Files Verified Unchanged

These files are touched by no phase:

| File | Reason |
|---|---|
| `app/admin/page.jsx` | Admin dashboard page content — not layout |
| `app/admin/users/page.jsx` | Admin users page — not layout |
| `app/admin/roles/page.jsx` | Admin roles page — not layout |
| `app/admin/form-config/page.jsx` | Admin form config page — not layout |
| `app/admin/rrf-management/*` | Admin RRF management — not layout |
| `lib/workflowRoutes.js` | No admin routes managed here |
| `lib/workflowViewConfig.js` | No admin views |
| `contexts/AuthContext.jsx` | Unchanged; already shared |
| `contexts/NotificationContext.jsx` | Unchanged; already shared |
| `hooks/usePermission.js` | Unchanged |
| `components/NotificationBell.jsx` | Already shared between both headers |

### 6.5 Reusable Components Already Shared

No changes needed — already unified:

- `components/StatCard.jsx`
- `components/LoadingSpinner.jsx`
- `components/EmptyState.jsx`
- `lib/api/*` (all API modules)
- `components/NotificationBell.jsx`

### 6.6 Duplicate Systems (Migration Candidates)

| Duplication | Unified Version | Admin Version | Converges in |
|---|---|---|---|
| Sidebar component | `UnifiedSidebar.jsx` | `AdminSidebar.jsx` | Phase 5 |
| Sidebar data | `sidebarConfig.js` | Hardcoded array in `AdminSidebar.jsx` | Phase 1 |
| Header component | `Header.jsx` | `AdminHeader.jsx` | Phase 5 |
| Page title resolver | `Header.jsx → getPageTitle()` | `AdminHeader.jsx → getPageTitle()` | Phase 3 |
| Layout shell | `ClientLayout.jsx` | `app/admin/layout.jsx` | Phase 4 |
| Mobile detection | `ClientLayout.jsx` | `app/admin/layout.jsx` | Phase 4 |
| Sidebar collapse state | `ClientLayout.jsx` | `app/admin/layout.jsx` | Phase 4 |
| localStorage key | `sidebarCollapsed` | `adminSidebarCollapsed` | Phase 4 |
| Logout modal | `Header.jsx` | `AdminHeader.jsx` | Phase 5 |
| Auth redirect | `ClientLayout.jsx` (useEffect) | `app/admin/layout.jsx` (double-guard) | Phase 6 |

---

## 7. Final Ideal Structure

### 7.1 Component Hierarchy (Target)

```
app/layout.jsx
  └── components/ClientLayout.jsx
        └── components/AppShell.jsx               ← NEW: extracted shell
              ├── components/UnifiedSidebar.jsx    ← single sidebar for all roles
              ├── components/Header.jsx            ← single header for all roles
              └── {children}

app/admin/layout.jsx                              ← ADMIN role guard only
  └── {admin page content}                        ← no sidebar/header here
```

### 7.2 Navigation Data (Target)

```
lib/sidebarConfig.js
  ├── SIDEBAR_CONFIGS.HM           [Dashboard, Requests, Drafts]
  ├── SIDEBAR_CONFIGS.APPROVER     [Dashboard, Requests, Reports]
  ├── SIDEBAR_CONFIGS.PMO          [Dashboard, Requests, Reports, Edit Form, Drafts]
  ├── SIDEBAR_CONFIGS.HR           [Dashboard, Requests]
  └── SIDEBAR_CONFIGS.ADMIN        [Dashboard, Requests, Users, Roles, RRF Mgmt,
                                    Form Config, Reports*, Audit Logs*]
                                    (* disabled with "Soon" badge)
```

### 7.3 Auth Protection (Target)

```
Unauthenticated user
  → ClientLayout useEffect → /login

Authenticated non-ADMIN visiting /admin/*
  → app/admin/layout.jsx ProtectedRoute → /unauthorized

Authenticated ADMIN visiting /admin/*
  → renders correctly with unified sidebar showing ADMIN items
```

### 7.4 File Structure (Target)

```
components/
  AppShell.jsx              ← NEW
  ClientLayout.jsx          ← simplified (delegates to AppShell)
  Header.jsx                ← extended with admin routes
  UnifiedSidebar.jsx        ← extended with disabled-item support
  NotificationBell.jsx      ← unchanged
  ProtectedRoute.jsx        ← extended or reused for admin guard

lib/
  sidebarConfig.js          ← ADMIN entry fully populated

utils/
  permissions.js            ← USERS, SETTINGS, ROLES, FORM_CONFIG constants added

app/admin/
  layout.jsx                ← auth guard only, minimal
  page.jsx                  ← unchanged
  users/page.jsx            ← unchanged
  roles/page.jsx            ← unchanged
  form-config/page.jsx      ← unchanged
  rrf-management/*          ← unchanged
```

### 7.5 Deleted Files (Target)

```
components/admin/AdminSidebar.jsx     ← deleted in Phase 7
components/admin/AdminHeader.jsx      ← deleted in Phase 7
components/PermissionBasedSidebar.jsx ← deleted in Phase 8
components/Sidebar.jsx                ← deleted in Phase 8 (if verified dormant)
```

---

## 8. Recommended Execution Order

Phases are listed in dependency order. Phases 1–3 can be executed in parallel by different contributors. Phases 4–6 are sequential.

```
Phase 1  ── Complete ADMIN sidebarConfig entry
          ── Fix permission constants in utils/permissions.js
                │
Phase 2  ── Add disabled-item support to UnifiedSidebar
                │
Phase 3  ── Add admin routes to Header.jsx getPageTitle()
                │
          ─────┴─────── (All three verified) ──────────────────
                │
Phase 4  ── Create AppShell.jsx
          ── Migrate ClientLayout.jsx to use AppShell
          ── Verify all non-admin roles still work
                │
Phase 5  ── Remove admin bypass from ClientLayout (or AppShell)
          ── Remove AdminSidebar + AdminHeader from app/admin/layout.jsx
          ── Verify admin user sees correct sidebar and header
                │
Phase 6  ── Consolidate ADMIN auth guard into ProtectedRoute
          ── Simplify app/admin/layout.jsx to minimal guard only
          ── Verify non-admin users cannot access /admin/* routes
                │
Phase 7  ── Delete components/admin/AdminSidebar.jsx
          ── Delete components/admin/AdminHeader.jsx
          ── Delete components/admin/ folder
                │
Phase 8  ── Delete components/PermissionBasedSidebar.jsx
          ── Verify/delete components/Sidebar.jsx
```

### 8.1 Prerequisites Before Starting

Before Phase 1 begins:
- [ ] Confirm `utils/permissions.js` structure and which constants exist for admin modules
- [ ] Confirm `app/admin/rrf-management/` page count and routes (subdirectory was not fully enumerated)
- [ ] Confirm `components/Sidebar.jsx` has zero runtime imports (safe to flag for cleanup)
- [ ] Confirm `components/ProtectedRoute.jsx` signature and whether it supports `requiredRole` prop

### 8.2 Definition of Done

The migration is complete when:
- [ ] Zero imports of `AdminSidebar` or `AdminHeader` exist in runtime code
- [ ] Admin user sees correct sidebar with all items (including disabled ones with badge)
- [ ] Non-admin user cannot reach any `/admin/*` route
- [ ] Sidebar collapse state persists correctly for both admin and non-admin users
- [ ] Mobile sidebar works correctly on admin pages
- [ ] Page titles are correct for all admin routes in the unified header
- [ ] `PermissionBasedSidebar.jsx` and `AdminSidebar.jsx` are deleted
- [ ] No duplicate `getPageTitle()` functions remain in the codebase

---

*Document created: 2026-05-15*  
*Implementation has NOT started. All file modifications described in this document are future work.*
