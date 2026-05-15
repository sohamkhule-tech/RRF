/**
 * Unified Dashboard Page
 *
 * Permission-adaptive dashboard that replaces 4 role-specific dashboards.
 * Shows different stat cards and recent activity depending on user permissions.
 *
 * STRANGLER PATTERN: Coexists with old /pmo, /approver, /hr, /hiring-manager dashboards.
 * Old routes are NOT modified or deleted.
 *
 * Route: /dashboard
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  SyncOutlined,
  TeamOutlined,
  StopOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'

import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import StatCard from '@/components/StatCard'
import ActionButton from '@/components/ActionButton'
import { SearchBar, RRFTable } from '@/components/shared'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { rrfApi, formatRrfListForDisplay } from '@/lib/api/rrfApi'
import { usersApi } from '@/lib/api/usersApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { CACHE_TTL } from '@/lib/apiCache'
import { useRRFStatistics } from '@/hooks/useRRFStatistics'
import { useMyRequests } from '@/hooks/useMyRequests'
import { useVisibilityRefresh } from '@/lib/useVisibilityRefresh'

// ── Role Detection ──

function useRoleDetection() {
  const { user } = useAuth()
  const { canCreateRRF, canApprove, hasPermission } = usePermission()

  const roleCode = String(user?.role?.code || user?.role || '').toUpperCase()

  // Determine primary dashboard type — ADMIN is a first-class role, not grouped with PMO
  const isAdmin = roleCode === 'ADMIN'
  const isPMO = roleCode === 'PMO'
  const isApprover = roleCode === 'APPROVER' || (canApprove && !isPMO && !isAdmin)
  const isHR = roleCode === 'HR'
  const isHiringManager = !isAdmin && !isPMO && !isApprover && !isHR

  return { user, roleCode, isAdmin, isPMO, isApprover, isHR, isHiringManager, canCreateRRF }
}

// ── Hiring Manager Dashboard Section ──

function HiringManagerDashboard({ searchTerm }) {
  const { statistics, loading: statsLoading, refresh: refreshStats } = useRRFStatistics(false)
  const { requests, loading: reqLoading, refresh: refreshRequests } = useMyRequests()

  const refreshAll = useCallback(() => {
    refreshStats()
    refreshRequests()
  }, [refreshStats, refreshRequests])

  useVisibilityRefresh(refreshAll, { intervalMs: 60_000 })

  const loading = (statsLoading && !statistics) || (reqLoading && !requests?.length)

  const byStatus = statistics?.byStatus || {}
  const inProgressCount = byStatus['openForHiring'] || byStatus['open-for-hiring'] || byStatus['in-progress'] || 0
  const pendingApprovalCount = (byStatus['pending'] || 0) + (byStatus['submitted'] || 0)
  const approvedCount = byStatus['approved'] || 0
  const onHoldCount = byStatus['on-hold'] || byStatus['onHold'] || 0
  const declinedCount = (byStatus['declined'] || 0) + (byStatus['rejected'] || 0)
  const closedCount = (byStatus['closed'] || 0) + (byStatus['closed-by-bench'] || 0)

  const recentRequests = useMemo(() => {
    const base = (requests || []).filter((r) => r.status?.toLowerCase() !== 'draft').slice(0, 6)
    if (!searchTerm) return base
    const s = searchTerm.toLowerCase()
    return base.filter(
      (r) =>
        (r.displayId || '').toLowerCase().includes(s) ||
        (r.positionTitle || r.role || '').toLowerCase().includes(s) ||
        (r.project || '').toLowerCase().includes(s) ||
        (r.priority || '').toLowerCase().includes(s) ||
        (r.status || '').toLowerCase().includes(s),
    )
  }, [requests, searchTerm])

  const statCards = [
    { title: 'Pending Approval', value: pendingApprovalCount, subtitle: 'Awaiting approval', icon: <ClockCircleOutlined />, color: 'orange', view: 'pending' },
    { title: 'Approved', value: approvedCount, subtitle: 'Ready to hire', icon: <CheckCircleOutlined />, color: 'green', view: 'approved' },
    { title: 'In Progress', value: inProgressCount, subtitle: 'Open for hiring', icon: <SendOutlined />, color: 'cyan', view: 'in-progress' },
    { title: 'On Hold', value: onHoldCount, subtitle: 'Pending review', icon: <PauseCircleOutlined />, color: 'orange', view: 'on-hold' },
    { title: 'Declined', value: declinedCount, subtitle: 'Needs attention', icon: <CloseCircleOutlined />, color: 'red', view: 'declined' },
    { title: 'Closed', value: closedCount, subtitle: 'Completed requests', icon: <FileTextOutlined />, color: 'blue', view: 'closed' },
  ]

  const columns = [
    { key: 'displayId', header: 'ID', type: 'id' },
    { key: 'role', header: 'Role', className: 'font-medium text-gray-900' },
    { key: 'project', header: 'Project', className: 'text-gray-600' },
    { key: 'positions', header: 'Positions', type: 'positions' },
    { key: 'priority', header: 'Priority', type: 'priority' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'date', header: 'Created', type: 'date' },
  ]

  return { statCards, columns, data: recentRequests, loading, refresh: refreshAll, tableTitle: 'Recent Requests' }
}

// ── Approver Dashboard Section ──

function ApproverDashboard({ searchTerm }) {
  const { user } = useAuth()
  const userId = user?.id

  const { data: requests, loading: reqLoading, refresh: refreshRequests } = useSmartFetch(
    userId ? `dash-approver-pending-${userId}` : null,
    () => rrfApi.getPendingApprovals(),
    { ttl: CACHE_TTL.LIST, transform: (d) => d || [] },
  )

  const { data: statistics, loading: statsLoading, refresh: refreshStats } = useSmartFetch(
    userId ? `dash-statistics-${userId}-true` : null,
    () => rrfApi.getStatistics(true),
    { ttl: CACHE_TTL.STATS, transform: (res) => (res?.success ? res.data : null) },
  )

  const refreshAll = useCallback(() => {
    refreshRequests()
    refreshStats()
  }, [refreshRequests, refreshStats])

  useVisibilityRefresh(refreshAll, { intervalMs: 60_000 })

  const loading = (reqLoading && !requests?.length) || (statsLoading && !statistics)

  const byStatus = statistics?.byStatus || {}
  const pendingCount = (byStatus['submitted'] || 0) + (byStatus['pending'] || 0)
  const approvedCount = byStatus['approved'] || 0
  const declinedCount = (byStatus['declined'] || 0) + (byStatus['rejected'] || 0)
  const onHoldCount = (byStatus['on-hold'] || 0) + (byStatus['onHold'] || 0)
  const closedCount = (byStatus['closed'] || 0) + (byStatus['closedByBench'] || 0)

  const recentRequests = useMemo(() => {
    const base = (requests || []).slice(0, 5)
    if (!searchTerm) return base
    const s = searchTerm.toLowerCase()
    return base.filter(
      (r) =>
        (r.displayId || '').toLowerCase().includes(s) ||
        (r.createdBy?.fullName || '').toLowerCase().includes(s) ||
        (r.positionTitle || '').toLowerCase().includes(s) ||
        (r.projectName || '').toLowerCase().includes(s) ||
        (r.priority || '').toLowerCase().includes(s),
    )
  }, [requests, searchTerm])

  const statCards = [
    { title: 'Pending Approvals', value: pendingCount, icon: <ClockCircleOutlined />, color: 'orange', view: 'pending-approval' },
    { title: 'Approved', value: approvedCount, icon: <CheckCircleOutlined />, color: 'green', view: 'approved' },
    { title: 'Declined', value: declinedCount, icon: <CloseCircleOutlined />, color: 'red', view: 'declined' },
    { title: 'On Hold', value: onHoldCount, subtitle: 'Needs action', icon: <ClockCircleOutlined />, color: 'orange', view: 'on-hold' },
    { title: 'Closed', value: closedCount, icon: <CheckCircleOutlined />, color: 'blue', view: 'closed' },
  ]

  const columns = [
    { key: 'displayId', header: 'ID', type: 'id' },
    { key: 'createdBy.fullName', header: 'Manager', className: 'font-medium text-gray-900', render: (v) => v || 'Unknown' },
    { key: 'positionTitle', header: 'Role', className: 'font-medium text-gray-900' },
    { key: 'projectName', header: 'Project', className: 'text-gray-600' },
    { key: 'headcount', header: 'Positions', type: 'positions' },
    { key: 'priority', header: 'Priority', type: 'priority' },
    { key: 'status', header: 'Status', type: 'status' },
  ]

  return { statCards, columns, data: recentRequests, loading, refresh: refreshAll, tableTitle: 'Recent Requests' }
}

// ── PMO Dashboard Section ──

function PMODashboard({ searchTerm }) {
  const { user } = useAuth()
  const userId = user?.id

  const { data: stats, refresh: refreshStats } = useSmartFetch(
    userId ? `dash-pmo-stats-${userId}` : null,
    () => rrfApi.getPMODashboardStats(),
    {
      ttl: CACHE_TTL.STATS,
      transform: (response) => {
        const d = response?.data || response || {}
        return {
          openedPositions: d.openedPositions || 0,
          sentToHR: d.sentToHR || 0,
          totalProcessed: d.totalProcessed || 0,
          closed: d.closed || 0,
          closedByReason: {
            SOURCED_INTERNALLY: d.closedByReason?.SOURCED_INTERNALLY || 0,
            CLOSED_BY_BUSINESS: d.closedByReason?.CLOSED_BY_BUSINESS || 0,
          },
        }
      },
    },
  )

  const { data: recentRaw, loading, refresh: refreshRecent } = useSmartFetch(
    userId ? `dash-pmo-open-pos-${userId}` : null,
    () => rrfApi.getOpenPositions(),
    {
      ttl: CACHE_TTL.LIST,
      transform: (response) => {
        const rrfs = response?.data || response || []
        return Array.isArray(rrfs)
          ? rrfs.slice(0, 5).map((rrf) => ({
              id: rrf.id,
              rrfNumber: rrf.rrfNumber || rrf.subId,
              displayId: rrf.rrfNumber || rrf.subId,
              role: rrf.positionTitle || '-',
              manager: rrf.createdBy?.fullName || '-',
              project: rrf.projectName || '-',
              positions: rrf.headcount || 1,
              priority: rrf.priority || 'Medium',
              status: rrf.status,
              date: new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB'),
            }))
          : []
      },
    },
  )

  const refreshAll = useCallback(() => {
    refreshStats()
    refreshRecent()
  }, [refreshStats, refreshRecent])

  useVisibilityRefresh(refreshAll, { intervalMs: 60_000 })

  const effectiveStats = stats || {
    openedPositions: 0,
    sentToHR: 0,
    totalProcessed: 0,
    closed: 0,
    closedByReason: { SOURCED_INTERNALLY: 0, CLOSED_BY_BUSINESS: 0 },
  }

  const recentRequests = useMemo(() => {
    const base = recentRaw || []
    if (!searchTerm) return base
    const s = searchTerm.toLowerCase()
    return base.filter(
      (r) =>
        (r.rrfNumber || '').toLowerCase().includes(s) ||
        (r.manager || '').toLowerCase().includes(s) ||
        (r.role || '').toLowerCase().includes(s) ||
        (r.project || '').toLowerCase().includes(s) ||
        (r.priority || '').toLowerCase().includes(s),
    )
  }, [recentRaw, searchTerm])

  const statCards = [
    { title: 'Request Positions', value: effectiveStats.openedPositions, subtitle: 'Awaiting review', icon: <ClockCircleOutlined />, color: 'orange', view: 'open-positions' },
    { title: 'Open for Hiring', value: effectiveStats.sentToHR, subtitle: 'Forwarded to HR', icon: <SendOutlined />, color: 'blue', view: 'pmo-open-for-hiring' },
    { title: 'Sourced Internally', value: effectiveStats.closedByReason.SOURCED_INTERNALLY, subtitle: 'Internal fulfillment', icon: <TeamOutlined />, color: 'cyan', view: 'sourced-internally' },
    { title: 'Closed by Business', value: effectiveStats.closedByReason.CLOSED_BY_BUSINESS, subtitle: 'Business decision', icon: <StopOutlined />, color: 'orange', view: 'closed-by-business' },
    { title: 'Closed', value: effectiveStats.closed, subtitle: 'Hired externally', icon: <CloseCircleOutlined />, color: 'red', view: 'closed' },
    { title: 'Processed Requests', value: effectiveStats.totalProcessed, subtitle: 'All processed', icon: <FileTextOutlined />, color: 'gray', view: 'total-processed' },
  ]

  const columns = [
    { key: 'rrfNumber', header: 'ID', type: 'id' },
    { key: 'manager', header: 'Requester', className: 'font-medium text-gray-900' },
    { key: 'role', header: 'Role', className: 'font-medium text-gray-900' },
    { key: 'project', header: 'Project', className: 'text-gray-600' },
    { key: 'positions', header: 'Positions', type: 'positions' },
    { key: 'priority', header: 'Priority', type: 'priority' },
    { key: 'date', header: 'Approved On', type: 'date' },
  ]

  return { statCards, columns, data: recentRequests, loading, refresh: refreshAll, tableTitle: 'Recent Open Positions' }
}

// ── HR Dashboard Section ──

function HRDashboard({ searchTerm }) {
  const { user } = useAuth()
  const userId = user?.id

  const { data: allRrfs, refresh: refreshAll } = useSmartFetch(
    userId ? `dash-hr-all-${userId}` : null,
    () => rrfApi.getAll({ limit: 1000 }),
    { ttl: CACHE_TTL.LIST, transform: (res) => res?.data?.data || res?.data || [] },
  )

  const { data: openData, loading, refresh: refreshOpen } = useSmartFetch(
    userId ? `dash-hr-open-${userId}` : null,
    () => rrfApi.getOpenForHiring(),
    {
      ttl: CACHE_TTL.LIST,
      transform: (res) => {
        const data = res?.data || res || []
        return Array.isArray(data)
          ? data.map((rrf) => ({
              id: rrf.id,
              rrfNumber: rrf.rrfNumber || rrf.subId,
              displayId: rrf.rrfNumber || rrf.subId,
              role: rrf.jobTitle || rrf.positionTitle || '-',
              project: rrf.projectName || '-',
              positions: rrf.numberOfPositions || rrf.headcount || 1,
              priority: rrf.priority || 'Medium',
              status: rrf.status,
              date: new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB'),
            }))
          : []
      },
    },
  )

  const handleRefresh = useCallback(() => {
    refreshAll()
    refreshOpen()
  }, [refreshAll, refreshOpen])

  useVisibilityRefresh(handleRefresh, { intervalMs: 60_000 })

  const openPositions = openData || []

  const closedStats = useMemo(() => {
    const rrfs = allRrfs || []
    const closedRrfs = rrfs.filter((r) => (r.status || '').toUpperCase() === 'CLOSED')
    return {
      positionsFilled: closedRrfs.reduce((sum, r) => sum + (r.headcount || r.numberOfPositions || 0), 0),
      closedRequests: closedRrfs.length,
    }
  }, [allRrfs])

  const recentRequests = useMemo(() => {
    if (!searchTerm) return openPositions
    const s = searchTerm.toLowerCase()
    return openPositions.filter(
      (r) =>
        (r.rrfNumber || '').toLowerCase().includes(s) ||
        (r.role || '').toLowerCase().includes(s) ||
        (r.project || '').toLowerCase().includes(s) ||
        (r.priority || '').toLowerCase().includes(s),
    )
  }, [openPositions, searchTerm])

  const statCards = [
    { title: 'Open for Hiring', value: openPositions.length, subtitle: 'Active positions', icon: <FolderOpenOutlined />, color: 'green', view: 'open-for-hiring' },
    { title: 'Closed Requests', value: closedStats.closedRequests, subtitle: 'All time', icon: <CloseCircleOutlined />, color: 'gray', view: 'closed' },
    { title: 'Positions Filled', value: closedStats.positionsFilled, subtitle: 'Total filled', icon: <CheckCircleOutlined />, color: 'cyan' },
  ]

  const columns = [
    { key: 'rrfNumber', header: 'ID', type: 'id' },
    { key: 'role', header: 'Role', className: 'font-medium text-gray-900' },
    { key: 'project', header: 'Project', className: 'text-gray-600' },
    { key: 'positions', header: 'Positions', type: 'positions' },
    { key: 'priority', header: 'Priority', type: 'priority' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'date', header: 'Approved Date', type: 'date' },
  ]

  return { statCards, columns, data: recentRequests, loading, refresh: handleRefresh, tableTitle: 'Open for Hiring Positions' }
}

// ── Admin Dashboard Section ──

function AdminDashboard({ searchTerm }) {
  const { user } = useAuth()
  const userId = user?.id

  const { data: statistics, loading: statsLoading, refresh: refreshStats } = useSmartFetch(
    userId ? `dash-admin-stats-${userId}` : null,
    () => rrfApi.getStatistics(true),
    { ttl: CACHE_TTL.STATS, transform: (res) => (res?.success ? res.data : res?.data || null) },
  )

  const { data: users, loading: usersLoading, refresh: refreshUsers } = useSmartFetch(
    userId ? `dash-admin-users-${userId}` : null,
    () => usersApi.getAll(),
    { ttl: CACHE_TTL.LIST, transform: (res) => res?.data || [] },
  )

  const { data: recentRaw, loading: recentLoading, refresh: refreshRecent } = useSmartFetch(
    userId ? `dash-admin-recent-${userId}` : null,
    () => rrfApi.getAll({ limit: 5 }),
    {
      ttl: CACHE_TTL.LIST,
      transform: (res) => {
        const rrfs = res?.data?.data || res?.data || []
        return Array.isArray(rrfs)
          ? rrfs.slice(0, 5).map((rrf) => ({
              id: rrf.id,
              displayId: rrf.rrfNumber || rrf.subId,
              role: rrf.positionTitle || '-',
              manager: rrf.createdBy?.fullName || '-',
              project: rrf.projectName || '-',
              positions: rrf.headcount || 1,
              priority: rrf.priority || 'Medium',
              status: rrf.status,
              date: new Date(rrf.createdAt).toLocaleDateString('en-GB'),
            }))
          : []
      },
    },
  )

  const refreshAll = useCallback(() => {
    refreshStats()
    refreshUsers()
    refreshRecent()
  }, [refreshStats, refreshUsers, refreshRecent])

  useVisibilityRefresh(refreshAll, { intervalMs: 60_000 })

  const loading = (statsLoading && !statistics) || (usersLoading && !users) || (recentLoading && !recentRaw)

  const byStatus = statistics?.byStatus || {}
  const inProgressCount = (byStatus['in-progress'] || 0) + (byStatus['open-for-hiring'] || 0)

  const recentRequests = useMemo(() => {
    const base = recentRaw || []
    if (!searchTerm) return base
    const s = searchTerm.toLowerCase()
    return base.filter(
      (r) =>
        (r.displayId || '').toLowerCase().includes(s) ||
        (r.manager || '').toLowerCase().includes(s) ||
        (r.role || '').toLowerCase().includes(s) ||
        (r.project || '').toLowerCase().includes(s) ||
        (r.status || '').toLowerCase().includes(s),
    )
  }, [recentRaw, searchTerm])

  // Admin stat cards link directly to admin routes, not workflow views
  const statCards = [
    { title: 'Total RRFs', value: statistics?.total || 0, subtitle: 'All time', icon: <FileTextOutlined />, color: 'blue', href: '/admin/rrf-management' },
    { title: 'Pending', value: byStatus.pending || 0, subtitle: 'Awaiting approval', icon: <ClockCircleOutlined />, color: 'orange', href: '/admin/rrf-management?status=pending' },
    { title: 'Approved', value: byStatus.approved || 0, subtitle: 'Ready to hire', icon: <CheckCircleOutlined />, color: 'green', href: '/admin/rrf-management?status=approved' },
    { title: 'In Progress', value: inProgressCount, subtitle: 'Open for hiring', icon: <SyncOutlined />, color: 'cyan', href: '/admin/rrf-management?status=in-progress' },
    { title: 'Closed', value: byStatus.closed || 0, subtitle: 'Completed requests', icon: <CloseCircleOutlined />, color: 'purple', href: '/admin/rrf-management?status=closed' },
    { title: 'Total Users', value: Array.isArray(users) ? users.length : 0, subtitle: 'Active accounts', icon: <TeamOutlined />, color: 'red', href: '/admin/users' },
  ]

  const columns = [
    { key: 'displayId', header: 'ID', type: 'id' },
    { key: 'manager', header: 'Requester', className: 'font-medium text-gray-900' },
    { key: 'role', header: 'Role', className: 'font-medium text-gray-900' },
    { key: 'project', header: 'Project', className: 'text-gray-600' },
    { key: 'positions', header: 'Positions', type: 'positions' },
    { key: 'priority', header: 'Priority', type: 'priority' },
    { key: 'status', header: 'Status', type: 'status' },
    { key: 'date', header: 'Created', type: 'date' },
  ]

  return { statCards, columns, data: recentRequests, loading, refresh: refreshAll, tableTitle: 'Recent RRFs' }
}

// ── Main Dashboard Page ──

export default function DashboardPage() {
  const { user, roleCode, isAdmin, isPMO, isApprover, isHR, isHiringManager, canCreateRRF } = useRoleDetection()
  const [searchTerm, setSearchTerm] = useState('')

  // All five dashboard hooks must be called unconditionally (Rules of Hooks).
  // Only the active role's data is used; the others are ignored.
  const hmDash = HiringManagerDashboard({ searchTerm })
  const approverDash = ApproverDashboard({ searchTerm })
  const pmoDash = PMODashboard({ searchTerm })
  const hrDash = HRDashboard({ searchTerm })
  const adminDash = AdminDashboard({ searchTerm })

  // Pick the active dashboard based on role — ADMIN is a first-class type
  const activeDash = isAdmin ? adminDash : isPMO ? pmoDash : isApprover ? approverDash : isHR ? hrDash : hmDash

  const { statCards, columns, data, loading, refresh, tableTitle } = activeDash

  // Determine grid layout based on number of stat cards
  const gridCols =
    statCards.length <= 3
      ? 'grid-cols-2 lg:grid-cols-3'
      : statCards.length <= 5
        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6'

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      {/* Stat Cards */}
      <div className={`grid ${gridCols} gap-3 md:gap-5`}>
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={String(card.value)}
            subtitle={card.subtitle}
            icon={card.icon}
            color={card.color}
            href={card.href || (card.view ? `/workflow?view=${card.view}` : undefined)}
          />
        ))}
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white overflow-hidden border border-gray-200 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="px-4 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900 flex-shrink-0">{tableTitle}</h3>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onReload={refresh}
            loading={loading}
            className="flex-1"
          />
          {canCreateRRF && (
            <Link href="/workflow/create" className="flex-shrink-0">
              <button
                className="px-3 md:px-4 py-2.5 text-white text-sm font-medium hover:scale-105 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}
              >
                <PlusOutlined />
                Create RRF
              </button>
            </Link>
          )}
        </div>

        <RRFTable
          columns={columns}
          data={data}
          loading={loading}
          searchTerm={searchTerm}
          emptyMessage="No recent activity"
          renderActions={(row) => (
            <ActionButton
              role={roleCode}
              status={row.status}
              href={`/requests/${row.id}`}
            />
          )}
        />
      </div>
    </div>
  )
}
