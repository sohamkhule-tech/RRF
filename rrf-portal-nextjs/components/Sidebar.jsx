'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeOutlined,
  PlusOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  SendOutlined,
  SaveOutlined,
  PauseCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons'

export default function Sidebar({ role = 'hiring-manager', isCollapsed = false }) {
  const pathname = usePathname()

  const getMenuItems = () => {
    switch (role) {
      case 'hiring-manager':
        return [
          { key: '/hiring-manager/dashboard', icon: <HomeOutlined className="text-xl" />, label: 'Dashboard', href: '/hiring-manager/dashboard' },
          { key: '/hiring-manager/drafts', icon: <SaveOutlined className="text-xl" />, label: 'Drafts', href: '/hiring-manager/drafts' },
          { key: '/hiring-manager/my-requests', icon: <FileTextOutlined className="text-xl" />, label: 'My RRF Requests', href: '/hiring-manager/my-requests' }
        ]
      case 'pmo':
        return [
          { key: '/pmo', icon: <HomeOutlined className="text-xl" />, label: 'Dashboard', href: '/pmo' },
          { key: '/pmo/my-requests', icon: <FileTextOutlined className="text-xl" />, label: 'My RRF Requests', href: '/pmo/my-requests' },
          { key: '/pmo/reports', icon: <BarChartOutlined className="text-xl" />, label: 'Reports', href: '/pmo/reports' }
        ]
      case 'approver':
        return [
          { key: '/approver', icon: <HomeOutlined className="text-xl" />, label: 'Dashboard', href: '/approver' },
          { key: '/approver/reports', icon: <BarChartOutlined className="text-xl" />, label: 'Reports', href: '/approver/reports' }
        ]
      case 'hr':
        return [
          { key: '/hr', icon: <HomeOutlined className="text-xl" />, label: 'Dashboard', href: '/hr' },
          { key: '/hr/open-hiring', icon: <TeamOutlined className="text-xl" />, label: 'Open for Hiring', href: '/hr/open-hiring' },
          { key: '/hr/closed', icon: <FolderOpenOutlined className="text-xl" />, label: 'Closed Requests', href: '/hr/closed' }
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  return (
    <aside 
      className={`fixed left-0 top-0 bottom-0 text-white z-50 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{ 
        background: 'linear-gradient(180deg, #0f172a, #1e293b, #4f46e5)', 
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)' 
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-xl ring-2 ring-white/20 flex-shrink-0">
            R
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-white transition-opacity duration-300">
              RRF Portal
            </h1>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.key
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3.5 transition-all duration-300 group
                ${isActive 
                  ? 'text-white' 
                  : 'text-gray-300 hover:text-white'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              style={isActive ? { background: 'rgba(255,255,255,0.1)', borderRadius: '10px' } : {}}
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
            © 2026 RRF Portal
          </div>
        )}
        {isCollapsed && (
          <div className="text-xs text-gray-400 text-center font-medium">
            ©
          </div>
        )}
      </div>
    </aside>
  )
}
