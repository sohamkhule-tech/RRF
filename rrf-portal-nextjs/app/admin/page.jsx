'use client'

import { useState, useEffect } from 'react'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import StatCard from '@/components/StatCard'
import { rrfApi } from '@/lib/api/rrfApi'
import { usersApi } from '@/lib/api/usersApi'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [statsRes, usersRes] = await Promise.all([
          rrfApi.getStatistics(true),
          usersApi.getAll(),
        ])

        setStats(statsRes?.data || null)
        setUserCount(usersRes?.data?.length || 0)
      } catch (error) {
        console.error('Failed to load admin dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const byStatus = stats?.byStatus || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">


        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6">
          <StatCard
            title="Total RRFs"
            value={stats?.total || 0}
            icon={<FileTextOutlined />}
            color="blue"
            href="/admin/rrf-management"
          />
          <StatCard
            title="Pending"
            value={byStatus.pending || 0}
            icon={<ClockCircleOutlined />}
            color="orange"
          />
          <StatCard
            title="Approved"
            value={byStatus.approved || 0}
            icon={<CheckCircleOutlined />}
            color="green"
          />
          <StatCard
            title="In Progress"
            value={byStatus.openForHiring || 0}
            icon={<SyncOutlined />}
            color="cyan"
          />
          <StatCard
            title="Closed"
            value={byStatus.closed || 0}
            icon={<RiseOutlined />}
            color="purple"
          />
          <StatCard
            title="Total Users"
            value={userCount}
            icon={<TeamOutlined />}
            color="red"
            href="/admin/users"
          />
        </div>
      </div>
    </div>
  )
}
