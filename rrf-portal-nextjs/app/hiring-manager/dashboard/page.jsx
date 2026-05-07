'use client'

import Link from 'next/link'
import ActionButton from '@/components/ActionButton'
import { PlusOutlined, DownloadOutlined, FileTextOutlined, PlayCircleOutlined, ClockCircleOutlined, CheckCircleOutlined, LockOutlined, CloseCircleOutlined, SearchOutlined, EditOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import StatCard from '@/components/StatCard'
import { useState, useCallback } from 'react'
import { useRRFStatistics } from '@/hooks/useRRFStatistics'
import { useMyRequests } from '@/hooks/useMyRequests'
import { useVisibilityRefresh } from '@/lib/useVisibilityRefresh'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fetch statistics from API (hook fetches on mount via useSmartFetch — no manual trigger needed)
  const { statistics, loading: statsLoading, error: statsError, refresh: refreshStats } = useRRFStatistics(false)
  
  // Fetch recent requests from API (hook fetches on mount via useSmartFetch — no manual trigger needed)
  const { requests, loading: requestsLoading, error: requestsError, refresh: refreshRequests } = useMyRequests()
  
  // Combined refresh for polling + manual reload
  const refreshAll = useCallback(() => {
    refreshStats()
    refreshRequests()
  }, [refreshStats, refreshRequests])

  // Single polling + visibility handler (60 s interval)
  // Replaces the old: setInterval(30s) + visibilitychange + manual useEffect triggers
  useVisibilityRefresh(refreshAll, { intervalMs: 60_000 })
  
  // Get recent 6 requests (exclude drafts)
  const recentRequests = (requests || []).filter(req => req.status?.toLowerCase() !== 'draft').slice(0, 6)

  const handleExportRRF = () => {
    // Create CSV content
    const headers = ['ID', 'Role', 'Project', 'Positions', 'Priority', 'Status', 'Created Date']
    const csvContent = [
      headers.join(','),
      ...recentRequests.map(request => 
        [
          request.displayId,
          `"${request.positionTitle}"`,
          `"${request.project || 'N/A'}"`,
          request.headcount,
          request.priority,
          request.status,
          (request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-GB') : 'N/A')
        ].join(',')
      )
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `RRF_Requests_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { bg: '#f3f4f6', color: '#6b7280', text: 'Draft' },
      'pending': { bg: '#fef3c7', color: '#92400e', text: 'Pending Approval' },
      'submitted': { bg: '#fef3c7', color: '#92400e', text: 'Pending Approval' },
      'on-hold': { bg: '#fef9c3', color: '#854d0e', text: 'On-hold' },
      'approved': { bg: '#dcfce7', color: '#166534', text: 'Approved' },
      'rejected': { bg: '#fee2e2', color: '#991b1b', text: 'Declined' },
      'declined': { bg: '#fee2e2', color: '#991b1b', text: 'Declined' },
      'open-for-hiring': { bg: '#dbeafe', color: '#1e40af', text: 'In Progress' },
      'in-progress': { bg: '#dbeafe', color: '#1e40af', text: 'In Progress' },
      'closed': { bg: '#f3f4f6', color: '#374151', text: 'Closed' }
    }
    const normalizedStatus = status?.toLowerCase() || 'draft'
    const config = statusConfig[normalizedStatus] || statusConfig['draft']
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '999px', padding: '6px 12px' }}>
        {config.text}
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
        {priority || 'Medium'}
      </span>
    )
  }

  // Filter requests based on search term
  const filteredRequests = recentRequests.filter(request => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (request.displayId || '').toLowerCase().includes(searchLower) ||
      (request.positionTitle || '').toLowerCase().includes(searchLower) ||
      (request.project || '').toLowerCase().includes(searchLower) ||
      (request.priority || '').toLowerCase().includes(searchLower) ||
      (request.status || '').toLowerCase().includes(searchLower)
    )
  })
  // Loading state
  if (statsLoading || requestsLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    )
  }

  // Error state
  if (statsError || requestsError) {
    return (
      <div className="p-8">
        <ErrorMessage 
          message={statsError || requestsError} 
          onRetry={() => {
            refreshAll()
          }} 
        />
      </div>
    )
  }

  // Extract statistics data with new status enum mapping
  const stats = statistics || {}
  const byStatus = stats.byStatus || {}
  
  // Map new status enum to card values — supports both old and new status formats
  const draftCount           = byStatus['draft'] || 0
  const inProgressCount      = byStatus['openForHiring'] || byStatus['open-for-hiring'] || byStatus['in-progress'] || 0
  const pendingApprovalCount = (byStatus['pending'] || 0) + (byStatus['submitted'] || 0)
  const approvedCount        = byStatus['approved'] || 0
  const onHoldCount          = byStatus['on-hold'] || byStatus['onHold'] || 0
  const declinedCount        = (byStatus['declined'] || 0) + (byStatus['rejected'] || 0)
  const closedCount          = (byStatus['closed'] || 0) + (byStatus['closed-by-bench'] || 0)
  const totalCount           = draftCount + inProgressCount + pendingApprovalCount + approvedCount + onHoldCount + declinedCount + closedCount
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      {/* Stats Cards - Fully Dynamic */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5">
        <StatCard
          title="In Progress"
          value={String(inProgressCount)}
          subtitle="Open for hiring"
          icon={<EditOutlined />}
          color="cyan"
          href="/hiring-manager/my-requests?status=in-progress"
        />
        <StatCard
          title="Pending Approval"
          value={String(pendingApprovalCount)}
          subtitle="Awaiting approval"
          icon={<ClockCircleOutlined />}
          color="yellow"
          href="/hiring-manager/my-requests?status=pending-approval"
        />
        <StatCard
          title="Approved"
          value={String(approvedCount)}
          subtitle="Ready to hire"
          icon={<CheckCircleOutlined />}
          color="green"
          href="/hiring-manager/my-requests?status=approved"
        />
        <StatCard
          title="On Hold"
          value={String(onHoldCount)}
          subtitle="Pending review"
          icon={<PauseCircleOutlined />}
          color="orange"
          href="/hiring-manager/my-requests?status=on-hold"
        />
        <StatCard
          title="Declined"
          value={String(declinedCount)}
          subtitle="Needs attention"
          icon={<CloseCircleOutlined />}
          color="red"
          href="/hiring-manager/my-requests?status=declined"
        />
        <StatCard
          title="All Submissions"
          value={String(totalCount)}
          subtitle="Total requests"
          icon={<FileTextOutlined />}
          color="blue"
          href="/hiring-manager/my-requests?status=all"
        />
      </div>

      {/* Recent RRF Requests Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '16px' }}>
        {/* Table Header */}
        <div className="px-2 py-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h3 className="text-lg font-bold text-gray-900">Recent Requests</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button 
              onClick={handleExportRRF}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center justify-center gap-2 w-full sm:w-auto" 
              style={{ borderRadius: '10px' }}
            >
              <DownloadOutlined />
              <span className="sm:inline">Export RRF</span>
            </button>
            <Link href="/hiring-manager/create-rrf" className="w-full sm:w-auto">
              <button className="px-4 py-2 text-white text-sm font-medium hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 w-full" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}>
                <PlusOutlined />
                <span className="sm:inline">Create New RRF</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Search Box */}
        <div className="px-2 mb-4">
          <div className="flex items-center gap-3 w-full md:max-w-md">
            <div className="relative flex-1">
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
              onClick={() => {
                refreshAll()
              }}
              className="px-4 py-3 border-2 border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-300 flex items-center justify-center gap-2"
              style={{ borderRadius: '10px' }}
              title="Refresh data"
            >
              <ReloadOutlined className="text-lg" />
            </button>
          </div>
        </div>

        {/* Table - Desktop View */}
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.slice(0, 5).map((request) => (
                <tr key={request.id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.displayId}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.positionTitle}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project || 'N/A'}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                      {request.headcount}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm">{getStatusBadge(request.status)}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-GB') : 'N/A'}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm">
                    <ActionButton 
                      role="HM"
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
                      <p className="text-sm font-medium">No requests found matching "{searchTerm}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card View - Mobile */}
        <div className="md:hidden space-y-3">
          {filteredRequests.length > 0 ? (
            filteredRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{request.displayId}</div>
                    <div className="text-sm font-bold text-gray-900 mb-1">{request.positionTitle}</div>
                    <div className="text-xs text-gray-500">{request.project || 'N/A'}</div>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm ml-2">
                    {request.headcount}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(request.priority)}
                  {getStatusBadge(request.status)}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                  </div>
                  <ActionButton 
                    role="HM"
                    status={request.status}
                    href={`/requests/${request.id}`}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                <p className="text-sm font-medium">No requests found matching "{searchTerm}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
