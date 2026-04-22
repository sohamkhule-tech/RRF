'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  PrinterOutlined, 
  DownloadOutlined,
  BuildOutlined,
  UserOutlined,
  ToolOutlined,
  FileTextOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import { useRRFDetail } from '@/hooks/useRRFDetail'
import { useApproverRequests } from '@/hooks/useApproverRequests'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import InfoField from '@/components/InfoField'

export default function ApproverViewRRFPage() {
  const params = useParams()
  const router = useRouter()
  const rrfId = params.id
  const { hasPermission } = usePermission()
  
  // Fetch RRF details from backend
  const { rrf, loading: rrfLoading, error: rrfError, refresh } = useRRFDetail(rrfId)
  const { approveRequest, rejectRequest, putOnHold } = useApproverRequests()
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'approve', 'decline', 'onhold'
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Section navigation state
  const [activeSection, setActiveSection] = useState('requisition')
  
  // Section definitions
  const sections = [
    { id: 'requisition', label: 'Requisition Info', icon: <BuildOutlined className="text-lg" /> },
    { id: 'position', label: 'Position Details', icon: <UserOutlined className="text-lg" /> },
    { id: 'technical', label: 'Technical Requirements', icon: <ToolOutlined className="text-lg" /> },
    { id: 'description', label: 'Job Description', icon: <FileTextOutlined className="text-lg" /> }
  ]

  // Map raw API data — no || 'N/A' fallbacks; InfoField handles empty values
  const rrfData = rrf ? {
    id: rrf.id,
    displayId: rrf.rrfNumber || rrf.subId,
    submittedDate: rrf.submittedAt ? new Date(rrf.submittedAt).toLocaleDateString('en-GB') : null,
    status: rrf.status === 'pending' ? 'Pending Approval' : rrf.status,
    managerName:      rrf.createdBy?.fullName || 'Unknown',
    entity:           rrf.entity,
    organisation:     rrf.organisation,
    function:         rrf.function,
    subFunction:      rrf.subFunction,
    department:       rrf.department,
    requisitionType:  rrf.requisitionType,
    customerName:     rrf.customerName,
    projectName:      rrf.projectName,
    jobTitle:         rrf.positionTitle,
    billingStartDate: rrf.expectedStartDate ? new Date(rrf.expectedStartDate).toLocaleDateString('en-GB') : null,
    positionType:       rrf.positionType,
    employmentType:     rrf.employmentType,
    workMode:           rrf.workMode,
    numberOfPositions:  rrf.headcount,
    priorityLevel:      rrf.priority,
    jobLocation:        rrf.location ? [rrf.location] : null,
    minimumExperience:  rrf.experienceMin && rrf.experienceMax ? `${rrf.experienceMin}-${rrf.experienceMax} years` : null,
    requiredSkills:  rrf.requiredSkills,
    preferredSkills: rrf.preferredSkills,
    primaryTechnologies: rrf.technologies,
    jobDescription:  rrf.jobDescription,
    additionalNotes: rrf.urgencyReason,
  } : null

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

  const handleCancelModal = () => {
    setShowModal(false)
    setReason('')
  }

  const handleConfirmAction = async () => {
    // Validate inputs
    if (modalType === 'decline' && !reason.trim()) {
      toast.error('Please provide a reason for declining')
      return
    }
    if (modalType === 'onhold' && !reason.trim()) {
      toast.error('Please provide a reason for putting on hold')
      return
    }

    setIsSubmitting(true)

    try {
      let result
      
      if (modalType === 'approve') {
        result = await approveRequest(rrfId, reason || 'Approved by approver')
      } else if (modalType === 'decline') {
        result = await rejectRequest(rrfId, reason)
      } else if (modalType === 'onhold') {
        result = await putOnHold(rrfId, reason)
      }

      if (result?.success) {
        setShowModal(false)
        setReason('')
        // Wait a bit for the toast to show, then navigate back
        setTimeout(() => router.push('/approver'), 1000)
      } else if (result?.error) {
        // approveRequest/rejectRequest/putOnHold already call toast.error internally
        // so just close the submitting state, no extra toast needed
        console.error('[Approver Action] Failed:', result.error)
      }
    } catch (error) {
      console.error('[Approver Action] Unexpected error:', error)
      toast.error(error.message || 'Failed to process action. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  
  // Loading state
  if (rrfLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <LoadingSpinner message="Loading RRF details..." />
      </div>
    )
  }
  
  // Error state
  if (rrfError || !rrfData) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <ErrorMessage 
          message={rrfError || 'RRF not found'} 
          onRetry={refresh} 
        />
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async () => {
    const mainContainer = document.querySelector('.min-h-screen')
    const content = document.querySelector('.rrf-content-area')
    if (!content || !mainContainer) return
    
    // Store original overflow style
    const originalOverflow = content.style.overflow
    
    // Temporarily show all sections and allow full height
    mainContainer.classList.add('exporting-pdf')
    content.style.overflow = 'visible'
    content.style.height = 'auto'
    
    // Wait for DOM to update and layout to settle
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const canvas = await html2canvas(content, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
      height: content.scrollHeight,
      windowHeight: content.scrollHeight
    })
    
    // Restore original state
    mainContainer.classList.remove('exporting-pdf')
    content.style.overflow = originalOverflow
    content.style.height = ''
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    
    // If content is too long, split into multiple pages
    let position = 0
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    if (pdfHeight > pageHeight) {
      while (position < pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight)
        position += pageHeight
        if (position < pdfHeight) {
          pdf.addPage()
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    }
    
    pdf.save(`${rrfData.displayId}.pdf`)
    toast.success('PDF exported successfully!')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Print Styles */}
      <style jsx global>{`
        @media screen {
          .screen-hidden {
            display: none !important;
          }
          .print-header {
            display: none !important;
          }
          .exporting-pdf .screen-hidden {
            display: block !important;
          }
          .exporting-pdf .print-header {
            display: block !important;
          }
          .exporting-pdf .no-print {
            display: none !important;
          }
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .screen-hidden {
            display: block !important;
          }
          .print-section {
            display: block !important;
            page-break-inside: avoid;
            margin-bottom: 30px;
          }
          .print-header {
            display: block !important;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #cbd5e1;
          }
          body {
            background: white !important;
          }
          .rrf-content-area {
            overflow: visible !important;
            height: auto !important;
          }
          .flex.h-screen {
            height: auto !important;
          }
          .overflow-y-auto {
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Split Panel Layout */}
      <div className="flex flex-col md:flex-row h-screen">
        
        {/* LEFT PANEL - Dynamic Summary & Timeline */}
        <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:overflow-y-auto no-print">
          {/* Header */}
          <div className="p-4 md:p-6 bg-gradient-to-br from-slate-700 to-slate-800 text-white">
            <div className="space-y-3">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight leading-tight">{rrfData.jobTitle}</h1>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-lg">
                {rrfData.status}
              </div>
              <div className="text-xs text-slate-300 font-medium space-y-1">
                <div>{rrfData.displayId}</div>
                <div>Requested on: {rrfData.submittedDate}</div>
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
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${
                      activeSection === section.id
                        ? 'bg-white/20'
                        : 'bg-slate-100'
                    }`}>
                      {section.icon}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">{section.label}</span>
                  </button>
                  {index < sections.length - 1 && (
                    <div className="hidden md:block w-px h-4 bg-slate-300 ml-9 my-0.5"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Data Grid Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Top Action Bar */}
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-4">
              <Link href="/approver">
                <button className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 border border-slate-300">
                  <ArrowLeftOutlined className="text-lg" />
                  <span className="font-medium">Back</span>
                </button>
              </Link>
              <h2 className="text-xl font-bold text-slate-800">RRF Details</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <button 
                onClick={handlePrint}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-all flex items-center gap-2"
              >
                <PrinterOutlined />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-slate-700 text-white hover:bg-slate-800 font-medium rounded-lg transition-all flex items-center gap-2"
              >
                <DownloadOutlined />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              
              <div className="hidden sm:block w-px h-8 bg-slate-300 mx-2"></div>

              {/* Action buttons area — behaviour depends on status */}
              {/* Edit button: visible for PENDING and DECLINED (Approver can edit both) */}
              {(rrf?.status === 'pending' || rrf?.status === 'declined' || rrf?.status === 'rejected') && hasPermission(PERMISSIONS.APPROVALS.APPROVE) && (
                <Link href={`/approver/edit-rrf/${rrfId}`}>
                  <button className="px-4 py-2 bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-lg transition-all">
                    Edit
                  </button>
                </Link>
              )}

              {/* Workflow action buttons: ONLY show when RRF is still pending — avoids 403 on already-actioned RRFs */}
              {rrf?.status === 'pending' ? (
                <>
                  {/* Decline Button */}
                  {hasPermission(PERMISSIONS.APPROVALS.REJECT) && (
                    <button
                      onClick={handleDecline}
                      className="px-4 py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-all"
                    >
                      Decline
                    </button>
                  )}
                  {/* On Hold Button */}
                  {hasPermission(PERMISSIONS.APPROVALS.APPROVE) && (
                    <button
                      onClick={handleOnHold}
                      className="px-4 py-2 bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold rounded-lg transition-all"
                    >
                      On Hold
                    </button>
                  )}
                  {/* Approve Button */}
                  {hasPermission(PERMISSIONS.APPROVALS.APPROVE) && (
                    <button
                      onClick={handleApprove}
                      className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      Approve
                    </button>
                  )}
                </>
              ) : (
                /* Read-only status badge for already-actioned RRFs */
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                  rrf?.status === 'approved'   ? 'bg-green-50 text-green-700 border-green-200' :
                  rrf?.status === 'declined'   ? 'bg-red-50 text-red-700 border-red-200' :
                  rrf?.status === 'rejected'   ? 'bg-red-50 text-red-700 border-red-200' :
                  rrf?.status === 'on-hold'    ? 'bg-amber-50 text-amber-700 border-amber-200' :
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
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-white rrf-content-area">
            <div className="p-4 md:p-8">
              
              {/* Print Header - Only visible when printing */}
              <div className="print-header">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{rrfData.jobTitle}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>{rrfData.displayId}</span>
                  <span>•</span>
                  <span>Submitted: {rrfData.submittedDate}</span>
                  <span>•</span>
                  <span className="font-semibold text-amber-600">{rrfData.status}</span>
                </div>
              </div>

              {/* Requisition Info Section */}
              <div className={`space-y-8 print-section ${activeSection === 'requisition' ? '' : 'screen-hidden'}`}>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">Requisition Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoField label="Requisition Manager" value={rrfData.managerName} />
                  <InfoField label="Entity"              value={rrfData.entity} />
                  <InfoField label="Organisation"        value={rrfData.organisation} />
                  <InfoField label="Function"            value={rrfData.function} />
                  <InfoField label="Sub-function"        value={rrfData.subFunction} />
                  <InfoField label="Department"          value={rrfData.department} />
                  <InfoField label="Requisition Type"    value={rrfData.requisitionType} />
                  <InfoField label="Customer Name"       value={rrfData.customerName} />
                  <InfoField label="Project Name"        value={rrfData.projectName} />
                  <InfoField label="Billing Start Date"  value={rrfData.billingStartDate} />
                </div>
              </div>

              {/* Position Details Section */}
              <div className={`space-y-8 print-section ${activeSection === 'position' ? '' : 'screen-hidden'}`}>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">Position Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoField label="Position Type"       value={rrfData.positionType} />
                  <InfoField label="Employment Type"       value={rrfData.employmentType} />
                  <InfoField label="Work Mode"       value={rrfData.workMode} />
                  <InfoField label="Number of Positions" value={rrfData.numberOfPositions} />
                  {rrfData.priorityLevel && (
                    <div className="bg-[#E3F2FD] rounded-lg p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Priority Level</p>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                        rrfData.priorityLevel === 'High'     ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        rrfData.priorityLevel === 'Critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                        rrfData.priorityLevel === 'Medium'   ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>{rrfData.priorityLevel}</span>
                    </div>
                  )}
                  <InfoField label="Job Location"        value={rrfData.jobLocation} />
                  <InfoField label="Experience Required"  value={rrfData.minimumExperience} />
                </div>
              </div>

              {/* Technical Requirements Section */}
              <div className={`space-y-8 print-section ${activeSection === 'technical' ? '' : 'screen-hidden'}`}>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">Technical Requirements</h3>
                <div className="space-y-4">
                  <InfoField label="Primary Technologies" value={rrfData.primaryTechnologies} rich />
                  <InfoField label="Must-Have Skills"     value={rrfData.requiredSkills}  rich />
                  <InfoField label="Nice-to-Have Skills"  value={rrfData.preferredSkills} rich />
                </div>
              </div>

              {/* Job Description Section */}
              <div className={`space-y-8 print-section ${activeSection === 'description' ? '' : 'screen-hidden'}`}>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">Job Description</h3>
                <div className="space-y-4">
                  <InfoField label="Job Description" value={rrfData.jobDescription} rich />
                  <InfoField label="Additional Notes" value={rrfData.additionalNotes} rich />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Professional Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slideIn">
            {/* Modal Header */}
            <div className={`p-4 md:p-6 ${
              modalType === 'approve' ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-b-2 border-emerald-200' :
              modalType === 'decline' ? 'bg-gradient-to-br from-red-50 to-rose-50 border-b-2 border-red-200' :
              'bg-gradient-to-br from-amber-50 to-orange-50 border-b-2 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
                  modalType === 'approve' ? 'bg-emerald-100 text-emerald-600' :
                  modalType === 'decline' ? 'bg-red-100 text-red-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {modalType === 'approve' && <CheckCircleOutlined className="text-2xl" />}
                  {modalType === 'decline' && <CloseCircleOutlined className="text-2xl" />}
                  {modalType === 'onhold' && <span className="text-2xl">⏸️</span>}
                </div>
                <h3 className={`text-xl md:text-2xl font-bold tracking-tight ${
                  modalType === 'approve' ? 'text-emerald-900' :
                  modalType === 'decline' ? 'text-red-900' :
                  'text-amber-900'
                }`}>
                  {modalType === 'approve' && 'Approve Request'}
                  {modalType === 'decline' && 'Decline Request'}
                  {modalType === 'onhold' && 'Put On Hold'}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 space-y-4">
              {modalType === 'approve' ? (
                <div className="space-y-4">
                  <p className="text-gray-700 text-base leading-relaxed font-medium">
                    Are you sure you want to approve this requisition request?
                  </p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-emerald-800 font-medium">
                      ✓ This action will send the request to PMO for further processing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                    {modalType === 'decline' ? 'Reason for Declining' : 'Reason for Putting on Hold'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a detailed reason..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all duration-200 min-h-[140px] resize-none text-gray-900 font-medium leading-relaxed"
                    autoFocus
                  />
                  <p className="text-xs text-gray-600 font-medium">
                    💡 This reason will be shared with the hiring manager.
                  </p>
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
                  modalType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  modalType === 'decline' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {modalType === 'approve' && 'Confirm Approval'}
                    {modalType === 'decline' && 'Confirm Decline'}
                    {modalType === 'onhold' && 'Confirm On Hold'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
