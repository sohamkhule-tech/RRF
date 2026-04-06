/**
 * RichText — safely renders an HTML string from the rich-text editor.
 *
 * Props:
 *  html      {string}  — the raw HTML string to render
 *  className {string}  — extra classes for the wrapper (optional)
 */
export default function RichText({ html, className = '' }) {
  if (!html || html.trim() === '' || html.trim() === 'N/A') return null

  return (
    <div
      className={`prose prose-sm max-w-none leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
