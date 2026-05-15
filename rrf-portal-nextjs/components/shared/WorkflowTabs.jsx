/**
 * WorkflowTabs — Tab navigation for workflow views.
 *
 * Renders a horizontal tab bar from a list of view definitions.
 * Active view is controlled via props (URL-synced by parent).
 *
 * Usage:
 *   <WorkflowTabs
 *     tabs={[{ key: 'all', label: 'All Requests', count: 42 }]}
 *     activeTab="all"
 *     onTabChange={(key) => router.push(`/workflow?view=${key}`)}
 *   />
 */

'use client'

export default function WorkflowTabs({ tabs = [], activeTab, onTabChange, className = '' }) {
  if (tabs.length === 0) return null

  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <div className="flex overflow-x-auto scrollbar-hide -mb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200
                ${isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 text-xs font-medium ${
                    isActive ? 'text-indigo-500' : 'text-gray-400'
                  }`}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
