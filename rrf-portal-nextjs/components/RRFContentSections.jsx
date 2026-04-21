'use client'

import InfoField from '@/components/InfoField'

/**
 * RRFContentSections — shared data sections used by all view-rrf pages.
 *
 * Renders the four standard sections:
 *   1. Requisition Information
 *   2. Position Details
 *   3. Technical Requirements
 *   4. Job Description
 *
 * Props:
 *   rrfData       {object}  — normalised RRF data object (see field list below)
 *   activeSection {string}  — 'requisition' | 'position' | 'technical' | 'description'
 *
 * Expected rrfData fields:
 *   managerName, entity, organisation, function, subFunction, department,
 *   requisitionType, customerName, projectName, billingStartDate, billingRate,
 *   positionType, employmentType, workMode, numberOfPositions, priorityLevel,
 *   jobLocation, minimumExperience,
 *   requiredSkills, preferredSkills,
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
          <InfoField label="Billing Start Date"  value={rrfData.billingStartDate} />
          {/* billingRate is only set for Billable RRFs; InfoField hides it when empty */}
          <InfoField label="Billing Rate"        value={rrfData.billingRate} />
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

      {/* ── 3. Technical Requirements ──────────────────────────────── */}
      <div className={`space-y-8 print-section ${activeSection === 'technical' ? '' : 'screen-hidden'}`}>
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-3 mb-6">
          Technical Requirements
        </h3>
        <div className="space-y-4">
          <InfoField label="Primary Technologies" value={rrfData.primaryTechnologies} rich />
          <InfoField label="Must-Have Skills"     value={rrfData.requiredSkills}      rich />
          <InfoField label="Nice-to-Have Skills"  value={rrfData.preferredSkills}     rich />
        </div>
      </div>

      {/* ── 4. Job Description ─────────────────────────────────────── */}
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
