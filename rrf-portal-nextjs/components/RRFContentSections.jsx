'use client'

import { TeamOutlined } from '@ant-design/icons'
import InfoField from '@/components/InfoField'

/**
 * RRFContentSections — shared data sections used by all view-rrf pages.
 *
 * Renders the five standard sections:
 *   1. Requisition Information
 *   2. Position Details
 *   3. Technical Requirements
 *   4. Interview Panel
 *   5. Job Description
 *
 * Props:
 *   rrfData       {object}  — normalised RRF data object (see field list below)
 *   activeSection {string}  — 'requisition' | 'position' | 'technical' | 'panel' | 'description'
 *
 * Expected rrfData fields:
 *   managerName, entity, organisation, function, subFunction, department,
 *   requisitionType, customerName, projectName, billingStartDate, billingRate,
 *   positionType, employmentType, workMode, numberOfPositions, priorityLevel,
 *   jobLocation, minimumExperience,
 *   requiredSkills, preferredSkills, interviewers,
 *   jobDescription, additionalNotes
 */
export default function RRFContentSections({ rrfData, activeSection }) {
  return (
    <>
      {/* ── 1. Requisition Information ─────────────────────────────── */}
      <div className={`space-y-8 print-section ${activeSection === 'requisition' ? '' : 'screen-hidden'}`}>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">
          Requisition Information
        </h3>
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
          <InfoField 
            label="Billing Start Date"  
            value={rrfData.billingStartDate ? new Date(rrfData.billingStartDate).toLocaleDateString('en-GB') : null} 
          />
          <InfoField 
            label="Expected Onboarding Date"  
            value={rrfData.expectedOnboardingDate ? new Date(rrfData.expectedOnboardingDate).toLocaleDateString('en-GB') : null} 
          />
          {/* billingRate is only set for Billable RRFs; InfoField hides it when empty */}
          <InfoField 
            label="Billing Rate" 
            value={rrfData.billingRate && rrfData.billingCurrency ? `${rrfData.billingCurrency} ${rrfData.billingRate}` : rrfData.billingRate} 
          />
          <InfoField label="Budget Min"           value={rrfData.budgetMin} />
          <InfoField label="Budget Max"           value={rrfData.budgetMax} />
        </div>
      </div>

      {/* ── 2. Position Details ────────────────────────────────────── */}
      <div className={`space-y-8 print-section ${activeSection === 'position' ? '' : 'screen-hidden'}`}>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">
          Position Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoField label="Position Type"       value={rrfData.positionType} />
          <InfoField label="Employment Type"     value={rrfData.employmentType} />
          <InfoField label="Work Mode"           value={rrfData.workMode} />
          <InfoField label="Number of Positions" value={rrfData.numberOfPositions} />
          {/* Priority uses a coloured badge instead of a plain tile */}
          {rrfData.priorityLevel && (
            <div className="bg-[#E3F2FD] rounded-lg p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                Priority Level
              </p>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                rrfData.priorityLevel === 'High'     ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                rrfData.priorityLevel === 'Critical' ? 'bg-red-100    text-red-800    border border-red-200'    :
                rrfData.priorityLevel === 'Medium'   ? 'bg-blue-100   text-blue-800   border border-blue-200'   :
                'bg-gray-100 text-gray-800 border border-gray-200'
              }`}>
                {rrfData.priorityLevel}
              </span>
            </div>
          )}
          <InfoField label="Job Location"       value={rrfData.jobLocation} />
          <InfoField label="Experience Required" value={rrfData.minimumExperience} />
        </div>
      </div>

      {/* ── 3. Technical Requirements & Interview Panel ──────────────────────────────── */}
      <div className={`space-y-8 print-section ${activeSection === 'technical' ? '' : 'screen-hidden'}`}>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">
          Technical Requirements
        </h3>
        <div className="space-y-4">
          <InfoField label="Primary Technologies" value={rrfData.primaryTechnologies} rich />
          <InfoField label="Must-Have Skills"     value={rrfData.requiredSkills}      rich />
          <InfoField label="Nice-to-Have Skills"  value={rrfData.preferredSkills}     rich />
        </div>

        {/* ── Interview Panel (Moved into Technical) ───────────────────────────────────── */}
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6 mt-8">
          Interview Panel
        </h3>
        {rrfData.interviewers && rrfData.interviewers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rrfData.interviewers.map((user) => (
              <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {user.fullName?.charAt(0) || <UserOutlined />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{user.fullName}</h4>
                    <p className="text-xs text-slate-500 font-medium">{user.role?.roleName || 'Interviewer'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{user.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-500 font-medium italic">No interviewers assigned to this request.</p>
          </div>
        )}
      </div>

      {/* ── 5. Job Description ─────────────────────────────────────── */}
      <div className={`space-y-8 print-section ${activeSection === 'description' ? '' : 'screen-hidden'}`}>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">
          Job Description
        </h3>
        <div className="space-y-4">
          <InfoField label="Job Description"  value={rrfData.jobDescription}  rich />
          <InfoField label="Additional Notes" value={rrfData.additionalNotes} rich />
        </div>
      </div>
    </>
  )
}
