'use client'

/**
 * /drafts — Dedicated Drafts Page
 *
 * Shows only draft RRFs for the current user (HM or PMO who create RRFs).
 * Supports search, reload, and edit actions.
 *
 * Architecture:
 *   - Fetches via rrfApi.getMyRequests() (user-scoped endpoint) and filters to status=draft
 *   - PMO users who create RRFs will also see their own drafts here
 *   - Reuses SearchBar, RRFTable shared components
 *   - Edit action links to /workflow/[id]/edit (unified edit route)
 */

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { rrfApi, formatRrfListForDisplay } from '@/lib/api/rrfApi'
import { useSmartFetch } from '@/lib/useSmartFetch'
import { CACHE_TTL } from '@/lib/apiCache'
import { useVisibilityRefresh } from '@/lib/useVisibilityRefresh'
import { SearchBar, RRFTable } from '@/components/shared'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const DRAFT_COLUMNS = [
  { key: 'displayId', header: 'ID', type: 'id' },
  { key: 'role', header: 'Role', className: 'font-medium text-gray-900' },
  { key: 'project', header: 'Project', className: 'text-gray-600' },
  { key: 'positions', header: 'Positions', type: 'positions' },
  { key: 'priority', header: 'Priority', type: 'priority' },
  { key: 'date', header: 'Last Saved', type: 'date' },
]

export default function DraftsPage() {
  const { user } = useAuth()
  const { canCreateRRF } = usePermission()
  const router = useRouter()
  const userId = user?.id
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch all user's own RRFs (includes drafts — the filter is client-side only in useMyRequests)
  const { data: allRequests, loading, refresh } = useSmartFetch(
    userId ? `drafts-page-${userId}` : null,
    () => rrfApi.getMyRequests(),
    {
      ttl: CACHE_TTL.LIST,
      transform: (response) => {
        if (!response?.success && !Array.isArray(response?.data) && !Array.isArray(response)) return []
        const raw = response?.data || (Array.isArray(response) ? response : [])
        const formatted = formatRrfListForDisplay(raw)
        // Keep ONLY drafts
        return formatted.filter((r) => r.status?.toLowerCase() === 'draft')
      },
    },
  )

  useVisibilityRefresh(refresh, { intervalMs: 60_000 })

  const drafts = useMemo(() => {
    const base = allRequests || []
    if (!searchTerm) return base
    const s = searchTerm.toLowerCase()
    return base.filter(
      (r) =>
        (r.displayId || '').toLowerCase().includes(s) ||
        (r.role || r.positionTitle || '').toLowerCase().includes(s) ||
        (r.project || r.projectName || '').toLowerCase().includes(s) ||
        (r.priority || '').toLowerCase().includes(s),
    )
  }, [allRequests, searchTerm])

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Stat summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${allRequests?.length ?? 0} draft${(allRequests?.length ?? 0) !== 1 ? 's' : ''} saved`}
          </p>
        </div>
        {canCreateRRF && (
          <Link href="/workflow/create">
            <button
              className="px-4 py-2 text-white text-sm font-medium hover:scale-105 transition-all duration-300 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}
            >
              <PlusOutlined />
              Create RRF
            </button>
          </Link>
        )}
      </div>

      {/* Table card */}
      <div className="bg-white overflow-hidden border border-gray-200 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="px-4 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <h3 className="text-lg font-bold text-gray-900 flex-shrink-0">Drafts</h3>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onReload={refresh}
            loading={loading}
            placeholder="Search by ID, Role, Project, Priority…"
            className="flex-1"
          />
        </div>

        {loading ? (
          <div className="p-8">
            <LoadingSpinner message="Loading drafts…" />
          </div>
        ) : (
          <RRFTable
            columns={DRAFT_COLUMNS}
            data={drafts}
            loading={loading}
            searchTerm={searchTerm}
            emptyMessage="No drafts found. Start creating an RRF to save a draft."
            renderActions={(row) => (
              <button
                onClick={() => router.push(`/workflow/${row.id}/edit`)}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  borderRadius: '10px',
                  padding: '8px 20px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <EditOutlined className="mr-1.5" />
                Edit Draft
              </button>
            )}
          />
        )}
      </div>
    </div>
  )
}
