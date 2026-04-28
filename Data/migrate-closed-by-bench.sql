-- Migration: Normalize legacy CLOSED_BY_BENCH records into the unified CLOSED workflow
-- Run this ONCE in production after deploying the refactored code.
--
-- Business rule:
--   Old:  status = 'closed-by-bench'  →  internal resource was allocated
--   New:  status = 'closed'            +  close_reason = 'SOURCED_INTERNALLY'
--
-- Preserves: closedAt, closedById, candidateName, joiningDate, internalRrfNo, notes
-- Does NOT delete any columns or rows.

BEGIN;

UPDATE rrfs
SET
  status        = 'closed',
  close_reason  = 'SOURCED_INTERNALLY',
  closure_status = COALESCE(NULLIF(closure_status, 'filled-by-bench'), 'Sourced Internally')
WHERE
  status = 'closed-by-bench';

-- Verify
SELECT
  COUNT(*) FILTER (WHERE status = 'closed-by-bench')  AS remaining_closed_by_bench,
  COUNT(*) FILTER (WHERE status = 'closed' AND close_reason = 'SOURCED_INTERNALLY') AS normalized_sourced_internally
FROM rrfs;

COMMIT;
