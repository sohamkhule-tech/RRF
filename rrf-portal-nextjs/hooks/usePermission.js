/**
 * usePermission Hook
 * 
 * Custom React hook for checking permissions in components
 * Provides easy access to permission checking throughout the app
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  canAccessModule,
  getModulePermissions 
} from '@/utils/permissions'

/**
 * Hook for permission checking in React components
 * 
 * @returns {Object} Permission checking functions
 * 
 * @example
 * const { hasPermission, canCreate, canApprove } = usePermission()
 * 
 * if (hasPermission('RRF.CREATE')) {
 *   // Show create button
 * }
 * 
 * {canCreate && <button>Create RRF</button>}
 * {canApprove && <button>Approve</button>}
 */
export const usePermission = () => {
  const { user } = useAuth()
  const permissions = user?.permissions || []

  return {
    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission code (e.g., 'RRF.CREATE')
     */
    hasPermission: (permission) => hasPermission(permission, permissions),

    /**
     * Check if user has ANY of the specified permissions
     * @param {string[]} permissionArray - Array of permission codes
     */
    hasAnyPermission: (permissionArray) => hasAnyPermission(permissionArray, permissions),

    /**
     * Check if user has ALL of the specified permissions
     * @param {string[]} permissionArray - Array of permission codes
     */
    hasAllPermissions: (permissionArray) => hasAllPermissions(permissionArray, permissions),

    /**
     * Check if user can access a specific module
     * @param {string} moduleName - Module code (e.g., 'RRF', 'DASHBOARD')
     */
    canAccessModule: (moduleName) => canAccessModule(moduleName, permissions),

    /**
     * Get all permissions for a specific module
     * @param {string} moduleName - Module code
     */
    getModulePermissions: (moduleName) => getModulePermissions(moduleName, permissions),

    /**
     * Get raw permissions array
     */
    permissions,

    /**
     * Raw user object — use user.role for identity checks, permissions for capability checks
     */
    user,

    /**
     * Convenient permission flags (most commonly used)
     */
    canCreateRRF: hasPermission('RRF.CREATE', permissions),
    canReadRRF: hasPermission('RRF.READ', permissions),
    canUpdateRRF: hasPermission('RRF.UPDATE', permissions),
    canDeleteRRF: hasPermission('RRF.DELETE', permissions),
    
    canApprove: hasPermission('APPROVALS.APPROVE', permissions),
    canDecline: hasPermission('APPROVALS.REJECT', permissions),
    canViewApprovals: hasPermission('APPROVALS.READ', permissions),
    
    canViewDashboard: hasPermission('DASHBOARD.READ', permissions),
    
    canManageUsers: hasPermission('USERS.CREATE', permissions) || 
                    hasPermission('USERS.UPDATE', permissions) || 
                    hasPermission('USERS.DELETE', permissions),
    
    canViewReports: hasPermission('REPORTS.READ', permissions),
    canExportReports: hasPermission('REPORTS.EXPORT', permissions),
    
    canManageSettings: hasPermission('SETTINGS.UPDATE', permissions),
  }
}
