import Link from 'next/link'

/**
 * Modern SaaS-style statistic card component
 * 
 * @param {string} title - Card title (small, muted)
 * @param {string|number} value - Main metric value (large, bold)
 * @param {string} subtitle - Optional subtitle (e.g., "+2 this week")
 * @param {React.ReactNode} icon - Icon element
 * @param {string} color - Color theme: 'blue', 'green', 'orange', 'red', 'purple', 'cyan', 'gray'
 * @param {string} href - Optional link URL to navigate on click
 */
export default function StatCard({ title, value, subtitle, icon, color = 'blue', href }) {
  const colorConfig = {
    blue: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-gray-900',
      gradient: 'from-blue-50 to-white'
    },
    green: {
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-gray-900',
      gradient: 'from-green-50 to-white'
    },
    orange: {
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      valueColor: 'text-gray-900',
      gradient: 'from-orange-50 to-white'
    },
    red: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-gray-900',
      gradient: 'from-red-50 to-white'
    },
    purple: {
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-gray-900',
      gradient: 'from-purple-50 to-white'
    },
    cyan: {
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      valueColor: 'text-gray-900',
      gradient: 'from-cyan-50 to-white'
    },
    gray: {
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      valueColor: 'text-gray-900',
      gradient: 'from-gray-50 to-white'
    }
  }

  const config = colorConfig[color] || colorConfig.blue

  const CardContent = () => (
    <div className={`bg-gradient-to-br ${config.gradient} rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 h-full flex flex-col justify-between group ${href ? 'cursor-pointer' : ''}`}>
      {/* Icon Circle */}
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className={`${config.iconBg} ${config.iconColor} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm border border-gray-100`}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1 md:space-y-2">
        {/* Title */}
        <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">{title}</p>
        
        {/* Value */}
        <p className={`text-2xl md:text-3xl lg:text-4xl font-bold ${config.valueColor} tracking-tight`}>{value}</p>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-gray-500 font-medium pt-1 line-clamp-1">{subtitle}</p>
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full no-underline">
        <CardContent />
      </Link>
    )
  }

  return <CardContent />
}
