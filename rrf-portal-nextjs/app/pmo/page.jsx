'use client'

import Link from 'next/link'
import { ClockCircleOutlined, CheckCircleOutlined, SearchOutlined, SendOutlined, PlusOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import StatCard from '@/components/StatCard'
import { useState, useEffect } from 'react'
import { rrfApi } from '@/lib/api/rrfApi'

export default function PMODashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    openedPositions: 0,
    sentToHR: 0,
    totalProcessed: 0,
    closed: 0
  })
  const [recentRequests, setRecentRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      const response = await rrfApi.getPMODashboardStats()
      const statsData = response?.data || response || {}
      setStats({
        openedPositions: statsData.openedPositions || 0,
        sentToHR: statsData.sentToHR || 0,
        totalProcessed: statsData.totalProcessed || 0,
        closed: statsData.closed || 0
      })
    } catch (error) {
      console.error('Error fetching PMO dashboard stats:', error)
    }
  }

  // Fetch recent open positions
  const fetchRecentRequests = async () => {
    try {
      const response = await rrfApi.getOpenPositions()
      const rrfs = response?.data || response || []
      
      // Format for display - take latest 5
      const formattedRequests = Array.isArray(rrfs) 
        ? rrfs.slice(0, 5).map(rrf => ({
            id: rrf.id,
            rrfNumber: rrf.rrfNumber,
            role: rrf.jobTitle,
            manager: rrf.createdBy?.name || 'N/A',
            project: rrf.projectName,
            positions: rrf.numberOfPositions,
            priority: rrf.priority,
            status: rrf.status,
            date: new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB')
          }))
        : []
      
      setRecentRequests(formattedRequests)
    } catch (error) {
      console.error('Error fetching open positions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh handler
  const handleRefresh = () => {
    setLoading(true)
    fetchStats()
    fetchRecentRequests()
  }

  // Initial load and auto-refresh setup
  useEffect(() => {
    fetchStats()
    fetchRecentRequests()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats()
      fetchRecentRequests()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

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

  const filteredRequests = recentRequests.filter(request => {
    const searchLower = searchTerm.toLowerCase()
    return (
      request.rrfNumber?.toLowerCase().includes(searchLower) ||
      request.manager?.toLowerCase().includes(searchLower) ||
      request.role?.toLowerCase().includes(searchLower) ||
      request.project?.toLowerCase().includes(searchLower) ||
      request.priority?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-8 space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Opened Positions" 
          value={stats.openedPositions.toString()} 
          subtitle="Awaiting review" 
          icon={<ClockCircleOutlined />} 
          color="orange" 
          href="/pmo/open-positions" 
        />
        <StatCard 
          title="Sent to HR Team" 
          value={stats.sentToHR.toString()} 
          subtitle="Forwarded successfully" 
          icon={<SendOutlined />} 
          color="blue" 
          href="/pmo/sent-to-hr" 
        />
        <StatCard 
          title="Closed" 
          value={stats.closed.toString()} 
          subtitle="Completed positions" 
          icon={<CloseCircleOutlined />} 
          color="red" 
        />
        <StatCard 
          title="Total Processed" 
          value={stats.totalProcessed.toString()} 
          subtitle="All time" 
          icon={<CheckCircleOutlined />} 
          color="green" 
        />
      </div>

      {/* Recent Requests Table */}
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
        <div className="px-2 py-4 mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Recent Open Positions</h3>
          <div className="flex gap-3">
            <Link href="/pmo/create-rrf">
              <button className="px-4 py-2 text-white text-sm font-medium hover:scale-105 transition-all duration-300 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}>
                <PlusOutlined />
                Create New RRF
              </button>
            </Link>
          </div>
        </div>

        <div className="px-2 mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by RRF ID, Requester, Role, Project or Priority..."
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved On</th>
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
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 transition-all duration-300 hover:bg-gray-50">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">{request.rrfNumber}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.manager}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">{request.role}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.project}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                        {request.positions}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">{getPriorityBadge(request.priority)}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{request.date}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <Link href={`/pmo/view-rrf/${request.id}`}>
                        <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-300 flex items-center gap-2" style={{ borderRadius: '10px' }}>
                          View RRF
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
