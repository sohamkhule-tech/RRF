'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  PrinterOutlined,
  DownloadOutlined,
  BuildOutlined,
  UserOutlined,
  ToolOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  EditOutlined,
} from '@ant-design/icons'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import { useRRFDetail } from '@/hooks/useRRFDetail'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import InfoField from '@/components/InfoField'
import StatusWithDetails from '@/components/StatusWithDetails'

export default function HMViewRRFPage() {
  const params = useParams()
  const router = useRouter()
  const rrfId = params.id

  const { rrf, loading, error, refresh } = useRRFDetail(rrfId)
  const isPending = rrf?.status === 'pending'
  const isDeclined = rrf?.status === 'declined' || rrf?.status === 'rejected'
  const isOnHold   = rrf?.status === 'on-hold'
  
  const [activeSection, setActiveSection] = useState(
    isPending ? 'approval' : 'requisition'
  )
  
  // Determine editability based on mapped status
  const editableStatuses = ['draft', 'pending approval', 'declined', 'on hold'];
  const isEditable = rrf?.status && ['draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold'].includes(String(rrf.status).toLowerCase());
  
  const sections = [
    ...(isPending
      ? [{ id: 'approval', label: 'Approval Decision', icon: <UserOutlined className="text-lg" /> }]
      : []),
    { id: 'requisition', label: 'Requisition Info',       icon: <BuildOutlined    className="text-lg" /> },
    { id: 'position',    label: 'Position Details',        icon: <UserOutlined     className="text-lg" /> },
    { id: 'technical',   label: 'Technical Requirements',  icon: <ToolOutlined     className="text-lg" /> },
    { id: 'description', label: 'Job Description',         icon: <FileTextOutlined className="text-lg" /> },
  ]

  // Map raw API data — no || 'N/A' fallbacks; InfoField handles empty values
  const rrfData = rrf ? {
    id: rrf.id,
    displayId: rrf.rrfNumber || rrf.subId,
    submittedDate: rrf.submittedAt
      ? new Date(rrf.submittedAt).toLocaleDateString('en-GB')
      : new Date(rrf.createdAt).toLocaleDateString('en-GB'),
    status: rrf.status === 'pending'   ? 'Pending Approval'
          : rrf.status === 'approved'  ? 'Approved'
          : rrf.status === 'rejected'  ? 'Declined'
          : rrf.status === 'declined'  ? 'Declined'
          : rrf.status === 'on-hold'   ? 'On Hold'
          : rrf.status === 'draft'     ? 'Draft'
          : rrf.status,
    managerName:    rrf.createdBy?.fullName || 'Unknown',
    entity:         rrf.entity,
    organisation:   rrf.organisation,
    function:       rrf.function,
    subFunction:    rrf.subFunction,
    department:     rrf.department,
    requisitionType: rrf.requisitionType,
    customerName:   rrf.customerName,
    projectName:    rrf.projectName,
    jobTitle:       rrf.positionTitle,
    billingStartDate: rrf.expectedStartDate
      ? new Date(rrf.expectedStartDate).toLocaleDateString('en-GB')
      : null,
    positionType:       rrf.positionType,
    employmentType:     rrf.employmentType,
    workMode:           rrf.workMode,
    numberOfPositions:  rrf.headcount,
    priorityLevel:      rrf.priority,
    jobLocation:        rrf.location ? [rrf.location] : null,
    minimumExperience:  rrf.experienceMin && rrf.experienceMax
      ? `${rrf.experienceMin}-${rrf.experienceMax} years`
      : null,
    requiredSkills:  rrf.requiredSkills,
    preferredSkills: rrf.preferredSkills,
    jobDescription:  rrf.jobDescription,
    additionalNotes: rrf.urgencyReason,
    // ── Decision fields ─────────────────────────────────────────────
    // declineReason: set by /decline endpoint; fallback to notes (on-hold) or statusHistory
    declineReason:  rrf.declineReason
                      || rrf.notes
                      || rrf.statusHistory?.slice().reverse()
                           .find(e => e.status === 'declined' || e.status === 'rejected' || e.status === 'on-hold')
                           ?.reason
                      || null,
    // declinedBy: set by /decline; fallback to last status-history actor name
    declinedBy:     rrf.declinedBy?.fullName
                      || null,
    // declinedAt: set by /decline; fallback to rejectedAt (older records) or statusHistory entry
    declinedAt:     (() => {
                      const ts = rrf.declinedAt || rrf.rejectedAt
                        || rrf.statusHistory?.slice().reverse()
                             .find(e => e.status === 'declined' || e.status === 'rejected' || e.status === 'on-hold')
                             ?.changedAt
                      return ts
                        ? new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                        : null
                    })(),
    approvers:      rrf.approvers || [],
    statusHistory:  rrf.statusHistory || [],
  } : null

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8"><LoadingSpinner message="Loading RRF details..." /></div>
  }
  if (error || !rrfData) {
    return <div className="min-h-screen bg-slate-50 p-8"><ErrorMessage message={error || 'RRF not found'} onRetry={refresh} /></div>
  }

  const handlePrint = () => window.print()

  const handleExport = async () => {
    const mainContainer = document.querySelector('.min-h-screen')
    const content = document.querySelector('.rrf-content-area')
    if (!content || !mainContainer) return
    const originalOverflow = content.style.overflow
    mainContainer.classList.add('exporting-pdf')
    content.style.overflow = 'visible'
    content.style.height = 'auto'
    await new Promise(resolve => setTimeout(resolve, 300))
    const canvas = await html2canvas(content, {
      scale: 2, logging: false, useCORS: true,
      backgroundColor: '#ffffff',
      height: content.scrollHeight, windowHeight: content.scrollHeight
    })
    mainContainer.classList.remove('exporting-pdf')
    content.style.overflow = originalOverflow
    content.style.height = ''
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    let position = 0
    const pageHeight = pdf.internal.pageSize.getHeight()
    if (pdfHeight > pageHeight) {
      while (position < pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight)
        position += pageHeight
        if (position < pdfHeight) pdf.addPage()
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    }
    pdf.save(`${rrfData.displayId}.pdf`)
    toast.success('PDF exported successfully!')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style jsx global>{`
        @media screen {
          .screen-hidden { display: none !important; }
          .print-header  { display: none !important; }
          .exporting-pdf .screen-hidden { display: block !important; }
          .exporting-pdf .print-header  { display: block !important; }
          .exporting-pdf .no-print      { display: none  !important; }
        }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print      { display: none  !important; }
          .screen-hidden { display: block !important; }
          .print-section { display: block !important; page-break-inside: avoid; margin-bottom: 30px; }
          .print-header  { display: block !important; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #cbd5e1; }
          body { background: white !important; }
          .rrf-content-area { overflow: visible !important; height: auto !important; }
          .flex.h-screen    { height: auto !important; }
          .overflow-y-auto  { overflow: visible !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row h-screen">
        {/* LEFT PANEL */}
        <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:overflow-y-auto no-print">
          <div className="p-4 md:p-6 bg-gradient-to-br from-slate-700 to-slate-800 text-white">
            <div className="space-y-3">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight leading-tight">{rrfData.jobTitle}</h1>
              <div className="mt-2">
                <StatusWithDetails 
                  status={rrfData.status} 
                  reason={rrfData.declineReason} 
                  actionBy={rrfData.declinedBy} 
                  actionDate={rrfData.declinedAt} 
                />
              </div>
              <div className="text-xs text-slate-300 font-medium space-y-1">
                <div>RRF-{rrfData.id}</div>
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
                      activeSection === section.id ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      {section.icon}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">{section.label}</span>
                  </button>
                  {index < sections.length - 1 && (
                    <div className="hidden md:block w-px h-4 bg-slate-300 ml-9 my-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-4">
              <Link href="/hiring-manager/dashboard">
                <button className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 border border-slate-300">
                  <ArrowLeftOutlined className="text-lg" />
                  <span className="font-medium">Back</span>
                </button>
              </Link>
              <h2 className="text-xl font-bold text-slate-800">RRF Details</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {isEditable && (
                <button 
                  onClick={() => router.push(`/hiring-manager/create-rrf?draftId=${rrfData.id}`)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-bold rounded-lg transition-all flex items-center gap-2 shadow-md"
                >
                  <EditOutlined /> <span className="hidden sm:inline">Edit Request</span>
                </button>
              )}
              <button onClick={handlePrint} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-all flex items-center gap-2">
                <PrinterOutlined /> <span className="hidden sm:inline">Print</span>
              </button>
              <button onClick={handleExport} className="px-4 py-2 bg-slate-700 text-white hover:bg-slate-800 font-medium rounded-lg transition-all flex items-center gap-2">
                <DownloadOutlined /> <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white rrf-content-area">
            <div className="p-4 md:p-8">
              <div className="print-header">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{rrfData.jobTitle}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>RRF-{rrfData.id}</span><span>•</span>
                  <span>Submitted: {rrfData.submittedDate}</span><span>•</span>
                  <StatusWithDetails 
                    status={rrfData.status} 
                    reason={rrfData.declineReason} 
                    actionBy={rrfData.declinedBy} 
                    actionDate={rrfData.declinedAt} 
                  />
                </div>
              </div>

              {/* ── APPROVAL DECISION SECTION ─── */}
              {isPending && (
                <div className={`space-y-6 print-section ${activeSection === 'approval' ? '' : 'screen-hidden'}`}>
                  <h3 className="text-xl md:text-2xl font-bold border-b-2 border-slate-200 pb-3 mb-6 text-slate-800">
                    Approval Status
                  </h3>
                  
                  {/* Per-approver comments */}
                  {rrfData.approvers.filter(a => a.comments).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Approver Comments</h4>
                      <div className="space-y-3">
                        {rrfData.approvers
                          .filter(a => a.comments)
                          .map((approver, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <UserOutlined className="text-indigo-600 text-xs" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">
                                      {approver.user?.fullName || 'Approver'}
                                    </p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      approver.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                      approver.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {approver.approvalStatus?.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                {(approver.approvedAt || approver.rejectedAt) && (
                                  <p className="text-xs text-slate-400 flex-shrink-0">
                                    {new Date(approver.approvedAt || approver.rejectedAt).toLocaleDateString('en-GB')}
                                  </p>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed ml-10">
                                {approver.comments}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Status history timeline */}
                  {rrfData.statusHistory?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Status History</h4>
                      <div className="relative ml-3">
                        <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
                        <div className="space-y-4">
                          {rrfData.statusHistory.map((entry, idx) => (
                            <div key={idx} className="relative flex items-start gap-4 pl-8">
                              <div className="absolute left-0 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center" style={{ top: '2px' }}>
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                              </div>
                              <div className="flex-1 bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                                    entry.status === 'declined' || entry.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    entry.status === 'approved'      ? 'bg-emerald-100 text-emerald-700' :
                                    entry.status === 'on-hold'       ? 'bg-amber-100 text-amber-700' :
                                    entry.status === 'pending'       ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {entry.status?.replace(/-/g, ' ')}
                                  </span>
                                  {entry.changedAt && (
                                    <span className="text-xs text-slate-400">
                                      {new Date(entry.changedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                  )}
                                </div>
                                {entry.reason && (
                                  <p className="mt-1.5 text-sm text-slate-600">{entry.reason}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Requisition Info */}
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

              {/* Position Details */}
              <div className={`space-y-8 print-section ${activeSection === 'position' ? '' : 'screen-hidden'}`}>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">Position Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoField label="Position Type"       value={rrfData.positionType} />
                  <InfoField label="Employment Type"       value={rrfData.employmentType} />
                  <InfoField label="Work Mode"       value={rrfData.workMode} />
                  <InfoField label="Number of Positions" value={rrfData.numberOfPositions} />
                  {/* Priority has special badge styling — keep inline */}
                  {rrfData.priorityLevel && (
                    <div className="bg-[#E3F2FD] rounded-lg p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Priority Level</p>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                        rrfData.priorityLevel === 'High'     ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        rrfData.priorityLevel === 'Critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                        rrfData.priorityLevel === 'Medium'   ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {rrfData.priorityLevel}
                      </span>
                    </div>
                  )}
                  <InfoField label="Job Location"        value={rrfData.jobLocation} />
                  <InfoField label="Experience Required"  value={rrfData.minimumExperience} />
                </div>
              </div>

              {/* Technical Requirements */}
              <div className={`space-y-8 print-section ${activeSection === 'technical' ? '' : 'screen-hidden'}`}>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">Technical Requirements</h3>
                <div className="space-y-4">
                  <InfoField label="Required Skills"     value={rrfData.requiredSkills}  rich />
                  <InfoField label="Preferred Skills"    value={rrfData.preferredSkills} rich />
                </div>
              </div>

              {/* Job Description */}
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
    </div>
  )
}
