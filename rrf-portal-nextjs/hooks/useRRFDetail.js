/**
 * useRRFDetail Hook
 * Fetches and manages single RRF details.
 *
 * Uses useSmartFetch for caching + deduplication.
 */

import { useCallback } from 'react';
import { rrfApi, formatRrfForDisplay } from '@/lib/api/rrfApi';
import { useSmartFetch } from '@/lib/useSmartFetch';
import { CACHE_TTL } from '@/lib/apiCache';
import { useAuth } from '@/contexts/AuthContext';

export const useRRFDetail = (id) => {
  const { user } = useAuth();
  const userId = user?.id;
  const cacheKey = (id && userId) ? `rrf-detail-${userId}-${id}` : null;

  const fetcher = useCallback(() => rrfApi.getById(id), [id]);

  const transform = useCallback((response) => {
    if (response?.success) {
      return formatRrfForDisplay(response.data);
    }
    return null;
  }, []);

  const { data, loading, error, refresh } = useSmartFetch(cacheKey, fetcher, {
    ttl: CACHE_TTL.LIST,
    transform,
  });

  /**
   * Update RRF locally (optimistic update)
   */
  const updateLocal = useCallback(() => {
    // No-op placeholder — callers can use refresh() after mutations
  }, []);

  return {
    rrf: data ?? null,
    loading,
    error: error?.message || null,
    refresh,
    updateLocal,
  };
};
