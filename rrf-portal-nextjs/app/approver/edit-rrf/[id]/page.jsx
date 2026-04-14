'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckOutlined,
  RightOutlined,
  BankOutlined,
  TeamOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import toast from 'react-hot-toast'
import { rrfApi } from '@/lib/api/rrfApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import TagInput from '@/components/TagInput'
import RichTextEditor from '@/components/RichTextEditor'

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

export default function ApproverEditRRF() {
  const params  = useParams()
  const router  = useRouter()
  const rrfId   = params.id

  const [loading,              setLoading]             = useState(true)
  const [saving,               setSaving]              = useState(false)
  const [currentStep,          setCurrentStep]         = useState(1)
  const [selectedFunction,     setSelectedFunction]    = useState('')
  const [selectedSubFunction,  setSelectedSubFunction] = useState('')
  const [selectedLocations,    setSelectedLocations]   = useState([])
  const [locationDropdownOpen, setLocationDropdownOpen]= useState(false)
  const [showOtherInput,       setShowOtherInput]      = useState(false)
  const [otherLocation,        setOtherLocation]       = useState('')

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
    expectedOnboardingDate:'',
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

        // Normalize location to array
        const locArr = Array.isArray(rrf.location)
          ? rrf.location
          : rrf.location
            ? String(rrf.location).split(',').map(l => l.trim()).filter(Boolean)
            : []

        // Normalize array fields
        const toArr = (v) =>
          Array.isArray(v) ? v : v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []

        const fn  = rrf.function    || ''
        const sfn = rrf.subFunction || ''

        setSelectedFunction(fn)
        setSelectedSubFunction(sfn)
        setSelectedLocations(locArr)

        setFormData({
          entity:                      rrf.entity              || '',
          organisation:                rrf.organisation        || 'DataFortune',
          function:                    fn,
          subFunction:                 sfn,
          requisitionType:             rrf.requisitionType     || '',
          nonBillableSubType:          rrf.nonBillableSubType  || '',
          customerName:                rrf.customerName        || '',
          projectName:                 rrf.projectName         || '',
          jobTitle:                    rrf.positionTitle       || rrf.jobTitle || '',
          billingRate:                 rrf.billingRate         || '',
          billingCurrency:             rrf.billingCurrency     || 'USD',
          anticipatedBillingStartDate: rrf.anticipatedBillingStartDate || rrf.billingStartDate || '',
          expectedOnboardingDate:      rrf.expectedOnboardingDate || '',
          positionType:                rrf.positionType        || '',
          employmentType:              rrf.employmentType      || '',
          positions:                   rrf.headcount           || rrf.positions || '',
          priority:                    rrf.priority            || '',
          workMode:                    rrf.workMode            || '',
          location:                    locArr,
          experienceMin:               rrf.experienceMin       ?? 0,
          experienceMax:               rrf.experienceMax       ?? 0,
          technologies:                toArr(rrf.requiredSkills),
          mustHaveSkills:              toArr(rrf.mustHaveSkills),
          niceToHaveSkills:            toArr(rrf.niceToHaveSkills),
          jobDescription:              rrf.jobDescription      || '',
          additionalNotes:             rrf.additionalNotes     || '',
          urgencyReason:               rrf.urgencyReason       || '',
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
      if (locationDropdownOpen && !e.target.closest('.loc-dropdown')) setLocationDropdownOpen(false)
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
    if (fn === 'Support' || fn === 'Sales') {
      updated.requisitionType = 'Non-Billable'
    }
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
      if (!formData.jobTitle?.trim()){ toast.error('Position / Job Title is required'); return false }
    }
    if (step === 2) {
      if (!formData.positionType)     { toast.error('Position Type is required'); return false }
      if (!formData.employmentType)   { toast.error('Employment Type is required'); return false }
      if (!formData.positions)        { toast.error('Number of Positions is required'); return false }
      if (!formData.priority)         { toast.error('Priority is required'); return false }
      if (!formData.workMode)         { toast.error('Work Mode is required'); return false }
      if (selectedLocations.length === 0){ toast.error('At least one Location is required'); return false }
    }
    if (step === 3) {
      if (!formData.jobDescription || formData.jobDescription === '<p><br></p>')
        { toast.error('Job Description is required'); return false }
    }
    return true
  }

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep(s => s + 1) }
  const prevStep = () => setCurrentStep(s => s - 1)

  // ─── Save ────────────────────────────────────────────────────────────────────
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
        nonBillableSubType:          formData.nonBillableSubType || undefined,
        customerName:                formData.customerName       || undefined,
        projectName:                 formData.projectName        || undefined,
        positionTitle:               formData.jobTitle,
        billingRate:                 formData.billingRate        || undefined,
        billingCurrency:             formData.billingCurrency    || undefined,
        anticipatedBillingStartDate: formData.anticipatedBillingStartDate || undefined,
        expectedOnboardingDate:      formData.expectedOnboardingDate      || undefined,
        positionType:                formData.positionType       || undefined,
        employmentType:              formData.employmentType     || undefined,
        headcount:                   Number(formData.positions)  || 1,
        priority:                    formData.priority           || undefined,
        workMode:                    formData.workMode           || undefined,
        // Backend DTO expects a string for location — join the array
        location:                    Array.isArray(formData.location)
                                       ? formData.location.join(', ')
                                       : formData.location || undefined,
        experienceMin:               Number(formData.experienceMin) || 0,
        experienceMax:               Number(formData.experienceMax) || 0,
        // Backend DTO expects strings for skills — join the TagInput arrays
        requiredSkills:              formData.technologies.join(', ')    || undefined,
        mustHaveSkills:              formData.mustHaveSkills.join(', ')  || undefined,
        niceToHaveSkills:            formData.niceToHaveSkills.join(', ') || undefined,
        jobDescription:              formData.jobDescription     || undefined,
        additionalNotes:             formData.additionalNotes    || undefined,
        urgencyReason:               formData.urgencyReason      || undefined,
      }

      const response = await rrfApi.update(rrfId, payload)
      if (response?.success !== false) {
        toast.success('RRF updated successfully!')
        router.push(`/approver/view-rrf/${rrfId}`)
      } else {
        toast.error(response?.message || 'Failed to update RRF')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to update RRF')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const progress = (currentStep / 3) * 100

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* ── Header Banner ─────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-purple-900 rounded-2xl p-4 md:p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeftOutlined className="text-lg" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white">Edit RRF</h1>
                <p className="text-white/60 text-sm mt-1">Modify requisition details before approval</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">
              ✎ Approver Edit Mode
            </span>
          </div>
        </div>

        {/* ── Stepper ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 mb-6">
          <div className="flex items-center justify-center">
            {STEPS.map((step, idx) => {
              const Icon       = step.icon
              const isActive   = currentStep === step.number
              const isComplete = currentStep > step.number
              return (
                <div key={step.number} className="flex items-center" style={{ flex: '0 0 auto' }}>
                  <div className="flex flex-col items-center px-2 sm:px-4 md:px-8">
                    <div className={`text-xs font-bold mb-2 ${isActive ? 'text-indigo-600' : isComplete ? 'text-emerald-600' : 'text-slate-400'}`}>
                      STEP {step.number}
                    </div>
                    <div className={`w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 mb-3 text-base md:text-lg
                      ${isComplete ? 'bg-emerald-500 text-white shadow-lg' :
                        isActive   ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100' :
                        'border-2 border-slate-300 bg-white text-slate-400'}`}>
                      {isComplete ? <CheckOutlined /> : <Icon />}
                    </div>
                    <div className="text-center">
                      <div className={`text-xs sm:text-sm font-semibold ${isActive ? 'text-slate-900' : isComplete ? 'text-slate-700' : 'text-slate-500'}`}>
                        <span className="hidden sm:inline">{step.title}</span>
                        <span className="sm:hidden">Step {step.number}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 hidden sm:block">{step.description}</div>
                    </div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-1 sm:mx-4" style={{ marginTop: '20px', minWidth: '30px' }}>
                      <div className={`h-full transition-all duration-300 ${currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Form Card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Progress */}
          <div className="h-1 bg-slate-100">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-4 md:p-8">

            {/* ════ STEP 1 ════ */}
            {currentStep === 1 && (
              <div>
                <div className="mb-8 pb-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <BankOutlined className="text-indigo-600 text-lg" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Requisition Details</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Basic information about the requisition and organisational details</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">

                  {/* Entity */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Entity <span className="text-red-500">*</span></label>
                    <select name="entity" value={formData.entity} onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white">
                      <option value="">Select entity</option>
                      <option value="DataFortune Inc">DataFortune Inc</option>
                      <option value="Techfortune Inc">Techfortune Inc</option>
                    </select>
                  </div>

                  {/* Organisation */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Organisation <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-500 font-normal ml-2">(Default)</span>
                    </label>
                    <input name="organisation" value={formData.organisation} disabled
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed" />
                  </div>

                  {/* Function */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Function <span className="text-red-500">*</span></label>
                    <select value={formData.function} onChange={handleFunctionChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white">
                      <option value="">Select function</option>
                      <option value="Delivery">Delivery</option>
                      <option value="Sales">Sales</option>
                      <option value="Support">Support</option>
                    </select>
                  </div>

                  {/* Sub Function */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sub Function <span className="text-red-500">*</span></label>
                    <select value={formData.subFunction} onChange={handleSubFunctionChange}
                      disabled={!selectedFunction}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white disabled:bg-slate-50 disabled:cursor-not-allowed">
                      <option value="">{selectedFunction ? 'Select sub function' : 'Select function first'}</option>
                      {selectedFunction && SUBFUNCTIONS[selectedFunction]?.map(sf => (
                        <option key={sf} value={sf}>{sf}</option>
                      ))}
                    </select>
                  </div>

                  {/* Requisition Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Requisition Type <span className="text-red-500">*</span>
                      {(selectedFunction === 'Support' || selectedFunction === 'Sales' || selectedSubFunction === 'PMO') && (
                        <span className="text-xs text-slate-500 font-normal ml-2">(Auto-set)</span>
                      )}
                    </label>
                    <select value={formData.requisitionType} onChange={handleRequisitionTypeChange}
                      disabled={selectedFunction === 'Support' || selectedFunction === 'Sales' || selectedSubFunction === 'PMO'}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white disabled:bg-slate-50 disabled:cursor-not-allowed">
                      <option value="">Select requisition type</option>
                      <option value="Billable">Billable</option>
                      <option value="Non-Billable">Non-Billable</option>
                    </select>
                  </div>

                  {/* Non-Billable Sub Type */}
                  {formData.requisitionType === 'Non-Billable' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Non-Billable Sub Type <span className="text-red-500">*</span></label>
                      <select value={formData.nonBillableSubType} onChange={handleNonBillableSubTypeChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white">
                        <option value="">Select sub type</option>
                        <option value="Bench">Bench</option>
                        <option value="Pipeline">Pipeline</option>
                      </select>
                    </div>
                  )}

                  {/* Customer Name */}
                  {(formData.requisitionType === 'Billable' || (formData.requisitionType === 'Non-Billable' && formData.nonBillableSubType === 'Pipeline')) && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Customer Name {formData.requisitionType === 'Billable' && <span className="text-red-500">*</span>}
                      </label>
                      <input type="text" name="customerName" value={formData.customerName} onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                        placeholder="Enter customer name" />
                    </div>
                  )}

                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Project Name {formData.requisitionType === 'Billable' && <span className="text-red-500">*</span>}
                      {formData.nonBillableSubType === 'Bench' && <span className="text-xs text-slate-500 font-normal ml-2">(Auto-set for Bench)</span>}
                    </label>
                    <input type="text" name="projectName" value={formData.projectName} onChange={handleChange}
                      disabled={formData.nonBillableSubType === 'Bench'}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
                      placeholder="Enter project name" />
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Position / Job Title <span className="text-red-500">*</span></label>
                    <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                      placeholder="e.g., React Developer, Senior Java Engineer" />
                  </div>

                  {/* Billing Rate — Billable only */}
                  {formData.requisitionType === 'Billable' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Billing Rate (per day) <span className="text-red-500">*</span></label>
                      <div className="flex gap-3">
                        <select name="billingCurrency" value={formData.billingCurrency}
                          onChange={(e) => set('billingCurrency', e.target.value)}
                          className="w-28 px-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                          <option value="USD">USD ($)</option>
                          <option value="INR">INR (₹)</option>
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                            {formData.billingCurrency === 'USD' ? '$' : '₹'}
                          </span>
                          <input type="number" name="billingRate" value={formData.billingRate} onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            placeholder={formData.billingCurrency === 'USD' ? 'e.g., 100' : 'e.g., 8000'} min="0" step="0.01" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Billing Start Date */}
                  {formData.requisitionType === 'Billable' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Anticipated Billing Start Date <span className="text-red-500">*</span></label>
                      <input type="date" name="anticipatedBillingStartDate" value={formData.anticipatedBillingStartDate} onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white" />
                    </div>
                  )}

                  {/* Expected Onboarding Date */}
                  {formData.requisitionType === 'Non-Billable' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Expected Onboarding Date <span className="text-red-500">*</span></label>
                      <input type="date" name="expectedOnboardingDate" value={formData.expectedOnboardingDate} onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white" />
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ════ STEP 2 ════ */}
            {currentStep === 2 && (
              <div>
                <div className="mb-8 pb-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <TeamOutlined className="text-indigo-600 text-lg" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Position Details</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Role requirements, location, and position specifications</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">

                  {/* Position Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Position Type <span className="text-red-500">*</span></label>
                    <select name="positionType" value={formData.positionType} onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                      <option value="">Select position type</option>
                      <option value="New Position">New Position</option>
                      <option value="Replacement">Replacement</option>
                      <option value="Additional">Additional</option>
                    </select>
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type <span className="text-red-500">*</span></label>
                    <select name="employmentType" value={formData.employmentType} onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                      <option value="">Select employment type</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>

                  {/* Number of Positions */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Positions <span className="text-red-500">*</span></label>
                    <input type="number" name="positions" value={formData.positions} onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="e.g., 2" min="1" />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Priority <span className="text-red-500">*</span></label>
                    <select name="priority" value={formData.priority} onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                      <option value="">Select priority</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  {/* Work Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Work Mode <span className="text-red-500">*</span></label>
                    <select name="workMode" value={formData.workMode} onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                      <option value="">Select work mode</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>

                  {/* Experience */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Experience Required (Years) <span className="text-red-500">*</span></label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        {/* Min */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Min</label>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input type="number" value={formData.experienceMin}
                                onChange={(e) => set('experienceMin', Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                                className="w-20 px-2 py-1 pr-7 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0" max="50" placeholder="0" />
                              <div className="absolute right-0.5 top-0.5 flex flex-col">
                                <button type="button" onClick={() => set('experienceMin', Math.min(50, (formData.experienceMin || 0) + 1))}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 transition-colors">▲</button>
                                <button type="button" onClick={() => set('experienceMin', Math.max(0, (formData.experienceMin || 0) - 1))}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 transition-colors">▼</button>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500">yrs</span>
                          </div>
                        </div>

                        <div className="text-slate-400 font-bold pt-5">—</div>

                        {/* Max */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Max</label>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input type="number" value={formData.experienceMax}
                                onChange={(e) => set('experienceMax', Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                                className="w-20 px-2 py-1 pr-7 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0" max="50" placeholder="10" />
                              <div className="absolute right-0.5 top-0.5 flex flex-col">
                                <button type="button" onClick={() => set('experienceMax', Math.min(50, (formData.experienceMax || 0) + 1))}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 transition-colors">▲</button>
                                <button type="button" onClick={() => set('experienceMax', Math.max(0, (formData.experienceMax || 0) - 1))}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 transition-colors">▼</button>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500">yrs</span>
                          </div>
                        </div>
                      </div>
                      {formData.experienceMin > formData.experienceMax && formData.experienceMax > 0 && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <span>⚠️</span><span>Min experience cannot exceed Max experience</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="lg:col-span-2 loc-dropdown">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Location <span className="text-red-500">*</span></label>
                    <div className="flex items-start gap-3 flex-wrap">
                      {selectedLocations.map(loc => (
                        <span key={loc} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
                          {loc}
                          <button type="button" onClick={() => handleLocationToggle(loc)}
                            className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      <div className="relative">
                        <button type="button" onClick={() => setLocationDropdownOpen(o => !o)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add location
                        </button>
                        {locationDropdownOpen && (
                          <div className="absolute z-10 mt-2 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg">
                            {ALL_LOCATIONS.map(loc => (
                              <label key={loc}
                                className={`flex items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 ${selectedLocations.includes(loc) ? 'bg-indigo-50' : ''}`}>
                                <input type="checkbox" checked={selectedLocations.includes(loc)}
                                  onChange={() => handleLocationToggle(loc)}
                                  className="mr-3 w-4 h-4 text-indigo-600 border-slate-300 rounded" />
                                <span className="text-sm text-slate-700">{loc}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedLocations.length === 0 && (
                      <p className="mt-1.5 text-xs text-slate-500">Click "+ Add location" to select one or more locations</p>
                    )}
                    {showOtherInput && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Specify Other Location</label>
                        <input type="text" value={otherLocation} onChange={(e) => setOtherLocation(e.target.value)}
                          placeholder="Enter location name"
                          className="w-full max-w-sm px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white" />
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* ════ STEP 3 ════ */}
            {currentStep === 3 && (
              <div>
                <div className="mb-8 pb-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <CodeOutlined className="text-indigo-600 text-lg" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Technical Skills</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Technical requirements, skill sets, and detailed job description</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <TagInput
                    value={formData.technologies}
                    onChange={(tags) => set('technologies', tags)}
                    label="Primary Technologies"
                    placeholder="Type a technology and press Enter or comma"
                    helperText="Add technologies like React, Node.js, Python, etc."
                  />
                  <TagInput
                    value={formData.mustHaveSkills}
                    onChange={(tags) => set('mustHaveSkills', tags)}
                    label="Must-Have Skills"
                    placeholder="Type a skill and press Enter or comma"
                    helperText="Press Enter or comma to add. Backspace to remove last tag."
                  />
                  <TagInput
                    value={formData.niceToHaveSkills}
                    onChange={(tags) => set('niceToHaveSkills', tags)}
                    label="Nice-to-Have Skills"
                    placeholder="Type a skill and press Enter or comma"
                    helperText="Optional skills that would be beneficial"
                  />
                  <RichTextEditor
                    value={formData.jobDescription}
                    onChange={(content) => set('jobDescription', content)}
                    label="Job Description"
                    placeholder="Provide detailed job description including responsibilities and requirements..."
                    helperText="Use the toolbar to format text, add lists, and highlight important points"
                    minHeight="200px"
                    required
                  />
                  <RichTextEditor
                    value={formData.additionalNotes}
                    onChange={(content) => set('additionalNotes', content)}
                    label="Additional Notes"
                    placeholder="Any additional information or special requirements..."
                    helperText="Optional notes about the position or hiring process"
                    minHeight="150px"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Urgency Reason / Notes</label>
                    <textarea name="urgencyReason" value={formData.urgencyReason} onChange={handleChange} rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all"
                      placeholder="Any urgent requirements..." />
                  </div>
                </div>
              </div>
            )}

            {/* ── Footer Buttons ───────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 sm:mt-10 pt-6 border-t border-slate-200 gap-3">
              <div className="text-sm text-slate-500">Step {currentStep} of 3</div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {currentStep > 1 && (
                  <button type="button" onClick={prevStep}
                    className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all">
                    Back
                  </button>
                )}
                {currentStep < 3 ? (
                  <button type="button" onClick={nextStep}
                    className="flex-1 sm:flex-initial px-6 sm:px-8 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                    Next <RightOutlined className="text-base" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSave} disabled={saving}
                    className="flex-1 sm:flex-initial px-6 sm:px-8 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-50">
                    <SaveOutlined className="text-base" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
