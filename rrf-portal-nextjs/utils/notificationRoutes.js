/**
 * Centralized Notification Route Resolver
 *
 * Resolves the correct frontend route for a notification click
 * based on the CURRENT user’s role — not the hardcoded actionUrl
 * stored in the notification record.
 *
 * Why this exists:
 *   The backend stores one actionUrl per notification TYPE (e.g. RRF_APPROVED
 *   stores a role-prefixed path). All roles now navigate to the unified
 *   /requests/[id] route, but the backend may still emit old-style URLs.
 *   This resolver normalises any role-prefixed view-rrf path into /requests/[id].
 */

// All roles now use the unified /requests/[id] route (except ADMIN)
const ROLE_RRF_VIEW_PREFIX = {
  HIRING_MANAGER: '/requests',
  APPROVER: '/requests',
  PMO: '/requests',
  HR: '/requests',
  ADMIN: '/admin/rrf-management',
}

// Regex to detect any RRF route and extract the ID
// Matches: /requests/42, /admin/rrf-management/42, and legacy role-prefixed paths
const RRF_ROUTE_PATTERN =
  /^\/(?:(?:hiring-manager|approver|pmo|hr)\/(?:view-rrf|review)|admin\/rrf-management|requests)\/([^/]+)\/?$/

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
    const rrfId = match[1]
    const prefix = ROLE_RRF_VIEW_PREFIX[roleCode]
    if (prefix) {
      return `${prefix}/${rrfId}`
    }
    // Unknown role — fall through to actionUrl as-is
  }

  // Non-RRF routes (e.g. /admin/users) — return as-is
  return actionUrl
}
