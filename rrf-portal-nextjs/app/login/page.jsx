'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getHomePageByPermissions, getHomePageByRole } from '@/utils/permissions'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Prefetch dashboard page to reduce transition time
  useEffect(() => {
    router.prefetch('/hiring-manager/dashboard')
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!userId || !password) {
      toast.error('Please enter both User ID and Password')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials')
      }

      // Use AuthContext login function (now handles permissions)
      login(data.user, data.access_token)

      toast.success(`Welcome back, ${data.user.name}!`)

      // HYBRID ROUTING: Try permission-based, fallback to role-based
      // Redirect based on user's permissions instead of role
      const homePage = data.user.permissions && data.user.permissions.length > 0
        ? getHomePageByPermissions(data.user.permissions)
        : getHomePageByRole(data.user.role?.code || data.user.role) // Fallback to role
      
      router.push(homePage)
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <span className="text-4xl font-bold text-white">R</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RRF Portal</h1>
            <p className="text-gray-600">Resource Requisition Management</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* User ID Input */}
            <div>
              <label htmlFor="userId" className="block text-sm font-semibold text-gray-700 mb-2">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserOutlined className="text-gray-400 text-lg" />
                </div>
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
                  placeholder="Enter your user ID"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockOutlined className="text-gray-400 text-lg" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LoginOutlined />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs font-semibold text-gray-700 mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><strong>Hiring Manager:</strong> hm001 / hm123</p>
              <p><strong>PMO:</strong> pmo001 / pmo123</p>
              <p><strong>Approver:</strong> app001 / app123</p>
              <p><strong>HR Team:</strong> hr001 / hr123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6">
          © 2026 RRF Portal. All rights reserved.
        </p>
      </div>
    </div>
  )
}
