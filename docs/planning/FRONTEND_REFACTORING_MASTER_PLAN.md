# RRF Portal — Frontend Refactoring Master Plan

**Document Version:** 1.0  
**Date:** 2026-05-12  
**Author:** Enterprise Frontend Architecture Team  
**Status:** PLANNING — No implementation until approved  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Frontend Architecture Analysis](#2-existing-frontend-architecture-analysis)
3. [Current Architectural Problems](#3-current-architectural-problems)
4. [Frontend Refactoring Goals](#4-frontend-refactoring-goals)
5. [Strangler Pattern Refactoring Strategy](#5-strangler-pattern-refactoring-strategy)
6. [Future Feature-Based Architecture Proposal](#6-future-feature-based-architecture-proposal)
7. [Workflow Module Refactoring Plan](#7-workflow-module-refactoring-plan)
8. [Sidebar & Navigation Refactoring Plan](#8-sidebar--navigation-refactoring-plan)
9. [Shared UI Component Strategy](#9-shared-ui-component-strategy)
10. [Frontend State Management Strategy](#10-frontend-state-management-strategy)
11. [Routing Refactoring Strategy](#11-routing-refactoring-strategy)
12. [Backend Compatibility Strategy](#12-backend-compatibility-strategy)
13. [Migration Phases](#13-migration-phases)
14. [Legacy Cleanup Strategy](#14-legacy-cleanup-strategy)
15. [Refactoring Rules](#15-refactoring-rules)
16. [Final Recommendation](#16-final-recommendation)

---

## 1. Executive Summary

### 1.1 Frontend Maturity Assessment

| Dimension | Score | Assessment |
|:---|:---:|:---|
| Architecture Clarity | 4/10 | Hybrid role-folder + partial feature migration; inconsistent patterns |
| Scalability | 3/10 | Adding a new role requires duplicating 6–10 pages |
| Maintainability | 4/10 | Bug fixes must be applied in 4+ identical files |
| Code Reuse | 5/10 | Some shared components exist but are underutilized |
| Permission Model | 7/10 | Permission-based system is solid; routing hasn't caught up |
| State Management | 6/10 | Custom SWR-like hooks work well; no global store bloat |
| Workflow Rendering | 6/10 | `rrfActionResolver.js` is well-designed; UI hasn't fully adopted it |

### 1.2 Key Findings

**What's Working Well:**
- Permission system (`usePermission`, `PERMISSIONS` constants, `rrfActionResolver`) is enterprise-grade
- `useSmartFetch` / `apiCache` provides effective SWR-like data management without heavy dependencies
- Unified detail page (`/requests/[id]`) already demonstrates the target architecture
- `ModernRRFForm` is reusable across roles (thin wrappers in HM and PMO)
- `ReportsDashboard` is already shared across PMO and Approver
- `ActionButtonBar` and `ActionModal` correctly decouple workflow actions from page rendering

**What's Problematic:**
- **28+ pages** organized by role folder with massive code duplication
- Same table/search/badge logic copy-pasted across 12+ pages
- `getPriorityBadge` and `getStatusBadge` duplicated in every list page
- Mobile card views independently implemented per page
- Department/Sub-function filter lists hardcoded in multiple locations
- Role-based routing forces URL changes when roles are added/modified
- Two sidebar implementations (`Sidebar.jsx` legacy + `PermissionBasedSidebar.jsx`)
- Some pages still use `useEffect` + manual fetch while others use `useSmartFetch`

### 1.3 Duplication Analysis

| Duplicated Pattern | Occurrences | Lines Wasted |
|:---|:---:|:---:|
| `getPriorityBadge` function | 12 | ~360 |
| `getStatusBadge` function | 10 | ~400 |
| Search bar + reload button UI | 12 | ~180 |
| Mobile card view blocks | 8 | ~400 |
| Table header/row structure | 12 | ~720 |
| Loading/Empty state rendering | 12 | ~240 |
| Department filter dropdown | 4 | ~120 |
| CSV export logic | 3 | ~150 |

**Estimated total duplicated code: ~2,500+ lines across 28+ page files.**

### 1.4 Risk Assessment

| Risk | Severity | Mitigation |
|:---|:---:|:---|
| Breaking workflow behavior during refactor | HIGH | Strangler pattern; old routes remain functional |
| Regression in permission checks | MEDIUM | ProtectedRoute + usePermission already solid |
| API contract mismatch | LOW | No backend changes required |
| User confusion from URL changes | MEDIUM | Gradual redirect strategy |
| Deployment rollback complexity | MEDIUM | Feature flags + parallel route coexistence |

---

## 2. Existing Frontend Architecture Analysis

### 2.1 Technology Stack

| Layer | Technology | Version |
|:---|:---|:---|
| Framework | Next.js (App Router) | 14.2.0 |
| UI Library | React | 18.3 |
| Component Library | Ant Design | 5.12 |
| Styling | Tailwind CSS | 3.x |
| State Management | Custom hooks (useSmartFetch) | N/A |
| Caching | In-memory TTL Map (apiCache) | N/A |
| Auth | JWT (localStorage) + AuthContext | N/A |
| Real-time | Socket.IO Client | 4.x |
| PDF/Export | jspdf + html2canvas | N/A |

### 2.2 Role-Folder Architecture

```
app/
├── hiring-manager/       # 6 pages (dashboard, drafts, my-requests, create-rrf, edit-rrf/[id], view-rrf/[id])
├── approver/             # 9 pages (dashboard, pending, approved, declined, on-hold, closed, reports, edit-rrf/[id], view-rrf/[id])
├── pmo/                  # 9 pages (dashboard, pending, closed, open-positions, my-requests, requests, sent-to-approvers, create-rrf, form-config, reports)
├── hr/                   # 3 pages (dashboard, open-for-hiring, closed)
├── admin/                # 4 pages (dashboard, users, roles, form-config, rrf-management)
├── requests/[id]/        # 1 unified detail page (NEW — already refactored)
├── login/
├── auth/
├── notifications/
└── unauthorized/
```

**Total role-specific pages: ~31 files**  
**Of those, approximately 18 are "list" pages showing filtered RRF tables.**

### 2.3 Routing Structure

| Route Pattern | Role | Purpose |
|:---|:---|:---|
| `/hiring-manager/dashboard` | HM | Dashboard with stats + recent requests |
| `/hiring-manager/my-requests` | HM | All submitted requests (tabbed by status) |
| `/hiring-manager/drafts` | HM | Draft RRFs not yet submitted |
| `/hiring-manager/create-rrf` | HM | Create new RRF |
| `/pmo` | PMO | Dashboard with PMO stats |
| `/pmo/requests` | PMO | All RRFs (master list with filters) |
| `/pmo/pending` | PMO | Approved RRFs awaiting action |
| `/pmo/open-positions` | PMO | Open positions view |
| `/pmo/closed` | PMO | Closed RRFs |
| `/approver` | Approver | Dashboard with approval stats |
| `/approver/pending` | Approver | Pending approval queue |
| `/approver/approved` | Approver | Already approved |
| `/approver/declined` | Approver | Declined by this approver |
| `/approver/on-hold` | Approver | On-hold requests |
| `/approver/closed` | Approver | Closed (post-approval) |
| `/hr` | HR | Dashboard |
| `/hr/open-for-hiring` | HR | Open positions in hiring phase |
| `/hr/closed` | HR | HR-closed positions |
| `/requests/[id]` | ALL | Unified detail page (already migrated) |

### 2.4 Sidebar Structure

**Legacy (`Sidebar.jsx`):** Role-based `switch` statement, 118 lines, hardcoded routes per role.  
**Current (`PermissionBasedSidebar.jsx`):** Permission-driven menu items, 210 lines. However, it STILL uses role identity (`roleCode`) to determine which route to navigate to (e.g., "Requests" → `/hiring-manager/my-requests` for HM vs `/pmo/requests` for PMO).

**Key Issue:** The sidebar is permission-aware for *visibility* but role-dependent for *routing targets*. This means the sidebar must be updated whenever routes change.

### 2.5 Permission Handling

The permission system is well-structured:

```
AuthContext → localStorage (token, user, permissions[])
    ↓
usePermission hook → hasPermission(), canCreateRRF, canApprove, etc.
    ↓
ProtectedRoute → page-level access control
PermissionBasedSidebar → menu visibility
rrfActionResolver → action-level control on detail page
```

**Strength:** Permissions are strings (`MODULE.ACTION`) that map cleanly to backend RBAC.  
**Gap:** Route-level guards use `ProtectedRoute` inconsistently — some pages have it, others don't.

### 2.6 API Integration Structure

```
lib/api/
├── apiConfig.js        → Centralized fetch wrapper with auth headers + 401 handling
├── rrfApi.js           → RRF CRUD + workflow actions (approve, reject, hold, close, openForHiring)
├── permissionsApi.js   → Permissions CRUD
├── rolesApi.js         → Role management
├── usersApi.js         → User management
├── formConfig.js       → Dynamic form field configuration
├── functionsApi.js     → Function/Sub-function metadata
├── subfunctionsApi.js  → Sub-function data
├── jobDescriptionsApi.js → JD management
├── reportsApi.js       → KPI/analytics data
└── notificationsApi.js → Notification management
```

**Data Flow:**
```
API Layer (rrfApi.js) → useSmartFetch (cache + dedup) → Custom Hooks → Page Components
```

---

## 3. Current Architectural Problems

### 3.1 Duplicated Pages

| Problem | Impact | Example |
|:---|:---|:---|
| 4 separate dashboard pages | Bug in stat card logic must be fixed 4 times | PMO/Approver/HR/HM dashboards |
| 5+ "pending" list pages | Column changes require editing 5 files | approver/pending, pmo/pending, pmo/open-positions |
| 4+ "closed" list pages | Filter logic inconsistencies | pmo/closed, approver/closed, hr/closed, hm/my-requests(closed tab) |
| 2 create-rrf pages | Both are thin wrappers — acceptable but route is duplicated | hm/create-rrf, pmo/create-rrf |
| 3 edit-rrf/view-rrf routes | Partially superseded by /requests/[id] but still exist | approver/edit-rrf, approver/view-rrf, hm/edit-rrf |

**Why it's problematic:** Every cross-cutting UI change (adding a column, fixing a badge color, updating mobile layout) requires editing 12+ files. This slows feature delivery and guarantees inconsistencies over time.

### 3.2 Duplicated Tables

Every list page independently implements:
- Table header with column definitions
- Row rendering with field access patterns
- Priority badge rendering (`getPriorityBadge`)
- Status badge rendering (`getStatusBadge`)
- Empty state rendering
- Loading state rendering
- Mobile card fallback

**Why it's problematic:** These should be a single configurable `<RRFTable>` component with column/filter/action configuration. Currently, adding a new column to "all RRF lists" requires touching 12+ files.

### 3.3 Duplicated Sidebars

Two sidebar implementations exist:
- `Sidebar.jsx` (legacy, role-switch based)
- `PermissionBasedSidebar.jsx` (current, permission-driven)

**Why it's problematic:** `Sidebar.jsx` is dead code that can confuse developers. `PermissionBasedSidebar.jsx` still hard-codes role-specific routes, making it fragile when routes are refactored.

### 3.4 Hardcoded Role Routing

The sidebar determines routing targets by checking `roleCode`:
```js
if (isPMO) dashboardRoute = '/pmo'
else if (isApprover) dashboardRoute = '/approver'
```

**Why it's problematic:** Adding a new role (e.g., "RECRUITER") requires:
1. Creating a new `/recruiter/` folder with pages
2. Updating the sidebar routing logic
3. Duplicating existing list pages with minor tweaks
4. Updating all hardcoded route references

This doesn't scale.

### 3.5 Maintainability Bottlenecks

| Bottleneck | Effort to Fix |
|:---|:---|
| Change status badge colors | Edit 10+ files |
| Add "Department" column to all tables | Edit 12+ files |
| Fix mobile card layout | Edit 8+ files |
| Add a new workflow status | Edit badge logic in 10+ files, add filter option in 6+ files |
| Add CSV export to a new page | Copy 50+ lines from another page |

### 3.6 Scalability Limitations

- **New Role Addition:** ~2 days of page duplication work
- **New Workflow State:** ~1 day of badge/filter updates across all pages
- **New Table Column:** ~0.5 day of repetitive edits
- **UI Theme Change:** Inconsistent results due to inline styles mixed with Tailwind

### 3.7 Frontend Coupling Risks

- Role identities are leaked into route paths (URL contains role name)
- Sidebar routing assumes role ↔ route 1:1 mapping
- Some pages assume specific API response shapes without the `formatRrfForDisplay` normalization
- Hardcoded department/sub-function lists create data staleness

---

## 4. Frontend Refactoring Goals

### 4.1 Feature-Driven Architecture

**Goal:** Replace role-based folder organization with feature-based organization.

```
CURRENT: /app/pmo/pending/page.jsx       → PMO-specific pending page
TARGET:  /app/workflow/page.jsx           → Single workflow page, configured by permissions
```

### 4.2 Reusable Component Strategy

**Goal:** Extract all duplicated UI patterns into configurable shared components:

| Shared Component | Replaces |
|:---|:---|
| `<RRFTable>` | 12+ hand-rolled table implementations |
| `<StatusBadge>` | 10+ local `getStatusBadge()` functions |
| `<PriorityBadge>` | 12+ local `getPriorityBadge()` functions |
| `<SearchBar>` | 12+ copy-pasted search UI blocks |
| `<PageHeader>` | Inconsistent header+stats patterns |
| `<FilterBar>` | 6+ filter dropdown implementations |
| `<ExportButton>` | 3+ CSV generation implementations |
| `<EmptyState>` | Already exists but underused |
| `<MobileCard>` | 8+ independent mobile card views |

### 4.3 Scalable Routing

**Goal:** Routes organized by feature, not by role:

```
/dashboard          → Permission-driven, single page
/workflow           → Unified list with status tabs (replaces 12+ pages)
/workflow/[id]      → Already exists as /requests/[id]
/workflow/create    → Create RRF (permission-gated)
/workflow/[id]/edit → Edit RRF
/reports            → Reports dashboard
/admin/*            → Admin panel (keep separate)
```

### 4.4 Centralized Authorization

**Goal:** Every route protected by a consistent guard pattern:

```jsx
// Route-level: middleware.js or layout-level ProtectedRoute
// Component-level: usePermission hook (already done)
// Action-level: rrfActionResolver (already done)
```

### 4.5 Workflow-Aware Reusable UI

**Goal:** A single `<WorkflowList>` component that:
- Accepts a `dataSource` prop (which API to call)
- Accepts `columns` configuration
- Accepts `filters` configuration
- Accepts `actions` per row (derived from permissions)
- Renders table + mobile cards + search + pagination
- Handles loading/empty/error states uniformly

### 4.6 Shared Dashboard Architecture

**Goal:** A single `<Dashboard>` page that:
- Shows stats relevant to the user's permissions (already prototyped in `UnifiedDashboard.jsx`)
- Shows recent items from the user's relevant data sources
- Adapts layout without role-switching logic

---

## 5. Strangler Pattern Refactoring Strategy

### 5.1 Core Principle

> **The old system continues to function exactly as-is while new architecture is built alongside it. Old routes are only removed after the new routes are verified to be functionally equivalent.**

```
Phase 1: Build shared components alongside old pages
Phase 2: Create new unified routes that import shared components
Phase 3: Add redirects from old routes → new routes
Phase 4: Remove old routes after verification period
```

### 5.2 Coexistence Strategy

```
app/
├── hiring-manager/    ← OLD (remains functional throughout migration)
├── approver/          ← OLD (remains functional throughout migration)
├── pmo/               ← OLD (remains functional throughout migration)
├── hr/                ← OLD (remains functional throughout migration)
├── workflow/          ← NEW (built incrementally, coexists with old)
├── dashboard/         ← NEW (built incrementally)
├── requests/[id]/     ← ALREADY MIGRATED (proof of concept)
└── admin/             ← KEEP AS-IS (separate concerns)
```

### 5.3 Migration Safety Rules

1. **Never delete an old route until the new route passes all acceptance criteria**
2. **Old and new routes share the same API calls** — no backend changes
3. **Old and new routes share the same hooks** — risk is isolated to UI layer
4. **Feature flags can toggle between old/new routes** via `PermissionBasedSidebar` link targets
5. **Rollback = revert sidebar links to old routes** — instant, zero-downtime

### 5.4 Incremental Verification Protocol

For each migrated page:
1. Build new page using shared components
2. Verify it renders the same data as the old page
3. Verify all actions work (view, edit, approve, etc.)
4. Verify mobile layout parity
5. Switch sidebar link to new route
6. Monitor for 1 sprint
7. Only then mark old route for removal

### 5.5 Rollback Mechanism

```
// PermissionBasedSidebar.jsx — feature flag approach
const USE_NEW_WORKFLOW = process.env.NEXT_PUBLIC_USE_NEW_WORKFLOW === 'true'

// Routes can be toggled:
const requestsRoute = USE_NEW_WORKFLOW ? '/workflow' : '/pmo/requests'
```

If any issue is detected post-deployment:
1. Set `NEXT_PUBLIC_USE_NEW_WORKFLOW=false`
2. Redeploy (or use runtime config)
3. Old routes are still functional — zero data loss, zero workflow breakage

---

## 6. Future Feature-Based Architecture Proposal

### 6.1 Target Directory Structure

```
app/
├── (auth)/                    # Auth group (login, callback, unauthorized)
│   ├── login/page.jsx
│   ├── auth/callback/page.jsx
│   └── unauthorized/page.jsx
│
├── (portal)/                  # Main app group (shared layout with sidebar)
│   ├── layout.jsx             # Sidebar + Header + ProtectedRoute wrapper
│   ├── dashboard/page.jsx     # Unified permission-adaptive dashboard
│   │
│   ├── workflow/              # Unified workflow module
│   │   ├── page.jsx           # Master list (tabs: my-requests, pending, approved, etc.)
│   │   ├── create/page.jsx    # Create RRF
│   │   ├── [id]/page.jsx      # View/Detail (current /requests/[id])
│   │   └── [id]/edit/page.jsx # Edit RRF
│   │
│   ├── reports/page.jsx       # Unified reports dashboard
│   ├── notifications/page.jsx # Notifications center
│   │
│   └── admin/                 # Admin module (keep separate)
│       ├── page.jsx
│       ├── users/page.jsx
│       ├── roles/page.jsx
│       └── form-config/page.jsx
│
components/
├── shared/                    # Cross-cutting shared components
│   ├── RRFTable.jsx           # Configurable table with mobile support
│   ├── StatusBadge.jsx        # Unified status badge
│   ├── PriorityBadge.jsx      # Unified priority badge
│   ├── SearchBar.jsx          # Reusable search + reload
│   ├── FilterBar.jsx          # Configurable filter dropdowns
│   ├── PageHeader.jsx         # Page title + stats + actions
│   ├── ExportButton.jsx       # CSV/Excel/PDF export
│   ├── MobileCard.jsx         # Mobile card template
│   └── DashboardStats.jsx     # Stats grid with permission awareness
│
├── workflow/                   # Workflow-specific components
│   ├── WorkflowTabs.jsx       # Status tab navigation
│   ├── ActionButtonBar.jsx    # (already exists)
│   └── ActionModal.jsx        # (already exists)
│
├── forms/                     # Form components
│   ├── ModernRRFForm.jsx      # (already exists)
│   └── FormConfig.jsx         # (already exists)
│
├── layout/                    # Layout components
│   ├── PermissionSidebar.jsx  # (refactored from current)
│   ├── Header.jsx             # (already exists)
│   └── ClientLayout.jsx       # (already exists)
│
└── reports/                   # Reports components
    └── ReportsDashboard.jsx   # (already exists)
```

### 6.2 Module Responsibilities

| Module | Responsibility | Current Mapping |
|:---|:---|:---|
| `/dashboard` | Role-adaptive stats + recent items | Replaces 4 dashboard pages |
| `/workflow` | All RRF list views via tabs/filters | Replaces 18+ list pages |
| `/workflow/create` | RRF creation (permission-gated) | Replaces 2 create pages |
| `/workflow/[id]` | RRF detail + actions | Already exists as `/requests/[id]` |
| `/workflow/[id]/edit` | RRF editing | Replaces 3 edit pages |
| `/reports` | Analytics + export | Replaces 2 report pages |
| `/admin` | System administration | Keeps current structure |

### 6.3 How Role-Based Structure Maps to Feature Modules

```
CURRENT                          →  TARGET
─────────────────────────────────────────────────────────────
/hiring-manager/dashboard        →  /dashboard (HM stats shown via permissions)
/hiring-manager/my-requests      →  /workflow?view=my-requests
/hiring-manager/drafts           →  /workflow?view=drafts
/hiring-manager/create-rrf       →  /workflow/create
/hiring-manager/edit-rrf/[id]    →  /workflow/[id]/edit

/approver                        →  /dashboard (approver stats shown via permissions)
/approver/pending                →  /workflow?view=pending-approval
/approver/approved               →  /workflow?view=approved
/approver/declined               →  /workflow?view=declined
/approver/on-hold                →  /workflow?view=on-hold
/approver/closed                 →  /workflow?view=closed
/approver/reports                →  /reports

/pmo                             →  /dashboard (PMO stats shown via permissions)
/pmo/requests                    →  /workflow?view=all
/pmo/pending                     →  /workflow?view=open-positions
/pmo/open-positions              →  /workflow?view=open-positions
/pmo/closed                      →  /workflow?view=closed
/pmo/my-requests                 →  /workflow?view=my-requests
/pmo/sent-to-approvers           →  /workflow?view=sent-to-approvers
/pmo/reports                     →  /reports
/pmo/create-rrf                  →  /workflow/create

/hr                              →  /dashboard (HR stats shown via permissions)
/hr/open-for-hiring              →  /workflow?view=open-for-hiring
/hr/closed                       →  /workflow?view=closed
```

---

## 7. Workflow Module Refactoring Plan

### 7.1 Unified Workflow Page Architecture

The single `/workflow` page replaces 18+ list pages through:

```jsx
// /app/(portal)/workflow/page.jsx — conceptual structure
export default function WorkflowPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermission()
  const searchParams = useSearchParams()
  const view = searchParams.get('view') || getDefaultView(user)

  // View configuration determines: API source, columns, filters, actions
  const viewConfig = getViewConfig(view, user, permissions)

  return (
    <>
      <PageHeader title={viewConfig.title} stats={viewConfig.stats} />
      <WorkflowTabs views={getAvailableViews(permissions)} activeView={view} />
      <FilterBar filters={viewConfig.filters} />
      <RRFTable
        dataSource={viewConfig.dataSource}
        columns={viewConfig.columns}
        actions={viewConfig.rowActions}
        mobileCardConfig={viewConfig.mobileCard}
      />
    </>
  )
}
```

### 7.2 View Configuration Pattern

```javascript
// Each "view" is a configuration object, not a separate page
const VIEW_CONFIGS = {
  'my-requests': {
    title: 'My Requests',
    dataSource: () => rrfApi.getMyRequests(),
    columns: ['id', 'role', 'project', 'positions', 'priority', 'status', 'created'],
    filters: ['status'],
    visibleWhen: (perms) => hasPermission('RRF.READ', perms),
  },
  'pending-approval': {
    title: 'Pending Approval',
    dataSource: () => rrfApi.getPendingApprovals(),
    columns: ['id', 'manager', 'role', 'project', 'positions', 'priority', 'submitted'],
    filters: ['priority'],
    visibleWhen: (perms) => hasPermission('APPROVALS.READ', perms),
  },
  'open-positions': {
    title: 'Open Positions',
    dataSource: () => rrfApi.getOpenPositions(),
    columns: ['id', 'requester', 'role', 'project', 'department', 'positions', 'priority', 'approvedOn'],
    filters: ['department', 'priority'],
    visibleWhen: (perms) => hasPermission('RRF.OPEN_FOR_HIRING', perms),
  },
  // ... etc for all views
}
```

### 7.3 Workflow-State-Driven Rendering

Instead of hardcoded pages per status, the table renders differently based on:

1. **Which columns appear** — driven by `viewConfig.columns`
2. **Which row actions appear** — driven by `resolveActions(rrf, user, permissions)` per row
3. **Which filters are available** — driven by `viewConfig.filters`
4. **Which tabs are visible** — driven by user's permissions

### 7.4 Actor-Aware Rendering

The same table row shows different action buttons depending on WHO is viewing:

```javascript
// Per-row action resolution (already implemented in rrfActionResolver.js)
const rowActions = resolveActions(rrf, user, permissions)
// → { canView, canEdit, canApprove, canDecline, canHold, canOpenForHiring, canClose }
```

This is ALREADY implemented correctly. The refactoring simply needs to USE this resolver consistently in the unified table rather than each page implementing its own button logic.

### 7.5 Workflow Logic Preservation

**CRITICAL:** The workflow state machine remains UNTOUCHED:
- DRAFT → PENDING → APPROVED → IN_PROGRESS → CLOSED
- With DECLINED, REJECTED, ON_HOLD branches
- PMO bypass (direct to IN_PROGRESS)
- All transitions happen via the SAME backend API calls

The refactoring only changes HOW these states are displayed, not WHEN or HOW transitions occur.

---

## 8. Sidebar & Navigation Refactoring Plan

### 8.1 Current Problem

`PermissionBasedSidebar.jsx` uses a hybrid approach:
- Permission checks for item VISIBILITY (good)
- Role checks for route TARGETS (bad — couples sidebar to role-folder routing)

### 8.2 Target Architecture

```jsx
// Sidebar items become purely permission-driven with feature routes
const MENU_ITEMS = [
  {
    key: 'dashboard',
    icon: <HomeOutlined />,
    label: 'Dashboard',
    href: '/dashboard',
    permission: PERMISSIONS.DASHBOARD.READ,
  },
  {
    key: 'workflow',
    icon: <FileTextOutlined />,
    label: 'Requests',
    href: '/workflow',
    permission: PERMISSIONS.RRF.READ,
  },
  {
    key: 'reports',
    icon: <BarChartOutlined />,
    label: 'Reports',
    href: '/reports',
    permission: PERMISSIONS.REPORTS.READ,
  },
  // ...
]
```

### 8.3 Permission-Aware Navigation Strategy

1. Menu item visibility: `hasPermission(item.permission)` — already working
2. Route targets: Feature-based paths (no role in URL) — to be migrated
3. Active state: `pathname.startsWith(item.href)` — simpler without role paths

### 8.4 Dynamic Menu Rendering

```jsx
// No role switch statements needed
const visibleItems = MENU_ITEMS.filter(item => hasPermission(item.permission))
```

### 8.5 Migration Path

1. **Phase 1:** Keep current sidebar, add feature-flag for new route targets
2. **Phase 2:** Once new routes exist, update sidebar hrefs to `/workflow`, `/dashboard`, etc.
3. **Phase 3:** Remove role-checking logic from sidebar entirely
4. **Phase 4:** Delete `Sidebar.jsx` (legacy, already unused in production)

---

## 9. Shared UI Component Strategy

### 9.1 Priority 1 — Highest ROI Components

#### `<StatusBadge status={status} />`
Replaces 10+ local `getStatusBadge()` functions.

```jsx
// Configuration-driven badge rendering
const STATUS_CONFIG = {
  draft:           { label: 'Draft',           color: 'bg-gray-100 text-gray-700' },
  pending:         { label: 'Pending',         color: 'bg-yellow-100 text-yellow-800' },
  submitted:       { label: 'Pending',         color: 'bg-yellow-100 text-yellow-800' },
  approved:        { label: 'Approved',        color: 'bg-green-100 text-green-800' },
  'in-progress':   { label: 'In Progress',     color: 'bg-blue-100 text-blue-800' },
  'open-for-hiring': { label: 'Open for Hiring', color: 'bg-cyan-100 text-cyan-800' },
  closed:          { label: 'Closed',          color: 'bg-purple-100 text-purple-800' },
  declined:        { label: 'Declined',        color: 'bg-red-100 text-red-800' },
  rejected:        { label: 'Declined',        color: 'bg-red-100 text-red-800' },
  'on-hold':       { label: 'On Hold',         color: 'bg-orange-100 text-orange-800' },
  'closed-by-bench': { label: 'Filled (Bench)', color: 'bg-emerald-100 text-emerald-800' },
}
```

#### `<PriorityBadge priority={priority} />`
Replaces 12+ local `getPriorityBadge()` functions.

#### `<RRFTable columns={[...]} data={[...]} actions={resolveActions} />`
Replaces 12+ independent table implementations. Features:
- Configurable columns via column definition array
- Built-in search filtering
- Built-in mobile card fallback
- Built-in loading/empty states
- Per-row action resolution via `rrfActionResolver`

#### `<SearchBar value={} onChange={} onReload={} />`
Replaces 12+ copy-pasted search UI blocks.

### 9.2 Priority 2 — Medium ROI Components

#### `<FilterBar filters={[{ key, label, options }]} />`
Replaces 6+ filter dropdown implementations.

#### `<PageHeader title={} subtitle={} stats={[]} actions={[]} />`
Standardizes page header patterns.

#### `<ExportButton data={} columns={} formats={['csv','excel','pdf']} />`
Replaces 3+ export implementations.

#### `<DashboardStats stats={[]} />`
Permission-aware stat card grid.

### 9.3 Priority 3 — Nice-to-Have Components

#### `<MobileCard fields={[]} actions={[]} />`
Configurable mobile card template.

#### `<WorkflowTimeline history={[]} />`
Visual workflow state history.

#### `<ApprovalPanel approvers={[]} />`
Approval chain visualization.

---

## 10. Frontend State Management Strategy

### 10.1 Current State Management

| Layer | Pattern | Assessment |
|:---|:---|:---|
| Auth | `AuthContext` + localStorage | Solid — no changes needed |
| Permissions | Derived from `user.permissions[]` | Solid — no changes needed |
| Data Fetching | `useSmartFetch` + `apiCache` (TTL Map) | Good — lightweight SWR alternative |
| Optimistic Updates | Per-hook `localOverrides` | Works but not standardized |
| Notifications | `NotificationContext` + Socket.IO | Solid — no changes needed |

### 10.2 Identified Gaps

1. **No shared "current view" state** — each page manages its own filters/search independently
2. **No URL-synced state** — filters reset on navigation (search params not used consistently)
3. **Cache invalidation patterns differ** — some hooks use regex patterns, others use explicit keys
4. **No global loading indicator** — each page shows its own spinner

### 10.3 Recommended Improvements

#### URL-Synced Filter State
```jsx
// Filters persist in URL search params
const [view, setView] = useQueryParam('view', 'all')
const [search, setSearch] = useQueryParam('search', '')
const [department, setDepartment] = useQueryParam('department', '')
```

**Benefit:** Bookmarkable, shareable filtered views. Browser back/forward works correctly.

#### Standardized Cache Invalidation
```javascript
// After any mutation, invalidate related cache keys
const invalidateWorkflowCache = () => {
  invalidateCachePattern(/rrf|approver|statistics|my-requests/)
}
```

**Benefit:** Already partially implemented. Standardize across all hooks.

### 10.4 What NOT to Change

- **DO NOT** add Redux, Zustand, or any global state library
- **DO NOT** remove `useSmartFetch` / `apiCache` — they work well
- **DO NOT** change the auth flow or token management
- **DO NOT** add server-side state (React Query / SWR) unless team agrees later

---

## 11. Routing Refactoring Strategy

### 11.1 Gradual Route Migration

```
Sprint 1: /workflow route exists alongside old routes
Sprint 2: Sidebar links point to /workflow for PMO
Sprint 3: Sidebar links point to /workflow for Approver
Sprint 4: Sidebar links point to /workflow for HR
Sprint 5: Sidebar links point to /workflow for HM
Sprint 6: Old routes emit console.warn() deprecation notice
Sprint 7: Old routes redirect to new routes (301)
Sprint 8: Old route files deleted
```

### 11.2 How Current Routes Remain Operational

Old routes are NEVER modified during migration. They continue to:
- Render the same UI
- Call the same APIs
- Use the same hooks
- Enforce the same permissions

The new routes are built IN PARALLEL using shared components.

### 11.3 Redirect Strategy

```jsx
// Phase 6-7: Old routes become thin redirects
// app/pmo/pending/page.jsx
'use client'
import { redirect } from 'next/navigation'
export default function LegacyPMOPending() {
  redirect('/workflow?view=open-positions')
}
```

### 11.4 No Breaking Changes Initially

During Phases 1-5, users can access BOTH:
- `/pmo/pending` (old) — still works perfectly
- `/workflow?view=open-positions` (new) — same functionality

Only after the new route is verified does the sidebar link change.

---

## 12. Backend Compatibility Strategy

### 12.1 Zero Backend Changes Required

The frontend refactoring:
- Calls the SAME API endpoints
- Sends the SAME request payloads
- Expects the SAME response shapes
- Uses the SAME `formatRrfForDisplay` normalization
- Uses the SAME `sanitizeRrfPayload` for mutations

### 12.2 API Contract Preservation

| API Endpoint | Used By (Current) | Used By (New) | Change |
|:---|:---|:---|:---|
| `GET /rrf/my-requests` | `useMyRequests` hook | Same hook | None |
| `GET /rrf/workflow/approver/pending` | `useApproverRequests` | Same hook | None |
| `GET /rrf/pmo/dashboard-stats` | PMO page directly | `usePMOStats` hook | None |
| `POST /rrf/:id/approve` | `rrfApi.approve()` | Same function | None |
| `POST /rrf/:id/open-for-hiring` | `rrfApi.openForHiring()` | Same function | None |

### 12.3 Data Transformation Layer

The `rrfApi.js` file contains `formatRrfForDisplay()` which normalizes backend responses. This continues to be the SINGLE point of transformation between backend DTOs and frontend display objects.

**Rule:** All new shared components consume the SAME normalized shape that current pages consume. No new transformation logic needed.

### 12.4 Frontend/Backend Stability Guarantee

```
Backend API ──→ rrfApi.js (sanitize/format) ──→ useSmartFetch/hooks ──→ Components
                    ↑                                    ↑
              NO CHANGES                           NO CHANGES
```

The refactoring ONLY touches the final layer (Components → shared components). All upstream layers remain identical.

---

## 13. Migration Phases

### Phase 1 — Shared Components Foundation (Low Risk)

**Duration:** 1-2 sprints  
**Goal:** Build reusable components WITHOUT touching any existing pages.

**Deliverables:**
- `components/shared/StatusBadge.jsx`
- `components/shared/PriorityBadge.jsx`
- `components/shared/SearchBar.jsx`
- `components/shared/RRFTable.jsx`
- `components/shared/PageHeader.jsx`
- `components/shared/FilterBar.jsx`
- `components/shared/MobileCard.jsx`

**Migration Strategy:** Components are built in isolation. No existing pages are modified. Components are tested with Storybook or standalone test pages.

**Rollback Strategy:** Delete the `components/shared/` folder. Zero impact on production.

**Deployment Risk:** ZERO — no existing functionality touched.  
**Frontend Risk:** ZERO — new code is unused until Phase 2.  
**Backend Impact:** NONE.

---

### Phase 2 — Unified Workflow Page (Medium Risk)

**Duration:** 2-3 sprints  
**Goal:** Build `/workflow` page using shared components from Phase 1.

**Deliverables:**
- `app/(portal)/workflow/page.jsx` — master list with tabs
- `app/(portal)/workflow/create/page.jsx` — wrapper around ModernRRFForm
- View configurations for all current list pages
- URL-synced filter state (`?view=`, `?search=`, `?department=`)

**Migration Strategy:**
1. Build `/workflow` page
2. Test it renders same data as old pages (side-by-side comparison)
3. DO NOT modify old pages
4. DO NOT change sidebar links yet

**Rollback Strategy:** Delete `app/(portal)/workflow/` folder. Zero impact.

**Deployment Risk:** LOW — new route is unreachable unless directly typed.  
**Frontend Risk:** LOW — old pages unmodified.  
**Backend Impact:** NONE.

---

### Phase 3 — Unified Dashboard (Medium Risk)

**Duration:** 1-2 sprints  
**Goal:** Build `/dashboard` page that adapts to user's permissions.

**Deliverables:**
- `app/(portal)/dashboard/page.jsx` — permission-adaptive dashboard
- `components/shared/DashboardStats.jsx` — configurable stats grid
- Stat data sourced from existing hooks (`useRRFStatistics`, etc.)

**Migration Strategy:**
1. Build unified dashboard
2. Verify stat accuracy matches each role's current dashboard
3. DO NOT modify old dashboards

**Rollback Strategy:** Delete dashboard page. Zero impact.

**Deployment Risk:** LOW — new route is unreachable until sidebar update.  
**Frontend Risk:** LOW — old dashboards unmodified.  
**Backend Impact:** NONE.

---

### Phase 4 — Sidebar Route Migration (Medium-High Risk)

**Duration:** 1 sprint  
**Goal:** Point sidebar links to new routes.

**Deliverables:**
- Updated `PermissionBasedSidebar.jsx` with feature-based routes
- Feature flag to toggle between old/new routes
- Environment variable: `NEXT_PUBLIC_USE_UNIFIED_ROUTES`

**Migration Strategy:**
1. Add feature flag
2. Deploy with flag OFF (old routes)
3. Enable flag for internal testing
4. Enable flag for production after sign-off
5. Monitor for 1 sprint

**Rollback Strategy:** Set `NEXT_PUBLIC_USE_UNIFIED_ROUTES=false`. Instant rollback.

**Deployment Risk:** MEDIUM — users see new URLs, bookmark management needed.  
**Frontend Risk:** MEDIUM — if new pages have bugs, rollback is instant via flag.  
**Backend Impact:** NONE.

---

### Phase 5 — Detail & Edit Page Consolidation (Low Risk)

**Duration:** 1 sprint  
**Goal:** Consolidate edit-rrf routes into `/workflow/[id]/edit`.

**Deliverables:**
- `app/(portal)/workflow/[id]/edit/page.jsx` — unified edit page
- Move current `/requests/[id]` to `/workflow/[id]` (or keep both with redirect)

**Migration Strategy:**
1. `/requests/[id]` already works for all roles — move to `/workflow/[id]`
2. Add redirect from `/requests/[id]` → `/workflow/[id]`
3. Remove `/hiring-manager/edit-rrf`, `/approver/edit-rrf`, `/approver/view-rrf` (now redirect)

**Rollback Strategy:** Remove redirect, old routes still exist.

**Deployment Risk:** LOW — detail page already unified.  
**Frontend Risk:** LOW — proven pattern.  
**Backend Impact:** NONE.

---

### Phase 6 — Legacy Route Deprecation (Low Risk)

**Duration:** 1 sprint  
**Goal:** Add redirects from all old routes to new routes.

**Deliverables:**
- All old role-folder pages become `redirect()` calls
- Console warnings for developers still linking to old routes
- Monitoring for 404s from old bookmarks

**Migration Strategy:**
1. Replace page content with `redirect('/workflow?view=...')`
2. Old URLs still "work" — they just redirect
3. Monitor analytics for redirect traffic

**Rollback Strategy:** Restore old page content from git.

**Deployment Risk:** LOW — redirects maintain functionality.  
**Frontend Risk:** LOW — users land on correct pages.  
**Backend Impact:** NONE.

---

### Phase 7 — Legacy Cleanup (Low Risk)

**Duration:** 1 sprint  
**Goal:** Remove old role-folder pages entirely.

**Deliverables:**
- Delete `app/hiring-manager/` (except referenced utils)
- Delete `app/approver/`
- Delete `app/pmo/`
- Delete `app/hr/`
- Delete `components/Sidebar.jsx` (legacy)
- Update any remaining hardcoded route references

**Migration Strategy:**
1. Verify zero traffic to old routes (all redirected)
2. Delete folders
3. Run full regression test

**Rollback Strategy:** `git revert` the deletion commit.

**Deployment Risk:** LOW — redirects already handled traffic for 1+ sprint.  
**Frontend Risk:** LOW — well-verified by this point.  
**Backend Impact:** NONE.

---

## 14. Legacy Cleanup Strategy

### 14.1 When Old Role Folders Can Safely Be Removed

**Criteria for removal:**

| Criterion | How to Verify |
|:---|:---|
| All sidebar links point to new routes | Code review of PermissionBasedSidebar |
| Zero direct traffic to old routes | Analytics/logging for 2 weeks |
| All bookmarks handled via redirects | Redirect metrics show declining traffic |
| Full regression passed | All workflow actions verified |
| Team sign-off | Stakeholder approval |

### 14.2 Verification Checklist

Before deleting any old page, verify:

- [ ] Same data appears in new page
- [ ] Same filters work
- [ ] Same search works
- [ ] Same actions available per role
- [ ] Mobile view works
- [ ] Export works (where applicable)
- [ ] Loading states display correctly
- [ ] Empty states display correctly
- [ ] ProtectedRoute correctly gates access
- [ ] ActionButtonBar shows correct buttons
- [ ] ActionModal completes workflow actions

### 14.3 Files Safe to Delete Immediately

These are already dead code or superseded:

| File | Reason |
|:---|:---|
| `components/Sidebar.jsx` | Superseded by `PermissionBasedSidebar.jsx` |
| `app/approver/page.jsx.backup` | Backup file, not served |
| `components/UnifiedDashboard.jsx` | Template/prototype, not used in routes |

### 14.4 Files That Must Wait for Full Migration

| File | Wait Until |
|:---|:---|
| `app/pmo/*.jsx` | Phase 6 (redirects in place) |
| `app/approver/*.jsx` | Phase 6 |
| `app/hiring-manager/*.jsx` | Phase 6 |
| `app/hr/*.jsx` | Phase 6 |

---

## 15. Refactoring Rules

### 15.1 ABSOLUTE Rules (Never Violate)

1. **NO workflow behavior changes** — the 10-state machine remains identical
2. **NO backend API changes** — all existing endpoints remain unchanged
3. **NO auth redesign** — JWT + localStorage + AuthContext remains
4. **NO big-bang rewrites** — old system runs in parallel throughout
5. **NO immediate route deletion** — old routes persist until verified replacement exists
6. **NO frontend/backend contract changes** — DTOs, payloads, response shapes unchanged
7. **NO new dependencies without justification** — avoid adding Redux, Zustand, React Query
8. **NO permission model changes** — `MODULE.ACTION` strings remain the same

### 15.2 Development Rules

1. **Shared components must be backward-compatible** — they consume the same data shapes as current pages
2. **New pages must use `ProtectedRoute`** — consistent access control
3. **New pages must use `useSmartFetch`** — consistent data fetching
4. **All row actions must use `resolveActions()`** — no custom button logic per page
5. **URL state must be used for filters** — no invisible state that resets on navigation
6. **Mobile support is required** — shared components must handle responsive layout

### 15.3 Testing Rules

1. Each migrated view must pass a side-by-side comparison with the old page
2. All workflow actions must be tested end-to-end after migration
3. Permission edge cases must be verified (user with no permissions, user with all permissions)
4. Mobile layout must be tested for each migrated view

### 15.4 Deployment Rules

1. Feature flags gate new routes until verified
2. Old routes are never removed in the same deployment as new route creation
3. Minimum 1 sprint gap between "new route live" and "old route removed"
4. Rollback must be achievable without redeployment (flag toggle)

---

## 16. Final Recommendation

### 16.1 What Should Be Done First

**Phase 1 (Shared Components)** — This has ZERO deployment risk and provides the foundation for everything else. Start here immediately.

Specifically, build in this order:
1. `StatusBadge` + `PriorityBadge` (eliminate 22+ duplicated functions)
2. `SearchBar` (eliminate 12+ copy-pasted UI blocks)
3. `RRFTable` (eliminate 12+ independent table implementations)
4. `PageHeader` + `FilterBar` (standardize page layouts)

### 16.2 What Should NOT Be Done Now

- **DO NOT** restructure routing yet — build components first
- **DO NOT** delete any existing pages — they're production-stable
- **DO NOT** add new libraries (React Query, Zustand) — current hooks work well
- **DO NOT** refactor `ModernRRFForm.jsx` — it's complex but functional
- **DO NOT** touch the admin module — it has its own layout and is low-duplication
- **DO NOT** change the auth flow — it works correctly
- **DO NOT** redesign the API layer — `rrfApi.js` is well-structured

### 16.3 Biggest Frontend Bottleneck

**The RRF table list pages.** They account for 18+ files with massive duplication. A single `<RRFTable>` component with configurable columns, filters, and per-row action resolution would:
- Eliminate ~2,000 lines of duplicated code
- Make cross-cutting changes (new column, new badge color) a single-file edit
- Enable the unified `/workflow` page to replace 18 separate pages

### 16.4 Safest Migration Strategy

```
Build shared components → Build new unified pages → Toggle sidebar → Redirect old routes → Delete old routes
       (zero risk)            (zero risk)           (flag-gated)       (non-breaking)      (verified safe)
```

Every step is independently deployable, independently verifiable, and independently rollbackable.

### 16.5 Enterprise-Grade Direction

The target architecture follows proven enterprise patterns:
- **Feature-based modules** instead of role-based folders
- **Configuration-driven UI** instead of duplicated pages
- **Permission-aware components** instead of role-checking logic
- **URL-synced state** instead of invisible component state
- **Strangler pattern migration** instead of big-bang rewrite

This approach scales to:
- Adding new roles (just assign permissions — no new pages needed)
- Adding new workflow states (update configuration objects — no new pages needed)
- Adding new columns (update column config — single file change)
- Adding new filters (update filter config — single file change)
- Multiple frontend teams working in parallel (isolated feature modules)

---

## Appendix A: File Impact Matrix

| Current File | Phase Affected | Action |
|:---|:---:|:---|
| `components/Sidebar.jsx` | Phase 7 | DELETE (already dead code) |
| `components/PermissionBasedSidebar.jsx` | Phase 4 | MODIFY (update route targets) |
| `components/UnifiedDashboard.jsx` | Phase 3 | REPLACE (build proper version) |
| `app/pmo/page.jsx` | Phase 6 | REDIRECT → `/dashboard` |
| `app/pmo/requests/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=all` |
| `app/pmo/pending/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=open-positions` |
| `app/pmo/closed/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=closed` |
| `app/pmo/open-positions/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=open-positions` |
| `app/pmo/my-requests/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=my-requests` |
| `app/pmo/sent-to-approvers/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=sent-to-approvers` |
| `app/pmo/create-rrf/page.jsx` | Phase 5 | REDIRECT → `/workflow/create` |
| `app/pmo/reports/page.jsx` | Phase 6 | REDIRECT → `/reports` |
| `app/approver/page.jsx` | Phase 6 | REDIRECT → `/dashboard` |
| `app/approver/pending/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=pending-approval` |
| `app/approver/approved/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=approved` |
| `app/approver/declined/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=declined` |
| `app/approver/on-hold/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=on-hold` |
| `app/approver/closed/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=closed` |
| `app/approver/reports/page.jsx` | Phase 6 | REDIRECT → `/reports` |
| `app/approver/edit-rrf/[id]/page.jsx` | Phase 5 | REDIRECT → `/workflow/[id]/edit` |
| `app/approver/view-rrf/[id]/page.jsx` | Phase 5 | REDIRECT → `/workflow/[id]` |
| `app/hiring-manager/dashboard/page.jsx` | Phase 6 | REDIRECT → `/dashboard` |
| `app/hiring-manager/my-requests/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=my-requests` |
| `app/hiring-manager/drafts/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=drafts` |
| `app/hiring-manager/create-rrf/page.jsx` | Phase 5 | REDIRECT → `/workflow/create` |
| `app/hiring-manager/edit-rrf/[id]/page.jsx` | Phase 5 | REDIRECT → `/workflow/[id]/edit` |
| `app/hr/page.jsx` | Phase 6 | REDIRECT → `/dashboard` |
| `app/hr/open-for-hiring/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=open-for-hiring` |
| `app/hr/closed/page.jsx` | Phase 6 | REDIRECT → `/workflow?view=closed` |
| `hooks/useRRFs.js` | — | KEEP (used by new pages) |
| `hooks/useMyRequests.js` | — | KEEP |
| `hooks/useApproverRequests.js` | — | KEEP |
| `hooks/usePermission.js` | — | KEEP |
| `hooks/useRRFDetail.js` | — | KEEP |
| `lib/api/rrfApi.js` | — | KEEP (no changes) |
| `utils/rrfActionResolver.js` | — | KEEP (core of new architecture) |
| `utils/permissions.js` | — | KEEP |
| `contexts/AuthContext.jsx` | — | KEEP |
| `components/rrf/ActionButtonBar.jsx` | — | KEEP (used in new pages) |
| `components/rrf/ActionModal.jsx` | — | KEEP |
| `components/ModernRRFForm.jsx` | — | KEEP |
| `components/ReportsDashboard.jsx` | — | KEEP |
| `components/StatCard.jsx` | Phase 3 | KEEP (reused in unified dashboard) |

---

## Appendix B: Estimated Effort

| Phase | Effort | Risk | Can Ship Independently |
|:---|:---:|:---:|:---:|
| Phase 1 — Shared Components | 8-12 dev-days | Zero | Yes |
| Phase 2 — Unified Workflow Page | 10-15 dev-days | Low | Yes |
| Phase 3 — Unified Dashboard | 5-8 dev-days | Low | Yes |
| Phase 4 — Sidebar Migration | 2-3 dev-days | Medium | Yes |
| Phase 5 — Detail/Edit Consolidation | 3-5 dev-days | Low | Yes |
| Phase 6 — Legacy Redirects | 2-3 dev-days | Low | Yes |
| Phase 7 — Legacy Cleanup | 1-2 dev-days | Low | Yes |

**Total: ~31-48 dev-days (6-10 sprints at normal velocity)**

---

## Appendix C: Success Metrics

| Metric | Current | Target |
|:---|:---:|:---:|
| Files to edit for new column | 12+ | 1 |
| Files to edit for badge color change | 10+ | 1 |
| Pages to create for new role | 6-10 | 0 |
| Duplicated lines across list pages | ~2,500 | <100 |
| Time to add new workflow view | ~2 days | ~2 hours |
| Time to add new filter option | ~4 hours | ~15 minutes |
| Cross-role UI consistency | Manual | Guaranteed |

---

*End of Document*
