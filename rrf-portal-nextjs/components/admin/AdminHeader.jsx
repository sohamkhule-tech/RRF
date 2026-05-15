'use client'

import { usePathname } from 'next/navigation'
import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'

export default function AdminHeader({ onToggleSidebar, isSidebarCollapsed = false, isMobile = false }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const getPageTitle = () => {
    if (pathname === '/admin') return 'Dashboard'
    if (pathname === '/admin/users') return 'User Management'
    if (pathname === '/admin/roles') return 'Role Management'
    if (pathname.includes('/admin/rrf-management')) return 'RRF'
    if (pathname === '/admin/form-config') return 'Form Configuration'
    if (pathname === '/admin/reports') return 'Reports'
    if (pathname === '/admin/audit-logs') return 'Audit Logs'
    return 'Admin Panel'
  }

  const handleLogout = () => {
    Modal.confirm({
      title: 'Confirm Logout',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to logout?',
      okText: 'Yes, Logout',
      cancelText: 'Cancel',
      okButtonProps: {
        danger: true,
        style: { background: '#dc2626', borderColor: '#dc2626' },
      },
      onOk() {
        logout()
      },
    })
  }

  const getInitials = (name) => {
    if (!name) return 'A'
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const userName = user?.name || 'Admin'
  const userEmail = user?.email || 'admin@rrfportal.com'
  const userInitials = getInitials(userName)

  return (
    <header
      className="fixed top-0 right-0 z-30 bg-white border-b border-gray-200"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        left: isMobile ? '0' : (isSidebarCollapsed ? '80px' : '260px'),
        transition: 'left 0.3s ease-in-out',
      }}
    >
      <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 text-gray-600 hover:text-red-600 flex-shrink-0"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed || isMobile ? (
              <MenuUnfoldOutlined className="text-xl" />
            ) : (
              <MenuFoldOutlined className="text-xl" />
            )}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{getPageTitle()}</h2>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div
              className="w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              {userInitials}
            </div>
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300 border border-gray-200 hover:border-red-300"
            title="Logout"
          >
            <LogoutOutlined />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
