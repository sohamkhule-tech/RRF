'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getHomePageByRole } from '@/utils/permissions'

/**
 * Microsoft SSO Callback Page — /auth/callback
 *
 * Microsoft redirects here with ?code=xxx&state=yyy after user authenticates.
 * This page extracts the params and sends them to the backend for processing.
 * No MSAL, no token handling, no race conditions.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function processCallback() {
      try {
        // Extract code and state from URL query params
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')

        if (!code || !state) {
          router.replace('/login')
          return
        }

        // Send code + state to backend for server-side token exchange
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/microsoft/callback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state }),
          }
        )

        if (!active) return

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Microsoft login failed')
        }

        // Store credentials and update auth state
        login(data.user, data.access_token)
        toast.success(`Welcome back, ${data.user.name}!`)

        // Redirect to role-appropriate dashboard
        const roleCode = data.user.role?.code || data.user.role
        router.replace(getHomePageByRole(roleCode))
      } catch (err) {
        if (!active) return
        setError(err.message || 'Authentication failed')
        toast.error(err.message || 'Microsoft login failed. Please try again.')
        setTimeout(() => router.replace('/login'), 3000)
      }
    }

    processCallback()

    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ color: '#EF4444', fontSize: '14px', fontWeight: 500 }}>
          {error}
        </div>
        <div style={{ color: '#94A3B8', fontSize: '13px' }}>
          Redirecting to login...
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div
        className="animate-spin rounded-full"
        style={{
          width: 32,
          height: 32,
          border: '3px solid #E2E8F0',
          borderTopColor: '#2563EB',
        }}
      />
      <div style={{ color: '#64748B', fontSize: '14px' }}>
        Completing sign-in...
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  fontFamily: "'Segoe UI', Inter, sans-serif",
  background: '#F8FAFC',
  gap: '12px',
}
