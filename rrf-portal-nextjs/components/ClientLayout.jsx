'use client'

import { useState, useEffect } from 'react'
import { Layout } from 'antd'
import { usePathname, useRouter } from 'next/navigation'
import PermissionBasedSidebar from '@/components/PermissionBasedSidebar'
import Header from '@/components/Header'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

const { Content } = Layout

function LayoutContent({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  // Optional: Save sidebar state to localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString())
  }, [isSidebarCollapsed])

  // Redirect to login if not authenticated - must be in useEffect to avoid React warning
  useEffect(() => {
    if (!user && !loading && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  // NOW we can do conditional returns
  // Skip layout for login page
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Show redirecting state while redirecting to login
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Redirecting...</p>
        </div>
      </div>
    )
  }
  
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <PermissionBasedSidebar isCollapsed={isSidebarCollapsed} />
      <Layout style={{ marginLeft: isSidebarCollapsed ? 80 : 260, transition: 'margin-left 0.3s ease-in-out' }}>
        <Header 
          initialRole={user?.role?.code || user?.role || 'hiring-manager'} 
          onToggleSidebar={handleToggleSidebar} 
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <Content style={{ marginTop: '73px' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1f2937',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  )
}
