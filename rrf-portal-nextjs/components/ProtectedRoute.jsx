/**
 * ProtectedRoute Component
 * 
 * Wrapper component that protects pages based on required permissions
 * Redirects unauthorized users to access denied page
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { LockOutlined, HomeOutlined } from '@ant-design/icons'

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to protect
 * @param {string} props.requiredPermission - Required permission code (e.g., 'RRF.CREATE')
 * @param {string[]} props.requiredPermissions - Array of permissions (user needs at least one)
 * @param {boolean} props.requireAll - If true, user must have ALL permissions in requiredPermissions array
 * @param {string} props.fallbackUrl - URL to redirect to if access denied (default: '/hiring-manager/dashboard')
 * @param {boolean} props.showAccessDenied - Show access denied UI instead of redirecting (default: true)
 */
export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
  fallbackUrl = '/hiring-manager/dashboard',
  showAccessDenied = true
}) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return
    }

    // Check if user is logged in
    if (!user) {
      router.push('/login')
      return
    }

    // Check permissions
    let authorized = true

    if (requiredPermission) {
      // Single permission check
      authorized = hasPermission(requiredPermission)
    } else if (requiredPermissions.length > 0) {
      // Multiple permissions check
      if (requireAll) {
        authorized = hasAllPermissions(requiredPermissions)
      } else {
        authorized = hasAnyPermission(requiredPermissions)
      }
    }

    setIsAuthorized(authorized)
    setIsChecking(false)

    // Redirect if not authorized and showAccessDenied is false
    if (!authorized && !showAccessDenied) {
      router.push(fallbackUrl)
    }
  }, [
    user, 
    authLoading, 
    requiredPermission, 
    requiredPermissions, 
    requireAll,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    showAccessDenied,
    fallbackUrl,
    router
  ])

  // Show loading state while checking
  if (authLoading || isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Show access denied if not authorized
  if (!isAuthorized && showAccessDenied) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md px-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-6">
            <LockOutlined className="text-5xl text-red-600" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Denied</h1>
          
          <p className="text-gray-600 mb-2">
            You don't have permission to access this page.
          </p>
          
          <p className="text-sm text-gray-500 mb-8">
            {requiredPermission && (
              <>Required permission: <code className="bg-gray-200 px-2 py-1 rounded text-xs">{requiredPermission}</code></>
            )}
            {requiredPermissions.length > 0 && (
              <>Required permissions: {requiredPermissions.map(p => (
                <code key={p} className="bg-gray-200 px-2 py-1 rounded text-xs mx-1">{p}</code>
              ))}</>
            )}
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-300"
            >
              Go Back
            </button>
            
            <button
              onClick={() => router.push('/hiring-manager/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2"
            >
              <HomeOutlined />
              Go to Dashboard
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Need access?</strong> Contact your administrator to request the necessary permissions.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}
