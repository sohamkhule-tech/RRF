/**
 * Unified Workflow Page
 *
 * Single page that replaces 18+ role-specific list pages.
 * Reads `?view=xxx` from URL to determine which data/columns to show.
 * Uses shared components from components/shared/.
 *
 * STRANGLER PATTERN: This page coexists with old role-folder pages.
 * Old routes are NOT modified or deleted.
 *
 * Routes:
 *   /workflow              → default view based on user role
 *   /workflow?view=my-requests
 *   /workflow?view=pending-approval
 *   /workflow?view=all
 *   /workflow?view=open-positions
 *   /workflow?view=open-for-hiring
 *   /workflow?view=closed
 *   /workflow?view=drafts
 *   etc.
 */

'use client'

import { useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PlusOutlined } from '@ant-design/icons'
import Link from 'next/link'

import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import ProtectedRoute from '@/components/ProtectedRoute'
import ActionButton from '@/components/ActionButton'
import { SearchBar, PageHeader, RRFTable, FilterBar, ExportButton } from '@/components/shared'
import WorkflowTabs from '@/components/shared/WorkflowTabs'
import { VIEW_CONFIGS, getTabsForRole, getDefaultView, getRoleKey } from '@/lib/workflowViewConfig'

// Data source hooks
import { useMyRequests } from '@/hooks/useMyRequests'
import { rrfApi, formatRrfListForDisplay, formatRrfForDisplay } from '@/lib/api/rrfApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { CACHE_TTL } from '@/lib/apiCache'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// ── Data source hooks by type ──

function useDataSource(type, params = {}) {
  const { user } = useAuth()
  const userId = user?.id

  // my-requests (HM submitted requests, excludes drafts)
  const myReqs = useMyRequests()

  // pending-approvals (approver queue)
  const pendingKey = userId ? `workflow-pending-${userId}` : null
  const pending = useSmartFetch(
    type === 'pending-approvals' ? pendingKey : null,
    () => rrfApi.getPendingApprovals(),
    { ttl: CACHE_TTL.LIST, transform: (d) => d || [] },
  )

  // approver-list (status-filtered)
  const approverKey = userId ? `workflow-approver-${userId}-${params.status || 'all'}` : null
  const approverList = useSmartFetch(
    type === 'approver-list' ? approverKey : null,
    () => rrfApi.getAll({ status: params.status, limit: 1000 }),
    {
      ttl: CACHE_TTL.LIST,
      transform: (res) => (res?.success ? formatRrfListForDisplay(res.data || []) : []),
    },
  )

  // all-rrfs (PMO master list)
  const allKey = userId ? `workflow-all-${userId}` : null
  const allRrfs = useSmartFetch(
    type === 'all-rrfs' || type === 'my-requests-drafts' ? allKey : null,
    () => rrfApi.getAll({ limit: 1000 }),
    {
      ttl: CACHE_TTL.LIST,
      transform: (res) => (res?.success ? formatRrfListForDisplay(res.data || []) : []),
    },
  )

  // open-positions (PMO)
  const openPosKey = userId ? `workflow-open-pos-${userId}` : null
  const openPos = useSmartFetch(
    type === 'open-positions' ? openPosKey : null,
    () => rrfApi.getOpenPositions(),
    {
      ttl: CACHE_TTL.LIST,
      transform: (response) => {
        const rrfs = response?.data || response || []
        return Array.isArray(rrfs)
          ? rrfs.map((rrf) => ({
              id: rrf.id,
              rrfNumber: rrf.rrfNumber || rrf.subId,
              displayId: rrf.rrfNumber || rrf.subId,
              role: rrf.positionTitle || '-',
              positionTitle: rrf.positionTitle,
              manager: rrf.createdBy?.fullName || '-',
              project: rrf.projectName || '-',
              department: rrf.department,
              positions: rrf.headcount || 1,
              headcount: rrf.headcount || 1,
              priority: rrf.priority || 'Medium',
              status: rrf.status,
              approvedAt: rrf.approvedAt,
              date: rrf.approvedAt
                ? new Date(rrf.approvedAt).toLocaleDateString('en-GB')
                : '-',
            }))
          : []
      },
    },
  )

  // open-for-hiring (HR)
  const openHiringKey = userId ? `workflow-open-hiring-${userId}` : null
  const openHiring = useSmartFetch(
    type === 'open-for-hiring' ? openHiringKey : null,
    () => rrfApi.getOpenForHiring(),
    {
      ttl: CACHE_TTL.LIST,
      transform: (response) => {
        const rrfs = response?.data || response || []
        return Array.isArray(rrfs)
          ? rrfs.map((rrf) => ({
              id: rrf.id,
              rrfNumber: rrf.rrfNumber || rrf.subId,
              displayId: rrf.rrfNumber || rrf.subId,
              role: rrf.positionTitle || rrf.jobTitle || '-',
              positionTitle: rrf.positionTitle,
              subFunction: rrf.subFunction,
              project: rrf.projectName || '-',
              positions: rrf.headcount || rrf.numberOfPositions || 1,
              headcount: rrf.headcount || 1,
              priority: rrf.priority || 'Medium',
              status: rrf.status,
              approvedAt: rrf.approvedAt,
              date: rrf.sentToHrAt
                ? new Date(rrf.sentToHrAt).toLocaleDateString('en-GB')
                : '-',
            }))
          : []
      },
    },
  )

  // all-rrfs-pmo: like all-rrfs but also preserves closeReason for PMO close-reason filter tabs
  const allRrfsPMOKey = userId ? `workflow-all-pmo-${userId}` : null
  const allRrfsPMO = useSmartFetch(
    type === 'all-rrfs-pmo' ? allRrfsPMOKey : null,
    () => rrfApi.getAll({ limit: 1000 }),
    {
      ttl: CACHE_TTL.LIST,
      transform: (res) => {
        if (!res?.success) return []
        return (res.data || []).map((rrf) => ({
          ...formatRrfForDisplay(rrf),
          closeReason: rrf.closeReason || null,
        }))
      },
    },
  )

  // allMyRequests is always returned so useTabCounts can compute HM tab counts
  // without an extra network call (myReqs is always fetched unconditionally above).
  const allMyRequests = myReqs.requests

  switch (type) {
    case 'my-requests':
      return { data: myReqs.requests, loading: myReqs.loading, refresh: myReqs.refresh, allMyRequests }
    case 'my-requests-drafts':
      return { data: allRrfs.data || [], loading: allRrfs.loading, refresh: allRrfs.refresh, allMyRequests }
    case 'pending-approvals':
      return { data: pending.data || [], loading: pending.loading, refresh: pending.refresh, allMyRequests }
    case 'approver-list':
      return { data: approverList.data || [], loading: approverList.loading, refresh: approverList.refresh, allMyRequests }
    case 'all-rrfs':
      return { data: allRrfs.data || [], loading: allRrfs.loading, refresh: allRrfs.refresh, allMyRequests }
    case 'all-rrfs-pmo':
      return { data: allRrfsPMO.data || [], loading: allRrfsPMO.loading, refresh: allRrfsPMO.refresh, allMyRequests }
    case 'open-positions':
      return { data: openPos.data || [], loading: openPos.loading, refresh: openPos.refresh, allMyRequests }
    case 'open-for-hiring':
      return { data: openHiring.data || [], loading: openHiring.loading, refresh: openHiring.refresh, allMyRequests }
    default:
      return { data: [], loading: false, refresh: () => {}, allMyRequests }
  }
}

