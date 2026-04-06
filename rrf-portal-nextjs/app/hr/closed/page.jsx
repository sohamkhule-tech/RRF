'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftOutlined } from '@ant-design/icons'

export default function ClosedPositionsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  
  // Departments from RRF form
  const departments = ['HR', 'Talent Acquisition', 'Accounts', 'Sales & Marketing', 'PMO', 'SGINTL', 'VR', 'Support']
  
  const closedPositions = [
    { 
      id: 'RRF-001', 
      role: 'HR Specialist', 
      project: 'Recruitment Operations', 
      positions: 1, 
      priority: 'High', 
      requester: 'John Smith', 
      department: 'HR',
      approvedDate: '10/02/2026', 
      closedDate: '15/03/2026',
      closureReason: 'Position Filled',
      candidateName: 'Alex Johnson'
    },
    { 
      id: 'RRF-002', 
      role: 'Talent Acquisition Manager', 
      project: 'Hiring Strategy', 
      positions: 1, 
      priority: 'Medium', 
      requester: 'Sarah Davis', 
      department: 'Talent Acquisition',
      approvedDate: '15/02/2026', 
      closedDate: '20/03/2026',
      closureReason: 'Position Filled',
      candidateName: 'Maria Garcia'
    },
    { 
      id: 'RRF-003', 
      role: 'Finance Controller', 
      project: 'Budget Management', 
      positions: 1, 
      priority: 'High', 
      requester: 'Tom Wilson', 
      department: 'Accounts',
      approvedDate: '18/02/2026', 
      closedDate: '22/03/2026',
      closureReason: 'Position Filled',
      candidateName: 'James Lee'
    },
    { 
      id: 'RRF-004', 
      role: 'Marketing Coordinator', 
      project: 'Campaign Management', 
      positions: 2, 
      priority: 'Medium', 
      requester: 'Emma Brown', 
      department: 'Sales & Marketing',
      approvedDate: '20/02/2026', 
      closedDate: '24/03/2026',
      closureReason: 'Position Filled',
      candidateName: 'Lisa Wang, David Chen'
    },
    { 
      id: 'RRF-005', 
      role: 'Senior Java Developer', 
      project: 'Banking Portal', 
      positions: 2, 
      priority: 'Critical', 
      requester: 'Mike Johnson', 
      department: 'SGINTL',
      approvedDate: '12/02/2026', 
      closedDate: '18/03/2026',
      closureReason: 'Position Filled',
      candidateName: 'Rahul Kumar, Priya Sharma'
    }
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

  // Filter positions based on search term and department
  const filteredPositions = closedPositions.filter(position => {
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
      position.project.toLowerCase().includes(searchLower) ||
      position.department.toLowerCase().includes(searchLower) ||
      position.requester.toLowerCase().includes(searchLower) ||
      position.candidateName.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-8">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
      >
        <ArrowLeftOutlined />
        <span>Back</span>
      </button>

      <div className="mb-6">
        <p className="text-lg text-gray-800 font-bold">Successfully filled or cancelled requisitions</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
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
            Found {filteredPositions.length} result{filteredPositions.length !== 1 ? 's' : ''}
            {searchTerm && ` for "${searchTerm}"`}
            {selectedDepartment !== 'all' && ` in ${selectedDepartment}`}
          </p>
        )}
      </div>

      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-600">2</p>
            <p className="text-base text-gray-700 mt-1 font-semibold">Total Closed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">2</p>
            <p className="text-base text-gray-700 mt-1 font-semibold">Positions Filled</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">3</p>
            <p className="text-base text-gray-700 mt-1 font-semibold">Total Hires</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">RRF ID</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Role & Project</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Dept</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase">Pos</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Closure Info</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Candidate</th>
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
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">
                      {position.positions}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">{getPriorityBadge(position.priority)}</td>
                  <td className="px-3 py-3 text-xs">
                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">{position.closureReason}</span>
                    <div className="text-gray-500 mt-1">Closed: {position.closedDate}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 max-w-xs truncate" title={position.candidateName}>{position.candidateName}</td>
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
        </div>
      </div>
    </div>
  )
}
