'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DashboardOutlined,
  TeamOutlined,
  KeyOutlined,
  FileTextOutlined,
  FormOutlined,
  BarChartOutlined,
  HistoryOutlined,
} from '@ant-design/icons'

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined className="text-xl" />, label: 'Dashboard', href: '/admin' },
  { key: '/admin/users', icon: <TeamOutlined className="text-xl" />, label: 'Users', href: '/admin/users' },
  { key: '/admin/roles', icon: <KeyOutlined className="text-xl" />, label: 'Roles', href: '/admin/roles' },
  { key: '/admin/rrf-management', icon: <FileTextOutlined className="text-xl" />, label: 'RRF', href: '/admin/rrf-management' },
  { key: '/admin/form-config', icon: <FormOutlined className="text-xl" />, label: 'Form Config', href: '/admin/form-config' },
  { key: '/admin/reports', icon: <BarChartOutlined className="text-xl" />, label: 'Reports', href: null, disabled: true },
  { key: '/admin/audit-logs', icon: <HistoryOutlined className="text-xl" />, label: 'Audit Logs', href: null, disabled: true },
]

export default function AdminSidebar({ isCollapsed = false, isMobile = false, isMobileOpen = false, onMobileClose }) {
  const pathname = usePathname()

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 text-white z-50 transition-all duration-300 ease-in-out ${
        isMobile
          ? `w-64 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`
          : (isCollapsed ? 'w-20' : 'w-64')
      }`}
      style={{
        background: 'linear-gradient(180deg, #0f172a, #1e293b, #4f46e5)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      }}
    >
      {/* Logo */}
      <div className="px-4 md:px-6 py-4 md:py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-xl ring-2 ring-white/20 flex-shrink-0">
              R
            </div>
            {(!isCollapsed || isMobile) && (
              <h1 className="text-xl font-bold text-white transition-opacity duration-300">
                RRF Portal
              </h1>
            )}
          </div>
          {isMobile && (
            <button onClick={onMobileClose} className="text-white/70 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-6 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.key || (item.key !== '/admin' && pathname.startsWith(item.key + '/'))

          if (item.disabled) {
            return (
              <div
                key={item.key}
                className={`flex items-center gap-3 px-4 py-3.5 text-gray-500 cursor-not-allowed ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? `${item.label} (Coming Soon)` : 'Coming Soon'}
              >
                <span className="text-xl flex-shrink-0 opacity-40">{item.icon}</span>
                {!isCollapsed && (
                  <span className="font-medium text-sm opacity-40">{item.label}</span>
                )}
                {!isCollapsed && (
                  <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">Soon</span>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3.5 transition-all duration-300 group no-underline
                ${isActive
                  ? 'text-white'
                  : 'text-gray-300 hover:text-white'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              style={isActive ? { background: 'rgba(255,255,255,0.12)', borderRadius: '10px' } : {}}
              title={isCollapsed ? item.label : ''}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <span className="font-medium text-sm transition-opacity duration-300">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-white/10">
        {!isCollapsed && (
          <div className="text-xs text-gray-400 text-center font-medium transition-opacity duration-300">
            © 2026 RRF Portal — Admin
          </div>
        )}
        {isCollapsed && (
          <div className="text-xs text-gray-400 text-center font-medium">©</div>
        )}
      </div>
    </aside>
  )
}
