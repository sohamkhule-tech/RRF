'use client'

/**
 * /hiring-manager/edit-rrf/[id]
 *
 * UI-layer migration: now uses ModernRRFForm as the shared form engine while
 * preserving ALL HM-specific business workflow semantics exactly:
 *
 *   1. HM status guard  — only allow editing for HM_EDITABLE_STATUSES
 *   2. Two-phase save   — PUT /rrf/:id  (always)
 *                         POST /rrf/:id/submit  (only when coming from DECLINED/REJECTED)
 *   3. Resubmit path    — resets approver records, transitions → PENDING, fires
 *                         rrf.resubmitted notification (all handled by the backend submit endpoint)
 *   4. Non-declined     — patch-only, no workflow reset
 *
 * STRANGLER PATTERN — the old form implementation is preserved below as
 * LegacyHMEditRRFPage (non-exported) until full validation passes.
 *
 * Field mapping (HM payload → ModernRRFForm formData keys):
 *   anticipatedBillingStartDate ← formData.billingStartDate   (ModernRRFForm convention)
 *   requiredSkills              ← formData.mustHaveSkills      (mapped by ModernRRFForm)
 *   preferredSkills             ← formData.niceToHaveSkills    (mapped by ModernRRFForm)
 *   technologies                ← formData.technologies
 *   urgencyReason               ← formData.additionalNotes     (ModernRRFForm convention)
 *   interviewPanel              ← formData.interviewPanel
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  SendOutlined,
  CheckOutlined,
  RightOutlined,
  BankOutlined,
  TeamOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import toast from 'react-hot-toast'
import { rrfApi } from '@/lib/api/rrfApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import ModernRRFForm from '@/components/ModernRRFForm'
import TagInput from '@/components/TagInput'
import RichTextEditor from '@/components/RichTextEditor'

// ─────────────────────────────────────────────────────────────────────────────
// Constants — shared between new and legacy implementations
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, title: 'Requisition Details', icon: BankOutlined, description: 'Basic Information' },
  { number: 2, title: 'Position Details',    icon: TeamOutlined,  description: 'Role Requirements' },
  { number: 3, title: 'Technical Skills',    icon: CodeOutlined,  description: 'Skills & JD' },
]

const SUBFUNCTIONS = {
  'Delivery': ['SGINTL', 'VR', 'PMO'],
  'Sales':    ['BDE', 'Sales', 'MR', 'Marketing'],
  'Support':  ['Human Resources', 'Talent Acquisition', 'Accounts', 'IT Networking'],
}

const ALL_LOCATIONS = ['Pune', 'Chennai', 'Bengaluru', 'US', 'Other']

// Statuses where HM is allowed to edit — MUST match backend hmAllowedStatuses exactly
const HM_EDITABLE_STATUSES = ['draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold']

// ─────────────────────────────────────────────────────────────────────────────
// NEW: HMEditRRFPage — ModernRRFForm-based, full HM workflow semantics preserved
// ─────────────────────────────────────────────────────────────────────────────

export default function HMEditRRFPage() {
  const params  = useParams()
  const router  = useRouter()
  const rrfId   = params.id

  const [loading,       setLoading]      = useState(true)
  const [saving,        setSaving]       = useState(false)
  const [existingData,  setExistingData] = useState(null)
  // originalStatus captured at load time — drives the resubmit decision
  const [originalStatus, setOriginalStatus] = useState(null)

  // ── Load & guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rrfId) {
      toast.error('Invalid RRF ID')
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const response = await rrfApi.getById(rrfId)
        const rrf = response?.data || response

        if (!rrf) {
          toast.error('RRF not found')
          return
        }

        // ── Status guard — block editing for disallowed statuses ──────────────
        const status = String(rrf.status || '').toLowerCase()
        if (!HM_EDITABLE_STATUSES.includes(status)) {
          toast.error(`This RRF (status: ${rrf.status}) cannot be edited.`)
          router.replace(`/requests/${rrfId}`)
          return
        }

        setOriginalStatus(status)

        // ── Map backend entity → ModernRRFForm initialData shape ──────────────
        const toArr = (v) =>
          Array.isArray(v) ? v : v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []

        const toDateStr = (v) =>
          v ? new Date(v).toISOString().split('T')[0] : ''

        setExistingData({
          entity:               rrf.entity             || '',
          organisation:         rrf.organisation       || 'DataFortune',
          function:             rrf.function           || '',
          subFunction:          rrf.subFunction        || '',
          requisitionType:      rrf.requisitionType    || '',
          nonBillableSubType:   rrf.nonBillableSubType || '',
          customerName:         rrf.customerName       || '',
          projectName:          rrf.projectName        || '',
          // ModernRRFForm field name for job title
          jobTitle:             rrf.positionTitle      || rrf.jobTitle || '',
          billingRate:          rrf.billingRate        || '',
          billingCurrency:      rrf.billingCurrency    || 'USD',
          // ModernRRFForm uses billingStartDate; HM backend stores either field —
          // load from whichever is populated (anticipatedBillingStartDate takes precedence)
          billingStartDate:     toDateStr(rrf.anticipatedBillingStartDate || rrf.billingStartDate),
          expectedOnboardingDate: toDateStr(rrf.expectedOnboardingDate),
          positionType:         rrf.positionType       || '',
          employmentType:       rrf.employmentType     || '',
          positions:            rrf.headcount          || rrf.positions || '',
          priority:             rrf.priority           || '',
          workMode:             rrf.workMode           || '',
          location:             toArr(rrf.location),
          experienceMin:        rrf.experienceMin      ?? 0,
          experienceMax:        rrf.experienceMax      ?? 0,
          // ModernRRFForm conventions:
          //   technologies   = primary tech stack (rrf.technologies or rrf.requiredSkills)
          //   mustHaveSkills = required skills (rrf.requiredSkills or rrf.mustHaveSkills)
          //   niceToHaveSkills = preferred skills
          technologies:         toArr(rrf.technologies || rrf.requiredSkills),
          mustHaveSkills:       toArr(rrf.requiredSkills || rrf.mustHaveSkills),
          niceToHaveSkills:     toArr(rrf.preferredSkills || rrf.niceToHaveSkills),
          jobDescription:       rrf.jobDescription     || '',
          // ModernRRFForm stores urgencyReason as additionalNotes
          additionalNotes:      rrf.urgencyReason      || rrf.additionalNotes || '',
          interviewPanel:       Array.isArray(rrf.interviewPanel) ? rrf.interviewPanel : [],
        })
      } catch (err) {
        toast.error(err?.message || 'Failed to load RRF data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [rrfId])

  // ── HM-specific submit handler passed to ModernRRFForm via onSubmitOverride ──
  //
  // Preserves the two-phase save sequence:
  //   Phase 1 (always):   PUT  /rrf/:id            — update metadata
  //   Phase 2 (declined): POST /rrf/:id/submit     — resubmit → PENDING
  //
  // The backend submit() endpoint, on resubmission, atomically:
  //   • resets all RrfApprover records back to PENDING
  //   • clears declineReason, approvedAt, rejectedAt, comments
  //   • sets status = PENDING, submittedAt = now
  //   • appends statusHistory entry "Resubmitted after decline"
  //   • emits rrf.resubmitted → sends RRF_RESUBMITTED notifications to all approvers
  //
  const isDeclined = originalStatus === 'declined' || originalStatus === 'rejected'

  const handleUpdate = async (formData) => {
    setSaving(true)
    try {
      // Build payload using ModernRRFForm field conventions.
      // Arrays are joined to comma-strings (rrfApi.update runs sanitizeRrfPayload,
      // but we normalise here for explicitness and safety).
      const toStr = (v) =>
        Array.isArray(v) && v.length > 0
          ? v.join(', ')
          : typeof v === 'string' && v.trim()
            ? v
            : undefined

      const payload = {
        entity:                formData.entity          || undefined,
        organisation:          formData.organisation    || undefined,
        function:              formData.function        || undefined,
        subFunction:           formData.subFunction     || undefined,
        requisitionType:       formData.requisitionType || undefined,
        nonBillableSubType:    formData.nonBillableSubType || undefined,
        customerName:          formData.customerName    || undefined,
        projectName:           formData.projectName     || undefined,
        positionTitle:         formData.jobTitle,
        positionType:          formData.positionType    || undefined,
        employmentType:        formData.employmentType  || undefined,
        headcount:             Number(formData.positions) || 1,
        priority:              formData.priority        || undefined,
        workMode:              formData.workMode        || undefined,
        billingRate:           formData.billingRate ? Number(formData.billingRate) : undefined,
        billingCurrency:       formData.billingCurrency || undefined,
        // Send as billingStartDate (consistent with backend UpdateRrfDto)
        billingStartDate:      formData.billingStartDate || undefined,
        expectedOnboardingDate: formData.expectedOnboardingDate || undefined,
        location:              toStr(formData.location),
        experienceMin:         Number(formData.experienceMin) || 0,
        experienceMax:         Number(formData.experienceMax) || 0,
        // ModernRRFForm skill field → backend DTO field mapping:
        //   technologies   → technologies
        //   mustHaveSkills → requiredSkills
        //   niceToHaveSkills → preferredSkills
        technologies:          toStr(formData.technologies),
        requiredSkills:        toStr(formData.mustHaveSkills),
        preferredSkills:       toStr(formData.niceToHaveSkills),
        jobDescription:        formData.jobDescription  || '',
        // ModernRRFForm's additionalNotes maps to backend urgencyReason
        urgencyReason:         formData.additionalNotes || undefined,
        interviewPanel:        Array.isArray(formData.interviewPanel) ? formData.interviewPanel : [],
      }

      // ── Phase 1: PATCH — update metadata ────────────────────────────────
      const updateResponse = await rrfApi.update(rrfId, payload)
      if (updateResponse?.success === false) {
        toast.error(updateResponse?.message || 'Failed to update RRF')
        return
      }

      // ── Phase 2: Resubmit only for DECLINED / REJECTED ──────────────────
      if (isDeclined) {
        const submitResponse = await rrfApi.submit(rrfId)
        if (submitResponse?.success === false) {
          toast.error(submitResponse?.message || 'Changes saved but resubmission failed')
          router.push(`/requests/${rrfId}`)
          return
        }
        toast.success('RRF updated and resubmitted for approval!')
      } else {
        toast.success('RRF updated successfully!')
      }

      router.push(`/requests/${rrfId}`)
    } catch (err) {
      toast.error(err?.message || 'Failed to update RRF')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // ── Warning banner for declined resubmission (passed into ModernRRFForm) ────
  const declinedWarning = isDeclined ? (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
      <span className="flex-shrink-0 text-base">⚠</span>
      <span>
        This request was <strong>declined</strong>. Saving will resubmit it for approval —
        approver states will reset and approvers will be notified.
      </span>
    </div>
  ) : null

  // ── Render via ModernRRFForm ─────────────────────────────────────────────────
  return (
    <ModernRRFForm
      userRole="hiring-manager"
      isEditMode={true}
      initialData={existingData}
      onSubmitOverride={handleUpdate}
      isSavingOverride={saving}
      titleOverride="Edit Request"
      cancelPath={`/requests/${rrfId}`}
      submitLabelOverride={isDeclined ? 'Save & Resubmit' : null}
      warningBanner={declinedWarning}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY: LegacyHMEditRRFPage — original custom 3-step form
// Preserved until the ModernRRFForm-based implementation passes full validation.
// DO NOT delete until sign-off.
// To re-enable: change `export default HMEditRRFPage` above to export this instead.
// ─────────────────────────────────────────────────────────────────────────────

function LegacyHMEditRRFPage() {
  const params = useParams()
  const router = useRouter()
  const rrfId  = params.id

  const [loading,              setLoading]              = useState(true)
  const [saving,               setSaving]               = useState(false)
  const [currentStep,          setCurrentStep]          = useState(1)
  const [originalStatus,       setOriginalStatus]       = useState(null)  // track for resubmit logic
  const [selectedFunction,     setSelectedFunction]     = useState('')
  const [selectedSubFunction,  setSelectedSubFunction]  = useState('')
  const [selectedLocations,    setSelectedLocations]    = useState([])
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [showOtherInput,       setShowOtherInput]       = useState(false)
  const [otherLocation,        setOtherLocation]        = useState('')

  const [formData, setFormData] = useState({
    entity:                '',
    organisation:          'DataFortune',
    function:              '',
    subFunction:           '',
    requisitionType:       '',
    nonBillableSubType:    '',
    customerName:          '',
    projectName:           '',
    jobTitle:              '',
    billingRate:           '',
    billingCurrency:       'USD',
    anticipatedBillingStartDate: '',
    expectedOnboardingDate: '',
    positionType:          '',
    employmentType:        '',
    positions:             '',
    priority:              '',
    workMode:              '',
    location:              [],
    experienceMin:         0,
    experienceMax:         0,
    technologies:          [],
    mustHaveSkills:        [],
    niceToHaveSkills:      [],
    jobDescription:        '',
    additionalNotes:       '',
    urgencyReason:         '',
  })

  // ─── Load existing RRF ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!rrfId) { toast.error('Invalid RRF ID'); setLoading(false); return }

    const load = async () => {
      try {
        const response = await rrfApi.getById(rrfId)
        const rrf = response?.data || response
        if (!rrf) { toast.error('RRF not found'); return }

        // Guard: only allow editing in allowed statuses
        const status = String(rrf.status || '').toLowerCase()
        if (!HM_EDITABLE_STATUSES.includes(status)) {
          toast.error(`This RRF (status: ${rrf.status}) cannot be edited.`)
          router.replace(`/hiring-manager/view-rrf/${rrfId}`)
          return
        }

        setOriginalStatus(status)

        const locArr = Array.isArray(rrf.location)
          ? rrf.location
          : rrf.location
            ? String(rrf.location).split(',').map(l => l.trim()).filter(Boolean)
            : []

        const toArr = (v) =>
          Array.isArray(v) ? v : v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []

        const fn  = rrf.function    || ''
        const sfn = rrf.subFunction || ''

        setSelectedFunction(fn)
        setSelectedSubFunction(sfn)
        setSelectedLocations(locArr)

        setFormData({
          entity:                      rrf.entity             || '',
          organisation:                rrf.organisation       || 'DataFortune',
          function:                    fn,
          subFunction:                 sfn,
          requisitionType:             rrf.requisitionType    || '',
          nonBillableSubType:          rrf.nonBillableSubType || '',
          customerName:                rrf.customerName       || '',
          projectName:                 rrf.projectName        || '',
          jobTitle:                    rrf.positionTitle      || rrf.jobTitle || '',
          billingRate:                 rrf.billingRate        || '',
          billingCurrency:             rrf.billingCurrency    || 'USD',
          anticipatedBillingStartDate: rrf.anticipatedBillingStartDate || rrf.billingStartDate || '',
          expectedOnboardingDate:      rrf.expectedOnboardingDate || '',
          positionType:                rrf.positionType       || '',
          employmentType:              rrf.employmentType     || '',
          positions:                   rrf.headcount          || rrf.positions || '',
          priority:                    rrf.priority           || '',
          workMode:                    rrf.workMode           || '',
          location:                    locArr,
          experienceMin:               rrf.experienceMin      ?? 0,
          experienceMax:               rrf.experienceMax      ?? 0,
          technologies:                toArr(rrf.requiredSkills),
          mustHaveSkills:              toArr(rrf.mustHaveSkills),
          niceToHaveSkills:            toArr(rrf.niceToHaveSkills),
          jobDescription:              rrf.jobDescription     || '',
          additionalNotes:             rrf.additionalNotes    || '',
          urgencyReason:               rrf.urgencyReason      || '',
        })
      } catch (err) {
        toast.error(err?.message || 'Failed to load RRF data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [rrfId])

  // Close location dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (locationDropdownOpen && !e.target.closest('.loc-dropdown'))
        setLocationDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [locationDropdownOpen])

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))
  const handleChange = (e) => set(e.target.name, e.target.value)

  const handleFunctionChange = (e) => {
    const fn = e.target.value
    setSelectedFunction(fn)
    setSelectedSubFunction('')
    let updated = { ...formData, function: fn, subFunction: '' }
    if (fn === 'Support' || fn === 'Sales') updated.requisitionType = 'Non-Billable'
    setFormData(updated)
  }

  const handleSubFunctionChange = (e) => {
    const sfn = e.target.value
    setSelectedSubFunction(sfn)
    let updated = { ...formData, subFunction: sfn }
    if (sfn === 'PMO') updated.requisitionType = 'Non-Billable'
    setFormData(updated)
  }

  const handleRequisitionTypeChange = (e) => {
    const val = e.target.value
    let updated = { ...formData, requisitionType: val }
    if (val !== 'Non-Billable') updated = { ...updated, nonBillableSubType: '', expectedOnboardingDate: '' }
    if (val !== 'Billable')     updated = { ...updated, customerName: '', anticipatedBillingStartDate: '', billingRate: '' }
    setFormData(updated)
  }

  const handleNonBillableSubTypeChange = (e) => {
    const val = e.target.value
    let updated = { ...formData, nonBillableSubType: val }
    if (val === 'Bench') { updated.projectName = 'Bench'; updated.customerName = '' }
    else if (val !== 'Pipeline') { updated.projectName = '' }
    setFormData(updated)
  }

  const handleLocationToggle = (loc) => {
    let locs
    if (loc === 'Other') {
      if (selectedLocations.includes('Other')) {
        locs = selectedLocations.filter(l => l !== 'Other')
        setShowOtherInput(false); setOtherLocation('')
      } else {
        locs = [...selectedLocations, 'Other']
        setShowOtherInput(true)
      }
    } else {
      locs = selectedLocations.includes(loc)
        ? selectedLocations.filter(l => l !== loc)
        : [...selectedLocations, loc]
    }
    setSelectedLocations(locs)
    set('location', locs)
  }

  // ─── Validation per step ─────────────────────────────────────────────────────
  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.entity)          { toast.error('Entity is required'); return false }
      if (!formData.function)        { toast.error('Function is required'); return false }
      if (!formData.subFunction)     { toast.error('Sub Function is required'); return false }
      if (!formData.requisitionType) { toast.error('Requisition Type is required'); return false }
      if (formData.requisitionType === 'Non-Billable' && !formData.nonBillableSubType)
        { toast.error('Non-Billable Sub Type is required'); return false }
      if (!formData.jobTitle?.trim()) { toast.error('Position / Job Title is required'); return false }
    }
    if (step === 2) {
      if (!formData.positionType)              { toast.error('Position Type is required'); return false }
      if (!formData.employmentType)            { toast.error('Employment Type is required'); return false }
      if (!formData.positions)                 { toast.error('Number of Positions is required'); return false }
      if (!formData.priority)                  { toast.error('Priority is required'); return false }
      if (!formData.workMode)                  { toast.error('Work Mode is required'); return false }
      if (selectedLocations.length === 0)      { toast.error('At least one Location is required'); return false }
    }
    if (step === 3) {
      if (!formData.jobDescription || formData.jobDescription === '<p><br></p>')
        { toast.error('Job Description is required'); return false }
    }
    return true
  }

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep(s => s + 1) }
  const prevStep = () => setCurrentStep(s => s - 1)

  // ─── Save (and resubmit when coming from DECLINED) ───────────────────────────
  const isDeclined = originalStatus === 'declined' || originalStatus === 'rejected'

  const handleSave = async () => {
    if (!validateStep(3)) return
    setSaving(true)
    try {
      const payload = {
        entity:                      formData.entity,
        organisation:                formData.organisation,
        function:                    formData.function,
        subFunction:                 formData.subFunction,
        requisitionType:             formData.requisitionType,
        nonBillableSubType:          formData.nonBillableSubType        || undefined,
        customerName:                formData.customerName              || undefined,
        projectName:                 formData.projectName               || undefined,
        positionTitle:               formData.jobTitle,
        billingRate:                 formData.billingRate               || undefined,
        billingCurrency:             formData.billingCurrency           || undefined,
        anticipatedBillingStartDate: formData.anticipatedBillingStartDate || undefined,
        expectedOnboardingDate:      formData.expectedOnboardingDate    || undefined,
        positionType:                formData.positionType              || undefined,
        employmentType:              formData.employmentType            || undefined,
        headcount:                   Number(formData.positions)         || 1,
        priority:                    formData.priority                  || undefined,
        workMode:                    formData.workMode                  || undefined,
        location:                    Array.isArray(formData.location)
                                       ? formData.location.join(', ')
                                       : formData.location              || undefined,
        experienceMin:               Number(formData.experienceMin)     || 0,
        experienceMax:               Number(formData.experienceMax)     || 0,
        requiredSkills:              formData.technologies.join(', ')   || undefined,
        mustHaveSkills:              formData.mustHaveSkills.join(', ') || undefined,
        niceToHaveSkills:            formData.niceToHaveSkills.join(', ') || undefined,
        jobDescription:              formData.jobDescription            || undefined,
        additionalNotes:             formData.additionalNotes           || undefined,
        urgencyReason:               formData.urgencyReason             || undefined,
      }

      // Step 1: PATCH — update the RRF data
      const updateResponse = await rrfApi.update(rrfId, payload)
      if (updateResponse?.success === false) {
        toast.error(updateResponse?.message || 'Failed to update RRF')
        return
      }

      // Step 2: If coming from DECLINED, call submit to transition DECLINED → PENDING
      if (isDeclined) {
        const submitResponse = await rrfApi.submit(rrfId)
        if (submitResponse?.success === false) {
          toast.error(submitResponse?.message || 'Changes saved but resubmission failed')
          router.push(`/hiring-manager/view-rrf/${rrfId}`)
          return
        }
        toast.success('RRF updated and resubmitted for approval!')
      } else {
        toast.success('RRF updated successfully!')
      }

      router.push(`/hiring-manager/view-rrf/${rrfId}`)
    } catch (err) {
      toast.error(err?.message || 'Failed to update RRF')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // ─── Step indicators ─────────────────────────────────────────────────────────
  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const isActive    = currentStep === step.number
        const isCompleted = currentStep > step.number
        return (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isCompleted ? 'bg-green-100 text-green-700'
              : isActive  ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-400'
            }`}>
              {isCompleted
                ? <CheckOutlined className="text-xs" />
                : <Icon className="text-sm" />
              }
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{step.number}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <RightOutlined className={`mx-1 text-xs ${isCompleted ? 'text-green-400' : 'text-slate-300'}`} />
            )}
          </div>
        )
      })}
    </div>
  )

  // ─── Common field class helpers ──────────────────────────────────────────────
  const selectCls = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors'
  const inputCls  = 'w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors'
  const labelCls  = 'block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5'
  const required  = <span className="text-red-500 ml-0.5">*</span>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/hiring-manager/view-rrf/${rrfId}`)}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
          >
            <ArrowLeftOutlined /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Edit Request</h1>
            {isDeclined && (
              <p className="text-xs text-amber-600 font-medium mt-0.5">
                ⚠ This request was declined. Saving will resubmit it for approval.
              </p>
            )}
          </div>
        </div>
        {currentStep === 3 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-md"
          >
            {saving
              ? 'Saving…'
              : isDeclined
                ? <><SendOutlined /> Save & Resubmit</>
                : <><SaveOutlined /> Save Changes</>
            }
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        {stepIndicator}

        {/* ── Step 1: Requisition Details ── */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-3">Requisition Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Entity */}
              <div>
                <label className={labelCls}>Entity {required}</label>
                <select name="entity" value={formData.entity} onChange={handleChange} className={selectCls}>
                  <option value="">Select Entity</option>
                  {['DataFortune Inc', 'DataFortune LLC', 'DataFortune Pvt Ltd'].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Organisation */}
              <div>
                <label className={labelCls}>Organisation</label>
                <input name="organisation" value={formData.organisation} onChange={handleChange} className={inputCls} placeholder="DataFortune" />
              </div>

              {/* Function */}
              <div>
                <label className={labelCls}>Function {required}</label>
                <select value={selectedFunction} onChange={handleFunctionChange} className={selectCls}>
                  <option value="">Select Function</option>
                  {Object.keys(SUBFUNCTIONS).map(fn => <option key={fn}>{fn}</option>)}
                </select>
              </div>

              {/* Sub Function */}
              <div>
                <label className={labelCls}>Sub Function {required}</label>
                <select value={selectedSubFunction} onChange={handleSubFunctionChange} className={selectCls} disabled={!selectedFunction}>
                  <option value="">Select Sub Function</option>
                  {(SUBFUNCTIONS[selectedFunction] || []).map(sfn => <option key={sfn}>{sfn}</option>)}
                </select>
              </div>

              {/* Requisition Type */}
              <div>
                <label className={labelCls}>Requisition Type {required}</label>
                <select name="requisitionType" value={formData.requisitionType} onChange={handleRequisitionTypeChange} className={selectCls}>
                  <option value="">Select Type</option>
                  <option>Billable</option>
                  <option>Non-Billable</option>
                </select>
              </div>

              {/* Non-Billable Sub Type */}
              {formData.requisitionType === 'Non-Billable' && (
                <div>
                  <label className={labelCls}>Non-Billable Sub Type {required}</label>
                  <select name="nonBillableSubType" value={formData.nonBillableSubType} onChange={handleNonBillableSubTypeChange} className={selectCls}>
                    <option value="">Select Sub Type</option>
                    {['Bench', 'Pipeline', 'Internal'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              )}

              {/* Customer Name (Billable) */}
              {formData.requisitionType === 'Billable' && (
                <div>
                  <label className={labelCls}>Customer Name</label>
                  <input name="customerName" value={formData.customerName} onChange={handleChange} className={inputCls} placeholder="Customer / Client name" />
                </div>
              )}

              {/* Project Name */}
              <div>
                <label className={labelCls}>Project Name</label>
                <input name="projectName" value={formData.projectName} onChange={handleChange} className={inputCls} placeholder="Project name" />
              </div>

              {/* Job Title */}
              <div className="md:col-span-2">
                <label className={labelCls}>Position / Job Title {required}</label>
                <input name="jobTitle" value={formData.jobTitle} onChange={handleChange} className={inputCls} placeholder="e.g. Senior React Developer" />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={nextStep} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                Next <RightOutlined />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Position Details ── */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-3">Position Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Position Type {required}</label>
                <select name="positionType" value={formData.positionType} onChange={handleChange} className={selectCls}>
                  <option value="">Select</option>
                  {['New Position', 'Replacement', 'Expansion'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Employment Type {required}</label>
                <select name="employmentType" value={formData.employmentType} onChange={handleChange} className={selectCls}>
                  <option value="">Select</option>
                  {['Full-time', 'Contract', 'Part-time'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Number of Positions {required}</label>
                <input type="number" name="positions" value={formData.positions} onChange={handleChange} className={inputCls} min={1} />
              </div>

              <div>
                <label className={labelCls}>Priority {required}</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className={selectCls}>
                  <option value="">Select</option>
                  {['High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Work Mode {required}</label>
                <select name="workMode" value={formData.workMode} onChange={handleChange} className={selectCls}>
                  <option value="">Select</option>
                  {['On-site', 'Remote', 'Hybrid'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Location multi-select */}
              <div className="relative loc-dropdown">
                <label className={labelCls}>Location {required}</label>
                <button
                  type="button"
                  onClick={() => setLocationDropdownOpen(p => !p)}
                  className={`${inputCls} text-left flex items-center justify-between`}
                >
                  <span className={selectedLocations.length ? 'text-slate-800' : 'text-slate-400'}>
                    {selectedLocations.length ? selectedLocations.join(', ') : 'Select locations'}
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </button>
                {locationDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
                    {ALL_LOCATIONS.map(loc => (
                      <label key={loc} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm">
                        <input type="checkbox" checked={selectedLocations.includes(loc)} onChange={() => handleLocationToggle(loc)} className="rounded" />
                        {loc}
                      </label>
                    ))}
                    {showOtherInput && (
                      <div className="px-4 py-2">
                        <input
                          value={otherLocation}
                          onChange={e => {
                            setOtherLocation(e.target.value)
                            const locs = [...selectedLocations.filter(l => l !== 'Other'), e.target.value || 'Other']
                            setSelectedLocations(locs); set('location', locs)
                          }}
                          className={inputCls}
                          placeholder="Specify other location"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Experience Min (years)</label>
                <input type="number" name="experienceMin" value={formData.experienceMin} onChange={handleChange} className={inputCls} min={0} max={50} />
              </div>

              <div>
                <label className={labelCls}>Experience Max (years)</label>
                <input type="number" name="experienceMax" value={formData.experienceMax} onChange={handleChange} className={inputCls} min={0} max={50} />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className="px-5 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
                <ArrowLeftOutlined /> Back
              </button>
              <button onClick={nextStep} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                Next <RightOutlined />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Technical Skills ── */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-3">Technical Skills &amp; Job Description</h2>

            <div className="space-y-5">
              <div>
                <label className={labelCls}>Required Technologies</label>
                <TagInput
                  tags={formData.technologies}
                  onChange={(tags) => set('technologies', tags)}
                  placeholder="Type and press Enter to add skills"
                />
              </div>

              <div>
                <label className={labelCls}>Must-Have Skills</label>
                <TagInput
                  tags={formData.mustHaveSkills}
                  onChange={(tags) => set('mustHaveSkills', tags)}
                  placeholder="Type and press Enter"
                />
              </div>

              <div>
                <label className={labelCls}>Nice-to-Have Skills</label>
                <TagInput
                  tags={formData.niceToHaveSkills}
                  onChange={(tags) => set('niceToHaveSkills', tags)}
                  placeholder="Type and press Enter"
                />
              </div>

              <div>
                <label className={labelCls}>Job Description {required}</label>
                <RichTextEditor
                  value={formData.jobDescription}
                  onChange={(val) => set('jobDescription', val)}
                />
              </div>

              <div>
                <label className={labelCls}>Urgency Reason</label>
                <textarea
                  name="urgencyReason"
                  value={formData.urgencyReason}
                  onChange={handleChange}
                  rows={3}
                  className={inputCls}
                  placeholder="Why is this position urgent?"
                />
              </div>

              <div>
                <label className={labelCls}>Additional Notes</label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleChange}
                  rows={3}
                  className={inputCls}
                  placeholder="Any other notes for the approver"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={prevStep} className="px-5 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
                <ArrowLeftOutlined /> Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-md"
              >
                {saving
                  ? 'Saving…'
                  : isDeclined
                    ? <><SendOutlined /> Save &amp; Resubmit</>
                    : <><SaveOutlined /> Save Changes</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
