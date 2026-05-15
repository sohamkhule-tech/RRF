'use client'

/**
 * PHASE 6 — Legacy compatibility redirect.
 * This route now delegates to the unified workflow create page.
 * Original implementation preserved below (non-exported) for rollback.
 * Rollback: remove the redirect and restore `export default` on LegacyCreateRRFPage.
 */
import { redirect } from 'next/navigation'
export default function Page() { redirect('/workflow/create') }

// ── Original implementation (preserved for rollback) ────────────────────────

import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'
import ModernRRFForm from '@/components/ModernRRFForm'

function LegacyCreateRRFPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.RRF.CREATE}>
      <ModernRRFForm userRole="hiring-manager" />
    </ProtectedRoute>
  )
}
