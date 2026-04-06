'use client'
import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  required = false,
  label = '',
  helperText = '',
  minHeight = '150px'
}) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ background: [] }],
        ['link'],
        ['clean']
      ]
    }),
    []
  )

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'list',
    'bullet',
    'background',
    'link'
  ]

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="rich-text-editor-wrapper border border-slate-300 rounded-xl overflow-hidden hover:border-slate-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all duration-200 bg-white">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{ minHeight }}
        />
      </div>
      {helperText && (
        <p className="text-xs text-slate-500 mt-1.5">{helperText}</p>
      )}
      {/* NOTE: Native hidden-required inputs are intentionally removed.
           They cause "invalid form control not focusable" errors in Chrome/Firefox
           because display:none elements cannot be focused for validation.
           Rich text field validation is handled manually in ModernRRFForm handleSubmit. */}
      <style jsx global>{`
        .rich-text-editor-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 12px;
        }
        
        .rich-text-editor-wrapper .ql-container {
          border: none;
          font-size: 14px;
          min-height: ${minHeight};
        }
        
        .rich-text-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          padding: 16px;
        }
        
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
          left: 16px;
        }
        
        .rich-text-editor-wrapper .ql-snow .ql-stroke {
          stroke: #475569;
        }
        
        .rich-text-editor-wrapper .ql-snow .ql-fill {
          fill: #475569;
        }
        
        .rich-text-editor-wrapper .ql-snow .ql-picker-label {
          color: #475569;
        }
        
        .rich-text-editor-wrapper .ql-toolbar button:hover,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          color: #6366f1;
        }
        
        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: #6366f1;
        }
        
        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: #6366f1;
        }
      `}</style>
    </div>
  )
}
