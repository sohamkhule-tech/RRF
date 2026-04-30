'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { reportsApi } from '@/lib/api/reportsApi'

// ─── Icons (inline SVG to avoid dependency) ─────────────────────────────────

const IconRevenue = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
)
const IconClock = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
)
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
)
const IconX = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
)
const IconTimer = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
)
const IconBack = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
)
const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
)
const IconSearch = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
)

// ─── Column Configs per KPI ─────────────────────────────────────────────────

const COLUMNS = {
  'revenue-loss': [
    { key: 'rrfNumber', label: 'RRF ID' },
    { key: 'customerName', label: 'Client Name' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'headcount', label: 'Positions' },
    { key: 'billingRate', label: 'Billing Rate', format: 'currency' },
    { key: 'billingStartDate', label: 'Billing Start Date', format: 'date' },
    { key: 'revenueDelayDays', label: 'Revenue Delay Days' },
    { key: 'revenueLoss', label: 'Revenue Loss', format: 'currency' },
    { key: 'status', label: 'Status', format: 'status' },
  ],
  'avg-delay': [
    { key: 'rrfNumber', label: 'RRF ID' },
    { key: 'customerName', label: 'Client Name' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'headcount', label: 'Positions' },
    { key: 'expectedOnboardingDate', label: 'Expected Onboarding Date', format: 'date' },
    { key: 'delayDays', label: 'Delay Days' },
    { key: 'status', label: 'Status', format: 'status' },
  ],
  'sourced-internally': [
    { key: 'rrfNumber', label: 'RRF ID' },
    { key: 'customerName', label: 'Client Name' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'headcount', label: 'Positions' },
    { key: 'candidateName', label: 'Candidate Name' },
    { key: 'joiningDate', label: 'Date of Fulfillment', format: 'date' },
    { key: 'internalRrfNo', label: 'Internal RRF No' },
    { key: 'closedByName', label: 'Closed By' },
    { key: 'closeReason', label: 'Closure Reason', format: 'reason' },
  ],
  'opportunity-lost': [
    { key: 'rrfNumber', label: 'RRF ID' },
    { key: 'customerName', label: 'Client Name' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'headcount', label: 'Positions' },
    { key: 'billingRate', label: 'Billing Rate', format: 'currency' },
    { key: 'closedAt', label: 'Closed At', format: 'date' },
    { key: 'closedByName', label: 'Closed By' },
    { key: 'closeReason', label: 'Closure Reason', format: 'reason' },
    { key: 'notes', label: 'Notes / Remarks' },
  ],
  'avg-closing-time': [
    { key: 'rrfNumber', label: 'RRF ID' },
    { key: 'customerName', label: 'Client Name' },
    { key: 'projectName', label: 'Project Name' },
    { key: 'headcount', label: 'Positions' },
    { key: 'candidateName', label: 'Candidate Name' },
    { key: 'sentToHrAt', label: 'Opened At', format: 'date' },
    { key: 'joiningDate', label: 'Joining Date', format: 'date' },
    { key: 'closingTimeDays', label: 'Closing Time (Days)' },
    { key: 'closedByName', label: 'Closed By' },
  ],
}

// Columns shown when no KPI card is active (custom / free-filter mode)
COLUMNS['custom'] = [
  { key: 'rrfNumber', label: 'RRF ID' },
  { key: 'customerName', label: 'Client Name' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'headcount', label: 'Positions' },
  { key: 'status', label: 'Status', format: 'status' },
  { key: 'closeReason', label: 'Closure Reason', format: 'reason' },
  { key: 'closedAt', label: 'Closed At', format: 'date' },
  { key: 'closedByName', label: 'Closed By' },
]

