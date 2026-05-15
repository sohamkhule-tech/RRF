'use client'

/**
 * AppShell — Shared layout shell for all authenticated roles.
 *
 * Encapsulates:
 *  - Sidebar collapse/expand state (persisted to localStorage)
 *  - Mobile viewport detection and mobile sidebar drawer
 *  - Renders UnifiedSidebar + Header + children content area
 *
 * This component is role-agnostic. The sidebar content is resolved
 * internally by UnifiedSidebar based on the current user's role.
 *
 * Used by ClientLayout for workflow roles AND admin roles once
 * the admin bypass is removed.
 */

import { useState, useEffect } from 'react'
import { Layout } from 'antd'
import { usePathname } from 'next/navigation'
import UnifiedSidebar from '@/components/UnifiedSidebar'
import Header from '@/components/Header'

const { Content } = Layout

export default function AppShell({ children }) {
  const pathname = usePathname()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Detect mobile viewport
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

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  // Persist sidebar collapse state to localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString())
  }, [isSidebarCollapsed])

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
      {/* Mobile overlay backdrop */}
      {isMobile && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <UnifiedSidebar
        isCollapsed={isMobile ? false : isSidebarCollapsed}
        isMobile={isMobile}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <Layout style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.3s ease-in-out' }}>
        <Header
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          isMobile={isMobile}
        />
        <Content style={{ marginTop: '73px' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
