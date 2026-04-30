# Notification System — Master Architecture Plan

**Date:** 2026-04-30
**Status:** Planning Only — No Code Changes
**Scope:** RRF Portal (NestJS + Next.js + PostgreSQL)
**Author:** Architecture Analysis (read-only codebase audit)

---

## Executive Summary

The RRF Portal currently has **zero notification infrastructure**. There is no notification table, no event emitter, no WebSocket gateway, no email sender, no bell icon, and no real-time push of any kind. User awareness of workflow state changes depends entirely on manual dashboard polling and page refreshes.

This document maps every notifiable event in the existing codebase, designs a complete enterprise notification engine, and provides a phased rollout plan — all derived from actual source code analysis, not assumptions.

### Key Findings

| Area | Status |
|---|---|
| Notification entity/table | **Does not exist** |
| EventEmitter / event bus | **Not used** — no `@nestjs/event-emitter` in dependencies |
| WebSocket / Gateway | **Not installed** — `@nestjs/websockets` exists only in `package-lock.json` as a transitive dependency, NOT in `package.json` |
| Email / mailer | **Not installed** — no nodemailer, sendgrid, or `@nestjs-modules/mailer` |
| BullMQ / Redis queue | **Not installed** — no `@nestjs/bull`, `bullmq`, or `redis` in dependencies |
| Bell icon / notification UI | **Does not exist** — `Header.jsx` has logout button only |
| Toast system | **Exists** — `react-hot-toast` used throughout for ephemeral success/error messages |
| Audit trail | **Partial** — `statusHistory` JSONB column on `rrfs` table tracks status transitions with `changedById` and timestamps |

### Current Dependencies (relevant)

**Backend** (`rrf-portal-backend/package.json`):
- `@nestjs/common` ^10, `@nestjs/core` ^10, `@nestjs/jwt` ^10
- `@nestjs/passport` ^10, `passport-jwt`, `passport-local`
- `@nestjs/typeorm` ^10, `typeorm` ^0.3, `pg` ^8
- `@nestjs/throttler` ^5, `helmet` ^7, `bcrypt` ^5
- No event emitter. No WebSocket. No mailer. No queue.

**Frontend** (`rrf-portal-nextjs/package.json`):
- `next` (App Router), `react` 18, Ant Design 5
- `react-hot-toast` for ephemeral toasts
- No WebSocket client. No notification provider.

---

## 1. Current System Analysis

### 1.1 Database Entities (verified from source)

| Entity | Table | File | Key Fields |
|---|---|---|---|
| User | `users` | `users/user.entity.ts` | `id`, `userId`, `email`, `fullName`, `department`, `phone`, `isActive`, `role` (FK→roles), `technologies` (JSONB), `lastLogin` |
| Role | `roles` | `roles/role.entity.ts` | `id`, `roleName`, `roleCode`, `description`, `priority`, `isActive` |
| Permission | `permissions` | `permissions/permission.entity.ts` | Standard permission entity |
| RolePermission | `role_permissions` | `role-permissions/role-permission.entity.ts` | Role↔Permission join |
| Rrf | `rrfs` | `rrf/entities/rrf.entity.ts` | 50+ columns including full workflow state — see §1.2 |
| RrfApprover | `rrf_approvers` | `rrf/entities/rrf-approver.entity.ts` | `rrfId`, `userId`, `approvalLevel` (L1/L2/L3/FINAL), `approvalStatus`, `approvalOrder`, `comments`, `isMandatory` |
| Subfunction | `subfunctions` | `subfunctions/subfunction.entity.ts` | Used for approver routing |
| UserSubfunction | `user_subfunctions` | `user-subfunctions/user-subfunction.entity.ts` | Maps approvers → subfunctions |
| Function | `functions` | `functions/function.entity.ts` | Parent of subfunctions |
| JobDescription | `job_descriptions` | `job-descriptions/job-description.entity.ts` | Template library |
| RrfFormConfig | `rrf_form_configs` | `rrf/entities/rrf-form-config.entity.ts` | Dynamic form field configuration |
| Module | `modules` | `modules/module.entity.ts` | Permission module grouping |

### 1.2 RRF Workflow States (from `RrfStatus` enum)

```
DRAFT → PENDING → APPROVED → IN_PROGRESS → CLOSED
                ↘ DECLINED (resubmit → PENDING)
                ↘ REJECTED (alias)
                ↘ ON_HOLD (resume → PENDING)
         APPROVED → CLOSED_BY_BENCH (PMO fills from bench)
         APPROVED → IN_PROGRESS (PMO opens for hiring, generates RRF number)
```

### 1.3 Role Codes (from `roles` seed and controller checks)

| Code | Dashboard | Key Actions |
|---|---|---|
| `ADMIN` | `/admin` | User CRUD, role/permission management |
| `HIRING_MANAGER` | `/hiring-manager/dashboard` | Create RRF, submit, edit drafts, resubmit |
| `APPROVER` | `/approver` | Approve, reject, decline, put on hold |
| `PMO` | `/pmo` | Open for hiring, fill from bench, close, create RRF |
| `HR` | `/hr` | View open-for-hiring, close RRF (hire/source/cancel) |

### 1.4 Backend Modules (from `app.module.ts`)

```
AuthModule, UsersModule, RolesModule, ModulesModule, PermissionsModule,
RolePermissionsModule, FunctionsModule, SubfunctionsModule,
UserSubfunctionsModule, JobDescriptionsModule, SeedModule, RrfModule, ReportsModule
```

No `NotificationsModule` exists.

---

## 2. Notification Trigger Map

Every trigger below was identified by reading actual service methods, controller endpoints, and status transition code.

### 2.1 RRF Lifecycle Events

