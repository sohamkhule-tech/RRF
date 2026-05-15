'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'

function LayoutContent({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()

  // Redirect to login if not authenticated - must be in useEffect to avoid React warning
  useEffect(() => {
    if (!user && !loading && pathname !== '/login' && pathname !== '/auth/callback') {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  // Skip layout for login page
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Skip layout for Microsoft SSO callback
  if (pathname === '/auth/callback') {
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

  // ── Admin pages: rendered through AppShell (unified sidebar/header)
  // but admin auth guard still lives in app/admin/layout.jsx ──
  // ── All authenticated pages use AppShell ──
  return <AppShell>{children}</AppShell>
}

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <NotificationProvider>
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
      </NotificationProvider>
    </AuthProvider>
  )
}
