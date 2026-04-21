'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  PrinterOutlined,
  DownloadOutlined,
  BuildOutlined,
  UserOutlined,
  ToolOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SendOutlined
} from '@ant-design/icons'
import MaskedDateInput from '@/components/MaskedDateInput'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import InfoField from '@/components/InfoField'
import { rrfApi } from '@/lib/api/rrfApi'

export default function PMOViewRRFPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionId = params.id
  const fromSent = searchParams.get('from') === 'sent'
  
  // Loading and data state
  const [pageLoading, setPageLoading] = useState(true)  // ✅ FIX: Renamed for clarity
  const [rrfData, setRrfData] = useState(null)
  
  // Section navigation state
  const [activeSection, setActiveSection] = useState('requisition')
  
  // PMO Closure State
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [internalRrfNumber, setInternalRrfNumber] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [dateOfJoining, setDateOfJoining] = useState('')
  const [submittingClose, setSubmittingClose] = useState(false)  // ✅ FIX: Separate loading for close action

  // PMO Open for Requisition State
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [remark, setRemark] = useState('')
  const [submittingOpen, setSubmittingOpen] = useState(false)  // ✅ FIX: Separate loading for open action
  
  // Section definitions
  const sections = [
    { id: 'requisition', label: 'Requisition Info', icon: <BuildOutlined className="text-lg" /> },
    { id: 'position', label: 'Position Details', icon: <UserOutlined className="text-lg" /> },
    { id: 'technical', label: 'Technical Requirements', icon: <ToolOutlined className="text-lg" /> },
    { id: 'description', label: 'Job Description', icon: <FileTextOutlined className="text-lg" /> }
  ]

  // Fetch RRF data from API
  useEffect(() => {
    if (!submissionId) {
      toast.error('Invalid RRF ID')
      setLoading(false)
      return
    }

    let isMounted = true  // ✅ Prevent state updates after unmount

    const fetchRRF = async () => {
      try {
        setPageLoading(true)  // ✅ FIX: Use pageLoading instead of loading
        const response = await rrfApi.getById(submissionId)
        
        if (!isMounted) return  // ✅ Component unmounted, don't update state
        
        const rrf = response?.data || response
        
        if (!rrf) {
          toast.error('RRF not found')
          setPageLoading(false)  // ✅ FIX: Use pageLoading
          return
        }

        // Debug: Log the API response to verify data structure
        console.log('[DEBUG] RRF API Response:', rrf)

        // Normalize location to array
        const location = Array.isArray(rrf.location)
          ? rrf.location
          : rrf.location
            ? String(rrf.location).split(',').map(l => l.trim()).filter(Boolean)
            : []

        // Format the data to match the UI expectations
        setRrfData({
          submissionId: rrf.id || submissionId,
          displayId: rrf.rrfNumber || rrf.subId || `SUB-${rrf.id || submissionId}`,
          submittedDate: rrf.createdAt ? new Date(rrf.createdAt).toLocaleDateString('en-GB') : 'N/A',
          status: rrf.status || '',
          
          // Requisition Details
          managerName: rrf.createdBy?.fullName || rrf.createdBy?.name || '',
          entity: rrf.entity || '',
          organisation: rrf.organisation || 'DataFortune',
          function: rrf.function || '',
          subFunction: rrf.subFunction || '',
          department: rrf.department || '',
          requisitionType: rrf.requisitionType || '',
          customerName: rrf.customerName || '',
          projectName: rrf.projectName || '',
          jobTitle: rrf.positionTitle || rrf.jobTitle || '',
          expectedBillingStartDate: rrf.anticipatedBillingStartDate || rrf.billingStartDate || '',
          billingRate: rrf.billingRate || '',
          
          // Position Details
          positionType: rrf.positionType || '',
          employmentType: rrf.employmentType || '',
          numberOfPositions: rrf.headcount || rrf.positions || '',
          priorityLevel: rrf.priority || '',
          jobLocation: location,
          workMode: rrf.workMode || '',
          minimumExperience: rrf.experienceMin && rrf.experienceMax 
            ? `${rrf.experienceMin}-${rrf.experienceMax} years` 
            : '',
          
          // Technical Requirements
          primaryTechnologies: Array.isArray(rrf.technologies) 
            ? rrf.technologies.join(', ') 
            : rrf.technologies || '',
          mustHaveSkills: Array.isArray(rrf.requiredSkills)
            ? rrf.requiredSkills.join(', ')
            : rrf.requiredSkills || '',
          niceToHaveSkills: Array.isArray(rrf.preferredSkills)
            ? rrf.preferredSkills.join(', ')
            : rrf.preferredSkills || '',
          jobDescription: rrf.jobDescription || '',
          additionalNotes: rrf.notes || ''
        })
      } catch (error) {
        if (!isMounted) return  // ✅ Component unmounted, don't show error
        
        console.error('[ERROR] Failed to fetch RRF:', error)
        toast.error(error?.response?.data?.message || 'Failed to load RRF data')
      } finally {
        if (isMounted) setPageLoading(false)  // ✅ FIX: Use pageLoading
      }
    }

    fetchRRF()
    
    // ✅ Cleanup function prevents memory leaks
    return () => {
      isMounted = false
    }
  }, [submissionId])  // ✅ Only re-run if submissionId changes

  const handleCloseWithBench = async () => {
    // Validate required fields
    if (!candidateName.trim()) {
      toast.error('Please enter candidate name')
      return
    }

    if (!dateOfJoining) {
      toast.error('Please select date of joining')
      return
    }

    // ✅ Validate RRF status before submission
    const validStatuses = ['approved', 'in-progress']
    if (!validStatuses.includes(rrfData?.status)) {
      toast.error(`Cannot fill from bench. RRF must be APPROVED or IN_PROGRESS. Current status: ${rrfData?.status || 'unknown'}`)
      return
    }

    try {
      setSubmittingClose(true)  // ✅ FIX: Use separate state, doesn't trigger full-page spinner
      
      // Convert DD/MM/YYYY to YYYY-MM-DD for backend
      const [day, month, year] = dateOfJoining.split('/')
      const formattedDate = `${year}-${month}-${day}`
      
      console.log('[DEBUG] Calling fillByBench API:', { submissionId, candidateName, formattedDate })  // ✅ Debug log
      
      const response = await rrfApi.fillByBench(submissionId, candidateName, formattedDate)
      
      console.log('[DEBUG] fillByBench API response:', response)  // ✅ Debug log
      
      // Show auto-generated Internal RRF Number in success message
      const generatedRrfNo = response?.data?.internalRrfNo || 'Auto-Generated'
      toast.success(`Position filled from bench and closed! Internal RRF: ${generatedRrfNo}`, {
        duration: 4000,
        style: {
          fontWeight: '600',
        },
      })
      
      // Reset form
      setShowCloseModal(false)
      setCandidateName('')
      setDateOfJoining('')
      
      // ✅ FIX: Redirect immediately, no setTimeout needed
      router.push('/pmo/closed')
    } catch (error) {
      console.error('[ERROR] Failed to fill position:', error)  // ✅ Better logging
      console.error('[ERROR] Error details:', error?.response?.data)  // ✅ Log backend error
      
      // ✅ Show detailed error message
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to fill position from bench'
      toast.error(errorMsg, {
        duration: 5000,
        style: {
          maxWidth: '500px',
        },
      })
    } finally {
      setSubmittingClose(false)  // ✅ FIX: Use separate state
    }
  }

  const handleOpenForRequisition = async () => {
    try {
      setSubmittingOpen(true)  // ✅ FIX: Show loading on button
      
      console.log('[DEBUG] Calling openForHiring API:', { submissionId })  // ✅ Debug log
      
      await rrfApi.openForHiring(submissionId);
      
      toast.success('RRF has been opened for HR recruitment!', {
        duration: 4000,
        style: {
          fontWeight: '600',
        },
      })
      
      setShowOpenModal(false)
      setRemark('')
      
      // ✅ FIX: Redirect immediately
      router.push('/pmo/sent-to-approvers')
    } catch (error) {
      console.error('[ERROR] Failed to open for hiring:', error);  // ✅ Better logging
      console.error('[ERROR] Error details:', error?.response?.data);  // ✅ Log backend error
      toast.error(error?.response?.data?.message || 'Failed to open request for hiring');
    } finally {
      setSubmittingOpen(false)  // ✅ FIX: Always clear loading
    }
  }

  const handlePrint = () => {
    window.print()
  }

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
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
      height: content.scrollHeight,
      windowHeight: content.scrollHeight
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
        if (position < pdfHeight) {
          pdf.addPage()
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    }
    
    pdf.save(`SUB-${rrfData.submissionId}.pdf`)
    toast.success('PDF exported successfully!')
  }

  // ✅ FIX: Loading state - only show for initial page load
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading RRF details...</p>
        </div>
      </div>
    )
  }

  // Error state - no data found
  if (!rrfData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">RRF Not Found</h2>
          <p className="text-slate-600 mb-6">The requested RRF could not be found.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
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

      <div className="flex flex-col md:flex-row h-screen">
        
        {/* LEFT PANEL */}
        <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:overflow-y-auto no-print">
          <div className="p-4 md:p-6 bg-gradient-to-br from-slate-700 to-slate-800 text-white">
            <div className="space-y-3">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight leading-tight">{rrfData.jobTitle}</h1>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-lg">
                {rrfData.status}
              </div>
              <div className="text-xs text-slate-300 font-medium space-y-1">
                <div>{rrfData.displayId}</div>
                <div>Submitted: {rrfData.submittedDate}</div>
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

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 border border-slate-300">
                <ArrowLeftOutlined className="text-lg" />
                <span className="font-medium">Back</span>
              </button>
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
              {!fromSent && (
                <>
                  {/* ✅ Show "Open for Requisition" only if APPROVED */}
                  {rrfData?.status === 'approved' && (
                    <button 
                      onClick={() => setShowOpenModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-medium rounded-lg transition-all flex items-center gap-2 shadow-md"
                      title="Open this RRF for HR recruitment"
                    >
                      <SendOutlined />
                      <span className="hidden sm:inline">Open for Requisition</span>
                    </button>
                  )}
                  
                  {/* ✅ Show "Fill from Bench" if APPROVED or IN_PROGRESS */}
                  {(rrfData?.status === 'approved' || rrfData?.status === 'in-progress') && (
                    <button 
                      onClick={() => setShowCloseModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-medium rounded-lg transition-all flex items-center gap-2 shadow-md"
                      title="Fill this position from internal bench"
                    >
                      <CheckCircleOutlined />
                      <span className="hidden sm:inline">Fill from Bench</span>
                    </button>
                  )}
                  
                  {/* ✅ Show helpful message if neither button is available */}
                  {rrfData?.status && !['approved', 'in-progress'].includes(rrfData.status) && (
                    <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
                      ⚠️ Actions available only for approved or in-progress RRFs
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white rrf-content-area">
            <div className="p-4 md:p-8">
              
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
                  {rrfData.requisitionType === 'Billable' && (
                    <>
                      <InfoField label="Billing Start Date" value={rrfData.expectedBillingStartDate} />
                      <InfoField label="Billing Rate"       value={rrfData.billingRate ? `$${rrfData.billingRate}/day` : null} />
                    </>
                  )}
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
                  <InfoField label="Job Location"       value={Array.isArray(rrfData.jobLocation) ? rrfData.jobLocation : null} />
                  <InfoField label="Experience Required" value={rrfData.minimumExperience} />
                </div>
              </div>

              {/* Technical Requirements */}
              <div className={`space-y-8 print-section ${activeSection === 'technical' ? '' : 'screen-hidden'}`}>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">Technical Requirements</h3>
                <div className="space-y-4">
                  <InfoField label="Primary Technologies" value={rrfData.primaryTechnologies} rich />
                  <InfoField label="Must Have Skills"     value={rrfData.mustHaveSkills}      rich />
                  <InfoField label="Nice to Have Skills"  value={rrfData.niceToHaveSkills}    rich />
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

      {/* Open for Requisition Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: '16px' }}>
            {/* Modal Header */}
            <div className="px-4 md:px-8 py-4 md:py-6 border-b-2 border-blue-100" style={{ background: 'linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(219, 234, 254) 100%)' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <SendOutlined style={{ fontSize: '24px', color: '#2563eb' }} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Open for Requisition</h2>
                  <p className="text-sm text-gray-600">Add a remark and open this RRF for HR recruitment</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-4 md:px-8 py-4 md:py-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Remark (Optional)
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all resize-none"
                  placeholder="Add any additional remarks or notes..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50 flex items-center justify-end gap-3" style={{ borderRadius: '0 0 16px 16px' }}>
              <button
                onClick={() => setShowOpenModal(false)}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold transition-all duration-300"
                style={{ borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleOpenForRequisition}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                style={{ borderRadius: '10px' }}
              >
                <SendOutlined />
                Confirm & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position Filled by Bench Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: '16px' }}>
            {/* Modal Header */}
            <div className="px-4 md:px-8 py-4 md:py-6 border-b-2 border-green-100" style={{ background: 'linear-gradient(135deg, rgb(220, 252, 231) 0%, rgb(187, 247, 208) 100%)' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircleOutlined style={{ fontSize: '24px', color: '#16a34a' }} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Position Filled by Bench</h2>
                  <p className="text-sm text-gray-600">Close this requisition with internal resource allocation</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-4 md:px-8 py-4 md:py-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Internal RRF Number
                </label>
                <div className="w-full px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Auto Generated</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">System will generate format: RRF-INT-XXX (e.g., RRF-INT-001)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Candidate Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Enter candidate name"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Joining <span className="text-red-500">*</span>
                </label>
                <MaskedDateInput
                  value={dateOfJoining}
                  onChange={setDateOfJoining}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50 flex items-center justify-end gap-3" style={{ borderRadius: '0 0 16px 16px' }}>
              <button
                onClick={() => {
                  setShowCloseModal(false)
                  setCandidateName('')
                  setDateOfJoining('')
                }}
                disabled={submittingClose}  // ✅ FIX: Disable during submission
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseWithBench}
                disabled={submittingClose}  // ✅ FIX: Disable during submission
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '10px' }}
              >
                {submittingClose ? (
                  // ✅ FIX: Show loading spinner
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Closing...</span>
                  </>
                ) : (
                  // Normal state
                  <>
                    <CheckCircleOutlined />
                    Confirm & Close
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
