/**
 * Permissions API Service
 * Fetch all available permissions for admin UI
 */

import { api } from './apiConfig';

export const permissionsApi = {
  /**
   * Get all active permissions with module information
   * Requires ROLES.UPDATE permission
   */
  getAll: async () => {
    try {
      console.log('[permissionsApi] Fetching all permissions...');
      const response = await api.get('/permissions');
      console.log('[permissionsApi] Success:', response);
      return response;
    } catch (error) {
      console.error('[permissionsApi] getAll error:', error);
      console.error('[permissionsApi] Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
      });
      throw error;
    }
  },
};
