/**
 * Unified Dashboard
 * 
 * Single dashboard that adapts based on user permissions
 * Replaces separate /pmo, /approver, /hr dashboards
 * 
 * This is a TEMPLATE showing how to merge role-specific dashboards
 * Reuse your existing StatCard and other components
 */

'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
  SendOutlined,
  BarChartOutlined,
  DownloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import StatCard from '@/components/StatCard'

export default function UnifiedDashboard() {
  const { user } = useAuth()
  const {
    canCreateRRF,
    canReadRRF,
    canUpdateRRF,
    canDeleteRRF,
    canApprove,
    canViewApprovals,
    canViewReports,
    canExportReports,
    hasPermission,
  } = usePermission()

  const [searchTerm, setSearchTerm] = useState('')

  // Determine user's primary function based on permissions
  const isHiringManager = canCreateRRF && !canApprove && !canDeleteRRF
  const isPMO = canCreateRRF && canDeleteRRF
  const isApprover = canApprove
  const isHR = canReadRRF && !canCreateRRF && !canApprove

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Here's what's happening with your requests today
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {canCreateRRF && (
            <Link href="/hiring-manager/create-rrf">
              <button className="px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 shadow-lg text-sm sm:text-base">
                <PlusOutlined />
                Create RRF
              </button>
            </Link>
          )}

          {canExportReports && (
            <button className="px-4 py-2.5 sm:px-5 sm:py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base">
              <DownloadOutlined />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards - Show different stats based on user permissions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {/* Hiring Manager Stats */}
        {isHiringManager && (
          <>
            <StatCard
              title="In Progress"
              value="6"
              subtitle="Open for hiring"
              icon={<ClockCircleOutlined />}
              color="cyan"
              href="/hiring-manager/dashboard/in-progress"
            />
            <StatCard
              title="Approved"
              value="7"
              subtitle="+3 this week"
              icon={<CheckCircleOutlined />}
              color="green"
              href="/hiring-manager/my-requests?status=approved"
            />
            <StatCard
              title="On Hold"
              value="3"
              subtitle="Pending review"
              icon={<ClockCircleOutlined />}
              color="orange"
              href="/hiring-manager/my-requests?status=on-hold"
            />
            <StatCard
              title="My Requests"
              value="14"
              subtitle="All submissions"
              icon={<FileTextOutlined />}
              color="blue"
              href="/hiring-manager/my-requests"
            />
          </>
        )}

        {/* PMO Stats */}
        {isPMO && (
          <>
            <StatCard
              title="Opened Positions"
              value="3"
              subtitle="Awaiting review"
              icon={<ClockCircleOutlined />}
              color="orange"
              href="/hiring-manager/my-requests?status=pending"
            />
            <StatCard
              title="Sent to HR"
              value="8"
              subtitle="Forwarded successfully"
              icon={<SendOutlined />}
              color="blue"
              href="/hiring-manager/my-requests?status=sent"
            />
            <StatCard
              title="Total Processed"
              value="15"
              subtitle="All time"
              icon={<CheckCircleOutlined />}
              color="green"
            />
            <StatCard
              title="Reports"
              value="View"
              subtitle="Analytics & Insights"
              icon={<BarChartOutlined />}
              color="purple"
              href="/reports"
            />
          </>
        )}

        {/* Approver Stats */}
        {isApprover && (
          <>
            <StatCard
              title="Pending Approval"
              value="8"
              subtitle="Requires action"
              icon={<ClockCircleOutlined />}
              color="orange"
              href="/approvals/pending"
            />
            <StatCard
              title="Approved"
              value="45"
              subtitle="This month"
              icon={<CheckCircleOutlined />}
              color="green"
              href="/approvals/approved"
            />
            <StatCard
              title="Declined"
              value="5"
              subtitle="This month"
              icon={<CloseCircleOutlined />}
              color="red"
              href="/approvals/declined"
            />
            <StatCard
              title="On Hold"
              value="2"
              subtitle="Pending info"
              icon={<ClockCircleOutlined />}
              color="yellow"
              href="/approvals/on-hold"
            />
          </>
        )}

        {/* HR Stats */}
        {isHR && (
          <>
            <StatCard
              title="Open Positions"
              value="15"
              subtitle="Active hiring"
              icon={<TeamOutlined />}
              color="cyan"
              href="/hr/open-hiring"
            />
            <StatCard
              title="Closed"
              value="28"
              subtitle="Completed"
              icon={<CheckCircleOutlined />}
              color="green"
              href="/hr/closed"
            />
            <StatCard
              title="Total RRFs"
              value="43"
              subtitle="All time"
              icon={<FileTextOutlined />}
              color="blue"
            />
            <StatCard
              title="Reports"
              value="View"
              subtitle="HR Analytics"
              icon={<BarChartOutlined />}
              color="purple"
              href="/reports"
            />
          </>
        )}
      </div>

      {/* Recent Items Section */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isHiringManager && 'My Recent Requests'}
            {isPMO && 'Recent Submissions'}
            {isApprover && 'Recent Approvals'}
            {isHR && 'Recent RRFs'}
          </h2>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchOutlined className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, role, project..."
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
            />
          </div>
        </div>

        {/* Sample Table - Replace with your actual data */}
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  RRF ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  Position
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                  RRF-001
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  Senior Backend Developer
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  March 20, 2026
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {canReadRRF && (
                      <Link href="/requests/1">
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300">
                          View
                        </button>
                      </Link>
                    )}

                    {canUpdateRRF && (
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300">
                        Edit
                      </button>
                    )}

                    {canApprove && (
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300">
                        Approve
                      </button>
                    )}

                    {canDeleteRRF && (
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300">
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {/* Add more rows with your actual data */}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-indigo-600">RRF-001</span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Pending</span>
            </div>
            <p className="text-sm text-gray-900 font-medium">Senior Backend Developer</p>
            <p className="text-xs text-gray-500 mt-1">March 20, 2026</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {canReadRRF && (
                <Link href="/requests/1">
                  <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs">View</button>
                </Link>
              )}
              {canUpdateRRF && (
                <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-xs">Edit</button>
              )}
              {canApprove && (
                <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-xs">Approve</button>
              )}
              {canDeleteRRF && (
                <button className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-xs">Delete</button>
              )}
            </div>
          </div>
        </div>

        {/* View All Link */}
        <div className="mt-6 text-center">
          <Link
            href="/hiring-manager/my-requests"
            className="text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            View All Requests →
          </Link>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {canCreateRRF && (
          <Link href="/hiring-manager/drafts">
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white text-2xl">
                  <FileTextOutlined />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Drafts</h3>
                  <p className="text-sm text-gray-600">3 saved drafts</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {canViewReports && (
          <Link href="/reports">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-2xl">
                  <BarChartOutlined />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Reports</h3>
                  <p className="text-sm text-gray-600">View analytics</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {hasPermission(PERMISSIONS.SETTINGS.READ) && (
          <Link href="/settings">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-2xl">
                  <TeamOutlined />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-600">Manage account</p>
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