const KPI_LABELS = {
  'revenue-loss': 'Revenue Loss Alert',
  'avg-delay': 'Avg Delay',
  'sourced-internally': 'Sourced Internally',
  'opportunity-lost': 'Opportunity Lost',
  'avg-closing-time': 'Avg Closing Time',
  'custom': 'Filtered Results',
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatDate(val) {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function formatCurrency(val) {
  if (val === null || val === undefined) return '—'
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatStatus(val) {
  if (!val) return '—'
  const map = { 'in-progress': 'In Progress', 'closed': 'Closed' }
  return map[val] || val
}

function formatReason(val) {
  if (!val) return '—'
  const map = {
    RESOURCE_HIRED_EXTERNAL: 'Resource Hired (External)',
    SOURCED_INTERNALLY: 'Sourced Internally',
    CLOSED_BY_BUSINESS: 'Closed by Business',
  }
  return map[val] || val
}

function formatCell(val, format) {
  if (format === 'date') return formatDate(val)
  if (format === 'currency') return formatCurrency(val)
  if (format === 'status') return formatStatus(val)
  if (format === 'reason') return formatReason(val)
  if (val === null || val === undefined) return '—'
  return String(val)
}

// ─── CSV Export Helper ───────────────────────────────────────────────────────

function downloadCSV(rows, columns, filename) {
  const headers = columns.map((c) => c.label)
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      columns.map((col) => {
        const val = formatCell(row[col.key], col.format)
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    ),
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const FULL_REPORT_COLUMNS = [
  { key: 'rrfNumber', label: 'RRF ID' },
  { key: 'status', label: 'Status', format: 'status' },
  { key: 'customerName', label: 'Client Name' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'headcount', label: 'Positions' },
  { key: 'billingRate', label: 'Billing Rate', format: 'currency' },
  { key: 'billingStartDate', label: 'Billing Start Date', format: 'date' },
  { key: 'expectedOnboardingDate', label: 'Expected Onboarding Date', format: 'date' },
  { key: 'candidateName', label: 'Candidate Name' },
  { key: 'sentToHrAt', label: 'Opened At', format: 'date' },
  { key: 'joiningDate', label: 'Joining / Fulfillment Date', format: 'date' },
  { key: 'delayDays', label: 'Delay Days' },
  { key: 'revenueDelayDays', label: 'Revenue Delay Days' },
  { key: 'revenueLoss', label: 'Revenue Loss', format: 'currency' },
  { key: 'closeReason', label: 'Closure Reason', format: 'reason' },
  { key: 'closingTimeDays', label: 'Closing Time' },
  { key: 'closedByName', label: 'Closed By' },
  { key: 'closedAt', label: 'Closed At', format: 'date' },
  { key: 'notes', label: 'Notes' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReportsDashboard({ role }) {
  const router = useRouter()

  // State
  const [kpis, setKpis] = useState(null)
  const [selectedKpi, setSelectedKpi] = useState('revenue-loss')
  const [dataset, setDataset] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [closeReasonFilter, setCloseReasonFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('rrfNumber')
  const [sortOrder, setSortOrder] = useState('DESC')

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false)

  // ─── Fetch KPIs ──────────────────────────────────────────────────────────────

  const fetchKpis = useCallback(async () => {
    try {
      const data = await reportsApi.getKpis()
      setKpis(data)
    } catch (err) {
      console.error('[Reports] KPI fetch error:', err)
      setError('Failed to load KPI data')
    }
  }, [])

  // ─── Fetch Dataset ───────────────────────────────────────────────────────────

  const fetchDataset = useCallback(async () => {
    setTableLoading(true)
    try {
      const params = {
        page,
        limit,
        sortBy,
        sortOrder,
      }

      // Only send the kpi param when a card is explicitly active.
      // When selectedKpi is null (custom / free-filter mode) we rely solely on
      // the general status / closeReason filters so the backend never applies
      // KPI-specific WHERE conditions (e.g. billingStartDate < today).
      if (selectedKpi && selectedKpi !== 'custom') {
        params.kpi = selectedKpi
      }

      if (statusFilter !== 'all') params.status = statusFilter
      if (closeReasonFilter !== 'all') params.closeReason = closeReasonFilter
      if (search.trim()) params.search = search.trim()
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo

      const response = await reportsApi.getDataset(params)
      setDataset(response?.data || [])
      setTotal(response?.total || 0)
    } catch (err) {
      console.error('[Reports] Dataset fetch error:', err)
      setDataset([])
      setTotal(0)
    } finally {
      setTableLoading(false)
    }
  }, [selectedKpi, page, limit, sortBy, sortOrder, statusFilter, closeReasonFilter, search, dateFrom, dateTo])

  // ─── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    fetchKpis().finally(() => setLoading(false))
  }, [fetchKpis])

  useEffect(() => {
    fetchDataset()
  }, [fetchDataset])

  // ─── KPI card click ──────────────────────────────────────────────────────────

  const handleKpiClick = (kpiKey) => {
    setSelectedKpi(kpiKey)
    setPage(1)
    // Auto-apply status filter based on KPI
    if (kpiKey === 'revenue-loss' || kpiKey === 'avg-delay') {
      setStatusFilter('in-progress')
      setCloseReasonFilter('all')
    } else if (kpiKey === 'sourced-internally') {
      setStatusFilter('closed')
      setCloseReasonFilter('SOURCED_INTERNALLY')
    } else if (kpiKey === 'opportunity-lost') {
      setStatusFilter('closed')
      setCloseReasonFilter('CLOSED_BY_BUSINESS')
    } else if (kpiKey === 'avg-closing-time') {
      setStatusFilter('closed')
      setCloseReasonFilter('RESOURCE_HIRED_EXTERNAL')
    }
  }

  // ─── Sort handler ────────────────────────────────────────────────────────────

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(field)
      setSortOrder('DESC')
    }
    setPage(1)
  }

  // ─── Export handlers ─────────────────────────────────────────────────────────

  const handleExportCurrent = async () => {
    setExportOpen(false)
    try {
      const params = {}
      if (selectedKpi && selectedKpi !== 'custom') params.kpi = selectedKpi
      if (statusFilter !== 'all') params.status = statusFilter
      if (closeReasonFilter !== 'all') params.closeReason = closeReasonFilter
      if (search.trim()) params.search = search.trim()
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo

      const data = await reportsApi.exportCurrentView(params)
      const activeKpi = selectedKpi || 'custom'
      const cols = COLUMNS[activeKpi] || COLUMNS['custom']
      downloadCSV(data, cols, `Report_${KPI_LABELS[activeKpi] || 'Custom'}_${new Date().toISOString().split('T')[0]}.csv`)
    } catch (err) {
      console.error('[Reports] Export current error:', err)
    }
  }

  const handleExportFull = async () => {
    setExportOpen(false)
    try {
      const data = await reportsApi.exportFullReport()
      downloadCSV(data, FULL_REPORT_COLUMNS, `Full_Report_${new Date().toISOString().split('T')[0]}.csv`)
    } catch (err) {
      console.error('[Reports] Export full error:', err)
    }
  }

  // ─── Pagination ──────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / limit) || 1

  // ─── Current columns ─────────────────────────────────────────────────────────
  // When no KPI is active (null / 'custom'), fall back to the generic column set.

  const activeKpiKey = selectedKpi || 'custom'
  const columns = useMemo(() => COLUMNS[activeKpiKey] || COLUMNS['custom'], [activeKpiKey])

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (error && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={() => { setError(null); fetchKpis() }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            <IconBack /> Back
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reports</h1>
        </div>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <IconDownload /> Export
            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                <button onClick={handleExportCurrent} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Export Current View
                </button>
                <button onClick={handleExportFull} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Export Full Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          active={selectedKpi === 'revenue-loss'}
          onClick={() => handleKpiClick('revenue-loss')}
          icon={<IconRevenue />}
          title="Revenue Loss Alert"
          value={kpis ? formatCurrency(kpis.revenueLoss.totalLoss) : '—'}
          subtitle={kpis ? `${kpis.revenueLoss.count} position${kpis.revenueLoss.count !== 1 ? 's' : ''} delayed` : ''}
          color="red"
        />
        <KpiCard
          active={selectedKpi === 'avg-delay'}
          onClick={() => handleKpiClick('avg-delay')}
          icon={<IconClock />}
          title="Avg Delay"
          value={kpis ? `${kpis.avgDelay.avgDays} days` : '—'}
          subtitle={kpis ? `${kpis.avgDelay.count} overdue` : ''}
          color="amber"
        />
        <KpiCard
          active={selectedKpi === 'sourced-internally'}
          onClick={() => handleKpiClick('sourced-internally')}
          icon={<IconCheck />}
          title="Sourced Internally"
          value={kpis ? String(kpis.sourcedInternally.count) : '—'}
          subtitle="Internal hires"
          color="green"
        />
        <KpiCard
          active={selectedKpi === 'opportunity-lost'}
          onClick={() => handleKpiClick('opportunity-lost')}
          icon={<IconX />}
          title="Opportunity Lost"
          value={kpis ? String(kpis.opportunityLost.count) : '—'}
          subtitle="Cancelled / closed"
          color="gray"
        />
        <KpiCard
          active={selectedKpi === 'avg-closing-time'}
          onClick={() => handleKpiClick('avg-closing-time')}
          icon={<IconTimer />}
          title="Avg Closing Time"
          value={kpis ? `${kpis.avgClosingTime.avgDays} days` : '—'}
          subtitle={kpis ? `${kpis.avgClosingTime.count} external hire${kpis.avgClosingTime.count !== 1 ? 's' : ''}` : ''}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <IconSearch />
            </div>
            <input
              type="text"
              placeholder="Search RRF ID, Client, Project..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectedKpi(null) }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
              // Manual filter change → leave KPI card mode; query uses only raw filters
              setSelectedKpi(null)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="in-progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>

          {/* Close Reason */}
          <select
            value={closeReasonFilter}
            onChange={(e) => {
              setCloseReasonFilter(e.target.value)
              setPage(1)
              setSelectedKpi(null)
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Reasons</option>
            <option value="RESOURCE_HIRED_EXTERNAL">Resource Hired External</option>
            <option value="SOURCED_INTERNALLY">Sourced Internally</option>
            <option value="CLOSED_BY_BUSINESS">Closed by Business</option>
          </select>

          {/* Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); setSelectedKpi(null) }}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); setSelectedKpi(null) }}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Context table title */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          {KPI_LABELS[selectedKpi || 'custom']} <span className="text-gray-400 font-normal text-sm">({total} record{total !== 1 ? 's' : ''})</span>
        </h2>
      </div>

      {/* Dynamic Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (
                        <span className="text-indigo-600">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : dataset.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                    No records found for this view.
                  </td>
                </tr>
              ) : (
                dataset.map((row, idx) => (
                  <tr key={row.rrfNumber || idx} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {col.key === 'status' ? (
                          <StatusBadge status={row[col.key]} />
                        ) : col.key === 'closeReason' ? (
                          <ReasonBadge reason={row[col.key]} />
                        ) : (
                          formatCell(row[col.key], col.format)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5) p = i + 1
                else if (page <= 3) p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else p = page - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-sm border rounded-md ${p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function KpiCard({ active, onClick, icon, title, value, subtitle, color }) {
  const colorStyles = {
    red: { border: 'border-red-200', activeBg: 'bg-red-50', icon: 'text-red-600 bg-red-100' },
    amber: { border: 'border-amber-200', activeBg: 'bg-amber-50', icon: 'text-amber-600 bg-amber-100' },
    green: { border: 'border-green-200', activeBg: 'bg-green-50', icon: 'text-green-600 bg-green-100' },
    gray: { border: 'border-gray-200', activeBg: 'bg-gray-50', icon: 'text-gray-600 bg-gray-100' },
    blue: { border: 'border-blue-200', activeBg: 'bg-blue-50', icon: 'text-blue-600 bg-blue-100' },
  }

  const cs = colorStyles[color] || colorStyles.blue

  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        active
          ? `${cs.border} ${cs.activeBg} ring-2 ring-offset-1 ring-indigo-400 shadow-md`
          : 'border-gray-200 bg-white hover:shadow-sm hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cs.icon}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{title}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </button>
  )
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400">—</span>
  const styles = {
    'in-progress': 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {formatStatus(status)}
    </span>
  )
}

function ReasonBadge({ reason }) {
  if (!reason) return <span className="text-gray-400">—</span>
  const styles = {
    RESOURCE_HIRED_EXTERNAL: 'bg-green-100 text-green-800',
    SOURCED_INTERNALLY: 'bg-emerald-100 text-emerald-800',
    CLOSED_BY_BUSINESS: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[reason] || 'bg-gray-100 text-gray-700'}`}>
      {formatReason(reason)}
    </span>
  )
}
