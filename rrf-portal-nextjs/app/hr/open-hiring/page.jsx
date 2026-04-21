'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftOutlined } from '@ant-design/icons'

export default function OpenHiringPage() {
  const router = useRouter()
  const [showDetailedView, setShowDetailedView] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  
  // Departments from RRF form
  const departments = ['HR', 'Talent Acquisition', 'Accounts', 'Sales & Marketing', 'PMO', 'SGINTL', 'VR', 'Support']
  
  const openPositions = [
    { id: 'RRF-003', role: 'HR Manager', customerName: 'Internal Project', project: 'HR Operations', positions: 1, initialPositions: 1, currentPositions: 1, priority: 'High', requester: 'John Smith', department: 'HR', experience: '5-8 years', approvedDate: '05/03/2026', createdOn: '01/03/2026', expectedDate: '15/04/2026', billingRate: 0, billingStartDate: null, requisitionType: 'Non-Billable', status: 'In Progress', remarks: 'Urgent requirement for HR expertise' },
    { id: 'RRF-006', role: 'Technical Recruiter', customerName: 'Internal Project', project: 'Recruitment Drive', positions: 2, initialPositions: 2, currentPositions: 1, priority: 'Medium', requester: 'Sarah Johnson', department: 'Talent Acquisition', experience: '3-5 years', approvedDate: '14/03/2026', createdOn: '10/03/2026', expectedDate: '20/04/2026', billingRate: 0, billingStartDate: null, requisitionType: 'Non-Billable', status: 'In Progress', remarks: '1 position filled, 1 remaining' },
    { id: 'RRF-008', role: 'Senior Accountant', customerName: 'Internal Project', project: 'Financial Audit', positions: 1, initialPositions: 1, currentPositions: 1, priority: 'Medium', requester: 'Mike Wilson', department: 'Accounts', experience: '4-7 years', approvedDate: '01/03/2026', createdOn: '25/02/2026', expectedDate: '10/04/2026', billingRate: 0, billingStartDate: null, requisitionType: 'Non-Billable', status: 'In Progress', remarks: 'Financial expertise required' },
    { id: 'RRF-012', role: 'Marketing Manager', customerName: 'Marketing Solutions', project: 'Campaign Strategy', positions: 2, initialPositions: 2, currentPositions: 2, priority: 'High', requester: 'Emily Davis', department: 'Sales & Marketing', experience: '5-8 years', approvedDate: '10/03/2026', createdOn: '05/03/2026', expectedDate: '25/04/2026', billingRate: 85, billingStartDate: '01/04/2026', requisitionType: 'Billable', status: 'In Progress', remarks: 'Marketing campaign planning' },
    { id: 'RRF-015', role: 'Project Coordinator', customerName: 'Internal Project', project: 'PMO Operations', positions: 1, initialPositions: 1, currentPositions: 1, priority: 'Medium', requester: 'David Lee', department: 'PMO', experience: '3-6 years', approvedDate: '18/03/2026', createdOn: '12/03/2026', expectedDate: '01/05/2026', billingRate: 0, billingStartDate: null, requisitionType: 'Non-Billable', status: 'In Progress', remarks: 'PMO support needed' },
    { id: 'RRF-017', role: 'Full Stack Developer', customerName: 'TechCorp Solutions', project: 'Banking Portal', positions: 3, initialPositions: 3, currentPositions: 2, priority: 'Critical', requester: 'Lisa Brown', department: 'SGINTL', experience: '5-8 years', approvedDate: '20/03/2026', createdOn: '15/03/2026', expectedDate: '10/05/2026', billingRate: 120, billingStartDate: '22/03/2026', requisitionType: 'Billable', status: 'In Progress', remarks: '1 position filled, 2 remaining' },
    { id: 'RRF-019', role: 'QA Automation Engineer', customerName: 'Quality Tech Inc', project: 'Testing Framework', positions: 2, initialPositions: 2, currentPositions: 2, priority: 'High', requester: 'Tom White', department: 'VR', experience: '4-6 years', approvedDate: '22/03/2026', createdOn: '18/03/2026', expectedDate: '05/05/2026', billingRate: 90, billingStartDate: '25/03/2026', requisitionType: 'Billable', status: 'In Progress', remarks: 'Quality testing expertise needed' },
    { id: 'RRF-021', role: 'DevOps Engineer', customerName: 'Cloud Systems', project: 'Cloud Migration', positions: 2, initialPositions: 2, currentPositions: 1, priority: 'Critical', requester: 'Sam Wilson', department: 'Support', experience: '5-8 years', approvedDate: '24/03/2026', createdOn: '20/03/2026', expectedDate: '15/05/2026', billingRate: 110, billingStartDate: '05/04/2026', requisitionType: 'Billable', status: 'In Progress', remarks: '1 position filled, screening candidates for remaining' }
  ]

  const exportToCSV = () => {
    // CSV Header
    const headers = ['Sr No', 'RRF No', 'Created On', 'Job Title', 'Customer Name', 'Experience', 'Department', 'Priority', 'Initial Open Positions', 'Current Open Positions', 'Anticipated Date', 'Status', 'Remarks']
    
    // CSV Data
    const csvData = openPositions.map((position, index) => {
      return [
        index + 1,
        position.id,
        position.createdOn,
        position.role,
        position.customerName,
        position.experience,
        position.department,
        position.priority,
        position.initialPositions,
        position.currentPositions,
        position.expectedDate,
        position.status,
        position.remarks
      ]
    })
    
    // Combine headers and data
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const d = new Date()
    const timestamp = `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`
    link.setAttribute('download', `RRF_List_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToExcel = () => {
    // HTML format that Excel recognizes with proper styling
    const headers = ['Sr No', 'RRF No', 'Created On', 'Job Title', 'Customer Name', 'Experience', 'Department', 'Priority', 'Initial Open Positions', 'Current Open Positions', 'Anticipated Date', 'Status', 'Remarks']
    
    let excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>RRF List</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table {
            border-collapse: collapse;
            width: 100%;
            font-family: Arial, sans-serif;
            font-size: 11pt;
          }
          .header {
            background-color: #4B5563;
            color: #FFFFFF;
            font-weight: bold;
            text-align: left;
            padding: 12px 8px;
            border: 1px solid #374151;
            font-size: 12pt;
          }
          .even-row {
            background-color: #F3F4F6;
            padding: 8px;
            border: 1px solid #D1D5DB;
          }
          .odd-row {
            background-color: #FFFFFF;
            padding: 8px;
            border: 1px solid #D1D5DB;
          }
          .center {
            text-align: center;
          }
          td {
            padding: 8px;
            border: 1px solid #D1D5DB;
          }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
`
    
    headers.forEach(header => {
      excelContent += `              <th class="header">${header}</th>\n`
    })
    
    excelContent += '            </tr>\n          </thead>\n          <tbody>\n'
    
    openPositions.forEach((position, index) => {
      const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row'
      
      excelContent += '            <tr>\n'
      excelContent += `              <td class="${rowClass} center">${index + 1}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.id}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.createdOn}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.role}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.customerName}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.experience}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.department}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.priority}</td>\n`
      excelContent += `              <td class="${rowClass} center">${position.initialPositions}</td>\n`
      excelContent += `              <td class="${rowClass} center">${position.currentPositions}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.expectedDate}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.status}</td>\n`
      excelContent += `              <td class="${rowClass}">${position.remarks}</td>\n`
      excelContent += '            </tr>\n'
    })
    
    excelContent += '          </tbody>\n        </table>\n      </body>\n      </html>'
    
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const d = new Date()
    const timestamp = `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`
    link.setAttribute('download', `RRF_List_${timestamp}.xls`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const calculateLoss = (billingStartDate, billingRate) => {
    if (!billingStartDate || !billingRate) return null
    
    const today = new Date('2026-03-23') // Current date
    const expected = new Date(billingStartDate)
    
    if (today <= expected) return { daysLate: 0, loss: 0, status: 'on-track' }
    
    const daysLate = (today - expected) / (1000 * 60 * 60 * 24)
    const loss = daysLate * billingRate
    
    let status = 'critical'
    if (daysLate <= 5) status = 'warning'
    if (daysLate <= 2) status = 'mild'
    
    return { daysLate, loss, status }
  }

  const getLossIndicator = (position) => {
    if (position.requisitionType !== 'Billable') {
      return <span className="text-xs text-gray-500">Non-Billable</span>
    }
    
    const lossData = calculateLoss(position.billingStartDate, position.billingRate)
    
    if (!lossData) return null
    
    if (lossData.status === 'on-track') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xl">🟢</span>
          <span className="text-xs font-medium text-green-600">On Track</span>
        </div>
      )
    }
    
    const colorMap = {
      'mild': { bg: '#fef9c3', color: '#854d0e', icon: '🟡' },
      'warning': { bg: '#fed7aa', color: '#9a3412', icon: '🟠' },
      'critical': { bg: '#fee2e2', color: '#991b1b', icon: '🔴' }
    }
    
    const colors = colorMap[lossData.status]
    
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{colors.icon}</span>
          <span className="text-xs font-bold" style={{ color: colors.color }}>
            {lossData.daysLate} days late
          </span>
        </div>
        <div className="text-xs font-bold" style={{ color: colors.color }}>
          Loss: ${lossData.loss.toLocaleString()}
        </div>
      </div>
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

  // Calculate total stats
  const totalPositions = openPositions.length
  const billablePositions = openPositions.filter(p => p.requisitionType === 'Billable')
  const criticalLosses = billablePositions.filter(p => {
    const loss = calculateLoss(p.billingStartDate, p.billingRate)
    return loss && loss.status === 'critical'
  }).length
  const highLosses = billablePositions.filter(p => {
    const loss = calculateLoss(p.billingStartDate, p.billingRate)
    return loss && loss.status === 'warning'
  }).length
  const totalHeadcount = openPositions.reduce((sum, p) => sum + p.positions, 0)

  // Filter positions based on search term and department
  const filteredPositions = openPositions.filter(position => {
    // Department filter
    if (selectedDepartment !== 'all' && position.department !== selectedDepartment) {
      return false
    }
    
    // Search filter
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      position.id.toLowerCase().includes(searchLower) ||
      position.role.toLowerCase().includes(searchLower) ||
      position.customerName.toLowerCase().includes(searchLower) ||
      position.project.toLowerCase().includes(searchLower) ||
      position.department.toLowerCase().includes(searchLower) ||
      position.requester.toLowerCase().includes(searchLower) ||
      position.status.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-4 md:p-8">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
      >
        <ArrowLeftOutlined />
        <span>Back</span>
      </button>

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-lg text-gray-800 font-bold">{showDetailedView ? 'Complete information with export options' : 'RRFs assigned by PMO Team - currently open for recruitment'}</p>
        </div>
        <div className="flex gap-3">
          {showDetailedView ? (
            <>
              <button
                onClick={exportToCSV}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                📥 Export as CSV
              </button>
              <button
                onClick={exportToExcel}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                }}
              >
                📊 Export as Excel
              </button>
              <button
                onClick={() => setShowDetailedView(false)}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                }}
              >
                ← Back to Summary
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowDetailedView(true)}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              }}
            >
              📋 Detail View
            </button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative group">
            <input
              type="text"
              placeholder="Search by RRF ID, Role, Customer, Project, Department, Requester, or Status..."
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
            Found {filteredPositions.length} result{filteredPositions.length !== 1 ? 's' : ''}
            {searchTerm && ` for "${searchTerm}"`}
            {selectedDepartment !== 'all' && ` in ${selectedDepartment}`}
          </p>
        )}
      </div>

      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        {!showDetailedView && (
          /* Stats Summary */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-green-600">{totalPositions}</p>
            <p className="text-sm text-gray-500 mt-1">Total Open Positions</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-red-600">{criticalLosses}</p>
            <p className="text-sm text-gray-500 mt-1">Critical Loss (10+ days)</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-orange-600">{highLosses}</p>
            <p className="text-sm text-gray-500 mt-1">High Loss (6-10 days)</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-3xl font-bold text-indigo-600">{totalHeadcount}</p>
            <p className="text-sm text-gray-500 mt-1">Total Headcount</p>
          </div>
        </div>
        )}

        <div className="hidden md:block overflow-x-auto">
          {!showDetailedView ? (
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Role & Project</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dept</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Pos</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Requester</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dates</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map((position) => (
                <tr key={position.id} className="border-b border-gray-100 transition-all duration-200 hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-bold text-indigo-600">{position.id}</td>
                  <td className="px-3 py-3 text-xs">
                    <div className="font-medium text-gray-900">{position.role}</div>
                    <div className="text-gray-500">{position.project}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">{position.department}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                      {position.positions}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">{getPriorityBadge(position.priority)}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600">{position.requester}</td>
                  <td className="px-3 py-3 text-xs">
                    <div className="text-gray-600">Appr: {position.approvedDate}</div>
                    <div className="text-gray-500">Exp: {position.expectedDate}</div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Link href={`/hr/view-rrf/${position.id}`}>
                      <button className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-200 text-xs" style={{ borderRadius: '6px' }}>
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
            /* Detailed View Table */
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Sr No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">RRF No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Created On</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Customer Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Initial Pos.</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Current Pos.</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Anticipated Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((position, index) => (
                  <tr key={position.id} className={`border-b border-gray-200 transition-all duration-300 hover:bg-indigo-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{position.id}</td>
                    <td className="px-4 py-3 text-gray-700">{position.createdOn}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{position.role}</td>
                    <td className="px-4 py-3 text-gray-700">{position.customerName}</td>
                    <td className="px-4 py-3 text-gray-700">{position.experience}</td>
                    <td className="px-4 py-3 text-gray-700">{position.department}</td>
                    <td className="px-4 py-3">{getPriorityBadge(position.priority)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-700 rounded-full font-bold text-xs">
                        {position.initialPositions}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 text-green-700 rounded-full font-bold text-xs">
                        {position.currentPositions}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{position.expectedDate}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        position.status === 'Closed' ? 'bg-green-100 text-green-700' :
                        position.status === 'Delayed' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {position.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600" style={{ minWidth: '250px', maxWidth: '350px' }}>
                      <div style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.4' }}>
                        {position.remarks}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/hr/view-rrf/${position.id}`}>
                        <button className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-300 hover:scale-105 text-xs" style={{ borderRadius: '8px' }}>
                          View
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden px-2 pb-4 space-y-3">
          {filteredPositions.map((position) => (
            <div key={position.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-indigo-600 mb-1">{position.id}</div>
                  <div className="text-sm font-bold text-gray-900 truncate">{position.role}</div>
                  <div className="text-xs text-gray-500 truncate">{position.project} · {position.department}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {getPriorityBadge(position.priority)}
                <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                  {position.positions} pos
                </span>
                {showDetailedView && (
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    position.status === 'Closed' ? 'bg-green-100 text-green-700' :
                    position.status === 'Delayed' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {position.status}
                  </span>
                )}
              </div>
              {showDetailedView && (
                <div className="text-xs text-gray-500 mb-2 space-y-1">
                  <div>Experience: {position.experience}</div>
                  <div>Customer: {position.customerName}</div>
                  <div>Created: {position.createdOn} · Expected: {position.expectedDate}</div>
                  {position.remarks && <div className="text-gray-400 italic">{position.remarks}</div>}
                </div>
              )}
              {!showDetailedView && (
                <div className="text-xs text-gray-500 mb-2">
                  <span>Requester: {position.requester}</span>
                  <span className="ml-2">Appr: {position.approvedDate}</span>
                </div>
              )}
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Link href={`/hr/view-rrf/${position.id}`}>
                  <button className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-200 text-xs" style={{ borderRadius: '6px' }}>
                    View
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
