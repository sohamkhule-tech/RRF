'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EyeOutlined, LeftOutlined } from '@ant-design/icons'

export default function PMOSentToApproversPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  
  // Departments from RRF form
  const departments = ['HR', 'Talent Acquisition', 'Accounts', 'Sales & Marketing', 'PMO', 'SGINTL', 'VR', 'Support']
  
  const sentRequests = [
    { rrfId: 'RRF-2026-001', submissionId: '10', role: 'HR Specialist', manager: 'Amit Sharma', project: 'Recruitment Operations', department: 'HR', positions: 2, priority: 'High', sentDate: '15/03/2026', status: 'Open for Hiring' },
    { rrfId: 'RRF-2026-002', submissionId: '12', role: 'Talent Coordinator', manager: 'Priya Nair', project: 'Hiring Dashboard', department: 'Talent Acquisition', positions: 1, priority: 'Medium', sentDate: '16/03/2026', status: 'Open for Hiring' },
    { rrfId: 'RRF-2026-003', submissionId: '15', role: 'Finance Analyst', manager: 'Karan Mehta', project: 'Budget Planning', department: 'Accounts', positions: 1, priority: 'Medium', sentDate: '17/03/2026', status: 'Closed' },
    { rrfId: 'RRF-2026-004', submissionId: '18', role: 'Marketing Manager', manager: 'Neha Sharma', project: 'Campaign Strategy', department: 'Sales & Marketing', positions: 2, priority: 'High', sentDate: '18/03/2026', status: 'Open for Hiring' },
    { rrfId: 'RRF-2026-005', submissionId: '20', role: 'Project Lead', manager: 'Rohan Gupta', project: 'PMO Operations', department: 'PMO', positions: 1, priority: 'High', sentDate: '19/03/2026', status: 'Open for Hiring' },
    { rrfId: 'RRF-2026-006', submissionId: '22', role: 'Senior Java Developer', manager: 'Vikram Singh', project: 'Banking Portal', department: 'SGINTL', positions: 3, priority: 'Critical', sentDate: '20/03/2026', status: 'Open for Hiring' },
    { rrfId: 'RRF-2026-007', submissionId: '24', role: 'QA Lead', manager: 'Anjali Verma', project: 'Test Automation', department: 'VR', positions: 2, priority: 'Medium', sentDate: '21/03/2026', status: 'Closed' },
    { rrfId: 'RRF-2026-008', submissionId: '26', role: 'DevOps Engineer', manager: 'Rahul Kumar', project: 'Cloud Migration', department: 'Support', positions: 2, priority: 'High', sentDate: '22/03/2026', status: 'Open for Hiring' }
  ]

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
        🟢 Open for Hiring
      </span>
    )
  }

  const openCount = sentRequests.filter(r => r.status === 'Open for Hiring').length
  const closedCount = sentRequests.filter(r => r.status === 'Closed').length

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
      request.status.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-8 space-y-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-semibold transition-all duration-200 rounded-lg hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
      >
        <LeftOutlined />
        <span>Back</span>
      </button>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg text-gray-800 font-bold">Track RRFs with numbers added and sent to HR for recruitment</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-2 border-green-200 rounded-xl shadow-md">
            <div className="text-xl">🟢</div>
            <div>
              <p className="text-sm text-gray-700 font-bold">Open for Hiring</p>
              <p className="text-2xl font-bold text-green-600">{openCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl shadow-md">
            <div className="text-xl">🔒</div>
            <div>
              <p className="text-sm text-gray-700 font-bold">Closed</p>
              <p className="text-2xl font-bold text-gray-600">{closedCount}</p>
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
              placeholder="Search by RRF ID, Role, Manager, Project, Department, or Status..."
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
      
      {/* Sent RRFs Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        <div className="px-2 py-4 mb-4">
          <h3 className="text-lg font-bold text-gray-900">RRFs Sent to HR Team</h3>
          <p className="text-sm text-gray-500 mt-1">RRFs that have been opened for recruitment by HR team</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RRF ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role & Project</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sent Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.rrfId} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-indigo-600">{request.rrfId}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.manager}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.role}</div>
                    <div className="text-sm text-gray-500">{request.project}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{request.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-gray-900">{request.positions}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(request.priority)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.sentDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(request.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link href={`/pmo/view-rrf/${request.submissionId}?from=sent`}>
                      <button className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-300 flex items-center gap-1" style={{ borderRadius: '8px' }}>
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
      </div>
    </div>
  )
}
