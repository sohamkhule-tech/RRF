/**
 * PriorityBadge — Unified priority badge component.
 *
 * Replaces 12+ local `getPriorityBadge()` functions duplicated across
 * role-specific pages. Single source of truth for priority → color.
 *
 * Usage:
 *   <PriorityBadge priority="High" />
 *   <PriorityBadge priority="Critical" size="sm" />
 */

const PRIORITY_CONFIG = {
  Low:      { bg: '#f3f4f6', color: '#374151' },
  Medium:   { bg: '#dbeafe', color: '#1e40af' },
  High:     { bg: '#fed7aa', color: '#9a3412' },
  Critical: { bg: '#fee2e2', color: '#991b1b' },
}

const SIZE_STYLES = {
  sm: { padding: '4px 8px',  fontSize: '11px' },
  md: { padding: '6px 12px', fontSize: '12px' },
  lg: { padding: '8px 16px', fontSize: '13px' },
}

export default function PriorityBadge({ priority, size = 'md', className = '' }) {
  const label = priority || 'Medium'
  const config = PRIORITY_CONFIG[label] || PRIORITY_CONFIG.Medium

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
      {label}
    </span>
  )
}

export { PRIORITY_CONFIG }
