/**
 * useVisibilityRefresh — Visibility-aware polling utility.
 *
 * Replaces the many hand-rolled `setInterval` + `visibilitychange` patterns
 * across dashboards with a single, optimised version.
 *
 * Behaviour:
 *  • Calls `refreshFn` at most once every `intervalMs` (default 60 s).
 *  • Pauses the interval while the tab is hidden.
 *  • When the tab becomes visible again, calls `refreshFn` ONLY if the age
 *    since the last call exceeds `staleMs` (default = intervalMs).
 *  • Does NOT call `refreshFn` on mount — that is the hook's / component's job.
 *
 * Usage:
 *   useVisibilityRefresh(refreshMyData, { intervalMs: 60000 });
 *
 * @param {Function} refreshFn   Callback that triggers an API refresh.
 * @param {object}   [opts]
 * @param {number}   [opts.intervalMs=60000]  Polling interval in ms.
 * @param {number}   [opts.staleMs]           How old data must be before a
 *                                            visibility-return triggers a refresh
 *                                            (defaults to intervalMs).
 */

'use client';

import { useEffect, useRef } from 'react';

export function useVisibilityRefresh(refreshFn, opts = {}) {
  const { intervalMs = 60_000, staleMs } = opts;
  const effectiveStale = staleMs ?? intervalMs;

  const lastCallRef = useRef(Date.now());
  const refreshRef = useRef(refreshFn);

  // Always keep the latest refreshFn without re-running the effect
  useEffect(() => {
    refreshRef.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    // Record the mount time as the first "call"
    lastCallRef.current = Date.now();

    // Wrapped caller — updates the timestamp
    const call = () => {
      lastCallRef.current = Date.now();
      refreshRef.current();
    };

    // ── Interval (pauses while hidden) ──────────────────────────
    let timer = setInterval(() => {
      if (!document.hidden) {
        call();
      }
    }, intervalMs);

    // ── Visibility handler ──────────────────────────────────────
    const onVisibility = () => {
      if (!document.hidden) {
        const age = Date.now() - lastCallRef.current;
        if (age >= effectiveStale) {
          call();
        }
        // Restart the interval so it doesn't fire immediately after
        clearInterval(timer);
        timer = setInterval(() => {
          if (!document.hidden) {
            call();
          }
        }, intervalMs);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, effectiveStale]);
}
