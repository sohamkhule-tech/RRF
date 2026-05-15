/**
 * /workflow/[id]/edit — Unified edit route under the /workflow namespace.
 *
 * Routes to the appropriate role-specific edit implementation:
 *   - Approver → ModernRRFForm wrapper (same as /approver/edit-rrf/[id])
 *   - All others → legacy HM multi-step form (same as /hiring-manager/edit-rrf/[id])
 *
 * Per the Strangler Pattern rules: DO NOT rebuild or duplicate detail pages.
 * This page delegates to existing edit page components without duplicating logic.
 *
 * STRANGLER PATTERN:
 *   - Old edit routes remain untouched at /approver/edit-rrf/[id] & /hiring-manager/edit-rrf/[id]
 *   - This page provides a role-neutral entry point under /workflow/
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import ApproverEditRRF from '@/app/approver/edit-rrf/[id]/page'
import HMEditRRFPage from '@/app/hiring-manager/edit-rrf/[id]/page'

export default function WorkflowEditPage() {
  const { user } = useAuth()
  const roleCode = String(user?.role?.code || user?.role || '').toUpperCase()

  if (roleCode === 'APPROVER') {
    return <ApproverEditRRF />
  }

  return <HMEditRRFPage />
}
