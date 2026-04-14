/**
 * Lightweight in-memory TTL cache for API responses.
 * Singleton — shared across all hooks and components in the same browser tab.
 *
 * Cache keys are arbitrary strings (e.g. "my-requests", "statistics-true", "all-rrfs").
 * Each entry stores { data, timestamp }.
 *
 * Default TTL values (milliseconds):
 *   LIST   = 30 000  (30 s)  — list endpoints (my-requests, getAll, etc.)
 *   STATS  = 60 000  (60 s)  — aggregate statistics
 *   CONFIG = 300 000 (5 min) — form-config (rarely changes)
 */

const _store = new Map();

/** In-flight request promises keyed by cache key — used for deduplication */
const _inflight = new Map();

// ── TTL presets ─────────────────────────────────────────────────
export const CACHE_TTL = {
  LIST: 30_000,
  STATS: 60_000,
  CONFIG: 300_000,
};

// ── Core API ────────────────────────────────────────────────────

/**
 * Return cached data if it exists and is younger than `ttlMs`.
 * Returns `null` when the cache is empty or stale.
 */
export function getCached(key, ttlMs = CACHE_TTL.LIST) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) return null;
  return entry.data;
}

/**
 * Store data in the cache under `key`.
 */
export function setCache(key, data) {
  _store.set(key, { data, timestamp: Date.now() });
}

/**
 * Remove a single cache entry.
 */
export function invalidateCache(key) {
  _store.delete(key);
}

/**
 * Remove all cache entries whose key matches the given regex.
 * Useful after mutations (e.g. approve → invalidate all approver-related keys).
 */
export function invalidateCachePattern(pattern) {
  for (const key of _store.keys()) {
    if (pattern.test(key)) {
      _store.delete(key);
    }
  }
}

/**
 * Remove ALL cache entries.
 */
export function clearAllCache() {
  _store.clear();
}

// ── Deduplication helpers ───────────────────────────────────────

/**
 * Returns an existing in-flight promise for `key`, or `null`.
 */
export function getInflight(key) {
  return _inflight.get(key) || null;
}

/**
 * Registers an in-flight promise so concurrent callers can share it.
 */
export function setInflight(key, promise) {
  _inflight.set(key, promise);
}

/**
 * Clears the in-flight registration for `key`.
 */
export function clearInflight(key) {
  _inflight.delete(key);
}
