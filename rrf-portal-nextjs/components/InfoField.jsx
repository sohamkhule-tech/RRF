import RichText from './RichText'

/**
 * InfoField — renders a single labelled value tile.
 *
 * Props:
 *  label  {string}   — field label shown in uppercase
 *  value  {*}        — the value to display; tile is hidden when falsy / "N/A"
 *  rich   {boolean}  — when true, value is rendered as HTML via <RichText>
 *  className {string}— extra classes for the outer wrapper (optional)
 *  variant   {"card"|"plain"} — "card" = blue tile (HM/Approver/PMO), "plain" = simple <p> style (HR)
 */
export default function InfoField({
  label,
  value,
  rich = false,
  className = '',
  variant = 'card',
}) {
  // Normalise: treat null, undefined, '', 'N/A' as empty
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && (value.trim() === '' || value.trim() === 'N/A')) ||
    (Array.isArray(value) && value.length === 0)

  if (isEmpty) return null

  // Normalise arrays → comma-separated string (unless rich)
  const displayValue = Array.isArray(value) ? value.join(', ') : value

  if (variant === 'plain') {
    return (
      <div className={className}>
        <p className="text-sm font-semibold text-gray-500 mb-1">{label}</p>
        {rich ? (
          <RichText html={displayValue} className="text-base text-gray-900" />
        ) : (
          <p className="text-base font-medium text-gray-900">{displayValue}</p>
        )}
      </div>
    )
  }

  // Default: card variant
  return (
    <div className={`bg-[#E3F2FD] rounded-lg p-4 shadow-sm ${className}`}>
      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
        {label}
      </p>
      {rich ? (
        <RichText html={displayValue} className="text-sm font-semibold text-slate-900" />
      ) : (
        <p className="text-sm font-semibold text-slate-900">{displayValue}</p>
      )}
    </div>
  )
}
