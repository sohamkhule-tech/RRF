'use client'

import Link from 'next/link'
import { ClockCircleOutlined, CheckCircleOutlined, EyeOutlined, CloseCircleOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import StatCard from '@/components/StatCard'
import { useState, useEffect, useCallback, useMemo } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'
import { rrfApi } from '@/lib/api/rrfApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

export default function ApproverDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [requests, setRequests] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const pendingData = await rrfApi.getPendingApprovals()
      setRequests(pendingData || [])

      const statsResponse = await rrfApi.getStatistics(true)
      setStatistics(statsResponse.success ? statsResponse.data : null)
    } catch (err) {
      setError(err.message)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh — pauses when tab is hidden to avoid wasting network
  useEffect(() => {
    fetchData()

    const startInterval = () => {
      return setInterval(() => {
        if (!document.hidden) {
          fetchData()
        }
      }, 30000)
    }

    let interval = startInterval()

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchData()
        clearInterval(interval)
        interval = startInterval()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchData])

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

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
  const declinedCount = byStatus['declined'] || byStatus['rejected'] || 0
  const onHoldCount   = byStatus['on-hold'] || byStatus['onHold'] || 0

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.APPROVALS.READ}>
      <div className="p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="Pending Approvals" value={String(pendingCount)} icon={<ClockCircleOutlined />} color="orange" href="/approver/pending" />
          <StatCard title="Approved"           value={String(approvedCount)} icon={<CheckCircleOutlined />} color="green" href="/approver/approved" />
          <StatCard title="Declined"           value={String(declinedCount)} icon={<CloseCircleOutlined />} color="red" href="/approver/declined" />
          <StatCard title="On Hold"            value={String(onHoldCount)} subtitle="Needs action" icon={<ClockCircleOutlined />} color="orange" href="/approver/on-hold" />
        </div>

        {/* Pending Requests Table */}
        <div className="bg-white overflow-hidden border border-gray-200 rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg font-bold text-gray-900">Recent Requests</h3>
          </div>

          {/* Search Box */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 max-w-md">
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RRF ID</th>
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
                        <Link href={`/approver/view-rrf/${request.id}`}>
                          <button className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 rounded-lg border border-gray-200 hover:border-indigo-300">
                            <EyeOutlined />
                            Review
                          </button>
                        </Link>
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
        </div>
      </div>
    </ProtectedRoute>
  )
}
