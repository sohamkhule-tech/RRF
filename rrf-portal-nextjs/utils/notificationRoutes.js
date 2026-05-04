/**
 * Centralized Notification Route Resolver
 *
 * Resolves the correct frontend route for a notification click
 * based on the CURRENT user's role — not the hardcoded actionUrl
 * stored in the notification record.
 *
 * Why this exists:
 *   The backend stores one actionUrl per notification TYPE (e.g. RRF_APPROVED
 *   always stores "/pmo/view-rrf/:id"). But the same notification is sent to
 *   multiple roles (e.g. both the HM creator AND PMO users). The HM would be
 *   routed to the PMO page which shows wrong actions. This resolver maps the
 *   notification to the correct role-specific view-rrf page for the logged-in user.
 */

// Role code → view-rrf route prefix mapping
// Must match actual Next.js app/ folder structure
const ROLE_RRF_VIEW_PREFIX = {
  HIRING_MANAGER: '/hiring-manager/view-rrf',
  APPROVER: '/approver/view-rrf',
  PMO: '/pmo/view-rrf',
  HR: '/hr/view-rrf',
  ADMIN: '/admin/rrf-management',
}

// Regex to detect any role-prefixed RRF view/review route and extract the ID
// Matches: /pmo/view-rrf/42, /approver/review/42, /hr/view-rrf/42,
//          /hiring-manager/view-rrf/42, /admin/rrf-management/42
const RRF_ROUTE_PATTERN =
  /^\/(hiring-manager|approver|pmo|hr|admin)\/(?:view-rrf|review|rrf-management)\/(\d+)\/?$/

/**
 * Resolve the correct navigation route for a notification click.
 *
 * @param {object} notification - The notification object (from API/WebSocket)
 * @param {object} user        - The current logged-in user (from AuthContext)
 * @returns {string|null}        The resolved route, or null if no navigation
 */
export function resolveNotificationRoute(notification, user) {
  if (!notification) return null

  const actionUrl = notification.actionUrl
  if (!actionUrl) return null

  // Extract the user's role code
  const roleCode = user?.role?.code || user?.role

  // If it's an RRF-related route, remap to the current user's role prefix
  const match = actionUrl.match(RRF_ROUTE_PATTERN)
  if (match) {
    const rrfId = match[2]
    const prefix = ROLE_RRF_VIEW_PREFIX[roleCode]
    if (prefix) {
      return `${prefix}/${rrfId}`
    }
    // Unknown role — fall through to actionUrl as-is
  }

  // Non-RRF routes (e.g. /admin/users) — return as-is
  return actionUrl
}
