/**
 * useRRFs Hook
 * Fetches and manages RRF list with filters.
 *
 * Uses useSmartFetch for caching + deduplication.
 */

import { useState, useCallback } from 'react';
import { rrfApi, formatRrfListForDisplay } from '@/lib/api/rrfApi';
import { useSmartFetch } from '@/lib/useSmartFetch';
import { invalidateCachePattern, CACHE_TTL } from '@/lib/apiCache';
import toast from 'react-hot-toast';

export const useRRFs = (initialFilters = {}) => {
  const cacheKey = `rrfs-${JSON.stringify(initialFilters)}`;

  const fetcher = useCallback(
    () => rrfApi.getAll(initialFilters),
    [initialFilters],
  );

  const transform = useCallback((response) => {
    if (response?.success) {
      return {
        data: formatRrfListForDisplay(response.data),
        total: response.total,
        page: response.page,
        limit: response.limit,
      };
    }
    return { data: [], total: 0, page: 1, limit: 10 };
  }, []);

  const {
    data: result,
    loading: smartLoading,
    error: smartError,
    refresh: smartRefresh,
  } = useSmartFetch(cacheKey, fetcher, {
    ttl: CACHE_TTL.LIST,
    transform,
  });

  // Local overrides for optimistic mutations
  const [localOverrides, setLocalOverrides] = useState(null);

  const rrfs = localOverrides ?? result?.data ?? [];
  const loading = smartLoading && rrfs.length === 0;
  const error = smartError?.message || null;
  const pagination = {
    total: result?.total || rrfs.length,
    page: result?.page || 1,
    limit: result?.limit || 10,
  };

  const refresh = useCallback(() => {
    setLocalOverrides(null);
    smartRefresh();
  }, [smartRefresh]);

  /**
   * Delete RRF
   */
  const deleteRRF = useCallback(
    async (id) => {
      try {
        const response = await rrfApi.delete(id);

        if (response.success) {
          toast.success('RRF deleted successfully');
          setLocalOverrides((prev) =>
            (prev ?? rrfs).filter((rrf) => rrf.id !== id),
          );
          invalidateCachePattern(/rrfs|my-requests|statistics/);
        } else {
          throw new Error(response.message || 'Failed to delete RRF');
        }
      } catch (err) {
        console.error('Error deleting RRF:', err);
        toast.error(err.message || 'Failed to delete RRF');
        throw err;
      }
    },
    [rrfs],
  );

  /**
   * Submit RRF for approval
   */
  const submitRRF = useCallback(
    async (id) => {
      try {
        const response = await rrfApi.submit(id);

        if (response.success) {
          toast.success('RRF submitted for approval');
          setLocalOverrides((prev) =>
            (prev ?? rrfs).map((rrf) =>
              rrf.id === id ? { ...rrf, status: 'pending' } : rrf,
            ),
          );
          invalidateCachePattern(/rrfs|my-requests|statistics/);
        } else {
          throw new Error(response.message || 'Failed to submit RRF');
        }
      } catch (err) {
        console.error('Error submitting RRF:', err);
        toast.error(err.message || 'Failed to submit RRF');
        throw err;
      }
    },
    [rrfs],
  );

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
