'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EyeOutlined, LeftOutlined } from '@ant-design/icons'
import ProtectedRoute from '@/components/ProtectedRoute'
import { PERMISSIONS } from '@/utils/permissions'
import { useApproverRequests } from '@/hooks/useApproverRequests'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

export default function ApproverOnHoldPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  
  // Fetch on-hold RRFs from backend
  const { requests, loading, error, refresh } = useApproverRequests('on-hold')
  
  useEffect(() => {
    refresh()
  }, [])
  
  const onHoldRequests = requests || []
  
  // Departments from RRF form
  const departments = ['HR', 'Talent Acquisition', 'Accounts', 'Sales & Marketing', 'PMO', 'SGINTL', 'VR', 'Support']
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'on-hold': { bg: '#fef9c3', color: '#854d0e', text: 'On-hold' }
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

  // Calculate total headcount
  const totalHeadcount = onHoldRequests.reduce((sum, req) => sum + (req.headcount || 0), 0)

  // Filter requests based on search term and department
  const filteredRequests = onHoldRequests.filter(request => {
    // Department filter
    if (selectedDepartment !== 'all' && request.department !== selectedDepartment) {
      return false
    }
    
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
          <LoadingSpinner message="Loading on-hold requests..." />
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
      <div className="p-8 space-y-8">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-4"
      >
        <LeftOutlined />
        <span>Back</span>
      </button>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg text-gray-800 font-bold">RRF requests temporarily on hold awaiting resolution</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-2 border-yellow-200 rounded-xl shadow-md">
            <div className="text-xl">⏸️</div>
            <div>
              <p className="text-sm text-gray-700 font-bold">Total On-hold</p>
              <p className="text-xl font-bold text-yellow-600">{onHoldRequests.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-2 border-indigo-200 rounded-xl shadow-md">
            <div className="text-xl">👥</div>
            <div>
              <p className="text-sm text-gray-700 font-bold">Total Headcount</p>
              <p className="text-xl font-bold text-indigo-600">{totalHeadcount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
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
          
          {/* Department Filter */}
          <div className="w-72">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer text-sm font-medium text-gray-700"
              style={{ fontSize: '14px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              <option value="all">📁 All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
        
        {(searchTerm || selectedDepartment !== 'all') && (
          <p className="text-sm text-gray-600">
            Found {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
            {searchTerm && ` for "${searchTerm}"`}
            {selectedDepartment !== 'all' && ` in ${selectedDepartment}`}
          </p>
        )}
      </div>

      {/* On-hold Requests Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        {/* Table Header */}
        <div className="px-2 py-4 mb-4 flex items-center justify-between border-b-2 border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">On-hold RRF Requests</h3>
            <p className="text-sm text-gray-500 mt-1">These requests need attention before approval</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">RRF ID</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Manager/Dept</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Role & Project</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Pos</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">On-hold Reason</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
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
                      {request.positions}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">{getPriorityBadge(request.priority)}</td>
                  <td className="px-3 py-3 text-xs text-gray-600" style={{ minWidth: '200px', maxWidth: '300px' }}>
                    <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>
                      {request.notes || request.declineReason || <span className="italic text-gray-400">No reason provided</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">
                    {request.declinedAt ? new Date(request.declinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
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

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg font-medium text-gray-900">No on-hold requests found</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm || selectedDepartment !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'On-hold RRF requests will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  )
}
