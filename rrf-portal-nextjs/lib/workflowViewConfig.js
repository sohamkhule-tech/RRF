/**
 * workflowViewConfig.js — Configuration for all workflow list views.
 *
 * Each view defines:
 *  - title: display name
 *  - description: subtitle
 *  - permission: required permission to see this view
 *  - dataSource: which API/hook to use
 *  - columns: column definitions for RRFTable
 *  - statusFilter: optional client-side status filter
 *  - role: optional role restriction (for views only certain roles see)
 *
 * This replaces 18+ separate page files with a single configuration map.
 * The workflow page reads `?view=xxx` from URL and renders accordingly.
 */

import { PERMISSIONS } from '@/utils/permissions'

// ── Column Presets ──

const COL_ID = { key: 'displayId', header: 'ID', type: 'id' }
const COL_RRF_NUMBER = { key: 'rrfNumber', header: 'ID', type: 'id' }
const COL_ROLE = { key: 'role', header: 'Role', className: 'font-medium text-gray-900' }
const COL_POSITION = { key: 'positionTitle', header: 'Role', className: 'font-medium text-gray-900' }
const COL_PROJECT = { key: 'project', header: 'Project', className: 'text-gray-600' }
const COL_PROJECT_NAME = { key: 'projectName', header: 'Project', className: 'text-gray-600' }
const COL_MANAGER = { key: 'manager', header: 'Requester', className: 'font-medium text-gray-900' }
const COL_CREATED_BY = {
  key: 'createdBy.fullName',
  header: 'Manager',
  className: 'font-medium text-gray-900',
  render: (val) => val || 'Unknown',
}
const COL_POSITIONS = { key: 'positions', header: 'Positions', type: 'positions' }
const COL_HEADCOUNT = { key: 'headcount', header: 'Positions', type: 'positions' }
const COL_PRIORITY = { key: 'priority', header: 'Priority', type: 'priority' }
const COL_STATUS = { key: 'status', header: 'Status', type: 'status' }
const COL_CREATED = { key: 'date', header: 'Created', type: 'date' }
const COL_SUBMITTED = { key: 'submittedAt', header: 'Submitted', type: 'date' }
const COL_APPROVED = { key: 'approvedAt', header: 'Approved On', type: 'date' }
const COL_DEPARTMENT = { key: 'department', header: 'Department', className: 'text-gray-600' }
const COL_SUB_FUNCTION = { key: 'subFunction', header: 'Sub Function', className: 'text-gray-600' }
const COL_CLOSE_REASON = {
  key: 'closeReason',
  header: 'Close Reason',
  render: (val) => {
    const LABELS = {
      RESOURCE_HIRED_EXTERNAL: 'Hired Externally',
      SOURCED_INTERNALLY: 'Sourced Internally',
      CLOSED_BY_BUSINESS: 'Closed by Business',
    }
    return LABELS[val] || val || '—'
  },
}
const COL_CLOSED_AT = { key: 'closedAt', header: 'Closed On', type: 'date' }

// ── View Definitions ──

