// API functions for Functions and Subfunctions management
import { apiRequest } from './apiConfig';

// ============================================
// FUNCTIONS API
// ============================================

export const functionsApi = {
  // Get all functions with subfunctions
  getAll: async () => {
    return apiRequest('/functions', {
      method: 'GET',
    });
  },

  // Get single function by ID
  getById: async (id) => {
    return apiRequest(`/functions/${id}`, {
      method: 'GET',
    });
  },

  // Get subfunctions for a specific function (DEPENDENT DROPDOWN)
  getSubfunctions: async (functionId) => {
    return apiRequest(`/functions/${functionId}/subfunctions`, {
      method: 'GET',
    });
  },

  // Get unassigned subfunctions
  getUnassigned: async () => {
    return apiRequest('/functions/subfunctions/unassigned', {
      method: 'GET',
    });
  },

  // Create new function
  create: async (data) => {
    return apiRequest('/functions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update function
  update: async (id, data) => {
    return apiRequest(`/functions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete function (soft delete)
  delete: async (id) => {
    return apiRequest(`/functions/${id}`, {
      method: 'DELETE',
    });
  },

  // Assign subfunctions to function
  assignSubfunctions: async (functionId, subfunctionIds) => {
    return apiRequest(`/functions/${functionId}/subfunctions`, {
      method: 'POST',
      body: JSON.stringify({ subfunctionIds }),
    });
  },
};

// ============================================
// SUBFUNCTIONS API
// ============================================

export const subfunctionsApi = {
  // Get all subfunctions
  getAll: async () => {
    return apiRequest('/subfunctions', {
      method: 'GET',
    });
  },

  // Get single subfunction by ID
  getById: async (id) => {
    return apiRequest(`/subfunctions/${id}`, {
      method: 'GET',
    });
  },

  // Create new subfunction
  create: async (data) => {
    return apiRequest('/subfunctions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update subfunction
  update: async (id, data) => {
    return apiRequest(`/subfunctions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete subfunction
  delete: async (id) => {
    return apiRequest(`/subfunctions/${id}`, {
      method: 'DELETE',
    });
  },
};
