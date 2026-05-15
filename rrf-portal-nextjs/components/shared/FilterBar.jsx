/**
 * FilterBar — Configurable filter dropdown bar.
 *
 * Replaces 6+ hardcoded filter dropdown implementations across pages.
 *
 * Usage:
 *   <FilterBar
 *     filters={[
 *       { key: 'department', label: 'Department', value: dept, onChange: setDept, options: ['IT', 'HR'] },
 *       { key: 'priority', label: 'Priority', value: prio, onChange: setPrio, options: ['Low', 'Medium', 'High', 'Critical'] },
 *     ]}
 *   />
 */

'use client'

export default function FilterBar({ filters = [], className = '' }) {
  if (filters.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {filters.map((filter) => (
        <div key={filter.key} className="relative">
          <select
            value={filter.value || 'all'}
            onChange={(e) => filter.onChange(e.target.value === 'all' ? '' : e.target.value)}
            className="pl-3 pr-8 py-2.5 border-2 border-gray-200 text-sm text-gray-700 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 appearance-none bg-white"
            style={{ borderRadius: '10px', minWidth: '140px' }}
          >
            <option value="all">{filter.label}: All</option>
            {(filter.options || []).map((opt) => {
              const value = typeof opt === 'string' ? opt : opt.value
              const label = typeof opt === 'string' ? opt : opt.label
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            })}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
