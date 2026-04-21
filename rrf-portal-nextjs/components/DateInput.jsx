'use client'

import { useState, useEffect } from 'react'
import { DatePicker } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

/**
 * DateInput Component with Calendar Picker
 * 
 * Features:
 * - Custom placeholder: "DD-MM-YYYY"
 * - Calendar picker (click to open)
 * - Manual input with auto-formatting
 * - Stores value as YYYY-MM-DD (backend compatible)
 * - Displays as DD-MM-YYYY (user friendly)
 * 
 * @param {string} label - Field label
 * @param {string} name - Input name attribute
 * @param {string} value - Date value in YYYY-MM-DD format
 * @param {function} onChange - Change handler (receives YYYY-MM-DD format)
 * @param {boolean} required - Whether field is required
 * @param {string} minDate - Minimum date in YYYY-MM-DD format
 * @param {string} placeholder - Custom placeholder (default: DD-MM-YYYY)
 * @param {string} className - Additional CSS classes
 */
export default function DateInput({ 
  label, 
  name, 
  value, 
  onChange, 
  required = false,
  minDate = null,
  placeholder = "DD-MM-YYYY",
  className = ""
}) {
  const [inputValue, setInputValue] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Convert YYYY-MM-DD to DD-MM-YYYY for display
  useEffect(() => {
    if (value) {
      const date = dayjs(value, 'YYYY-MM-DD', true)
      if (date.isValid()) {
        setInputValue(date.format('DD-MM-YYYY'))
      } else {
        setInputValue('')
      }
    } else {
      setInputValue('')
    }
  }, [value])

  // Format input as user types (auto-insert dashes)
  const handleInputChange = (e) => {
    let rawValue = e.target.value.replace(/[^0-9]/g, '') // Remove non-digits
    let formatted = ''

    // Format as DD-MM-YYYY
    if (rawValue.length > 0) {
      formatted = rawValue.substring(0, 2)
      if (rawValue.length >= 2) {
        formatted += '-' + rawValue.substring(2, 4)
      }
      if (rawValue.length >= 4) {
        formatted += '-' + rawValue.substring(4, 8)
      }
    }

    setInputValue(formatted)

    // If complete date (10 chars: DD-MM-YYYY), validate and convert to YYYY-MM-DD
    if (formatted.length === 10) {
      const date = dayjs(formatted, 'DD-MM-YYYY', true)
      if (date.isValid()) {
        // Convert to YYYY-MM-DD for backend
        const backendFormat = date.format('YYYY-MM-DD')
        onChange({
          target: {
            name: name,
            value: backendFormat
          }
        })
      }
    } else if (formatted === '') {
      // Clear value
      onChange({
        target: {
          name: name,
          value: ''
        }
      })
    }
  }

  // Handle calendar date selection
  const handleCalendarChange = (date) => {
    if (date) {
      // Display format
      setInputValue(date.format('DD-MM-YYYY'))
      
      // Backend format (YYYY-MM-DD)
      const backendFormat = date.format('YYYY-MM-DD')
      onChange({
        target: {
          name: name,
          value: backendFormat
        }
      })
    } else {
      setInputValue('')
      onChange({
        target: {
          name: name,
          value: ''
        }
      })
    }
    setIsCalendarOpen(false)
  }

  // Convert value for DatePicker (YYYY-MM-DD -> dayjs object)
  const datePickerValue = value && dayjs(value, 'YYYY-MM-DD', true).isValid()
    ? dayjs(value, 'YYYY-MM-DD')
    : null

  // Convert minDate to dayjs object
  const minDateObject = minDate && dayjs(minDate, 'YYYY-MM-DD', true).isValid()
    ? dayjs(minDate, 'YYYY-MM-DD')
    : null

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Ant Design DatePicker with custom styling */}
        <DatePicker
          open={isCalendarOpen}
          value={datePickerValue}
          onChange={handleCalendarChange}
          onOpenChange={setIsCalendarOpen}
          format="DD-MM-YYYY"
          minDate={minDateObject}
          placeholder={placeholder}
          className="hidden-datepicker"
          classNames={{
            popup: {
              root: 'custom-date-picker'
            }
          }}
          suffixIcon={null}
        />

        {/* Custom input field for manual typing */}
        <div className="relative w-full">
          <input
            type="text"
            name={name}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            maxLength={10}
            className="w-full h-10 px-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-slate-400 placeholder:text-slate-400 text-sm"
            required={required}
          />

          {/* Calendar button - RIGHT SIDE ONLY */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
            tabIndex={-1}
            aria-label="Open calendar"
          >
            <CalendarOutlined className="text-base" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-1.5">
        Format: {placeholder}
      </p>

      <style jsx global>{`
        /* Hide the default DatePicker input but keep it functional */
        .hidden-datepicker {
          position: absolute;
          width: 0;
          height: 0;
          opacity: 0;
          pointer-events: none;
        }
        
        /* DatePicker dropdown styling */
        .custom-date-picker .ant-picker-dropdown {
          z-index: 9999 !important;
        }
        
        /* Ensure Ant Design DatePicker takes full width */
        .ant-picker {
          width: 100%;
        }
        
        /* Align input and icon properly */
        .ant-picker-input {
          display: flex;
          align-items: center;
        }
        
        /* Calendar icon alignment */
        .ant-picker-suffix {
          margin-left: auto;
        }
        
        .custom-date-picker .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner {
          background: #4f46e5 !important;
        }
        
        .custom-date-picker .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before {
          border-color: #4f46e5 !important;
        }
        
        .custom-date-picker .ant-picker-header-view button:hover {
          color: #4f46e5 !important;
        }
      `}</style>
    </div>
  )
}
