'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClockCircleOutlined, LeftOutlined } from '@ant-design/icons'

export default function PMOPendingPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  
  // Departments from RRF form
  const departments = ['HR', 'Talent Acquisition', 'Accounts', 'Sales & Marketing', 'PMO', 'SGINTL', 'VR', 'Support']
  
  const pendingRequests = [
    { id: '1', role: 'HR Coordinator', manager: 'John Doe', project: 'Recruitment Process', positions: 1, priority: 'High', date: '20/03/2026', department: 'HR' },
    { id: '2', role: 'Recruitment Specialist', manager: 'Sarah Lee', project: 'Talent Pipeline', positions: 2, priority: 'High', date: '21/03/2026', department: 'Talent Acquisition' },
    { id: '3', role: 'Accounts Manager', manager: 'Mike Johnson', project: 'Financial Planning', positions: 1, priority: 'Medium', date: '22/03/2026', department: 'Accounts' },
    { id: '4', role: 'Marketing Executive', manager: 'Alex Brown', project: 'Campaign Management', positions: 2, priority: 'High', date: '18/03/2026', department: 'Sales & Marketing' },
    { id: '5', role: 'Project Manager', manager: 'Emma Wilson', project: 'Operations Support', positions: 1, priority: 'Medium', date: '19/03/2026', department: 'PMO' },
    { id: '6', role: 'Java Developer', manager: 'David Chen', project: 'Banking Portal', positions: 3, priority: 'Critical', date: '23/03/2026', department: 'SGINTL' },
    { id: '7', role: 'QA Engineer', manager: 'Lisa Wang', project: 'Testing Framework', positions: 2, priority: 'Medium', date: '24/03/2026', department: 'VR' },
    { id: '8', role: 'DevOps Engineer', manager: 'Tom Baker', project: 'Cloud Migration', positions: 2, priority: 'Critical', date: '25/03/2026', department: 'Support' }
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

  // Filter requests based on search term and department
  const filteredRequests = pendingRequests.filter(request => {
    // Department filter
    if (selectedDepartment !== 'all' && request.department !== selectedDepartment) {
      return false
    }
    
    // Search filter
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      request.role.toLowerCase().includes(searchLower) ||
      request.manager.toLowerCase().includes(searchLower) ||
      request.project.toLowerCase().includes(searchLower) ||
      request.department.toLowerCase().includes(searchLower)
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-lg text-gray-800 font-bold">Approved RRFs from Approvers - Review and open for hiring</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-orange-200 rounded-xl shadow-md">
          <div className="text-2xl">⏳</div>
          <div>
            <p className="text-sm text-gray-700 font-bold">Total Pending</p>
            <p className="text-3xl font-bold text-orange-600">{pendingRequests.length}</p>
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
              placeholder="Search by Role, Manager, Project, or Department..."
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

      {/* Pending Requests Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        <div className="px-2 py-4 mb-4">
          <h3 className="text-lg font-bold text-gray-900">Opened Positions</h3>
          <p className="text-sm text-gray-500 mt-1">Add RRF# and click "Open for Requisition" to send to HR Team</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Submission ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Submitted On</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-indigo-600">SUB-{request.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.manager}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{request.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{request.project}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{request.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-gray-900">{request.positions}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(request.priority)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link href={`/pmo/view-rrf/${request.id}`}>
                      <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300" style={{ borderRadius: '8px' }}>
                        View RRF
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
