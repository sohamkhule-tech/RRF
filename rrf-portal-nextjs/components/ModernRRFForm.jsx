'use client'

import { useState, useEffect, useMemo } from 'react'
import { Select, Spin, Avatar } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CheckOutlined, RightOutlined, SaveOutlined, SendOutlined, ArrowLeftOutlined, BankOutlined, TeamOutlined, CodeOutlined, UserOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import TagInput from './TagInput'
import RichTextEditor from './RichTextEditor'
import DateInput from './DateInput'
import DependentDropdown from './DependentDropdown'
import { rrfApi } from '@/lib/api/rrfApi'
import { usersApi } from '@/lib/api/usersApi'
import { jobDescriptionsApi } from '@/lib/api/jobDescriptionsApi'
import { useFormConfig } from '@/hooks/useFormConfig'

export default function ModernRRFForm({ 
  userRole         = 'hiring-manager',
  initialData      = null,
  isEditMode       = false,
  onSubmitOverride = null,
  titleOverride    = null,
  cancelPath       = null,
  isSavingOverride = false
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { configs, loading: configsLoading, getConfig } = useFormConfig()
  
  // Debug: Log configs to verify structure and data flow
  useEffect(() => {
    console.log('=== CONFIGS DEBUG ===')
    console.log('CONFIGS:', configs)
    console.log('CONFIGS TYPE:', typeof configs)
    console.log('IS OBJECT:', configs && typeof configs === 'object')
    console.log('IS ARRAY:', Array.isArray(configs))
    console.log('CONFIG KEYS:', configs ? Object.keys(configs) : 'null')
    console.log('CONFIG VALUES:', configs ? Object.values(configs) : 'null')
    console.log('====================')
  }, [configs])
  
  
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
  
  // Job Description prefill state
  const [jdList, setJdList] = useState([])
  const [selectedJdId, setSelectedJdId] = useState('')
  const [loadingJds, setLoadingJds] = useState(false)
  const [jdFilterStatus, setJdFilterStatus] = useState('')
  
  // Interview Panel state
  const [suggestedInterviewers, setSuggestedInterviewers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loadingInterviewers, setLoadingInterviewers] = useState(false)
  
  // Base formData structure
  const getBaseFormData = () => ({
    managerName: user?.name || user?.username || '',
    entity: '',
    organisation: 'DataFortune',
    function: '',
    subFunction: '',
    subFunctionId: '',
    requisitionType: '',
    customerName: '',
    nonBillableSubType: '',
    projectName: '',
    jobTitle: '',
    billingRate: '',
    billingCurrency: 'USD',
    billingStartDate: '',
    expectedOnboardingDate: '',
    positionType: '',
    employmentType: '',
    positions: '',
    priority: '',
    location: [],  // ✅ Array default
    workMode: '',
    experienceMin: '',
    experienceMax: '',
    technologies: [],  // ✅ Array default
    mustHaveSkills: [],  // ✅ Array default
    niceToHaveSkills: [],  // ✅ Array default
    interviewPanel: [], // ✅ User IDs array
    jobDescription: '',
    additionalNotes: '',
    saveAsTemplate: false
  })
  
  const [formData, setFormData] = useState(getBaseFormData())

  // Fetch Job Descriptions when SubFunction changes
  useEffect(() => {
    const fetchJobDescriptions = async () => {
      // Clear current selection when fetching new templates
      setSelectedJdId('')
      
      try {
        setLoadingJds(true)
        // Fetch templates filtered by subFunction
        // Backend handles fallback to global templates if none found for subFunction
        const subFunction = formData.subFunction
        const data = await jobDescriptionsApi.getAll(subFunction)
        setJdList(data || [])
        
        // Update UX message based on returned data
        if (subFunction) {
          const hasMatch = data?.some(jd => jd.subFunction === subFunction)
          setJdFilterStatus(hasMatch 
            ? `Showing templates for ${subFunction}` 
            : `No ${subFunction} templates found. Showing global templates.`)
        } else {
          setJdFilterStatus('')
        }
      } catch (error) {
        console.error('Error fetching job descriptions:', error)
      } finally {
        setLoadingJds(false)
      }
    }
    
    fetchJobDescriptions()
  }, [formData.subFunction])

  // Fetch suggested interviewers when technologies change
  useEffect(() => {
    const fetchInterviewers = async () => {
      if (!formData.technologies || formData.technologies.length === 0) {
        setSuggestedInterviewers([]);
        return;
      }

      try {
        setLoadingInterviewers(true);
        const data = await rrfApi.getSuggestedInterviewers(formData.technologies);
        setSuggestedInterviewers(data || []);
      } catch (error) {
        console.error('Error fetching suggested interviewers:', error);
      } finally {
        setLoadingInterviewers(false);
      }
    };

    fetchInterviewers();
  }, [formData.technologies]);

  // Fetch all users for manual panel assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await usersApi.getAll();
        setAllUsers(res?.data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);
  
  // Initialize formData with dynamic fields from config (runs after configs loads)
  useEffect(() => {
    if (!configs || typeof configs !== 'object') {
      console.log('[FormData Init] Skipped - configs not ready')
      return
    }
    
    const configArray = Object.values(configs)
    if (configArray.length === 0) {
      console.log('[FormData Init] Skipped - no configs available')
      return
    }
    
    console.log('[FormData Init] Adding dynamic fields from', configArray.length, 'configs')
    
    setFormData(prevData => {
      const updatedData = { ...prevData }
      let addedFields = 0
      
      configArray.forEach(config => {
        if (config?.fieldName && !updatedData.hasOwnProperty(config.fieldName)) {
          // ✅ FIX: Initialize arrays as [], not as ''
          if (config.type === 'multi-select' || config.type === 'tags') {
            updatedData[config.fieldName] = []
          } else {
            updatedData[config.fieldName] = config.type === 'dropdown' ? '' : ''
          }
          addedFields++
        }
      })
      
      console.log('[FormData Init] Added', addedFields, 'dynamic fields')
      return updatedData
    })
  }, [configs])
  
  // Initialize from initialData if provided (Edit Mode)
  useEffect(() => {
    if (initialData) {
      console.log('[ModernRRFForm] Initializing with data:', initialData)
      setFormData(prev => ({ ...prev, ...initialData }))
      
      if (initialData.requisitionType) setRequisitionType(initialData.requisitionType)
      if (initialData.nonBillableSubType) setNonBillableSubType(initialData.nonBillableSubType)
      if (initialData.function) setSelectedFunction(initialData.function)
      if (initialData.subFunction) setSelectedSubFunction(initialData.subFunction)
      if (initialData.billingCurrency) setBillingCurrency(initialData.billingCurrency)
      if (initialData.billingRate) {
        setBillingRateType(initialData.billingRate === 'TBD' ? 'tbd' : 'amount')
      }
      if (initialData.location) {
        const locs = Array.isArray(initialData.location) 
          ? initialData.location 
          : String(initialData.location).split(',').map(s => s.trim()).filter(Boolean)
        setSelectedLocations(locs)
        if (locs.some(l => !['Pune', 'Chennai', 'Bengaluru', 'US'].includes(l))) {
           setShowOtherLocationInput(true)
           const other = locs.find(l => !['Pune', 'Chennai', 'Bengaluru', 'US', 'Other'].includes(l))
           if (other) setOtherLocation(other)
        }
      }
    }
  }, [initialData])
  
  // Helper function to render dynamic fields
  const renderDynamicField = (config) => {
    const skipFields = [
      'entity', 'function', 'subFunction', 'requisitionType', 'positionType', 
      'employmentType', 'priority', 'workMode', 'location', 'nonBillableSubType',
      'technologies', 'primaryTechnologies', 'mustHaveSkills', 'niceToHaveSkills',
      'jobDescription', 'additionalNotes', 'interviewPanel'
    ]
    if (skipFields.includes(config.fieldName)) {
      return null
    }
    
    if (config.type === 'dropdown') {
      const filteredOptions = config.options
      
      return (
        <div key={config.fieldName}>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {config.label} {config.isRequired && <span className="text-red-500">*</span>}
          </label>
          <select
            name={config.fieldName}
            value={formData[config.fieldName] || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
            required={config.isRequired}
          >
            <option value="">Select {config.label.toLowerCase()}</option>
            {filteredOptions?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      )
    } else if (config.type === 'text') {
      return (
        <div key={config.fieldName}>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {config.label} {config.isRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            name={config.fieldName}
            value={formData[config.fieldName] || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400"
            placeholder={`Enter ${config.label.toLowerCase()}`}
            required={config.isRequired}
          />
        </div>
      )
    }
    return null
  }

  const steps = [
    { number: 1, title: 'Requisition Details', icon: BankOutlined, description: 'Basic Information' },
    { number: 2, title: 'Position Details', icon: TeamOutlined, description: 'Role Requirements' },
    { number: 3, title: 'Technical Skills', icon: CodeOutlined, description: 'Skills & JD' }
  ]

  // SubFunction options based on selected Function
  const subfunctionOptions = {
    'Delivery': ['SGINTL', 'VR', 'PMO'],
    'Sales & Marketing': ['BDE', 'Sales', 'MR', 'Marketing'],
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
      setFormData(prev => ({ ...prev, customerName: '', projectName: '', billingStartDate: '', billingRate: '' }))
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
    
    if (value === 'Support' || value === 'Sales & Marketing') {
      // Support and Sales & Marketing are always Non-Billable
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

  const handleJdSelect = (e) => {
    const jdId = e.target.value
    setSelectedJdId(jdId)
    
    if (jdId) {
      const selectedJd = jdList.find(jd => jd.id === parseInt(jdId))
      if (selectedJd) {
        setFormData(prev => ({
          ...prev,
          jobDescription: selectedJd.description
        }))
        toast.success(`Job Description prefilled: ${selectedJd.title}`)
      }
    }
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
    if (e && e.preventDefault) e.preventDefault()
    
    // ✅ CRITICAL: Prevent premature Step 3 validation if user presses Enter on Step 1 or 2
    // Only allow submission when explicitly on Step 3
    if (currentStep !== 3) {
      console.log(`[Form] Prevented premature submission. Current step: ${currentStep}`)
      // Don't call nextStep here to avoid double validation
      // Just prevent the submit - user should use Next button
      return
    }
    
    // ✅ STEP 3 VALIDATION ONLY - Job Description & Technical Skills
    // Step 1 & 2 validations happen in nextStep() via validateStep()
    
    console.log('[Form] Step 3 - Final validation before submit')
    
    // Quill empty state is '<p><br></p>' — treat that as empty
    const isJobDescriptionEmpty =
      !formData.jobDescription ||
      formData.jobDescription.trim() === '' ||
      formData.jobDescription === '<p><br></p>'

    if (isJobDescriptionEmpty) {
      toast.error('Job Description is required. Please fill in the description before submitting.')
      return
    }

    // ✅ FIX ISSUE 1: Safe array length check
    if (!formData.technologies || !Array.isArray(formData.technologies) || formData.technologies.length === 0) {
      toast.error('Primary Technologies is required. Please add at least one technology.')
      return
    }

    // ✅ FIX ISSUE 1: Safe array length check
    if (!formData.mustHaveSkills || !Array.isArray(formData.mustHaveSkills) || formData.mustHaveSkills.length === 0) {
      toast.error('Must-Have Skills is required. Please add at least one skill.')
      return
    }
    
    // ✅ FIX ISSUE 2: Only validate Step 3 dynamic fields (technical fields)
    const missingFields = []
    if (configs && typeof configs === 'object') {
      Object.values(configs).forEach(config => {
        // Only validate technical/skill-related fields that appear in Step 3
        const step3Fields = ['certifications', 'tools', 'frameworks']
        if (step3Fields.includes(config.fieldName) && config?.isRequired && 
            (!formData[config.fieldName] || formData[config.fieldName] === '')) {
          missingFields.push(config.label)
        }
      })
    }
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`)
      return
    }
    
    try {
      // ─── Reusability Hook: If override provided, use it ───────────────────
      if (onSubmitOverride) {
        await onSubmitOverride(formData)
        return
      }

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
        subFunctionId: formData.subFunctionId ? parseInt(formData.subFunctionId) : undefined,
        
        department: formData.department || undefined,
        
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
        
        // Location (array to comma-separated string) - ✅ Safe array check
        location: (Array.isArray(formData.location) && formData.location.length > 0)
          ? formData.location.join(', ') 
          : (typeof formData.location === 'string' && formData.location.trim() !== '')
            ? formData.location
            : undefined,
        
        // Interview Panel (array of user IDs)
        interviewPanel: Array.isArray(formData.interviewPanel) ? formData.interviewPanel : [],
        
        // Skills (arrays to comma-separated strings)
        // IMPORTANT: Backend expects string, not array
        technologies: Array.isArray(formData.technologies) && formData.technologies.length > 0
          ? formData.technologies.join(', ')
          : (typeof formData.technologies === 'string' && formData.technologies.trim() !== '')
            ? formData.technologies
            : undefined,
        requiredSkills: Array.isArray(formData.mustHaveSkills) && formData.mustHaveSkills.length > 0
          ? formData.mustHaveSkills.join(', ')
          : (typeof formData.mustHaveSkills === 'string' && formData.mustHaveSkills.trim() !== '')
            ? formData.mustHaveSkills
            : undefined,
        preferredSkills: Array.isArray(formData.niceToHaveSkills) && formData.niceToHaveSkills.length > 0
          ? formData.niceToHaveSkills.join(', ')
          : (typeof formData.niceToHaveSkills === 'string' && formData.niceToHaveSkills.trim() !== '')
            ? formData.niceToHaveSkills
            : undefined,
        
        // Job Description (rich text HTML content)
        jobDescription: formData.jobDescription || '',
        
        // Template Logic
        saveAsTemplate: formData.saveAsTemplate || false,
        
        // Other optional fields
        urgencyReason: formData.additionalNotes || undefined,
        billingRate: formData.billingRate ? parseFloat(formData.billingRate) : undefined,
        billingCurrency: formData.billingCurrency || undefined,
        billingStartDate: formData.billingStartDate || undefined,
        expectedOnboardingDate: formData.expectedOnboardingDate || undefined,
      }
      
      // Add all dynamic fields from config
      // Skip UI-only skill field names that must not reach the backend DTO
      const _submitSkipFields = ['mustHaveSkills', 'niceToHaveSkills'];
      if (configs && typeof configs === 'object') {
        Object.values(configs).forEach(config => {
          if (config?.fieldName && !_submitSkipFields.includes(config.fieldName) &&
              formData.hasOwnProperty(config.fieldName) && 
              !backendData.hasOwnProperty(config.fieldName)) {
            backendData[config.fieldName] = formData[config.fieldName] || undefined
          }
        })
      }

      // ✅ FINAL PAYLOAD VALIDATION: Ensure no undefined fields have .length called on them
      Object.keys(backendData).forEach(key => {
        const value = backendData[key]
        // Convert any unexpected undefined/null to proper undefined
        if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          backendData[key] = undefined
        }
        // Ensure arrays are actually arrays
        if (value && !Array.isArray(value) && typeof value === 'object') {
          console.warn(`[RRF Submit] Field ${key} is an object, not array:`, value)
        }
      })
      
      // Remove all undefined fields to prevent backend errors
      Object.keys(backendData).forEach(key => {
        if (backendData[key] === undefined) {
          delete backendData[key]
        }
      })

      // Remove raw skill field names that backend DTO rejects (UI uses mustHaveSkills/niceToHaveSkills,
      // API expects requiredSkills/preferredSkills only)
      delete backendData.mustHaveSkills;
      delete backendData.niceToHaveSkills;

      console.log('FINAL RRF PAYLOAD', backendData);
      
      // DEBUG: Log exact payload being sent (remove when no longer needed)
      console.log('[RRF Submit] Final validated payload to POST /rrf:', JSON.stringify(backendData, null, 2))
      
      // ✅ Additional validation debug for key fields
      console.log('[RRF Submit] Key fields check:', {
        entity: backendData.entity,
        technologies: backendData.technologies,
        type: typeof backendData.technologies,
        isString: typeof backendData.technologies === 'string',
        length: backendData.technologies?.length || 0  // ✅ Safe with fallback
      })
      
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
      const submitResponse = await rrfApi.submit(rrfId)
      
      // The backend returns the updated RRF entity after submission. 
      // If PMO is submitting, it bypasses approval and gets an 'rrfNumber'.
      const submittedRrfData = submitResponse?.data?.data || submitResponse?.data || {}
      const finalDisplayId = submittedRrfData.rrfNumber || submittedRrfData.subId || subId || `REQ-${rrfId}`
      
      // Step 3: Clear localStorage draft reference if this was edited from drafts
      if (currentDraftId) {
        localStorage.removeItem(`rrf_draft_ref_${currentDraftId}`)
      }

      // Step 4: Redirect with toast notification
      const redirectPath = userRole === 'pmo' ? '/pmo' : '/hiring-manager/my-requests'
      toast.success(`RRF submitted successfully! ID: ${finalDisplayId}`)
      router.push(redirectPath)

    } catch (error) {
      console.error('[RRF Submit] Error details:', error)
      console.error('[RRF Submit] Error response:', error?.response)
      console.error('[RRF Submit] Error data:', error?.response?.data)
      
      // ✅ IMPROVED ERROR HANDLING: Show detailed backend error messages
      let errorMessage = 'Failed to submit RRF. Please try again.'
      
      if (error?.response?.data?.message) {
        // Backend validation error message
        errorMessage = error.response.data.message
      } else if (error?.message) {
        // General error message
        errorMessage = error.message
      }
      
      // If error mentions specific fields, show helpful message
      if (errorMessage.includes('Cannot read properties of undefined')) {
        errorMessage = 'Invalid form data. Please check all required fields and try again.'
      } else if (errorMessage.includes('validation')) {
        errorMessage = `Validation error: ${errorMessage}`
      }
      
      toast.error(`Submission failed: ${errorMessage}`, {
        duration: 5000,
        style: {
          maxWidth: '500px',
        },
      })
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
        
        department: formData.department || undefined,
        
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
        // ✅ FIX: Safe array check for location
        location: (Array.isArray(formData.location) && formData.location.length > 0)
          ? formData.location.join(', ')
          : (typeof formData.location === 'string' && formData.location.trim() !== '')
            ? formData.location
            : undefined,
        // IMPORTANT: Backend expects string, not array - convert empty arrays to undefined
        technologies: Array.isArray(formData.technologies) && formData.technologies.length > 0
          ? formData.technologies.join(', ')
          : (typeof formData.technologies === 'string' && formData.technologies.trim() !== '')
            ? formData.technologies
            : undefined,
        requiredSkills: Array.isArray(formData.mustHaveSkills) && formData.mustHaveSkills.length > 0
          ? formData.mustHaveSkills.join(', ')
          : (typeof formData.mustHaveSkills === 'string' && formData.mustHaveSkills.trim() !== '')
            ? formData.mustHaveSkills
            : undefined,
        preferredSkills: Array.isArray(formData.niceToHaveSkills) && formData.niceToHaveSkills.length > 0
          ? formData.niceToHaveSkills.join(', ')
          : (typeof formData.niceToHaveSkills === 'string' && formData.niceToHaveSkills.trim() !== '')
            ? formData.niceToHaveSkills
            : undefined,
        jobDescription: formData.jobDescription || '',
        saveAsTemplate: formData.saveAsTemplate || false,
        department: formData.department || undefined,
        urgencyReason: formData.additionalNotes || undefined,
        interviewPanel: Array.isArray(formData.interviewPanel) ? formData.interviewPanel : [],
      }
      
      // Add all dynamic fields from config
      if (configs && typeof configs === 'object') {
        // Skip UI-only skill field names that must not reach the backend DTO
        const _draftSkipFields = ['mustHaveSkills', 'niceToHaveSkills'];
        Object.values(configs).forEach(config => {
          if (config?.fieldName && !_draftSkipFields.includes(config.fieldName) &&
              formData.hasOwnProperty(config.fieldName) && 
              !backendData.hasOwnProperty(config.fieldName)) {
            // ✅ FIX: Convert array fields to strings if needed
            let fieldValue = formData[config.fieldName]
            if (Array.isArray(fieldValue)) {
              fieldValue = fieldValue.length > 0 ? fieldValue.join(', ') : undefined
            }
            backendData[config.fieldName] = fieldValue || undefined
          }
        })
      }
      
      // ✅ FINAL VALIDATION: Clean up payload before sending
      Object.keys(backendData).forEach(key => {
        if (backendData[key] === undefined || backendData[key] === null || backendData[key] === '') {
          delete backendData[key]
        }
      })

      // Remove raw skill field names that backend DTO rejects
      delete backendData.mustHaveSkills;
      delete backendData.niceToHaveSkills;

      console.log('FINAL RRF PAYLOAD', backendData);
      console.log('[RRF Draft] Final validated payload to POST /rrf:', JSON.stringify(backendData, null, 2))
      
      // DEBUG: Log specific fields that might cause validation errors
      console.log('[RRF Validation Debug]', {
        technologies: backendData.technologies,
        technologiesType: typeof backendData.technologies,
        requiredSkills: backendData.requiredSkills,
        preferredSkills: backendData.preferredSkills
      })

      const createResponse = await rrfApi.create(backendData)
      const newDraftId = createResponse.data.id
      setCurrentDraftId(newDraftId)

      const redirectPath = userRole === 'pmo' ? '/pmo' : '/hiring-manager/drafts'
      toast.success('Draft saved successfully!')
      router.push(redirectPath)
    } catch (error) {
      console.error('[RRF Draft] Error details:', error)
      console.error('[RRF Draft] Error response:', error?.response)
      console.error('[RRF Draft] Error data:', error?.response?.data)
      
      // ✅ IMPROVED ERROR HANDLING: Show detailed error messages
      let errorMessage = 'Failed to save draft. Please try again.'
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      if (errorMessage.includes('Cannot read properties of undefined')) {
        errorMessage = 'Invalid form data. Please check all fields and try again.'
      }
      
      toast.error(errorMessage, {
        duration: 5000,
        style: {
          maxWidth: '500px',
        },
      })
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
                : (draft.data.mustHaveSkills || '').split('n').filter(s => s.trim()),
              niceToHaveSkills: Array.isArray(draft.data.niceToHaveSkills)
                ? draft.data.niceToHaveSkills
                : (draft.data.niceToHaveSkills || '').split('n').filter(s => s.trim())
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
                
                department: rrf.department || '',
                
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

  // ✅ FIX ISSUE 2: Add step-by-step validation before moving to next step
  const validateStep = (step) => {
    const missingFields = []
    
    if (step === 1) {
      // Step 1: Requisition Details validation
      if (!formData.entity) missingFields.push('Entity')
      if (!formData.function) missingFields.push('Function')
      if (!formData.subFunction) missingFields.push('Sub-Function')
      if (!formData.requisitionType) missingFields.push('Requisition Type')
      if (!formData.jobTitle) missingFields.push('Job Title')
      
      // Validate dynamic config fields for Step 1
      if (configs && typeof configs === 'object') {
        Object.values(configs).forEach(config => {
          // Only validate fields that appear in Step 1 (organizational fields)
          const step1Fields = ['entity', 'department', 'costCenter']
          if (step1Fields.includes(config.fieldName) && config?.isRequired && 
              (!formData[config.fieldName] || formData[config.fieldName] === '')) {
            missingFields.push(config.label)
          }
        })
      }
    } else if (step === 2) {
      // Step 2: Position Details validation
      if (!formData.positions) missingFields.push('Number of Positions')
      if (!formData.positionType) missingFields.push('Position Type')
      if (!formData.employmentType) missingFields.push('Employment Type')
      if (!formData.priority) missingFields.push('Priority')
      if (!formData.workMode) missingFields.push('Work Mode')
      if (!formData.location || (Array.isArray(formData.location) && formData.location.length === 0)) {
        missingFields.push('Location')
      }
    } else if (step === 3) {
      // Step 3: Technical Skills validation (full validation before submit)
      // This validation happens in handleSubmit
      return { valid: true, missingFields: [] }
    }
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`, {
        duration: 4000,
      })
      return { valid: false, missingFields }
    }
    
    return { valid: true, missingFields: [] }
  }
  
  const nextStep = () => {
    console.log(`[Form] Attempting to move from Step ${currentStep} to Step ${currentStep + 1}`)
    
    // Validate current step before moving to next
    const validation = validateStep(currentStep)
    
    if (!validation.valid) {
      console.log(`[Form] Step ${currentStep} validation failed:`, validation.missingFields)
      return
    }
    
    if (validation.valid && currentStep < 3) {
      console.log(`[Form] Step ${currentStep} validation passed. Moving to next step.`)
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      console.log(`[Form] Moving back from Step ${currentStep} to Step ${currentStep - 1}`)
      setCurrentStep(currentStep - 1)
    }
  }

  const allLocations = getConfig('location')?.options || ['Pune', 'Chennai', 'Bengaluru', 'US', 'Other']

  const progressPercentage = (currentStep / 3) * 100

  // Loading guard: Show loading state while configs are being fetched
  if (configsLoading || !configs || typeof configs !== 'object') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading form configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4 md:py-8 px-3 md:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Subtle Header Banner */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-purple-900 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => {
                  const backPath = cancelPath || (userRole === 'pmo' ? '/pmo' : '/hiring-manager/dashboard')
                  router.push(backPath)
                }}
                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeftOutlined className="text-lg" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-semibold text-white truncate">
                  {titleOverride || (isEditMode ? 'Edit Request' : 'New Resource Requisition')}
                </h1>
                <p className="text-white/60 text-xs md:text-sm mt-1">
                  {isEditMode ? 'Modify requisition details' : `Submission Date: ${currentDate}`}
                </p>
              </div>
            </div>
            {currentStep === 3 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSavingOverride}
                className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-indigo-600 text-white font-bold rounded-lg md:rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-lg text-sm md:text-base"
              >
                {isSavingOverride ? 'Saving…' : <><SendOutlined /> {isEditMode ? 'Save Changes' : 'Submit Request'}</>}
              </button>
            )}
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
            <form onSubmit={(e) => e.preventDefault()}>
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

                  {/* Function & SubFunction - API-driven dependent dropdowns */}
                  <DependentDropdown
                    functionValue={formData.function}
                    subfunctionValue={formData.subFunction}
                    onFunctionChange={(id, name) => {
                      setSelectedFunction(name);
                      setSelectedSubFunction('');
                      setFormData(prev => {
                        const updated = { ...prev, function: name, subFunction: '', subFunctionId: '' };
                        if (name === 'Support' || name === 'Sales') {
                          updated.requisitionType = 'Non-Billable';
                          setRequisitionType('Non-Billable');
                        }
                        return updated;
                      });
                    }}
                    onSubfunctionChange={(id, name) => {
                      // Consolidate both ID and name change into state to avoid race conditions
                      setSelectedSubFunction(name);
                      setFormData(prev => {
                        const updated = { ...prev, subFunction: name, subFunctionId: id };
                        if (name === 'PMO') {
                          updated.requisitionType = 'Non-Billable';
                          setRequisitionType('Non-Billable');
                        }
                        return updated;
                      });
                    }}
                    mode="id"
                    required={true}
                  />

                  {/* Dynamic Fields for Step 1 */}
                  {configs && typeof configs === 'object' && 
                    Object.values(configs)
                      .filter(config => config?.step === 1)
                      .map(config => renderDynamicField(config))}

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

                  {/* Dynamic Fields for Step 2 */}
                  {configs && typeof configs === 'object' && 
                    Object.values(configs)
                      .filter(config => config?.step === 2)
                      .map(config => renderDynamicField(config))}

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
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      {getConfig('primaryTechnologies')?.label || getConfig('technologies')?.label || 'Primary Technologies'} <span className="text-red-500">*</span>
                    </label>
                    <Select
                      mode="multiple"
                      style={{ width: '100%' }}
                      placeholder="Select technologies from master list"
                      value={formData.technologies}
                      onChange={(values) => setFormData({ ...formData, technologies: values })}
                      className="modern-select-multiple"
                      size="large"
                      allowClear
                    >
                      {(getConfig('technologies')?.options || getConfig('primaryTechnologies')?.options || []).map(tech => (
                        <Select.Option key={tech} value={tech}>{tech}</Select.Option>
                      ))}
                    </Select>
                    <p className="text-[11px] text-slate-500">Manage these options in Admin &gt; Form Config</p>
                  </div>

                  {/* Dynamic Fields for Step 3 (Technical Requirements) */}
                  {configs && typeof configs === 'object' && 
                    Object.values(configs)
                      .filter(config => 
                        config?.step === 3 && 
                        config?.isActive !== false &&
                        !['technologies', 'primaryTechnologies', 'mustHaveSkills', 'niceToHaveSkills', 'jobDescription', 'additionalNotes', 'interviewPanel'].includes(config.fieldName)
                      )
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map(config => (
                        <div key={config.fieldName}>
                          {renderDynamicField(config)}
                        </div>
                      ))
                  }

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

                  {/* ─── Interview Panel Assignment Section ─────────────────── */}
                  <div className="bg-indigo-50/40 p-5 md:p-7 rounded-2xl border border-indigo-100/80 my-2">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <TeamOutlined className="text-indigo-600 text-lg" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Interview Panel</h3>
                        <p className="text-xs text-slate-500">Assign technical experts to evaluate candidates</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {/* suggested Row */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                          Suggested Interviewers 
                          {formData.technologies?.length > 0 && (
                            <span className="normal-case font-medium text-slate-400 font-sans">
                              (based on {formData.technologies.slice(0, 2).join(', ')}{formData.technologies.length > 2 ? '...' : ''})
                            </span>
                          )}
                        </label>
                        
                        <div className="flex flex-wrap gap-2.5 min-h-[44px]">
                          {loadingInterviewers ? (
                            <div className="flex items-center gap-3 py-2 px-1 text-slate-400 text-sm italic">
                              <Spin size="small" /> Finding technical experts...
                            </div>
                          ) : suggestedInterviewers.length > 0 ? (
                            suggestedInterviewers.map(interviewer => (
                              <button
                                key={interviewer.id}
                                type="button"
                                onClick={() => {
                                  const currentPanel = formData.interviewPanel || []
                                  if (currentPanel.includes(interviewer.id)) {
                                    setFormData({ 
                                      ...formData, 
                                      interviewPanel: currentPanel.filter(id => id !== interviewer.id) 
                                    })
                                  } else {
                                    setFormData({ 
                                      ...formData, 
                                      interviewPanel: [...currentPanel, interviewer.id] 
                                    })
                                  }
                                }}
                                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm transition-all border duration-200 shadow-sm ${
                                  formData.interviewPanel?.includes(interviewer.id)
                                    ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 ring-offset-1'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                                }`}
                              >
                                <Avatar 
                                  size={22} 
                                  icon={<UserOutlined />} 
                                  className={formData.interviewPanel?.includes(interviewer.id) ? 'bg-indigo-400' : 'bg-slate-200'}
                                />
                                <span className="font-medium">{interviewer.fullName}</span>
                                <span className="text-[10px] opacity-60 px-1.5 py-0.5 bg-black/5 rounded uppercase">
                                  {interviewer.role?.roleName || 'Interviewer'}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="w-full py-3 px-4 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs flex items-center gap-2">
                              {formData.technologies?.length > 0 
                                ? "No specific experts found for these technologies. Search manually below." 
                                : "Select Primary Technologies above to see suggestions."}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Manual Selection Dropdown */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Assigned Members (Search/Add More)
                        </label>
                        <Select
                          mode="multiple"
                          style={{ width: '100%' }}
                          placeholder="Search across all users..."
                          className="modern-select-multiple"
                          size="large"
                          value={formData.interviewPanel}
                          onChange={(vals) => setFormData({ ...formData, interviewPanel: vals })}
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={allUsers.map(u => ({
                            label: `${u.fullName} (${u.email}) - ${u.role?.roleName || ''}`,
                            value: u.id,
                          }))}
                          allowClear
                         />
                      </div>
                    </div>
                  </div>

                   {/* Prefilled Job Description Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Prefilled JD <span className="text-slate-500 text-xs font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedJdId}
                        onChange={handleJdSelect}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-slate-400 bg-white hover:border-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed pr-10"
                        disabled={loadingJds || !formData.subFunction}
                      >
                        <option value="">
                          {!formData.subFunction 
                            ? 'Select a Sub-Function on Step 1 to view templates' 
                            : loadingJds ? 'Fetching relevant templates...' : 'Choose a template to prefill'}
                        </option>
                        {jdList.map(jd => (
                          <option key={jd.id} value={jd.id}>
                            {jd.title} {jd.subFunction ? `(${jd.subFunction})` : ''}
                          </option>
                        ))}
                      </select>
                      {loadingJds && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                    {jdFilterStatus && (
                      <p className="text-xs text-indigo-600 mt-1.5 font-medium flex items-center gap-1">
                        <CheckOutlined className="text-[10px]" /> {jdFilterStatus}
                      </p>
                    )}
                    {!formData.subFunction && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium">
                        ⚠️ Please select a Sub-Function to see relevant JD templates
                      </p>
                    )}
                  </div>

                  {/* Job Description */}
                  <div className="space-y-4">
                    <RichTextEditor
                      value={formData.jobDescription}
                      onChange={(content) => {
                        if (content !== formData.jobDescription) {
                          setFormData({ ...formData, jobDescription: content });
                        }
                      }}
                      label="Job Description"
                      placeholder="Provide detailed job description including responsibilities and requirements..."
                      helperText="Use the toolbar to format text, add lists, and highlight important points"
                      minHeight="200px"
                    />

                    {/* Save as Template Checkbox */}
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors">
                      <div className="flex items-center h-5">
                        <input
                          id="saveAsTemplate"
                          type="checkbox"
                          checked={formData.saveAsTemplate}
                          onChange={(e) => setFormData({ ...formData, saveAsTemplate: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="saveAsTemplate" className="text-sm font-semibold text-slate-800 cursor-pointer">
                          Save this Job Description as a reusable template
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Future RRFs with the same Sub-Function will be able to select this JD from the dropdown above.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <RichTextEditor
                    value={formData.additionalNotes}
                    onChange={(content) => {
                      if (content !== formData.additionalNotes) {
                        setFormData({ ...formData, additionalNotes: content });
                      }
                    }}
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
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 md:px-8 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 flex-1 sm:flex-none"
                  >
                    <SendOutlined className="text-base" />
                    {isEditMode ? 'Save Changes' : 'Submit RRF'}
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








