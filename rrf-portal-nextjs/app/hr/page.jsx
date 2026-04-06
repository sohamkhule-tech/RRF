'use client'

import Link from 'next/link'
import { FolderOpenOutlined, CheckCircleOutlined, SearchOutlined, ClockCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import StatCard from '@/components/StatCard'
import { useState, useEffect } from 'react'
import { rrfApi } from '@/lib/api/rrfApi'

export default function HRDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [openPositions, setOpenPositions] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch open for hiring positions
  const fetchOpenPositions = async () => {
    try {
      const response = await rrfApi.getOpenForHiring()
      const rrfs = response?.data || response || []
      
      // Format for display
      const formattedPositions = Array.isArray(rrfs)
        ? rrfs.map(rrf => ({
            id: rrf.id,
            rrfId: rrf.rrfNumber,
            role: rrf.jobTitle,
            project: rrf.projectName,
            positions: rrf.numberOfPositions,
            priority: rrf.priority,
            status: rrf.status,
            date: new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB')
          }))
        : []
      
      setOpenPositions(formattedPositions)
    } catch (error) {
      console.error('Error fetching open positions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh handler
  const handleRefresh = () => {
    setLoading(true)
    fetchOpenPositions()
  }

  // Initial load and auto-refresh
  useEffect(() => {
    fetchOpenPositions()
    const interval = setInterval(fetchOpenPositions, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status) => {
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#166534', borderRadius: '999px', padding: '6px 12px' }}>
        Open for Hiring
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
        {priority}
      </span>
    )
  }

  const filteredPositions = openPositions.filter(request => {
    const searchLower = searchTerm.toLowerCase()
    return (
      request.rrfId?.toLowerCase().includes(searchLower) ||
      request.role?.toLowerCase().includes(searchLower) ||
      request.project?.toLowerCase().includes(searchLower) ||
      request.priority?.toLowerCase().includes(searchLower) ||
      request.status?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-8 space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Open for Hiring"
          value={openPositions.length.toString()}
          subtitle="Active positions"
          icon={<FolderOpenOutlined />}
          color="green"
          href="/hr/open-hiring"
        />
        <StatCard
          title="Hiring In Progress"
          value="4"
          subtitle="Interviews ongoing"
          icon={<ClockCircleOutlined />}
          color="blue"
        />
        <StatCard
          title="Positions Filled"
          value="28"
          subtitle="This quarter"
          icon={<CheckCircleOutlined />}
          color="cyan"
        />
        <StatCard
          title="Closed Requests"
          value="45"
          subtitle="All time"
          icon={<CloseCircleOutlined />}
          color="gray"
          href="/hr/closed"
        />
      </div>

      {/* Open Positions Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        <div className="px-2 py-4 mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Open for Hiring Positions</h3>
          <Link href="/hr/open-hiring">
            <button className="px-4 py-2 text-indigo-600 border-2 border-indigo-200 text-sm font-medium hover:bg-indigo-50 transition-all duration-300" style={{ borderRadius: '10px' }}>
              View All Open
            </button>
          </Link>
        </div>

        {/* Search Box and Reload */}
        <div className="px-2 mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by RRF ID, Role, Project, Priority or Status..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
              style={{ borderRadius: '10px' }}
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            style={{ borderRadius: '10px' }}
          >
            <ReloadOutlined className={loading ? 'animate-spin' : ''} />
            Reload
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">RRF ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <ReloadOutlined className="animate-spin" style={{ fontSize: '32px', color: '#6366f1' }} />
                      <p className="text-sm font-medium">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPositions.length > 0 ? (
                filteredPositions.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.rrfId}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.role}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                        {request.positions}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.date}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <Link href={`/hr/view-rrf/${request.id}`}>
                        <button className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-300 hover:scale-105" style={{ borderRadius: '10px' }}>
                          View
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                      <p className="text-sm font-medium">
                        {searchTerm ? `No requests found matching "${searchTerm}"` : 'No open positions available'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
