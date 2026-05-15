'use client'

/**
 * ActionModal
 *
 * Unified modal component that handles all RRF workflow confirmation dialogs.
 * Renders the correct form fields based on `modalType`.
 *
 * Supported modalType values:
 *   'approve'       — optional comments textarea
 *   'decline'       — required reason textarea
 *   'hold'          — required reason textarea
 *   'openForHiring' — confirmation only (no fields)
 *   'close'         — closureStatus dropdown + conditional candidate fields
 *   'submit'        — confirmation only
 *   'resubmit'      — confirmation only
 *
 * Props:
 *   modalType  {string}   — One of the keys above
 *   isOpen     {boolean}
 *   onClose    {Function} — Called when user dismisses modal
 *   onSubmit   {Function} — async (modalType, formData) — throws to keep modal open on error
 *   roleCode   {string}   — e.g. 'PMO' | 'HR' | 'ADMIN' (used to auto-set close notes)
 */

import { useState, useEffect } from 'react'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  UnlockOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import toast from 'react-hot-toast'

const CLOSURE_STATUS_OPTIONS = [
  'Resource Hired (External Candidate)',
  'Sourced Internally',
  'Closed/Cancelled by Business',
]

// Closure statuses that require candidate name + joining date
const HIRING_STATUSES = ['Resource Hired (External Candidate)', 'Sourced Internally']

const MODAL_CONFIG = {
  approve: {
    title: 'Approve Request',
    icon: <CheckCircleOutlined className="text-green-500 text-2xl" />,
    confirmClass: 'bg-green-600 hover:bg-green-700',
    confirmLabel: 'Approve',
  },
  decline: {
    title: 'Decline Request',
    icon: <CloseCircleOutlined className="text-red-500 text-2xl" />,
    confirmClass: 'bg-red-600 hover:bg-red-700',
    confirmLabel: 'Decline',
  },
  hold: {
    title: 'Put on Hold',
    icon: <PauseCircleOutlined className="text-amber-500 text-2xl" />,
    confirmClass: 'bg-amber-500 hover:bg-amber-600',
    confirmLabel: 'Put on Hold',
  },
  openForHiring: {
    title: 'Open for Hiring',
    icon: <UnlockOutlined className="text-teal-500 text-2xl" />,
    confirmClass: 'bg-teal-600 hover:bg-teal-700',
    confirmLabel: 'Open for Hiring',
    body: 'This will open the RRF for HR recruitment. Are you sure you want to proceed?',
  },
  close: {
    title: 'Close RRF',
    icon: <LockOutlined className="text-slate-600 text-2xl" />,
    confirmClass: 'bg-slate-600 hover:bg-slate-700',
    confirmLabel: 'Close RRF',
  },
  submit: {
    title: 'Submit for Approval',
    icon: <ExclamationCircleOutlined className="text-blue-500 text-2xl" />,
    confirmClass: 'bg-blue-600 hover:bg-blue-700',
    confirmLabel: 'Submit',
    body: 'This will submit the RRF for approval. Are you sure you want to proceed?',
  },
  resubmit: {
    title: 'Resubmit for Approval',
    icon: <ExclamationCircleOutlined className="text-blue-500 text-2xl" />,
    confirmClass: 'bg-blue-600 hover:bg-blue-700',
    confirmLabel: 'Resubmit',
    body: 'This will resubmit the RRF for approval. Are you sure you want to proceed?',
  },
}

export function ActionModal({ modalType, isOpen, onClose, onSubmit, roleCode }) {
  const [reason, setReason] = useState('')
  const [closureStatus, setClosureStatus] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form fields whenever the modal opens or switches type
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setClosureStatus('')
      setCandidateName('')
      setJoiningDate('')
      setIsSubmitting(false)
    }
  }, [isOpen, modalType])

  if (!isOpen || !modalType) return null

  const config = MODAL_CONFIG[modalType]
  if (!config) return null

  const isHiringClosure = HIRING_STATUSES.includes(closureStatus)

  // Derive auto-set notes value based on the actor's role
  const getCloseNotes = () => {
    if (roleCode === 'PMO')   return 'Closed via PMO portal'
    if (roleCode === 'HR')    return 'Closed via HR portal'
    return 'Closed by Admin'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Client-side validation
    if (modalType === 'decline' && !reason.trim()) {
      toast.error('Please provide a reason for declining')
      return
    }
    if (modalType === 'hold' && !reason.trim()) {
      toast.error('Please provide a reason for putting on hold')
      return
    }
    if (modalType === 'close') {
      if (!closureStatus) {
        toast.error('Please select a close status')
        return
      }
      if (isHiringClosure) {
        if (!candidateName.trim()) {
          toast.error('Please enter candidate name')
          return
        }
        if (!joiningDate) {
          toast.error('Please enter joining date')
          return
        }
      }
    }

    // Build formData payload for the parent handler
    let formData
    if (modalType === 'close') {
      formData = {
        closureStatus,
        candidateName: isHiringClosure ? candidateName.trim() : '',
        joiningDate:   isHiringClosure ? joiningDate : '',
        notes:         getCloseNotes(),
      }
    } else {
      formData = { reason: reason.trim() }
    }

    setIsSubmitting(true)
    try {
      await onSubmit(modalType, formData)
      // onSubmit is responsible for closing the modal on success
    } catch {
      // Error toast is shown by the parent; keep modal open for retry
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {config.icon}
            <h3 className="text-lg font-bold text-slate-800">{config.title}</h3>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Confirmation-only modals */}
          {config.body && (
            <p className="text-sm text-slate-600">{config.body}</p>
          )}

          {/* Approve: optional comments */}
          {modalType === 'approve' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Add any approval comments..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* Decline: required reason */}
          {modalType === 'decline' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Decline Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain why this RRF is being declined..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* Hold: required reason */}
          {modalType === 'hold' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Hold Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain why this RRF is being put on hold..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* Close RRF: dropdown + conditional candidate fields */}
          {modalType === 'close' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Close Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={closureStatus}
                  onChange={(e) => setClosureStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select closure status...</option>
                  {CLOSURE_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Candidate fields only shown for hiring-related closure statuses */}
              {isHiringClosure && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Candidate Name{closureStatus === 'Sourced Internally' ? '(s)' : ''} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder={closureStatus === 'Sourced Internally' ? "Enter candidate name(s), comma-separated" : "Enter candidate name"}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Joining Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-white font-bold rounded-lg transition-all disabled:opacity-50 ${config.confirmClass}`}
            >
              {isSubmitting ? 'Processing...' : config.confirmLabel}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