// ── Tab Count Hook ──
// Computes/fetches record counts for every tab so the count badge updates live.
// Uses the same cache keys as the dashboard pages — warm-cache hit on first render
// after a dashboard visit, background fetch on cold start.

function useTabCounts({ roleCode, userId, allMyRequests, roleTabs }) {
  // Approver — statistics byStatus is cheaper than loading each tab’s full list
  const approverByStatus = useSmartFetch(
    roleCode === 'APPROVER' && userId ? `statistics-${userId}-true` : null,
    () => rrfApi.getStatistics(true),
    { ttl: CACHE_TTL.STATS, transform: (res) => (res?.success ? res.data?.byStatus || {} : {}) },
  )

  // PMO — dashboard stats endpoint returns all 7 bucket counts in one call
  const pmoDashStats = useSmartFetch(
    roleCode === 'PMO' && userId ? `pmo-dashboard-stats-${userId}` : null,
    () => rrfApi.getPMODashboardStats(),
    {
      ttl: CACHE_TTL.STATS,
      transform: (res) => {
        const d = res?.data || res || {}
        return {
          total:            d.totalProcessed || 0,
          openPositions:    d.openedPositions || 0,
          openForHiring:    d.sentToHR || 0,
          closed:           d.closed || 0,
          hiredExternally:  d.closedByReason?.RESOURCE_HIRED_EXTERNAL || 0,
          sourcedInternally:d.closedByReason?.SOURCED_INTERNALLY || 0,
          closedByBusiness: d.closedByReason?.CLOSED_BY_BUSINESS || 0,
        }
      },
    },
  )

  // HR open-for-hiring — same cache key as the workflow open-for-hiring fetch
  const hrOpenList = useSmartFetch(
    roleCode === 'HR' && userId ? `workflow-open-hiring-${userId}` : null,
    () => rrfApi.getOpenForHiring(),
    { ttl: CACHE_TTL.LIST, transform: (res) => res?.data || res || [] },
  )

  // HR closed count — same cache key as the workflow all-rrfs fetch
  const hrAllRrfs = useSmartFetch(
    roleCode === 'HR' && userId ? `workflow-all-${userId}` : null,
    () => rrfApi.getAll({ limit: 1000 }),
    { ttl: CACHE_TTL.LIST, transform: (res) => (res?.success ? formatRrfListForDisplay(res.data || []) : []) },
  )

  return useMemo(() => {
    const counts = {}

    if (roleCode === 'HM' || !roleCode) {
      // HM: all tabs share one data source — count by applying each tab’s statusFilter
      const base = (allMyRequests || []).filter((r) => (r.status || '').toLowerCase() !== 'draft')
      for (const tab of roleTabs) {
        counts[tab.key] = tab.statusFilter
          ? base.filter((r) => tab.statusFilter.includes((r.status || '').toLowerCase())).length
          : base.length // 'all' tab has no statusFilter
      }
    } else if (roleCode === 'APPROVER') {
      const by = approverByStatus.data || {}
      counts['pending-approval'] = (by['pending'] || 0) + (by['submitted'] || 0)
      counts['approved']         = by['approved'] || 0
      counts['declined']         = (by['declined'] || 0) + (by['rejected'] || 0)
      counts['on-hold']          = (by['on-hold'] || 0) + (by['onHold'] || 0)
      counts['closed']           = (by['closed'] || 0) + (by['closedByBench'] || 0)
    } else if (roleCode === 'PMO') {
      const s = pmoDashStats.data || {}
      counts['total-processed']     = s.total
      counts['open-positions']      = s.openPositions
      counts['pmo-open-for-hiring'] = s.openForHiring
      counts['sourced-internally']  = s.sourcedInternally
      counts['closed-by-business']  = s.closedByBusiness
      counts['closed']              = s.hiredExternally  // 'closed' tab shows only Hired Externally
    } else if (roleCode === 'HR') {
      const openList = hrOpenList.data
      counts['open-for-hiring'] = Array.isArray(openList) ? openList.length : undefined
      const allData = hrAllRrfs.data || []
      if (allData.length > 0) {
        counts['closed'] = allData.filter((r) =>
          ['closed', 'closed-by-bench'].includes((r.status || '').toLowerCase()),
        ).length
      }
    }

    return counts
  }, [roleCode, roleTabs, allMyRequests, approverByStatus.data, pmoDashStats.data, hrOpenList.data, hrAllRrfs.data])
}

