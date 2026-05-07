'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { rrfApi } from '@/lib/api/rrfApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import ModernRRFForm from '@/components/ModernRRFForm'

const HM_EDITABLE_STATUSES = ['draft', 'pending', 'submitted', 'declined', 'rejected', 'on-hold']

export default function HMEditRRFPage() {
  const params = useParams()
  const router = useRouter()
  const rrfId  = params.id

  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [existingData,  setExistingData]  = useState(null)
  const [originalStatus, setOriginalStatus] = useState(null)

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

        const status = String(rrf.status || '').toLowerCase()
        if (!HM_EDITABLE_STATUSES.includes(status)) {
          toast.error(`This RRF (status: ${rrf.status}) cannot be edited.`)
          router.replace(`/requests/${rrfId}`)
          return
        }

        setOriginalStatus(status)

        // Helper to convert comma-separated strings to arrays (what ModernRRFForm expects)
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
        console.error('Error loading RRF:', err)
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
      // Map frontend fields back to backend DTO
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

      // Step 1: Update the RRF
      const updateResponse = await rrfApi.update(rrfId, payload)
      if (updateResponse?.success === false) {
        throw new Error(updateResponse?.message || 'Update failed')
      }

      // Step 2: Handle Resubmission for Declined/Rejected RRFs
      const isDeclined = originalStatus === 'declined' || originalStatus === 'rejected'
      if (isDeclined) {
        const submitResponse = await rrfApi.submit(rrfId)
        if (submitResponse?.success === false) {
          toast.error('Saved successfully but resubmission failed. Please submit manually.')
        } else {
          toast.success('RRF updated and resubmitted for approval!')
        }
      } else {
        toast.success('RRF updated successfully!')
      }

      router.push(`/requests/${rrfId}`)
    } catch (err) {
      console.error('Error updating RRF:', err)
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
      userRole="hiring-manager"
      isEditMode={true}
      initialData={existingData}
      onSubmitOverride={handleUpdate}
      isSavingOverride={saving}
      titleOverride="Edit Request"
      cancelPath={`/requests/${rrfId}`}
    />
  )
}
