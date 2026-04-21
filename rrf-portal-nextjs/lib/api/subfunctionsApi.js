/**
 * Subfunctions API Client
 * Handles all API calls related to subfunctions
 */

import { api } from './apiConfig';

export const subfunctionsApi = {
  /**
   * Get all active subfunctions
   * @returns {Promise} Promise resolving to subfunctions array
   */
  getAll: async () => {
    try {
      const response = await api.get('/subfunctions');
      return response.data;
    } catch (error) {
      console.error('Error fetching subfunctions:', error);
      throw error;
    }
  },

  /**
   * Get subfunctions filtered by function type
   * @param {string} functionName - The function type (Delivery, Sales, Support)
   * @returns {Promise} Promise resolving to filtered subfunctions array
   */
  getByFunction: async (functionName) => {
    try {
      const response = await api.get(`/subfunctions?function=${functionName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching subfunctions for ${functionName}:`, error);
      throw error;
    }
  },
};