// ── Inner content (needs Suspense for useSearchParams) ──

function WorkflowContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { canCreateRRF } = usePermission()

  // ── Role-scoped tabs — no cross-role leakage ──
  const roleTabs = useMemo(() => getTabsForRole(user), [user])

  // Active tab resolved from URL param; falls back to first tab for the role
  const viewParam = searchParams.get('view')
  const activeTab = useMemo(
    () => roleTabs.find((t) => t.key === viewParam) || roleTabs[0],
    [roleTabs, viewParam],
  )

  // View config drives columns, data source, and export options
  const viewConfig = VIEW_CONFIGS[activeTab?.viewConfigKey]

  // Fetch data for the active view config
  const { data: rawData, loading, refresh, allMyRequests } = useDataSource(
    viewConfig?.dataSourceType || 'my-requests',
    viewConfig?.dataSourceParams || {},
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [subFunctionFilter, setSubFunctionFilter] = useState('')

  // roleKey is normalized to a ROLE_TABS key (HM / APPROVER / PMO / HR / ADMIN)
  // roleCode retains the raw value for ActionButton (expects 'PMO', 'HR', 'APPROVER', etc.)
  const roleKey  = useMemo(() => getRoleKey(user), [user])
  const roleCode = String(user?.role?.code || user?.role || '').toUpperCase()
  const userId = user?.id

  // Tab counts — drives live count badges beside each tab label
  const tabCounts = useTabCounts({ roleCode: roleKey, userId, allMyRequests, roleTabs })
  const tabsWithCounts = useMemo(
    () => roleTabs.map((tab) => ({ ...tab, count: tabCounts[tab.key] })),
    [roleTabs, tabCounts],
  )

  // 1. VIEW_CONFIG base filter — supports rowFilter(full row) or statusFilter(status string)
  const baseFilteredData = useMemo(() => {
    if (viewConfig?.rowFilter) return (rawData || []).filter(viewConfig.rowFilter)
    if (viewConfig?.statusFilter) return (rawData || []).filter((item) => viewConfig.statusFilter(item.status?.toLowerCase()))
    return rawData || []
  }, [rawData, viewConfig])

  // 2. Tab-level status filter — handles HM status tabs (pending, approved, in-progress, etc.)
  const tabFilteredData = useMemo(() => {
    if (!activeTab?.statusFilter) return baseFilteredData
    const allowed = activeTab.statusFilter
    return baseFilteredData.filter((item) =>
      allowed.includes((item.status || '').toLowerCase()),
    )
  }, [baseFilteredData, activeTab])

  // 3. Dropdown filters (department, subFunction)
  const dropdownFilteredData = useMemo(() => {
    let result = tabFilteredData
    if (departmentFilter) result = result.filter((r) => r.department === departmentFilter)
    if (subFunctionFilter) result = result.filter((r) => r.subFunction === subFunctionFilter)
    return result
  }, [tabFilteredData, departmentFilter, subFunctionFilter])

  // 4. Search filter
  const filteredData = useMemo(() => {
    if (!searchTerm) return dropdownFilteredData
    const s = searchTerm.toLowerCase()
    return dropdownFilteredData.filter(
      (r) =>
        (r.displayId || '').toLowerCase().includes(s) ||
        (r.rrfNumber || '').toLowerCase().includes(s) ||
        (r.role || r.positionTitle || '').toLowerCase().includes(s) ||
        (r.project || r.projectName || '').toLowerCase().includes(s) ||
        (r.manager || r.createdBy?.fullName || '').toLowerCase().includes(s) ||
        (r.priority || '').toLowerCase().includes(s) ||
        (r.department || '').toLowerCase().includes(s) ||
        (r.subFunction || '').toLowerCase().includes(s),
    )
  }, [dropdownFilteredData, searchTerm])

  // Dynamic dropdown filter configs (built from live data)
  const filterConfigs = useMemo(() => {
    const configs = []
    if (viewConfig?.filters?.includes('department')) {
      const departments = [...new Set(baseFilteredData.map((r) => r.department).filter(Boolean))].sort()
      if (departments.length > 0) {
        configs.push({
          key: 'department',
          label: 'Department',
          value: departmentFilter,
          onChange: setDepartmentFilter,
          options: departments,
        })
      }
    }
    if (viewConfig?.filters?.includes('subFunction')) {
      const subs = [...new Set(baseFilteredData.map((r) => r.subFunction).filter(Boolean))].sort()
      if (subs.length > 0) {
        configs.push({
          key: 'subFunction',
          label: 'Sub Function',
          value: subFunctionFilter,
          onChange: setSubFunctionFilter,
          options: subs,
        })
      }
    }
    return configs
  }, [viewConfig, baseFilteredData, departmentFilter, subFunctionFilter])

  const exportColumns = useMemo(() => {
    if (!viewConfig?.columns) return []
    return viewConfig.columns.map((col) => ({ key: col.key, header: col.header }))
  }, [viewConfig])

  // Tab change: reset local filters and navigate
  const handleTabChange = useCallback(
    (key) => {
      setSearchTerm('')
      setDepartmentFilter('')
      setSubFunctionFilter('')
      router.push(`/workflow?view=${key}`)
    },
    [router],
  )

  if (!viewConfig) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No workflow view available for your role.</p>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredPermission={viewConfig.permission}>
      <div className="p-4 md:p-6 lg:p-8 space-y-5">
        {/* Page Header — title tracks the active tab, not the static viewConfig */}
        <PageHeader
          title={activeTab?.pageTitle || viewConfig.title}
          subtitle={activeTab?.pageSubtitle || viewConfig.description}
          actions={
            <>
              {canCreateRRF && (
                <Link href="/workflow/create">
                  <button
                    className="px-3 md:px-4 py-2 text-white text-sm font-medium hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}
                  >
                    <PlusOutlined />
                    Create RRF
                  </button>
                </Link>
              )}
              {viewConfig.enableExport && (
                <ExportButton data={filteredData} columns={exportColumns} filenamePrefix="RRF_Export" />
              )}
            </>
          }
        />

        {/* Single-level role-scoped tabs with live count badges */}
        <WorkflowTabs
          tabs={tabsWithCounts}
          activeTab={activeTab?.key}
          onTabChange={handleTabChange}
        />

        {/* Search + Filters */}
        <div className="bg-white overflow-hidden border border-gray-200 shadow-sm" style={{ borderRadius: '16px' }}>
          <div className="px-4 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              onReload={refresh}
              loading={loading}
              className="flex-1"
            />
            <FilterBar filters={filterConfigs} />
          </div>

          {/* Data Table */}
          <RRFTable
            columns={viewConfig.columns}
            data={filteredData}
            loading={loading}
            searchTerm={searchTerm}
            emptyMessage={`No ${viewConfig.title.toLowerCase()} found`}
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
    </ProtectedRoute>
  )
}

// ── Page Export (Suspense boundary for useSearchParams) ──

export default function WorkflowPage() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingSpinner message="Loading workflow..." /></div>}>
      <WorkflowContent />
    </Suspense>
  )
}