| # | Event Name | Trigger Point (file:method) | Who Receives | Priority | Action URL | Channel |
|---|---|---|---|---|---|---|
| 1 | `RRF_CREATED` | `rrf.service.ts:create()` | Creator (confirmation) | LOW | `/hiring-manager/view-rrf/{id}` | IN_APP |
| 2 | `RRF_SUBMITTED` | `rrf.service.ts:submit()` — status → PENDING | Assigned approver(s) via subfunction routing | HIGH | `/approver/review/{id}` | IN_APP, EMAIL |
| 3 | `RRF_RESUBMITTED` | `rrf.service.ts:submit()` — isResubmission=true | Assigned approver(s) | HIGH | `/approver/review/{id}` | IN_APP, EMAIL |
| 4 | `RRF_APPROVED` | `rrf.service.ts:approve()` — status → APPROVED | Creator (HM), PMO role | HIGH | `/pmo/view-rrf/{id}` | IN_APP, EMAIL |
| 5 | `RRF_REJECTED` | `rrf.service.ts:reject()` — status → REJECTED | Creator (HM) | HIGH | `/hiring-manager/view-rrf/{id}` | IN_APP, EMAIL |
| 6 | `RRF_DECLINED` | `rrf.service.ts:decline()` — status → DECLINED | Creator (HM) | HIGH | `/hiring-manager/view-rrf/{id}` | IN_APP, EMAIL |
| 7 | `RRF_ON_HOLD` | `rrf.service.ts:putOnHold()` — status → ON_HOLD | Creator (HM), PMO | MEDIUM | `/hiring-manager/view-rrf/{id}` | IN_APP, EMAIL |
| 8 | `RRF_OPENED_FOR_HIRING` | `rrf.service.ts:openForHiring()` — status → IN_PROGRESS, RRF# generated | Creator (HM), HR role, Approver(s) | HIGH | `/hr/view-rrf/{id}` | IN_APP, EMAIL |
| 9 | `RRF_FILLED_BY_BENCH` | `rrf.service.ts:fillByBench()` — status → CLOSED, internalRrfNo generated | Creator (HM), Approver(s) | MEDIUM | `/pmo/view-rrf/{id}` | IN_APP |
| 10 | `RRF_CLOSED` | `rrf.service.ts:closeRrf()` — status → CLOSED | Creator (HM), PMO, Approver(s) | MEDIUM | `/pmo/view-rrf/{id}` | IN_APP, EMAIL |
| 11 | `RRF_UPDATED` | `rrf.service.ts:update()` | Approver(s) if status=PENDING; Creator if edited by Approver | LOW | `/approver/review/{id}` or `/hiring-manager/view-rrf/{id}` | IN_APP |
| 12 | `RRF_DELETED` | `rrf.service.ts:remove()` | Creator (confirmation) | LOW | — | IN_APP |

### 2.2 User Management Events

| # | Event Name | Trigger Point (file:method) | Who Receives | Priority | Action URL | Channel |
|---|---|---|---|---|---|---|
| 13 | `USER_CREATED` | `users.service.ts:createUser()` | The new user, Admin(s) | MEDIUM | `/admin/users` | IN_APP, EMAIL |
| 14 | `USER_UPDATED` | `users.service.ts:updateUser()` | The updated user | LOW | — | IN_APP |
| 15 | `USER_ROLE_CHANGED` | `users.service.ts:updateUser()` — role changed | The updated user, Admin(s) | MEDIUM | — | IN_APP, EMAIL |
| 16 | `USER_ACTIVATED` | `users.service.ts:updateUser()` — isActive → true | The user | MEDIUM | — | IN_APP, EMAIL |
| 17 | `USER_DEACTIVATED` | `users.service.ts:updateUser()` — isActive → false | Admin(s) | MEDIUM | — | IN_APP |
| 18 | `USER_SUBFUNCTIONS_CHANGED` | `users.service.ts:assignSubfunctions()` | The approver user | MEDIUM | — | IN_APP |

### 2.3 Auth Events

| # | Event Name | Trigger Point (file:method) | Who Receives | Priority | Action URL | Channel |
|---|---|---|---|---|---|---|
| 19 | `LOGIN_SUCCESS` | `auth.service.ts:login()` | Audit log only (not user-facing) | LOW | — | AUDIT |
| 20 | `LOGIN_FAILED` | `local.strategy.ts:validate()` — returns null | Audit log, Admin if threshold exceeded | MEDIUM | — | AUDIT |
| 21 | `RATE_LIMIT_TRIGGERED` | `@Throttle` on `/auth/login` — 5/min | Admin(s) | HIGH | — | IN_APP, EMAIL |

### 2.4 System / Scheduled Events (NOT in codebase yet — future)

| # | Event Name | Trigger Mechanism | Who Receives | Priority | Channel |
|---|---|---|---|---|---|
| 22 | `APPROVAL_OVERDUE` | Scheduled job — PENDING > X days | Approver(s), Admin | HIGH | IN_APP, EMAIL, TEAMS |
| 23 | `HIRING_DEADLINE_APPROACHING` | Scheduled — expectedOnboardingDate within Y days | PMO, HR | HIGH | IN_APP, EMAIL |
| 24 | `SYSTEM_ANNOUNCEMENT` | Admin manual trigger | All active users | MEDIUM | IN_APP |
| 25 | `WEEKLY_DIGEST` | Scheduled — every Monday | Role-specific summary | LOW | EMAIL |

---

## 3. Notification Database Design

### 3.1 Justification for DB Table

A persistent notification table is **required** because:

1. **Bell icon state** — Users need to see unread notifications across sessions/devices
2. **Audit compliance** — Notification delivery must be provable
3. **Retry logic** — Failed email/Teams deliveries need requeue
4. **Offline access** — Users who weren't online when event fired still need the notification
5. **Notification history** — "View all notifications" requires persistent storage
6. **Read tracking** — `is_read` and `read_at` per user per notification

