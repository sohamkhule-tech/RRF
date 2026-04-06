/**
 * useRRFs Hook
 * Fetches and manages RRF list with filters
 */

import { useState, useEffect, useCallback } from 'react';
import { rrfApi, formatRrfListForDisplay } from '@/lib/api/rrfApi';
import toast from 'react-hot-toast';

export const useRRFs = (initialFilters = {}) => {
  const [rrfs, setRrfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
  });

  /**
   * Fetch RRFs from API
   */
  const fetchRRFs = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await rrfApi.getAll(filters);
      
      if (response.success) {
        const formattedData = formatRrfListForDisplay(response.data);
        setRrfs(formattedData);
        setPagination({
          total: response.total || formattedData.length,
          page: response.page || 1,
          limit: response.limit || 10,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch RRFs');
      }
    } catch (err) {
      console.error('Error fetching RRFs:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to load RRFs');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh RRF list
   */
  const refresh = useCallback(() => {
    fetchRRFs(initialFilters);
  }, [fetchRRFs, initialFilters]);

  /**
   * Delete RRF
   */
  const deleteRRF = useCallback(async (id) => {
    try {
      const response = await rrfApi.delete(id);
      
      if (response.success) {
        toast.success('RRF deleted successfully');
        // Remove from local state
        setRrfs((prev) => prev.filter((rrf) => rrf.id !== id));
      } else {
        throw new Error(response.message || 'Failed to delete RRF');
      }
    } catch (err) {
      console.error('Error deleting RRF:', err);
      toast.error(err.message || 'Failed to delete RRF');
      throw err;
    }
  }, []);

  /**
   * Submit RRF for approval
   */
  const submitRRF = useCallback(async (id) => {
    try {
      const response = await rrfApi.submit(id);
      
      if (response.success) {
        toast.success('RRF submitted for approval');
        // Update local state
        setRrfs((prev) =>
          prev.map((rrf) =>
            rrf.id === id ? { ...rrf, status: 'pending' } : rrf
          )
        );
      } else {
        throw new Error(response.message || 'Failed to submit RRF');
      }
    } catch (err) {
      console.error('Error submitting RRF:', err);
      toast.error(err.message || 'Failed to submit RRF');
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRRFs(initialFilters);
  }, [fetchRRFs, initialFilters]);

  return {
    rrfs,
    loading,
    error,
    pagination,
    refresh,
    deleteRRF,
    submitRRF,
  };
};
