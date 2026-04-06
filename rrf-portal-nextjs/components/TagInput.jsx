'use client'
import { useState, useRef } from 'react'
import { CloseOutlined } from '@ant-design/icons'

export default function TagInput({ 
  value = [], 
  onChange, 
  placeholder = "Type and press enter to add",
  required = false,
  label = "",
  helperText = ""
}) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value.length - 1)
    }
  }

  const addTag = () => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue])
      setInputValue('')
    }
  }

  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove))
  }

  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        onClick={handleContainerClick}
        className="w-full min-h-[52px] px-3 py-2 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all duration-200 cursor-text"
      >
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-200 hover:bg-indigo-100 transition-colors group"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(index)
                }}
                className="hover:text-indigo-900 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <CloseOutlined className="text-xs" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={addTag}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent placeholder:text-slate-400 text-sm py-1"
          />
        </div>
      </div>
      {helperText && (
        <p className="text-xs text-slate-500 mt-1.5">{helperText}</p>
      )}
      {/* NOTE: Native hidden-required input removed intentionally.
           display:none inputs can't receive browser focus for HTML5 validation,
           causing "invalid form control not focusable" errors.
           Tag field validation is handled manually in ModernRRFForm handleSubmit. */}
    </div>
  )
}
