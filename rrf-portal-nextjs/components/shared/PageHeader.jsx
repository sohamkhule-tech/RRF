/**
 * PageHeader — Standardized page header with title, subtitle, and action slots.
 *
 * Replaces inconsistent header patterns across role-specific pages.
 *
 * Usage:
 *   <PageHeader title="Open Positions" subtitle="Awaiting assignment" />
 *   <PageHeader title="My Requests" actions={<button>Create RRF</button>} />
 */

export default function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
