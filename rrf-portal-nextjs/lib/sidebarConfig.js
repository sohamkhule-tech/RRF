/**
 * sidebarConfig.js — Centralized sidebar navigation configuration.
 *
 * Defines menu items per role, each pointing to the new unified routes
 * (/workflow?view=..., /dashboard). Icons, labels, and ordering mirror
 * the legacy PermissionBasedSidebar exactly — preserving the same mental
 * model while routing through the new architecture.
 *
 * STRANGLER PATTERN: This config drives a NEW sidebar that coexists
 * with the old PermissionBasedSidebar. Neither is modified or removed.
 */

import {
  HomeOutlined,
  FileTextOutlined,
  SaveOutlined,
  BarChartOutlined,
  FormOutlined,
  UserOutlined,
  SettingOutlined,
  DashboardOutlined,
  TeamOutlined,
  KeyOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { PERMISSIONS } from '@/utils/permissions'

// ── Role-Scoped Sidebar Definitions ──
//
// Each role gets the SAME nav items they had in the legacy sidebar,
// but hrefs point to the new unified routes.
//
// Format:
//   key        — unique identifier (also used for active-state matching)
//   icon       — Ant Design icon element
//   label      — display text
//   href       — target route
//   permission — required permission string (checked at render time)
//   matchPaths — optional array of pathname prefixes for active-state highlighting

const SIDEBAR_CONFIGS = {
  // ── Hiring Manager ──
  // Legacy: Dashboard | Requests | Drafts
  HM: [
    {
      key: 'dashboard',
      icon: <HomeOutlined className="text-xl" />,
      label: 'Dashboard',
      href: '/dashboard',
      permission: PERMISSIONS.DASHBOARD.READ,
    },
    {
      key: 'requests',
      icon: <FileTextOutlined className="text-xl" />,
      label: 'Requests',
      href: '/workflow?view=all',
      permission: PERMISSIONS.RRF.READ,
      matchPaths: ['/workflow'],
    },
    {
      key: 'drafts',
      icon: <SaveOutlined className="text-xl" />,
      label: 'Drafts',
      href: '/drafts',
      permission: PERMISSIONS.RRF.CREATE,
      matchPaths: ['/drafts'],
    },
  ],

  // ── Approver ──
  // Legacy: Dashboard | Reports
  // (Approver didn't have a separate "Requests" sidebar item in the legacy UI —
  //  their dashboard IS the pending list. Workflow tabs handle sub-navigation.)
  APPROVER: [
    {
      key: 'dashboard',
      icon: <HomeOutlined className="text-xl" />,
      label: 'Dashboard',
      href: '/dashboard',
      permission: PERMISSIONS.DASHBOARD.READ,
    },
    {
      key: 'requests',
      icon: <FileTextOutlined className="text-xl" />,
      label: 'Requests',
      href: '/workflow?view=pending-approval',
      permission: PERMISSIONS.APPROVALS.READ,
      matchPaths: ['/workflow'],
    },
    {
      key: 'reports',
      icon: <BarChartOutlined className="text-xl" />,
      label: 'Reports',
      href: '/reports',
      permission: PERMISSIONS.REPORTS.READ,
    },
  ],

  // ── PMO ──
  // Legacy: Dashboard | Requests | Reports | Edit Form
  PMO: [
    {
      key: 'dashboard',
      icon: <HomeOutlined className="text-xl" />,
      label: 'Dashboard',
      href: '/dashboard',
      permission: PERMISSIONS.DASHBOARD.READ,
    },
    {
      key: 'requests',
      icon: <FileTextOutlined className="text-xl" />,
      label: 'Requests',
      href: '/workflow?view=total-processed',
      permission: PERMISSIONS.RRF.READ,
      matchPaths: ['/workflow'],
    },
    {
      key: 'reports',
      icon: <BarChartOutlined className="text-xl" />,
      label: 'Reports',
      href: '/reports',
      permission: PERMISSIONS.REPORTS.READ,
    },
    {
      key: 'form-config',
      icon: <FormOutlined className="text-xl" />,
      label: 'Edit Form',
      href: '/pmo/form-config',
      permission: PERMISSIONS.RRF.UPDATE,
    },
    {
      key: 'drafts',
      icon: <SaveOutlined className="text-xl" />,
      label: 'Drafts',
      href: '/drafts',
      permission: PERMISSIONS.RRF.CREATE,
      matchPaths: ['/drafts'],
    },
  ],

  // ── HR ──
  // Legacy: Dashboard (with open-for-hiring list embedded)
  HR: [
    {
      key: 'dashboard',
      icon: <HomeOutlined className="text-xl" />,
      label: 'Dashboard',
      href: '/dashboard',
      permission: PERMISSIONS.DASHBOARD.READ,
    },
    {
      key: 'requests',
      icon: <FileTextOutlined className="text-xl" />,
      label: 'Requests',
      href: '/workflow?view=open-for-hiring',
      permission: PERMISSIONS.RRF.READ,
      matchPaths: ['/workflow'],
    },
  ],

  // ── Admin ──
  // Mirrors AdminSidebar.jsx items exactly: Dashboard, Users, Roles, RRF, Form Config, Reports (soon), Audit Logs (soon)
  ADMIN: [
    {
      key: 'admin-dashboard',
      icon: <DashboardOutlined className="text-xl" />,
      label: 'Dashboard',
      href: '/admin',
      permission: PERMISSIONS.DASHBOARD.READ,
    },
    {
      key: 'admin-users',
      icon: <TeamOutlined className="text-xl" />,
      label: 'Users',
      href: '/admin/users',
      permission: PERMISSIONS.USERS.READ,
      matchPaths: ['/admin/users'],
    },
    {
      key: 'admin-roles',
      icon: <KeyOutlined className="text-xl" />,
      label: 'Roles',
      href: '/admin/roles',
      permission: PERMISSIONS.ROLES.READ,
      matchPaths: ['/admin/roles'],
    },
    {
      key: 'admin-rrf',
      icon: <FileTextOutlined className="text-xl" />,
      label: 'RRF',
      href: '/admin/rrf-management',
      permission: PERMISSIONS.RRF.READ,
      matchPaths: ['/admin/rrf-management'],
    },
    {
      key: 'admin-form-config',
      icon: <FormOutlined className="text-xl" />,
      label: 'Form Config',
      href: '/admin/form-config',
      permission: PERMISSIONS.FORM_CONFIG.READ,
      matchPaths: ['/admin/form-config'],
    },
    {
      key: 'admin-reports',
      icon: <BarChartOutlined className="text-xl" />,
      label: 'Reports',
      href: '/admin/reports',
      permission: PERMISSIONS.REPORTS.READ,
      disabled: true,
    },
    {
      key: 'admin-audit-logs',
      icon: <HistoryOutlined className="text-xl" />,
      label: 'Audit Logs',
      href: '/admin/audit-logs',
      permission: PERMISSIONS.SETTINGS.READ,
      disabled: true,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIMENTAL PERMISSION-DRIVEN MODE
// ─────────────────────────────────────────────────────────────────────────────
//
// When USE_PERMISSION_EXPERIMENT = true, UnifiedSidebar ignores role scoping
// and instead renders every distinct navigation target across all role configs
// where the user holds the required permission.
//
// Goal: observe whether pure permission-driven visibility feels cleaner or
// creates UX confusion compared to the current role-scoped approach.
//
// ROLLBACK: set this back to false — no other changes needed.
//
export const USE_PERMISSION_EXPERIMENT = false

/**
 * Collect all distinct navigation items from every role config, deduped by href.
 * Used only when USE_PERMISSION_EXPERIMENT is true.
 *
 * Deduplicating by href means:
 *   - items pointing to the same URL are shown once (e.g. Dashboard)
 *   - items with the same label but different views appear as separate entries
 *     (e.g. HM "Requests" → /workflow?view=all  vs  HR "Requests" → /workflow?view=open-for-hiring)
 *     This is intentional — we want to observe this in the experiment.
 */
export function getPermissionDrivenItems() {
  const seen = new Set()
  const items = []
  for (const roleItems of Object.values(SIDEBAR_CONFIGS)) {
    for (const item of roleItems) {
      if (!seen.has(item.href)) {
        seen.add(item.href)
        items.push(item)
      }
    }
  }
  return items
}

/**
 * Get sidebar menu items for the current user.
 * Normalises the raw role code to a SIDEBAR_CONFIGS key.
 */
export function getSidebarItems(user) {
  const raw = String(user?.role?.code || user?.role || '').toUpperCase()
  return SIDEBAR_CONFIGS[raw] || SIDEBAR_CONFIGS.HM
}

/**
 * Check if a sidebar item should be marked active for the given pathname.
 */
export function isItemActive(item, pathname) {
  // Exact match (handles query-param hrefs like /workflow?view=all)
  if (pathname === item.href) return true
  // If item has explicit matchPaths, use only those for prefix matching
  if (item.matchPaths) {
    return item.matchPaths.some((p) => pathname.startsWith(p))
  }
  // Strip query params from href for prefix matching
  const hrefPath = item.href.split('?')[0]
  if (hrefPath !== '/' && hrefPath !== '/admin' && pathname.startsWith(hrefPath)) return true
  return false
}