### 3.2 Proposed Schema: `notifications` Table

```sql
CREATE TABLE notifications (
  id              SERIAL PRIMARY KEY,
  
  -- Recipient
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  title           VARCHAR(255)    NOT NULL,    -- Short heading: "RRF Approved"
  message         TEXT            NOT NULL,    -- Full message body
  
  -- Classification
  type            VARCHAR(50)     NOT NULL,    -- Enum: RRF_APPROVED, USER_CREATED, etc.
  priority        VARCHAR(10)     NOT NULL DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH, CRITICAL
  
  -- Entity reference (polymorphic link)
  entity_type     VARCHAR(30)     NULL,        -- RRF, USER, INTERVIEW, SYSTEM, etc.
  entity_id       INTEGER         NULL,        -- FK to referenced record
  
  -- Navigation
  action_url      VARCHAR(500)    NULL,        -- Frontend route to navigate to on click
  
  -- Delivery
  channel         VARCHAR(20)     NOT NULL DEFAULT 'IN_APP',  -- IN_APP, EMAIL, TEAMS
  status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING',  -- PENDING, SENT, FAILED, READ, ARCHIVED
  
  -- Read tracking
  is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMP       NULL,
  
  -- Metadata
  metadata        JSONB           NULL DEFAULT '{}'::jsonb,  -- Flexible payload for templates
  
  -- Provenance
  created_by      INTEGER         NULL REFERENCES users(id),  -- Actor who triggered the event
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMP       NULL         -- Auto-archive/cleanup threshold
);

-- Performance indexes
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications (type);
CREATE INDEX idx_notifications_entity ON notifications (entity_type, entity_id);
CREATE INDEX idx_notifications_status ON notifications (status) WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_notifications_expires ON notifications (expires_at) WHERE expires_at IS NOT NULL;
```

### 3.3 Field Analysis

| Field | Required | Why |
|---|---|---|
| `id` | Yes | PK |
| `user_id` | Yes | One notification per recipient per event (fan-out model) |
| `title` | Yes | Bell dropdown headline |
| `message` | Yes | Expanded view, email body |
| `type` | Yes | Enum filter, icon mapping, template selection |
| `priority` | Yes | Sort urgency, toast behavior, sound toggle |
| `entity_type` | Optional | Polymorphic link for "View" action context |
| `entity_id` | Optional | Enables "navigate to the entity" |
| `action_url` | Optional | Pre-computed frontend route (avoids frontend reconstruction logic) |
| `channel` | Yes | Determines delivery method |
| `status` | Yes | Delivery lifecycle tracking |
| `is_read` | Yes | Unread count badge, bold/unbold in list |
| `read_at` | Optional | Analytics: how fast users respond |
| `metadata` | Optional | Template variables, original actor name, etc. |
| `created_by` | Optional | The user who triggered the action |
| `created_at` | Yes | Sort order, TTL |
| `updated_at` | Yes | Status change tracking |
| `expires_at` | Optional | Cleanup/archive cron |

### 3.4 Indexes Rationale

- `idx_notifications_user_unread` — Partial index, powers bell icon unread count (`WHERE is_read = FALSE`)
- `idx_notifications_user_created` — Powers "my notifications" list sorted by newest
- `idx_notifications_status` — Partial index for retry queue (`PENDING` + `FAILED`)
- `idx_notifications_entity` — Powers "all notifications for this RRF" lookups
- `idx_notifications_expires` — Cleanup cron efficiency

### 3.5 Data Volume & Cleanup Strategy

**Estimated volume:** ~20 notifications/RRF × fan-out to ~3 recipients = ~60 rows per RRF lifecycle.
At 100 RRFs/month → 6,000 rows/month → 72,000 rows/year.

**Cleanup strategy:**
- `expires_at` set to 90 days after `created_at` for LOW priority
- `expires_at` set to 365 days for HIGH/CRITICAL
- Nightly cron: archive expired to `notifications_archive` table (same schema, partitioned by month)
- No partitioning needed at this scale; revisit at 500K+ rows

---

## 4. Notification Enums

### 4.1 NotificationType

```typescript
export enum NotificationType {
  // RRF Lifecycle
  RRF_CREATED               = 'RRF_CREATED',
  RRF_SUBMITTED             = 'RRF_SUBMITTED',
  RRF_RESUBMITTED           = 'RRF_RESUBMITTED',
  RRF_APPROVED              = 'RRF_APPROVED',
  RRF_REJECTED              = 'RRF_REJECTED',
  RRF_DECLINED              = 'RRF_DECLINED',
  RRF_ON_HOLD               = 'RRF_ON_HOLD',
  RRF_OPENED_FOR_HIRING     = 'RRF_OPENED_FOR_HIRING',
  RRF_FILLED_BY_BENCH       = 'RRF_FILLED_BY_BENCH',
  RRF_CLOSED                = 'RRF_CLOSED',
  RRF_UPDATED               = 'RRF_UPDATED',
  RRF_DELETED               = 'RRF_DELETED',

  // User Management
  USER_CREATED              = 'USER_CREATED',
  USER_UPDATED              = 'USER_UPDATED',
  USER_ROLE_CHANGED         = 'USER_ROLE_CHANGED',
  USER_ACTIVATED            = 'USER_ACTIVATED',
  USER_DEACTIVATED          = 'USER_DEACTIVATED',
  USER_SUBFUNCTIONS_CHANGED = 'USER_SUBFUNCTIONS_CHANGED',

  // Scheduled / System
  APPROVAL_OVERDUE          = 'APPROVAL_OVERDUE',
  HIRING_DEADLINE_APPROACHING = 'HIRING_DEADLINE_APPROACHING',
  SYSTEM_ANNOUNCEMENT       = 'SYSTEM_ANNOUNCEMENT',
  WEEKLY_DIGEST             = 'WEEKLY_DIGEST',
}
```

