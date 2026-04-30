/**
 * Permission Utilities
 * 
 * Central utilities for permission checking in the RRF Portal
 * Replaces role-based checks with permission-based checks
 */

/**
 * Check if user has a specific permission
 * @param {string} requiredPermission - Permission code (e.g., 'RRF.CREATE')
 * @param {string[]} userPermissions - Array of user's permissions
 * @returns {boolean} - True if user has permission
 */
export const hasPermission = (requiredPermission, userPermissions = []) => {
  if (!requiredPermission || !Array.isArray(userPermissions)) {
    return false
  }
  return userPermissions.includes(requiredPermission)
}

/**
 * Check if user has ANY of the specified permissions
 * @param {string[]} requiredPermissions - Array of permission codes
 * @param {string[]} userPermissions - Array of user's permissions
 * @returns {boolean} - True if user has at least one permission
 */
export const hasAnyPermission = (requiredPermissions, userPermissions = []) => {
  if (!Array.isArray(requiredPermissions) || !Array.isArray(userPermissions)) {
    return false
  }
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

/**
 * Check if user has ALL of the specified permissions
 * @param {string[]} requiredPermissions - Array of permission codes
 * @param {string[]} userPermissions - Array of user's permissions
 * @returns {boolean} - True if user has all permissions
 */
export const hasAllPermissions = (requiredPermissions, userPermissions = []) => {
  if (!Array.isArray(requiredPermissions) || !Array.isArray(userPermissions)) {
    return false
  }
  return requiredPermissions.every(permission => userPermissions.includes(permission))
}

/**
 * Get permissions for a specific module
 * @param {string} moduleName - Module code (e.g., 'RRF', 'DASHBOARD')
 * @param {string[]} userPermissions - Array of user's permissions
 * @returns {string[]} - Array of permissions for that module
 */
export const getModulePermissions = (moduleName, userPermissions = []) => {
  return userPermissions.filter(permission => permission.startsWith(`${moduleName}.`))
}

/**
 * Check if user can access a specific module
 * @param {string} moduleName - Module code (e.g., 'RRF', 'DASHBOARD')
 * @param {string[]} userPermissions - Array of user's permissions
 * @returns {boolean} - True if user has any permission in that module
 */
export const canAccessModule = (moduleName, userPermissions = []) => {
  return userPermissions.some(permission => permission.startsWith(`${moduleName}.`))
}

/**
 * Permission constants - Maps actions to permission codes
 * Use these constants throughout the app for consistency
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD: {
    READ: 'DASHBOARD.READ',
  },
  
  // RRF Management
  RRF: {
    CREATE: 'RRF.CREATE',
    READ: 'RRF.READ',
    VIEW: 'RRF.READ',  // Alias for consistency
    UPDATE: 'RRF.UPDATE',
    DELETE: 'RRF.DELETE',
    OPEN_FOR_HIRING: 'RRF.OPEN_FOR_HIRING',
    FILL_FROM_BENCH: 'RRF.FILL_FROM_BENCH',
    CLOSE: 'RRF.CLOSE',
  },
  
  // Approvals
  APPROVALS: {
    READ: 'APPROVALS.READ',
    APPROVE: 'APPROVALS.APPROVE',
    REJECT: 'APPROVALS.REJECT',
    ON_HOLD: 'APPROVALS.ON_HOLD',
  },
  
  // Users Management
  USERS: {
    CREATE: 'USERS.CREATE',
    READ: 'USERS.READ',
    UPDATE: 'USERS.UPDATE',
    DELETE: 'USERS.DELETE',
  },
  
  // Roles Management
  ROLES: {
    READ: 'ROLES.READ',
    UPDATE: 'ROLES.UPDATE',
  },
  
  // Reports
  REPORTS: {
    READ: 'REPORTS.READ',
    EXPORT: 'REPORTS.EXPORT',
  },
  
  // Settings
  SETTINGS: {
    READ: 'SETTINGS.READ',
    UPDATE: 'SETTINGS.UPDATE',
  },

  // Form Configuration
  FORM_CONFIG: {
    READ: 'FORM_CONFIG.READ',
    CREATE: 'FORM_CONFIG.CREATE',
    UPDATE: 'FORM_CONFIG.UPDATE',
    DELETE: 'FORM_CONFIG.DELETE',
  },
}

/**
 * Role to home page mapping (fallback for initial redirect)
 * This is a transitional helper - eventually all redirects should be permission-based
 */
export const getHomePageByRole = (role) => {
  const roleMap = {
    'hiring-manager': '/hiring-manager/dashboard',
    'HIRING_MANAGER': '/hiring-manager/dashboard',
    'pmo': '/pmo',
    'PMO': '/pmo',
    'approver': '/approver',
    'APPROVER': '/approver',
    'hr': '/hr',
    'HR': '/hr',
    'admin': '/admin',
    'ADMIN': '/admin',
  }
  return roleMap[role] || '/hiring-manager/dashboard'
}

/**
 * Permission-based route access validator
 * Use this in middleware or route guards
 */
export const canAccessRoute = (route, userPermissions = []) => {
  // Route to required permissions mapping
  const routePermissions = {
    '/hiring-manager/dashboard': [PERMISSIONS.DASHBOARD.READ],
    '/hiring-manager/create-rrf': [PERMISSIONS.RRF.CREATE],
    '/hiring-manager/my-requests': [PERMISSIONS.RRF.READ],
    '/approver': [PERMISSIONS.APPROVALS.READ],
    '/pmo': [PERMISSIONS.DASHBOARD.READ],
    '/hr': [PERMISSIONS.DASHBOARD.READ],
    '/reports': [PERMISSIONS.REPORTS.READ],
    '/users': [PERMISSIONS.USERS.READ],
    '/settings': [PERMISSIONS.SETTINGS.READ],
  }

  // If route is not in map, allow access (public route or not configured yet)
  if (!routePermissions[route]) {
    return true
  }

  // Check if user has ANY of the required permissions for this route
  return hasAnyPermission(routePermissions[route], userPermissions)
}
