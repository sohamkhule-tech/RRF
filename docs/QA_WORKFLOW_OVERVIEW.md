# Datafortune — RRF Portal
## QA Workflow Overview

**Version:** 1.0 | **Date:** May 2026 | **Audience:** QA / Testing Team

---

## 1. Project Overview

The **RRF Portal** (Resource Requisition Request Portal) is an internal enterprise web application used to manage the end-to-end process of raising, approving, and fulfilling resource requests for open positions.

A **Hiring Manager** raises a request → it goes through an **approval chain** → once approved, **Talent Acquisition** sources or assigns a candidate → the request is eventually closed when the position is filled.

The system enforces **role-based access**, meaning each user can only see and perform actions permitted to their role.

---

## 2. User Roles

| Role | What They Can Do |
|---|---|
| **Administrator** | Manages users, roles, and permissions. Seeds master data (functions, business units). Cannot raise RRFs. |
| **Hiring Manager (HM)** | Creates and submits RRF requests. Can edit draft/sent-back requests. Views own RRF history. |
| **PMO** | Reviews all submitted RRFs. Provides oversight and sign-off at the PMO stage. |
| **Approver** | Reviews submitted requests and approves, rejects, or sends them back for correction. |
| **Talent Acquisition / HR (TA)** | Receives approved RRFs. Sources candidates, assigns from bench, or initiates open hiring. Closes fulfilled RRFs. |

> Each role sees only the modules and actions their permissions allow. Unauthorized pages return an **Access Denied** screen.

---

## 3. End-to-End Workflow

### Flow Summary

```
Create → Submit → PMO Review → Approval → TA Processing → Close
```

### Step-by-Step

**Step 1 — Admin Setup**
- Admin logs in and creates user accounts.
- Assigns roles (Hiring Manager, Approver, TA, PMO).
- Configures functions, sub-functions, and business units if not already seeded.

**Step 2 — User Login**
- User logs in with their User ID and password.
- System redirects to the home page for their role.
- Invalid credentials or inactive accounts are blocked.

**Step 3 — HM Creates RRF**
- Hiring Manager fills in the RRF form:
  - Position title, function, sub-function, business unit
  - Number of positions, priority, target date
  - Job description, justification
- Form is saved as **Draft** until submitted.

**Step 4 — Form Validation**
- All mandatory fields must be filled before submission.
- System displays inline validation errors for missing or invalid inputs.
- Partial saves may be allowed in draft state.

**Step 5 — Submission**
- HM submits the RRF.
- Status changes from **Draft → Submitted**.
- A unique internal RRF number is auto-generated.
- Notification sent to the next approver in the chain.

**Step 6 — PMO Review**
- PMO reviews submitted RRFs.
- Can view all details but cannot edit.
- Passes to Approver or flags for clarification.

**Step 7 — Approver Review**
- Approver reviews the RRF.
- Three possible actions:
  - ✅ **Approve** → Status moves to **Approved**, forwarded to TA.
  - ❌ **Reject** → Status moves to **Rejected**, flow stops. HM notified.
  - 🔄 **Send Back** → Status moves to **Sent Back**, HM can edit and resubmit.

**Step 8 — Talent Acquisition Action**
- TA receives approved RRFs.
- Reviews the requirement.
- Takes one of these actions:
  - **Open Hiring** — post the job for external candidates.
  - **Fill from Bench** — assign an available internal resource.
  - **Assign** — directly assign a specific person.

**Step 9 — Status Progression**
- After TA takes action, status moves to **In Progress**.
- TA updates the record as the hiring process advances.

**Step 10 — Close RRF**
- When the position is filled or cancelled, TA or Admin closes the RRF.
- Status moves to **Closed**.
- Closed RRFs become **read-only**.
- A close reason must be provided.

---

## 4. Important Business Rules

- **Mandatory fields** — RRF cannot be submitted with blank required fields.
- **Role-based access** — each user only sees their permitted modules and actions.
- **Approval required** — RRF cannot move to TA without passing through approved status.
- **Rejected RRF stops** — a rejected request cannot proceed; HM is notified and must create a new request if needed.
- **Sent-back RRF is editable** — HM can correct and resubmit; resubmission restarts the approval flow.
- **Closed RRF is read-only** — no edits allowed once closed; requires a close reason.
- **Auto-generated RRF number** — assigned at submission, not at draft creation. Must be unique.
- **Notifications** — system sends notifications at key status transitions (submission, approval, rejection, close).
- **Audit trail** — all status changes are timestamped and recorded with the acting user.
- **Inactive users** — cannot log in, regardless of role.
- **Permissions are module-level** — a user without the correct permission key cannot view or act on a module even if they know the URL.

