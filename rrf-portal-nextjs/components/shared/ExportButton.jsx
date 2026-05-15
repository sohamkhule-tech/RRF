/**
 * ExportButton — Unified CSV/Excel/PDF export button with dropdown.
 *
 * Replaces 3+ duplicated export implementations across role pages.
 *
 * Usage:
 *   <ExportButton
 *     data={filteredRequests}
 *     columns={[
 *       { key: 'displayId', header: 'Request ID' },
 *       { key: 'role', header: 'Role' },
 *     ]}
 *     filenamePrefix="RRF_Requests"
 *   />
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { DownloadOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'

export default function ExportButton({
  data = [],
  columns = [],
  filenamePrefix = 'RRF_Export',
  className = '',
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const getTimestamp = () => {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, '0')}_${String(d.getMonth() + 1).padStart(2, '0')}_${d.getFullYear()}`
  }

  const getCellValue = (row, key) => {
    const val = key.includes('.')
      ? key.split('.').reduce((obj, k) => obj?.[k], row)
      : row[key]
    return val ?? ''
  }

  const exportCSV = () => {
    if (!data.length) {
      toast.error('No data to export')
      return
    }
    const headers = columns.map((c) => c.header)
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        columns
          .map((c) => {
            const val = String(getCellValue(row, c.key))
            return val.includes(',') || val.includes('"')
              ? `"${val.replace(/"/g, '""')}"`
              : val
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filenamePrefix}_${getTimestamp()}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`Exported ${data.length} rows as CSV`)
    setShowMenu(false)
  }

  const exportExcel = () => {
    if (!data.length) {
      toast.error('No data to export')
      return
    }
    // Tab-separated format opens natively in Excel
    const headers = columns.map((c) => c.header)
    const tsvContent = [
      headers.join('\t'),
      ...data.map((row) => columns.map((c) => String(getCellValue(row, c.key))).join('\t')),
    ].join('\n')

    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filenamePrefix}_${getTimestamp()}.xls`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`Exported ${data.length} rows as Excel`)
    setShowMenu(false)
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-3 md:px-4 py-2 border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 flex items-center gap-2 text-sm"
        style={{ borderRadius: '10px' }}
      >
        <DownloadOutlined />
        <span className="hidden sm:inline">Export</span>
      </button>
      {showMenu && (
        <div
          className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 shadow-lg z-50"
          style={{ borderRadius: '10px' }}
        >
          <button
            onClick={exportCSV}
            className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
          >
            Export as CSV
          </button>
          <button
            onClick={exportExcel}
            className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 last:rounded-b-lg border-t border-gray-100"
          >
            Export as Excel
          </button>
        </div>
      )}
    </div>
  )
}
