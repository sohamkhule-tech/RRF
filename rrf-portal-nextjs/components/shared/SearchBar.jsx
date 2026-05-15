/**
 * SearchBar — Unified search input with optional reload button.
 *
 * Replaces 12+ copy-pasted search UI blocks across role-specific pages.
 *
 * Usage:
 *   <SearchBar value={searchTerm} onChange={setSearchTerm} />
 *   <SearchBar value={searchTerm} onChange={setSearchTerm} onReload={refresh} loading={loading} />
 */

'use client'

import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'

export default function SearchBar({
  value = '',
  onChange,
  onReload,
  loading = false,
  placeholder = 'Search by RRF ID, Role, Project, Priority...',
  className = '',
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchOutlined className="text-gray-400" style={{ fontSize: '18px' }} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300"
          style={{ borderRadius: '10px' }}
        />
      </div>
      {onReload && (
        <button
          onClick={onReload}
          disabled={loading}
          className="px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          style={{ borderRadius: '10px' }}
          title="Refresh data"
        >
          <ReloadOutlined className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Reload</span>
        </button>
      )}
    </div>
  )
}
