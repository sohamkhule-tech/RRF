/**
 * rrfActionResolver.js
 *
 * Resolves which workflow actions a user may perform on a given RRF.
 * Pure function — no React, no side-effects, fully testable.
 *
 * Usage:
 *   const actions = resolveActions(rrf, user, user.permissions)
 *   // actions.canEdit, actions.canApprove, etc.
 */

import { hasPermission, PERMISSIONS } from '@/utils/permissions'

/**
 * Determine eligible actions for the current user on a given RRF.
 *
 * @param {Object}   rrf         - Raw RRF data from useRRFDetail (rrf.status, rrf.createdById, rrf.approvers, …)
 * @param {Object}   user        - Auth user from useAuth() — { id, role: { code }, … }
 * @param {string[]} permissions - Permission array from user.permissions (e.g. ['RRF.READ', 'APPROVALS.APPROVE', …])
 * @returns {Object} Eligibility flags for every supported action
 */
export function resolveActions(rrf, user, permissions) {
  // Guard: nothing to resolve without both rrf and user
  if (!rrf || !user) {
    return {
      canView: false,
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      canDecline: false,
      canHold: false,
      canOpenForHiring: false,
      canClose: false,
    }
  }

  // Normalize status to lowercase for safe comparisons
  const status = String(rrf.status || '').toLowerCase()

  // Role identity (backend sends UPPER_SNAKE_CASE codes)
  const roleCode = String(user?.role?.code || '').toUpperCase()
  const isAdmin = roleCode === 'ADMIN'
  const isPMO   = roleCode === 'PMO'
  const isHR    = roleCode === 'HR'

  // Ownership: createdById may be a number or UUID; compare via === with user.id
  // Also fall back to rrf.createdBy.id in case the numeric FK is not serialised separately
  const isCreator =
    (rrf.createdById != null && rrf.createdById === user.id) ||
    (rrf.createdBy?.id != null && rrf.createdBy.id === user.id)

  // Approver assignment: check rrf.approvers[] returned by the detail endpoint
  const isAssignedApprover =
    Array.isArray(rrf.approvers) &&
    rrf.approvers.some((a) => a.userId === user.id)

  // Permission flags — use PERMISSIONS constants to avoid magic strings
  const canUpdate     = hasPermission(PERMISSIONS.RRF.UPDATE,           permissions)
  const canApproveRRF = hasPermission(PERMISSIONS.APPROVALS.APPROVE,    permissions)
  const canRejectRRF  = hasPermission(PERMISSIONS.APPROVALS.REJECT,     permissions)
  const canHoldRRF    = hasPermission(PERMISSIONS.APPROVALS.ON_HOLD,    permissions)
  const canOpenHiring = hasPermission(PERMISSIONS.RRF.OPEN_FOR_HIRING,  permissions)
  const canCloseRRF   = hasPermission(PERMISSIONS.RRF.CLOSE,            permissions)

  // Status groupings (mirrors backend RrfStatus enum)
  const EDITABLE_STATUSES        = ['draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold']
  // Approvers may act on PENDING, SUBMITTED, and ON-HOLD (on-hold = awaiting approver decision)
  const APPROVER_ACTION_STATUSES = ['pending', 'submitted', 'on-hold']
  const CLOSEABLE_STATUSES_PMO   = ['approved', 'in-progress', 'open-for-hiring']
  const CLOSEABLE_STATUSES_HR    = ['in-progress', 'open-for-hiring']

  return {
    // view is always true once this function runs (page-level access guard handles the rest)
    canView: true,

    // Edit: HM (creator) or Approver/Admin (when in approver-action statuses), with RRF.UPDATE
    canEdit:
      (isCreator && EDITABLE_STATUSES.includes(status) && canUpdate) ||
      ((isAssignedApprover || isAdmin) && APPROVER_ACTION_STATUSES.includes(status) && canUpdate),

    // Submit: HM (creator) only, when RRF is in draft
    canSubmit: isCreator && status === 'draft',

    // Approve: assigned approver or Admin, when pending/submitted/on-hold, with APPROVALS.APPROVE
    canApprove:
      (isAssignedApprover || isAdmin) &&
      APPROVER_ACTION_STATUSES.includes(status) &&
      canApproveRRF,

    // Decline: assigned approver or Admin, when pending/submitted/on-hold, with APPROVALS.REJECT
    canDecline:
      (isAssignedApprover || isAdmin) &&
      APPROVER_ACTION_STATUSES.includes(status) &&
      canRejectRRF,

    // Hold: assigned approver or Admin, when pending/submitted — but NOT when already on-hold
    canHold:
      (isAssignedApprover || isAdmin) &&
      status !== 'on-hold' &&
      APPROVER_ACTION_STATUSES.includes(status) &&
      canHoldRRF,

    // Open for Hiring: PMO or Admin, when approved, with RRF.OPEN_FOR_HIRING
    canOpenForHiring:
      (isPMO || isAdmin) &&
      status === 'approved' &&
      canOpenHiring,

    // Close: PMO/HR/Admin with role-specific status windows, with RRF.CLOSE
    // PMO & Admin can close from approved → closed; HR can only close in-progress/open-for-hiring
    canClose:
      (
        (isPMO  && CLOSEABLE_STATUSES_PMO.includes(status)) ||
        (isHR   && CLOSEABLE_STATUSES_HR.includes(status))  ||
        (isAdmin && CLOSEABLE_STATUSES_PMO.includes(status))
      ) && canCloseRRF,
  }
}
