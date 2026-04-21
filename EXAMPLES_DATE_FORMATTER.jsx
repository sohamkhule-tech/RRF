/**
 * Example: Using Date Formatter in Components
 * 
 * This file shows common patterns for using the date formatter
 * across different component types in the RRF Portal
 */

import { formatDate, formatDateTime, formatDateShort, getTodayInputFormat } from '@/utils/dateFormatter'

// ============================================
// EXAMPLE 1: Table/List Display
// ============================================

export function RRFListTable({ rrfs }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>RRF ID</th>
          <th>Position</th>
          <th>Created Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rrfs.map(rrf => (
          <tr key={rrf.id}>
            <td>{rrf.rrfNumber}</td>
            <td>{rrf.positionTitle}</td>
            {/* Use formatDateShort for tables - more compact */}
            <td>{formatDateShort(rrf.createdAt)}</td>
            <td>{rrf.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================
// EXAMPLE 2: Detail View
// ============================================

export function RRFDetailView({ rrf }) {
  return (
    <div className="space-y-4">
      {/* Standard date display */}
      <div>
        <label className="font-semibold">Submitted Date:</label>
        <p>{formatDate(rrf.submittedAt)}</p>
        {/* Output: 16-04-2026 */}
      </div>

      {/* Date with time */}
      <div>
        <label className="font-semibold">Approved At:</label>
        <p>{formatDateTime(rrf.approvedAt)}</p>
        {/* Output: 16-04-2026, 14:30 */}
      </div>

      {/* With fallback for null values */}
      <div>
        <label className="font-semibold">Closed Date:</label>
        <p>{formatDate(rrf.closedAt, 'Not closed yet')}</p>
        {/* Output: Not closed yet (if null) */}
      </div>
    </div>
  )
}

// ============================================
// EXAMPLE 3: Form with Date Input
// ============================================

import { useState } from 'react'
import DateInput from '@/components/DateInput'

export function CreateRRFForm() {
  const [formData, setFormData] = useState({
    positionTitle: '',
    billingStartDate: '',  // YYYY-MM-DD format
    expectedOnboarding: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // formData.billingStartDate is already in YYYY-MM-DD
    // Send directly to backend
    const payload = {
      positionTitle: formData.positionTitle,
      billingStartDate: formData.billingStartDate,  // YYYY-MM-DD
      // ...other fields
    }

    await rrfApi.create(payload)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="positionTitle"
        value={formData.positionTitle}
        onChange={handleChange}
        placeholder="Position Title"
      />

      {/* Date input with calendar */}
      <DateInput
        label="Billing Start Date"
        name="billingStartDate"
        value={formData.billingStartDate}  // YYYY-MM-DD
        onChange={handleChange}
        required
        minDate={getTodayInputFormat()}  // Prevent past dates
      />

      <DateInput
        label="Expected Onboarding"
        name="expectedOnboarding"
        value={formData.expectedOnboarding}
        onChange={handleChange}
      />

      <button type="submit">Submit</button>
    </form>
  )
}

// ============================================
// EXAMPLE 4: Dashboard Cards
// ============================================

export function DashboardSummary({ stats }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card">
        <h3>Pending RRFs</h3>
        <p className="text-2xl">{stats.pendingCount}</p>
        <p className="text-sm text-gray-500">
          Last updated: {formatDateShort(stats.lastUpdate)}
        </p>
      </div>

      <div className="card">
        <h3>Approved This Week</h3>
        <p className="text-2xl">{stats.approvedCount}</p>
        <p className="text-sm text-gray-500">
          As of {formatDate(new Date())}
        </p>
      </div>
    </div>
  )
}

// ============================================
// EXAMPLE 5: API Response Formatting
// ============================================

// In your API utility (lib/api/rrfApi.js)
export const formatRrfForDisplay = (rrf) => {
  if (!rrf) return null

  return {
    id: rrf.id,
    rrfNumber: rrf.rrfNumber,
    positionTitle: rrf.positionTitle,
    
    // Format dates for display
    submittedDate: formatDate(rrf.submittedAt),
    approvedDate: formatDate(rrf.approvedAt),
    closedDate: formatDate(rrf.closedAt),
    
    // Keep original values for processing
    submittedAtRaw: rrf.submittedAt,
    approvedAtRaw: rrf.approvedAt,
    closedAtRaw: rrf.closedAt,
    
    // Other fields...
  }
}

// ============================================
// EXAMPLE 6: Conditional Date Display
// ============================================

export function StatusTimeline({ rrf }) {
  return (
    <div className="timeline">
      {/* Created */}
      <div className="timeline-item">
        <span className="label">Created:</span>
        <span className="value">{formatDateTime(rrf.createdAt)}</span>
      </div>

      {/* Submitted (if exists) */}
      {rrf.submittedAt && (
        <div className="timeline-item">
          <span className="label">Submitted:</span>
          <span className="value">{formatDateTime(rrf.submittedAt)}</span>
        </div>
      )}

      {/* Approved (if exists) */}
      {rrf.approvedAt && (
        <div className="timeline-item">
          <span className="label">Approved:</span>
          <span className="value">{formatDateTime(rrf.approvedAt)}</span>
        </div>
      )}

      {/* Declined (if exists) */}
      {rrf.declinedAt && (
        <div className="timeline-item">
          <span className="label">Declined:</span>
          <span className="value">{formatDateTime(rrf.declinedAt)}</span>
        </div>
      )}

      {/* Closed (if exists) */}
      {rrf.closedAt && (
        <div className="timeline-item">
          <span className="label">Closed:</span>
          <span className="value">{formatDateTime(rrf.closedAt)}</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// EXAMPLE 7: Export to CSV with Proper Dates
// ============================================

export function exportToCSV(rrfs) {
  const headers = ['RRF ID', 'Position', 'Submitted Date', 'Status']
  
  const rows = rrfs.map(rrf => [
    rrf.rrfNumber,
    rrf.positionTitle,
    formatDate(rrf.submittedAt),  // Export in DD-MM-YYYY
    rrf.status
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Download logic...
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `RRF_Report_${formatDate(new Date())}.csv`
  link.click()
}

// ============================================
// EXAMPLE 8: Filter by Date Range
// ============================================

import { daysBetween, isPastDate, isFutureDate } from '@/utils/dateFormatter'

export function FilterByDateRange() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filterRRFs = (rrfs) => {
    if (!startDate || !endDate) return rrfs

    return rrfs.filter(rrf => {
      const rrfDate = new Date(rrf.createdAt)
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      return rrfDate >= start && rrfDate <= end
    })
  }

  return (
    <div className="flex gap-4">
      <DateInput
        label="From"
        name="startDate"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      
      <DateInput
        label="To"
        name="endDate"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        minDate={startDate}  // End date can't be before start date
      />
    </div>
  )
}

// ============================================
// EXAMPLE 9: Urgency Badge Based on Date
// ============================================

export function UrgencyBadge({ expectedStartDate }) {
  const daysUntilStart = daysBetween(new Date(), expectedStartDate)

  let badgeColor = 'gray'
  let label = 'Normal'

  if (isPastDate(expectedStartDate)) {
    badgeColor = 'red'
    label = 'Overdue'
  } else if (daysUntilStart <= 7) {
    badgeColor = 'orange'
    label = 'Urgent'
  } else if (daysUntilStart <= 14) {
    badgeColor = 'yellow'
    label = 'Soon'
  }

  return (
    <span className={`badge badge-${badgeColor}`}>
      {label} ({daysUntilStart} days)
    </span>
  )
}

// ============================================
// EXAMPLE 10: Date Validation in Forms
// ============================================

import { isValidDateFormat } from '@/utils/dateFormatter'

export function validateFormDates(formData) {
  const errors = {}

  // Ensure billing start date is not in the past
  if (formData.billingStartDate && isPastDate(formData.billingStartDate)) {
    errors.billingStartDate = 'Billing start date cannot be in the past'
  }

  // Ensure onboarding is after billing start
  if (formData.billingStartDate && formData.expectedOnboarding) {
    const billing = new Date(formData.billingStartDate)
    const onboarding = new Date(formData.expectedOnboarding)
    
    if (onboarding < billing) {
      errors.expectedOnboarding = 'Onboarding date must be after billing start date'
    }
  }

  return errors
}
