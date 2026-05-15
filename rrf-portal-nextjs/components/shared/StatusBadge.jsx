/**
 * StatusBadge — Unified status badge component.
 *
 * Replaces 10+ local `getStatusBadge()` functions duplicated across
 * role-specific pages. Single source of truth for status → label + color.
 *
 * Usage:
 *   <StatusBadge status="approved" />
 *   <StatusBadge status="pending" size="sm" />
 */

const STATUS_CONFIG = {
  draft:              { label: 'Draft',            bg: '#f3f4f6', color: '#6b7280' },
  pending:            { label: 'Pending Approval', bg: '#fef3c7', color: '#92400e' },
  submitted:          { label: 'Pending Approval', bg: '#fef3c7', color: '#92400e' },
  approved:           { label: 'Approved',         bg: '#dcfce7', color: '#166534' },
  declined:           { label: 'Declined',         bg: '#fee2e2', color: '#991b1b' },
  rejected:           { label: 'Declined',         bg: '#fee2e2', color: '#991b1b' },
  'on-hold':          { label: 'On Hold',          bg: '#fef3c7', color: '#b45309' },
  'in-progress':      { label: 'In Progress',      bg: '#dbeafe', color: '#1e40af' },
  'open-for-hiring':  { label: 'Open for Hiring',  bg: '#dbeafe', color: '#1e40af' },
  'open_for_hiring':  { label: 'Open for Hiring',  bg: '#dbeafe', color: '#1e40af' },
  closed:             { label: 'Closed',           bg: '#f3f4f6', color: '#374151' },
  'closed-by-bench':  { label: 'Filled (Bench)',   bg: '#d1fae5', color: '#065f46' },
}

const SIZE_STYLES = {
  sm: { padding: '4px 8px',  fontSize: '11px' },
  md: { padding: '6px 12px', fontSize: '12px' },
  lg: { padding: '8px 16px', fontSize: '13px' },
}

export default function StatusBadge({ status, size = 'md', className = '' }) {
  const key = String(status || 'draft').toLowerCase()
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.draft

  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md

  return (
    <span
      className={`font-medium whitespace-nowrap ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: '999px',
        ...sizeStyle,
      }}
    >
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