### 4.2 NotificationPriority

```typescript
export enum NotificationPriority {
  LOW      = 'LOW',       // Informational — no toast, silent badge increment
  MEDIUM   = 'MEDIUM',    // Standard — toast popup, badge increment
  HIGH     = 'HIGH',      // Urgent — persistent toast, sound optional
  CRITICAL = 'CRITICAL',  // System alert — sticky banner until dismissed
}
```

### 4.3 NotificationChannel

```typescript
export enum NotificationChannel {
  IN_APP   = 'IN_APP',    // Bell icon + dropdown
  EMAIL    = 'EMAIL',     // Outlook/SMTP
  TEAMS    = 'TEAMS',     // Microsoft Teams webhook/adaptive card
  SMS      = 'SMS',       // Future
  WEBHOOK  = 'WEBHOOK',   // For integrations
}
```

### 4.4 NotificationStatus

```typescript
export enum NotificationStatus {
  PENDING  = 'PENDING',   // Created, not yet delivered
  SENT     = 'SENT',      // Delivered to channel
  FAILED   = 'FAILED',    // Delivery failed, eligible for retry
  READ     = 'READ',      // User marked as read (IN_APP only)
  ARCHIVED = 'ARCHIVED',  // Expired or bulk-archived
}
```

### 4.5 EntityType

```typescript
export enum NotificationEntityType {
  RRF        = 'RRF',
  USER       = 'USER',
  ROLE       = 'ROLE',
  PERMISSION = 'PERMISSION',
  SYSTEM     = 'SYSTEM',
}
```

---

## 5. Recipient Resolution Design

### 5.1 Resolution Strategies

The notification engine needs to resolve "who receives this?" for each event. This is non-trivial in the RRF Portal because of subfunction-based approver routing.

| Strategy | Use Case | Resolution Logic |
|---|---|---|
| **Direct User** | The actor or affected user | `user_id` passed directly from the service method |
| **RRF Creator** | Creator needs to know when their RRF changes state | `rrf.createdById` → single user |
| **Subfunction Approvers** | Approvers for a specific RRF | `rrf.subFunctionId` → `user_subfunctions` table → users with role `APPROVER` |
| **Assigned Approvers** | Already-assigned approvers | `rrf_approvers` table → `userId` WHERE `rrfId = ?` |
| **Role Broadcast** | All PMO users, all HR users, all Admins | `users` table → `WHERE role.roleCode = ?` |
| **System Broadcast** | All active users | `users` table → `WHERE isActive = true` |

### 5.2 Proposed Recipient Resolver Service

```
NotificationRecipientResolver
├── resolveByUserId(userId)                   → [userId]
├── resolveRrfCreator(rrfId)                  → [createdById]
├── resolveRrfApprovers(rrfId)                → [rrf_approvers.userId]
├── resolveBySubfunction(subFunctionId)       → [user_subfunctions → userId WHERE role=APPROVER]
├── resolveByRole(roleCode)                   → [users.id WHERE role.roleCode = roleCode]
├── resolveAllActive()                        → [users.id WHERE isActive = true]
```

### 5.3 Resolution per Event (mapping to §2)

| Event | Recipients |
|---|---|
| `RRF_CREATED` | `resolveByUserId(creatorId)` |
| `RRF_SUBMITTED` | `resolveRrfApprovers(rrfId)` |
| `RRF_RESUBMITTED` | `resolveRrfApprovers(rrfId)` |
| `RRF_APPROVED` | `resolveRrfCreator(rrfId)` + `resolveByRole('PMO')` |
| `RRF_REJECTED` | `resolveRrfCreator(rrfId)` |
| `RRF_DECLINED` | `resolveRrfCreator(rrfId)` |
| `RRF_ON_HOLD` | `resolveRrfCreator(rrfId)` + `resolveByRole('PMO')` |
| `RRF_OPENED_FOR_HIRING` | `resolveRrfCreator(rrfId)` + `resolveByRole('HR')` |
| `RRF_FILLED_BY_BENCH` | `resolveRrfCreator(rrfId)` + `resolveRrfApprovers(rrfId)` |
| `RRF_CLOSED` | `resolveRrfCreator(rrfId)` + `resolveByRole('PMO')` |
| `USER_CREATED` | `resolveByUserId(newUserId)` + `resolveByRole('ADMIN')` |
| `USER_ROLE_CHANGED` | `resolveByUserId(userId)` |
| `APPROVAL_OVERDUE` | `resolveRrfApprovers(rrfId)` + `resolveByRole('ADMIN')` |
| `SYSTEM_ANNOUNCEMENT` | `resolveAllActive()` |

### 5.4 Deduplication

When a user appears in multiple resolution groups (e.g., PMO who is also the creator), emit only **one** notification per user per event. Dedup by `(user_id, type, entity_type, entity_id)` with a short time window (10 seconds).

---

## 6. Portal Notification UI Design

### 6.1 Bell Icon Architecture

**Location:** `Header.jsx` — top-right, before logout button

```
┌──────────────────────────────────────────────────────┐
│  RRF Portal         [Dashboard Title]     🔔(3)  [⎋] │
└──────────────────────────────────────────────────────┘
                                             ↑
                                        Bell + badge
```

**Components needed:**

| Component | Purpose | Location |
|---|---|---|
| `NotificationBell` | Bell icon + unread count badge | `components/NotificationBell.jsx` |
| `NotificationDropdown` | Click-open dropdown (last 10) | `components/NotificationDropdown.jsx` |
| `NotificationItem` | Single row in dropdown | `components/NotificationItem.jsx` |
| `NotificationPage` | Full page — `/notifications` | `app/notifications/page.jsx` |
| `NotificationProvider` | React context for state + WebSocket | `contexts/NotificationContext.jsx` |

