'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from 'antd'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { useAuth } from '@/contexts/AuthContext'

const { Content } = Layout

export default function AdminLayout({ children }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setIsMobileSidebarOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const savedState = localStorage.getItem('adminSidebarCollapsed')
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', isSidebarCollapsed.toString())
  }, [isSidebarCollapsed])

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (!loading && user) {
      const roleCode = user.role?.code || user.role
      if (roleCode !== 'ADMIN') {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Admin Panel...</p>
        </div>
      </div>
    )
  }

  // Not authorized
  const roleCode = user?.role?.code || user?.role
  if (!user || roleCode !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Redirecting...</p>
        </div>
      </div>
    )
  }

  const handleToggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen)
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed)
    }
  }

  const sidebarWidth = isMobile ? 0 : (isSidebarCollapsed ? 80 : 260)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <AdminSidebar
        isCollapsed={isMobile ? false : isSidebarCollapsed}
        isMobile={isMobile}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <Layout
        style={{
          marginLeft: sidebarWidth,
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
        <AdminHeader
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          isMobile={isMobile}
        />
        <Content style={{ marginTop: '73px' }}>{children}</Content>
      </Layout>
    </Layout>
  )
}
