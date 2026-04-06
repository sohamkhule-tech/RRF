'use client'

import { useState, useRef, useEffect } from 'react'
import { DatePicker } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export default function MaskedDateInput({ value, onChange, placeholder = "DD/MM/YYYY", className = "", style = {}, required = false }) {
  const [inputValue, setInputValue] = useState(value || '')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const inputRef = useRef(null)
  const datePickerRef = useRef(null)

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  const formatInput = (val) => {
    // Remove all non-digit characters
    const digits = val.replace(/\D/g, '')
    
    // Format as DD/MM/YYYY
    let formatted = ''
    if (digits.length > 0) {
      formatted = digits.substring(0, 2)
      if (digits.length >= 2) {
        formatted += '/' + digits.substring(2, 4)
      }
      if (digits.length >= 4) {
        formatted += '/' + digits.substring(4, 8)
      }
    }
    return formatted
  }

  const handleInputChange = (e) => {
    const rawValue = e.target.value
    
    // Allow backspace and delete
    if (rawValue.length < inputValue.length) {
      setInputValue(rawValue)
      onChange(rawValue)
      return
    }

    const formatted = formatInput(rawValue)
    setInputValue(formatted)
    
    // Call onChange with formatted value
    onChange(formatted)
    
    // Validate if complete date
    if (formatted.length === 10) {
      const isValid = dayjs(formatted, 'DD/MM/YYYY', true).isValid()
      if (!isValid) {
        console.warn('Invalid date format')
      }
    }
  }

  const handleDatePickerChange = (date, dateString) => {
    setInputValue(dateString)
    onChange(dateString)
    setShowDatePicker(false)
  }

  const handleKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1) {
      return
    }
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) && e.ctrlKey === true) {
      return
    }
    // Ensure that it is a number
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault()
    }
  }

  return (
    <div className="relative" style={{ width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} pr-12`}
        style={style}
        required={required}
        maxLength={10}
      />
      <button
        type="button"
        onClick={() => setShowDatePicker(!showDatePicker)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
        style={{ fontSize: '18px', zIndex: 10 }}
      >
        <CalendarOutlined />
      </button>
      
      {showDatePicker && (
        <div className="absolute z-[1000] mt-1 left-0" ref={datePickerRef}>
          <DatePicker
            open={true}
            value={inputValue && inputValue.length === 10 && dayjs(inputValue, 'DD/MM/YYYY', true).isValid() 
              ? dayjs(inputValue, 'DD/MM/YYYY') 
              : null}
            onChange={handleDatePickerChange}
            onOpenChange={(open) => {
              if (!open) setShowDatePicker(false)
            }}
            format="DD/MM/YYYY"
            popupStyle={{ zIndex: 1000 }}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          />
        </div>
      )}
    </div>
  )
}
