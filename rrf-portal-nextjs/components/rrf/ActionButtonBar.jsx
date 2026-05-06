'use client'

/**
 * ActionButtonBar
 *
 * Smart action bar for the Unified ViewRRF page.
 *
 * Grouping rules:
 *   - Approver actions (approve / decline / hold) present
 *       → single "Actions ▼" dropdown [Edit*, Approve*, Decline*, On Hold*]
 *       → shown ONLY when status is PENDING or ON-HOLD (resolver already gates this)
 *   - PMO actions (openForHiring present)
 *       → single "Actions ▼" dropdown [Open for Hiring*, Close RRF*]
 *   - Admin with both sets → all items merged into one dropdown
 *   - HR / HM (no approval or PMO group)
 *       → individual standalone buttons (Submit, Edit, Close)
 *
 * Edit is a navigation link — handled by parent via onAction('edit').
 * Print / Export PDF are always individual buttons.
 *
 * Props:
 *   actions  {Object}   — Eligibility flags from resolveActions()
 *   onAction {Function} — Called with the action key string
 */

import { useState, useRef, useEffect } from 'react'
import {
  EditOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  PauseOutlined,
  UnlockOutlined,
  LockOutlined,
  PrinterOutlined,
  DownloadOutlined,
  DownOutlined,
} from '@ant-design/icons'

export function ActionButtonBar({ actions = {}, onAction }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // ── Determine grouping mode ─────────────────────────────────────────────

  // Approver mode: user can approve / decline / hold → these plus edit go into dropdown
  const hasApproverActions = !!(actions.canApprove || actions.canDecline || actions.canHold)

  // PMO mode: user can open-for-hiring → openForHiring + close go into dropdown
  const hasPMOActions = !!(actions.canOpenForHiring)

  // ── Build dropdown items list ───────────────────────────────────────────

  const dropdownItems = []

  if (hasApproverActions) {
    // Approver (or Admin) dropdown
    if (actions.canEdit) {
      dropdownItems.push({
        key: 'edit',
        label: 'Edit Request',
        icon: <EditOutlined />,
        style: 'default',
      })
    }
    if (actions.canApprove) {
      dropdownItems.push({
        key: 'approve',
        label: 'Approve',
        icon: <CheckOutlined />,
        style: 'success',
      })
    }
    if (actions.canDecline) {
      dropdownItems.push({
        key: 'decline',
        label: 'Decline',
        icon: <CloseOutlined />,
        style: 'danger',
      })
    }
    if (actions.canHold) {
      dropdownItems.push({
        key: 'hold',
        label: 'Put On Hold',
        icon: <PauseOutlined />,
        style: 'warning',
      })
    }
    // Admin also gets PMO actions in the same dropdown
    if (actions.canOpenForHiring) {
      dropdownItems.push({
        key: 'openForHiring',
        label: 'Open for Hiring',
        icon: <UnlockOutlined />,
        style: 'default',
      })
    }
    if (actions.canClose) {
      dropdownItems.push({
        key: 'close',
        label: 'Close RRF',
        icon: <LockOutlined />,
        style: 'default',
      })
    }
  } else if (hasPMOActions) {
    // PMO dropdown
    if (actions.canOpenForHiring) {
      dropdownItems.push({
        key: 'openForHiring',
        label: 'Open for Hiring',
        icon: <UnlockOutlined />,
        style: 'success',
      })
    }
    if (actions.canClose) {
      dropdownItems.push({
        key: 'close',
        label: 'Close RRF',
        icon: <LockOutlined />,
        style: 'default',
      })
    }
  }

  // Item style classes
  const itemStyleClasses = {
    default: 'text-slate-700 hover:bg-slate-50',
    success: 'text-green-700 hover:bg-green-50',
    danger:  'text-red-600 hover:bg-red-50',
    warning: 'text-amber-700 hover:bg-amber-50',
  }

  const handleDropdownClick = (key) => {
    setOpen(false)
    onAction(key)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">

      {/* ── "Actions ▼" Dropdown — Approver or PMO ─── */}
      {dropdownItems.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-md select-none"
          >
            <span>Actions</span>
            <DownOutlined
              className="text-xs"
              style={{
                transition: 'transform 0.15s',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {open && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              {dropdownItems.map((item, idx) => (
                <button
                  key={item.key}
                  onClick={() => handleDropdownClick(item.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors ${itemStyleClasses[item.style]}`}
                >
                  <span className="opacity-70">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Standalone buttons — HR / HM (no dropdown) ─── */}
      {!hasApproverActions && !hasPMOActions && (
        <>
          {actions.canEdit && (
            <button
              onClick={() => onAction('edit')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-bold rounded-lg transition-all flex items-center gap-2 shadow-md"
            >
              <EditOutlined />
              <span className="hidden sm:inline">Edit Request</span>
            </button>
          )}

          {actions.canSubmit && (
            <button
              onClick={() => onAction('submit')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 font-bold rounded-lg transition-all flex items-center gap-2 shadow-md"
            >
              <SendOutlined />
              <span className="hidden sm:inline">Submit for Approval</span>
            </button>
          )}

          {actions.canClose && (
            <button
              onClick={() => onAction('close')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-md"
            >
              <LockOutlined />
              <span className="hidden sm:inline">Close RRF</span>
            </button>
          )}
        </>
      )}

      {/* ── Universal Actions — always visible ─── */}
      <button
        onClick={() => onAction('print')}
        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-all flex items-center gap-2"
      >
        <PrinterOutlined />
        <span className="hidden sm:inline">Print</span>
      </button>

      <button
        onClick={() => onAction('exportPdf')}
        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-all flex items-center gap-2"
      >
        <DownloadOutlined />
        <span className="hidden sm:inline">Export PDF</span>
      </button>

    </div>
  )
}

