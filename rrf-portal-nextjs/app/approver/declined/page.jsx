'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EyeOutlined, LeftOutlined } from '@ant-design/icons'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'
import { useApproverRequests } from '@/hooks/useApproverRequests'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

export default function ApproverDeclinedPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  // ✅ REMOVED: selectedDepartment filter
  
  // Fetch all declined/rejected RRFs (backend treats both as declined status)
  // Use high limit to bypass pagination and get all records
  const { requests: allRequests, loading, error, refresh } = useApproverRequests(null, { limit: 1000 })
  
  // Filter for declined AND rejected status (both represent declined RRFs)
  const declinedRequests = (allRequests || []).filter(req => 
    req.status === 'declined' || req.status === 'rejected'
  )
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      'declined': { bg: '#fee2e2', color: '#991b1b', text: 'Declined' }
    }
    const config = statusConfig[status]
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
    const config = priorityConfig[priority]
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '999px', padding: '6px 12px' }}>
        {priority}
      </span>
    )
  }

  // Filter requests based on search term only
  const filteredRequests = declinedRequests.filter(request => {
    // ✅ REMOVED: Department filter dropdown
    
    // Search filter
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      (request.displayId || '').toLowerCase().includes(searchLower) ||
      (request.createdBy?.fullName || '').toLowerCase().includes(searchLower) ||
      (request.positionTitle || '').toLowerCase().includes(searchLower) ||
      (request.department || '').toLowerCase().includes(searchLower) ||
      (request.projectName || '').toLowerCase().includes(searchLower)
    )
  })
  
  // Loading state
  if (loading) {
    return (
      <ProtectedRoute requiredPermission={PERMISSIONS.APPROVALS.READ}>
        <div className="p-8">
          <LoadingSpinner message="Loading declined requests..." />
        </div>
      </ProtectedRoute>
    )
  }
  
  // Error state
  if (error) {
    return (
      <ProtectedRoute requiredPermission={PERMISSIONS.APPROVALS.READ}>
        <div className="p-8">
          <ErrorMessage message={error} onRetry={refresh} />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.APPROVALS.READ}>
      <div className="p-4 md:p-8 space-y-8">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-4"
      >
        <LeftOutlined />
        <span>Back</span>
      </button>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-lg text-gray-800 font-bold">RRF requests you have declined with reason</p>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 md:px-5 md:py-3 bg-white border-2 border-red-200 rounded-xl shadow-md">
          <div className="text-2xl">❌</div>
          <div>
            <p className="text-sm text-gray-700 font-bold">Total Declined</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">{declinedRequests.length}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative group">
            <input
              type="text"
              placeholder="Search by RRF ID, Manager Name, Role, Department, Project, or Reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 py-3.5 pl-12 pr-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-md text-sm placeholder-gray-400"
              style={{ fontSize: '14px' }}
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* ✅ REMOVED: Department Filter dropdown */}
        </div>
        
        {searchTerm && (
          <p className="text-sm text-gray-600">
            Found {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
            {searchTerm && ` for "${searchTerm}"`}
          </p>
        )}
      </div>

      {/* Declined Requests Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        {/* Table Header */}
        <div className="px-2 py-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b-2 border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Declined RRF Requests</h3>
            <p className="text-sm text-gray-500 mt-1">RRF requests you have reviewed and declined</p>
          </div>
        </div>

        {/* Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Manager/Dept</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Role & Project</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Positions</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Declined Reason</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Declined Date</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-b border-gray-100 transition-all duration-200 hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-bold text-indigo-600">
                    {request.rrfNumber || request.subId || `RRF-${request.id}`}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="font-medium text-gray-900">{request.createdBy?.fullName || 'Unknown'}</div>
                    <div className="text-gray-500">{request.subFunction || '-'}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div className="font-medium text-gray-900">{request.positionTitle}</div>
                    <div className="text-gray-500">{request.projectName || '-'}</div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                      {request.headcount || request.positions || 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">{getPriorityBadge(request.priority)}</td>
                  <td className="px-3 py-3 text-xs text-gray-600" style={{ minWidth: '200px', maxWidth: '300px' }}>
                    <div className="bg-red-50 px-2 py-1 rounded" style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>
                      {request.declineReason || request.notes || <span className="italic text-gray-400">No reason provided</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">
                    {(request.declinedAt || request.rejectedAt || request.updatedAt) ? new Date(request.declinedAt || request.rejectedAt || request.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Link href={`/approver/view-rrf/${request.id}`}>
                      <button className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-200 text-xs flex items-center gap-1 mx-auto" style={{ borderRadius: '6px' }}>
                        <EyeOutlined />
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden px-2 pb-4 space-y-3">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{request.rrfNumber || request.subId || `RRF-${request.id}`}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{request.positionTitle}</div>
                    <div className="text-xs text-gray-500 truncate">{request.subFunction || '-'} • {request.projectName || '-'}</div>
                  </div>
                  <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs ml-2 flex-shrink-0">
                    {request.headcount || request.positions || 1}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(request.priority)}
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Link href={`/approver/view-rrf/${request.id}`}>
                    <button className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 font-medium text-xs flex items-center gap-1 rounded-md">
                      <EyeOutlined /> View
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

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg font-medium text-gray-900">No declined requests found</p>
            <p className="text-sm text-gray-500 mt-2">All RRF requests are being processed or approved</p>
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  )
}
