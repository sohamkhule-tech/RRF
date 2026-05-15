'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PrinterOutlined,
  DownloadOutlined,
  BuildOutlined,
  UserOutlined,
  ToolOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  HistoryOutlined,
  SendOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import { useRRFDetail } from '@/hooks/useRRFDetail'
import { useApproverRequests } from '@/hooks/useApproverRequests'
import { rrfApi } from '@/lib/api/rrfApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import InfoField from '@/components/InfoField'
import StatusWithDetails from '@/components/StatusWithDetails'
import MaskedDateInput from '@/components/MaskedDateInput'
import RRFContentSections from '@/components/RRFContentSections'

export default function AdminViewRRFPage() {
  const params = useParams()
  const router = useRouter()
  const rrfId = params.id
  const { hasPermission } = usePermission()

  const { rrf, loading, error, refresh } = useRRFDetail(rrfId)
  const { approveRequest, declineRequest, putOnHold } = useApproverRequests()
  
  const [activeSection, setActiveSection] = useState('requisition')
  
  // Modal states for approval actions
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'approve', 'decline', 'onhold', 'openforhiring', 'fillfrombench', 'close'
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // PMO action states
  const [internalRrfNumber, setInternalRrfNumber] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [dateOfJoining, setDateOfJoining] = useState('')
  
  // HR close action states
  const [closeStatus, setCloseStatus] = useState('')

  const sections = [
    { id: 'requisition', label: 'Requisition Info',      icon: <BuildOutlined    className="text-lg" /> },
    { id: 'position',    label: 'Position Details',       icon: <UserOutlined     className="text-lg" /> },
    { id: 'technical',   label: 'Technical Requirements', icon: <ToolOutlined     className="text-lg" /> },
    { id: 'description', label: 'Job Description',        icon: <FileTextOutlined className="text-lg" /> },
  ]

  const rrfData = rrf ? {
    id:              rrf.id,
    displayId:       rrf.rrfNumber || rrf.subId,
    submittedDate:   rrf.submittedAt
      ? new Date(rrf.submittedAt).toLocaleDateString('en-GB')
      : new Date(rrf.createdAt).toLocaleDateString('en-GB'),
    status:          rrf.status === 'pending'          ? 'Pending Approval'
                   : rrf.status === 'approved'         ? 'Approved'
                   : rrf.status === 'rejected'         ? 'Declined'
                   : rrf.status === 'declined'         ? 'Declined'
                   : rrf.status === 'on-hold'          ? 'On Hold'
                   : rrf.status === 'draft'            ? 'Draft'
                   : rrf.status === 'in-progress'      ? 'In Progress'
                   : rrf.status === 'open-for-hiring'  ? 'Open For Hiring'
                   : rrf.status === 'closed'           ? 'Closed'
                   : rrf.status === 'closed-by-bench'  ? 'Closed By Bench'
                   : rrf.status,
    managerName:     rrf.createdBy?.fullName || 'Unknown',
    creatorRole:     rrf.createdBy?.role?.roleName || '—',
    entity:          rrf.entity,
    organisation:    rrf.organisation,
    function:        rrf.function,
    subFunction:     rrf.subFunction,
    department:      rrf.department,
    requisitionType: rrf.requisitionType,
    customerName:    rrf.customerName,
    projectName:     rrf.projectName,
    jobTitle:        rrf.positionTitle,
    billingStartDate: rrf.expectedStartDate
      ? new Date(rrf.expectedStartDate).toLocaleDateString('en-GB')
      : null,
    positionType:    rrf.positionType,
    employmentType:  rrf.employmentType,
    workMode:        rrf.workMode,
    numberOfPositions: rrf.headcount,
    priorityLevel:   rrf.priority,
    jobLocation:     rrf.location ? [rrf.location] : null,
    minimumExperience: rrf.experienceMin && rrf.experienceMax
      ? `${rrf.experienceMin}–${rrf.experienceMax} years`
      : null,
    requiredSkills:  rrf.requiredSkills,
    preferredSkills: rrf.preferredSkills,
    primaryTechnologies: rrf.technologies,
    interviewers:    rrf.interviewers || [],
    jobDescription:  rrf.jobDescription,
    additionalNotes: rrf.urgencyReason,
    declineReason:   rrf.declineReason || rrf.notes || null,
    declinedBy:      rrf.declinedBy?.fullName || null,
    declinedAt:      (() => {
      const ts = rrf.declinedAt || rrf.rejectedAt
      return ts ? new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : null
    })(),
    approvers:       rrf.approvers || [],
    statusHistory:   rrf.statusHistory || [],
  } : null

  if (loading) return <div className="min-h-screen bg-slate-50 p-8"><LoadingSpinner message="Loading RRF details..." /></div>
  if (error || !rrfData) return <div className="min-h-screen bg-slate-50 p-8"><ErrorMessage message={error || 'RRF not found'} onRetry={refresh} /></div>

  const handlePrint = () => window.print()

  const handleExport = async () => {
    const content = document.querySelector('.rrf-content-area')
    if (!content) return
    const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`${rrfData.displayId}.pdf`)
    toast.success('PDF exported successfully!')
  }

  // Action handlers
  const handleApprove = () => {
    setModalType('approve')
    setShowModal(true)
  }

  const handleDecline = () => {
    setModalType('decline')
    setReason('')
    setShowModal(true)
  }

  const handleOnHold = () => {
    setModalType('onhold')
    setReason('')
    setShowModal(true)
  }

  // PMO action handlers
  const handleOpenForHiring = () => {
    setModalType('openforhiring')
    setShowModal(true)
  }

  const handleFillFromBench = () => {
    setModalType('fillfrombench')
    setInternalRrfNumber('')
    setCandidateName('')
    setDateOfJoining('')
    setShowModal(true)
  }

  // HR action handler
  const handleCloseRRF = () => {
    setModalType('close')
    setCloseStatus('')
    setCandidateName('')
    setDateOfJoining('')
    setReason('')
    setShowModal(true)
  }

  const handleCancelModal = () => {
    setShowModal(false)
    setReason('')
    setModalType('')
    setInternalRrfNumber('')
    setCandidateName('')
    setDateOfJoining('')
    setCloseStatus('')
  }

  const handleConfirmAction = async () => {
    // Validate inputs based on modal type
    if (modalType === 'decline' && !reason.trim()) {
      toast.error('Please provide a reason for declining')
      return
    }
    if (modalType === 'onhold' && !reason.trim()) {
      toast.error('Please provide a reason for putting on hold')
      return
    }
    if (modalType === 'fillfrombench') {
      // Internal RRF Number is auto-generated by backend
      if (!candidateName.trim()) {
        toast.error('Please enter candidate name')
        return
      }
      if (!dateOfJoining) {
        toast.error('Please select date of joining')
        return
      }
    }
    if (modalType === 'close') {
      if (!closeStatus) {
        toast.error('Please select a close status')
        return
      }
      if (closeStatus === 'Resource Hired (External Candidate)' || closeStatus === 'Sourced Internally') {
        if (!candidateName.trim()) {
          toast.error('Please enter candidate name')
          return
        }
        if (!dateOfJoining) {
          toast.error('Please select date')
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      let result
      
      if (modalType === 'approve') {
        result = await approveRequest(rrfId, reason || 'Approved')
        toast.success('RRF approved successfully!')
      } else if (modalType === 'decline') {
        result = await declineRequest(rrfId, reason)
        toast.success('RRF declined successfully!')
      } else if (modalType === 'onhold') {
        result = await putOnHold(rrfId, reason)
        toast.success('RRF put on hold successfully!')
      } else if (modalType === 'openforhiring') {
        await rrfApi.openForHiring(rrfId)
        toast.success('RRF opened for hiring successfully!')
        result = { success: true }
      } else if (modalType === 'fillfrombench') {
        const response = await rrfApi.fillByBench(rrfId, `Candidate: ${candidateName}, DOJ: ${dateOfJoining}`)
        const generatedRrfNo = response?.data?.internalRrfNo || 'Auto-Generated'
        toast.success(`Position filled from bench! Internal RRF: ${generatedRrfNo}`)
        result = { success: true }
      } else if (modalType === 'close') {
        await rrfApi.close(rrfId, { candidateName, joiningDate: dateOfJoining, closureStatus: closeStatus, notes: reason })
        toast.success('RRF closed successfully!')
        result = { success: true }
      }

      if (result?.success || modalType === 'openforhiring' || modalType === 'fillfrombench' || modalType === 'close') {
        setShowModal(false)
        handleCancelModal()
        refresh() // Refresh the RRF details
        setTimeout(() => router.push('/admin/rrf-management'), 1000)
      }
    } catch (error) {
      console.error('[Admin Action] Unexpected error:', error)
      toast.error(error.message || error?.response?.data?.message || 'Failed to process action. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Permission checks for all actions
  const canApprove = hasPermission(PERMISSIONS.APPROVALS.APPROVE)
  const canDecline = hasPermission(PERMISSIONS.APPROVALS.REJECT)
  const canOnHold = hasPermission(PERMISSIONS.APPROVALS.ON_HOLD)
  const canUpdate = hasPermission(PERMISSIONS.RRF.UPDATE)
  const canOpenForHiring = hasPermission(PERMISSIONS.RRF.OPEN_FOR_HIRING)
  const canFillFromBench = hasPermission(PERMISSIONS.RRF.FILL_FROM_BENCH)
  const canClose = hasPermission(PERMISSIONS.RRF.CLOSE)
  
  // Status-based checks
  const isPending = rrf?.status === 'pending'
  const isApproved = rrf?.status === 'approved'
  const isInProgress = rrf?.status === 'in-progress' || rrf?.status === 'open-for-hiring'
  
  // Combined permission + status checks
  const showEditButton = canUpdate && ['draft', 'pending', 'declined', 'rejected', 'on-hold'].includes(rrf?.status)
  const showApprovalButtons = isPending && (canApprove || canDecline || canOnHold)
  const showPMOButtons = isApproved && (canOpenForHiring || canFillFromBench)
  const showCloseButton = isInProgress && canClose
  
  // Determine read-only state
  const canTakeAction = canApprove || canDecline || canOnHold || canUpdate || canOpenForHiring || canFillFromBench || canClose
  const isReadOnly = !canTakeAction

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col md:flex-row h-screen">
        {/* ── LEFT PANEL ── */}
        <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:overflow-y-auto no-print">
          <div className="p-4 md:p-6 bg-gradient-to-br from-indigo-800 to-purple-900 text-white">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-1">
                Admin Panel {isReadOnly && '· Read-Only View'}
              </div>
              <h1 className="text-lg md:text-xl font-bold leading-tight">{rrfData.jobTitle}</h1>
              <div className="mt-2">
                <StatusWithDetails
                  status={rrfData.status}
                  reason={rrfData.declineReason}
                  actionBy={rrfData.declinedBy}
                  actionDate={rrfData.declinedAt}
                />
              </div>
              <div className="text-xs text-indigo-300 space-y-1">
                <div>{rrfData.displayId}</div>
                <div>Created on: {rrfData.submittedDate}</div>
                <div>By: {rrfData.managerName} ({rrfData.creatorRole})</div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-3 md:p-6">
            <div className="flex md:flex-col gap-2 md:gap-0 md:space-y-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
              {sections.map((section, index) => (
                <div key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`flex-shrink-0 md:flex-shrink md:w-full flex items-center gap-2 md:gap-4 p-3 md:p-4 rounded-lg transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${
                      activeSection === section.id ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      {section.icon}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-left whitespace-nowrap">{section.label}</span>
                  </button>
                  {index < sections.length - 1 && <div className="hidden md:block w-px h-4 bg-slate-300 ml-9 my-0.5" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/rrf-management')}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all border border-slate-300"
              >
                <ArrowLeftOutlined /> <span className="hidden sm:inline">Back to RRF Management</span><span className="sm:hidden">Back</span>
              </button>
              <h2 className="text-xl font-bold text-slate-800 hidden sm:block">
                RRF Details — <span className="text-indigo-600">{rrfData.displayId}</span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Action buttons based on permissions and RRF status */}
              {canTakeAction && (
                <>
                  {/* Edit Button - shown for editable statuses */}
                  {showEditButton && (
                    <Link href={`/admin/rrf-management/${rrfId}/edit`}>
                      <button className="px-4 py-2 bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-lg transition-all">
                        Edit
                      </button>
                    </Link>
                  )}

                  {/* Approval Actions - for pending RRFs */}
                  {canDecline && isPending && (
                    <button
                      onClick={handleDecline}
                      className="px-4 py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-all"
                    >
                      Decline
                    </button>
                  )}

                  {canOnHold && isPending && (
                    <button
                      onClick={handleOnHold}
                      className="px-4 py-2 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold rounded-lg transition-all"
                    >
                      On Hold
                    </button>
                  )}

                  {canApprove && isPending && (
                    <button
                      onClick={handleApprove}
                      className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      Approve
                    </button>
                  )}

                  {/* PMO Actions - for approved RRFs */}
                  {canFillFromBench && isApproved && (
                    <button
                      onClick={handleFillFromBench}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-semibold rounded-lg transition-all shadow-md"
                    >
                      <CheckCircleOutlined /> Fill from Bench
                    </button>
                  )}

                  {canOpenForHiring && isApproved && (
                    <button
                      onClick={handleOpenForHiring}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-semibold rounded-lg transition-all shadow-md"
                    >
                      <SendOutlined /> Open for Hiring
                    </button>
                  )}

                  {/* HR Actions - for in-progress RRFs */}
                  {canClose && isInProgress && (
                    <button
                      onClick={handleCloseRRF}
                      className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 font-bold rounded-lg transition-all shadow-md"
                    >
                      <CheckCircleOutlined /> Close RRF
                    </button>
                  )}
                  <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1"></div>
                </>
              )}

              {/* Status badge for non-pending RRFs */}
              {rrf?.status !== 'pending' && (
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                  rrf?.status === 'approved'          ? 'bg-green-50 text-green-700 border-green-200' :
                  rrf?.status === 'declined'          ? 'bg-red-50 text-red-700 border-red-200' :
                  rrf?.status === 'rejected'          ? 'bg-red-50 text-red-700 border-red-200' :
                  rrf?.status === 'on-hold'           ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  rrf?.status === 'open-for-hiring'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  rrf?.status === 'closed'            ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {rrf?.status === 'approved'          ? '✓ Approved' :
                   rrf?.status === 'declined'          ? '✗ Declined' :
                   rrf?.status === 'rejected'          ? '✗ Rejected' :
                   rrf?.status === 'on-hold'           ? '⏸ On Hold' :
                   rrf?.status === 'open-for-hiring'   ? '🔓 Open for Hiring' :
                   rrf?.status === 'closed'            ? '✓ Closed' :
                   (rrf?.status || 'Unknown')}
                </span>
              )}
              <button onClick={handlePrint} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-all flex items-center gap-2">
                <PrinterOutlined /> <span className="hidden sm:inline">Print</span>
              </button>
              <button onClick={handleExport} className="px-4 py-2 bg-indigo-700 text-white hover:bg-indigo-800 font-medium rounded-lg transition-all flex items-center gap-2">
                <DownloadOutlined /> <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-white rrf-content-area">
            <div className="p-4 md:p-8">

              <RRFContentSections rrfData={rrfData} activeSection={activeSection} />
            </div>
          </div>
        </div>

      {/* Action Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white max-w-lg w-full shadow-2xl overflow-hidden" 
            style={{ borderRadius: '24px' }}
          >
            {/* Modal Header */}
            <div className={`px-4 md:px-8 py-4 md:py-6 border-b flex items-center justify-between ${
              modalType === 'approve' ? 'bg-emerald-50 border-emerald-100' :
              modalType === 'decline' ? 'bg-red-50 border-red-100' :
              modalType === 'onhold' ? 'bg-amber-50 border-amber-100' :
              modalType === 'openforhiring' ? 'bg-blue-50 border-blue-100' :
              modalType === 'fillfrombench' || modalType === 'close' ? 'bg-green-50 border-green-100' :
              'bg-indigo-50 border-indigo-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  modalType === 'approve' ? 'bg-emerald-100' :
                  modalType === 'decline' ? 'bg-red-100' :
                  modalType === 'onhold' ? 'bg-amber-100' :
                  modalType === 'openforhiring' ? 'bg-blue-100' :
                  modalType === 'fillfrombench' || modalType === 'close' ? 'bg-green-100' :
                  'bg-indigo-100'
                }`}>
                  <span className={`text-xl ${
                    modalType === 'approve' ? 'text-emerald-600' :
                    modalType === 'decline' ? 'text-red-600' :
                    modalType === 'onhold' ? 'text-amber-600' :
                    modalType === 'openforhiring' ? 'text-blue-600' :
                    modalType === 'fillfrombench' || modalType === 'close' ? 'text-green-600' :
                    'text-indigo-600'
                  }`}>
                    {modalType === 'approve' ? '✓' : 
                     modalType === 'decline' ? '✗' : 
                     modalType === 'onhold' ? '⏸' :
                     modalType === 'openforhiring' ? '📤' :
                     modalType === 'fillfrombench' || modalType === 'close' ? '✓' : '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-800">
                    {modalType === 'approve' ? 'Approve RRF' :
                     modalType === 'decline' ? 'Decline RRF' :
                     modalType === 'onhold' ? 'Put On Hold' :
                     modalType === 'openforhiring' ? 'Open for Hiring' :
                     modalType === 'fillfrombench' ? 'Fill from Bench' :
                     modalType === 'close' ? 'Close RRF' : 'Confirm Action'}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    ID: {rrfData.displayId}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-8 pb-6">
              {/* Approval Actions */}
              {modalType === 'approve' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-emerald-800 font-medium">
                    ✓ You are about to approve this RRF. This action will move the requisition forward in the workflow.
                  </p>
                </div>
              )}

              {(modalType === 'decline' || modalType === 'onhold') && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {modalType === 'decline' ? 'Reason for Declining *' : 'Reason for On Hold *'}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={`Enter ${modalType === 'decline' ? 'decline' : 'on hold'} reason...`}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* PMO: Open for Hiring */}
              {modalType === 'openforhiring' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 font-medium">
                    📤 This RRF will be sent to HR for recruitment. The status will change to "Open for Hiring".
                  </p>
                </div>
              )}

              {/* PMO: Fill from Bench */}
              {modalType === 'fillfrombench' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Internal RRF Number
                    </label>
                    <div className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircleOutlined className="text-green-600" />
                        <span className="text-sm font-semibold text-green-700">Auto Generated</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">System will generate format: RRF-INT-XXX (e.g., RRF-INT-001)</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Candidate Name *
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Enter bench resource name"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Date of Joining *
                    </label>
                    <MaskedDateInput
                      value={dateOfJoining}
                      onChange={setDateOfJoining}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* HR: Close RRF */}
              {modalType === 'close' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Closure Status *
                    </label>
                    <select
                      value={closeStatus}
                      onChange={(e) => setCloseStatus(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Select Closure Status --</option>
                      <option value="Resource Hired (External Candidate)">Resource Hired (External Candidate)</option>
                      <option value="Sourced Internally">Sourced Internally</option>
                      <option value="Position Cancelled">Position Cancelled</option>
                      <option value="Budget Constraints">Budget Constraints</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {(closeStatus === 'Resource Hired (External Candidate)' || closeStatus === 'Sourced Internally') && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Candidate Name *
                        </label>
                        <input
                          type="text"
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="Enter candidate name"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          Joining Date *
                        </label>
                        <MaskedDateInput
                          value={dateOfJoining}
                          onChange={setDateOfJoining}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter any additional notes..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 md:px-6 py-4 bg-gray-50 flex gap-3 justify-end border-t border-gray-200">
              <button
                onClick={handleCancelModal}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className={`px-6 py-2.5 text-white font-bold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  modalType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  modalType === 'decline' ? 'bg-red-600 hover:bg-red-700' :
                  modalType === 'onhold' ? 'bg-amber-600 hover:bg-amber-700' :
                  modalType === 'openforhiring' ? 'bg-blue-600 hover:bg-blue-700' :
                  modalType === 'fillfrombench' || modalType === 'close' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? 'Processing...' : (
                  <>
                    {modalType === 'approve' ? '✓ Approve' :
                     modalType === 'decline' ? '✗ Decline' :
                     modalType === 'onhold' ? '⏸ Put On Hold' :
                     modalType === 'openforhiring' ? '📤 Open for Hiring' :
                     modalType === 'fillfrombench' ? '✓ Fill from Bench' :
                     modalType === 'close' ? '✓ Close RRF' : 'Confirm'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
