'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EyeOutlined, LeftOutlined } from '@ant-design/icons'
import { rrfApi, formatRrfForDisplay } from '@/lib/api/rrfApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { CACHE_TTL } from '@/lib/apiCache'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

export default function HRClosedPositionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  
  // Departments from RRF form
  const departments = ['HR', 'Talent Acquisition', 'Accounts', 'Sales & Marketing', 'PMO', 'SGINTL', 'VR', 'Support']

  // Shared all-rrfs cache (also used by hr/page, pmo/closed, pmo/sent-to-approvers)
  const { data: allRrfs, loading } = useSmartFetch(userId ? `all-rrfs-${userId}` : null, () => rrfApi.getAll({ limit: 1000 }), {
    ttl: CACHE_TTL.LIST,
    transform: (response) => response?.data?.data || response?.data || [],
  })

  // Derive closed requests from cached data (client-side filter)
  const sentRequests = useMemo(() => {
    if (!allRrfs) return []
    const relevantStatuses = ['closed', 'closed-by-bench']
    return allRrfs
      .filter(rrf => rrf.status && relevantStatuses.includes(rrf.status.toLowerCase()))
      .map(rrf => {
        const formatted = formatRrfForDisplay(rrf) || {}
        return {
          rrfId: formatted.displayId || `RRF-${rrf.id}`,
          submissionId: formatted.id || rrf.id,
          role: formatted.role || '—',
          manager: formatted.manager || '—',
          project: formatted.project || '—',
          department: formatted.department || '—',
          positions: formatted.positions || 1,
          priority: formatted.priority || 'Medium',
          sentDate: new Date(rrf.sentToHrAt || rrf.updatedAt || rrf.createdAt || Date.now()).toLocaleDateString('en-GB'),
          closedDate: rrf.closedAt ? new Date(rrf.closedAt).toLocaleDateString('en-GB') : new Date(rrf.updatedAt || rrf.createdAt).toLocaleDateString('en-GB'),
          candidateName: rrf.candidateName || rrf.notes || '—',
          closureStatus: rrf.closureStatus || 'Position Filled',
          status: ['closed', 'closed-by-bench'].includes((rrf.status || '').toLowerCase()) ? 'Closed' : 'In Progress',
          internalRrfNo: formatted.internalRrfNo || null,  // Internal RRF No for bench fills
        }
      })
  }, [allRrfs])

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

  const getStatusBadge = (status) => {
    if (status === 'Closed') {
      return (
        <span className="text-xs font-medium" style={{ backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '999px', padding: '6px 12px' }}>
          ✓ Closed
        </span>
      )
    }
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '6px 12px' }}>
        🟢 In Progress
      </span>
    )
  }

  const totalClosed = sentRequests.length
  const positionsFilled = sentRequests.reduce((sum, req) => sum + req.positions, 0)
  const totalHires = sentRequests.filter(req => req.candidateName && req.candidateName !== '—').length || positionsFilled // Approximation for hires

  // Filter requests based on search term and department
  const filteredRequests = sentRequests.filter(request => {
    // Department filter
    if (selectedDepartment !== 'all' && request.department !== selectedDepartment) {
      return false
    }
    
    // Search filter
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      request.rrfId.toLowerCase().includes(searchLower) ||
      request.role.toLowerCase().includes(searchLower) ||
      request.manager.toLowerCase().includes(searchLower) ||
      request.project.toLowerCase().includes(searchLower) ||
      request.department.toLowerCase().includes(searchLower) ||
      request.status.toLowerCase().includes(searchLower) ||
      request.candidateName.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-semibold transition-all duration-200 rounded-lg hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
      >
        <LeftOutlined />
        <span>Back</span>
      </button>

      {/* Page Header */}
      {loading ? (
        <LoadingSpinner message="Loading requests..." />
      ) : (
        <>
        <div>
          <p className="text-lg text-gray-800 font-bold">Successfully filled or cancelled requisitions</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 mt-4">
          <div className="text-center px-3 py-2 md:px-4 md:py-3 bg-white border-2 border-gray-200 rounded-xl shadow-md min-w-[150px]">
             <p className="text-xl md:text-3xl font-bold text-gray-600">{totalClosed}</p>
             <p className="text-base text-gray-700 mt-1 font-semibold">Total Closed</p>
          </div>
          <div className="text-center px-3 py-2 md:px-4 md:py-3 bg-white border-2 border-indigo-200 rounded-xl shadow-md min-w-[150px]">
             <p className="text-xl md:text-3xl font-bold text-indigo-600">{positionsFilled}</p>
             <p className="text-base text-gray-700 mt-1 font-semibold">Positions Filled</p>
          </div>
          <div className="text-center px-3 py-2 md:px-4 md:py-3 bg-white border-2 border-indigo-200 rounded-xl shadow-md min-w-[150px]">
             <p className="text-xl md:text-3xl font-bold text-indigo-600">{totalHires}</p>
             <p className="text-base text-gray-700 mt-1 font-semibold">Total Hires</p>
          </div>
        </div>
      
      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative group">
            <input
              type="text"
              placeholder="Search by RRF ID, Role, Project, Department, Requester, or Candidate..."
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
          <div className="w-full md:w-72">
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
      
      {/* Closed RRFs Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        <div className="px-2 py-4 mb-4">
          <h3 className="text-lg font-bold text-gray-900">Closed Requests</h3>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Role & Project</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dept</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Pos</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Closure Info</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Candidate</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <tr key={request.rrfId} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-bold text-indigo-600">{request.rrfId}</span>
                      {request.internalRrfNo && (
                        <div className="text-xs font-semibold text-purple-600 mt-1">
                          Internal: {request.internalRrfNo}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-xs text-gray-900">{request.role}</div>
                      <div className="text-xs text-gray-500">{request.project}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">{request.department}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">{request.positions}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{getPriorityBadge(request.priority)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">{request.closureStatus}</span>
                      <div className="text-xs text-gray-500 mt-1">Closed: {request.closedDate}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 max-w-[150px] truncate" title={request.candidateName}>{request.candidateName}</td>
                    <td className="px-3 py-3 text-center whitespace-nowrap text-sm">
                      <Link href={`/requests/${request.submissionId}`}>
                        <button className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-200 text-xs flex items-center gap-1 mx-auto" style={{ borderRadius: '6px' }}>
                          <EyeOutlined /> View RRF
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 max-w-sm text-center">
                        There are currently no closed RRFs. Once HR closes a request, it will appear here.
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
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div key={request.rrfId} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">
                      {request.rrfId}
                      {request.internalRrfNo && (
                        <span className="text-purple-600 ml-2">({request.internalRrfNo})</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate">{request.role}</div>
                    <div className="text-xs text-gray-500 truncate">{request.project} · {request.department}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(request.priority)}
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">
                    {request.positions} pos
                  </span>
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">{request.closureStatus}</span>
                </div>
                <div className="text-xs text-gray-500 mb-2 space-y-1">
                  <div>Candidate: {request.candidateName}</div>
                  <div>Closed: {request.closedDate}</div>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Link href={`/requests/${request.submissionId}`}>
                    <button className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-200 text-xs flex items-center gap-1" style={{ borderRadius: '6px' }}>
                      <EyeOutlined /> View RRF
                    </button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 max-w-sm text-center">
                There are currently no closed RRFs. Once HR closes a request, it will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  )
}
