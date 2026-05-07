'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons'
import { rrfApi } from '@/lib/api/rrfApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { useVisibilityRefresh } from '@/lib/useVisibilityRefresh'
import { CACHE_TTL } from '@/lib/apiCache'
import { useAuth } from '@/contexts/AuthContext'

export default function PMOMyRequests() {
  const { user } = useAuth()
  const userId = user?.id
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch all RRFs created by current PMO user — cached + deduplicated
  const {
    data: requests,
    loading,
    refresh: refreshRequests,
  } = useSmartFetch(userId ? `pmo-my-requests-${userId}` : null, () => rrfApi.getMyRequests(), {
    ttl: CACHE_TTL.LIST,
    transform: (response) => {
      const rrfs = response?.data || response || []
      return Array.isArray(rrfs)
        ? rrfs
            .filter(rrf => rrf.status !== 'draft')
            .map(rrf => ({
              id: rrf.id,
              displayId: rrf.rrfNumber || rrf.subId,
              role: rrf.jobTitle,
              project: rrf.projectName,
              positions: rrf.numberOfPositions,
              priority: rrf.priority,
              status: rrf.status,
              date: new Date(rrf.createdAt).toLocaleDateString('en-GB')
            }))
        : []
    },
  })

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    refreshRequests()
  }, [refreshRequests])

  // Single visibility-aware polling (60 s, replaces unguarded 30 s setInterval)
  useVisibilityRefresh(handleRefresh, { intervalMs: 60_000 })

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      'approved': { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
      'declined': { bg: '#fee2e2', color: '#991b1b', label: 'Declined' },
      'rejected': { bg: '#fee2e2', color: '#991b1b', label: 'Declined' },
      'on-hold': { bg: '#fef3c7', color: '#b45309', label: 'On Hold' },
      'open-for-hiring': { bg: '#dbeafe', color: '#1e40af', label: 'Sent to HR' },
      'in-progress': { bg: '#dbeafe', color: '#1e40af', label: 'Sent to HR' },
      'closed': { bg: '#f3f4f6', color: '#374151', label: 'Closed' },
      'closed-by-bench': { bg: '#f3f4f6', color: '#374151', label: 'Closed by Bench' }
    }
    const config = statusConfig[status?.toLowerCase()] || statusConfig['pending']
    return (
      <span 
        className="text-xs font-medium px-3 py-1" 
        style={{ backgroundColor: config.bg, color: config.color, borderRadius: '999px' }}
      >
        {config.label}
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

  const filteredRequests = (requests || []).filter(request => {
    const searchLower = searchTerm.toLowerCase()
    return (
      request.displayId?.toLowerCase().includes(searchLower) ||
      request.role?.toLowerCase().includes(searchLower) ||
      request.project?.toLowerCase().includes(searchLower) ||
      request.priority?.toLowerCase().includes(searchLower) ||
      request.status?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My RRF Requests</h1>
          <p className="text-gray-600 mt-1">View all your submitted requisition forms</p>
        </div>
        <Link href="/pmo/create-rrf">
          <button 
            className="px-4 py-2 text-white text-sm font-medium hover:scale-105 transition-all duration-300 flex items-center gap-2" 
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}
          >
            <PlusOutlined />
            Create New RRF
          </button>
        </Link>
      </div>

      {/* Main Content Card */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        
        {/* Search and Reload */}
        <div className="px-2 mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, Role, Project, Priority or Status..."
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

        {/* Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Request ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created On</th>
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
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.displayId}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.role}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                        {request.positions}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.date}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <Link href={`/requests/${request.id}`}>
                        <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-300" style={{ borderRadius: '10px' }}>
                          View
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
                        {searchTerm ? `No requests found matching "${searchTerm}"` : 'No requests found'}
                      </p>
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
            <div className="py-8 text-center text-gray-500">
              <ReloadOutlined className="animate-spin" style={{ fontSize: '32px', color: '#6366f1' }} />
              <p className="text-sm font-medium mt-3">Loading...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{request.displayId}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{request.role}</div>
                    <div className="text-xs text-gray-500 truncate">{request.project}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(request.priority)}
                  {getStatusBadge(request.status)}
                </div>
                <div className="text-xs text-gray-500 mb-3">Created: {request.date}</div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Link href={`/requests/${request.id}`}>
                    <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-300 text-sm" style={{ borderRadius: '10px' }}>
                      View
                    </button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm font-medium">No requests found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
