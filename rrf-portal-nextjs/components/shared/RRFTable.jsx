/**
 * RRFTable — Configurable data table with built-in mobile card view.
 *
 * Replaces 12+ independent table implementations across role-specific pages.
 * Accepts column definitions, data, and optional per-row action rendering.
 *
 * Features:
 * - Configurable columns via definition array
 * - Built-in loading / empty states
 * - Desktop table + mobile card fallback
 * - Per-row action rendering via `renderActions` prop
 * - Uses shared StatusBadge / PriorityBadge for known column types
 *
 * Usage:
 *   <RRFTable
 *     columns={[
 *       { key: 'displayId', header: 'ID', type: 'id' },
 *       { key: 'role', header: 'Role' },
 *       { key: 'priority', header: 'Priority', type: 'priority' },
 *       { key: 'status', header: 'Status', type: 'status' },
 *     ]}
 *     data={filteredRequests}
 *     loading={loading}
 *     emptyMessage="No requests found"
 *     renderActions={(row) => <ActionButton ... />}
 *   />
 */

'use client'

import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import StatusBadge from '@/components/shared/StatusBadge'
import PriorityBadge from '@/components/shared/PriorityBadge'

// ── Helpers ──

function getCellValue(row, key) {
  if (!key) return ''
  return key.includes('.')
    ? key.split('.').reduce((obj, k) => obj?.[k], row)
    : row[key]
}

function renderCell(row, col) {
  // Custom renderer takes priority
  if (col.render) return col.render(getCellValue(row, col.key), row)

  const value = getCellValue(row, col.key)

  switch (col.type) {
    case 'id':
      return (
        <div>
          <span className="font-bold text-indigo-600">{value || '-'}</span>
          {row.internalRrfNo && (
            <div className="text-xs font-semibold text-purple-600 mt-0.5">Internal: {row.internalRrfNo}</div>
          )}
        </div>
      )

    case 'status':
      return <StatusBadge status={value} />

    case 'priority':
      return <PriorityBadge priority={value} />

    case 'positions':
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs border border-indigo-200">
          {value ?? 0}
        </span>
      )

    case 'date':
      if (!value) return <span className="text-gray-400">-</span>
      return (
        <span className="text-gray-600">
          {typeof value === 'string' ? value : new Date(value).toLocaleDateString('en-GB')}
        </span>
      )

    default:
      return <span>{value ?? '-'}</span>
  }
}

// ── Component ──

export default function RRFTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No requests found',
  searchTerm = '',
  renderActions,
  className = '',
  mobileCardFields,
}) {
  // Mobile card field defaults: use first few columns if not specified
  const cardFields = mobileCardFields || {
    id: columns.find((c) => c.type === 'id')?.key || columns[0]?.key,
    title: columns.find((c) => c.key?.includes('role') || c.key?.includes('positionTitle'))?.key || columns[1]?.key,
    subtitle: columns.find((c) => c.key?.includes('project') || c.key?.includes('manager'))?.key,
    positions: columns.find((c) => c.type === 'positions')?.key,
  }

  return (
    <>
      {/* Desktop Table */}
      <div className={`hidden md:block overflow-x-auto ${className}`}>
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider ${
                    col.type === 'positions' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
              {renderActions && (
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <ReloadOutlined className="animate-spin" style={{ fontSize: '32px', color: '#6366f1' }} />
                    <p className="text-sm font-medium">Loading...</p>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((row) => (
                <tr key={row.id} className="transition-all duration-200 hover:bg-gray-50/70">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-5 whitespace-nowrap text-sm ${
                        col.type === 'positions' ? 'text-center' : ''
                      } ${col.type === 'id' ? '' : col.className || 'font-medium text-gray-900'}`}
                    >
                      {renderCell(row, col)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      {renderActions(row)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
                    <p className="text-sm font-medium">
                      {searchTerm ? `No requests found matching "${searchTerm}"` : emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden px-2 pb-4 space-y-3">
        {loading ? (
          <div className="py-8 text-center">
            <ReloadOutlined className="animate-spin text-2xl text-indigo-600" />
          </div>
        ) : data.length > 0 ? (
          data.map((row) => (
            <div key={row.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  {cardFields.id && (
                    <div className="text-xs font-bold text-indigo-600 mb-1">
                      {getCellValue(row, cardFields.id)}
                    </div>
                  )}
                  {cardFields.title && (
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {getCellValue(row, cardFields.title)}
                    </div>
                  )}
                  {cardFields.subtitle && (
                    <div className="text-xs text-gray-500 truncate">
                      {getCellValue(row, cardFields.subtitle)}
                    </div>
                  )}
                </div>
                {cardFields.positions && (
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs ml-2 flex-shrink-0">
                    {getCellValue(row, cardFields.positions)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {row.priority && <PriorityBadge priority={row.priority} size="sm" />}
                {row.status && <StatusBadge status={row.status} size="sm" />}
              </div>
              {renderActions && (
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  {renderActions(row)}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-gray-500">
            <SearchOutlined style={{ fontSize: '32px', color: '#9ca3af' }} />
            <p className="text-sm font-medium mt-2">
              {searchTerm ? `No requests found matching "${searchTerm}"` : emptyMessage}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
