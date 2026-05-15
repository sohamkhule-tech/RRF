'use client'

/**
 * PHASE 6 — Legacy compatibility redirect.
 * This route now delegates to the unified workflow detail page.
 * Original implementation preserved below (non-exported) for rollback.
 * Rollback: remove the redirect and restore `export default` on LegacyHMViewRRFPage.
 */
import { useParams } from 'next/navigation'
import { redirect } from 'next/navigation'
export default function Page() {
  const { id } = useParams()
  redirect(`/workflow/${id}`)
}

// ── Original implementation (preserved for rollback) ────────────────────────

import Link from 'next/link'
const { useRouter } = require('next/navigation')
import { useState, useCallback } from 'react'
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
  TeamOutlined,
} from '@ant-design/icons'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import { useRRFDetail } from '@/hooks/useRRFDetail'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import InfoField from '@/components/InfoField'
import StatusWithDetails from '@/components/StatusWithDetails'
import RRFContentSections from '@/components/RRFContentSections'

function LegacyHMViewRRFPage() {
  const params = useParams()
  const router = useRouter()
  const rrfId = params.id

  // Fetch RRF details from hook
  const { rrf, loading, error, refresh } = useRRFDetail(rrfId)
  
  // Debug Logging
  console.log('[HM View] Raw RRF:', rrf)
  
  const isPending = rrf?.status === 'pending'
  const isDeclined = rrf?.status === 'declined' || rrf?.status === 'rejected'
  const isOnHold   = rrf?.status === 'on-hold'
  
  const [activeSection, setActiveSection] = useState('requisition')
  
  // Determine editability based on mapped status
  const editableStatuses = ['draft', 'pending approval', 'declined', 'on hold'];
  const isEditable = rrf?.status && ['draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold'].includes(String(rrf.status).toLowerCase());
  
  const sections = [
    { id: 'requisition', label: 'Requisition Info',       icon: <BuildOutlined    className="text-lg" /> },
    { id: 'position',    label: 'Position Details',        icon: <UserOutlined     className="text-lg" /> },
    { id: 'technical',   label: 'Technical Requirements',  icon: <ToolOutlined     className="text-lg" /> },
    { id: 'description', label: 'Job Description',         icon: <FileTextOutlined className="text-lg" /> },
  ]

  // Map raw API data — no || 'N/A' fallbacks; InfoField handles empty values
  const rrfData = rrf ? {
    id: rrf.id,
    displayId: rrf.rrfNumber || rrf.subId,
    submittedDate: (rrf.submittedAt || rrf.createdAt) ? new Date(rrf.submittedAt || rrf.createdAt).toLocaleDateString('en-GB') : 'N/A',
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
    billingStartDate: rrf.billingStartDate,
    expectedOnboardingDate: rrf.expectedOnboardingDate,
    billingRate: rrf.billingRate,
    billingCurrency: rrf.billingCurrency,
    positionType:       rrf.positionType,
    employmentType:     rrf.employmentType,
    workMode:           rrf.workMode,
    numberOfPositions:  rrf.headcount,
    priorityLevel:      rrf.priority,
    jobLocation:        rrf.location ? [rrf.location] : null,
    minimumExperience:  rrf.experienceMin && rrf.experienceMax
      ? `${rrf.experienceMin}-${rrf.experienceMax} years`
      : null,
    primaryTechnologies: rrf.technologies,
    requiredSkills:      rrf.requiredSkills,
    preferredSkills:     rrf.preferredSkills,
    jobDescription:  rrf.jobDescription,
    additionalNotes: rrf.notes || rrf.urgencyReason,
    budgetMin:       rrf.budgetMin,
    budgetMax:       rrf.budgetMax,
    interviewers:    rrf.interviewers || [],
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
                      return ts ? new Date(ts).toLocaleString('en-GB') : null
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
                  onClick={() => router.push(`/hiring-manager/edit-rrf/${rrfData.id}`)}
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
                  <span>{rrfData.displayId}</span><span>•</span>
                  <span>Submitted: {rrfData.submittedDate}</span><span>•</span>
                  <StatusWithDetails 
                    status={rrfData.status} 
                    reason={rrfData.declineReason} 
                    actionBy={rrfData.declinedBy} 
                    actionDate={rrfData.declinedAt} 
                  />
                </div>
              </div>

              <RRFContentSections rrfData={rrfData} activeSection={activeSection} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
