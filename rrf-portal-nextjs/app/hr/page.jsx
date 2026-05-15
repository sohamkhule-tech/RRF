'use client'

/**
 * PHASE 6 — Legacy compatibility redirect.
 * Original implementation preserved below (non-exported) for rollback.
 * Rollback: remove the redirect and restore `export default` on LegacyHRDashboard.
 */
import { redirect } from 'next/navigation'
export default function Page() { redirect('/dashboard') }

// ── Original implementation (preserved for rollback) ────────────────────────

import { FolderOpenOutlined, CheckCircleOutlined, SearchOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import ActionButton from '@/components/ActionButton'
import StatCard from '@/components/StatCard'
import { useState, useCallback, useMemo } from 'react'
import { rrfApi } from '@/lib/api/rrfApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { useVisibilityRefresh } from '@/lib/useVisibilityRefresh'
import { CACHE_TTL } from '@/lib/apiCache'
import { useAuth } from '@/contexts/AuthContext'

function LegacyHRDashboard() {
  const { user } = useAuth()
  const userId = user?.id
  const [searchTerm, setSearchTerm] = useState('')

  // Shared all-rrfs cache (also used by pmo/closed, pmo/sent-to-approvers, hr/closed)
  const {
    data: allRrfs,
    refresh: refreshAll,
  } = useSmartFetch(userId ? `all-rrfs-${userId}` : null, () => rrfApi.getAll({ limit: 1000 }), {
    ttl: CACHE_TTL.LIST,
    transform: (response) => response?.data?.data || response?.data || [],
  })

  // Open for hiring positions
  const {
    data: openData,
    loading,
    refresh: refreshOpen,
  } = useSmartFetch(userId ? `hr-open-for-hiring-${userId}` : null, () => rrfApi.getOpenForHiring(), {
    ttl: CACHE_TTL.LIST,
    transform: (res) => {
      const data = res?.data || res || []
      return Array.isArray(data)
        ? data.map(rrf => ({
            id: rrf.id,
            rrfId: rrf.rrfNumber,
            role: rrf.jobTitle || rrf.positionTitle,
            project: rrf.projectName,
            positions: rrf.numberOfPositions || rrf.headcount || 1,
            priority: rrf.priority,
            status: rrf.status,
            date: new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB'),
            approvedByName: rrf.approvedByName || null,
          }))
        : []
    },
  })

  const openPositions = openData || []

  // Compute stats from cached allRrfs (no extra network call)
  const stats = useMemo(() => {
    const rrfs = allRrfs || []
    const closedRrfs = rrfs.filter(r =>
      r.status === 'CLOSED' || (r.status || '').toUpperCase() === 'CLOSED'
    )
    return {
      positionsFilled: closedRrfs.reduce((sum, r) => sum + (r.headcount || r.numberOfPositions || 0), 0),
      closedRequests: closedRrfs.length,
    }
  }, [allRrfs])

  const handleRefresh = useCallback(() => {
    refreshAll()
    refreshOpen()
  }, [refreshAll, refreshOpen])

  // Single polling + visibility handler (60 s, replaces 30 s double-fetch)
  useVisibilityRefresh(handleRefresh, { intervalMs: 60_000 })

  const getStatusBadge = (status) => {
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '6px 12px' }}>
        Open for Hiring
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'Low': { bg: '#f3f4f6', color: '#374151' },
      'Medium': { bg: '#dbeafe', color: '#1e40af' },
      'High': { bg: '#fed7aa', color: '#9a3412' },
      'Critical': { bg: '#fee2e2', color: '#991b1b' }
    }
    const config = priorityConfig[priority] || priorityConfig['Medium']
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '999px', padding: '6px 12px' }}>
        {priority}
      </span>
    )
  }

  const filteredPositions = openPositions.filter(request => {
    const searchLower = searchTerm.toLowerCase()
    return (
      request.rrfId?.toLowerCase().includes(searchLower) ||
      request.role?.toLowerCase().includes(searchLower) ||
      request.project?.toLowerCase().includes(searchLower) ||
      request.priority?.toLowerCase().includes(searchLower) ||
      request.status?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
        <StatCard
          title="Open for Hiring"
          value={openPositions.length.toString()}
          subtitle="Active positions (IN_PROGRESS)"
          icon={<FolderOpenOutlined />}
          color="green"
          href="/hr/open-for-hiring"
        />
        <StatCard
          title="Closed Requests"
          value={stats.closedRequests.toString()}
          subtitle="All time (CLOSED)"
          icon={<CloseCircleOutlined />}
          color="gray"
          href="/hr/closed"
        />
        <StatCard
          title="Positions Filled"
          value={stats.positionsFilled.toString()}
          subtitle="Computed total filled positions"
          icon={<CheckCircleOutlined />}
          color="cyan"
          href="/hr/closed"
        />
      </div>

      {/* Open Positions Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '12px' }}>
        <div className="px-2 py-3 md:py-4 mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Open for Hiring Positions</h3>
        </div>

        {/* Search Box and Reload */}
        <div className="px-2 mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by RRF ID, Role, Project, Priority or Status..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
              style={{ borderRadius: '10px' }}
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            style={{ borderRadius: '10px' }}
          >
            <ReloadOutlined className={loading ? 'animate-spin' : ''} />
            Reload
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved By</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-500"><ReloadOutlined className="animate-spin" style={{ fontSize: '32px', color: '#6366f1' }} /></td></tr>
              ) : filteredPositions.length > 0 ? (
                filteredPositions.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.rrfId}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.role}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">{request.positions}</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">{request.approvedByName || 'N/A'}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.date}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <ActionButton role="HR" status={request.status} href={`/requests/${request.id}`} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                    <p className="text-sm font-medium mt-2">{searchTerm ? `No requests found matching "${searchTerm}"` : 'No open positions available'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden px-2 pb-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center"><ReloadOutlined className="animate-spin text-2xl text-indigo-600" /></div>
          ) : filteredPositions.length > 0 ? (
            filteredPositions.map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{request.rrfId}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{request.role}</div>
                    <div className="text-xs text-gray-500 truncate">{request.project}</div>
                  </div>
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs ml-2 flex-shrink-0">{request.positions}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(request.priority)}
                  {getStatusBadge(request.status)}
                  <span className="text-xs text-gray-500">{request.date}</span>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <ActionButton role="HR" status={request.status} href={`/requests/${request.id}`} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
              <p className="text-sm font-medium mt-2">{searchTerm ? `No requests found matching "${searchTerm}"` : 'No open positions available'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
