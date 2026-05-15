'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

/**
 * AdminLayout — ADMIN role guard only.
 *
 * Layout rendering (sidebar, header, content shell) is now handled by the
 * unified AppShell via ClientLayout. This layout file retains ONLY the
 * ADMIN role authentication guard to prevent non-admin users from accessing
 * /admin/* routes.
 *
 * ROLLBACK: If you need to revert to the standalone admin layout, restore
 * the previous version of this file from version control and re-add the
 * admin bypass in ClientLayout.jsx:
 *   if (pathname.startsWith('/admin')) { return <>{children}</> }
 */
export default function AdminLayout({ children }) {
  const router = useRouter()
  const { user, loading } = useAuth()

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

  // Not authorized — synchronous render guard
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

  // Auth passed — render children directly (shell is handled by AppShell)
  return <>{children}</>
}
