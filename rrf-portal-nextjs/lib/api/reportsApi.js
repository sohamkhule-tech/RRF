/**
 * Reports API Service
 * All reports-related API calls
 */

import { api } from './apiConfig';

export const reportsApi = {
  /**
   * Get KPI aggregation data for dashboard cards
   */
  getKpis: async () => {
    const response = await api.get('/reports/kpis');
    return response?.data || null;
  },

  /**
   * Get paginated dataset for selected KPI / filters
   */
  getDataset: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const endpoint = `/reports/dataset${query.toString() ? `?${query.toString()}` : ''}`;
    return api.get(endpoint);
  },

  /**
   * Export current filtered view (no pagination limit)
   */
  exportCurrentView: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const endpoint = `/reports/export/current${query.toString() ? `?${query.toString()}` : ''}`;
    const response = await api.get(endpoint);
    return response?.data || [];
  },

  /**
   * Export full report of all reportable RRFs
   */
  exportFullReport: async () => {
    const response = await api.get('/reports/export/full');
    return response?.data || [];
  },
};
