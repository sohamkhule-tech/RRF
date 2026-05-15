/**
 * /workflow/[id] — Unified detail view under the /workflow namespace.
 *
 * This is a thin wrapper that re-exports the already-unified ViewRRF page
 * from /requests/[id]. It exists so that the new sidebar and tables can
 * link to /workflow/123 instead of /requests/123 — keeping the URL
 * namespace consistent with the new architecture.
 *
 * STRANGLER PATTERN:
 *   - /requests/[id] remains untouched and fully functional
 *   - This page simply renders the same component
 *   - Old sidebar links to /requests/[id]; new sidebar can link here
 */

import UnifiedViewRRFPage from '@/app/requests/[id]/page'

export default UnifiedViewRRFPage
