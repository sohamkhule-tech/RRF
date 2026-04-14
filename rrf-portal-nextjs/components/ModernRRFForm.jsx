'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CheckOutlined, RightOutlined, SaveOutlined, SendOutlined, ArrowLeftOutlined, BankOutlined, TeamOutlined, CodeOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import TagInput from './TagInput'
import RichTextEditor from './RichTextEditor'
import DateInput from './DateInput'
import { rrfApi } from '@/lib/api/rrfApi'
import { useFormConfig } from '@/hooks/useFormConfig'

export default function ModernRRFForm({ userRole = 'hiring-manager' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { configs, getConfig } = useFormConfig()
  const [currentStep, setCurrentStep] = useState(1)
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [isEditingRrf, setIsEditingRrf] = useState(false)
  const [requisitionType, setRequisitionType] = useState('')
  const [nonBillableSubType, setNonBillableSubType] = useState('')
  const [selectedFunction, setSelectedFunction] = useState('')
  const [selectedSubFunction, setSelectedSubFunction] = useState('')
  const [selectedLocations, setSelectedLocations] = useState([])
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [showOtherLocationInput, setShowOtherLocationInput] = useState(false)
  const [otherLocation, setOtherLocation] = useState('')
  const [billingRateType, setBillingRateType] = useState('amount')
  const [billingCurrency, setBillingCurrency] = useState('USD')
  const [formData, setFormData] = useState({
    managerName: user?.name || user?.username || '',
    entity: '',
    organisation: 'DataFortune',
    function: '',
    subFunction: '',
    requisitionType: '',
    customerName: '',
    nonBillableSubType: '',
    projectName: '',
    jobTitle: '',
    billingRate: '',
    billingCurrency: 'USD',
    anticipatedBillingStartDate: '',
    expectedOnboardingDate: '',
    positionType: '',
    employmentType: '',
    positions: '',
    priority: '',
    location: [],
    workMode: '',
    experienceMin: '',
    experienceMax: '',
    technologies: [],
    mustHaveSkills: [],
    niceToHaveSkills: [],
    jobDescription: '',
    additionalNotes: ''
  })

  const steps = [
    { number: 1, title: 'Requisition Details', icon: BankOutlined, description: 'Basic Information' },
    { number: 2, title: 'Position Details', icon: TeamOutlined, description: 'Role Requirements' },
    { number: 3, title: 'Technical Skills', icon: CodeOutlined, description: 'Skills & JD' }
  ]

  // SubFunction options based on selected Function
  const subfunctionOptions = {
    'Delivery': ['SGINTL', 'VR', 'PMO'],
    'Sales': ['BDE', 'Sales', 'MR', 'Marketing'],
    'Support': ['Human Resources', 'Talent Acquisition', 'Accounts', 'IT Networking']
  }

  const handleRequisitionTypeChange = (e) => {
    const value = e.target.value
    setRequisitionType(value)
    setFormData({ ...formData, requisitionType: value })
    if (value !== 'Non-Billable') {
      setNonBillableSubType('')
      setFormData(prev => ({ ...prev, nonBillableSubType: '', projectName: '', expectedOnboardingDate: '' }))
    }
    if (value !== 'Billable') {
      setFormData(prev => ({ ...prev, customerName: '', projectName: '', anticipatedBillingStartDate: '', billingRate: '' }))
    }
  }

  const handleNonBillableSubTypeChange = (e) => {
    const value = e.target.value
    setNonBillableSubType(value)
    if (value === 'Bench') {
      setFormData({ ...formData, nonBillableSubType: value, projectName: 'Bench', customerName: '' })
    } else if (value === 'Pipeline') {
      setFormData({ ...formData, nonBillableSubType: value, projectName: '' })
    } else {
      setFormData({ ...formData, nonBillableSubType: value })
    }
  }

  const handleFunctionChange = (e) => {
    const value = e.target.value
    setSelectedFunction(value)
    setSelectedSubFunction('')
    
    // Auto-set requisition type based on function
    let updatedFormData = { ...formData, function: value, subFunction: '' }
    
    if (value === 'Support' || value === 'Sales') {
      // Support and Sales are always Non-Billable
      updatedFormData.requisitionType = 'Non-Billable'
      setRequisitionType('Non-Billable')
    } else if (value === 'Delivery') {
      // Delivery is switchable - don't auto-set, let user choose
      // Keep existing requisitionType if any
    }
    
    setFormData(updatedFormData)
  }

  const handleSubFunctionChange = (e) => {
    const value = e.target.value
    setSelectedSubFunction(value)
    
    let updatedFormData = { ...formData, subFunction: value }
    
    // PMO under Delivery is always Non-Billable
    if (value === 'PMO') {
      updatedFormData.requisitionType = 'Non-Billable'
      setRequisitionType('Non-Billable')
    }
    
    setFormData(updatedFormData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleLocationCheckbox = (location) => {
    let updatedLocations
    
    if (location === 'Other') {
      // Toggle Other checkbox
      if (selectedLocations.includes('Other')) {
        updatedLocations = selectedLocations.filter(loc => loc !== 'Other')
        setShowOtherLocationInput(false)
        setOtherLocation('')
      } else {
        updatedLocations = [...selectedLocations, 'Other']
        setShowOtherLocationInput(true)
      }
    } else {
      // Regular location - toggle normally
      if (selectedLocations.includes(location)) {
        updatedLocations = selectedLocations.filter(loc => loc !== location)
      } else {
        updatedLocations = [...selectedLocations, location]
      }
    }
    
    setSelectedLocations(updatedLocations)
    setFormData({ ...formData, location: updatedLocations })
  }

  // ============================================
  // WORKFLOW SYSTEM UPDATE - NEW SUBMIT FLOW
  // OLD CODE BACKED UP BELOW (DO NOT DELETE)
  // ============================================
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // ── Manual validation for fields that can't use native HTML5 required ──
    // (RichTextEditor and TagInput hidden-required inputs were removed because
    //  display:none elements cause "invalid form control not focusable" browser errors)

    // Quill empty state is '<p><br></p>' — treat that as empty
    const isJobDescriptionEmpty =
      !formData.jobDescription ||
      formData.jobDescription.trim() === '' ||
      formData.jobDescription === '<p><br></p>'

    if (isJobDescriptionEmpty) {
      toast.error('Job Description is required. Please fill in the description before submitting.')
      return
    }

    if (!formData.technologies || formData.technologies.length === 0) {
      toast.error('Primary Technologies is required. Please add at least one technology.')
      return
    }

    if (!formData.mustHaveSkills || formData.mustHaveSkills.length === 0) {
      toast.error('Must-Have Skills is required. Please add at least one skill.')
      return
    }
    
    try {
      // Map frontend fields to backend DTO fields
      // IMPORTANT: Strip empty string enum fields.
      // NestJS @IsOptional() only skips validation for null/undefined — NOT ""
      // Sending "" for an @IsEnum field causes a 400/500 validation error.
      const backendData = {
        // Required fields
        positionTitle: formData.jobTitle || '',
        headcount: parseInt(formData.positions) || 1,
        
        // Optional organizational fields
        entity: formData.entity || undefined,
        organisation: formData.organisation || undefined,
        function: formData.function || undefined,
        subFunction: formData.subFunction || undefined,
        
        // Requisition details — send undefined (not "") for unset enum values
        requisitionType: formData.requisitionType || undefined,
        customerName: formData.customerName || undefined,
        projectName: formData.projectName || undefined,
        nonBillableSubType: formData.nonBillableSubType || undefined,
        
        // Employment details — send undefined (not "") for unset enum values
        employmentType: formData.employmentType || undefined,
        positionType: formData.positionType || undefined,
        workMode: formData.workMode || undefined,
        priority: formData.priority || undefined,
        
        // Experience & Budget
        experienceMin: parseInt(formData.experienceMin) || 0,
        experienceMax: parseInt(formData.experienceMax) || 0,
        budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : undefined,
        
        // Location (array to comma-separated string)
        location: Array.isArray(formData.location) 
          ? formData.location.join(', ') 
          : formData.location || undefined,
        
        // Skills (arrays to comma-separated strings)
        requiredSkills: Array.isArray(formData.mustHaveSkills)
          ? formData.mustHaveSkills.join(', ')
          : formData.mustHaveSkills || undefined,
        preferredSkills: Array.isArray(formData.niceToHaveSkills)
          ? formData.niceToHaveSkills.join(', ')
          : formData.niceToHaveSkills || undefined,
        
        // Job Description (rich text HTML content)
        jobDescription: formData.jobDescription || '',
        
        // Other optional fields
        urgencyReason: formData.additionalNotes || undefined,
      }

      // DEBUG: Log exact payload being sent (remove when no longer needed)
      console.log('[RRF Submit] Payload to POST /rrf:', JSON.stringify(backendData, null, 2))
      
      // Step 1: Create or Update RRF
      let rrfId;
      let subId;
      
      // If we are editing an existing backend request, use update
      if (isEditingRrf && currentDraftId) {
        const updateResponse = await rrfApi.update(currentDraftId, backendData);
        rrfId = updateResponse.data?.id || currentDraftId;
        subId = updateResponse.data?.subId || 'Updated';
      } else {
        const createResponse = await rrfApi.create(backendData)
        rrfId = createResponse.data.id
        subId = createResponse.data.subId
      }
      
      // Step 2: Submit RRF (DRAFT → SUBMITTED)
      await rrfApi.submit(rrfId)
      
      // Step 3: Clear localStorage draft reference if this was edited from drafts
      if (currentDraftId) {
        localStorage.removeItem(`rrf_draft_ref_${currentDraftId}`)
      }

      // Step 4: Redirect with toast notification
      const redirectPath = userRole === 'pmo' ? '/pmo' : '/hiring-manager/my-requests'
      toast.success(`RRF submitted successfully! Submission ID: ${subId}`)
      router.push(redirectPath)

    } catch (error) {
      console.error('[RRF Submit] Error details:', error)
      // Show the actual backend error message if available
      const errorMessage = error.message || 'Failed to submit RRF. Please try again.'
      toast.error(`Submission failed: ${errorMessage}`)
    }
  }


  // Draft save — persists to backend as DRAFT status (not localStorage)
  const saveDraft = async () => {
    try {
      const backendData = {
        positionTitle: formData.jobTitle || 'Untitled Draft',
        headcount: parseInt(formData.positions) || 1,
        entity: formData.entity || undefined,
        organisation: formData.organisation || undefined,
        function: formData.function || undefined,
        subFunction: formData.subFunction || undefined,
        // Strip empty strings for enum fields — @IsOptional() only skips null/undefined, not ""
        requisitionType: formData.requisitionType || undefined,
        customerName: formData.customerName || undefined,
        projectName: formData.projectName || undefined,
        nonBillableSubType: formData.nonBillableSubType || undefined,
        employmentType: formData.employmentType || undefined,
        positionType: formData.positionType || undefined,
        workMode: formData.workMode || undefined,
        priority: formData.priority || undefined,
        experienceMin: parseInt(formData.experienceMin) || 0,
        experienceMax: parseInt(formData.experienceMax) || 0,
        budgetMin: formData.budgetMin ? parseFloat(formData.budgetMin) : undefined,
        budgetMax: formData.budgetMax ? parseFloat(formData.budgetMax) : undefined,
        location: Array.isArray(formData.location) ? formData.location.join(', ') : formData.location || undefined,
        requiredSkills: Array.isArray(formData.mustHaveSkills) ? formData.mustHaveSkills.join(', ') : formData.mustHaveSkills || undefined,
        preferredSkills: Array.isArray(formData.niceToHaveSkills) ? formData.niceToHaveSkills.join(', ') : formData.niceToHaveSkills || undefined,
        jobDescription: formData.jobDescription || '',
        department: formData.department || undefined,
        urgencyReason: formData.additionalNotes || undefined,
      }

      console.log('[RRF Draft] Payload to POST /rrf:', JSON.stringify(backendData, null, 2))

      const createResponse = await rrfApi.create(backendData)
      const newDraftId = createResponse.data.id
      setCurrentDraftId(newDraftId)

      const redirectPath = userRole === 'pmo' ? '/pmo' : '/hiring-manager/drafts'
      toast.success('Draft saved successfully!')
      router.push(redirectPath)
    } catch (error) {
      console.error('[RRF Draft] Error details:', error)
      toast.error(error.message || 'Failed to save draft. Please try again.')
    }
  }


  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownOpen && !event.target.closest('.location-dropdown-container')) {
        setLocationDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [locationDropdownOpen])

  // Auto-fill manager name from logged-in user
  useEffect(() => {
    if (user && !formData.managerName) {
      setFormData(prev => ({
        ...prev,
        managerName: user.name || user.username || ''
      }))
    }
  }, [user])

  // Load draft or existing RRF if draftId is present in URL
  useEffect(() => {
    const draftId = searchParams.get('draftId')
    if (!draftId) return;

    const loadData = async () => {
      try {
        let foundLocal = false;
        const savedDrafts = localStorage.getItem('rrf_drafts')
        if (savedDrafts) {
          const drafts = JSON.parse(savedDrafts)
          const draft = drafts.find(d => d.id === draftId)
          if (draft) {
            // Handle backward compatibility for skills (string to array conversion)
            foundLocal = true;
            const draftData = {
              ...draft.data,
              technologies: Array.isArray(draft.data.technologies)
                ? draft.data.technologies
                : (draft.data.technologies || '').split(',').map(t => t.trim()).filter(t => t),
              mustHaveSkills: Array.isArray(draft.data.mustHaveSkills) 
                ? draft.data.mustHaveSkills 
                : (draft.data.mustHaveSkills || '').split('\n').filter(s => s.trim()),
              niceToHaveSkills: Array.isArray(draft.data.niceToHaveSkills)
                ? draft.data.niceToHaveSkills
                : (draft.data.niceToHaveSkills || '').split('\n').filter(s => s.trim())
            }
            setFormData(draftData)
            setRequisitionType(draft.requisitionType || draft.data.requisitionType || '')
            setNonBillableSubType(draft.nonBillableSubType || draft.data.nonBillableSubType || '')
            setSelectedLocations(draft.selectedLocations || draft.data.location || [])
            setBillingRateType(draft.billingRateType || 'amount')
            setBillingCurrency(draft.billingCurrency || draft.data.billingCurrency || 'USD')
            setCurrentDraftId(draftId)
            setCurrentStep(draft.currentStep || 1)
          }
        }
        
        // If not found in local drafts, fetch from backend API
        if (!foundLocal) {
           const response = await rrfApi.getById(draftId)
           if (response.success && response.data) {
             const rrf = response.data;
             const mappedData = {
                managerName: rrf.createdBy?.fullName || rrf.createdBy?.username || '',
                entity: rrf.entity || '',
                organisation: rrf.organisation || 'DataFortune',
                function: rrf.function || '',
                subFunction: rrf.subFunction || '',
                requisitionType: rrf.requisitionType || '',
                customerName: rrf.customerName || '',
                nonBillableSubType: rrf.nonBillableSubType || '',
                projectName: rrf.projectName || '',
                jobTitle: rrf.positionTitle || '',
                billingRate: '', // Default empty mapping
                billingCurrency: 'USD',
                anticipatedBillingStartDate: '',
                expectedOnboardingDate: '',
                positionType: rrf.positionType || '',
                employmentType: rrf.employmentType || '',
                positions: rrf.headcount?.toString() || '1',
                priority: rrf.priority || 'Medium',
                location: rrf.location ? rrf.location.split(',').map(l => l.trim()) : [],
                workMode: rrf.workMode || '',
                experienceMin: rrf.experienceMin?.toString() || '',
                experienceMax: rrf.experienceMax?.toString() || '',
                technologies: rrf.technologies ? rrf.technologies.split(',').map(t => t.trim()).filter(t => t) : [],
                mustHaveSkills: rrf.requiredSkills ? rrf.requiredSkills.split(',').map(s => s.trim()).filter(s => s) : [],
                niceToHaveSkills: rrf.preferredSkills ? rrf.preferredSkills.split(',').map(s => s.trim()).filter(s => s) : [],
                jobDescription: rrf.jobDescription || '',
                additionalNotes: rrf.urgencyReason || '',
                budgetMin: rrf.budgetMin?.toString() || '',
                budgetMax: rrf.budgetMax?.toString() || ''
             };
             
             setFormData(prev => ({ ...prev, ...mappedData }));
             setRequisitionType(mappedData.requisitionType);
             setNonBillableSubType(mappedData.nonBillableSubType);
             setSelectedLocations(mappedData.location || []);
             setCurrentDraftId(draftId);
             setIsEditingRrf(true); // Flag to know we must call UPDATE, not CREATE
           }
        }
      } catch (error) {
        console.error('Error loading RRF for editing:', error)
      }
    }
    
    loadData();
  }, [searchParams])

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const allLocations = getConfig('location')?.options || ['Pune', 'Chennai', 'Bengaluru', 'US', 'Other']

  const progressPercentage = (currentStep / 3) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4 md:py-8 px-3 md:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Subtle Header Banner */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-purple-900 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => router.push(userRole === 'pmo' ? '/pmo' : '/hiring-manager/dashboard')}
                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeftOutlined className="text-lg" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-semibold text-white truncate">New Resource Requisition</h1>
                <p className="text-white/60 text-xs md:text-sm mt-1">Submission Date: {currentDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Stepper */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 mb-4 md:mb-6">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center" style={{ flex: '0 0 auto' }}>
                  <div className="flex flex-col items-center px-2 sm:px-4 md:px-8">
                    {/* Step Label */}
                    <div className={`text-[10px] md:text-xs font-bold mb-1 md:mb-2 ${
                      isActive ? 'text-indigo-600' : 
                      isCompleted ? 'text-emerald-600' : 
                      'text-slate-400'
                    }`}>
                      STEP {step.number}
                    </div>
                    
                    {/* Circle Icon */}
                    <div className={`
                      w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 mb-2 md:mb-3 text-base md:text-lg
                      ${isCompleted ? 'bg-emerald-500 text-white shadow-lg' : 
                        isActive ? 'bg-indigo-600 text-white shadow-lg ring-2 md:ring-4 ring-indigo-100' : 
                        'border-2 border-slate-300 bg-white text-slate-400'}
                    `}>
                      {isCompleted ? <CheckOutlined /> : <StepIcon />}
                    </div>
                    
                    {/* Title & Description */}
                    <div className="text-center">
                      <div className={`text-xs md:text-sm font-semibold ${
                        isActive ? 'text-slate-900' : 
                        isCompleted ? 'text-slate-700' : 
                        'text-slate-500'
                      }`}>
                        <span className="hidden sm:inline">{step.title}</span>
                        <span className="sm:hidden">Step {step.number}</span>
                      </div>
                      <div className="hidden md:block text-xs text-slate-400 mt-1">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Connecting Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-1 md:mx-4" style={{ marginTop: '20px', minWidth: '20px' }}>
                      <div className={`h-full transition-all duration-300 ${
                        currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1 bg-slate-100">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="p-4 md:p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Requisition Details */}
              {currentStep === 1 && (
                <div>
                  {/* Section Header */}
                  <div className="mb-6 md:mb-8 pb-4 md:pb-5 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BankOutlined className="text-indigo-600 text-lg" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800">Requisition Details</h2>
                        <p className="text-xs md:text-sm text-slate-500 mt-0.5">Basic information about the requisition</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-5 md:gap-y-6">
                  {/* Manager Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Manager Name <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-500 font-normal ml-2">(Auto-captured)</span>
                    </label>
                    <input
                      type="text"
                      name="managerName"
                      value={formData.managerName}
                      disabled
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed"
                      placeholder="Loading..."
                      required
                    />
                  </div>

                  {/* Entity */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Entity <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="entity"
                      value={formData.entity}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                      required
                    >
                      <option value="">Select {(getConfig('entity')?.label || 'entity').toLowerCase()}</option>
                      {getConfig('entity')?.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Organisation */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Organisation <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-500 font-normal ml-2">(Default)</span>
                    </label>
                    <input
                      type="text"
                      name="organisation"
                      value={formData.organisation}
                      disabled
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed"
                      required
                    />
                  </div>

                  {/* Function */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Function <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="function"
                      value={formData.function}
                      onChange={handleFunctionChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                      required
                    >
                      <option value="">Select {(getConfig('function')?.label || 'function').toLowerCase()}</option>
                      {getConfig('function')?.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* SubFunction */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Sub Function <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="subFunction"
                      value={formData.subFunction}
                      onChange={handleSubFunctionChange}
                      disabled={!selectedFunction}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-500"
                      required
                    >
                      <option value="">
                        {selectedFunction ? 'Select sub function' : 'Select function first'}
                      </option>
                      {selectedFunction && subfunctionOptions[selectedFunction]?.map(subFunc => (
                        <option key={subFunc} value={subFunc}>{subFunc}</option>
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
                    <select
                      name="requisitionType"
                      value={formData.requisitionType}
                      onChange={handleRequisitionTypeChange}
                      disabled={selectedFunction === 'Support' || selectedFunction === 'Sales' || selectedSubFunction === 'PMO'}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-600"
                      required
                    >
                      <option value="">Select {(getConfig('requisitionType')?.label || 'requisition type').toLowerCase()}</option>
                      {getConfig('requisitionType')?.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Non-Billable Sub Type */}
                  {requisitionType === 'Non-Billable' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Non-Billable Sub Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="nonBillableSubType"
                        value={nonBillableSubType}
                        onChange={handleNonBillableSubTypeChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                        required
                      >
                        <option value="">Select {(getConfig('nonBillableSubType')?.label || 'sub type').toLowerCase()}</option>
                        {getConfig('nonBillableSubType')?.options?.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Customer Name */}
                  {(requisitionType === 'Billable' || (requisitionType === 'Non-Billable' && nonBillableSubType === 'Pipeline')) && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Customer Name {requisitionType === 'Billable' && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                        placeholder="Enter customer name"
                        required={requisitionType === 'Billable'}
                      />
                    </div>
                  )}

                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Project Name {requisitionType === 'Billable' && <span className="text-red-500">*</span>}
                      {nonBillableSubType === 'Bench' && (
                        <span className="text-xs text-slate-500 font-normal ml-2">(Auto-set for Bench)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleChange}
                      disabled={nonBillableSubType === 'Bench'}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-600"
                      placeholder="Enter project name"
                      required={requisitionType === 'Billable'}
                    />
                  </div>

{/* Job Title - Always Visible */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Position / Job Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                        placeholder="e.g., React Developer, Senior Java Engineer"
                        required
                      />
                    </div>

                  {/* Billing Rate */}
                  {requisitionType === 'Billable' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Billing Rate (per day) <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={billingRateType}
                        onChange={(e) => {
                          setBillingRateType(e.target.value)
                          if (e.target.value === 'tbd') {
                            setFormData({ ...formData, billingRate: 'TBD' })
                          } else {
                            setFormData({ ...formData, billingRate: '' })
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] placeholder:text-gray-400 transition-all mb-3"
                      >
                        <option value="amount">Enter Amount</option>
                        <option value="tbd">TBD (To Be Determined)</option>
                      </select>
                      {billingRateType === 'amount' && (
                        <div className="space-y-3">
                          <select
                            value={billingCurrency}
                            onChange={(e) => {
                              setBillingCurrency(e.target.value)
                              setFormData({ ...formData, billingCurrency: e.target.value })
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="INR">INR (â‚¹)</option>
                          </select>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                              {billingCurrency === 'USD' ? '$' : 'â‚¹'}
                            </span>
                            <input
                              type="number"
                              name="billingRate"
                              value={formData.billingRate}
                              onChange={handleChange}
                              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] placeholder:text-gray-400 transition-all"
                              placeholder={billingCurrency === 'USD' ? 'e.g., 100' : 'e.g., 8000'}
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Anticipated Billing Start Date */}
                  {requisitionType === 'Billable' && (
                    <DateInput
                      label="Anticipated Billing Start Date"
                      name="billingStartDate"
                      value={formData.billingStartDate}
                      onChange={handleChange}
                      required={true}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  )}

                  {/* Expected Onboarding Date */}
                  {requisitionType === 'Non-Billable' && (
                    <DateInput
                      label="Expected Onboarding Date"
                      name="expectedOnboardingDate"
                      value={formData.expectedOnboardingDate}
                      onChange={handleChange}
                      required={true}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Position Details */}
            {currentStep === 2 && (
              <div>
                {/* Section Header */}
                <div className="mb-6 md:mb-8 pb-4 md:pb-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TeamOutlined className="text-indigo-600 text-lg" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-xl font-bold text-slate-800">Position Details</h2>
                      <p className="text-xs md:text-sm text-slate-500 mt-0.5">Role requirements, location, and position specifications</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-5 md:gap-y-6">
                  {/* Position Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {getConfig('positionType')?.label || 'Position Type'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="positionType"
                      value={formData.positionType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                      required
                    >
                      <option value="">Select {(getConfig('positionType')?.label || 'position type').toLowerCase()}</option>
                      {getConfig('positionType')?.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {getConfig('employmentType')?.label || 'Employment Type'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                      required
                    >
                      <option value="">Select {(getConfig('employmentType')?.label || 'employment type').toLowerCase()}</option>
                      {getConfig('employmentType')?.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Number of Positions */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Number of Positions <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="positions"
                      value={formData.positions}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                      placeholder="e.g., 2"
                      min="1"
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                      required
                    >
                      <option value="">Select {(getConfig('priority')?.label || 'priority').toLowerCase()}</option>
                      {getConfig('priority')?.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Work Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {getConfig('workMode')?.label || 'Work Mode'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="workMode"
                      value={formData.workMode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                      required
                    >
                      <option value="">Select {(getConfig('workMode')?.label || 'work mode').toLowerCase()}</option>
                      {getConfig('workMode')?.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Experience Required - Unified Section */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Experience Required (Years) <span className="text-red-500">*</span>
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        {/* Min Experience */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Min</label>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="number"
                                name="experienceMin"
                                value={formData.experienceMin}
                                onChange={(e) => {
                                  const value = Math.max(0, Math.min(50, parseInt(e.target.value) || 0))
                                  setFormData({ ...formData, experienceMin: value })
                                }}
                                className="w-20 px-2 py-1 pr-7 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                                max="50"
                                placeholder="0"
                                required
                              />
                              <div className="absolute right-0.5 top-0.5 flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, experienceMin: Math.min(50, (formData.experienceMin || 0) + 1) })}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, experienceMin: Math.max(0, (formData.experienceMin || 0) - 1) })}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">yrs</span>
                          </div>
                        </div>

                        <div className="text-slate-400 font-bold pt-5">—</div>

                        {/* Max Experience */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Max</label>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="number"
                                name="experienceMax"
                                value={formData.experienceMax}
                                onChange={(e) => {
                                  const value = Math.max(0, Math.min(50, parseInt(e.target.value) || 0))
                                  setFormData({ ...formData, experienceMax: value })
                                }}
                                className="w-20 px-2 py-1 pr-7 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                                max="50"
                                placeholder="10"
                                required
                              />
                              <div className="absolute right-0.5 top-0.5 flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, experienceMax: Math.min(50, (formData.experienceMax || 0) + 1) })}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, experienceMax: Math.max(0, (formData.experienceMax || 0) - 1) })}
                                  className="px-1 py-0 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">yrs</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Validation Error */}
                      {formData.experienceMin > formData.experienceMax && formData.experienceMax > 0 && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Min experience cannot exceed Max experience</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location - Full Width */}
                  {/* Location - Compact Tag-Based Selector */}
                  <div className="md:col-span-2 location-dropdown-container">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-start gap-3 flex-wrap">
                      {/* Selected Location Tags */}
                      {selectedLocations.map(location => (
                        <span 
                          key={location} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-indigo-50 text-indigo-700 font-medium border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          {location}
                          <button
                            type="button"
                            onClick={() => handleLocationCheckbox(location)}
                            className="ml-1 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      
                      {/* Add Location Dropdown Button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add location
                        </button>
                        
                        {/* Dropdown Menu */}
                        {locationDropdownOpen && (
                          <div className="absolute z-10 mt-2 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg">
                            {allLocations.map(location => (
                              <label 
                                key={location}
                                className={`flex items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${
                                  selectedLocations.includes(location) ? 'bg-indigo-50' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLocations.includes(location)}
                                  onChange={() => handleLocationCheckbox(location)}
                                  className="mr-3 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-700">{location}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Helper text */}
                    {selectedLocations.length === 0 && (
                      <p className="mt-1.5 text-xs text-slate-500">Click "+ Add location" to select one or more locations</p>
                    )}
                    
                    {/* Other Location Input */}
                    {showOtherLocationInput && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Specify Other Location
                        </label>
                        <input
                          type="text"
                          value={otherLocation}
                          onChange={(e) => setOtherLocation(e.target.value)}
                          placeholder="Enter location name"
                          className="w-full max-w-sm px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
                        />
                      </div>
                    )}
                  </div>


                </div>
              </div>
            )}

            {/* Step 3: Technical Skills */}
            {currentStep === 3 && (
              <div>
                {/* Section Header */}
                <div className="mb-6 md:mb-8 pb-4 md:pb-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CodeOutlined className="text-indigo-600 text-lg" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-xl font-bold text-slate-800">Technical Skills</h2>
                      <p className="text-xs md:text-sm text-slate-500 mt-0.5">Technical requirements, skill sets, and job description</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  {/* Primary Technologies */}
                  <TagInput
                    value={formData.technologies}
                    onChange={(tags) => setFormData({ ...formData, technologies: tags })}
                    label="Primary Technologies"
                    placeholder="Type a technology and press Enter or comma"
                    required={true}
                    helperText="Add technologies like React, Node.js, Python, etc."
                  />

                  {/* Must Have Skills */}
                  <TagInput
                    value={formData.mustHaveSkills}
                    onChange={(tags) => setFormData({ ...formData, mustHaveSkills: tags })}
                    label="Must-Have Skills"
                    placeholder="Type a skill and press Enter or comma"
                    helperText="Press Enter or comma to add. Backspace to remove last tag."
                    required
                  />

                  {/* Nice to Have Skills */}
                  <TagInput
                    value={formData.niceToHaveSkills}
                    onChange={(tags) => setFormData({ ...formData, niceToHaveSkills: tags })}
                    label="Nice-to-Have Skills"
                    placeholder="Type a skill and press Enter or comma"
                    helperText="Optional skills that would be beneficial"
                  />

                  {/* Job Description */}
                  <RichTextEditor
                    value={formData.jobDescription}
                    onChange={(content) => setFormData({ ...formData, jobDescription: content })}
                    label="Job Description"
                    placeholder="Provide detailed job description including responsibilities and requirements..."
                    helperText="Use the toolbar to format text, add lists, and highlight important points"
                    minHeight="200px"
                    required
                  />

                  {/* Additional Notes */}
                  <RichTextEditor
                    value={formData.additionalNotes}
                    onChange={(content) => setFormData({ ...formData, additionalNotes: content })}
                    label="Additional Notes"
                    placeholder="Any additional information or special requirements..."
                    helperText="Optional notes about the position or hiring process"
                    minHeight="150px"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-6 md:mt-10 pt-4 md:pt-6 border-t border-slate-200 gap-3">
              <button
                type="button"
                onClick={saveDraft}
                className="px-4 md:px-6 py-2.5 text-sm font-semibold text-indigo-600 bg-white hover:bg-indigo-50 border-2 border-indigo-200 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 order-2 sm:order-1"
              >
                <SaveOutlined className="text-base" />
                Save Draft
              </button>

              <div className="flex items-center gap-2 md:gap-3 order-1 sm:order-2">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-4 md:px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all duration-200 flex-1 sm:flex-none"
                  >
                    Back
                  </button>
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 md:px-8 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 flex-1 sm:flex-none"
                  >
                    Next
                    <RightOutlined className="text-base" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 md:px-8 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 flex-1 sm:flex-none"
                  >
                    <SendOutlined className="text-base" />
                    Submit RRF
                  </button>
                )}
              </div>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}








