/**
 * Roles API Service
 * Admin Panel role management and role-permission assignment
 */

import { api } from './apiConfig';

export const rolesApi = {
  /**
   * Get all roles
   * Reuses existing endpoint from users API
   * Requires USERS.READ or ROLES.UPDATE permission
   */
  getAll: async () => {
    try {
      const response = await api.get('/users/roles');
      return response;
    } catch (error) {
      console.error('[rolesApi] getAll error:', error);
      throw error;
    }
  },

  /**
   * Get permissions assigned to a specific role
   * Requires ROLES.UPDATE permission
   */
  getPermissions: async (roleId) => {
    try {
      console.log(`[rolesApi] Fetching permissions for role ${roleId}...`);
      const response = await api.get(`/roles/${roleId}/permissions`);
      console.log('[rolesApi] getPermissions success:', response);
      return response;
    } catch (error) {
      console.error('[rolesApi] getPermissions error:', error);
      console.error('[rolesApi] Error details:', {
        message: error.message,
        roleId,
        response: error.response,
      });
      throw error;
    }
  },

  /**
   * Update role permissions
   * Requires ROLES.UPDATE permission
   * @param {number} roleId - Role ID to update
   * @param {number[]} permissionIds - Array of permission IDs to assign
   */
  updatePermissions: async (roleId, permissionIds) => {
    try {
      const response = await api.put(`/roles/${roleId}/permissions`, {
        permissionIds,
      });
      return response;
    } catch (error) {
      console.error('[rolesApi] updatePermissions error:', error);
      throw error;
    }
  },
};
