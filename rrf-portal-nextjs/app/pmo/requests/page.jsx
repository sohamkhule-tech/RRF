'use client'

/**
 * PHASE 6 — Legacy compatibility redirect.
 * Original implementation preserved below (non-exported) for rollback.
 * Rollback: remove the redirect and restore `export default` on LegacyRequestsPage.
 */
import { redirect } from 'next/navigation'
export default function Page() { redirect('/workflow?view=total-processed') }

// ── Original implementation (preserved for rollback) ────────────────────────

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import ActionButton from '@/components/ActionButton'
import { useSearchParams, useRouter } from 'next/navigation'
import { PlusOutlined, DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { useRRFs } from '@/hooks/useRRFs'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { EmptyState } from '@/components/EmptyState'

function PMORequestsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')
  const [activeTab, setActiveTab] = useState('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Fetch ALL requests from API using useRRFs hook
  const { rrfs: requests, loading, error, refresh } = useRRFs()

  // Allowed PMO Tabs matching the Dashboard Cards
  const allowedTabs = [
    'all', 
    'request-positions', 
    'open-for-hiring', 
    'closed', 
    'hired-externally', 
    'sourced-internally', 
    'closed-by-business'
  ];

  // Set active tab based on URL query parameter
  useEffect(() => {
    if (statusParam && allowedTabs.includes(statusParam)) {
      setActiveTab(statusParam)
    } else {
      setActiveTab('all')
    }
  }, [statusParam])

  // Handler for tab clicks - updates URL
  const handleTabClick = (tab) => {
    setActiveTab(tab)
    router.push(`/pmo/requests?status=${tab}`)
  }

  // Use requests from API instead of static data
  const allRequests = requests || []

  // Filter requests based on PMO Dashboard specific tabs
  const getFilteredRequests = () => {
    let filtered = []

    // PMO typically only process approved/in-progress/closed
    // Total Processed typically means anything that reached PMO or got completed.
    // For "all", we might just exclude drafts/pending depending on backend, but let's exclude drafts as a baseline.
    const pmoStatuses = ['approved', 'open-for-hiring', 'in-progress', 'closed'];
    const baseRequests = allRequests.filter(req => pmoStatuses.includes(req.status?.toLowerCase()));

    if (activeTab === 'request-positions') {
      filtered = baseRequests.filter(req => req.status?.toLowerCase() === 'approved')
    } else if (activeTab === 'open-for-hiring') {
      filtered = baseRequests.filter(req => req.status?.toLowerCase() === 'open-for-hiring' || req.status?.toLowerCase() === 'in-progress')
    } else if (activeTab === 'closed') {
      filtered = baseRequests.filter(req => req.status?.toLowerCase() === 'closed')
    } else if (activeTab === 'hired-externally') {
      filtered = baseRequests.filter(req => req.status?.toLowerCase() === 'closed' && req.closeReason === 'RESOURCE_HIRED_EXTERNAL')
    } else if (activeTab === 'sourced-internally') {
      filtered = baseRequests.filter(req => req.status?.toLowerCase() === 'closed' && req.closeReason === 'SOURCED_INTERNALLY')
    } else if (activeTab === 'closed-by-business') {
      filtered = baseRequests.filter(req => req.status?.toLowerCase() === 'closed' && req.closeReason === 'CLOSED_BY_BUSINESS')
    } else {
      // 'all' represents "Total Processed"
      filtered = baseRequests
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(req => 
        req.displayId.toLowerCase().includes(searchLower) ||
        req.role.toLowerCase().includes(searchLower) ||
        (req.subFunction || '').toLowerCase().includes(searchLower) ||
        req.project.toLowerCase().includes(searchLower) ||
        req.status.toLowerCase().includes(searchLower) ||
        (req.closureStatus || '').toLowerCase().includes(searchLower)
      )
    }
    
    return filtered
  }

  const filteredRequests = getFilteredRequests()

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { bg: '#f3f4f6', color: '#6b7280', text: 'Draft' },
      'pending': { bg: '#fef3c7', color: '#92400e', text: 'Pending Approval' },
      'submitted': { bg: '#fef3c7', color: '#92400e', text: 'Pending Approval' },
      'on-hold': { bg: '#fef3c7', color: '#b45309', text: 'On Hold' },
      'approved': { bg: '#dcfce7', color: '#166534', text: 'Approved' },
      'rejected': { bg: '#fee2e2', color: '#991b1b', text: 'Declined' },
      'declined': { bg: '#fee2e2', color: '#991b1b', text: 'Declined' },
      'open-for-hiring': { bg: '#dbeafe', color: '#1e40af', text: 'Open for Hiring' },
      'in-progress': { bg: '#dbeafe', color: '#1e40af', text: 'Open for Hiring' },
      'closed': { bg: '#f3f4f6', color: '#374151', text: 'Closed' },
      'closed-by-bench': { bg: '#d1fae5', color: '#065f46', text: 'Filled by Bench' }
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

  const exportData = (format) => {
    const dataToExport = filteredRequests
    const d = new Date()
    const timestamp = `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`
    
    if (format === 'csv') {
      const headers = ['Request ID', 'Role', 'Sub-Function', 'Project', 'Positions', 'Priority', 'Status', 'Closure Reason', 'Created Date']
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(req => [
          req.displayId,
          `"${req.role}"`,
          req.subFunction || '',
          `"${req.project}"`,
          req.positions,
          req.priority,
          req.status,
          `"${req.closureStatus || ''}"`,
          req.date
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `PMO_RRF_Requests_${timestamp}.csv`
      link.click()
    } else if (format === 'excel') {
      const headers = ['Request ID', 'Role', 'Sub-Function', 'Project', 'Positions', 'Priority', 'Status', 'Closure Reason', 'Created Date']
      const excelContent = [
        headers.join('\t'),
        ...dataToExport.map(req => [
          req.displayId,
          req.role,
          req.subFunction || '',
          req.project,
          req.positions,
          req.priority,
          req.status,
          req.closureStatus || '',
          req.date
        ].join('\t'))
      ].join('\n')
      
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `PMO_RRF_Requests_${timestamp}.xls`
      link.click()
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Please allow pop-ups to export PDF')
        return
      }
      
      const tableRows = dataToExport.map(req => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: 600; color: #4f46e5;">${req.displayId}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.role}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.subFunction || ''}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.project}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${req.positions}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.status}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.closureStatus || ''}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.date}</td>
        </tr>
      `).join('')
      
      const documentContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>PMO RRF Requests - ${timestamp}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, sans-serif; padding: 30px; background: white; }
            .header { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #6366f1; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; border: 1px solid #ddd; }
            td { font-size: 13px; padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PMO RRF Requests</h1>
            <p>Generated on ${timestamp.replace(/_/g, '/')} | Total Records: ${dataToExport.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Role</th>
                <th>Sub-Function</th>
                <th>Project</th>
                <th>Positions</th>
                <th>Status</th>
                <th>Closure Reason</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
        </html>
      `
      
      printWindow.document.write(documentContent)
      printWindow.document.close()
      setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 250)
    }
    setShowExportMenu(false)
  }

  const getTabStyle = (tabName) => {
    const isActive = activeTab === tabName
    return {
      padding: '12px 24px',
      background: 'none',
      border: 'none',
      borderBottom: isActive ? '3px solid #6366f1' : '3px solid transparent',
      fontWeight: 600,
      color: isActive ? '#6366f1' : '#6B7280',
      cursor: 'pointer',
      transition: 'all 0.3s',
      whiteSpace: 'nowrap'
    }
  }

  const getPageDescription = () => {
    return 'View and manage requisition requests'
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refresh} />
  }

  // Calculate counts for tabs
  const pmoStatuses = ['approved', 'open-for-hiring', 'in-progress', 'closed'];
  const baseRequests = allRequests.filter(req => pmoStatuses.includes(req.status?.toLowerCase()));
  const countAll = baseRequests.length;
  const countRequestPositions = baseRequests.filter(req => req.status?.toLowerCase() === 'approved').length;
  const countOpenForHiring = baseRequests.filter(req => req.status?.toLowerCase() === 'open-for-hiring' || req.status?.toLowerCase() === 'in-progress').length;
  const countClosed = baseRequests.filter(req => req.status?.toLowerCase() === 'closed').length;
  const countHiredExternally = baseRequests.filter(req => req.status?.toLowerCase() === 'closed' && req.closeReason === 'RESOURCE_HIRED_EXTERNAL').length;
  const countSourcedInternally = baseRequests.filter(req => req.status?.toLowerCase() === 'closed' && req.closeReason === 'SOURCED_INTERNALLY').length;
  const countClosedByBusiness = baseRequests.filter(req => req.status?.toLowerCase() === 'closed' && req.closeReason === 'CLOSED_BY_BUSINESS').length;


  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-8">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 px-3 md:px-4 py-2 mb-2 md:mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium text-sm"
      >
        <ArrowLeftOutlined />
        <span>Back</span>
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Requests</h1>
          <p className="text-base md:text-lg text-gray-800 font-medium">{getPageDescription()}</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading all requests..." />
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-1 md:gap-3 border-b-2 border-gray-200 pb-0 min-w-max">
              <button onClick={() => handleTabClick('all')} style={getTabStyle('all')}>
                Total Processed ({countAll})
              </button>
              <button onClick={() => handleTabClick('request-positions')} style={getTabStyle('request-positions')}>
                Request Positions ({countRequestPositions})
              </button>
              <button onClick={() => handleTabClick('open-for-hiring')} style={getTabStyle('open-for-hiring')}>
                Open for Hiring ({countOpenForHiring})
              </button>
              <button onClick={() => handleTabClick('closed')} style={getTabStyle('closed')}>
                Closed ({countClosed})
              </button>
              <button onClick={() => handleTabClick('hired-externally')} style={getTabStyle('hired-externally')}>
                Hired Externally ({countHiredExternally})
              </button>
              <button onClick={() => handleTabClick('sourced-internally')} style={getTabStyle('sourced-internally')}>
                Sourced Internally ({countSourcedInternally})
              </button>
              <button onClick={() => handleTabClick('closed-by-business')} style={getTabStyle('closed-by-business')}>
                Closed by Business ({countClosedByBusiness})
              </button>
            </div>
          </div>

          <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  placeholder="Search by ID, Role, Project, Status or Closure Reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 md:px-5 py-3 md:py-3.5 pl-10 md:pl-12 pr-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 text-sm placeholder-gray-400"
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
            </div>
            
            {searchTerm && (
              <p className="text-sm text-gray-600">
                Found {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '12px' }}>
            <div className="px-2 py-3 md:py-4 mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-base md:text-lg font-bold text-gray-900">
                {activeTab === 'all' ? 'Total Processed Requests' : `${activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Requests`}
              </h3>
              <div className="relative">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 border-2 border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center gap-2" 
                  style={{ borderRadius: '10px' }}
                >
                  <DownloadOutlined />
                  Export RRF
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 bg-white border border-gray-200 shadow-lg z-50" style={{ borderRadius: '10px', minWidth: '180px' }}>
                    <button onClick={() => exportData('csv')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-all" style={{ borderRadius: '10px 10px 0 0' }}>
                      <span className="text-lg">📊</span> Export as CSV
                    </button>
                    <button onClick={() => exportData('excel')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-all">
                      <span className="text-lg">📈</span> Export as Excel
                    </button>
                    <button onClick={() => exportData('pdf')} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-all border-t border-gray-200" style={{ borderRadius: '0 0 10px 10px' }}>
                      <span className="text-lg">📄</span> Export as PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

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
                    {activeTab === 'request-positions' && <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved By</th>}
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Closure Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">
                          {request.displayId}
                          {request.internalRrfNo && (
                            <div className="text-xs font-semibold text-purple-600 mt-1">Internal: {request.internalRrfNo}</div>
                          )}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.role}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">{request.positions}</span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm">{getStatusBadge(request.status)}</td>
                        {activeTab === 'request-positions' && <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">{request.approvedByName || 'N/A'}</td>}
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                          {request.closureStatus ? (
                            <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                              {request.closureStatus}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm">
                          <ActionButton role="PMO" status={request.status} href={`/requests/${request.id}`} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8 + (activeTab === 'request-positions' ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-4xl opacity-50">📋</div>
                          <p className="text-lg font-medium">No requests found</p>
                          <p className="text-sm">Try adjusting your filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 px-1">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-indigo-600 mb-1">
                          {request.displayId}
                          {request.internalRrfNo && (
                            <span className="text-purple-600 ml-2">({request.internalRrfNo})</span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-gray-900 truncate">{request.role}</div>
                        <div className="text-xs text-gray-500 truncate">{request.project} {request.subFunction ? `• ${request.subFunction}` : ''}</div>
                      </div>
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs ml-2 flex-shrink-0">{request.positions}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                    </div>
                    {request.closureStatus && (
                      <div className="text-xs text-gray-600 mb-2">
                        <span className="font-medium mr-1">Closure Reason:</span>
                        {request.closureStatus}
                      </div>
                    )}
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <ActionButton role="PMO" status={request.status} href={`/requests/${request.id}`} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <div className="text-4xl opacity-50 mb-3">📋</div>
                  <p className="text-sm font-medium">No requests found</p>
                </div>
              )}
            </div>

            {filteredRequests.length > 0 && (
              <div className="px-2 py-4 mt-4 flex items-center justify-between border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {filteredRequests.length} of {countAll} total requests
                </p>
              </div>
            )}
          </div>

          {baseRequests.length === 0 && (
            <EmptyState
              title="No PMO Requests Found"
              description="There are no PMO requisition requests found."
              actionText="Back to Dashboard"
              actionHref="/pmo"
            />
          )}
        </>
      )}
    </div>
  )
}

function LegacyRequestsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    }>
      <PMORequestsContent />
    </Suspense>
  )
}
