/**
 * useMyRequests Hook
 * Fetches and manages current user's RRF requests.
 *
 * Uses useSmartFetch for caching + deduplication — eliminates double-fetches
 * from React Strict Mode and from pages that call refresh() on mount.
 */

import { useState, useCallback, useMemo } from 'react';
import { rrfApi, formatRrfListForDisplay } from '@/lib/api/rrfApi';
import { useSmartFetch } from '@/lib/useSmartFetch';
import { invalidateCachePattern, CACHE_TTL } from '@/lib/apiCache';
import toast from 'react-hot-toast';

// Stable fetcher reference (outside component to avoid re-creation)
const fetcherFn = () => rrfApi.getMyRequests();

// Transform: extract, format, filter drafts
const transformFn = (response) => {
  if (response && response.success) {
    const data = response.data || [];
    if (data.length === 0) return [];
    const formatted = formatRrfListForDisplay(data);
    return formatted.filter((req) => req.status?.toLowerCase() !== 'draft');
  }
  return [];
};

export const useMyRequests = () => {
  const {
    data,
    loading: smartLoading,
    error: smartError,
    refresh: smartRefresh,
  } = useSmartFetch('my-requests', fetcherFn, {
    ttl: CACHE_TTL.LIST,
    transform: transformFn,
  });

  // Local overrides — allow optimistic mutations to update the list instantly
  const [localOverrides, setLocalOverrides] = useState(null);

  const requests = localOverrides ?? data ?? [];
  const loading = smartLoading && requests.length === 0;
  const error = smartError?.message || null;

  const refresh = useCallback(() => {
    setLocalOverrides(null);
    smartRefresh();
  }, [smartRefresh]);

  /**
   * Filter requests by status (client-side)
   */
  const filterByStatus = useCallback(
    (status) => {
      if (!status || status === 'all') return requests;
      return requests.filter(
        (req) => req.status.toLowerCase() === status.toLowerCase(),
      );
    },
    [requests],
  );

  /**
   * Delete RRF
   */
  const deleteRequest = useCallback(
    async (id) => {
      try {
        await rrfApi.delete(id);
        toast.success('Request deleted successfully');
        // Optimistic update
        setLocalOverrides((prev) =>
          (prev ?? requests).filter((req) => req.id !== id),
        );
        invalidateCachePattern(/my-requests|statistics/);
      } catch (err) {
        toast.error(err.message || 'Failed to delete request');
        throw err;
      }
    },
    [requests],
  );

  /**
   * Submit RRF for approval
   */
  const submitRequest = useCallback(
    async (id) => {
      try {
        await rrfApi.submit(id);
        toast.success('Request submitted for approval');
        // Optimistic update
        setLocalOverrides((prev) =>
          (prev ?? requests).map((req) =>
            req.id === id ? { ...req, status: 'pending' } : req,
          ),
        );
        invalidateCachePattern(/my-requests|statistics/);
      } catch (err) {
        toast.error(err.message || 'Failed to submit request');
        throw err;
      }
    },
    [requests],
  );

  return {
    requests,
    loading,
    error,
    refresh,
    filterByStatus,
    deleteRequest,
    submitRequest,
  };
};
