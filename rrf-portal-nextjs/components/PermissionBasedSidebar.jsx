'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  SendOutlined,
  SaveOutlined,
  PauseCircleOutlined,
  BarChartOutlined,
  UserOutlined,
  SettingOutlined,
  FormOutlined
} from '@ant-design/icons'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'

export default function PermissionBasedSidebar({ isCollapsed = false, isMobile = false, isMobileOpen = false, onMobileClose }) {
  const pathname = usePathname()
  const {
    hasPermission,
    canAccessModule,
    canCreateRRF,
    canViewApprovals,
    canViewReports,
    canManageUsers,
    canManageSettings,
    permissions
  } = usePermission()

  /**
   * Dynamic menu items based on user permissions
   * Each item checks if user has required permission before showing
   */
  const getAllMenuItems = () => {
    const items = []

    // Determine the correct dashboard route based on role/permissions
    let dashboardRoute = '/hiring-manager/dashboard'
    
    // HR role - has REPORTS.EXPORT but NOT RRF.CREATE
    if (hasPermission('REPORTS.EXPORT') && !canCreateRRF) {
      dashboardRoute = '/hr'
    }
    // Approver role - has APPROVALS.APPROVE or APPROVALS.REJECT
    else if (hasPermission('APPROVALS.APPROVE') || hasPermission('APPROVALS.REJECT')) {
      dashboardRoute = '/approver'
    }
    // PMO role - has RRF.DELETE but NOT USERS.CREATE
    else if (hasPermission('RRF.DELETE') && !hasPermission('USERS.CREATE')) {
      dashboardRoute = '/pmo'
    }
    // Hiring Manager or Admin - default to /hiring-manager/dashboard
    // (includes anyone with RRF.CREATE or USERS.CREATE)

    // Dashboard - Show if user has dashboard read permission
    if (hasPermission(PERMISSIONS.DASHBOARD.READ)) {
      items.push({
        key: dashboardRoute,
        icon: <HomeOutlined className="text-xl" />,
        label: 'Dashboard',
        href: dashboardRoute,
      })
    }

    // RRF Management Section
    if (canAccessModule('RRF')) {
      // Identify role types
      const isApprover = hasPermission('APPROVALS.APPROVE') || hasPermission('APPROVALS.REJECT')
      const isPMO = hasPermission('RRF.DELETE') && !hasPermission('USERS.CREATE')
      
      // My Requests / All RRFs - Show if user can read RRFs
      // Exclude approvers, PMO, and HR from seeing this link
      const isHR = hasPermission('REPORTS.EXPORT') && !hasPermission('RRF.CREATE')
      
      if (hasPermission(PERMISSIONS.RRF.READ) && !isApprover && !isPMO && !isHR) {
        // Only Hiring Managers see this
        items.push({
          key: '/hiring-manager/my-requests',
          icon: <FileTextOutlined className="text-xl" />,
          label: 'Requests',
          href: '/hiring-manager/my-requests',
        })
      }

      // Drafts - Show for RRF creators (Hiring Managers only, not PMO)
      if (canCreateRRF && !isPMO) {
        items.push({
          key: '/hiring-manager/drafts',
          icon: <SaveOutlined className="text-xl" />,
          label: 'Drafts',
          href: '/hiring-manager/drafts',
        })
      }
    }

    // Approvals Section - Removed per user request
    // Approvers only see Dashboard and Reports

    // HR Section - Removed per user request
    // HR only sees Dashboard (all features are on the dashboard via cards)

    // Reports Section
    // Only show reports for PMO and Approver (explicitly exclude HR)
    const isHR = hasPermission('REPORTS.EXPORT') && !canCreateRRF
    const isPMORole = hasPermission('RRF.DELETE') && !hasPermission('USERS.CREATE')
    const isApproverRole = hasPermission('APPROVALS.APPROVE') || hasPermission('APPROVALS.REJECT')
    
    if (canViewReports && !isHR && (isPMORole || isApproverRole)) {
      // Determine the correct reports route based on role
      let reportsRoute = '/reports'
      if (isApproverRole) {
        reportsRoute = '/approver/reports'
      } else if (isPMORole) {
        reportsRoute = '/pmo/reports'
      }
      
      items.push({
        key: reportsRoute,
        icon: <BarChartOutlined className="text-xl" />,
        label: 'Reports',
        href: reportsRoute,
      })
    }

    // Edit Form - PMO Only
    if (isPMORole) {
      items.push({
        key: '/pmo/form-config',
        icon: <FormOutlined className="text-xl" />,
        label: 'Edit Form',
        href: '/pmo/form-config',
      })
    }

    // User Management
    if (canManageUsers) {
      items.push({
        key: '/users',
        icon: <UserOutlined className="text-xl" />,
        label: 'Users',
        href: '/users',
      })
    }

    // Settings
    if (canManageSettings) {
      items.push({
        key: '/settings',
        icon: <SettingOutlined className="text-xl" />,
        label: 'Settings',
        href: '/settings',
      })
    }

    return items
  }

  const menuItems = getAllMenuItems()

  return (
    <aside 
      className={`fixed left-0 top-0 bottom-0 text-white z-50 transition-all duration-300 ease-in-out ${
        isMobile
          ? `w-64 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`
          : (isCollapsed ? 'w-20' : 'w-64')
      }`}
      style={{ 
        background: 'linear-gradient(180deg, #0f172a, #1e293b, #4f46e5)', 
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)' 
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
        {menuItems.length > 0 ? (
          menuItems.map((item) => {
            const dashboardRoute = getAllMenuItems()[0]?.key
            const isActive = pathname === item.key || (item.key !== dashboardRoute && pathname.startsWith(item.key + '/'))
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
          })
        ) : (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            {!isCollapsed && 'No menu items available'}
          </div>
        )}
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
