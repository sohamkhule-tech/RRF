import { CalendarOutlined } from '@ant-design/icons'

export default function DateInput({ 
  label, 
  name, 
  value, 
  onChange, 
  required = false,
  minDate = null,
  placeholder = "DD/MM/YYYY"
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
          <CalendarOutlined className="text-lg" />
        </div>
        <input
          type="date"
          name={name}
          value={value}
          onChange={onChange}
          min={minDate}
          className="w-48 pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-slate-400 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          required={required}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5">Format: DD/MM/YYYY</p>
    </div>
  )
}
