# RRF Portal — Comprehensive Architecture Audit

> **Generated:** 2025-01-XX  
> **Scope:** Full-stack analysis (Frontend + Backend + Database + DevOps)  
> **Rating System:** ✅ GOOD | ⚠️ MEDIUM-RISK | 🔴 HIGH-RISK | 🚨 CRITICAL

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure & Folder Layout](#2-project-structure--folder-layout)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Database & TypeORM Layer](#5-database--typeorm-layer)
6. [RBAC & Permission System](#6-rbac--permission-system)
7. [Workflow Engine](#7-workflow-engine)
8. [API Design & Contract](#8-api-design--contract)
9. [Security Analysis](#9-security-analysis)
10. [Performance & Scalability](#10-performance--scalability)
11. [Technical Debt Inventory](#11-technical-debt-inventory)
12. [Scoring & Maturity Assessment](#12-scoring--maturity-assessment)
13. [Prioritized Recommendations](#13-prioritized-recommendations)

---

## 1. Executive Summary

The RRF (Resource Requisition Form) Portal is a **multi-role workflow management system** built on **NestJS 10 + Next.js 14 (App Router)** with **PostgreSQL 15** and **TypeORM 0.3**. It manages the lifecycle of hiring requisitions through a multi-step approval workflow (Draft → Pending → Approved → In-Progress → Closed).

### Key Strengths
- Well-structured RBAC with permission guards and 5-role hierarchy
- Event-driven notification architecture via `EventEmitter2`
- Concurrency-safe ID generation using PostgreSQL sequences
- Frontend caching layer with SWR-style deduplication (`useSmartFetch`)
- Clean separation of workflow logic into atomic, transactional operations

### Key Risks
- **Schema drift** — 23 manual SQL files vs 2 TypeORM migrations
- **No automated test suite** visible in the codebase
- **Deprecated columns** coexisting with new relations (backward compat debt)
- **File bloat** from Phase 6 strangler pattern (legacy code preserved in redirects)

### Enterprise-Readiness Score: **6.5 / 10**

---

## 2. Project Structure & Folder Layout

### 2.1 Monorepo Layout (Workspace Root)

```
RRF_2/
├── rrf-portal-backend/     # NestJS 10 API server (port 4000)
├── rrf-portal-nextjs/      # Next.js 14 frontend (port 3000)
├── Data/                   # 23 manual SQL migration scripts
├── scripts/                # Shell/utility scripts (deploy, dev, fix, verify)
├── docs/                   # Feature docs, fix logs, architecture specs
├── docker-compose.yml      # Production compose
├── docker-compose.dev.yml  # Dev compose
└── *.sql                   # Root-level one-off SQL patches
```

**Assessment:** ⚠️ MEDIUM-RISK  
- Root-level SQL files and the `Data/` folder represent ad-hoc schema management outside any migration framework.
- `scripts/` contains 5 subdirectories (data, deployment, dev, docker, fixes, testing, verification) — good operational tooling.

### 2.2 Backend Structure

```
rrf-portal-backend/src/
├── app.module.ts           # Root module (16 imports)
├── main.ts                 # Bootstrap (Helmet, CORS, ValidationPipe, Throttler)
├── data-source.ts          # TypeORM DataSource config
├── auth/                   # JWT + Local + MS SSO strategies
├── rrf/                    # Core domain: entities, DTOs, service, controller
│   ├── entities/           # rrf.entity.ts, rrf-approver.entity.ts, rrf-form-config.entity.ts
│   ├── dto/                # create-rrf.dto.ts, update-rrf.dto.ts, rrf-query.dto.ts
│   ├── rrf.service.ts      # ~1200 lines — workflow logic
│   ├── rrf.controller.ts   # ~350 lines — route definitions
│   └── rrf-form-config.service.ts
├── users/                  # User CRUD + entity
├── roles/                  # Role entity + service
├── permissions/            # Permission checking service
├── notifications/          # Event-driven in-app notifications
├── reports/                # KPI aggregation (revenue loss, avg delay)
├── subfunctions/           # Organizational hierarchy
├── functions/              # Top-level departments
├── user-subfunctions/      # Approver → Subfunction mapping
├── job-descriptions/       # Template JDs
├── guards/                 # PermissionGuard
├── decorators/             # @RequirePermission, @CurrentUser
├── common/                 # Interfaces (AuthUser), exception filters
├── interceptors/           # Response interceptors
└── migrations/             # Only 2 TypeORM migration files
```

**Assessment:** ✅ GOOD  
- Clear module-per-domain separation following NestJS conventions.
- Single-responsibility controllers with guard-level permission enforcement.
- `rrf.service.ts` at ~1200 lines is large but cohesive — all workflow state transitions live together.

### 2.3 Frontend Structure

```
rrf-portal-nextjs/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Unified dashboard (Phase 4)
│   ├── workflow/           # Unified workflow (Phases 2-3)
│   │   ├── page.jsx        # Master list with tabs
│   │   ├── [id]/page.jsx   # Detail view
│   │   ├── [id]/edit/      # Role-aware edit router
│   │   └── create/         # Create form
│   ├── hiring-manager/     # Legacy → redirect wrappers (Phase 6)
│   ├── approver/           # Legacy → redirect wrappers (Phase 6)
│   ├── pmo/                # Legacy → redirect wrappers (Phase 6)
│   ├── hr/                 # Legacy → redirect wrappers (Phase 6)
│   ├── admin/              # Admin panel (not migrated)
│   └── login/              # Auth page
├── components/             # Shared UI components
│   ├── shared/             # StatusBadge, PriorityBadge, RRFTable, SearchBar, etc.
│   └── ...                 # Role-specific components
├── contexts/               # AuthContext (JWT + permissions)
├── hooks/                  # usePermission
├── lib/                    # API layer, caching, smart fetch, route utilities
│   ├── api/rrfApi.js       # RRF API client (formatRrfForDisplay, sanitizeRrfPayload)
│   ├── apiCache.js         # TTL Map cache (30s/60s/5min)
│   ├── apiConfig.js        # Centralized fetch with JWT injection
│   ├── useSmartFetch.js    # SWR-style hook
│   ├── workflowRoutes.js   # Centralized route builders (Phase 6)
│   └── workflowViewConfig.js # VIEW_CONFIGS map for tabs
└── utils/                  # Permissions, action resolver, formatters
    ├── permissions.js       # PERMISSIONS constants + hasPermission()
    └── rrfActionResolver.js # Pure function: (rrf, user, perms) → action flags
```

**Assessment:** ✅ GOOD  
- Clear separation: `lib/` for infrastructure, `utils/` for pure logic, `hooks/` for React abstractions.
- Strangler pattern (Phase 6) keeps old routes functional via `redirect()` — zero breaking changes.

---

## 3. Backend Architecture

### 3.1 Module Graph

```
AppModule
├── AuthModule (JWT, Local, MS SSO)
├── RrfModule (Core domain)
├── UsersModule
├── RolesModule
├── PermissionsModule
├── NotificationsModule
├── ReportsModule
├── FunctionsModule
├── SubfunctionsModule
├── UserSubfunctionsModule
├── JobDescriptionsModule
├── ThrottlerModule (100 req/min global, 5/min login)
├── EventEmitterModule
├── ConfigModule (forRoot, isGlobal)
└── TypeOrmModule (async, poolSize: 10)
```

### 3.2 Request Pipeline

```
Request → Helmet → CORS → ThrottlerGuard → ValidationPipe → JwtAuthGuard → PermissionGuard → Controller → Service → TypeORM → PostgreSQL
```

**Assessment:** ✅ GOOD — Standard NestJS layered pipeline. Guard ordering is correct (auth before permission).

### 3.3 Service Layer Patterns

| Pattern | Implementation | Rating |
|---------|---------------|--------|
| Transactions | `DataSource.transaction()` for multi-entity writes | ✅ |
| ID Generation | PostgreSQL sequences via `nextval()` | ✅ |
| Event-Driven | `EventEmitter2.emit()` after successful writes | ✅ |
| Access Control | Service-level ownership + subfunction checks | ✅ |
| Query Optimization | `createQueryBuilder` with select-only columns | ✅ |
| JSONB Operations | Native `||` operator for append (no load-modify-save) | ✅ |
| Timeout Protection | `Promise.race` with 30s timeout on fillByBench | ⚠️ |

⚠️ **Timeout in controller**: The `fillByBench` endpoint wraps service call in `Promise.race` with 30s timeout — this is a workaround for a hanging bug. The root cause (likely a lock contention issue with `save()`) was fixed with direct UPDATE queries, but the timeout wrapper remains as defense-in-depth.

### 3.4 Entity Design

| Entity | Table | Columns | Indexes | Relations | Rating |
|--------|-------|---------|---------|-----------|--------|
| Rrf | `rrfs` | ~60 | 5 | createdBy, approvers, subFunction | ⚠️ Large |
| RrfApprover | `rrf_approvers` | 10 | 2 (unique + composite) | user, rrf | ✅ |
| RrfFormConfig | `rrf_form_configs` | 8 | 1 (unique fieldName) | — | ✅ |
| User | `users` | 12 | 1 (unique email) | role, userSubfunctions | ✅ |
| Role | `roles` | 6 | 1 (unique roleCode) | permissions | ✅ |
| Permission | `permissions` | 6 | 1 (composite moduleId+code) | module | ✅ |
| RolePermission | `role_permissions` | 4 | 1 (composite roleId+permId) | — | ✅ |
| Notification | `notifications` | 18 | 3 (userId, dedupeKey conditional) | — | ✅ |
| Function | `functions` | 4 | — | subfunctions | ✅ |
| Subfunction | `subfunctions` | 5 | — | function | ✅ |
| UserSubfunction | `user_subfunctions` | 4 | 1 (composite) | user, subfunction | ✅ |
| JobDescription | `job_descriptions` | 6 | — | — | ✅ |

⚠️ **Rrf entity** has ~60 columns — this is a God Object risk. Many columns are workflow-stage-specific (e.g., `declinedAt`, `declinedById`, `declinedByName`, `onHoldById`, `onHoldByName`, `approvedById`, `approvedByName`, `sentToHrAt`, `closedAt`, `closedById`). These denormalized audit columns avoid JOINs at query time but create maintenance burden.

---

## 4. Frontend Architecture

### 4.1 State Management

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  AuthContext │────▶│  usePermission│────▶│  rrfAction   │
│  (JWT+perms) │     │  (hook)      │     │  Resolver    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
┌──────────────┐     ┌──────────────┐            ▼
│  apiConfig   │────▶│ useSmartFetch│     ┌──────────────┐
│  (JWT inject)│     │ (SWR cache)  │     │  UI Controls │
└──────────────┘     └──────────────┘     │  (show/hide) │
        │                    │             └──────────────┘
        ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  apiCache    │     │  Components  │
│  (Map+TTL)   │     │  (Ant Design)│
└──────────────┘     └──────────────┘
```

**Assessment:** ✅ GOOD  
- No heavy state library (Redux/Zustand) — appropriate for this domain size.
- `useSmartFetch` provides SWR-like behavior without the 20KB bundle cost.
- `rrfActionResolver` is a **pure function** — fully testable without React.

### 4.2 Caching Strategy

| Key Pattern | TTL | Scope |
|-------------|-----|-------|
| List data (my-requests, all RRFs) | 30s | Per-tab |
| Statistics/aggregates | 60s | Per-tab |
| Form config (dropdowns) | 5min | Per-tab |
| In-flight deduplication | Duration of request | Per-tab |

**Cache Invalidation:** Manual `invalidateCache(key)` after mutations + `invalidateCachePattern(regex)` for bulk invalidation.

⚠️ **No cross-tab sync** — each browser tab maintains its own Map. If a user approves in Tab A, Tab B won't see the update until TTL expires or manual refresh. Acceptable for internal tool but worth documenting.

### 4.3 Routing Architecture (Post-Phase 6)

```
/workflow          → Unified list (tabs via VIEW_CONFIGS)
/workflow/create   → Create form
/workflow/[id]     → Detail view (permission-adaptive)
/workflow/[id]/edit → Role-aware edit router
/dashboard         → Permission-adaptive dashboard

/hiring-manager/*  → redirect() → /workflow or /dashboard
/approver/*        → redirect() → /workflow or /dashboard
/pmo/*             → redirect() → /workflow or /dashboard
/hr/*              → redirect() → /workflow or /dashboard
```

**Assessment:** ✅ GOOD — Clean convergence. Legacy routes preserved as thin redirects (zero user-facing breakage).

---

## 5. Database & TypeORM Layer

### 5.1 Configuration

| Setting | Value | Assessment |
|---------|-------|------------|
| `synchronize` | `false` | ✅ Production-safe |
| `migrations` | `src/migrations/` | ⚠️ Only 2 files |
| Pool size | 10 | ✅ Appropriate for single-instance |
| Entities | Glob pattern | ✅ Auto-discovery |

### 5.2 🚨 CRITICAL: Migration Strategy Gap

**TypeORM migrations (2 files):**
1. `1746028800000-CreateNotificationsTable.ts` — Creates `notifications` table (full DDL)
2. `1776781548847-InitialSchema.ts` — Adds default value to `rrfs.status_history`

**Manual SQL files (23+ in `Data/` folder):**
These perform ALTER TABLE, CREATE TABLE, INSERT operations **outside TypeORM's migration tracking**:

| SQL File | Operation | Affected Table |
|----------|-----------|----------------|
| add-status-history-column.sql | ADD COLUMN | rrfs |
| add-business-unit-column.sql | ADD COLUMN | rrfs |
| add-close-reason-column.sql | ADD COLUMN | rrfs |
| add-internal-rrf-no-column.sql | ADD COLUMN + UNIQUE | rrfs |
| add-audit-name-columns.sql | ADD 3 COLUMNS | rrfs |
| add-approved-by-name-column.sql | ADD COLUMN | rrfs |
| add-form-config-columns.sql | ADD 2 COLUMNS | rrf_form_configs |
| add-functions-table.sql | CREATE TABLE | functions |
| add-job-descriptions-table.sql | CREATE TABLE | job_descriptions |
| add-workflow-permissions.sql | INSERT | permissions, role_permissions |
| add-new-permissions.sql | INSERT | modules, permissions, role_permissions |
| add-missing-rrf-permissions.sql | INSERT | role_permissions |
| setup-roles-permissions.sql | INSERT | modules, permissions, role_permissions |
| migrate-closed-by-bench.sql | UPDATE | rrfs |
| seed.sql | INSERT | rrf_form_configs |

**Risk:** 🚨 CRITICAL
- No migration version tracking for manual SQL → impossible to know which patches have been applied to a given environment
- New developer onboarding requires running SQL files in unknown order
- CI/CD cannot reliably replicate production schema
- TypeORM's `migration:generate` will produce massive diffs because it doesn't know about manual changes

### 5.3 Entity-Schema Sync Analysis

| Column (in Entity) | Added Via | Migration Tracked? | Risk |
|--------------------|-----------|--------------------|------|
| statusHistory | Manual SQL + TypeORM migration (default only) | Partial | ⚠️ |
| businessUnit | Manual SQL | ❌ | 🔴 |
| closeReason | Manual SQL | ❌ | 🔴 |
| internalRrfNo | Manual SQL | ❌ | 🔴 |
| approvedByName | Manual SQL | ❌ | 🔴 |
| declinedByName | Manual SQL | ❌ | 🔴 |
| onHoldById | Manual SQL | ❌ | 🔴 |
| onHoldByName | Manual SQL | ❌ | 🔴 |
| notifications table | TypeORM migration | ✅ | ✅ |

### 5.4 Sequence Management

| Sequence | Format | Usage | Safety |
|----------|--------|-------|--------|
| rrfs_sub_id_seq | REQ-XXX | On create | ✅ nextval() atomic |
| rrfs_rrf_number_seq | RRF-XXX | On openForHiring/PMO submit | ✅ nextval() atomic |
| rrfs_internal_rrf_no_seq | RRF-INT-XXX | On fillByBench/close | ✅ nextval() atomic |

Bootstrap: `onModuleInit()` creates sequences if absent and syncs to MAX existing values. ✅ Idempotent.

---

## 6. RBAC & Permission System

### 6.1 Architecture

```
User ─── N:1 ──→ Role ─── N:M ──→ Permission ─── N:1 ──→ Module
                              (via role_permissions)
```

**Permission Format:** `MODULE.ACTION` (e.g., `RRF.CREATE`, `APPROVALS.APPROVE`, `REPORTS.EXPORT`)

### 6.2 Guard Implementation

```typescript
// Permission resolution path:
Request.user.id → PermissionsService.checkUserPermission(userId, code)
  → SELECT FROM users
    JOIN roles ON users.role_id = roles.id
    JOIN role_permissions ON roles.id = role_permissions.role_id
    JOIN permissions ON role_permissions.permission_id = permissions.id
    JOIN modules ON permissions.module_id = modules.id
    WHERE users.id = ? AND permissions.permission_code = ?
      AND users.is_active = true AND roles.is_active = true
```

**Assessment:** ✅ GOOD
- 5-table join ensures all flags (user active, role active) are checked
- Permission code includes module prefix → no collisions
- Guard is applied at controller class level with per-method overrides

### 6.3 Role Matrix

| Role | Key Permissions | Visibility Scope |
|------|----------------|------------------|
| HIRING_MANAGER | RRF.CREATE, RRF.READ, RRF.UPDATE | Own submissions only |
| APPROVER | APPROVALS.APPROVE/REJECT/ON_HOLD, RRF.READ/UPDATE | Assigned subfunctions |
| PMO | RRF.*, OPEN_FOR_HIRING, FILL_FROM_BENCH, CLOSE | All RRFs |
| HR | RRF.READ, RRF.CLOSE | In-Progress/Open-for-Hiring |
| ADMIN | All permissions | All data |

### 6.4 Frontend Permission Enforcement

```
AuthContext (stores permissions[]) 
  → usePermission() hook (convenience flags: canApprove, canCreateRRF, etc.)
  → rrfActionResolver() (per-RRF action eligibility based on status + role + ownership)
  → Component-level conditional rendering
```

**Assessment:** ✅ GOOD — Defense-in-depth: backend guards + frontend hide-by-permission.

### 6.5 Subfunction-Based Access Control

Approvers are mapped to subfunctions via `user_subfunctions` table. When an Approver queries RRFs:
1. `findAll()` adds `WHERE rrf.subFunctionId IN (:approverSubIds)`
2. `findOne()` throws `ForbiddenException` if RRF's subfunction isn't in user's assignments
3. `getStatistics()` filters by subfunction for APPROVER role

**Assessment:** ✅ GOOD — Row-level security implemented at service layer.

---

## 7. Workflow Engine

### 7.1 State Machine

```
                          ┌──────────────────────────────────────┐
                          │              PMO Direct               │
                          │     (skip approval, generate RRF#)   │
                          ▼                                      │
DRAFT ──submit──▶ PENDING ──approve──▶ APPROVED ──openForHiring──▶ IN_PROGRESS ──close──▶ CLOSED
  │                  │                     │                          │
  │                  ├──decline──▶ DECLINED │                          ├──fillByBench──▶ CLOSED
  │                  │                     │                          │
  │                  ├──reject───▶ REJECTED                           │
  │                  │                                                │
  │                  └──onHold───▶ ON_HOLD                            │
  │                                   │                               │
  │                                   └──(resubmit)──▶ PENDING        │
  │                                                                   │
  └──(resubmit from DECLINED/REJECTED)──▶ PENDING                    │
```

### 7.2 Transition Guards

| Transition | Who Can | Required Status | Permission |
|-----------|---------|-----------------|------------|
| submit | Creator (HM) | DRAFT, DECLINED, REJECTED | RRF.UPDATE |
| approve | Assigned Approver / Admin | PENDING | APPROVALS.APPROVE |
| reject | Assigned Approver / Admin | PENDING | APPROVALS.REJECT |
| decline | Assigned Approver / Admin | PENDING | APPROVALS.APPROVE |
| on-hold | Assigned Approver / Admin | PENDING | APPROVALS.ON_HOLD |
| open-for-hiring | PMO / Admin | APPROVED | RRF.OPEN_FOR_HIRING |
| fill-by-bench | PMO / Admin | APPROVED, IN_PROGRESS, OPEN_FOR_HIRING | RRF.FILL_FROM_BENCH |
| close | PMO / HR / Admin | APPROVED, IN_PROGRESS, OPEN_FOR_HIRING | RRF.CLOSE |

### 7.3 Approval Logic

- On approve: Other pending approvers are marked `SKIPPED` (first-wins model)
- On resubmit: All approver records reset to `PENDING` (restart chain)
- Approver assignment: Based on subfunction match; falls back to ADMIN if none found

**Assessment:** ✅ GOOD — Transactions ensure atomicity. Event emission is always AFTER commit.

---

## 8. API Design & Contract

### 8.1 Route Summary

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /rrf | RRF.CREATE | Create RRF |
| GET | /rrf | RRF.READ | List all (paginated, filtered) |
| GET | /rrf/my-requests | RRF.READ | Creator's submissions |
| GET | /rrf/statistics | RRF.READ | Status counts |
| GET | /rrf/pending-approvals | APPROVALS.APPROVE | Approver queue |
| GET | /rrf/pmo/open-positions | RRF.READ | PMO view |
| GET | /rrf/pmo/dashboard-stats | RRF.READ | PMO KPIs |
| GET | /rrf/hr/open-for-hiring | RRF.READ | HR view |
| GET | /rrf/form-config | RRF.READ | Dynamic form config |
| POST | /rrf/form-config | RRF.UPDATE | Create config |
| PUT | /rrf/form-config/:fieldName | RRF.UPDATE | Update config |
| DELETE | /rrf/form-config/:fieldName | RRF.DELETE | Delete config |
| GET | /rrf/suggested-interviewers | RRF.READ | Tech-match users |
| GET | /rrf/:id | RRF.READ | Single RRF detail |
| PATCH | /rrf/:id | RRF.UPDATE | Update RRF |
| DELETE | /rrf/:id | RRF.DELETE | Delete (DRAFT/REJECTED only) |
| POST | /rrf/:id/submit | RRF.UPDATE | Submit for approval |
| POST | /rrf/:id/approve | APPROVALS.APPROVE | Approve |
| POST | /rrf/:id/reject | APPROVALS.REJECT | Reject |
| POST | /rrf/:id/decline | APPROVALS.APPROVE | Decline |
| POST | /rrf/:id/on-hold | APPROVALS.ON_HOLD | Put on hold |
| POST | /rrf/:id/open-for-hiring | RRF.OPEN_FOR_HIRING | Send to HR |
| POST | /rrf/:id/fill-by-bench | RRF.FILL_FROM_BENCH | Fill internally |
| POST | /rrf/:id/close | RRF.CLOSE | Close RRF |
| POST | /rrf/:id/assign-approvers | RRF.UPDATE | Manual approver assignment |

### 8.2 Response Format

```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**Assessment:** ✅ GOOD — Consistent envelope. All workflow actions return the updated entity.

### 8.3 ⚠️ Design Observations

1. **Mixed HTTP semantics**: `PUT /rrf/form-config/:fieldName` alongside `PATCH /rrf/:id` — inconsistent use of PUT vs PATCH.
2. **Static routes before dynamic**: Dashboard GETs (`/rrf/pending-approvals`, `/rrf/pmo/*`) are correctly placed before `/:id` — ✅
3. **No API versioning** (e.g., `/api/v1/rrf`) — acceptable for internal tool but limits future evolution.

---

## 9. Security Analysis

### 9.1 Transport & Headers

| Control | Status | Details |
|---------|--------|---------|
| Helmet | ✅ Enabled | Default security headers |
| CORS | ✅ Configured | `ALLOWED_ORIGINS` from env |
| HTTPS | ⚠️ Not enforced in code | Depends on deployment (reverse proxy) |

### 9.2 Authentication

| Control | Status | Details |
|---------|--------|---------|
| JWT | ✅ | 24h TTL, stored in localStorage |
| Password hashing | ✅ | bcrypt (via Passport LocalStrategy) |
| Rate limiting | ✅ | 5/min on login, 100/min global |
| MS SSO | ✅ | Optional Microsoft authentication |
| 401 on expired token | ✅ | Frontend `apiConfig.js` redirects to /login |

⚠️ **localStorage JWT** — XSS vulnerability vector. HttpOnly cookies would be more secure, but acceptable for internal corporate tool with CSP headers.

### 9.3 Authorization

| Control | Status | Details |
|---------|--------|---------|
| Permission Guard | ✅ | 5-table join per request |
| Row-level security | ✅ | Subfunction-based for Approvers, ownership for HM |
| Input validation | ✅ | GlobalValidationPipe (whitelist: true, transform: true) |
| SQL injection | ✅ Protected | TypeORM parameterized queries throughout |

🔴 **HIGH-RISK**: `openForHiring` and `fillByBench` use `JSON.stringify(statusHistoryEntry)` interpolated into a raw SQL template literal:
```typescript
statusHistory: () => `COALESCE(status_history, '[]'::jsonb) || '${JSON.stringify(entry)}'::jsonb`
```
If `statusHistoryEntry` contains user-controlled data (e.g., `reason` field), this is a **SQL injection vector**. The `reason` comes from controller parameters which pass through ValidationPipe, but the `buildStatusHistoryEntry` in `fillByBench` builds the reason from internal values only — **currently safe but fragile**.

**Recommendation:** Use TypeORM's `jsonb_build_object` or parameterized jsonb operations instead of string interpolation.

### 9.4 Data Protection

| Control | Status |
|---------|--------|
| Sensitive field exclusion | ✅ `@Exclude()` on passwordHash |
| Select-only queries | ✅ Partial selects on user.fullName, email |
| Deletion guard | ✅ Only DRAFT/REJECTED can be deleted |
| Soft delete on notifications | ✅ ARCHIVED status instead of DELETE |

---

## 10. Performance & Scalability

### 10.1 Database Performance

| Optimization | Implementation | Rating |
|--------------|---------------|--------|
| Connection pooling | 10 connections | ✅ |
| Indexes on Rrf | status, createdById, subFunctionId, rrfNumber, subId | ✅ |
| Pagination | LIMIT/OFFSET via QueryBuilder | ✅ |
| Count queries | Single GROUP BY for statistics (not N+1) | ✅ |
| JSONB append | Native `||` operator (no read-modify-write) | ✅ |
| Selective relations | `includeRelations` flag on findOne | ✅ |
| Lazy approver load | Only when status ≠ DRAFT | ✅ |

### 10.2 Frontend Performance

| Optimization | Implementation | Rating |
|--------------|---------------|--------|
| Cache-first rendering | `useSmartFetch` seeds state from cache | ✅ |
| Request deduplication | `_inflight` Map prevents duplicate fetches | ✅ |
| Stale-while-revalidate | Shows cached data while refetching | ✅ |
| Bundle size | No Redux/Zustand (zero-cost state) | ✅ |
| Tree-shaking | Ant Design 5.x (ESM) | ✅ |

### 10.3 Scalability Concerns

| Concern | Current State | Risk Level |
|---------|---------------|------------|
| Single instance | No horizontal scaling config | ⚠️ |
| In-memory cache (frontend) | Per-tab, no shared worker | ⚠️ |
| EventEmitter (in-process) | Won't work across instances | 🔴 |
| Pool size 10 | Insufficient for >50 concurrent users | ⚠️ |
| No Redis | No distributed cache or session store | ⚠️ |

🔴 **EventEmitter2 is in-process only.** If the backend scales to multiple instances, notification events will be lost. Migrate to a message broker (RabbitMQ, Redis Pub/Sub) before horizontal scaling.

---

## 11. Technical Debt Inventory

### 11.1 🚨 CRITICAL

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | 23 manual SQL migrations outside TypeORM tracking | Cannot reproduce schema reliably | HIGH |
| 2 | `statusHistory` typed as `any` in entity | No type safety for JSONB operations | LOW |
| 3 | JSON.stringify in raw SQL (openForHiring, fillByBench) | Fragile; potential injection if inputs change | MEDIUM |

### 11.2 🔴 HIGH-RISK

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 4 | No automated test suite | Regressions undetectable | HIGH |
| 5 | EventEmitter not distributed | Blocks horizontal scaling | MEDIUM |
| 6 | Denormalized name columns (5+) | Stale if user renames | LOW |
| 7 | `putOnHold` reuses `declineReason`/`declinedAt`/`declinedById` | Semantic confusion, bug-prone | MEDIUM |

### 11.3 ⚠️ MEDIUM-RISK

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 8 | Rrf entity has ~60 columns (God Object) | Maintenance burden | HIGH |
| 9 | Phase 6 redirects preserve full legacy code in comments | File bloat (~24 files with dead code) | LOW |
| 10 | Deprecated `subfunction.function` string column | Confusion for new developers | LOW |
| 11 | `getMySubmissions` loads ALL relations (approvers, user) | N+1 risk at scale | LOW |
| 12 | No API versioning | Breaking changes affect all clients | LOW |
| 13 | localStorage JWT | XSS exposure (acceptable for internal) | MEDIUM |

### 11.4 Low Priority

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 14 | `getApprovedRrfs()` has no pagination | Memory spike with many records | LOW |
| 15 | Notification `isDuplicate` checks by `dedupeKey` existence only (no TTL window) | Permanent dedup after first send | LOW |
| 16 | No health check endpoint | Load balancer cannot probe readiness | LOW |
| 17 | Single-file `rrf.service.ts` at ~1200 lines | Cognitive load | MEDIUM |

---

## 12. Scoring & Maturity Assessment

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Backend Architecture** | 8/10 | Clean NestJS modules, proper guards, transactional workflow |
| **Frontend Architecture** | 7.5/10 | Smart caching, pure action resolver, clean strangler migration |
| **Database Design** | 6/10 | Good indexing but God Object entity and manual migration mess |
| **RBAC Maturity** | 8.5/10 | 5-table permission check, subfunction ABAC, frontend defense-in-depth |
| **Workflow Engine** | 8/10 | Correct state machine, atomic transitions, event-driven notifications |
| **Security** | 7/10 | Good fundamentals (Helmet, CORS, rate limit, validation), but raw SQL risk |
| **Scalability** | 5/10 | Single-instance only, in-process events, no distributed cache |
| **Maintainability** | 6/10 | No tests, schema drift, large service files |
| **DevOps & Operations** | 6/10 | Docker support exists, but no CI/CD pipeline visible, no health checks |
| **Documentation** | 7/10 | Extensive `docs/` folder, but no inline API docs (Swagger) |

### **Overall Enterprise-Readiness: 6.5 / 10**

The system is **production-functional** for a small team (5-20 users) but requires significant hardening for enterprise deployment (>50 users, HA requirements, audit compliance).

---

## 13. Prioritized Recommendations

### 🔴 Immediate (Sprint 1-2)

1. **Consolidate SQL migrations into TypeORM**
   - Create a single "baseline" migration that captures current schema
   - Run `migration:generate` to detect any drift
   - Move all `Data/*.sql` operations into proper TypeORM migrations
   - Add migration CI check (fail build if pending migrations exist)

2. **Fix raw SQL interpolation in `openForHiring` and `fillByBench`**
   - Replace `'${JSON.stringify(entry)}'::jsonb` with parameterized approach
   - Use TypeORM's `() => `:param`` binding or a dedicated JSONB append function

3. **Add health check endpoint**
   - `GET /health` → checks DB connectivity + app readiness
   - Required for any load balancer or container orchestration

### ⚠️ Short-term (Sprint 3-6)

4. **Add test suite**
   - Unit tests for `rrfActionResolver.js` (pure function, highest ROI)
   - Integration tests for workflow transitions (submit → approve → open → close)
   - E2E test for permission guard (unauthorized access returns 403)

5. **Type `statusHistory`**
   - Define `interface StatusHistoryEntry { status: string; changedById: number; changedAt: string; reason?: string }`
   - Replace `statusHistory: any` with `statusHistory: StatusHistoryEntry[]`

6. **Extract workflow methods from `rrf.service.ts`**
   - Create `RrfWorkflowService` for transition methods (submit, approve, decline, hold, open, close)
   - Keep CRUD in `RrfService`
   - Reduces file from ~1200 to ~600 lines each

7. **Resolve `putOnHold` semantic hack**
   - Add proper `onHoldAt`, `onHoldReason` columns
   - Stop reusing `declineReason`/`declinedAt`/`declinedById`

### 📋 Long-term (Quarter 2-3)

8. **Prepare for horizontal scaling**
   - Replace `EventEmitter2` with Redis Pub/Sub or RabbitMQ
   - Add Redis for session/cache sharing across instances
   - Increase pool size or use PgBouncer

9. **Add Swagger/OpenAPI documentation**
   - Use `@nestjs/swagger` decorators on DTOs and controllers
   - Auto-generate API docs at `/api/docs`

10. **Refactor Rrf entity (optional)**
    - Extract workflow audit trail into `rrf_audit_log` table
    - Move closure-related fields into `rrf_closures` table
    - Reduces main entity from ~60 to ~35 columns

### 🔮 Future Roadmap

11. **Replace localStorage JWT with HttpOnly cookies** (if security audit requires)
12. **Add WebSocket notifications** (replace polling)
13. **Implement multi-level approval chains** (currently first-approver-wins)
14. **Add workflow configuration engine** (admin-definable state machines)
15. **Phase 7: Remove legacy redirect wrappers** (delete 24 redirect files after monitoring confirms zero direct-URL usage)

---

## Appendix A: File Metrics

| Area | Files | Total Lines (est.) |
|------|-------|--------------------|
| Backend src/ | ~50 | ~6,000 |
| Frontend app/ | ~60 | ~8,000 |
| Frontend lib/ | ~8 | ~600 |
| Frontend components/ | ~30 | ~4,000 |
| Manual SQL (Data/) | 23 | ~1,200 |
| Documentation (docs/) | ~30 | ~5,000 |
| **Total** | **~200** | **~25,000** |

## Appendix B: Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 14.2.0 |
| UI Library | React | 18.3 |
| Component Library | Ant Design | 5.12 |
| CSS | Tailwind CSS | 3.x |
| Backend Framework | NestJS | 10 |
| ORM | TypeORM | 0.3.x |
| Database | PostgreSQL | 15 |
| Auth | JWT + Passport | — |
| Container | Docker + Compose | — |
| Runtime | Node.js | 18+ |

---

*End of Architecture Audit*