### 6.2 Bell Dropdown Spec

```
┌─────────────────────────────────────┐
│  Notifications              Mark All │
│─────────────────────────────────────│
│ 🟢 REQ-017 Approved          2m ago │  ← unread (bold)
│    Your request has been approved    │
│─────────────────────────────────────│
│ 🟢 New RRF awaiting approval  1h ago│  ← unread
│    REQ-018 submitted by J. Smith     │
│─────────────────────────────────────│
│ ○  REQ-015 Closed             2d ago│  ← read (muted)
│    Position filled externally        │
│─────────────────────────────────────│
│         View All Notifications →     │
└─────────────────────────────────────┘
```

### 6.3 Notification Page Features

1. **Filter tabs:** All | Unread | RRF | Users | System
2. **Search** by title/message text
3. **Bulk actions:** Mark all read, Archive selected
4. **Individual actions:** Mark read/unread, Archive, Delete
5. **Click → navigate** to `action_url`
6. **Infinite scroll** or pagination (20 per page)
7. **Empty state** illustration

### 6.4 API Endpoints Needed (Backend)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/notifications` | List notifications for current user (paginated, filterable) |
| `GET` | `/notifications/unread-count` | Quick badge count |
| `PATCH` | `/notifications/:id/read` | Mark single as read |
| `PATCH` | `/notifications/read-all` | Mark all as read for current user |
| `DELETE` | `/notifications/:id` | Delete/archive single |
| `GET` | `/notifications/preferences` | Get user notification preferences |
| `PUT` | `/notifications/preferences` | Update preferences |

### 6.5 User Preferences (Future — Phase 5)

Per-user opt-in/out per channel per event type:

```sql
CREATE TABLE notification_preferences (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,      -- NotificationType
  channel     VARCHAR(20) NOT NULL,      -- NotificationChannel
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, type, channel)
);
```

---

## 7. Real-time Architecture

### 7.1 Technology Recommendation

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **WebSocket (Socket.IO via `@nestjs/websockets`)** | Bidirectional, proven, rich ecosystem | Requires connection management, scaling complexity | **Recommended for Phase 2** |
| **Server-Sent Events (SSE)** | Simple, HTTP-based, no extra library | Unidirectional only, no binary | Good for MVP but limited |
| **Polling** | Zero new infra | Wasteful, latency, server load | **Not recommended** — project already has polling via `useSmartFetch` with 60s interval |

**Decision: WebSocket via `@nestjs/websockets` + `@nestjs/platform-socket.io`**

Why:
- NestJS has first-class WebSocket support
- Next.js client can use `socket.io-client`
- Supports rooms (per-user channel: `user:{userId}`)
- Scales with Redis adapter when needed
- Bidirectional enables future features (typing indicators, live collaboration)

### 7.2 Backend Architecture

```
Service Method (e.g. rrf.service.approve())
    │
    ▼
EventEmitter.emit('rrf.approved', { rrfId, userId, ... })
    │
    ▼
NotificationListener.handleRrfApproved()
    │
    ├──► RecipientResolver.resolve(event)
    │        → [userId1, userId2, ...]
    │
    ├──► NotificationRepository.save(notifications[])
    │        → Persisted to DB
    │
    ├──► NotificationGateway.emitToUsers(userIds, payload)
    │        → WebSocket push to connected clients
    │
    └──► (Phase 3+) ChannelDispatcher.dispatch(EMAIL, payload)
             → Queue email job via BullMQ
```

### 7.3 Frontend Architecture

```
App Mount
    │
    ▼
NotificationProvider (context)
    │
    ├──► Initial fetch: GET /notifications/unread-count
    │
    ├──► WebSocket connect: socket.io → room: user:{userId}
    │
    ├──► On 'notification' event:
    │        setState(prev => ({ unreadCount: prev.unreadCount + 1 }))
    │        Show toast (react-hot-toast) with notification.title
    │        Emit sound if HIGH/CRITICAL and user preference allows
    │
    └──► Expose via useNotifications() hook:
             { unreadCount, notifications, markRead, markAllRead, refetch }
```

### 7.4 New Dependencies Required

**Backend:**
```json
"@nestjs/event-emitter": "^2.x",
"@nestjs/websockets": "^10.x",
"@nestjs/platform-socket.io": "^10.x"
```

**Frontend:**
```json
"socket.io-client": "^4.x"
```

---

## 8. External Channel Architecture

### 8.1 Email (Microsoft Outlook / SMTP)

