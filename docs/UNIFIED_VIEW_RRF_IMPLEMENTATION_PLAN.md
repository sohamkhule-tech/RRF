# Unified ViewRRF Implementation Plan
**Strangler Pattern Migration to `/requests/[id]` Universal Route**

**Author:** System Forensic Analysis  
**Date:** January 2025  
**Status:** Planning Phase - READ ONLY  
**Related Docs:**
- [Current System Operational Manual](./CURRENT_SYSTEM_OPERATIONAL_MANUAL.md)
- [Scope and Workflow Assignment Manual](./SCOPE_AND_WORKFLOW_ASSIGNMENT_MANUAL.md)
- [Master Refactor Implementation Blueprint](./features/MASTER_REFACTOR_IMPLEMENTATION_BLUEPRINT.md)

---

## Executive Summary

This document provides a **deep forensic analysis** and **comprehensive implementation strategy** for consolidating **5 duplicated ViewRRF pages** into a **single unified route** (`/requests/[id]`) using the **Strangler Pattern**. 

**Current State:** 5 role-specific ViewRRF pages with ~80% duplicated code  
**Target State:** 1 universal route with role-context-aware rendering  
**Migration Strategy:** Parallel build, gradual cutover, zero user disruption  
**Constraints:** Frontend-only changes, no backend/DB/workflow modifications  

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Shared UI Components Inventory](#2-shared-ui-components-inventory)
3. [Action Eligibility Matrix](#3-action-eligibility-matrix)
4. [Editability Matrix](#4-editability-matrix)
5. [Unified Route Design](#5-unified-route-design)
6. [Component Architecture](#6-component-architecture)
7. [Action Resolver Design](#7-action-resolver-design)
8. [Migration Strategy (Strangler Pattern)](#8-migration-strategy-strangler-pattern)
9. [Risk Analysis](#9-risk-analysis)
10. [File Impact Analysis](#10-file-impact-analysis)
11. [Test Coverage Matrix](#11-test-coverage-matrix)
12. [No-Touch Zones](#12-no-touch-zones)
13. [Implementation Steps](#13-implementation-steps)

---

## 1. Current Architecture Analysis

### 1.1 Existing ViewRRF Routes

| Role | Route | File | LOC | Actions Supported |
|------|-------|------|-----|-------------------|
| **Hiring Manager** | `/hiring-manager/view-rrf/[id]` | `app/hiring-manager/view-rrf/[id]/page.jsx` | ~450 | View, Edit, Print, Export PDF |
| **Approver** | `/approver/view-rrf/[id]` | `app/approver/view-rrf/[id]/page.jsx` | ~520 | View, Approve, Decline, On Hold, Print, Export PDF |
| **PMO** | `/pmo/view-rrf/[id]` | `app/pmo/view-rrf/[id]/page.jsx` | ~480 | View, Open for Hiring, Close RRF, Print, Export PDF |
| **HR** | `/hr/view-rrf/[id]` | `app/hr/view-rrf/[id]/page.jsx` | ~460 | View, Close RRF, Print, Export PDF |
| **Admin** | `/admin/rrf-management/[id]` | `app/admin/rrf-management/[id]/page.jsx` | ~650 | View, Edit, Approve, Decline, On Hold, Open for Hiring, Close RRF, Delete, Print, Export PDF |

**Total Duplicated Code:** ~2,560 LOC  
**Estimated Duplication:** 80% (split-panel UI, content sections, print/export logic)

### 1.2 Architectural Pattern Analysis

**Current Pattern:** Role-Based Route Duplication (Anti-Pattern)

```
┌─────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /hiring-manager/view-rrf/[id]  ──►  ViewRRF_HM.jsx         │
│  /approver/view-rrf/[id]        ──►  ViewRRF_Approver.jsx   │
│  /pmo/view-rrf/[id]             ──►  ViewRRF_PMO.jsx        │
│  /hr/view-rrf/[id]              ──►  ViewRRF_HR.jsx         │
│  /admin/rrf-management/[id]     ──►  ViewRRF_Admin.jsx      │
│                                                              │
│  Each file implements:                                       │
│  ✓ Split-panel layout (identical)                           │
│  ✓ Section navigation (identical)                           │
│  ✓ RRFContentSections (identical usage)                     │
│  ✓ Print/Export logic (identical)                           │
│  ✓ Status display (identical)                               │
│  ✗ Action buttons (role-specific logic)                     │
│  ✗ Permission checks (role-specific)                        │
│  ✗ Modal configurations (role-specific)                     │
│                                                              │
│  Problems:                                                   │
│  • 80% code duplication                                      │
│  • 5 files to update for UI changes                         │
│  • Inconsistent action button styling                       │
│  • Hard to maintain permission gates                        │
│  • Notification routing requires external resolver          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Component Dependencies

**Common Dependencies (Used by ALL ViewRRF pages):**
- `RRFContentSections` - Content renderer (requisition, position, technical, job description)
- `InfoField` - Label-value display component
- `StatusWithDetails` - Status badge with decline reason/history mining
- `LoadingSpinner` - Loading state
- `ErrorMessage` - Error state
- `useRRFDetail(id)` - RRF data fetching hook
- `jsPDF` + `html2canvas` - PDF export
- `toast` - Notifications

**Role-Specific Dependencies:**

| Dependency | Used By | Purpose |
|------------|---------|---------|
| `usePermission` | Approver, Admin | Permission gates for action buttons |
| `useApproverRequests` | Approver, Admin | Approve/Decline/On Hold API calls |
| `rrfApi` (direct) | PMO, HR, Admin | Open for Hiring, Close RRF, Fill from Bench |
| `MaskedDateInput` | Admin | Date entry for close modal |

### 1.4 Unique Logic Per Role

#### Hiring Manager
- **Edit Button Logic:** Visible ONLY if `status in ['draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold']`
- **Edit Action:** Redirects to `/hiring-manager/create-rrf?draftId=${id}` (reuses ModernRRFForm)
- **No Permission Checks:** Assumes ownership (backend enforces)

#### Approver
- **Action Buttons:** Visible ONLY if `status === 'pending'`
- **Permission Gates:**
  - `PERMISSIONS.APPROVALS.APPROVE` → Approve button
  - `PERMISSIONS.APPROVALS.REJECT` → Decline button
  - `PERMISSIONS.APPROVALS.ON_HOLD` → On Hold button
- **Modal Types:** `approve`, `decline`, `onhold` with color-coded styling
- **Reason Validation:** Decline and On Hold REQUIRE `reason` (non-empty string)
- **API Calls:** `approveRequest()`, `rejectRequest()`, `putOnHold()` from `useApproverRequests`

#### PMO
- **Open for Requisition Button:** Visible ONLY if `status === 'approved'`
- **Close RRF Button:** Visible if `status in ['approved', 'in-progress', 'open-for-hiring']`
- **Close Modal Fields:**
  - `hrCloseStatus` (dropdown: 'recruited', 'closed', 'cancelled')
  - `hrCandidateName` (text input, optional)
  - `hrJoiningDate` (date input, optional)
  - `remark` (textarea, optional)
- **API Calls:** `rrfApi.openForHiring()`, `rrfApi.close()`
- **Navigation:** Redirects to `/pmo/sent-to-approvers` after actions

#### HR
- **Close RRF Button:** Visible if `status in ['in-progress', 'open-for-hiring']`
- **Close Modal Fields:**
  - `closeStatus` (dropdown: 'recruited', 'closed', 'cancelled')
  - `candidateName` (text input, REQUIRED if status = 'recruited')
  - `joiningDate` (date input, REQUIRED if status = 'recruited')
- **Validation:** Hiring statuses require candidate details
- **API Calls:** `rrfApi.close()`
- **Decline Reason Mining:** Forensic logic to extract decline reason from `statusHistory` or `rrf.notes`

#### Admin
- **Edit Button:** `canUpdate` permission + editable status
- **Approval Buttons:** `isPending` + `PERMISSIONS.APPROVALS.*`
- **PMO Buttons:** `isApproved` + PMO permissions
- **Close Button:** `isInProgress` + `canClose` permission
- **Delete Button:** `canDelete` permission (not implemented in current code but permission exists)
- **Modal Types:** 6 types (`approve`, `decline`, `onhold`, `openforhiring`, `fillfrombench`, `close`)
- **Fill from Bench:** Special action with `internalRrfNumber` auto-generation
- **API Calls:** Aggregates ALL workflow APIs (`approveRequest`, `rejectRequest`, `putOnHold`, `rrfApi.openForHiring`, `rrfApi.fillByBench`, `rrfApi.close`)

### 1.5 Code Duplication Analysis

**Identical Code (80% duplication):**

1. **Split-Panel Layout** (~150 LOC per file)
   - Fixed height container (`h-screen`)
   - Left panel: metadata sidebar
   - Right panel: content area
   - Responsive design (hidden on mobile)

2. **Section Navigation** (~80 LOC per file)
   - 4 sections: Requisition, Position, Technical, Description
   - Icon mapping: `FileText`, `User`, `Tool`, `Build`
   - Active state styling
   - Click handlers to change `activeSection`

3. **Print/Export Logic** (~120 LOC per file)
   - `handlePrint()`: `window.print()`
   - `handleExportPDF()`: `html2canvas` → `jsPDF` conversion
   - `no-print` CSS class management
   - Identical implementation across all files

4. **Status Display** (~40 LOC per file)
   - `StatusWithDetails` component usage
   - Status mapping ('pending' → 'Pending Approval')
   - Decline reason/history mining (except Approver)

5. **Content Rendering** (~50 LOC per file)
   - `<RRFContentSections rrfData={...} activeSection={...} />`
   - Identical props, identical usage

**Unique Code (20% variation):**

1. **Action Buttons** (~60-150 LOC per file)
   - Role-specific buttons
   - Permission gates
   - Status-based visibility

2. **Modals** (~80-200 LOC per file)
   - Approve/Decline/On Hold modals
   - Open for Hiring modal
   - Close RRF modal (different fields for PMO vs HR vs Admin)
   - Fill from Bench modal (Admin only)

3. **API Call Handlers** (~40-100 LOC per file)
   - Different hook usage (`useApproverRequests` vs direct `rrfApi`)
   - Different success/error handling
   - Different navigation after actions

---

## 2. Shared UI Components Inventory

### 2.1 RRFContentSections Component

**Location:** `components/RRFContentSections.jsx`  
**Purpose:** Renders the 4 main sections of an RRF  
**Usage:** ALL ViewRRF pages  

**Props:**
```javascript
{
  rrfData: Object,        // Complete RRF data
  activeSection: String   // 'requisition' | 'position' | 'technical' | 'description'
}
```

**Sections Rendered:**

| Section | Fields Displayed | Special Rendering |
|---------|------------------|-------------------|
| **Requisition Info** | Manager, Entity, Org, Function, Sub-function, Dept, Req Type, Customer, Project, Billing/Onboarding Dates, Billing Rate, Budgets | Date formatting (en-GB), currency formatting |
| **Position Details** | Position Title, Employment Type, Work Mode, Headcount, Priority, Location, Experience | Priority badges (High=red, Medium=yellow, Low=green) |
| **Technical Requirements** | Primary Technologies, Must-Have Skills, Nice-to-Have Skills, Interview Panel | Rich text display, user cards for interview panel |
| **Job Description** | Job Description, Additional Notes | Rich text display |

**Key Features:**
- Fully stateless (pure display)
- Uses `screen-hidden` CSS class for tab switching
- Normalizes location data (array or string)
- Formats currencies (budgets, billing rate)
- Rich text rendering for description fields

### 2.2 InfoField Component

**Location:** `components/InfoField.jsx` (assumed)  
**Purpose:** Label-value pair display  
**Usage:** ALL ViewRRF pages, RRFContentSections  

**Props:**
```javascript
{
  label: String,
  value: String | Number | ReactNode,
  className?: String
}
```

### 2.3 StatusWithDetails Component

**Location:** `components/StatusWithDetails.jsx` (assumed)  
**Purpose:** Display status badge with decline reason mining  
**Usage:** ALL ViewRRF pages (except Approver which has custom status)  

**Features:**
- Color-coded badges (approved=green, declined=red, on-hold=amber, etc.)
- Mines `statusHistory` to find decline/reject reason and actor
- Falls back to `rrf.notes` for decline reason
- Shows "Declined by [name] on [date]" with reason tooltip

### 2.4 LoadingSpinner & ErrorMessage

**Purpose:** Standard loading/error states  
**Usage:** ALL ViewRRF pages  

---

## 3. Action Eligibility Matrix

### 3.1 Complete Action Inventory

**10 Actions Supported** (rejecting "Reject" and "Fill by Bench" per user specification):

| Action ID | Label | API Endpoint | Backend Method |
|-----------|-------|--------------|----------------|
| **view** | View Request | `GET /rrf/:id` | `rrfApi.getById()` |
| **edit** | Edit Request | `PUT /rrf/:id` | `rrfApi.update()` |
| **submit** | Submit for Approval | `POST /rrf/:id/submit` | `rrfApi.submit()` |
| **resubmit** | Resubmit (after decline) | `POST /rrf/:id/submit` | `rrfApi.submit()` |
| **approve** | Approve Request | `POST /rrf/:id/approve` | `rrfApi.approve()` |
| **decline** | Decline Request | `POST /rrf/:id/decline` | `rrfApi.decline()` |
| **hold** | Put on Hold | `POST /rrf/:id/on-hold` | `rrfApi.putOnHold()` |
| **openForHiring** | Open for Hiring | `POST /rrf/:id/open-for-hiring` | `rrfApi.openForHiring()` |
| **close** | Close RRF | `POST /rrf/:id/close` | `rrfApi.close()` |
| **delete** | Delete Request | `DELETE /rrf/:id` | `rrfApi.delete()` |

**Excluded Actions** (per user specification):
- ~~reject~~ (alias for decline, not exposed in UI)
- ~~fillByBench~~ (Admin-only special case, NOT in scope)

### 3.2 Action Eligibility Matrix

**Legend:**
- ✅ = Always eligible (if permission granted)
- 🟡 = Conditionally eligible (status-dependent)
- ⚪ = Never eligible
- 🔐 = Permission required

| Action | HM | Approver | PMO | HR | Admin | Status Conditions | Ownership Rules | Permission Required |
|--------|----|----|-----|-------|-------|-------------------|-----------------|---------------------|
| **view** | ✅ | ✅ | ✅ | ✅ | ✅ | Any status | Creator OR assigned approver OR PMO OR HR OR Admin | `RRF.READ` |
| **edit** | 🟡 | ⚪ | ⚪ | ⚪ | 🟡 | `draft`, `pending`, `submitted`, `declined`, `rejected`, `on-hold` | Creator only | `RRF.UPDATE` |
| **submit** | 🟡 | ⚪ | ⚪ | ⚪ | ⚪ | `draft` | Creator only | `RRF.CREATE` |
| **resubmit** | 🟡 | ⚪ | ⚪ | ⚪ | 🟡 | `declined`, `rejected`, `on-hold` | Creator only | `RRF.UPDATE` |
| **approve** | ⚪ | 🟡 | ⚪ | ⚪ | 🟡 | `pending`, `submitted` | Assigned approver OR Admin | `APPROVALS.APPROVE` |
| **decline** | ⚪ | 🟡 | ⚪ | ⚪ | 🟡 | `pending`, `submitted` | Assigned approver OR Admin | `APPROVALS.REJECT` |
| **hold** | ⚪ | 🟡 | ⚪ | ⚪ | 🟡 | `pending`, `submitted` | Assigned approver OR Admin | `APPROVALS.ON_HOLD` |
| **openForHiring** | ⚪ | ⚪ | 🟡 | ⚪ | 🟡 | `approved` | PMO OR Admin | `RRF.OPEN_FOR_HIRING` |
| **close** | ⚪ | ⚪ | 🟡 | 🟡 | 🟡 | PMO: `approved`, `in-progress`, `open-for-hiring`<br>HR: `in-progress`, `open-for-hiring`<br>Admin: `in-progress`, `open-for-hiring` | PMO OR HR OR Admin | `RRF.CLOSE` |
| **delete** | ⚪ | ⚪ | ⚪ | ⚪ | 🟡 | `draft` (best practice) | Admin only | `RRF.DELETE` |

### 3.3 Detailed Action Rules

#### View
- **Who:** Anyone with `RRF.READ` permission
- **When:** Any status
- **Visibility Logic:**
  - **HM:** Own requests OR requests where user is in `interviewPanel`
  - **Approver:** Requests where `user.id IN (SELECT userId FROM rrf_approvers WHERE rrfId = :id)`
  - **PMO:** All approved/in-progress/open-for-hiring requests
  - **HR:** All in-progress/open-for-hiring/closed requests
  - **Admin:** ALL requests (god mode)

#### Edit
- **Who:** Creator (HM) OR Admin with `RRF.UPDATE`
- **When:** `status IN ('draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold')`
- **Why:** HM can fix issues before approval; Admin can correct any pre-approval RRF
- **Redirect:** `/hiring-manager/create-rrf?draftId=${id}` (reuses ModernRRFForm in edit mode)

#### Submit
- **Who:** Creator (HM) with `RRF.CREATE`
- **When:** `status = 'draft'`
- **Why:** Initial submission to start approval workflow
- **Backend Effect:** `status → 'pending'`, triggers notification to approvers

#### Resubmit
- **Who:** Creator (HM) OR Admin with `RRF.UPDATE`
- **When:** `status IN ('declined', 'rejected', 'on-hold')`
- **Why:** HM can address decline reason and resubmit
- **Backend Effect:** `status → 'pending'`, triggers new notification to approvers

#### Approve
- **Who:** Assigned Approver OR Admin with `APPROVALS.APPROVE`
- **When:** `status IN ('pending', 'submitted')`
- **Required Fields:** `comments` (optional)
- **Backend Effect:** `status → 'approved'`, triggers notification to PMO

#### Decline
- **Who:** Assigned Approver OR Admin with `APPROVALS.REJECT`
- **When:** `status IN ('pending', 'submitted')`
- **Required Fields:** `reason` (mandatory, validated in frontend)
- **Backend Effect:** `status → 'declined'`, triggers notification to HM with reason

#### Hold
- **Who:** Assigned Approver OR Admin with `APPROVALS.ON_HOLD`
- **When:** `status IN ('pending', 'submitted')`
- **Required Fields:** `reason` (mandatory, validated in frontend)
- **Backend Effect:** `status → 'on-hold'`, triggers notification to HM with reason

#### Open for Hiring
- **Who:** PMO OR Admin with `RRF.OPEN_FOR_HIRING`
- **When:** `status = 'approved'`
- **Backend Effect:** `status → 'in-progress'`, triggers notification to HR

#### Close RRF
- **Who:** PMO OR HR OR Admin with `RRF.CLOSE`
- **When:**
  - **PMO:** `status IN ('approved', 'in-progress', 'open-for-hiring')`
  - **HR:** `status IN ('in-progress', 'open-for-hiring')`
  - **Admin:** `status IN ('in-progress', 'open-for-hiring')`
- **Required Fields:**
  - `closeStatus` (dropdown: 'recruited', 'closed', 'cancelled')
  - `candidateName` (text, REQUIRED if closeStatus = 'recruited')
  - `joiningDate` (date, REQUIRED if closeStatus = 'recruited')
  - `remark` (textarea, optional)
- **Backend Effect:** `status → 'closed'`, stores candidate details, triggers notification

#### Delete
- **Who:** Admin ONLY with `RRF.DELETE`
- **When:** `status = 'draft'` (best practice, backend may allow any status)
- **Required Fields:** None (confirm dialog recommended)
- **Backend Effect:** Soft delete (sets `deletedAt` timestamp) or hard delete

---

## 4. Editability Matrix

### 4.1 Who Can Edit What

**Editability Definition:** Ability to UPDATE RRF data (not just view)

| Who | When (Status) | What (Fields) | How (Method) | Why (Business Rule) |
|-----|---------------|---------------|--------------|---------------------|
| **Hiring Manager** | `draft`, `pending`, `submitted`, `declined`, `rejected`, `on-hold` | ALL fields (except `status`, `approvedBy`, `closedBy`, `internalRrfNo`) | Opens ModernRRFForm in edit mode via `/hiring-manager/create-rrf?draftId=${id}` | Owner can correct mistakes before approval |
| **Approver** | NEVER | N/A | N/A | Approvers review, not edit (separation of duties) |
| **PMO** | NEVER (direct edit) | Can change status via actions (open-for-hiring, close) | Modal-based actions only | PMO manages workflow, not RRF details |
| **HR** | NEVER (direct edit) | Can change status via actions (close) | Modal-based actions only | HR manages closure, not RRF details |
| **Admin** | `draft`, `pending`, `submitted`, `declined`, `rejected`, `on-hold` | ALL fields (including status manipulation) | Opens ModernRRFForm OR inline edit (future) | God mode for corrections |

### 4.2 Field-Level Access Control

**Read-Only Fields** (cannot be edited after creation):
- `id` (system-generated)
- `subId` / `rrfNumber` / `displayId` (auto-generated)
- `createdBy`, `createdAt` (audit trail)
- `approvedBy`, `approvedAt` (workflow state)
- `closedBy`, `closedAt`, `closeStatus` (workflow state)
- `internalRrfNo` (PMO/Admin-generated)

**Editable Fields** (HM during draft/declined; Admin anytime):
- All form fields from ModernRRFForm:
  - Requisition: Manager, Entity, Org, Function, Sub-function, Dept, Req Type, Customer, Project, Dates, Billing Rate, Budgets
  - Position: Position Title, Employment Type, Work Mode, Headcount, Priority, Location, Experience
  - Technical: Technologies, Skills, Interview Panel
  - Description: Job Description, Additional Notes
  - **Plus:** Dynamic fields from Form Configuration

**Status-Dependent Editability:**
- `draft`: 100% editable (except system fields)
- `pending/submitted/declined/rejected/on-hold`: 100% editable (BUT triggers workflow reset)
- `approved/in-progress/open-for-hiring/closed`: NOT editable (workflow locked)

**Backend Enforcement:** NestJS DTO validation + permission guards ensure frontend can't bypass rules

---

## 5. Unified Route Design

### 5.1 New Route Structure

**Target Route:** `/requests/[id]`

**File Location:** `app/requests/[id]/page.jsx`

**Route Characteristics:**
- **Universal:** Works for ALL roles (HM, Approver, PMO, HR, Admin)
- **Context-Aware:** Detects user role and permissions from `useAuth()`
- **Dynamic Actions:** Renders only eligible action buttons based on role + status + ownership
- **Backward Compatible:** Old routes remain functional during migration (Strangler Pattern)

### 5.2 URL Parameters

```
/requests/[id]
```

- `id` (path param): RRF ID (numeric, e.g., `/requests/42`)
- No query params needed (all context from auth + API)

### 5.3 Routing Logic Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   UNIFIED ROUTE FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User clicks notification OR direct link                     │
│       ↓                                                      │
│  /requests/42                                                │
│       ↓                                                      │
│  UnifiedViewRRF.jsx                                          │
│       ↓                                                      │
│  useAuth() → { user, role, permissions }                    │
│  useRRFDetail(42) → { rrf, loading, error }                 │
│       ↓                                                      │
│  IF loading: <LoadingSpinner />                             │
│  IF error: <ErrorMessage />                                 │
│       ↓                                                      │
│  Compute Eligible Actions:                                  │
│    resolveActions(rrf, user, permissions)                   │
│       ↓                                                      │
│  Render:                                                     │
│    - Common UI (split-panel, sections, print/export)        │
│    - Role-context action bar (dynamic buttons)              │
│    - Modals (dynamic based on selected action)              │
│       ↓                                                      │
│  User clicks action button                                  │
│       ↓                                                      │
│  Action handler dispatches:                                 │
│    - Edit → router.push('/hiring-manager/create-rrf?...')  │
│    - Approve → openModal('approve')                         │
│    - Close → openModal('close')                             │
│       ↓                                                      │
│  Modal submission → API call → Toast → Refresh OR Navigate  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Benefits of Unified Route

✅ **Single Source of Truth:** 1 file to maintain instead of 5  
✅ **Consistent UX:** Identical layout/styling for all roles  
✅ **Easier Testing:** Test action matrix in 1 place  
✅ **Notification Simplification:** No need for `notificationRoutes.js` resolver (backend can send `/requests/:id`)  
✅ **Future-Proof:** Adding new actions or roles = update 1 file  
✅ **Better Performance:** Code splitting at component level, not route level  

---

## 6. Component Architecture

### 6.1 Component Tree

```
UnifiedViewRRF (New)
├── useAuth() ──────────────────► { user, role, permissions }
├── useRRFDetail(id) ───────────► { rrf, loading, error, refresh }
├── useState: { activeSection, showModal, modalType, formData, isSubmitting }
│
├── IF loading ─────────────────► <LoadingSpinner />
├── IF error ───────────────────► <ErrorMessage error={error} />
│
├── <div> Split-Panel Layout
│   │
│   ├── LEFT PANEL (Sidebar)
│   │   ├── <h1> Job Title
│   │   ├── <StatusWithDetails rrf={rrf} />
│   │   ├── <InfoField label="RRF ID" value={displayId} />
│   │   ├── <InfoField label="Submitted" value={createdAt} />
│   │   ├── <SectionNavigation>
│   │   │   ├── Button: Requisition Info
│   │   │   ├── Button: Position Details
│   │   │   ├── Button: Technical
│   │   │   └── Button: Job Description
│   │   └── (end SectionNavigation)
│   │
│   ├── RIGHT PANEL (Content + Actions)
│   │   │
│   │   ├── HEADER (Action Bar)
│   │   │   ├── <ActionButtonBar> ─────► Dynamic based on resolveActions()
│   │   │   │   ├── IF canEdit ────────► <Button> Edit Request
│   │   │   │   ├── IF canApprove ─────► <Button> Approve
│   │   │   │   ├── IF canDecline ─────► <Button> Decline
│   │   │   │   ├── IF canHold ────────► <Button> On Hold
│   │   │   │   ├── IF canOpenForHiring► <Button> Open for Hiring
│   │   │   │   ├── IF canClose ───────► <Button> Close RRF
│   │   │   │   ├── IF canDelete ──────► <Button> Delete (Admin)
│   │   │   │   ├── <Button> Print ────► Always visible
│   │   │   │   └── <Button> Export PDF► Always visible
│   │   │   └── (end ActionButtonBar)
│   │   │
│   │   ├── CONTENT AREA
│   │   │   └── <RRFContentSections rrfData={rrf} activeSection={activeSection} />
│   │   │
│   │   └── MODALS (Conditional Rendering)
│   │       ├── IF showModal && modalType === 'approve' ───► <ApprovalModal>
│   │       ├── IF showModal && modalType === 'decline' ───► <DeclineModal>
│   │       ├── IF showModal && modalType === 'hold' ──────► <OnHoldModal>
│   │       ├── IF showModal && modalType === 'openForHiring'► <OpenForHiringModal>
│   │       └── IF showModal && modalType === 'close' ─────► <CloseRRFModal>
│   └── (end Split-Panel)
│
└── (end UnifiedViewRRF)
```

### 6.2 New Components to Create

| Component | Location | Purpose | Props |
|-----------|----------|---------|-------|
| **UnifiedViewRRF** | `app/requests/[id]/page.jsx` | Main unified route component | None (reads from URL params) |
| **ActionButtonBar** | `components/rrf/ActionButtonBar.jsx` | Dynamic action button renderer | `{ actions: Array, onActionClick: Function, rrf: Object }` |
| **ActionModal** | `components/rrf/ActionModal.jsx` | Unified modal for all actions | `{ modalType: String, isOpen: Boolean, onClose: Function, onSubmit: Function, rrf: Object }` |

### 6.3 Existing Components to Reuse

| Component | Current Usage | New Usage |
|-----------|---------------|-----------|
| **RRFContentSections** | Used by all 5 ViewRRF pages | Use in UnifiedViewRRF (no changes) |
| **InfoField** | Used everywhere | Use in UnifiedViewRRF (no changes) |
| **StatusWithDetails** | Used by HM, PMO, HR, Admin | Use in UnifiedViewRRF (no changes) |
| **LoadingSpinner** | Used everywhere | Use in UnifiedViewRRF (no changes) |
| **ErrorMessage** | Used everywhere | Use in UnifiedViewRRF (no changes) |

### 6.4 Hook Dependencies

| Hook | Purpose | Current Usage | New Usage |
|------|---------|---------------|-----------|
| **useAuth** | Get current user, role, permissions | All protected routes | UnifiedViewRRF (no changes) |
| **useRRFDetail** | Fetch RRF data | All ViewRRF pages | UnifiedViewRRF (no changes) |
| **useApproverRequests** | Approve/Decline/Hold APIs | Approver, Admin | UnifiedViewRRF (reuse approve/reject/hold methods) |
| **usePermission** | Permission utilities | Approver, Admin | UnifiedViewRRF (use `hasPermission()`) |

---

## 7. Action Resolver Design

### 7.1 Action Resolver Function

**Purpose:** Determine which action buttons to render based on user context + RRF state

**Function Signature:**
```javascript
/**
 * Resolve eligible actions for current user on given RRF
 * @param {Object} rrf - RRF data object
 * @param {Object} user - Current user from useAuth()
 * @param {Array} permissions - User permissions array
 * @returns {Object} - Action eligibility map
 */
function resolveActions(rrf, user, permissions) {
  return {
    canView: true,              // Always true (wouldn't be on page otherwise)
    canEdit: Boolean,
    canSubmit: Boolean,
    canResubmit: Boolean,
    canApprove: Boolean,
    canDecline: Boolean,
    canHold: Boolean,
    canOpenForHiring: Boolean,
    canClose: Boolean,
    canDelete: Boolean,
  }
}
```

### 7.2 Resolver Implementation (Pseudocode)

```javascript
// File: utils/rrfActionResolver.js

import { PERMISSIONS, hasPermission } from './permissions'

export const resolveActions = (rrf, user, permissions) => {
  if (!rrf || !user) {
    return { canView: false }
  }

  const status = rrf.status?.toLowerCase()
  const isCreator = rrf.createdById === user.id
  const isAssignedApprover = rrf.approvers?.some(a => a.userId === user.id)
  const role = user.role?.toUpperCase()

  // Permission flags
  const canUpdate = hasPermission(PERMISSIONS.RRF.UPDATE, permissions)
  const canApproveRRF = hasPermission(PERMISSIONS.APPROVALS.APPROVE, permissions)
  const canRejectRRF = hasPermission(PERMISSIONS.APPROVALS.REJECT, permissions)
  const canHoldRRF = hasPermission(PERMISSIONS.APPROVALS.ON_HOLD, permissions)
  const canOpenHiring = hasPermission(PERMISSIONS.RRF.OPEN_FOR_HIRING, permissions)
  const canCloseRRF = hasPermission(PERMISSIONS.RRF.CLOSE, permissions)
  const canDeleteRRF = hasPermission(PERMISSIONS.RRF.DELETE, permissions)

  // Status groups
  const EDITABLE_STATUSES = ['draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold']
  const PENDING_STATUSES = ['pending', 'submitted']
  const APPROVED_STATUS = 'approved'
  const CLOSEABLE_STATUSES_PMO = ['approved', 'in-progress', 'open-for-hiring']
  const CLOSEABLE_STATUSES_HR = ['in-progress', 'open-for-hiring']

  return {
    canView: true,

    // Edit: Creator OR Admin, in editable status
    canEdit: (isCreator || role === 'ADMIN') && 
             EDITABLE_STATUSES.includes(status) && 
             canUpdate,

    // Submit: Creator, draft status
    canSubmit: isCreator && 
               status === 'draft',

    // Resubmit: Creator OR Admin, declined/rejected/on-hold status
    canResubmit: (isCreator || role === 'ADMIN') && 
                 ['declined', 'rejected', 'on-hold'].includes(status) && 
                 canUpdate,

    // Approve: Assigned Approver OR Admin, pending status
    canApprove: (isAssignedApprover || role === 'ADMIN') && 
                PENDING_STATUSES.includes(status) && 
                canApproveRRF,

    // Decline: Assigned Approver OR Admin, pending status
    canDecline: (isAssignedApprover || role === 'ADMIN') && 
                PENDING_STATUSES.includes(status) && 
                canRejectRRF,

    // Hold: Assigned Approver OR Admin, pending status
    canHold: (isAssignedApprover || role === 'ADMIN') && 
             PENDING_STATUSES.includes(status) && 
             canHoldRRF,

    // Open for Hiring: PMO OR Admin, approved status
    canOpenForHiring: (role === 'PMO' || role === 'ADMIN') && 
                      status === APPROVED_STATUS && 
                      canOpenHiring,

    // Close: PMO/HR/Admin (different status rules)
    canClose: (
      (role === 'PMO' && CLOSEABLE_STATUSES_PMO.includes(status)) ||
      (role === 'HR' && CLOSEABLE_STATUSES_HR.includes(status)) ||
      (role === 'ADMIN' && CLOSEABLE_STATUSES_PMO.includes(status))
    ) && canCloseRRF,

    // Delete: Admin ONLY, draft status (best practice)
    canDelete: role === 'ADMIN' && 
               status === 'draft' && 
               canDeleteRRF,
  }
}
```

### 7.3 Action Button Renderer

**ActionButtonBar Component:**

```jsx
// File: components/rrf/ActionButtonBar.jsx

export function ActionButtonBar({ actions, onActionClick, rrf }) {
  const actionConfig = {
    edit: { label: 'Edit Request', icon: <EditOutlined />, color: 'blue' },
    approve: { label: 'Approve', icon: <CheckOutlined />, color: 'green' },
    decline: { label: 'Decline', icon: <CloseOutlined />, color: 'red' },
    hold: { label: 'On Hold', icon: <PauseOutlined />, color: 'amber' },
    openForHiring: { label: 'Open for Hiring', icon: <UnlockOutlined />, color: 'indigo' },
    close: { label: 'Close RRF', icon: <LockOutlined />, color: 'gray' },
    delete: { label: 'Delete', icon: <DeleteOutlined />, color: 'red' },
    print: { label: 'Print', icon: <PrinterOutlined />, color: 'gray' },
    exportPdf: { label: 'Export PDF', icon: <FilePdfOutlined />, color: 'gray' },
  }

  return (
    <div className="flex gap-2">
      {/* Workflow Actions */}
      {actions.canEdit && (
        <Button onClick={() => onActionClick('edit')} {...actionConfig.edit} />
      )}
     {actions.canApprove && (
        <Button onClick={() => onActionClick('approve')} {...actionConfig.approve} />
      )}
      {actions.canDecline && (
        <Button onClick={() => onActionClick('decline')} {...actionConfig.decline} />
      )}
      {actions.canHold && (
        <Button onClick={() => onActionClick('hold')} {...actionConfig.hold} />
      )}
      {actions.canOpenForHiring && (
        <Button onClick={() => onActionClick('openForHiring')} {...actionConfig.openForHiring} />
      )}
      {actions.canClose && (
        <Button onClick={() => onActionClick('close')} {...actionConfig.close} />
      )}
      {actions.canDelete && (
        <Button onClick={() => onActionClick('delete')} {...actionConfig.delete} />
      )}

      {/* Universal Actions (always visible) */}
      <Button onClick={() => onActionClick('print')} {...actionConfig.print} />
      <Button onClick={() => onActionClick('exportPdf')} {...actionConfig.exportPdf} />
    </div>
  )
}
```

### 7.4 Modal Type Mapping

**ActionModal Component:**

```jsx
// File: components/rrf/ActionModal.jsx

export function ActionModal({ modalType, isOpen, onClose, onSubmit, rrf }) {
  const modalConfig = {
    approve: {
      title: 'Approve Request',
      icon: <CheckCircleOutlined className="text-green-500" />,
      color: 'green',
      fields: [
        { name: 'comments', type: 'textarea', label: 'Comments (Optional)', required: false }
      ]
    },
    decline: {
      title: 'Decline Request',
      icon: <CloseCircleOutlined className="text-red-500" />,
      color: 'red',
      fields: [
        { name: 'reason', type: 'textarea', label: 'Decline Reason *', required: true }
      ]
    },
    hold: {
      title: 'Put on Hold',
      icon: <PauseCircleOutlined className="text-amber-500" />,
      color: 'amber',
      fields: [
        { name: 'reason', type: 'textarea', label: 'Hold Reason *', required: true }
      ]
    },
    openForHiring: {
      title: 'Open for Hiring',
      icon: <UnlockOutlined className="text-indigo-500" />,
      color: 'indigo',
      fields: []  // Confirm-only modal
    },
    close: {
      title: 'Close RRF',
      icon: <LockOutlined className="text-gray-500" />,
      color: 'gray',
      fields: [
        { name: 'closeStatus', type: 'select', label: 'Close Status *', required: true, 
          options: ['recruited', 'closed', 'cancelled'] },
        { name: 'candidateName', type: 'text', label: 'Candidate Name', required: 'conditional' },
        { name: 'joiningDate', type: 'date', label: 'Joining Date', required: 'conditional' },
        { name: 'remark', type: 'textarea', label: 'Remarks', required: false }
      ],
      validation: (data) => {
        if (data.closeStatus === 'recruited') {
          if (!data.candidateName || !data.joiningDate) {
            return 'Candidate name and joining date required for recruited status'
          }
        }
        return null
      }
    },
  }

  const config = modalConfig[modalType]
  if (!config) return null

  const [formData, setFormData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    // Validation
    const error = config.validation?.(formData)
    if (error) {
      toast.error(error)
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(modalType, formData)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={config.title} icon={config.icon}>
      <form onSubmit={handleSubmit}>
        {config.fields.map(field => (
          <FormField key={field.name} field={field} value={formData[field.name]} 
                     onChange={(val) => setFormData({...formData, [field.name]: val})} />
        ))}
        <div className="modal-actions">
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" loading={isSubmitting} color={config.color}>
            {config.title}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
```

---

## 8. Migration Strategy (Strangler Pattern)

### 8.1 Strangler Pattern Overview

**Definition:** Build new functionality alongside old code, gradually redirect traffic to new implementation, deprecate old code once stable.

**Why Strangler Pattern?**
- ✅ Zero downtime migration
- ✅ Gradual rollout (test with subset of users)
- ✅ Easy rollback (just stop redirecting)
- ✅ Parallel testing (compare old vs new)

### 8.2 Migration Phases

```
┌─────────────────────────────────────────────────────────────┐
│                  STRANGLER MIGRATION PHASES                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: BUILD (Weeks 1-2)                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  Create /requests/[id] route alongside existing routes      │
│  - Build UnifiedViewRRF component                           │
│  - Build ActionButtonBar component                          │
│  - Build ActionModal component                              │
│  - Build resolveActions() utility                           │
│  - Test in isolation (direct URL access)                    │
│                                                              │
│  Status: Old routes 100% traffic, New route 0% traffic      │
│                                                              │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│  PHASE 2: PARALLEL RUN (Week 3)                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  Update notificationRoutes.js to redirect 10% to /requests  │
│  - Monitor error rates, performance metrics                 │
│  - Compare UI consistency between old/new                   │
│  - Fix bugs in new route                                    │
│  - Gather user feedback                                     │
│                                                              │
│  Status: Old routes 90% traffic, New route 10% traffic      │
│                                                              │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│  PHASE 3: INCREMENTAL CUTOVER (Week 4)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  Gradually increase traffic to /requests                    │
│  - 10% → 25% → 50% → 75% → 100%                            │
│  - Monitor each increment for 1-2 days                      │
│  - Rollback to old route if critical bugs found             │
│                                                              │
│  Status: Old routes 0-90% traffic (decreasing)              │
│          New route 10-100% traffic (increasing)             │
│                                                              │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│  PHASE 4: DEPRECATION (Week 5)                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  - Update all internal links to /requests/[id]              │
│  - Add redirect from old routes to /requests/[id]           │
│  - Mark old routes as deprecated in code comments           │
│  - Update documentation                                     │
│                                                              │
│  Status: Old routes deprecated (redirect only)              │
│          New route 100% traffic                             │
│                                                              │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│  PHASE 5: CLEANUP (Week 6+)                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  - Keep old routes for 1-2 months (redirect only)           │
│  - Monitor for external links/bookmarks                     │
│  - Delete old ViewRRF page files                            │
│  - Remove notificationRoutes.js resolver (backend fix)      │
│                                                              │
│  Status: Old routes removed, New route canonical            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Traffic Routing Implementation

**Option A: NotificationRoutes.js Enhancement (Quick Win)**

```javascript
// File: utils/notificationRoutes.js

const ENABLE_UNIFIED_ROUTE = process.env.NEXT_PUBLIC_ENABLE_UNIFIED_RRF === 'true'
const UNIFIED_ROUTE_PERCENTAGE = parseInt(process.env.NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE || '0')

export function resolveNotificationRoute(notification, user) {
  // ... existing logic ...

  // Strangler Pattern: Gradually redirect to /requests/[id]
  if (ENABLE_UNIFIED_ROUTE && RRF_ROUTE_PATTERN.test(actionUrl)) {
    const match = actionUrl.match(RRF_ROUTE_PATTERN)
    const rrfId = match[1]

    // Random percentage-based routing
    const random = Math.random() * 100
    if (random < UNIFIED_ROUTE_PERCENTAGE) {
      return `/requests/${rrfId}`
    }
  }

  // ... existing role-based routing ...
}
```

**Environment Variables:**
- `NEXT_PUBLIC_ENABLE_UNIFIED_RRF=true` (enable Strangler Pattern)
- `NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE=10` (start at 10%, gradually increase to 100)

**Option B: Backend Notification Update (Long-Term Fix)**

```typescript
// File: rrf-portal-backend/src/notifications/notification-template.service.ts

// OLD:
actionUrl: `/pmo/view-rrf/${rrfId}`

// NEW:
actionUrl: `/requests/${rrfId}`
```

**Backend change = NOT in scope for this refactor** (frontend-only constraint). Use Option A for migration.

### 8.4 Rollback Plan

**IF critical bugs found in unified route:**

1. **Immediate:** Set `NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE=0` (stops new traffic)
2. **Existing Users:** Old route still functional (no disruption)
3. **Fix bugs** in UnifiedViewRRF
4. **Retest** with `PERCENTAGE=10`
5. **Resume** migration

**Rollback Trigger Conditions:**
- Error rate > 5% on /requests route
- User complaints about missing actions
- Performance degradation (page load > 3 seconds)
- Data integrity issues (wrong RRF displayed)

### 8.5 Testing Strategy Per Phase

#### Phase 1: Isolated Testing
- **Manual:** Access `/requests/42` directly for each role
- **Test Cases:**
  - HM with draft RRF (edit button visible)
  - Approver with pending RRF (approve/decline/hold buttons)
  - PMO with approved RRF (open for hiring button)
  - HR with in-progress RRF (close button)
  - Admin with any RRF (all relevant buttons)
- **Metrics:** No console errors, correct buttons rendered, modals work, actions succeed

#### Phase 2: A/B Testing (10% traffic)
- **Setup:** Set `UNIFIED_RRF_PERCENTAGE=10`
- **Monitor:** Error logs, API failures, user session recordings
- **Compare:** Old route vs new route (UI consistency, action success rate)
- **Metrics:**
  - Error rate < 1%
  - Action success rate > 95%
  - Page load time < 2 seconds

#### Phase 3: Incremental Rollout
- **25%:** Monitor for 2 days → If stable, continue
- **50%:** Monitor for 2 days → If stable, continue
- **75%:** Monitor for 2 days → If stable, continue
- **100%:** Monitor for 1 week → Declare stable

#### Phase 4: Deprecation Testing
- **Old Route Redirects:** Verify `/hiring-manager/view-rrf/42` → `/requests/42`
- **Bookmark Testing:** Test old URLs still work (via redirect)
- **Documentation:** Update all docs to reference `/requests/[id]`

#### Phase 5: Cleanup Validation
- **Link Audit:** Grep codebase for old route references
- **User Feedback:** No complaints about broken links
- **Analytics:** Zero traffic to old routes (after 1-2 months)

---

## 9. Risk Analysis

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Action resolver logic bug** (wrong buttons shown) | Medium | High | - Extensive unit tests for `resolveActions()`<br>- Manual testing for all role+status combinations<br>- Gradual rollout (10% → 100%) |
| **Permission check bypass** (unauthorized actions) | Low | Critical | - Reuse existing `usePermission` hook (proven secure)<br>- Backend still enforces (defense in depth)<br>- Code review with security focus |
| **Modal state conflicts** (wrong modal opens) | Low | Medium | - Clear `modalType` state management<br>- Reset state on modal close<br>- TypeScript for type safety |
| **Print/Export PDF regression** (broken exports) | Medium | Medium | - Copy exact logic from existing ViewRRF pages<br>- Test PDF generation for all roles<br>- Verify `no-print` classes work |
| **Performance degradation** (slow page load) | Low | Medium | - Code splitting for modals (lazy load)<br>- Optimize `resolveActions()` (memoize)<br>- Monitor Core Web Vitals |
| **Notification routing confusion** during migration | Medium | High | - Keep `notificationRoutes.js` during Strangler Pattern<br>- Gradually increase percentage<br>- Clear error messages if wrong route |

### 9.2 User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Broken bookmarks** (old URLs) | High | Low | - Implement redirects from old routes to `/requests/[id]`<br>- Keep redirects for 2-3 months<br>- In-app notifications about new URLs |
| **Confusion about new URL** | Medium | Low | - No visible change (same UI, same actions)<br>- Update documentation<br>- Training for power users |
| **Missing actions** (user expects button, not there) | Medium | High | - Match exact action matrix from old routes<br>- Add visibility logging (which buttons rendered)<br>- User feedback loop |
| **Inconsistent UI** across roles | Low | Medium | - Use same components (`RRFContentSections`, `InfoField`)<br>- Consistent action button styling<br>- Visual regression testing |

### 9.3 Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Scope creep** (backend changes requested) | Medium | High | - **Strict constraint:** Frontend-only refactor<br>- Document backend changes as "Future Work"<br>- Reject scope expansion |
| **Migration takes too long** (>6 weeks) | Medium | Medium | - Time-box each phase (1-2 weeks max)<br>- Skip perfection, iterate post-launch<br>- Rollback if blocked |
| **Insufficient testing** (bugs in production) | Medium | High | - Mandatory testing checklist (see 11.1)<br>- Gradual rollout (catch bugs at 10% traffic)<br>- Easy rollback plan |
| **Team knowledge gap** (only 1 person knows new code) | High | Medium | - Document everything (this file + code comments)<br>- Pair programming during implementation<br>- Knowledge transfer session |

---

## 10. File Impact Analysis

### 10.1 New Files to Create

| File Path | Type | LOC (Est.) | Purpose |
|-----------|------|------------|---------|
| `app/requests/[id]/page.jsx` | React Component | ~400 | Unified ViewRRF route |
| `components/rrf/ActionButtonBar.jsx` | React Component | ~80 | Dynamic action button renderer |
| `components/rrf/ActionModal.jsx` | React Component | ~200 | Unified modal for all actions |
| `utils/rrfActionResolver.js` | Utility | ~120 | Action eligibility logic |
| `components/rrf/ActionButton.jsx` (optional) | React Component | ~30 | Styled button wrapper |
| **TOTAL** | | **~830** | |

### 10.2 Existing Files to Modify

| File Path | Change Type | Reason |
|-----------|-------------|--------|
| `utils/notificationRoutes.js` | **Enhance** | Add Strangler Pattern percentage-based routing |
| `lib/api/rrfApi.js` | **No Change** (maybe minor exports) | Already exports all needed methods |
| `hooks/useRRFDetail.js` | **No Change** | Already works for all roles |
| `hooks/useApproverRequests.js` | **No Change** | Already exports approve/reject/hold |
| `hooks/usePermission.js` | **No Change** | Already exports `hasPermission()` |
| `components/RRFContentSections.jsx` | **No Change** | Already universal |
| `components/StatusWithDetails.jsx` | **No Change** | Already universal |

### 10.3 Files to Deprecate (Phase 5)

| File Path | When to Delete | Replacement |
|-----------|----------------|-------------|
| `app/hiring-manager/view-rrf/[id]/page.jsx` | After 100% migration + 2 months | `app/requests/[id]/page.jsx` |
| `app/approver/view-rrf/[id]/page.jsx` | After 100% migration + 2 months | `app/requests/[id]/page.jsx` |
| `app/pmo/view-rrf/[id]/page.jsx` | After 100% migration + 2 months | `app/requests/[id]/page.jsx` |
| `app/hr/view-rrf/[id]/page.jsx` | After 100% migration + 2 months | `app/requests/[id]/page.jsx` |
| `app/admin/rrf-management/[id]/page.jsx` | After 100% migration + 2 months | `app/requests/[id]/page.jsx` |
| `utils/notificationRoutes.js` | **KEEP** until backend sends `/requests/[id]` | Backend notification update |

### 10.4 Documentation to Update

| Document | Change Required |
|----------|-----------------|
| `README.md` | Update route references to `/requests/[id]` |
| `FRONTEND_IMPLEMENTATION_SUMMARY.md` | Add unified route section |
| `QUICK_START.md` | Update ViewRRF screenshots/steps |
| `docs/features/*.md` | Update any route references |
| `.env.example` | Add `NEXT_PUBLIC_ENABLE_UNIFIED_RRF`, `NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE` |

---

## 11. Test Coverage Matrix

### 11.1 Action Eligibility Test Cases

**Test ID Format:** `TE-{Action}-{Role}-{Status}-{Expected}`

| Test ID | Role | Status | Ownership | Expected Actions | Permissions Required |
|---------|------|--------|-----------|------------------|---------------------|
| TE-EDIT-HM-DRAFT-PASS | HM | draft | Creator | canEdit=true | RRF.UPDATE |
| TE-EDIT-HM-PENDING-PASS | HM | pending | Creator | canEdit=true | RRF.UPDATE |
| TE-EDIT-HM-APPROVED-FAIL | HM | approved | Creator | canEdit=false | N/A |
| TE-EDIT-ADMIN-DECLINED-PASS | Admin | declined | Not creator | canEdit=true | RRF.UPDATE |
| TE-APPROVE-APPR-PENDING-PASS | Approver | pending | Assigned approver | canApprove=true | APPROVALS.APPROVE |
| TE-APPROVE-APPR-APPROVED-FAIL | Approver | approved | Assigned approver | canApprove=false | N/A |
| TE-APPROVE-HM-PENDING-FAIL | HM | pending | Creator | canApprove=false | N/A |
| TE-DECLINE-APPR-PENDING-PASS | Approver | pending | Assigned approver | canDecline=true | APPROVALS.REJECT |
| TE-HOLD-APPR-PENDING-PASS | Approver | pending | Assigned approver | canHold=true | APPROVALS.ON_HOLD |
| TE-OPEN-PMO-APPROVED-PASS | PMO | approved | N/A | canOpenForHiring=true | RRF.OPEN_FOR_HIRING |
| TE-OPEN-PMO-PENDING-FAIL | PMO | pending | N/A | canOpenForHiring=false | N/A |
| TE-CLOSE-PMO-APPROVED-PASS | PMO | approved | N/A | canClose=true | RRF.CLOSE |
| TE-CLOSE-HR-INPROGRESS-PASS | HR | in-progress | N/A | canClose=true | RRF.CLOSE |
| TE-CLOSE-HR-APPROVED-FAIL | HR | approved | N/A | canClose=false | N/A |
| TE-DELETE-ADMIN-DRAFT-PASS | Admin | draft | N/A | canDelete=true | RRF.DELETE |
| TE-DELETE-ADMIN-APPROVED-FAIL | Admin | approved | N/A | canDelete=false | N/A |

**Total Test Cases:** 60+ (15 shown above × multiple permission combinations)

### 11.2 UI Rendering Test Cases

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| UI-LOADING | Page accessed, data loading | LoadingSpinner visible, no content |
| UI-ERROR | API error (404, 500) | ErrorMessage visible with retry button |
| UI-SUCCESS | Data loaded | Split-panel visible, sections rendered |
| UI-SECTIONS | Click section navigation | Content switches (requisition → position → technical → description) |
| UI-PRINT | Click Print button | Browser print dialog opens, `no-print` elements hidden |
| UI-EXPORT | Click Export PDF | PDF downloads with correct filename, content matches screen |
| UI-MODAL-OPEN | Click action button (approve/decline/close) | Modal opens with correct title, fields, styling |
| UI-MODAL-CLOSE | Click Cancel in modal | Modal closes, no state changes |
| UI-MODAL-SUBMIT | Fill modal, click submit | API called, toast shows, data refreshed |

### 11.3 Modal Validation Test Cases

| Test ID | Modal Type | Invalid Input | Expected Error |
|---------|------------|---------------|----------------|
| MV-DECLINE-EMPTY | Decline | Reason = "" | "Decline reason is required" |
| MV-HOLD-EMPTY | On Hold | Reason = "" | "Hold reason is required" |
| MV-CLOSE-RECRUITED-NONAME | Close RRF | Status=recruited, candidateName="" | "Candidate name required for recruited status" |
| MV-CLOSE-RECRUITED-NODATE | Close RRF | Status=recruited, joiningDate="" | "Joining date required for recruited status" |
| MV-CLOSE-CANCELLED-OK | Close RRF | Status=cancelled, no candidate | Success (candidate fields optional) |

### 11.4 API Integration Test Cases

| Test ID | Action | API Endpoint | Expected Response | UI Update |
|---------|--------|--------------|-------------------|-----------|
| API-APPROVE | Approve | POST /rrf/:id/approve | 200 OK | Toast success, status → approved, navigate to approver list |
| API-DECLINE | Decline | POST /rrf/:id/decline | 200 OK | Toast success, status → declined, navigate to approver list |
| API-HOLD | On Hold | POST /rrf/:id/on-hold | 200 OK | Toast success, status → on-hold, navigate to approver list |
| API-OPEN | Open for Hiring | POST /rrf/:id/open-for-hiring | 200 OK | Toast success, status → in-progress, navigate to PMO list |
| API-CLOSE | Close RRF | POST /rrf/:id/close | 200 OK | Toast success, status → closed, navigate to PMO/HR list |
| API-ERROR | Any action | POST /rrf/:id/* | 400/500 Error | Toast error with message, modal stays open |

### 11.5 Permission Guard Test Cases

| Test ID | User Permissions | RRF Status | Action Attempted | Expected Result |
|---------|------------------|------------|------------------|-----------------|
| PG-NO-APPROVE | APPROVALS.APPROVE missing | pending | Click Approve button | Button NOT rendered |
| PG-NO-CLOSE | RRF.CLOSE missing | in-progress | Click Close button | Button NOT rendered |
| PG-ADMIN-ALL | All permissions | Any | All eligible actions | All buttons rendered |
| PG-HM-LIMITED | RRF.CREATE, RRF.UPDATE only | draft | Edit only | Only Edit button rendered |

### 11.6 Regression Test Cases

| Test ID | Old Route | New Route | Test Scenario |
|---------|-----------|-----------|---------------|
| REG-HM-EDIT | /hiring-manager/view-rrf/42 | /requests/42 | HM with draft RRF sees Edit button, clicks, redirects to create-rrf |
| REG-APPR-APPROVE | /approver/view-rrf/42 | /requests/42 | Approver with pending RRF sees Approve/Decline/Hold, approves successfully |
| REG-PMO-OPEN | /pmo/view-rrf/42 | /requests/42 | PMO with approved RRF sees Open for Hiring, opens successfully |
| REG-HR-CLOSE | /hr/view-rrf/42 | /requests/42 | HR with in-progress RRF sees Close, closes with candidate details |
| REG-ADMIN-ALL | /admin/rrf-management/42 | /requests/42 | Admin sees all relevant buttons based on status |

**Regression Testing Strategy:**
1. Test old route (screenshot, record actions)
2. Test new route (same RRF, same user)
3. Compare: buttons, sections, modals, API calls
4. Assert: Identical behavior

---

## 12. No-Touch Zones

### 12.1 Backend (STRICT NO-TOUCH)

**Forbidden Changes:**
- ❌ `rrf-portal-backend/src/rrf/**/*.ts` (RRF module)
- ❌ `rrf-portal-backend/src/notifications/**/*.ts` (Notification system)
- ❌ `rrf-portal-backend/src/auth/**/*.ts` (Auth/permissions)
- ❌ Database migrations
- ❌ API endpoint signatures

**Rationale:**
- User constraint: "NO backend changes"
- Strangler Pattern allows frontend-only migration
- Backend notification fix = "Future Work" (Phase 6+)

### 12.2 Existing Hooks (Minimal Touch)

**Use AS-IS:**
- ✅ `useRRFDetail.js` (no changes)
- ✅ `useApproverRequests.js` (no changes)
- ✅ `usePermission.js` (no changes)
- ✅ `useAuth.js` (no changes)

**Why:** These hooks are battle-tested, used by existing routes. Any changes = risk of breaking current functionality.

### 12.3 Shared Components (Minimal Touch)

**Use AS-IS:**
- ✅ `RRFContentSections.jsx` (no changes)
- ✅ `InfoField.jsx` (no changes)
- ✅ `StatusWithDetails.jsx` (no changes)
- ✅ `LoadingSpinner.jsx` (no changes)
- ✅ `ErrorMessage.jsx` (no changes)

**Why:** These components are universal, work for all roles. Reuse = consistency.

### 12.4 Old ViewRRF Routes (Keep During Migration)

**Do NOT delete until Phase 5:**
- ⚠️ `app/hiring-manager/view-rrf/[id]/page.jsx`
- ⚠️ `app/approver/view-rrf/[id]/page.jsx`
- ⚠️ `app/pmo/view-rrf/[id]/page.jsx`
- ⚠️ `app/hr/view-rrf/[id]/page.jsx`
- ⚠️ `app/admin/rrf-management/[id]/page.jsx`

**Why:** Strangler Pattern requires parallel existence. Users with bookmarks, notifications still use old routes.

### 12.5 Permission System (Read-Only)

**Do NOT modify:**
- ❌ `utils/permissions.js` → `PERMISSIONS` object
- ❌ Backend `permissions.entity.ts`

**Why:** Permission codes are shared contract between frontend/backend. Changes = breaking change.

---

## 13. Implementation Steps

### 13.1 Phase 1: Build Unified Route (Week 1-2)

#### Step 1.1: Create Action Resolver
**File:** `utils/rrfActionResolver.js`

```bash
# Create file
touch rrf-portal-nextjs/utils/rrfActionResolver.js
```

**Content:** (See section 7.2 for full implementation)

**Testing:**
```javascript
// Test in browser console or Node.js REPL
import { resolveActions } from './rrfActionResolver'

const mockRRF = { status: 'pending', createdById: 1, approvers: [{ userId: 2 }] }
const mockUser = { id: 2, role: 'APPROVER' }
const mockPermissions = ['APPROVALS.APPROVE', 'APPROVALS.REJECT']

const actions = resolveActions(mockRRF, mockUser, mockPermissions)
console.log(actions)
// Expected: { canView: true, canApprove: true, canDecline: true, ... }
```

#### Step 1.2: Create ActionButtonBar Component
**File:** `components/rrf/ActionButtonBar.jsx`

```bash
# Create directory if not exists
mkdir -p rrf-portal-nextjs/components/rrf

# Create file
touch rrf-portal-nextjs/components/rrf/ActionButtonBar.jsx
```

**Content:** (See section 7.3 for full implementation)

**Testing:** Storybook story or standalone page

#### Step 1.3: Create ActionModal Component
**File:** `components/rrf/ActionModal.jsx`

```bash
touch rrf-portal-nextjs/components/rrf/ActionModal.jsx
```

**Content:** (See section 7.4 for full implementation)

**Testing:** Test all modal types (approve, decline, hold, openForHiring, close)

#### Step 1.4: Create Unified ViewRRF Page
**File:** `app/requests/[id]/page.jsx`

```bash
mkdir -p rrf-portal-nextjs/app/requests/[id]
touch rrf-portal-nextjs/app/requests/[id]/page.jsx
```

**Pseudocode:**
```jsx
'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRRFDetail } from '@/hooks/useRRFDetail'
import { useApproverRequests } from '@/hooks/useApproverRequests'
import { resolveActions } from '@/utils/rrfActionResolver'
import { ActionButtonBar } from '@/components/rrf/ActionButtonBar'
import { ActionModal } from '@/components/rrf/ActionModal'
import { RRFContentSections } from '@/components/RRFContentSections'
import { StatusWithDetails } from '@/components/StatusWithDetails'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { InfoField } from '@/components/InfoField'
import rrfApi from '@/lib/api/rrfApi'
import toast from 'react-hot-toast'

export default function UnifiedViewRRF() {
  const params = useParams()
  const router = useRouter()
  const { user, permissions } = useAuth()
  const { rrf, loading, error, refresh } = useRRFDetail(params.id)
  const { approveRequest, rejectRequest, putOnHold } = useApproverRequests()

  const [activeSection, setActiveSection] = useState('requisition')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Resolve eligible actions
  const actions = resolveActions(rrf, user, permissions)

  // Action handler
  const handleActionClick = useCallback((actionType) => {
    if (actionType === 'edit') {
      router.push(`/hiring-manager/create-rrf?draftId=${rrf.id}`)
    } else if (actionType === 'print') {
      window.print()
    } else if (actionType === 'exportPdf') {
      handleExportPDF()
    } else {
      setModalType(actionType)
      setShowModal(true)
    }
  }, [rrf, router])

  // Modal submit handler
  const handleModalSubmit = useCallback(async (actionType, formData) => {
    setIsSubmitting(true)
    try {
      if (actionType === 'approve') {
        await approveRequest(rrf.id, formData.comments)
        toast.success('RRF Approved')
      } else if (actionType === 'decline') {
        await rejectRequest(rrf.id, formData.reason)
        toast.success('RRF Declined')
      } else if (actionType === 'hold') {
        await putOnHold(rrf.id, formData.reason)
        toast.success('RRF Put on Hold')
      } else if (actionType === 'openForHiring') {
        await rrfApi.openForHiring(rrf.id)
        toast.success('RRF Opened for Hiring')
      } else if (actionType === 'close') {
        await rrfApi.close(rrf.id, formData)
        toast.success('RRF Closed')
      }
      refresh()
      setShowModal(false)
    } catch (err) {
      throw err  // Let ActionModal handle error toast
    } finally {
      setIsSubmitting(false)
    }
  }, [rrf, approveRequest, rejectRequest, putOnHold, refresh])

  // Print/Export logic (copy from existing ViewRRF)
  const handleExportPDF = async () => {
    // ... (identical to existing implementation)
  }

  if (loading) return <LoadingSpinner />
  if (error || !rrf) return <ErrorMessage error={error} />

  return (
    <div className="h-screen flex">
      {/* LEFT PANEL */}
      <div className="w-80 border-r bg-gray-50 p-6 overflow-y-auto screen-hidden">
        <h1 className="text-2xl font-bold mb-4">{rrf.positionTitle}</h1>
        <StatusWithDetails rrf={rrf} />
        <InfoField label="RRF ID" value={rrf.displayId} />
        <InfoField label="Submitted" value={new Date(rrf.createdAt).toLocaleDateString()} />
        
        {/* Section Navigation */}
        <div className="mt-6 space-y-2">
          <button onClick={() => setActiveSection('requisition')}>Requisition Info</button>
          <button onClick={() => setActiveSection('position')}>Position Details</button>
          <button onClick={() => setActiveSection('technical')}>Technical</button>
          <button onClick={() => setActiveSection('description')}>Job Description</button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ACTION BAR */}
        <div className="border-b p-4 bg-white">
          <ActionButtonBar actions={actions} onActionClick={handleActionClick} rrf={rrf} />
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          <RRFContentSections rrfData={rrf} activeSection={activeSection} />
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <ActionModal
          modalType={modalType}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleModalSubmit}
          rrf={rrf}
        />
      )}
    </div>
  )
}
```

**Testing:** Manual testing for each role (see 11.1)

### 13.2 Phase 2: Enable Strangler Pattern (Week 3)

#### Step 2.1: Update notificationRoutes.js

**File:** `utils/notificationRoutes.js`

**Add:**
```javascript
const ENABLE_UNIFIED_ROUTE = process.env.NEXT_PUBLIC_ENABLE_UNIFIED_RRF === 'true'
const UNIFIED_ROUTE_PERCENTAGE = parseInt(process.env.NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE || '0')

export function resolveNotificationRoute(notification, user) {
  const { actionUrl } = notification
  
  // Strangler Pattern: Gradually redirect to /requests/[id]
  if (ENABLE_UNIFIED_ROUTE && RRF_ROUTE_PATTERN.test(actionUrl)) {
    const match = actionUrl.match(RRF_ROUTE_PATTERN)
    const rrfId = match[1]
    
    const random = Math.random() * 100
    if (random < UNIFIED_ROUTE_PERCENTAGE) {
      return `/requests/${rrfId}`
    }
  }

  // ... existing logic ...
}
```

#### Step 2.2: Update .env

**File:** `.env.local`

```bash
NEXT_PUBLIC_ENABLE_UNIFIED_RRF=true
NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE=10
```

#### Step 2.3: Monitor and Adjust

**Metrics to Monitor:**
- Error rate on `/requests/*` routes
- User feedback (support tickets)
- Page load performance

**Adjustment Plan:**
- If error rate < 1%: Increase to 25% after 2 days
- If error rate > 5%: Rollback to 0%, fix bugs, retry
- If performance issues: Optimize components, lazy load modals

### 13.3 Phase 3: Incremental Cutover (Week 4)

#### Step 3.1: Gradual Percentage Increase

**Schedule:**
- Day 1-2: 10%
- Day 3-4: 25%
- Day 5-7: 50%
- Day 8-10: 75%
- Day 11-14: 100%

**Update .env at each step:**
```bash
NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE=25  # Day 3
NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE=50  # Day 5
NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE=75  # Day 8
NEXT_PUBLIC_UNIFIED_RRF_PERCENTAGE=100 # Day 11
```

#### Step 3.2: Monitor Each Increment

**Checklist per increment:**
- [ ] Error rate < 1%
- [ ] No support tickets about missing actions
- [ ] Page load time < 2 seconds
- [ ] Action success rate > 95%
- [ ] PDF exports work

**Rollback trigger:** Any checklist item fails

### 13.4 Phase 4: Deprecate Old Routes (Week 5)

#### Step 4.1: Add Redirects

**Create:** `app/hiring-manager/view-rrf/[id]/page.jsx` (replace content)

```jsx
'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Redirect() {
  const params = useParams()
  const router = useRouter()
  
  useEffect(() => {
    router.replace(`/requests/${params.id}`)
  }, [params.id, router])
  
  return <div>Redirecting...</div>
}
```

**Repeat for:**
- `app/approver/view-rrf/[id]/page.jsx`
- `app/pmo/view-rrf/[id]/page.jsx`
- `app/hr/view-rrf/[id]/page.jsx`
- `app/admin/rrf-management/[id]/page.jsx`

#### Step 4.2: Update Documentation

**Files to update:**
- `README.md` (replace old routes with `/requests/[id]`)
- `docs/features/*.md` (find/replace route references)
- `FRONTEND_RBAC_MIGRATION_GUIDE.md` (add unified route section)

#### Step 4.3: Update Internal Links

**Search codebase:**
```bash
grep -r "/hiring-manager/view-rrf" rrf-portal-nextjs/
grep -r "/approver/view-rrf" rrf-portal-nextjs/
grep -r "/pmo/view-rrf" rrf-portal-nextjs/
grep -r "/hr/view-rrf" rrf-portal-nextjs/
grep -r "/admin/rrf-management" rrf-portal-nextjs/
```

**Replace with:**
```javascript
// OLD:
router.push(`/hiring-manager/view-rrf/${id}`)

// NEW:
router.push(`/requests/${id}`)
```

### 13.5 Phase 5: Cleanup (Week 6+)

#### Step 5.1: Monitor for External Links

**Wait:** 1-2 months with redirects active

**Check:**
- Server logs for old route traffic
- User feedback about broken links
- Support tickets

**Decision:** If zero traffic to old routes for 2 weeks → proceed to delete

#### Step 5.2: Delete Old ViewRRF Files

```bash
# Backup first
git checkout -b cleanup/remove-old-viewrrf-routes

# Delete files
rm rrf-portal-nextjs/app/hiring-manager/view-rrf/[id]/page.jsx
rm rrf-portal-nextjs/app/approver/view-rrf/[id]/page.jsx
rm rrf-portal-nextjs/app/pmo/view-rrf/[id]/page.jsx
rm rrf-portal-nextjs/app/hr/view-rrf/[id]/page.jsx
rm rrf-portal-nextjs/app/admin/rrf-management/[id]/page.jsx

# Commit
git add .
git commit -m "chore: Remove deprecated ViewRRF routes (replaced by /requests/:id)"
```

#### Step 5.3: Remove Strangler Pattern Code

**File:** `utils/notificationRoutes.js`

**Remove:**
```javascript
// Remove these lines (no longer needed after 100% migration)
const ENABLE_UNIFIED_ROUTE = ...
const UNIFIED_ROUTE_PERCENTAGE = ...
if (ENABLE_UNIFIED_ROUTE && ...) { ... }
```

**OR:** Keep for future backend migration (when backend sends `/requests/:id` directly)

#### Step 5.4: Final Documentation Update

**Update:**
- `CHANGELOG.md` (add entry about unified route)
- `docs/UNIFIED_VIEW_RRF_IMPLEMENTATION_PLAN.md` (mark as COMPLETE)
- `README.md` (remove any "migration in progress" notes)

---

## Appendices

### Appendix A: Action Code Examples

**Edit Action:**
```javascript
if (actions.canEdit) {
  router.push(`/hiring-manager/create-rrf?draftId=${rrf.id}`)
}
```

**Approve Action:**
```javascript
await approveRequest(rrf.id, formData.comments)
toast.success('Request Approved Successfully')
refresh()  // Reload RRF data
```

**Close Action:**
```javascript
await rrfApi.close(rrf.id, {
  closeStatus: formData.closeStatus,
  candidateName: formData.candidateName,
  joiningDate: formData.joiningDate,
  remark: formData.remark
})
toast.success('RRF Closed Successfully')
router.push('/pmo/open-positions')  // Or /hr/dashboard
```

### Appendix B: Status Enum Reference

**Backend RrfStatus Enum:**
```typescript
export enum RrfStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SUBMITTED = 'submitted',       // Alias for PENDING
  APPROVED = 'approved',
  DECLINED = 'declined',
  REJECTED = 'rejected',         // Alias for DECLINED
  ON_HOLD = 'on-hold',
  IN_PROGRESS = 'in-progress',   // After PMO opens for hiring
  OPEN_FOR_HIRING = 'open-for-hiring',  // Deprecated (use IN_PROGRESS)
  CLOSED_BY_BENCH = 'closed-by-bench',
  CLOSED = 'closed',
}
```

**Frontend Status Mapping:**
```javascript
const STATUS_LABELS = {
  'draft': 'Draft',
  'pending': 'Pending Approval',
  'submitted': 'Pending Approval',
  'approved': 'Approved',
  'declined': 'Declined',
  'rejected': 'Declined',
  'on-hold': 'On Hold',
  'in-progress': 'In Progress',
  'open-for-hiring': 'Open for Hiring',
  'closed-by-bench': 'Closed (Bench)',
  'closed': 'Closed',
}
```

### Appendix C: Permission Code Reference

**RRF Permissions:**
- `RRF.CREATE` - Create draft RRF
- `RRF.READ` - View RRF details
- `RRF.UPDATE` - Edit RRF (draft/declined state)
- `RRF.DELETE` - Delete RRF (Admin)
- `RRF.OPEN_FOR_HIRING` - Open for hiring action
- `RRF.FILL_FROM_BENCH` - Fill from bench (excluded)
- `RRF.CLOSE` - Close RRF

**Approval Permissions:**
- `APPROVALS.READ` - View pending approvals
- `APPROVALS.APPROVE` - Approve RRF
- `APPROVALS.REJECT` - Decline RRF
- `APPROVALS.ON_HOLD` - Put RRF on hold

**Report Permissions:**
- `REPORTS.READ` - View reports
- `REPORTS.EXPORT` - Export reports

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **Strangler Pattern** | Incremental migration by building new alongside old, gradually redirecting traffic |
| **Action Resolver** | Function that determines eligible actions based on user context + RRF state |
| **Permission-Based Access Control (PBAC)** | Access control based on permission codes, not roles |
| **Role-Based Access Control (RBAC)** | Access control based on user roles (legacy pattern) |
| **Workflow Actor** | User who can perform workflow actions (HM, Approver, PMO, HR) |
| **Editable Status** | RRF status that allows editing (draft, pending, declined, rejected, on-hold) |
| **Actionable Status** | RRF status that enables specific workflow actions (pending → approve/decline) |
| **Unified Route** | Single route (`/requests/[id]`) that works for all roles |
| **Split-Panel UI** | Layout with fixed sidebar (metadata) and scrollable content area |
| **Action Eligibility** | Whether user can perform action based on role + status + ownership + permissions |

---

## Conclusion

This implementation plan provides a **comprehensive blueprint** for migrating 5 duplicated ViewRRF pages to a single unified route using the **Strangler Pattern**. The plan:

✅ **Analyzes** existing architecture (5 routes, ~2,560 LOC duplication)  
✅ **Documents** action matrix (10 actions × 5 roles × status conditions)  
✅ **Designs** unified component architecture (ActionButtonBar, ActionModal, resolveActions)  
✅ **Defines** migration strategy (6 phases, gradual 10% → 100% rollout)  
✅ **Identifies** risks and mitigation (testing, rollback, monitoring)  
✅ **Maps** file impacts (4 new files, 10 deprecated files, 0 backend changes)  
✅ **Specifies** test coverage (60+ test cases, regression matrix)  
✅ **Respects** constraints (frontend-only, no backend/DB/workflow changes)  

**Next Steps:**
1. **Review** this plan with team
2. **Create** GitHub project board with tasks from Section 13
3. **Start** Phase 1 implementation (Week 1-2)
4. **DO NOT IMPLEMENT** without approval (this is READ-ONLY analysis document)

**Estimated Effort:**
- **Development:** 3-4 weeks (1 developer)
- **Testing:** 1-2 weeks (parallel)
- **Migration:** 1 week (gradual rollout)
- **Total:** 5-6 weeks

**Success Criteria:**
- ✅ Zero user disruption during migration
- ✅ All 10 actions work for all 5 roles
- ✅ Error rate < 1% on new route
- ✅ 80% code reduction (2,560 LOC → ~800 LOC)
- ✅ Consistent UX across all roles
- ✅ Easy to add new actions/roles in future

---

**END OF DOCUMENT**