export const VIEW_CONFIGS = {
  // ─── Hiring Manager Views ───
  'my-requests': {
    title: 'My Requests',
    description: 'All submitted RRF requests',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'my-requests',
    columns: [COL_ID, COL_ROLE, COL_SUB_FUNCTION, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_STATUS, COL_CREATED],
    statusFilter: (status) => status !== 'draft',
    enableExport: true,
    enableStatusTabs: true,
    statusTabs: [
      { key: 'all', label: 'All' },
      { key: 'pending-approval', label: 'Pending' },
      { key: 'approved', label: 'Approved' },
      { key: 'in-progress', label: 'In Progress' },
      { key: 'on-hold', label: 'On Hold' },
      { key: 'declined', label: 'Declined' },
      { key: 'closed', label: 'Closed' },
    ],
  },

  drafts: {
    title: 'Drafts',
    description: 'Unsaved RRF drafts',
    permission: PERMISSIONS.RRF.CREATE,
    dataSourceType: 'my-requests-drafts',
    columns: [COL_ID, COL_ROLE, COL_DEPARTMENT, COL_POSITIONS, COL_PRIORITY, COL_CREATED],
    statusFilter: (status) => status === 'draft',
  },

  // ─── Approver Views ───
  'pending-approval': {
    title: 'Pending Approval',
    description: 'Requests awaiting your approval',
    permission: PERMISSIONS.APPROVALS.READ,
    dataSourceType: 'pending-approvals',
    columns: [COL_ID, COL_CREATED_BY, COL_POSITION, COL_PROJECT_NAME, COL_HEADCOUNT, COL_PRIORITY, COL_SUBMITTED],
  },

  approved: {
    title: 'Approved Requests',
    description: 'Requests you have approved',
    permission: PERMISSIONS.APPROVALS.READ,
    dataSourceType: 'approver-list',
    dataSourceParams: { status: 'approved' },
    columns: [COL_ID, COL_CREATED_BY, COL_POSITION, COL_PROJECT_NAME, COL_HEADCOUNT, COL_PRIORITY, COL_STATUS, COL_APPROVED],
  },

  declined: {
    title: 'Declined Requests',
    description: 'Requests you have declined',
    permission: PERMISSIONS.APPROVALS.READ,
    dataSourceType: 'approver-list',
    dataSourceParams: { status: 'declined,rejected' },
    columns: [COL_ID, COL_CREATED_BY, COL_POSITION, COL_PROJECT_NAME, COL_HEADCOUNT, COL_PRIORITY, COL_STATUS],
  },

  'on-hold': {
    title: 'On Hold',
    description: 'Requests you put on hold',
    permission: PERMISSIONS.APPROVALS.READ,
    dataSourceType: 'approver-list',
    dataSourceParams: { status: 'on-hold' },
    columns: [COL_ID, COL_CREATED_BY, COL_POSITION, COL_PROJECT_NAME, COL_HEADCOUNT, COL_PRIORITY, COL_STATUS],
  },

  // ─── PMO Views ───
  all: {
    title: 'All Requests',
    description: 'Complete RRF list',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs',
    columns: [COL_ID, COL_ROLE, COL_SUB_FUNCTION, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_STATUS, COL_CREATED],
    enableExport: true,
    enableStatusTabs: true,
    statusTabs: [
      { key: 'all', label: 'All' },
      { key: 'request-positions', label: 'Request Positions' },
      { key: 'open-for-hiring', label: 'Open for Hiring' },
      { key: 'closed', label: 'Closed' },
    ],
  },

  'open-positions': {
    title: 'Open Positions',
    description: 'Approved RRFs awaiting PMO action',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'open-positions',
    columns: [COL_RRF_NUMBER, COL_MANAGER, COL_ROLE, COL_PROJECT, COL_DEPARTMENT, COL_POSITIONS, COL_PRIORITY, COL_APPROVED],
    filters: ['department'],
  },

  'sent-to-approvers': {
    title: 'Sent to Approvers',
    description: 'In-progress requests at approval stage',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs',
    columns: [COL_ID, COL_MANAGER, COL_ROLE, COL_PROJECT, COL_SUB_FUNCTION, COL_POSITIONS, COL_PRIORITY, COL_SUBMITTED],
    statusFilter: (status) => status === 'pending' || status === 'submitted' || status === 'on-hold',
  },

  // ─── HR Views ───
  'open-for-hiring': {
    title: 'Open for Hiring',
    description: 'Positions currently in hiring phase',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'open-for-hiring',
    columns: [COL_RRF_NUMBER, COL_ROLE, COL_SUB_FUNCTION, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_APPROVED],
  },

  // ─── Shared Views ───
  closed: {
    title: 'Closed Requests',
    description: 'Completed and closed RRFs',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs',
    columns: [COL_ID, COL_ROLE, COL_SUB_FUNCTION, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_STATUS, COL_CREATED],
    statusFilter: (status) => status === 'closed' || status === 'closed-by-bench',
    filters: ['subFunction'],
  },

  // ─── PMO Close-Reason Views ───
  // These mirror the legacy /pmo/requests?status=... tabs exactly.
  // dataSourceType 'all-rrfs-pmo' fetches all RRFs and preserves closeReason.
  // rowFilter receives the full row object (supports status + closeReason compound filtering).

  'total-processed': {
    title: 'Total Processed',
    description: 'All RRFs that reached PMO processing stage',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs-pmo',
    columns: [COL_RRF_NUMBER, COL_MANAGER, COL_ROLE, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_STATUS, COL_CREATED],
    rowFilter: (row) =>
      ['approved', 'open-for-hiring', 'in-progress', 'closed', 'closed-by-bench'].includes(
        (row.status || '').toLowerCase(),
      ),
    enableExport: true,
  },

  'pmo-open-for-hiring': {
    title: 'Open for Hiring',
    description: 'RRFs sent to HR for active hiring',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs-pmo',
    columns: [COL_RRF_NUMBER, COL_MANAGER, COL_ROLE, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_APPROVED],
    rowFilter: (row) =>
      ['open-for-hiring', 'in-progress'].includes((row.status || '').toLowerCase()),
  },

  'hired-externally': {
    title: 'Hired Externally',
    description: 'Positions filled via external hire',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs-pmo',
    columns: [COL_RRF_NUMBER, COL_MANAGER, COL_ROLE, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_CLOSE_REASON, COL_CLOSED_AT],
    rowFilter: (row) =>
      ['closed', 'closed-by-bench'].includes((row.status || '').toLowerCase()) &&
      row.closeReason === 'RESOURCE_HIRED_EXTERNAL',
  },

  'sourced-internally': {
    title: 'Sourced Internally',
    description: 'Positions filled from internal bench',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs-pmo',
    columns: [COL_RRF_NUMBER, COL_MANAGER, COL_ROLE, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_CLOSE_REASON, COL_CLOSED_AT],
    rowFilter: (row) =>
      ['closed', 'closed-by-bench'].includes((row.status || '').toLowerCase()) &&
      row.closeReason === 'SOURCED_INTERNALLY',
  },

  'closed-by-business': {
    title: 'Closed by Business',
    description: 'Positions closed by business decision',
    permission: PERMISSIONS.RRF.READ,
    dataSourceType: 'all-rrfs-pmo',
    columns: [COL_RRF_NUMBER, COL_MANAGER, COL_ROLE, COL_PROJECT, COL_POSITIONS, COL_PRIORITY, COL_CLOSE_REASON, COL_CLOSED_AT],
    rowFilter: (row) =>
      ['closed', 'closed-by-bench'].includes((row.status || '').toLowerCase()) &&
      row.closeReason === 'CLOSED_BY_BUSINESS',
  },
}

