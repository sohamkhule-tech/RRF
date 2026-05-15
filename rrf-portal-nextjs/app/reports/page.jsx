'use client'

/**
 * /reports — Unified Reports Page
 *
 * Routes to the appropriate ReportsDashboard variant based on role.
 * PMO and Approver both had their own /pmo/reports and /approver/reports pages.
 * This unified page replaces both for users navigating through the unified sidebar.
 *
 * Sidebar config (sidebarConfig.js) routes APPROVER and PMO to /reports.
 */

import { useAuth } from '@/contexts/AuthContext'
import ReportsDashboard from '@/components/ReportsDashboard'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function ReportsPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner message="Loading reports..." />
      </div>
    )
  }

  const roleCode = String(user?.role?.code || user?.role || '').toUpperCase()
  const role = roleCode === 'PMO' ? 'pmo' : 'approver'

  return <ReportsDashboard role={role} />
}
