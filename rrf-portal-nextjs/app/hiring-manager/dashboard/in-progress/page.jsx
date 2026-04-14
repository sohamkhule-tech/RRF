'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'

export default function InProgressPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  // Departments from RRF form
  const departments = ['HR', 'Talent Acquisition', 'Accounts', 'Sales & Marketing', 'PMO', 'SGINTL', 'VR', 'Support']

  // In progress requests (Only those opened by PMO for requisition/hiring)
  const inProgressRequests = [
    { id: 'RRF-2026-001', rrfId: 'RRF-2026-001', role: 'HR Specialist', department: 'HR', project: 'Recruitment Operations', positions: 2, priority: 'High', status: 'Open for Hiring', date: '15/03/2026', requester: 'Amit Sharma', openedDate: '15/03/2026' },
    { id: 'RRF-2026-002', rrfId: 'RRF-2026-002', role: 'Talent Coordinator', department: 'Talent Acquisition', project: 'Hiring Dashboard', positions: 1, priority: 'Medium', status: 'Open for Hiring', date: '16/03/2026', requester: 'Priya Nair', openedDate: '16/03/2026' },
    { id: 'RRF-2026-004', rrfId: 'RRF-2026-004', role: 'Marketing Manager', department: 'Sales & Marketing', project: 'Campaign Strategy', positions: 2, priority: 'High', status: 'Open for Hiring', date: '18/03/2026', requester: 'Neha Sharma', openedDate: '18/03/2026' },
    { id: 'RRF-2026-005', rrfId: 'RRF-2026-005', role: 'Project Lead', department: 'PMO', project: 'PMO Operations', positions: 1, priority: 'High', status: 'Open for Hiring', date: '19/03/2026', requester: 'Rohan Gupta', openedDate: '19/03/2026' },
    { id: 'RRF-2026-006', rrfId: 'RRF-2026-006', role: 'Senior Java Developer', department: 'SGINTL', project: 'Banking Portal', positions: 3, priority: 'Critical', status: 'Open for Hiring', date: '20/03/2026', requester: 'Vikram Singh', openedDate: '20/03/2026' },
    { id: 'RRF-2026-008', rrfId: 'RRF-2026-008', role: 'DevOps Engineer', department: 'Support', project: 'Cloud Migration', positions: 2, priority: 'High', status: 'Open for Hiring', date: '22/03/2026', requester: 'Rahul Kumar', openedDate: '22/03/2026' }
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
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '6px 12px' }}>
        🟢 Open for Hiring
      </span>
    )
  }

  // Filter requests based on search term and department
  const filteredRequests = inProgressRequests.filter(request => {
    // Department filter
    if (selectedDepartment !== 'all' && request.department !== selectedDepartment) {
      return false
    }

    // Search filter
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      request.id.toLowerCase().includes(searchLower) ||
      request.role.toLowerCase().includes(searchLower) ||
      request.project.toLowerCase().includes(searchLower) ||
      request.department.toLowerCase().includes(searchLower) ||
      request.requester.toLowerCase().includes(searchLower)
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

      <div className="mb-6">
        <p className="text-lg text-gray-800 font-bold">In Progress RRFs</p>
        <p className="text-sm text-gray-500 mt-1">Requests opened by PMO for requisition and currently in hiring process</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative group">
            <input
              type="text"
              placeholder="Search by RRF ID, Role, Project, Department, or Requester..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-5 py-3.5 pl-12 pr-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-md text-sm placeholder-gray-400"
              style={{ fontSize: '14px' }}
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 transition-colors group-hover:text-indigo-500">
              <SearchOutlined style={{ fontSize: '18px' }} />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full md:w-48 px-5 py-3.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-md text-sm font-medium text-gray-700 cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredRequests.length}</span> of <span className="font-semibold text-gray-900">{inProgressRequests.length}</span> in progress requests
          </p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {filteredRequests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <SearchOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                <p className="text-lg font-medium text-gray-500">No requests found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-600">{request.id}</span>
                  {getPriorityBadge(request.priority)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{request.role}</p>
                  <p className="text-xs text-gray-500 mt-1">{request.department} &middot; {request.project}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{request.positions} position(s)</span>
                  <span>{request.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  {getStatusBadge(request.status)}
                  <Link href={`/hiring-manager/view-rrf/${request.id}`}>
                    <button className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg transition-all duration-200 hover:shadow-md">
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100" style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RRF ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <SearchOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                      <p className="text-lg font-medium text-gray-500">No requests found</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => (
                  <tr 
                    key={request.id}
                    className={`transition-all duration-200 hover:bg-indigo-50 hover:shadow-sm ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-indigo-600">{request.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">{request.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{request.department}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{request.project}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-gray-900">{request.positions}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getPriorityBadge(request.priority)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{request.date}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/hiring-manager/view-rrf/${request.id}`}>
                        <button className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg transition-all duration-200 hover:shadow-md">
                          View Details
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
