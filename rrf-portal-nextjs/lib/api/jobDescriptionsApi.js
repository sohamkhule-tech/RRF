import { api } from './apiConfig';

/**
 * Job Descriptions API Service
 */
export const jobDescriptionsApi = {
  /**
   * Get all job descriptions (for dropdown)
   * Supports optional filtering by subFunction
   */
  async getAll(subFunction) {
    try {
      const url = subFunction 
        ? `/job-descriptions?subFunction=${encodeURIComponent(subFunction)}` 
        : '/job-descriptions';
      const response = await api.get(url);
      return response?.data || response;
    } catch (error) {
      console.error('Error fetching job descriptions:', error);
      throw error;
    }
  },

  /**
   * Get a single job description by ID
   */
  async getById(id) {
    try {
      const response = await api.get(`/job-descriptions/${id}`);
      return response?.data || response;
    } catch (error) {
      console.error('Error fetching job description:', error);
      throw error;
    }
  },

  /**
   * Create a new job description
   */
  async create(data) {
    try {
      return await api.post('/job-descriptions', data);
    } catch (error) {
      console.error('Error creating job description:', error);
      throw error;
    }
  },

  /**
   * Update a job description
   */
  async update(id, data) {
    try {
      return await api.put(`/job-descriptions/${id}`, data);
    } catch (error) {
      console.error('Error updating job description:', error);
      throw error;
    }
  },

  /**
   * Delete a job description
   */
  async delete(id) {
    try {
      return await api.delete(`/job-descriptions/${id}`);
    } catch (error) {
      console.error('Error deleting job description:', error);
      throw error;
    }
  },
};
