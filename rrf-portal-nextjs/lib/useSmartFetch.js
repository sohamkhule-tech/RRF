/**
 * useSmartFetch — SWR-style data-fetching hook with:
 *
 *  • In-memory TTL cache (via apiCache.js)
 *  • Request deduplication (concurrent calls share one in-flight promise)
 *  • React 18 Strict Mode safe (useRef guards double-mount)
 *  • Returns { data, loading, error, refresh, isStale }
 *
 * Usage:
 *   const { data, loading, error, refresh } = useSmartFetch(
 *     'my-requests',              // cache key (unique per dataset)
 *     () => rrfApi.getMyRequests(), // fetcher function
 *     { ttl: CACHE_TTL.LIST }     // optional overrides
 *   );
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCached,
  setCache,
  invalidateCache,
  getInflight,
  setInflight,
  clearInflight,
  CACHE_TTL,
} from '@/lib/apiCache';

/**
 * @param {string}   cacheKey  Unique key for this dataset.  Pass `null` to disable fetching.
 * @param {Function} fetcher   Async function that returns the data.
 * @param {object}   [opts]
 * @param {number}   [opts.ttl]           Cache TTL in ms (default CACHE_TTL.LIST = 30 s).
 * @param {Function} [opts.transform]     Optional post-fetch transform  (rawData) => finalData.
 * @param {boolean}  [opts.skipInitial]   If true, don't fetch on mount (manual refresh only).
 */
export function useSmartFetch(cacheKey, fetcher, opts = {}) {
  const { ttl = CACHE_TTL.LIST, transform, skipInitial = false } = opts;

  // Seed state from cache (instant render for previously-seen data)
  const cached = cacheKey ? getCached(cacheKey, ttl) : null;

  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached && !skipInitial);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(!cached);

  // Guards for Strict Mode double-mount and component unmount
  const mountedRef = useRef(false);
  const fetchIdRef = useRef(0); // incremented per fetch to discard stale responses

  /**
   * Core fetch logic — called by both the initial useEffect and manual `refresh()`.
   *
   * @param {boolean} [force=false]  When true, ignores cache and forces a network request.
   */
  const doFetch = useCallback(
    async (force = false) => {
      if (!cacheKey || !fetcher) return;

      // 1. Cache hit → return immediately (unless forced)
      if (!force) {
        const hit = getCached(cacheKey, ttl);
        if (hit) {
          setData(hit);
          setLoading(false);
          setIsStale(false);
          return;
        }
      }

      // 2. De-duplicate: if the same key already has an in-flight request, share it
      const existing = getInflight(cacheKey);
      if (existing) {
        try {
          const result = await existing;
          const final = transform ? transform(result) : result;
          setData(final);
          setLoading(false);
          setIsStale(false);
        } catch {
          /* the original caller handles errors */
        }
        return;
      }

      // 3. New request
      const id = ++fetchIdRef.current;
      setLoading(true);
      setError(null);

      const promise = fetcher();
      setInflight(cacheKey, promise);

      try {
        const raw = await promise;
        clearInflight(cacheKey);

        // Discard if a newer fetch was started or component unmounted
        if (id !== fetchIdRef.current || !mountedRef.current) return;

        const final = transform ? transform(raw) : raw;
        setCache(cacheKey, final);
        setData(final);
        setIsStale(false);
      } catch (err) {
        clearInflight(cacheKey);
        if (id !== fetchIdRef.current || !mountedRef.current) return;
        setError(err);
      } finally {
        if (id === fetchIdRef.current && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [cacheKey, fetcher, ttl, transform],
  );

  /**
   * Public refresh — always forces a network request (bypasses cache).
   */
  const refresh = useCallback(() => {
    if (cacheKey) invalidateCache(cacheKey);
    doFetch(true);
  }, [cacheKey, doFetch]);

  // ── Initial fetch on mount ────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (!skipInitial) {
      doFetch(false); // cache-first
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]); // re-fetch only when the key changes

  return { data, loading, error, refresh, isStale };
}
