'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { rrfApi } from '@/lib/api/rrfApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import ModernRRFForm from '@/components/ModernRRFForm'

export default function ApproverEditRRF() {
  const params  = useParams()
  const router  = useRouter()
  const rrfId   = params.id

  const [loading,       setLoading]      = useState(true)
  const [saving,        setSaving]       = useState(false)
  const [existingData,  setExistingData] = useState(null)

  useEffect(() => {
    if (!rrfId) {
      toast.error('Invalid RRF ID')
      setLoading(false)
      return
    }

    const loadRRF = async () => {
      try {
        const response = await rrfApi.getById(rrfId)
        const rrf = response?.data || response
        
        if (!rrf) {
          toast.error('RRF not found')
          return
        }

        // Provider shared helper to convert backend comma-strings to frontend arrays
        const toArr = (v) => 
          Array.isArray(v) ? v : v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []

        // Map Backend Entity to Frontend Form State
        const mappedData = {
          entity:                      rrf.entity             || '',
          organisation:                rrf.organisation       || 'DataFortune',
          function:                    rrf.function           || '',
          subFunction:                 rrf.subFunction        || '',
          requisitionType:             rrf.requisitionType    || '',
          nonBillableSubType:          rrf.nonBillableSubType || '',
          customerName:                rrf.customerName       || '',
          projectName:                 rrf.projectName        || '',
          jobTitle:                    rrf.positionTitle      || rrf.jobTitle || '',
          billingRate:                 rrf.billingRate        || '',
          billingCurrency:             rrf.billingCurrency    || 'USD',
          billingStartDate:            (rrf.billingStartDate || rrf.anticipatedBillingStartDate) ? new Date(rrf.billingStartDate || rrf.anticipatedBillingStartDate).toISOString().split('T')[0] : '',
          expectedOnboardingDate:      rrf.expectedOnboardingDate ? new Date(rrf.expectedOnboardingDate).toISOString().split('T')[0] : '',
          positionType:                rrf.positionType       || '',
          employmentType:              rrf.employmentType     || '',
          positions:                   rrf.headcount          || rrf.positions || '',
          priority:                    rrf.priority           || '',
          workMode:                    rrf.workMode           || '',
          location:                    toArr(rrf.location),
          experienceMin:               rrf.experienceMin      ?? 0,
          experienceMax:               rrf.experienceMax      ?? 0,
          technologies:                toArr(rrf.technologies || rrf.requiredSkills),
          mustHaveSkills:              toArr(rrf.requiredSkills || rrf.mustHaveSkills),
          niceToHaveSkills:            toArr(rrf.preferredSkills || rrf.niceToHaveSkills),
          jobDescription:              rrf.jobDescription     || '',
          additionalNotes:             rrf.urgencyReason      || '',
          interviewPanel:              Array.isArray(rrf.interviewPanel) ? rrf.interviewPanel : [],
        }

        setExistingData(mappedData)
      } catch (err) {
        console.error('Error loading RRF for approver edit:', err)
        toast.error('Failed to load RRF details')
      } finally {
        setLoading(false)
      }
    }

    loadRRF()
  }, [rrfId])

  const handleUpdate = async (formData) => {
    setSaving(true)
    try {
      const payload = {
        entity:                      formData.entity || undefined,
        organisation:                formData.organisation || undefined,
        function:                    formData.function || undefined,
        subFunction:                 formData.subFunction || undefined,
        requisitionType:             formData.requisitionType || undefined,
        nonBillableSubType:          formData.nonBillableSubType || undefined,
        customerName:                formData.customerName || undefined,
        projectName:                 formData.projectName || undefined,
        positionTitle:               formData.jobTitle,
        positionType:                formData.positionType || undefined,
        employmentType:              formData.employmentType || undefined,
        headcount:                   Number(formData.positions) || 1,
        priority:                    formData.priority || undefined,
        workMode:                    formData.workMode || undefined,
        billingRate:                 formData.billingRate ? Number(formData.billingRate) : undefined,
        billingCurrency:             formData.billingCurrency || undefined,
        billingStartDate:            formData.billingStartDate || undefined,
        expectedOnboardingDate:       formData.expectedOnboardingDate || undefined,
        location:                    formData.location.join(', ') || undefined,
        experienceMin:               Number(formData.experienceMin) || 0,
        experienceMax:               Number(formData.experienceMax) || 0,
        technologies:                formData.technologies.join(', ') || undefined,
        requiredSkills:              formData.mustHaveSkills.join(', ') || undefined,
        preferredSkills:             formData.niceToHaveSkills.join(', ') || undefined,
        jobDescription:              formData.jobDescription || '',
        urgencyReason:               formData.additionalNotes || undefined,
        interviewPanel:              Array.isArray(formData.interviewPanel) ? formData.interviewPanel : [],
      }

      const response = await rrfApi.update(rrfId, payload)
      if (response && (response.success || response.id || response.data)) {
        toast.success('RRF updated successfully!')
        router.push(`/approver/view-rrf/${rrfId}`)
      } else {
        throw new Error('Update failed')
      }
    } catch (err) {
      console.error('Error updating RRF by approver:', err)
      toast.error(err.message || 'Failed to update RRF')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <ModernRRFForm
      userRole="approver"
      isEditMode={true}
      initialData={existingData}
      onSubmitOverride={handleUpdate}
      isSavingOverride={saving}
      titleOverride="Edit RRF"
      cancelPath={`/approver/view-rrf/${rrfId}`}
    />
  )
}
