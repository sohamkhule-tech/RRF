'use client'

import { ClockCircleOutlined, CheckCircleOutlined, SearchOutlined, SendOutlined, PlusOutlined, CloseCircleOutlined, ReloadOutlined, TeamOutlined, StopOutlined } from '@ant-design/icons'
import ActionButton from '@/components/ActionButton'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/StatCard'
import { useState, useCallback } from 'react'
import { rrfApi } from '@/lib/api/rrfApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { useVisibilityRefresh } from '@/lib/useVisibilityRefresh'
import { CACHE_TTL } from '@/lib/apiCache'
import { useAuth } from '@/contexts/AuthContext'

export default function PMODashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch dashboard statistics — cached 60 s
  const {
    data: stats,
    refresh: refreshStats,
  } = useSmartFetch(userId ? `pmo-dashboard-stats-${userId}` : null, () => rrfApi.getPMODashboardStats(), {
    ttl: CACHE_TTL.STATS,
    transform: (response) => {
      const d = response?.data || response || {}
      return {
        openedPositions: d.openedPositions || 0,
        sentToHR: d.sentToHR || 0,
        totalProcessed: d.totalProcessed || 0,
        closed: d.closed || 0,
        closedByReason: {
          RESOURCE_HIRED_EXTERNAL: d.closedByReason?.RESOURCE_HIRED_EXTERNAL || 0,
          SOURCED_INTERNALLY: d.closedByReason?.SOURCED_INTERNALLY || 0,
          CLOSED_BY_BUSINESS: d.closedByReason?.CLOSED_BY_BUSINESS || 0,
        },
      }
    },
  })

  // Fetch recent open positions — cached 30 s
  const {
    data: recentRequests,
    loading,
    refresh: refreshRecent,
  } = useSmartFetch(userId ? `pmo-open-positions-${userId}` : null, () => rrfApi.getOpenPositions(), {
    ttl: CACHE_TTL.LIST,
    transform: (response) => {
      const rrfs = response?.data || response || []
      return Array.isArray(rrfs)
        ? rrfs.slice(0, 5).map(rrf => ({
            id: rrf.id,
            rrfNumber: rrf.rrfNumber || rrf.subId,
            role: rrf.positionTitle || '-',
            manager: rrf.createdBy?.fullName || rrf.createdBy?.name || '-',
            project: rrf.projectName || '-',
            positions: rrf.headcount || 1,
            priority: rrf.priority || 'Medium',
            status: rrf.status,
            date: new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB')
          }))
        : []
    },
  })

  const handleRefresh = useCallback(() => {
    refreshStats()
    refreshRecent()
  }, [refreshStats, refreshRecent])

  // Single polling + visibility handler (60 s, replaces 30 s unguarded interval)
  useVisibilityRefresh(handleRefresh, { intervalMs: 60_000 })

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

  const effectiveStats = stats || { openedPositions: 0, sentToHR: 0, totalProcessed: 0, closed: 0, closedByReason: { RESOURCE_HIRED_EXTERNAL: 0, SOURCED_INTERNALLY: 0, CLOSED_BY_BUSINESS: 0 } }
  const effectiveRequests = recentRequests || []

  const filteredRequests = effectiveRequests.filter(request => {
    const searchLower = searchTerm.toLowerCase()
    return (
      request.rrfNumber?.toLowerCase().includes(searchLower) ||
      request.manager?.toLowerCase().includes(searchLower) ||
      request.role?.toLowerCase().includes(searchLower) ||
      request.project?.toLowerCase().includes(searchLower) ||
      request.priority?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-5">
        <StatCard 
          title="Request Positions" 
          value={effectiveStats.openedPositions.toString()} 
          subtitle="Awaiting review" 
          icon={<ClockCircleOutlined />} 
          color="orange" 
          href="/pmo/requests?status=request-positions" 
        />
        <StatCard 
          title="Open for Hiring" 
          value={effectiveStats.sentToHR.toString()} 
          subtitle="Forwarded successfully" 
          icon={<SendOutlined />} 
          color="blue" 
          href="/pmo/requests?status=open-for-hiring" 
        />
        <StatCard 
          title="Closed" 
          value={effectiveStats.closed.toString()} 
          subtitle="Completed positions" 
          icon={<CloseCircleOutlined />} 
          color="red" 
          href="/pmo/requests?status=closed"
        />
        <StatCard 
          title="Sourced Internally" 
          value={effectiveStats.closedByReason.SOURCED_INTERNALLY.toString()} 
          subtitle="Internal fulfillment" 
          icon={<TeamOutlined />} 
          color="cyan" 
          href="/pmo/requests?status=sourced-internally"
        />
        <StatCard 
          title="Closed by Business" 
          value={effectiveStats.closedByReason.CLOSED_BY_BUSINESS.toString()} 
          subtitle="Business decision" 
          icon={<StopOutlined />} 
          color="cyan" 
          href="/pmo/requests?status=closed-by-business"
        />
        <StatCard 
          title="Processed Requests" 
          value={effectiveStats.totalProcessed.toString()} 
          subtitle="All processed requests" 
          icon={<CheckCircleOutlined />} 
          color="green" 
          href="/pmo/requests" 
        />
      </div>

      {/* Recent Requests Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '12px md:20px' }}>
        <div className="px-2 py-3 md:py-4 mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base md:text-lg font-bold text-gray-900">Recent Open Positions</h3>
          <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push('/pmo/create-rrf')}
              className="px-3 md:px-4 py-2 text-white text-sm font-medium hover:scale-105 transition-all duration-300 flex items-center gap-2 w-full sm:w-auto justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}
            >
              <PlusOutlined />
              Create New RRF
            </button>
          </div>
        </div>

        <div className="px-2 mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by RRF ID, Requester, Role, Project or Priority..."
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved On</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <ReloadOutlined className="animate-spin" style={{ fontSize: '32px', color: '#6366f1' }} />
                      <p className="text-sm font-medium">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.rrfNumber}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.manager}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.role}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                        {request.positions}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.date}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <ActionButton role="PMO" status={request.status} href={`/pmo/view-rrf/${request.id}`} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                      <p className="text-sm font-medium">{searchTerm ? `No requests found matching "${searchTerm}"` : 'No open positions available'}</p>
                    </div>
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
          ) : filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{request.rrfNumber}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{request.role}</div>
                    <div className="text-xs text-gray-500 truncate">{request.manager} • {request.project}</div>
                  </div>
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs ml-2 flex-shrink-0">{request.positions}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(request.priority)}
                  <span className="text-xs text-gray-500">{request.date}</span>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <ActionButton role="PMO" status={request.status} href={`/pmo/view-rrf/${request.id}`} />
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
