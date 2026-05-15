'use client'

/**
 * PHASE 6 — Legacy compatibility redirect.
 * This route now delegates to the unified dashboard.
 * Original implementation preserved below (non-exported) for rollback.
 * Rollback: remove the redirect and restore `export default` on LegacyApproverDashboard.
 */
import { redirect } from 'next/navigation'
export default function Page() { redirect('/dashboard') }

// ── Original implementation (preserved for rollback) ────────────────────────

import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import ActionButton from '@/components/ActionButton'
import StatCard from '@/components/StatCard'
import { useState, useCallback, useMemo } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'
import { rrfApi } from '@/lib/api/rrfApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { useVisibilityRefresh } from '@/lib/useVisibilityRefresh'
import { CACHE_TTL } from '@/lib/apiCache'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useAuth } from '@/contexts/AuthContext'

function LegacyApproverDashboard() {
  const { user } = useAuth()
  const userId = user?.id
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch pending approvals — cached + deduplicated
  const {
    data: requests,
    loading: reqLoading,
    error: reqError,
    refresh: refreshRequests,
  } = useSmartFetch(userId ? `approver-pending-dash-${userId}` : null, () => rrfApi.getPendingApprovals(), {
    ttl: CACHE_TTL.LIST,
    transform: (data) => data || [],
  })

  // Fetch statistics — cached 60 s
  const {
    data: statistics,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useSmartFetch(userId ? `statistics-${userId}-true` : null, () => rrfApi.getStatistics(true), {
    ttl: CACHE_TTL.STATS,
    transform: (res) => (res?.success ? res.data : null),
  })

  const loading = (reqLoading && !requests?.length) || (statsLoading && !statistics)
  const error = reqError?.message || statsError?.message || null

  const fetchData = useCallback(() => {
    refreshRequests()
    refreshStats()
  }, [refreshRequests, refreshStats])

  // Single polling + visibility handler (60 s interval, replaces 30 s + double-fire)
  useVisibilityRefresh(fetchData, { intervalMs: 60_000 })

  // Fixed: actually uses the status param with a proper color map
  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending':          { bg: '#fef9c3', color: '#854d0e', text: 'Pending' },
      'submitted':        { bg: '#fef9c3', color: '#854d0e', text: 'Pending' },
      'approved':         { bg: '#dcfce7', color: '#166534', text: 'Approved' },
      'declined':         { bg: '#fee2e2', color: '#991b1b', text: 'Declined' },
      'rejected':         { bg: '#fee2e2', color: '#991b1b', text: 'Declined' },
      'on-hold':          { bg: '#fef3c7', color: '#92400e', text: 'On Hold' },
      'open_for_hiring':  { bg: '#dbeafe', color: '#1e40af', text: 'Open for Hiring' },
      'closed':           { bg: '#f3f4f6', color: '#374151', text: 'Closed' },
    }
    const key = status?.toLowerCase() || 'pending'
    const config = statusConfig[key] || statusConfig['pending']
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '999px', padding: '6px 12px' }}>
        {config.text}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'Low':      { bg: '#f3f4f6', color: '#374151' },
      'Medium':   { bg: '#dbeafe', color: '#1e40af' },
      'High':     { bg: '#fed7aa', color: '#9a3412' },
      'Critical': { bg: '#fee2e2', color: '#991b1b' },
    }
    const config = priorityConfig[priority] || priorityConfig['Medium']
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '999px', padding: '6px 12px' }}>
        {priority || 'Medium'}
      </span>
    )
  }

  // Memoised: computed once per [requests, searchTerm] change — eliminates duplicate .filter() call
  const filteredRequests = useMemo(() => {
    const base = (requests || []).slice(0, 5)
    if (!searchTerm) return base
    const s = searchTerm.toLowerCase()
    return base.filter(r =>
      (r.displayId || '').toLowerCase().includes(s) ||
      (r.createdBy?.fullName || '').toLowerCase().includes(s) ||
      (r.positionTitle || '').toLowerCase().includes(s) ||
      (r.projectName || '').toLowerCase().includes(s) ||
      (r.priority || '').toLowerCase().includes(s)
    )
  }, [requests, searchTerm])

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute requiredPermission={PERMISSIONS.APPROVALS.READ}>
        <div className="p-8">
          <LoadingSpinner message="Loading approver dashboard..." />
        </div>
      </ProtectedRoute>
    )
  }

  // Error state
  if (error) {
    return (
      <ProtectedRoute requiredPermission={PERMISSIONS.APPROVALS.READ}>
        <div className="p-8">
          <ErrorMessage message={error} onRetry={fetchData} />
        </div>
      </ProtectedRoute>
    )
  }

  const byStatus = statistics?.byStatus || {}
  const pendingCount  = (byStatus['submitted'] || 0) + (byStatus['pending'] || 0)
  const approvedCount = byStatus['approved'] || 0
  const declinedCount = (byStatus['declined'] || 0) + (byStatus['rejected'] || 0)
  const onHoldCount   = (byStatus['on-hold'] || 0) + (byStatus['onHold'] || 0)
  const closedCount   = (byStatus['closed'] || 0) + (byStatus['closedByBench'] || 0)

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.APPROVALS.READ}>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
          <StatCard title="Pending Approvals" value={String(pendingCount)} icon={<ClockCircleOutlined />} color="orange" href="/approver/pending" />
          <StatCard title="Approved"           value={String(approvedCount)} icon={<CheckCircleOutlined />} color="green" href="/approver/approved" />
          <StatCard title="Declined"           value={String(declinedCount)} icon={<CloseCircleOutlined />} color="red" href="/approver/declined" />
          <StatCard title="On Hold"            value={String(onHoldCount)} subtitle="Needs action" icon={<ClockCircleOutlined />} color="orange" href="/approver/on-hold" />
          <StatCard title="Closed"             value={String(closedCount)} icon={<CheckCircleOutlined />} color="indigo" href="/approver/closed" />
        </div>

        {/* Pending Requests Table */}
        <div className="bg-white overflow-hidden border border-gray-200 rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-bold text-gray-900">Recent Requests</h3>
          </div>

          {/* Search Box */}
          <div className="px-4 md:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-md">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by ID, Manager, Role, Project or Priority..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
                  style={{ borderRadius: '10px' }}
                />
              </div>
              <button
                onClick={fetchData}
                className="px-4 py-3 border-2 border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-300 flex items-center justify-center gap-2"
                style={{ borderRadius: '10px' }}
                title="Refresh data"
              >
                <ReloadOutlined className="text-lg" />
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Manager</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="transition-all duration-200 hover:bg-gray-50/70">
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.displayId}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.createdBy?.fullName || 'Unknown'}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.positionTitle}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.projectName || 'N/A'}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs border border-indigo-200">
                          {request.headcount}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">{getStatusBadge(request.status)}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        <ActionButton
                          role="APPROVER"
                          status={request.status}
                          href={`/requests/${request.id}`}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                        <p className="text-sm font-medium">
                          {searchTerm ? `No requests found matching "${searchTerm}"` : 'No pending approvals'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden px-4 pb-4 space-y-3">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-indigo-600 mb-1">{request.displayId}</div>
                      <div className="text-sm font-bold text-gray-900 truncate">{request.positionTitle}</div>
                      <div className="text-xs text-gray-500 truncate">{request.createdBy?.fullName || 'Unknown'} • {request.projectName || 'N/A'}</div>
                    </div>
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs ml-2 flex-shrink-0">{request.headcount}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getPriorityBadge(request.priority)}
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <ActionButton role="APPROVER" status={request.status} href={`/requests/${request.id}`} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                <p className="text-sm font-medium mt-2">{searchTerm ? `No requests found matching "${searchTerm}"` : 'No pending approvals'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
