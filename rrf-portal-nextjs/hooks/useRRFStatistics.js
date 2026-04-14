/**
 * useRRFStatistics Hook
 * Fetches and manages RRF statistics for dashboard.
 *
 * Uses useSmartFetch for caching (60 s TTL) + deduplication.
 */

import { useCallback, useMemo } from 'react';
import { rrfApi } from '@/lib/api/rrfApi';
import { useSmartFetch } from '@/lib/useSmartFetch';
import { CACHE_TTL } from '@/lib/apiCache';

const EMPTY_STATS = {
  total: 0,
  byStatus: { draft: 0, pending: 0, approved: 0, rejected: 0, onHold: 0, closed: 0 },
};

export const useRRFStatistics = (includeAll = false) => {
  const cacheKey = `statistics-${includeAll}`;

  // Stable fetcher — captured `includeAll` is constant for the hook's lifetime
  const fetcher = useCallback(
    () => rrfApi.getStatistics(includeAll),
    [includeAll],
  );

  const transform = useCallback((response) => {
    if (response?.success) {
      const d = response.data;
      if (!d || (!d.total && !d.byStatus)) return EMPTY_STATS;
      return d;
    }
    return EMPTY_STATS;
  }, []);

  const { data, loading, error, refresh } = useSmartFetch(cacheKey, fetcher, {
    ttl: CACHE_TTL.STATS,
    transform,
  });

  return {
    statistics: data ?? EMPTY_STATS,
    loading,
    error: error?.message || null,
    refresh,
  };
};