// ── Role-Scoped Tab Definitions ──
//
// Each role sees only its own workflow context — no cross-role tab leakage.
// Tab arrays mirror the legacy sidebar navigation structure exactly.

export const ROLE_TABS = {
  // Hiring Manager: status-filtered tabs over their own submitted requests.
  // Mirrors: /hiring-manager/my-requests status sub-tabs from the legacy UI.
  // pageTitle drives the PageHeader so it tracks the active tab, not the static viewConfig.title.
  HM: [
    { key: 'all',         label: 'All',              pageTitle: 'All Requests',              pageSubtitle: 'All your submitted RRF requests',          viewConfigKey: 'my-requests' },
    { key: 'pending',     label: 'Pending Approval', pageTitle: 'Pending Approval Requests',  pageSubtitle: 'Requests awaiting approver action',        viewConfigKey: 'my-requests', statusFilter: ['pending', 'submitted'] },
    { key: 'approved',    label: 'Approved',         pageTitle: 'Approved Requests',          pageSubtitle: 'Requests approved and ready to proceed',   viewConfigKey: 'my-requests', statusFilter: ['approved'] },
    { key: 'in-progress', label: 'In Progress',      pageTitle: 'In Progress Requests',       pageSubtitle: 'Requests currently in the hiring phase',   viewConfigKey: 'my-requests', statusFilter: ['in-progress', 'open-for-hiring', 'open_for_hiring'] },
    { key: 'on-hold',     label: 'On Hold',          pageTitle: 'On Hold Requests',           pageSubtitle: 'Requests currently on hold',               viewConfigKey: 'my-requests', statusFilter: ['on-hold'] },
    { key: 'declined',    label: 'Declined',         pageTitle: 'Declined Requests',          pageSubtitle: 'Requests that were declined',              viewConfigKey: 'my-requests', statusFilter: ['declined', 'rejected'] },
    { key: 'closed',      label: 'Closed',           pageTitle: 'Closed Requests',            pageSubtitle: 'Completed and closed RRF requests',        viewConfigKey: 'my-requests', statusFilter: ['closed', 'closed-by-bench'] },
  ],

  // Approver: one tab per approval state, each with its own API fetch.
  // Mirrors: /approver/pending, /approver/approved, /approver/declined, etc.
  APPROVER: [
    { key: 'pending-approval', label: 'Pending Approvals', pageTitle: 'Pending Approvals',   pageSubtitle: 'Requests awaiting your approval',          viewConfigKey: 'pending-approval' },
    { key: 'approved',         label: 'Approved',          pageTitle: 'Approved Requests',   pageSubtitle: 'Requests you have approved',               viewConfigKey: 'approved' },
    { key: 'declined',         label: 'Declined',          pageTitle: 'Declined Requests',   pageSubtitle: 'Requests you have declined',               viewConfigKey: 'declined' },
    { key: 'on-hold',          label: 'On Hold',           pageTitle: 'On Hold Requests',    pageSubtitle: 'Requests you put on hold',                 viewConfigKey: 'on-hold' },
    { key: 'closed',           label: 'Closed',            pageTitle: 'Closed Requests',     pageSubtitle: 'Completed and closed RRFs',                viewConfigKey: 'closed' },
  ],

  // PMO: mirrors the legacy /pmo/requests allowedTabs array.
  // 'closed' tab keeps the "Closed" label but its viewConfig is 'hired-externally' —
  // so it only shows requests with closeReason === 'RESOURCE_HIRED_EXTERNAL'.
  PMO: [
    { key: 'total-processed',     label: 'Total Processed',    pageTitle: 'Total Processed',      pageSubtitle: 'All RRFs that reached PMO processing stage',   viewConfigKey: 'total-processed' },
    { key: 'open-positions',      label: 'Request Positions',  pageTitle: 'Request Positions',    pageSubtitle: 'Approved RRFs awaiting PMO action',            viewConfigKey: 'open-positions' },
    { key: 'pmo-open-for-hiring', label: 'Open for Hiring',    pageTitle: 'Open for Hiring',      pageSubtitle: 'RRFs sent to HR for active hiring',            viewConfigKey: 'pmo-open-for-hiring' },
    { key: 'sourced-internally',  label: 'Sourced Internally', pageTitle: 'Sourced Internally',   pageSubtitle: 'Positions filled from internal bench',         viewConfigKey: 'sourced-internally' },
    { key: 'closed-by-business',  label: 'Closed by Business', pageTitle: 'Closed by Business',   pageSubtitle: 'Positions closed by business decision',        viewConfigKey: 'closed-by-business' },
    { key: 'closed',              label: 'Closed',             pageTitle: 'Closed Requests',      pageSubtitle: 'Positions filled via external hire',           viewConfigKey: 'hired-externally' },
  ],

  // HR: matches the legacy /hr/* sidebar items.
  // Mirrors: Open for Hiring | Closed
  HR: [
    { key: 'open-for-hiring', label: 'Open for Hiring', pageTitle: 'Open for Hiring',  pageSubtitle: 'Positions currently in the hiring phase', viewConfigKey: 'open-for-hiring' },
    { key: 'closed',          label: 'Closed',          pageTitle: 'Closed Requests',  pageSubtitle: 'Completed and closed RRFs',               viewConfigKey: 'closed' },
  ],

  // Admin: full cross-role visibility.
  ADMIN: [
    { key: 'all',              label: 'All Requests',      pageTitle: 'All Requests',        pageSubtitle: 'Complete RRF list',                  viewConfigKey: 'all' },
    { key: 'open-positions',   label: 'Request Positions', pageTitle: 'Request Positions',   pageSubtitle: 'Approved RRFs awaiting PMO action',  viewConfigKey: 'open-positions' },
    { key: 'open-for-hiring',  label: 'Open for Hiring',   pageTitle: 'Open for Hiring',     pageSubtitle: 'Positions in the hiring phase',      viewConfigKey: 'open-for-hiring' },
    { key: 'pending-approval', label: 'Pending Approvals', pageTitle: 'Pending Approvals',   pageSubtitle: 'Requests awaiting approval',         viewConfigKey: 'pending-approval' },
    { key: 'closed',           label: 'Closed',            pageTitle: 'Closed Requests',     pageSubtitle: 'Completed and closed RRFs',          viewConfigKey: 'closed' },
  ],
}

/**
 * Normalize raw role string to a ROLE_TABS key.
 * e.g. 'hiring-manager', 'HIRING_MANAGER' → 'HM' (fallback)
 *      'approver', 'APPROVER'             → 'APPROVER'
 *      'pmo', 'PMO'                        → 'PMO'
 *      'hr', 'HR'                          → 'HR'
 *      'admin', 'ADMIN'                    → 'ADMIN'
 */
export function getRoleKey(user) {
  const raw = String(user?.role?.code || user?.role || '').toUpperCase()
  return ROLE_TABS[raw] ? raw : 'HM'
}

/**
 * Get role-scoped tabs for the current user.
 * Returns only tabs appropriate for the user's role — no cross-role leakage.
 */
export function getTabsForRole(user) {
  return ROLE_TABS[getRoleKey(user)]
}

/**
 * Get the default active tab key for a user's role.
 */
export function getDefaultView(user) {
  const tabs = getTabsForRole(user)
  return tabs[0]?.key || 'all'
}
