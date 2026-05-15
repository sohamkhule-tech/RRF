/**
 * Users API Service
 * Admin Panel user management API calls
 */

import { api } from './apiConfig';

export const usersApi = {
  /**
   * Get all users
   * Requires USERS.READ permission
   */
  getAll: async () => {
    try {
      const response = await api.get('/users');
      return response;
    } catch (error) {
      console.error('[usersApi] getAll error:', error);
      throw error;
    }
  },

  /**
   * Get all available roles
   * Requires USERS.READ permission
   */
  getRoles: async () => {
    try {
      const response = await api.get('/users/roles');
      return response;
    } catch (error) {
      console.error('[usersApi] getRoles error:', error);
      throw error;
    }
  },

  /**
   * Create a new user
   * Requires USERS.CREATE permission
   */
  create: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response;
    } catch (error) {
      console.error('[usersApi] create error:', error);
      throw error;
    }
  },

  /**
   * Update user (role, status, profile)
   * Requires USERS.UPDATE permission
   */
  update: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response;
    } catch (error) {
      console.error('[usersApi] update error:', error);
      throw error;
    }
  },

  /**
   * Delete user permanently
   * Requires USERS.DELETE permission
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response;
    } catch (error) {
      console.error('[usersApi] delete error:', error);
      throw error;
    }
  },
};
