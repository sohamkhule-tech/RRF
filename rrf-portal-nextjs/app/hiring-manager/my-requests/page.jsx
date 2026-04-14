'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import ActionButton from '@/components/ActionButton'
import { useSearchParams, useRouter } from 'next/navigation'
import { PlusOutlined, DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { useMyRequests } from '@/hooks/useMyRequests'
import { LoadingSpinner, TableLoadingSkeleton } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { EmptyState } from '@/components/EmptyState'

function MyRequestsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')
  const [activeTab, setActiveTab] = useState('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubFunction, setSelectedSubFunction] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  
  // Fetch requests from API (hook fetches on mount via useSmartFetch — no extra useEffect needed)
  const { requests, loading, error, refresh } = useMyRequests()
  
  // Sub-function values from RRF form
  const subFunctions = [
    'Talent Acquisition', 'HR Operations', 'Learning & Development',
    'Finance', 'Sales', 'Marketing', 'PMO', 'Engineering',
    'Quality Assurance', 'DevOps', 'Data Science', 'Support'
  ]
  
  // Status options
  const statusOptions = ['Closed', 'Approved', 'On-hold', 'Declined']

  // Set active tab based on URL query parameter
  useEffect(() => {
    if (statusParam && ['all', 'pending-approval', 'in-progress', 'on-hold', 'approved', 'closed', 'declined', 'rejected'].includes(statusParam)) {
      setActiveTab(statusParam)
    } else {
      setActiveTab('all')
    }
  }, [statusParam])

  // NOTE: Removed duplicate useEffect(() => refresh(), []) — hook already fetches on mount.
  // NOTE: Removed visibilitychange listener — useSmartFetch cache handles stale data.

  // Handler for tab clicks - updates URL
  const handleTabClick = (tab) => {
    setActiveTab(tab)
    router.push(`/hiring-manager/my-requests?status=${tab}`)
  }

  // Use requests from API instead of static data (exclude drafts unless on draft tab)
  const allRequests = requests || []

  // Filter requests based on active tab
  const getFilteredRequests = () => {
    let filtered = []
    if (activeTab === 'pending-approval') {
      // Show pending/submitted requests waiting for approval
      filtered = allRequests.filter(req => req.status?.toLowerCase() === 'pending' || req.status?.toLowerCase() === 'submitted')
    } else if (activeTab === 'in-progress') {
      filtered = allRequests.filter(req => req.status?.toLowerCase() === 'open-for-hiring' || req.status?.toLowerCase() === 'in-progress')
    } else if (activeTab === 'all') {
      // Exclude drafts from 'all' - they have a dedicated drafts section
      filtered = allRequests.filter(req => req.status?.toLowerCase() !== 'draft')
    } else if (activeTab === 'declined') {
      // Map 'declined' tab to 'rejected' status from backend
      filtered = allRequests.filter(req => req.status === 'rejected' || req.status === 'declined')
    } else {
      // Use lowercase comparison for case-insensitive matching
      filtered = allRequests.filter(req => req.status?.toLowerCase() === activeTab.toLowerCase())
    }
    
    // Apply status filter dropdown (independent of tabs)
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(req => req.status.toLowerCase() === selectedStatus.toLowerCase())
    }
    
    // Apply sub-function filter
    if (selectedSubFunction !== 'all') {
      filtered = filtered.filter(req => req.subFunction === selectedSubFunction)
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(req => 
        req.displayId.toLowerCase().includes(searchLower) ||
        req.role.toLowerCase().includes(searchLower) ||
        (req.subFunction || '').toLowerCase().includes(searchLower) ||
        req.project.toLowerCase().includes(searchLower) ||
        req.status.toLowerCase().includes(searchLower)
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
      'open-for-hiring': { bg: '#dbeafe', color: '#1e40af', text: 'In Progress' },
      'in-progress': { bg: '#dbeafe', color: '#1e40af', text: 'In Progress' },
      'closed': { bg: '#f3f4f6', color: '#374151', text: 'Closed' },
      'closed-by-bench': { bg: '#d1fae5', color: '#065f46', text: 'Filled by Bench' }
    }
    
    // Normalize status to lowercase for case-insensitive matching
    const normalizedStatus = status?.toLowerCase() || 'draft'
    const config = statusConfig[normalizedStatus] || statusConfig['draft'] // fallback to draft
    
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
    
    // Fallback to Medium if priority is unknown
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
      // CSV Export
      const headers = ['Request ID', 'Role', 'Sub-Function', 'Project', 'Positions', 'Priority', 'Status', 'Created Date']
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
          req.date
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `RRF_Requests_${timestamp}.csv`
      link.click()
      
    } else if (format === 'excel') {
      // Excel Export (using CSV with proper Excel formatting)
      const headers = ['Request ID', 'Role', 'Sub-Function', 'Project', 'Positions', 'Priority', 'Status', 'Created Date']
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
          req.date
        ].join('\t'))
      ].join('\n')
      
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `RRF_Requests_${timestamp}.xls`
      link.click()
      
    } else if (format === 'pdf') {
      // PDF Export (using print-friendly HTML)
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
          <td style="padding: 8px; border: 1px solid #ddd;">${req.priority}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.status}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${req.date}</td>
        </tr>
      `).join('')
      
      const documentContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>RRF Requests - ${timestamp}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
              padding: 30px;
              background: white;
            }
            .header {
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 3px solid #6366f1;
            }
            .header h1 {
              color: #1f2937;
              font-size: 24px;
              margin-bottom: 8px;
            }
            .header p {
              color: #6b7280;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #f3f4f6;
              padding: 10px 8px;
              text-align: left;
              font-size: 11px;
              font-weight: 700;
              color: #374151;
              text-transform: uppercase;
              border: 1px solid #ddd;
            }
            td {
              font-size: 13px;
              color: #374151;
            }
            @media print {
              body { padding: 15px; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>My RRF Requests</h1>
            <p>Generated on ${(() => {
              const d = new Date()
              const day = String(d.getDate()).padStart(2, '0')
              const month = String(d.getMonth() + 1).padStart(2, '0')
              const year = d.getFullYear()
              return `${day}/${month}/${year}`
            })()} | Total Records: ${dataToExport.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Role</th>
                <th>Sub-Function</th>
                <th>Project</th>
                <th>Positions</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
      `
      
      printWindow.document.write(documentContent)
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }, 250)
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
      transition: 'all 0.3s'
    }
  }

  const getPageDescription = () => {
    if (activeTab === 'pending-approval') {
      return 'Viewing RRF requests pending approval from approvers'
    } else if (activeTab === 'in-progress') {
      return 'Viewing RRF requests that are open for hiring (PMO approved)'
    } else if (activeTab && activeTab !== 'all') {
      return `Viewing ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')} requests`
    }
    return 'View and manage all your resource requisition requests'
  }

  // Show error state
  if (error) {
    return <ErrorMessage message={error} onRetry={refresh} />
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-8">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 px-3 md:px-4 py-2 mb-2 md:mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium text-sm"
      >
        <ArrowLeftOutlined />
        <span>Back</span>
      </button>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-base md:text-lg text-gray-800 font-bold">{getPageDescription()}</p>
        </div>
        <Link href="/hiring-manager/create-rrf" className="w-full sm:w-auto">
          <button className="px-4 md:px-6 py-2.5 md:py-3 text-white text-sm font-bold hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg w-full sm:w-auto" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '12px' }}>
            <PlusOutlined />
            Create New RRF
          </button>
        </Link>
      </div>

      {/* Loading state */}
      {loading ? (
        <LoadingSpinner message="Loading your requests..." />
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-1 md:gap-3 border-b-2 border-gray-200 pb-0 min-w-max">
        <button onClick={() => handleTabClick('all')} style={getTabStyle('all')}>
          All Requests ({allRequests.filter(r => r.status?.toLowerCase() !== 'draft').length})
        </button>
        <button onClick={() => handleTabClick('pending-approval')} style={getTabStyle('pending-approval')}>
          Pending Approval ({allRequests.filter(r => r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'submitted').length})
        </button>
        <button onClick={() => handleTabClick('in-progress')} style={getTabStyle('in-progress')}>
          In Progress ({allRequests.filter(r => r.status?.toLowerCase() === 'open-for-hiring' || r.status?.toLowerCase() === 'in-progress').length})
        </button>
        <button onClick={() => handleTabClick('approved')} style={getTabStyle('approved')}>
          Approved ({allRequests.filter(r => r.status?.toLowerCase() === 'approved').length})
        </button>
        <button onClick={() => handleTabClick('declined')} style={getTabStyle('declined')}>
          Declined ({allRequests.filter(r => r.status?.toLowerCase() === 'rejected' || r.status?.toLowerCase() === 'declined').length})
        </button>
        <button onClick={() => handleTabClick('on-hold')} style={getTabStyle('on-hold')}>
          On-hold ({allRequests.filter(r => r.status?.toLowerCase() === 'on-hold').length})
        </button>
        <button onClick={() => handleTabClick('closed')} style={getTabStyle('closed')}>
          Closed ({allRequests.filter(r => r.status?.toLowerCase() === 'closed').length})
        </button>
      </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative group">
            <input
              type="text"
              placeholder="Search by ID, Role, Project..."
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
          
          {/* Sub-Function Filter */}
          <div className="w-full md:w-48 lg:w-72">
            <select
              value={selectedSubFunction}
              onChange={(e) => setSelectedSubFunction(e.target.value)}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer text-sm font-medium text-gray-700"
              style={{ fontSize: '14px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              <option value="all">🗂️ All Sub-Functions</option>
              {subFunctions.map(sf => (
                <option key={sf} value={sf}>{sf}</option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="w-full md:w-44 lg:w-64">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-md cursor-pointer text-sm font-medium text-gray-700"
              style={{ fontSize: '14px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              <option value="all">🏷️ All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
        
          {(searchTerm || selectedSubFunction !== 'all' || selectedStatus !== 'all') && (
          <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
              Found {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
              {searchTerm && ` for "${searchTerm}"`}
              {selectedSubFunction !== 'all' && ` in ${selectedSubFunction}`}
              {selectedStatus !== 'all' && ` with status: ${selectedStatus}`}
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedSubFunction('all')
                setSelectedStatus('all')
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '12px' }}>
        {/* Table Header */}
        <div className="px-2 py-3 md:py-4 mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base md:text-lg font-bold text-gray-900">
            {activeTab === 'open' 
              ? 'Open RRF Requests' 
              : activeTab === 'all' 
                ? 'All RRF Requests' 
                : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests`
            }
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
            
            {/* Export Dropdown */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 bg-white border border-gray-200 shadow-lg z-50" style={{ borderRadius: '10px', minWidth: '180px' }}>
                <button 
                  onClick={() => exportData('csv')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-all"
                  style={{ borderRadius: '10px 10px 0 0' }}
                >
                  <span className="text-lg">📊</span> Export as CSV
                </button>
                <button 
                  onClick={() => exportData('excel')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-all"
                >
                  <span className="text-lg">📈</span> Export as Excel
                </button>
                <button 
                  onClick={() => exportData('pdf')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-all border-t border-gray-200"
                  style={{ borderRadius: '0 0 10px 10px' }}
                >
                  <span className="text-lg">📄</span> Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Request ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sub-Function</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.displayId}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.role}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.subFunction || '—'}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                        {request.positions}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.date}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <ActionButton 
                        role="HM"
                        status={request.status}
                        href={`/hiring-manager/view-rrf/${request.id}`}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-4xl opacity-50">📋</div>
                      <p className="text-lg font-medium">No requests found</p>
                      <p className="text-sm">Try adjusting your filters or create a new RRF request</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 px-1">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{request.displayId}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{request.role}</div>
                    <div className="text-xs text-gray-500 truncate">{request.project} {request.subFunction ? `• ${request.subFunction}` : ''}</div>
                  </div>
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs ml-2 flex-shrink-0">{request.positions}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(request.priority)}
                  {getStatusBadge(request.status)}
                  <span className="text-xs text-gray-500">{request.date}</span>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <ActionButton role="HM" status={request.status} href={`/hiring-manager/view-rrf/${request.id}`} />
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

        {/* Pagination Info */}
        {filteredRequests.length > 0 && (
          <div className="px-2 py-4 mt-4 flex items-center justify-between border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredRequests.length} of {allRequests.length} requests
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all" style={{ borderRadius: '8px' }}>
                Previous
              </button>
              <button className="px-4 py-2 text-white text-sm font-medium transition-all" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '8px' }}>
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all" style={{ borderRadius: '8px' }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Empty state when no requests at all */}
      {allRequests.length === 0 && (
        <EmptyState
          title="No RRF Requests Yet"
          description="You haven't created any resource requisition requests yet. Start by creating your first RRF."
          actionText="Create First RRF"
          actionHref="/hiring-manager/create-rrf"
        />
      )}
      </>
    )}
    </div>
  )
}

export default function MyRequestsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    }>
      <MyRequestsContent />
    </Suspense>
  )
}
