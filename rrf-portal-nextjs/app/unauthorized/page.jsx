'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LockOutlined, HomeOutlined } from '@ant-design/icons'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user } = useAuth()

  const handleGoHome = () => {
    // Redirect based on user role
    if (user?.role === 'ADMIN') {
      router.push('/admin')
    } else if (user?.role === 'PMO') {
      router.push('/pmo')
    } else if (user?.role === 'APPROVER') {
      router.push('/approver')
    } else if (user?.role === 'HR') {
      router.push('/hr')
    } else {
      router.push('/hiring-manager/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockOutlined className="text-4xl text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-2">
            You do not have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {user?.role ? `Your role: ${user.role}` : 'Please contact your administrator if you believe this is an error.'}
          </p>

          {/* Action Button */}
          <button
            onClick={handleGoHome}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2"
          >
            <HomeOutlined />
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
