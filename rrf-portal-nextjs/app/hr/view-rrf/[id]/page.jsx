'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { PrinterOutlined, DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons'
import MaskedDateInput from '@/components/MaskedDateInput'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import InfoField from '@/components/InfoField'
import 'antd/dist/reset.css'

export default function HRViewRRFPage() {
  const params = useParams()
  const router = useRouter()
  const rrfId = params.id
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeStatus, setCloseStatus] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [joiningDate, setJoiningDate] = useState('')

  // Mock data - in production this would come from API/database
  const getRRFData = () => {
    // RRF-017 is closed
    if (rrfId === 'RRF-017') {
      return {
        id: rrfId,
        submittedDate: '15/03/2026',
        status: 'Closed',
        closureStatus: 'Resource Hired (External Candidate)',
        candidateName: 'Priya Sharma',
        dateOfJoining: 'Mar 22, 2026',
        managerName: 'Lisa Brown',
        department: 'Design',
        requisitionType: 'Non-Billable',
        customerName: 'Internal Project',
        projectName: 'Design System',
        jobTitle: 'UI/UX Designer',
        expectedBillingStartDate: null,
        positionType: 'Permanent',
        numberOfPositions: 1,
        priorityLevel: 'Low',
        jobLocation: ['Pune'],
        remoteOption: 'Hybrid',
        minimumExperience: '2-5 years',
        primaryTechnologies: 'Figma, Adobe XD, Sketch',
        mustHaveSkills: 'UI/UX Design, Figma, Prototyping',
        niceToHaveSkills: 'Animation, Illustration',
        jobDescription: 'Design and maintain our internal design system.',
        additionalNotes: null
      }
    }
    
    // Default data for other RRFs
    return {
      id: rrfId,
      submittedDate: '10/03/2026',
      status: 'Approved - Open for Hiring',
      managerName: 'John Doe',
      department: 'Engineering',
      requisitionType: 'Billable',
      customerName: 'ABC Bank',
      projectName: 'Banking Project',
      jobTitle: 'Senior React Developer',
      expectedBillingStartDate: '2026-04-01',
      positionType: 'Permanent',
      numberOfPositions: 2,
      priorityLevel: 'High',
      jobLocation: ['Pune', 'Bengaluru'],
      remoteOption: 'Hybrid',
      minimumExperience: '5-7 years',
      primaryTechnologies: 'React, TypeScript, Next.js, Redux',
      mustHaveSkills: 'React.js (5+ years), TypeScript, Redux/Context API, RESTful APIs, Git, Agile methodology',
      niceToHaveSkills: 'Next.js, GraphQL, Docker, AWS, Unit Testing (Jest/React Testing Library)',
      jobDescription: 'We are looking for an experienced React Developer to join our banking project team. The candidate will be responsible for developing and maintaining complex web applications, collaborating with cross-functional teams, and ensuring high-quality code delivery.',
      additionalNotes: 'Candidate should be comfortable working in a fast-paced environment and have excellent communication skills.'
    }
  }

  const [rrfData] = useState(getRRFData())

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async () => {
    try {
      const element = document.querySelector('.rrf-document')
      if (!element) {
        toast.error('Document not found')
        return
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= 297
      }

      pdf.save(`RRF-${rrfData.id}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error generating PDF. Please try again.')
    }
  }

  const handleCloseRRF = () => {
    if (!closeStatus) {
      toast.error('Please select a close status')
      return
    }

    // Validation based on selected status
    if (closeStatus === 'Resource Hired (External Candidate)' || closeStatus === 'Sourced Internally') {
      if (!candidateName.trim()) {
        toast.error('Please enter candidate name')
        return
      }
      if (!joiningDate) {
        const dateLabel = closeStatus === 'Resource Hired (External Candidate)' ? 'date of joining' : 'date of fulfillment'
        toast.error(`Please select ${dateLabel}`)
        return
      }
    }

    // Prepare message based on status
    let message = `RRF ${rrfId} has been closed successfully!`
    
    toast.success(message, {
      duration: 4000,
      style: {
        fontWeight: '600',
      },
    })
    setShowCloseModal(false)
    setCandidateName('')
    setJoiningDate('')
    setCloseStatus('')
    router.push('/hr/closed')
  }

  return (
    <div style={{ background: '#F5F7FB', minHeight: '100vh' }}>
      {/* Header Actions Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-all duration-300 flex items-center gap-2 shadow-sm"
              style={{ borderRadius: '10px' }}
            >
              ← Back
            </button>
            <div className="flex gap-3">
              <button 
                onClick={handlePrint}
                className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-all duration-300 flex items-center gap-2 shadow-sm"
                style={{ borderRadius: '10px' }}
              >
                <PrinterOutlined />
                Print
              </button>
              <button 
                onClick={handleExport}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 font-medium transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                style={{ borderRadius: '10px' }}
              >
                <DownloadOutlined />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Document Container */}
      <div className="px-8 py-8">
        {/* RRF Document */}
        <div className="rrf-document bg-white" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Document Header */}
        <div className="mb-8 pb-6 -mx-10 -mt-10 px-10 pt-10" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px 16px 0 0'
        }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Resource Requisition Form</h1>
              <p className="text-white/90 text-sm">RRF ID: <span className="font-bold">{rrfData.id}</span></p>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm mb-1">Submitted Date</p>
              <p className="text-white font-bold">{rrfData.submittedDate}</p>
            </div>
          </div>
          <div className={`mt-4 inline-block px-4 py-2 font-semibold text-sm rounded-full ${
            rrfData.status === 'Closed' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {rrfData.status}
          </div>
        </div>

        {/* Closure Status Banner - Only show if status is Closed */}
        {rrfData.status === 'Closed' && (
          <div className="mb-8 p-6 rounded-xl border-2 border-green-200" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircleOutlined className="text-4xl text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-800 mb-3">✓ This RRF is Closed - Position Filled</h3>
                <div className="bg-white rounded-lg p-5 border border-green-200 shadow-sm">
                  <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Closure Details:</p>
                  <div className="space-y-3">
                    {/* Closure Status */}
                    <div className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                      <div>
                        <span className="text-sm font-semibold text-gray-600">Closure Status: </span>
                        <span className="text-base text-gray-900 font-medium">{rrfData.closureStatus}</span>
                      </div>
                    </div>
                    
                    {/* Candidate Name - Only for External or Internal */}
                    {(rrfData.closureStatus === 'Resource Hired (External Candidate)' || 
                      rrfData.closureStatus === 'Sourced Internally') && rrfData.candidateName && (
                      <div className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Candidate Name: </span>
                          <span className="text-base text-gray-900 font-medium">{rrfData.candidateName}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Date of Joining/Fulfillment - Only for External or Internal */}
                    {(rrfData.closureStatus === 'Resource Hired (External Candidate)' || 
                      rrfData.closureStatus === 'Sourced Internally') && rrfData.dateOfJoining && (
                      <div className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                        <div>
                          <span className="text-sm font-semibold text-gray-600">
                            {rrfData.closureStatus === 'Resource Hired (External Candidate)' 
                              ? 'Date of Joining: ' 
                              : 'Date Fulfilled: '}
                          </span>
                          <span className="text-base text-gray-900 font-medium">{rrfData.dateOfJoining}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* For Requirement Lapsed */}
                    {rrfData.closureStatus === 'Requirement Lapsed' && (
                      <div className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Reason: </span>
                          <span className="text-base text-gray-900 font-medium">Requirement is no longer needed</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Requisition Details */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12" style={{ background: 'linear-gradient(90deg, #667eea, #764ba2)' }}></div>
            <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>Requisition Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <InfoField variant="plain" label="Requisition Manager Name"    value={rrfData.managerName} />
            <InfoField variant="plain" label="Entity"                      value={rrfData.entity} />
            <InfoField variant="plain" label="Organisation"                value={rrfData.organisation} />
            <InfoField variant="plain" label="Function"                    value={rrfData.function} />
            <InfoField variant="plain" label="Sub-function"                value={rrfData.subFunction} />
            <InfoField variant="plain" label="Department"                  value={rrfData.department} />
            <InfoField variant="plain" label="Requisition Type"            value={rrfData.requisitionType} />
            <InfoField variant="plain" label="Customer Name"               value={rrfData.customerName} />
            <InfoField variant="plain" label="Project Name"                value={rrfData.projectName} />
            <InfoField variant="plain" label="Role / Job Title"            value={rrfData.jobTitle} />
            <InfoField variant="plain" label="Expected Billing Start Date" value={rrfData.expectedBillingStartDate} />
          </div>
        </div>

        {/* Section: Position Details */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12" style={{ background: 'linear-gradient(90deg, #667eea, #764ba2)' }}></div>
            <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>Position Details</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <InfoField variant="plain" label="Position Type"       value={rrfData.positionType} />
            <InfoField variant="plain" label="Number of Positions" value={rrfData.numberOfPositions} />
            {rrfData.priorityLevel && (
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Priority Level</p>
                <span className="inline-block px-4 py-1.5 text-sm font-semibold" style={{ backgroundColor: '#fed7aa', color: '#9a3412', borderRadius: '999px' }}>
                  {rrfData.priorityLevel}
                </span>
              </div>
            )}
            <InfoField variant="plain" label="Job Location"         value={Array.isArray(rrfData.jobLocation) ? rrfData.jobLocation.join(', ') : rrfData.jobLocation} />
            <InfoField variant="plain" label="Remote Option"        value={rrfData.remoteOption} />
            <InfoField variant="plain" label="Minimum Experience"   value={rrfData.minimumExperience} />
          </div>
        </div>

        {/* Section: Technical Requirements */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-12" style={{ background: 'linear-gradient(90deg, #667eea, #764ba2)' }}></div>
            <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>Technical Requirements</h2>
          </div>
          <div className="space-y-6">
            <InfoField variant="plain" label="Primary Technologies" value={rrfData.primaryTechnologies} />
            <InfoField variant="plain" label="Must Have Skills"     value={rrfData.mustHaveSkills}      rich />
            <InfoField variant="plain" label="Nice To Have Skills"  value={rrfData.niceToHaveSkills}    rich />
            <InfoField variant="plain" label="Detailed Job Description" value={rrfData.jobDescription}  rich />
            <InfoField variant="plain" label="Additional Notes"     value={rrfData.additionalNotes} />
          </div>
        </div>

        {/* Close RRF Action - Only show if status is not Closed */}
        {!rrfData.status.includes('Closed') && (
          <div className="mt-10 pt-8 border-t-2 border-gray-100 flex justify-end no-print">
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-8 py-3.5 text-white font-bold hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '12px' }}
            >
              <CheckCircleOutlined />
              Close RRF
            </button>
          </div>
        )}
      </div>

      {/* Close RRF Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print" onClick={() => setShowCloseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Close RRF - {rrfId}</h3>
            
            <div className="space-y-5">
              {/* Close Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Closure Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={closeStatus}
                  onChange={(e) => {
                    setCloseStatus(e.target.value)
                    // Reset fields when status changes
                    setCandidateName('')
                    setJoiningDate('')
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                  style={{ fontSize: '14px' }}
                >
                  <option value="">Select Closure Status</option>
                  <option value="Resource Hired (External Candidate)">Resource Hired (External Candidate)</option>
                  <option value="Sourced Internally">Sourced Internally</option>
                  <option value="Requirement Lapsed">Requirement Lapsed</option>
                </select>
              </div>

              {/* Dynamic Fields based on selected status */}
              {closeStatus === 'Resource Hired (External Candidate)' && (
                <>
                  {/* Candidate Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Candidate Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Enter candidate name"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                      style={{ fontSize: '14px' }}
                    />
                  </div>

                  {/* Date of Joining */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Joining <span className="text-red-500">*</span>
                    </label>
                    <MaskedDateInput
                      value={joiningDate}
                      onChange={(dateString) => setJoiningDate(dateString)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                      style={{ height: '48px', fontSize: '14px', borderRadius: '8px' }}
                    />
                  </div>
                </>
              )}

              {closeStatus === 'Sourced Internally' && (
                <>
                  {/* Candidate Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Candidate Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Enter internal candidate name"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                      style={{ fontSize: '14px' }}
                    />
                  </div>

                  {/* Date of Fulfillment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Fulfillment <span className="text-red-500">*</span>
                    </label>
                    <MaskedDateInput
                      value={joiningDate}
                      onChange={(dateString) => setJoiningDate(dateString)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                      style={{ height: '48px', fontSize: '14px', borderRadius: '8px' }}
                    />
                  </div>
                </>
              )}

              {closeStatus === 'Requirement Lapsed' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 font-medium">
                        This requirement is no longer needed and will be closed without any candidate details.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowCloseModal(false)
                  setCandidateName('')
                  setJoiningDate('')
                  setCloseStatus('')
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseRRF}
                className="flex-1 px-6 py-3 text-white font-semibold rounded-lg transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
              >
                Close RRF
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
