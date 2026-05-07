'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { Modal } from 'antd'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell'

export default function Header({ initialRole = 'hiring-manager', onToggleSidebar, isSidebarCollapsed = false, isMobile = false }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [role, setRole] = useState(initialRole)

  // Update role when pathname changes or user changes
  useEffect(() => {
    if (user) {
      setRole(user.role)
    } else if (pathname.startsWith('/approver')) {
      setRole('approver')
    } else if (pathname.startsWith('/hr')) {
      setRole('hr')
    } else if (pathname.startsWith('/pmo')) {
      setRole('pmo')
    } else {
      setRole('hiring-manager')
    }
  }, [pathname, user])

  const getPageTitle = () => {
    if (pathname === '/hiring-manager/dashboard') return 'Dashboard'
    if (pathname === '/hiring-manager/create-rrf') return 'Create RRF Request'
    if (pathname === '/hiring-manager/drafts') return 'Saved Drafts'
    if (pathname === '/hiring-manager/my-requests') return 'RRF Requests'
    if (pathname === '/approver') return 'Dashboard'
    if (pathname === '/approver/pending') return 'Pending RRF Approvals'
    if (pathname === '/approver/on-hold') return 'On-hold Requests'
    if (pathname === '/approver/declined') return 'Declined Requests'
    if (pathname === '/approver/approved') return 'Approved Requests'
    if (pathname === '/approver/reports') return 'Reports & Insights'
    if (pathname.includes('/approver/review')) return 'Review RRF Request'
    if (pathname === '/hr') return 'Dashboard'
    if (pathname === '/hr/open-hiring') return 'Open for Hiring'
    if (pathname === '/hr/closed') return 'Closed Requests'
    if (pathname === '/pmo') return 'Dashboard'
    if (pathname === '/pmo/create-rrf') return 'Create RRF Request'
    if (pathname === '/pmo/reports') return 'Reports & Insights'
    if (pathname === '/pmo/pending') return 'Opened Positions'
    if (pathname === '/pmo/opened-positions') return 'Opened Positions'
    if (pathname === '/pmo/sent-to-approvers') return 'Sent to Talent Acquisition'
    if (pathname.includes('/requests/')) return 'View RRF'
    return 'RRF Portal'
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
        style: { 
          background: '#dc2626',
          borderColor: '#dc2626'
        }
      },
      onOk() {
        logout()
      },
    })
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const userName = user?.name || user?.fullName || 'User'
  const userEmail = user?.email || 'user@company.com'
  const getDisplayName = (role) => {
    if (!role) return 'User'
    const name = typeof role === 'string' ? role : (role.name || role.roleName || 'User')
    return name.trim().toLowerCase() === 'hr team' ? 'Talent Acquisition' : name
  }

  const userRole = getDisplayName(user?.role || user?.roleName)
  const userInitials = getInitials(userName)

  return (
    <header className="fixed top-0 right-0 z-30 bg-white border-b border-gray-200" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', left: isMobile ? '0' : (isSidebarCollapsed ? '80px' : '260px'), transition: 'left 0.3s ease-in-out' }}>
      <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        {/* Left Side - Toggle Button and Page Title */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* Sidebar Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 text-gray-600 hover:text-indigo-600 flex-shrink-0"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed || isMobile ? (
              <MenuUnfoldOutlined className="text-xl" />
            ) : (
              <MenuFoldOutlined className="text-xl" />
            )}
          </button>
          
          {/* Page Title */}
          <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{getPageTitle()}</h2>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
          {/* User Info */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
              {userInitials}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold text-gray-900">{userName}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span>{userRole}</span>
                {userEmail && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="truncate max-w-[150px]" title={userEmail}>{userEmail}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Logout Button */}
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