**Option A — SMTP (simplest, Phase 3):**
- Use `@nestjs-modules/mailer` + `nodemailer`
- SMTP relay through Microsoft 365 (organization's Exchange Online)
- Credentials: SMTP username/password or OAuth 2.0 client credentials
- Requires org admin to enable SMTP AUTH or configure an app password

**Option B — Microsoft Graph API (recommended for Phase 4+):**
- `POST /me/sendMail` or `POST /users/{id}/sendMail`
- Requires Azure AD app registration with `Mail.Send` permission
- Benefits: Sent mail appears in user's Sent Items, proper From address, no SMTP config

**Email template approach:**
- HTML templates stored in backend `templates/` directory
- Handlebars or Nunjucks renderer
- One template per `NotificationType`
- Inline CSS for email client compatibility

**Retry strategy:**
- Max 3 retries with exponential backoff (1m, 5m, 15m)
- Failed after 3 → status = `FAILED`, logged, surfaced in Admin dashboard
- Queue via BullMQ (`email-queue`)

### 8.2 Microsoft Teams

**Option A — Incoming Webhook (simplest, Phase 4):**
- Per-channel webhook URL configured in Teams
- POST an Adaptive Card JSON payload
- No auth needed (webhook URL is the secret)
- Limitations: one-way, channel-level (not user-targeted)

**Option B — Microsoft Graph API (user-targeted):**
- `POST /chats/{chat-id}/messages` or `POST /teams/{team-id}/channels/{channel-id}/messages`
- Requires Azure AD app with `Chat.Create`, `ChannelMessage.Send` delegated permissions
- Can mention specific users with `<at>` tags
- Full Adaptive Card support with action buttons

**Adaptive Card example structure:**
```json
{
  "type": "AdaptiveCard",
  "body": [
    { "type": "TextBlock", "text": "RRF Approved: {{positionTitle}}", "weight": "Bolder" },
    { "type": "TextBlock", "text": "{{message}}" },
    { "type": "FactSet", "facts": [
      { "title": "Request ID", "value": "{{requestId}}" },
      { "title": "Priority", "value": "{{priority}}" }
    ]}
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "View Request", "url": "{{actionUrl}}" }
  ]
}
```

**Rate limits:**
- Teams webhook: ~4 messages/second per webhook
- Graph API: throttled per tenant, ~10,000 messages/10 minutes
- Implement queue with rate limiter: 1 msg/second per channel

### 8.3 Cost Considerations

| Channel | Cost |
|---|---|
| IN_APP | Zero (own DB + WebSocket) |
| Email (SMTP via M365) | Included in M365 license if using authenticated user |
| Email (Graph API) | Included in M365 license |
| Teams webhook | Free (included in Teams) |
| Teams Graph API | Requires Azure AD app registration (free), M365 license |
| SMS | Per-message cost via Twilio/Azure Communication Services — defer |

---

## 9. Microsoft Integration Readiness

### 9.1 Current Auth State

The project currently uses local username/password auth (`passport-local` → `bcrypt.compare`). The `MICROSOFT_LOGIN_INTEGRATION_PLAN.md` documents a future migration to Microsoft Entra ID (Azure AD) SSO.

### 9.2 Notification + Microsoft Login Synergy

Once Microsoft Login is implemented:

| Capability | How it helps notifications |
|---|---|
| OAuth 2.0 access token | Can call Graph API for email (`Mail.Send`) and Teams (`Chat.Create`) without separate credentials |
| User's `oid` (Azure AD object ID) | Enables Graph API calls on behalf of user |
| Tenant ID | Scopes Graph API calls to organization |
| Refresh token | Long-lived access for background email/Teams delivery |
| Group membership | Can resolve notification recipients by Azure AD group instead of local role table |
| User presence | Can check if user is online before choosing channel (Teams if online, email if away) |

### 9.3 Azure AD App Permissions Needed

| Permission | Type | Purpose |
|---|---|---|
| `Mail.Send` | Application | Send email as system service account |
| `User.Read.All` | Application | Look up user names/emails for recipient resolution |
| `Chat.Create` | Application | Create 1:1 chat for direct Teams notifications |
| `ChannelMessage.Send` | Delegated | Post to Teams channels |
| `Calendars.ReadWrite` | Delegated | Future: interview scheduling via calendar |

### 9.4 Timing Recommendation

- Do NOT block notification Phase 1-2 on Microsoft Login integration
- Phase 1-2 (IN_APP + WebSocket) has zero Microsoft dependency
- Phase 3 (Email) can start with SMTP; migrate to Graph API post-SSO
- Phase 4 (Teams) can start with webhooks; migrate to Graph API post-SSO

---

## 10. Template Engine Design

### 10.1 Template Structure

Each `NotificationType` maps to a template with these sections:

```typescript
interface NotificationTemplate {
  type: NotificationType;
  title: string;            // Short: "RRF Approved"
  inAppMessage: string;     // Bell dropdown: "REQ-005 has been approved by {{approverName}}"
  emailSubject: string;     // Email subject line
  emailBodyHtml: string;    // Full HTML email
  teamsCardJson: string;    // Adaptive Card JSON
  placeholders: string[];   // ['requestId', 'approverName', 'positionTitle', ...]
}
```

### 10.2 Placeholder Registry

These placeholders are derived from actual entity fields in the codebase:

| Placeholder | Source |
|---|---|
| `{{requestId}}` | `rrf.subId` or `rrf.rrfNumber` (displayId logic) |
| `{{positionTitle}}` | `rrf.positionTitle` |
| `{{requesterName}}` | `rrf.createdBy.fullName` |
| `{{approverName}}` | `user.fullName` (the actor) |
| `{{priority}}` | `rrf.priority` |
| `{{status}}` | `rrf.status` |
| `{{reason}}` | `rrf.declineReason` or `comments` |
| `{{actionUrl}}` | Pre-computed frontend route |
| `{{date}}` | Event timestamp |
| `{{projectName}}` | `rrf.projectName` |
| `{{department}}` | `rrf.department` |
| `{{headcount}}` | `rrf.headcount` |
| `{{userName}}` | `user.fullName` (for user events) |
| `{{roleName}}` | `role.roleName` |

### 10.3 Sample Templates

**RRF_SUBMITTED:**
- Title: `New RRF Awaiting Approval`
- Message: `{{requestId}} "{{positionTitle}}" submitted by {{requesterName}} requires your approval.`
- Priority: `HIGH`

**RRF_APPROVED:**
- Title: `RRF Approved`
- Message: `{{requestId}} "{{positionTitle}}" has been approved by {{approverName}}.`
- Priority: `HIGH`

**RRF_DECLINED:**
- Title: `RRF Declined`
- Message: `{{requestId}} "{{positionTitle}}" was declined by {{approverName}}. Reason: {{reason}}`
- Priority: `HIGH`

**RRF_OPENED_FOR_HIRING:**
- Title: `RRF Opened for Hiring`
- Message: `{{requestId}} "{{positionTitle}}" is now open for hiring. RRF Number: {{rrfNumber}}`
- Priority: `HIGH`

**APPROVAL_OVERDUE:**
- Title: `Overdue Approval`
- Message: `{{requestId}} "{{positionTitle}}" has been pending approval for {{daysPending}} days.`
- Priority: `CRITICAL`

### 10.4 Template Storage

- Phase 1: Hardcoded in `notification-templates.ts` (constant map)
- Phase 3+: DB table `notification_templates` for admin editing
- Renderer: Simple string interpolation (`message.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key])`) — no heavy template engines needed given the simplicity

---

## 11. Performance & Queueing

### 11.1 Current Scale

- ~5 roles, ~50 users (from admin seed patterns)
- ~100 RRFs/month estimated
- Fan-out: max ~10 recipients per event
- Peak: maybe 50 notifications/minute during busy approval cycles

**Verdict:** At current scale, synchronous notification creation within the request lifecycle is acceptable for Phase 1. Queue infrastructure recommended for Phase 3+ (email delivery).

### 11.2 Phase 1 — Synchronous (no queue)

```
Service.approve() → EventEmitter.emit() → NotificationListener creates DB rows + WebSocket push
```

All within the same Node.js process. Total added latency: ~10-20ms for DB insert + WebSocket emit.

### 11.3 Phase 3+ — BullMQ Queue

**When to introduce:** When adding email/Teams delivery (unreliable external APIs).

**Dependencies:**
```json
"@nestjs/bull": "^10.x",
"bullmq": "^5.x",
"ioredis": "^5.x"
```

**Queue architecture:**
```
NotificationListener
    │
    ├──► IN_APP: Direct DB insert + WebSocket (synchronous, fast)
    │
    ├──► EMAIL: emailQueue.add({ notification, template })
    │        → EmailProcessor: render template → send via SMTP/Graph API
    │        → On failure: retry 3x with backoff, then mark FAILED
    │
    └──► TEAMS: teamsQueue.add({ notification, template })
             → TeamsProcessor: render Adaptive Card → POST to webhook/Graph
             → On failure: retry 3x with backoff, then mark FAILED
```

**Redis requirement:** Single Redis instance (can be the same used for BullMQ and WebSocket adapter scaling).

### 11.4 Deduplication

- Before creating notification: check `notifications` table for `(user_id, type, entity_type, entity_id)` within last 60 seconds
- Prevents duplicates from retries, double-clicks, or event replay

### 11.5 Throttling / Aggregation (Future)

- **Batch digest:** If user has 10+ unread notifications, aggregate into "You have 10 new updates" email instead of 10 individual emails
- **Rate limit per user:** Max 1 email per event type per 5 minutes
- Implementation: Redis sorted set with TTL

---

## 12. Security Model

### 12.1 Access Control

| Rule | Implementation |
|---|---|
| Users can only see their own notifications | `WHERE user_id = :currentUserId` on all queries, enforced at service layer |
| Admins cannot see other users' notifications | No admin override — privacy first |
| JWT auth required for all notification endpoints | `@UseGuards(JwtAuthGuard)` on `NotificationsController` |
| WebSocket auth | Validate JWT in `handleConnection()` middleware before allowing socket join |

### 12.2 Notification Privacy

- `metadata` JSONB must NOT contain passwords, tokens, or PII beyond what's already visible to the recipient
- Email notifications should contain minimal info with "View in portal" link
- Teams messages should not expose internal IDs — use display names

### 12.3 Action URL Security

- Action URLs are relative frontend routes (e.g., `/approver/review/5`), not absolute URLs
- Frontend renders these through Next.js router — no open redirect risk
- No signed URLs needed for Phase 1 (internal portal, behind auth)
- If external email links are added (Phase 3): use HMAC-signed tokens with 24h TTL

### 12.4 Audit Trail

- Every notification creation is persisted with `created_by`, `created_at`
- Delivery status tracked: `PENDING` → `SENT` / `FAILED` → `READ`
- Combined with existing `statusHistory` on `rrfs` table, provides complete audit

### 12.5 Data Retention

- Default TTL: 90 days (LOW/MEDIUM), 365 days (HIGH/CRITICAL)
- Archived notifications moved to `notifications_archive` (same schema)
- Comply with data minimization: expose `/notifications/delete-my-data` for user-initiated cleanup

---

## 13. Rollout Roadmap

### Phase 1: Portal Notifications (Foundation)

**Scope:** IN_APP notifications only — DB, bell icon, dropdown, notification page.

**Backend:**
- Create `Notification` entity + migration
- Create `NotificationsModule` (`NotificationsService`, `NotificationsController`, `NotificationsGateway`)
- Install `@nestjs/event-emitter`
- Add `EventEmitter.emit()` calls to 12 RRF lifecycle events in `rrf.service.ts`
- Add `EventEmitter.emit()` calls to 6 user management events in `users.service.ts`
- Create `NotificationListener` that handles events → creates DB rows
- Create `NotificationRecipientResolver` service
- Create `NotificationTemplateService` (hardcoded templates)
- API endpoints: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

**Frontend:**
- Create `NotificationContext` + `useNotifications` hook
- Create `NotificationBell` component in `Header.jsx`
- Create `NotificationDropdown` component
- Create `/notifications` page
- Wire bell badge to `unread-count` API (polling every 30s initially)

**Dependencies to install:**
- Backend: `@nestjs/event-emitter`
- Frontend: none

**Risk:** Low — additive only, no existing code modified beyond adding `emit()` calls after existing service logic.

---

### Phase 2: Real-time Push

**Scope:** WebSocket for instant bell updates + toast popups.

**Backend:**
- Install `@nestjs/websockets` + `@nestjs/platform-socket.io`
- Create `NotificationsGateway` (WebSocket gateway)
- JWT validation in `handleConnection`
- Room-per-user: `user:{userId}`
- Emit to rooms from `NotificationListener` after DB insert

**Frontend:**
- Install `socket.io-client`
- Connect in `NotificationContext` on auth
- Disconnect on logout
- On incoming event: increment badge, show toast, update dropdown if open

**Dependencies to install:**
- Backend: `@nestjs/websockets`, `@nestjs/platform-socket.io`
- Frontend: `socket.io-client`

**Risk:** Low — new gateway module, existing CORS config in `main.ts` needs socket origin added.

---

### Phase 3: Email Notifications

**Scope:** Send email for HIGH/CRITICAL priority events.

**Backend:**
- Install `@nestjs-modules/mailer` + `nodemailer`
- Configure SMTP transport (Microsoft 365 relay or app password)
- Create HTML email templates (Handlebars)
- Install `@nestjs/bull` + `bullmq` + `ioredis` for queue
- Create `EmailProcessor` that processes email queue jobs
- Retry 3x with exponential backoff
- `docker-compose.yml`: add Redis service

**Decisions needed:**
- SMTP credentials: org admin must enable SMTP AUTH on M365 tenant
- Sender address: `noreply@company.com` or service account
- Rate limit: align with M365 sending limits (30 msgs/min per mailbox)

**Risk:** Medium — requires infrastructure (Redis), external service credentials, M365 admin cooperation.

---

### Phase 4: Microsoft Teams Integration

**Scope:** Teams channel notifications for key workflow events.

**Option A (quick start):**
- Teams Incoming Webhook per channel
- POST Adaptive Cards as JSON
- No Azure AD dependency

**Option B (post-SSO):**
- Graph API with Azure AD app credentials
- User-targeted chat messages
- Richer interaction (action buttons that call back to portal)

**Dependencies:**
- Option A: webhook URL configured in Teams channel
- Option B: Azure AD app registration, Graph SDK

**Risk:** Low (Option A) / Medium (Option B — requires Azure AD admin).

---

### Phase 5: Preferences & Polish

**Scope:** User-controlled notification preferences.

- `notification_preferences` table
- Settings page: toggle per event type per channel
- Respect preferences in `NotificationListener` before dispatching
- "Do not disturb" time windows
- Digest mode (aggregate multiple into one email)

**Risk:** Low — pure additive, opt-out mechanism.

---

## 14. Final Recommendations

### 14.1 What to Build First

Phase 1 (IN_APP) delivers immediate value with minimal risk. Users will immediately see workflow state changes without refreshing dashboards. This alone eliminates the #1 UX gap in the current system.

### 14.2 What to Avoid

- **Do not build email before IN_APP** — email without in-app is annoying, in-app without email is useful
- **Do not build custom WebSocket before Phase 1** — polling every 30s is fine for MVP badge count
- **Do not create a notification preferences UI before there are channels to configure** — premature complexity
- **Do not add Redis for Phase 1** — PostgreSQL is sufficient for synchronous notification creation

### 14.3 Key Architectural Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| Event bus | `@nestjs/event-emitter` (in-process) | Lightweight, no infra, sufficient for single-instance deployment |
| Real-time | Socket.IO via `@nestjs/websockets` | First-class NestJS support, battle-tested |
| Queue | BullMQ + Redis (Phase 3+) | Only needed when external delivery (email/Teams) enters |
| Template engine | Simple string interpolation | Project has simple, consistent notification messages |
| DB | PostgreSQL `notifications` table (same DB) | No new infra, JSONB for metadata, partial indexes for performance |
| Email | Start SMTP → migrate to Graph API post-SSO | Fastest path to email without Azure AD dependency |
| Teams | Start webhook → migrate to Graph API post-SSO | Zero Azure AD dependency for initial Teams notifications |

### 14.4 Files That Will Be Modified (Phase 1)

These are the files where `EventEmitter.emit()` calls will be inserted:

| File | Methods | # Events |
|---|---|---|
| `rrf-portal-backend/src/rrf/rrf.service.ts` | `create`, `submit`, `approve`, `reject`, `decline`, `putOnHold`, `openForHiring`, `fillByBench`, `closeRrf`, `update`, `remove` | 12 |
| `rrf-portal-backend/src/users/users.service.ts` | `createUser`, `updateUser`, `assignSubfunctions` | 6 |
| `rrf-portal-backend/src/app.module.ts` | Import `EventEmitterModule`, `NotificationsModule` | 1 |
| `rrf-portal-backend/src/main.ts` | No change for Phase 1; Phase 2 adds WebSocket CORS | 0 |
| `rrf-portal-nextjs/components/Header.jsx` | Add `NotificationBell` component | 1 |
| `rrf-portal-nextjs/components/admin/AdminHeader.jsx` | Add `NotificationBell` component | 1 |

### 14.5 New Files to Create (Phase 1)

**Backend:**
```
src/notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── notification.entity.ts
├── notification.listener.ts
├── notification-recipient.resolver.ts
├── notification-template.service.ts
├── dto/
│   ├── notification-query.dto.ts
│   └── update-notification.dto.ts
├── enums/
│   ├── notification-type.enum.ts
│   ├── notification-priority.enum.ts
│   ├── notification-channel.enum.ts
│   ├── notification-status.enum.ts
│   └── notification-entity-type.enum.ts
└── interfaces/
    └── notification-event.interface.ts
```

**Frontend:**
```
contexts/NotificationContext.jsx
hooks/useNotifications.js
components/NotificationBell.jsx
components/NotificationDropdown.jsx
components/NotificationItem.jsx
lib/api/notificationsApi.js
app/notifications/page.jsx
```

---

*End of Master Notification Architecture Plan — Read-Only Analysis — No Code Changes Made*
