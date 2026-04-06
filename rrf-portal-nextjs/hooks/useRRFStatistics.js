/**
 * useRRFStatistics Hook
 * Fetches and manages RRF statistics for dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { rrfApi } from '@/lib/api/rrfApi';
import toast from 'react-hot-toast';

export const useRRFStatistics = (includeAll = false) => {
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: {
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      onHold: 0,
      closed: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch statistics from API
   */
  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await rrfApi.getStatistics(includeAll);
      
      if (response.success) {
        const statsData = response.data;
        
        if (!statsData || (!statsData.total && !statsData.byStatus)) {
          setStatistics({
            total: 0,
            byStatus: { draft: 0, pending: 0, approved: 0, rejected: 0, onHold: 0, closed: 0 },
          });
        } else {
          setStatistics(statsData);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError(err.message);
      setStatistics({
        total: 0,
        byStatus: {
          draft: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          onHold: 0,
          closed: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [includeAll]);

  /**
   * Refresh statistics
   */
  const refresh = useCallback(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Initial fetch
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    error,
    refresh,
  };
};
