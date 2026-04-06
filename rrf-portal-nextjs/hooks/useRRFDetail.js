/**
 * useRRFDetail Hook
 * Fetches and manages single RRF details
 */

import { useState, useEffect, useCallback } from 'react';
import { rrfApi, formatRrfForDisplay } from '@/lib/api/rrfApi';
import toast from 'react-hot-toast';

export const useRRFDetail = (id) => {
  const [rrf, setRrf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch RRF details
   */
  const fetchRRF = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await rrfApi.getById(id);
      
      if (response.success) {
        const formattedData = formatRrfForDisplay(response.data);
        setRrf(formattedData);
      } else {
        throw new Error(response.message || 'Failed to fetch RRF details');
      }
    } catch (err) {
      console.error('Error fetching RRF details:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to load RRF details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * Refresh RRF details
   */
  const refresh = useCallback(() => {
    fetchRRF();
  }, [fetchRRF]);

  /**
   * Update RRF locally (optimistic update)
   */
  const updateLocal = useCallback((updates) => {
    setRrf((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRRF();
  }, [fetchRRF]);

  return {
    rrf,
    loading,
    error,
    refresh,
    updateLocal,
  };
};
