'use client'

import { useRouter } from 'next/navigation'

/**
 * ActionButton — single, consistent action button for all dashboard tables.
 *
 * Props:
 *  role    {string}  — e.g. "HM" | "APPROVER" | "PMO" | "HR"
 *  status  {string}  — raw RRF status from API
 *  href    {string}  — navigation path on click
 *  onClick {fn}      — optional custom click handler (overrides href)
 *  label   {string}  — optional hard-coded label override
 */
export default function ActionButton({ role, status, href, onClick, label: customLabel }) {
  const router = useRouter()

  const normalizedStatus = status?.toLowerCase()
  const normalizedRole   = role?.toLowerCase()

  const getLabel = () => {
    if (customLabel) return customLabel
    if (
      normalizedRole === 'approver' &&
      (normalizedStatus === 'pending' || normalizedStatus === 'submitted')
    ) return 'Review'
    return 'View RRF'
  }

  const handleClick = () => {
    if (onClick) return onClick()
    if (href)    return router.push(href)
  }

  return (
    <button
      onClick={handleClick}
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
        transition: 'opacity 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {getLabel()}
    </button>
  )
}
