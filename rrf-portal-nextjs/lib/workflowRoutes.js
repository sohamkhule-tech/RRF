/**
 * workflowRoutes.js — Centralized workflow route helpers.
 *
 * Phase 6: Legacy Route Convergence
 *
 * Provides:
 *  - URL builders for the unified /workflow namespace
 *  - Legacy → unified route mapping
 *  - Role-aware navigation helpers
 *
 * All legacy pages can import these helpers instead of hardcoding routes.
 */

// ── Unified Route Builders ──

/** Workflow list with optional view param */
export const workflowList = (view) =>
  view ? `/workflow?view=${encodeURIComponent(view)}` : '/workflow'

/** Workflow detail page */
export const workflowDetail = (id) => `/workflow/${id}`

/** Workflow edit page */
export const workflowEdit = (id) => `/workflow/${id}/edit`

/** Workflow create page */
export const workflowCreate = () => '/workflow/create'

/** Unified dashboard */
export const dashboard = () => '/dashboard'

// ── Legacy → Unified Route Map ──
// Maps old role-folder routes to new unified equivalents.
// Used by legacy wrapper pages to redirect.

export const LEGACY_ROUTE_MAP = {
  // Hiring Manager
  '/hiring-manager/dashboard':       () => dashboard(),
  '/hiring-manager/my-requests':     () => workflowList('all'),
  '/hiring-manager/drafts':          () => workflowList('drafts'),
  '/hiring-manager/create-rrf':      () => workflowCreate(),

  // Approver
  '/approver':                       () => dashboard(),
  '/approver/pending':               () => workflowList('pending-approval'),
  '/approver/approved':              () => workflowList('approved'),
  '/approver/declined':              () => workflowList('declined'),
  '/approver/on-hold':               () => workflowList('on-hold'),
  '/approver/closed':                () => workflowList('closed'),

  // PMO
  '/pmo':                            () => dashboard(),
  '/pmo/requests':                   () => workflowList('total-processed'),
  '/pmo/pending':                    () => workflowList('open-positions'),
  '/pmo/open-positions':             () => workflowList('open-positions'),
  '/pmo/closed':                     () => workflowList('closed'),
  '/pmo/my-requests':                () => workflowList('my-requests'),
  '/pmo/sent-to-approvers':          () => workflowList('sent-to-approvers'),
  '/pmo/create-rrf':                 () => workflowCreate(),

  // HR
  '/hr':                             () => dashboard(),
  '/hr/open-for-hiring':             () => workflowList('open-for-hiring'),
  '/hr/closed':                      () => workflowList('closed'),
}

/**
 * Get the unified route for a legacy path.
 * Returns null if no mapping exists (page should keep its own implementation).
 */
export function getUnifiedRoute(legacyPath) {
  const builder = LEGACY_ROUTE_MAP[legacyPath]
  return builder ? builder() : null
}

/**
 * Build the unified detail route for a view-rrf/[id] legacy page.
 * @param {string|number} id - RRF ID
 */
export function getUnifiedDetailRoute(id) {
  return workflowDetail(id)
}

/**
 * Build the unified edit route for an edit-rrf/[id] legacy page.
 * @param {string|number} id - RRF ID
 */
export function getUnifiedEditRoute(id) {
  return workflowEdit(id)
}