---

## 5. Status Flow

| Status | Meaning |
|---|---|
| **Draft** | RRF created but not yet submitted. HM can still edit. |
| **Submitted** | HM submitted the form. Awaiting PMO/Approver review. |
| **Pending Approval** | Under active review by the Approver. |
| **Approved** | Approver signed off. Forwarded to Talent Acquisition. |
| **Rejected** | Approver rejected the request. Flow terminated. HM notified. |
| **Sent Back** | Approver returned for correction. HM must edit and resubmit. |
| **In Progress** | TA has initiated hiring/bench/assignment action. |
| **Closed** | Position filled or request cancelled. Record locked as read-only. |

---

## 6. QA Validation Checklist

### Authentication
- [ ] Valid login redirects to correct role home page
- [ ] Invalid credentials show error, do not log in
- [ ] Inactive account is blocked
- [ ] Logout clears session and returns to login

### Role & Permission Access
- [ ] Each role sees only permitted menu items
- [ ] Direct URL access to unauthorised module shows Access Denied
- [ ] Admin can manage users; HM cannot
- [ ] TA cannot approve; Approver cannot close

### Create & Submit Flow
- [ ] HM can create a new RRF
- [ ] All mandatory field validations fire on submit
- [ ] Partial/draft save works without triggering validation errors
- [ ] RRF number is auto-generated on submission
- [ ] Status changes from Draft → Submitted on submit

### Approval Flow
- [ ] Approver sees submitted RRFs
- [ ] Approve action changes status to Approved
- [ ] HM/relevant users notified on approval
- [ ] Approved RRF appears in TA queue

### Rejection Flow
- [ ] Reject action changes status to Rejected
- [ ] Rejected RRF is not forwarded to TA
- [ ] HM receives rejection notification
- [ ] Rejected RRF cannot be resubmitted directly

### Send-Back / Resubmission Flow
- [ ] Send Back changes status to Sent Back
- [ ] HM can edit and resubmit
- [ ] Resubmission resets to Submitted and restarts approval
- [ ] HM cannot send-back their own RRF

### TA Processing Flow
- [ ] TA sees approved RRFs
- [ ] TA can select: Open Hiring / Bench / Assign
- [ ] Status updates to In Progress correctly

### Close Flow
- [ ] TA or Admin can close an In Progress RRF
- [ ] Close requires a reason
- [ ] Closed RRF is read-only — no edits possible
- [ ] Status shows Closed

### Notifications
- [ ] Notification sent at: Submit, Approve, Reject, Send Back, Close
- [ ] Notifications appear in the notification panel
- [ ] No duplicate or missing notifications

### Audit & Timestamps
- [ ] Each status change records a timestamp
- [ ] Acting user is recorded against each action
- [ ] Audit history is visible on the RRF detail view

### Edge Cases
- [ ] Submit with all fields blank — all validations fire
- [ ] Submit with some mandatory fields blank — only relevant errors show
- [ ] Two users acting on same RRF simultaneously — last write wins or conflict handled
- [ ] Session expiry during form fill — user redirected to login; unsaved data handled gracefully
- [ ] Admin deactivates a user who is mid-workflow — RRF remains in queue; deactivated user cannot log in

---

## 7. Known Assumptions & Notes

- **Microsoft Login** is a planned feature (UI placeholder exists on login page). Currently non-functional — test with User ID / password only.
- **Seeded master data** — functions, sub-functions, and business units may be pre-loaded in test environment. Verify seed script was run before testing.
- **Permission matrix** is role-code driven. If a test user cannot see an expected module, verify their role permissions were seeded correctly.
- **Internal RRF number** is system-generated. Do not manually enter or predict it in tests.
- **Email notifications** may require SMTP configuration in test environment. Confirm with DevOps before testing notification flows.
- **Audit timestamps** use server time (UTC). Confirm timezone display with front-end team if needed.
- **Close reason** is a required field — blank close attempts should be blocked.
- **Admin role** does not participate in the RRF workflow itself — admin manages users and configuration only.

---

*Document prepared for Datafortune QA Team — RRF Portal v1.0*
