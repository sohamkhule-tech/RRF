'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { UserOutlined, LockOutlined, LoginOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getHomePageByRole } from '@/utils/permissions'
import brandingLogo from '@/assets/branding/branding.jpg'

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Official Datafortune logo â€” from /assets/branding/branding.jpg
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DatafortuneLogo({ height = 44 }) {
  return (
    <Image
      src={brandingLogo}
      alt="Datafortune"
      height={height}
      style={{ width: 'auto', height, objectFit: 'contain', display: 'block' }}
      priority
    />
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Premium laptop hero illustration
   Isometric open laptop Â· enterprise analytics on screen Â·
   floating UI tiles Â· small plant Â· soft cast shadow
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function LaptopHero() {
  return (
    <svg
      viewBox="0 0 520 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full df-illus-float"
      aria-hidden="true"
    >
      {/* â”€â”€ Ground shadow â”€â”€ */}
      <ellipse cx="236" cy="378" rx="168" ry="14" fill="rgba(37,99,235,0.08)" />

      {/* â”€â”€ Laptop base / keyboard deck â”€â”€ */}
      {/* Base trapezoid (perspective) */}
      <path d="M88 310 L384 310 L352 360 L120 360 Z" fill="#E2E8F0" />
      <path d="M88 310 L384 310 L352 360 L120 360 Z" fill="url(#baseGrad)" />
      {/* Keyboard surface */}
      <path d="M96 312 L376 312 L346 354 L126 354 Z" fill="#CBD5E1" opacity="0.5" />
      {/* Keyboard keys suggestion */}
      <rect x="148" y="320" width="180" height="6" rx="3" fill="#94A3B8" opacity="0.35" />
      <rect x="156" y="330" width="166" height="6" rx="3" fill="#94A3B8" opacity="0.25" />
      <rect x="168" y="340" width="140" height="6" rx="3" fill="#94A3B8" opacity="0.20" />
      {/* Trackpad */}
      <rect x="206" y="348" width="68" height="4" rx="2" fill="#94A3B8" opacity="0.30" />
      {/* Hinge line */}
      <path d="M88 310 L384 310" stroke="#B0B8C4" strokeWidth="1.5" />

      {/* â”€â”€ Laptop lid (screen panel) â”€â”€ */}
      {/* Outer lid */}
      <path d="M104 82 L370 82 L384 310 L88 310 Z" fill="#F1F5F9" />
      {/* Lid face â€” slight gradient for depth */}
      <path d="M104 82 L370 82 L384 310 L88 310 Z" fill="url(#lidGrad)" />
      {/* Lid edge / bezel top */}
      <path d="M104 82 L370 82" stroke="#CBD5E1" strokeWidth="1.5" />
      {/* Apple-logo-style notch */}
      <ellipse cx="237" cy="90" rx="5" ry="3" fill="#CBD5E1" opacity="0.6" />

      {/* â”€â”€ Screen / display â”€â”€ */}
      <rect x="118" y="100" width="238" height="194" rx="6" fill="#0F172A" />
      {/* Screen glow */}
      <rect x="120" y="102" width="234" height="190" rx="5" fill="url(#screenGrad)" />

      {/* â”€â”€ Screen content: mini dashboard â”€â”€ */}
      {/* Nav bar */}
      <rect x="120" y="102" width="234" height="22" rx="5" fill="#1E293B" />
      <rect x="120" y="115" width="234" height="9" fill="#1E293B" />
      <circle cx="134" cy="113" r="4" fill="#475569" />
      <circle cx="146" cy="113" r="4" fill="#475569" />
      <circle cx="158" cy="113" r="4" fill="#475569" />
      <rect x="170" y="109" width="60" height="8" rx="4" fill="#334155" />
      <rect x="320" y="109" width="28" height="8" rx="4" fill="#2563EB" />

      {/* KPI row */}
      <rect x="126" y="130" width="50" height="26" rx="5" fill="#1E3A5F" />
      <text x="133" y="141" fontSize="5" fill="#93C5FD" fontFamily="Arial" fontWeight="600">Total</text>
      <text x="130" y="151" fontSize="8" fill="white" fontFamily="Arial Black" fontWeight="900">128</text>

      <rect x="182" y="130" width="50" height="26" rx="5" fill="#14532D" opacity="0.7" />
      <text x="189" y="141" fontSize="5" fill="#86EFAC" fontFamily="Arial" fontWeight="600">Approved</text>
      <text x="189" y="151" fontSize="8" fill="#4ADE80" fontFamily="Arial Black" fontWeight="900">84</text>

      <rect x="238" y="130" width="50" height="26" rx="5" fill="#431407" opacity="0.7" />
      <text x="245" y="141" fontSize="5" fill="#FCA5A5" fontFamily="Arial" fontWeight="600">Pending</text>
      <text x="248" y="151" fontSize="8" fill="#F97316" fontFamily="Arial Black" fontWeight="900">31</text>

      <rect x="294" y="130" width="54" height="26" rx="5" fill="#312E81" opacity="0.7" />
      <text x="301" y="141" fontSize="5" fill="#C4B5FD" fontFamily="Arial" fontWeight="600">Closed</text>
      <text x="305" y="151" fontSize="8" fill="#A78BFA" fontFamily="Arial Black" fontWeight="900">13</text>

      {/* Chart bars */}
      <rect x="128" y="228" width="14" height="38" rx="3" fill="#3B82F6" opacity="0.75" />
      <rect x="148" y="214" width="14" height="52" rx="3" fill="#2563EB" opacity="0.9" />
      <rect x="168" y="222" width="14" height="44" rx="3" fill="#60A5FA" opacity="0.7" />
      <rect x="188" y="206" width="14" height="60" rx="3" fill="#1D4ED8" opacity="0.85" />
      <rect x="208" y="216" width="14" height="50" rx="3" fill="#3B82F6" opacity="0.8" />
      <rect x="228" y="200" width="14" height="66" rx="3" fill="#1E40AF" opacity="0.9" />

      {/* Trend line over bars */}
      <polyline
        points="135,232 155,218 175,225 195,210 215,220 235,203"
        stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="235" cy="203" r="3" fill="#F97316" />

      {/* Screen content: table preview */}
      <rect x="252" y="162" width="96" height="60" rx="4" fill="#1E293B" />
      <rect x="258" y="168" width="84" height="7" rx="2" fill="#334155" />
      <rect x="258" y="179" width="84" height="5" rx="2" fill="#475569" opacity="0.5" />
      <rect x="258" y="188" width="70" height="5" rx="2" fill="#475569" opacity="0.4" />
      <rect x="258" y="197" width="78" height="5" rx="2" fill="#475569" opacity="0.3" />
      <rect x="258" y="206" width="56" height="5" rx="2" fill="#475569" opacity="0.25" />
      {/* Status dot */}
      <circle cx="334" cy="171" r="3" fill="#4ADE80" />
      <circle cx="334" cy="182" r="3" fill="#F97316" />
      <circle cx="334" cy="191" r="3" fill="#4ADE80" />
      <circle cx="334" cy="200" r="3" fill="#60A5FA" />
      <circle cx="334" cy="209" r="3" fill="#4ADE80" />

      {/* â”€â”€ Floating UI cards around laptop â”€â”€ */}

      {/* Card 1 â€” top-right: Analytics pulse */}
      <rect x="392" y="98" width="112" height="68" rx="12" fill="white"
        style={{ filter: 'drop-shadow(0 4px 16px rgba(37,99,235,0.13))' }}
      />
      <rect x="392" y="98" width="112" height="68" rx="12" stroke="#DBEAFE" strokeWidth="1" />
      <text x="404" y="118" fontSize="7.5" fill="#1E40AF" fontFamily="Arial" fontWeight="700">Hiring Analytics</text>
      <polyline points="404,145 420,135 436,140 452,128 468,132 484,122"
        stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points="404,148 420,138 436,143 452,131 468,135 484,125"
        stroke="#BFDBFE" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="484" cy="122" r="3.5" fill="#2563EB" />
      <rect x="404" y="152" width="40" height="6" rx="3" fill="#DBEAFE" />
      <rect x="450" y="152" width="28" height="6" rx="3" fill="#BFDBFE" />

      {/* Card 2 â€” left: Team */}
      <rect x="6" y="160" width="96" height="72" rx="12" fill="white"
        style={{ filter: 'drop-shadow(0 4px 16px rgba(15,23,42,0.08))' }}
      />
      <rect x="6" y="160" width="96" height="72" rx="12" stroke="#E2E8F0" strokeWidth="1" />
      <text x="18" y="179" fontSize="7.5" fill="#475569" fontFamily="Arial" fontWeight="700">Team</text>
      {/* Mini avatars */}
      <circle cx="22"  cy="200" r="11" fill="#BFDBFE" stroke="white" strokeWidth="1.5" />
      <text x="16"  cy="200" fontSize="7" fill="#1E40AF" fontFamily="Arial" fontWeight="700">
        <tspan x="16" y="204">HM</tspan>
      </text>
      <circle cx="48" cy="200" r="11" fill="#BAE6FD" stroke="white" strokeWidth="1.5" />
      <text x="42" fontSize="7" fill="#0369A1" fontFamily="Arial" fontWeight="700">
        <tspan x="42" y="204">TA</tspan>
      </text>
      <circle cx="74" cy="200" r="11" fill="#A7F3D0" stroke="white" strokeWidth="1.5" />
      <text x="68" fontSize="7" fill="#065F46" fontFamily="Arial" fontWeight="700">
        <tspan x="68" y="204">PM</tspan>
      </text>
      <rect x="18" y="216" width="72" height="5" rx="2.5" fill="#E2E8F0" />
      <rect x="28" y="224" width="52" height="4" rx="2" fill="#F1F5F9" />

      {/* Card 3 â€” bottom-right: Approval */}
      <rect x="392" y="240" width="110" height="64" rx="12" fill="white"
        style={{ filter: 'drop-shadow(0 4px 16px rgba(34,197,94,0.10))' }}
      />
      <rect x="392" y="240" width="110" height="64" rx="12" stroke="#BBF7D0" strokeWidth="1" />
      <circle cx="436" cy="263" r="13" fill="#22C55E" />
      <polyline points="429,263 434,268 443,256"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="456" y="260" fontSize="7.5" fill="#16A34A" fontFamily="Arial" fontWeight="700">Approved</text>
      <text x="456" y="270" fontSize="7" fill="#86EFAC" fontFamily="Arial">RRF-2024-089</text>
      <rect x="404" y="282" width="86" height="6" rx="3" fill="#DCFCE7" />
      <rect x="416" y="290" width="62" height="5" rx="2.5" fill="#F0FDF4" />

      {/* â”€â”€ Decorative plant (right of laptop) â”€â”€ */}
      {/* Pot */}
      <path d="M454 355 L442 370 L466 370 Z" fill="#CBD5E1" />
      <rect x="441" y="368" width="26" height="8" rx="3" fill="#94A3B8" />
      {/* Stem */}
      <path d="M454 356 C454 340, 448 326, 440 316" stroke="#86EFAC" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M454 348 C454 336, 460 326, 468 318" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Leaves */}
      <ellipse cx="437" cy="312" rx="10" ry="6" fill="#4ADE80" transform="rotate(-30 437 312)" />
      <ellipse cx="470" cy="314" rx="10" ry="6" fill="#86EFAC" transform="rotate(25 470 314)" />
      <ellipse cx="443" cy="300" rx="8" ry="5" fill="#22C55E" transform="rotate(-15 443 300)" />

      {/* Gradient defs */}
      <defs>
        <linearGradient id="baseGrad" x1="88" y1="310" x2="384" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="lidGrad" x1="104" y1="82" x2="384" y2="310" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="120" y1="102" x2="354" y2="292" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   Microsoft logo â€” official 4-colour grid
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022" />
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00" />
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LoginPage â€” all animation classes are in globals.css
   (SSR-safe, zero hydration warnings)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [userId,       setUserId]       = useState('')
  const [password,     setPassword]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [msLoading,    setMsLoading]    = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Environment-based API URL with localhost fallback for development
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  useEffect(() => {
    router.prefetch('/hiring-manager/dashboard')
  }, [router])

  /* â"€â"€ Microsoft SSO handler â"€â"€ */
  const handleMicrosoftLogin = async () => {
    if (msLoading) return
    setMsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/microsoft`)
      const data = await res.json()

      if (!res.ok || !data.authUrl) {
        throw new Error(data.message || 'Failed to get Microsoft login URL')
      }

      // Redirect to Microsoft OAuth page
      window.location.href = data.authUrl
    } catch (error) {
      toast.error(error.message || 'Microsoft login failed. Please try again.')
      setMsLoading(false)
    }
  }

  /* â”€â”€ Unchanged auth logic â”€â”€ */
  const handleLogin = async (e) => {
    e.preventDefault()

    if (!userId || !password) {
      toast.error('Please enter both User ID and Password')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Invalid credentials')

      login(data.user, data.access_token)
      toast.success(`Welcome back, ${data.user.name}!`)

      const roleCode = data.user.role?.code || data.user.role
      router.push(getHomePageByRole(roleCode))
    } catch (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex overflow-hidden"
      style={{ fontFamily: "'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}
    >

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          LEFT â€” Branding panel (desktop only, hidden on mobile)
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col overflow-hidden df-panel-enter"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(147,197,253,0.28) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 70%, rgba(186,230,253,0.18) 0%, transparent 55%),' +
            'linear-gradient(160deg, #EBF4FF 0%, #E8F2FE 30%, #EEF6FF 60%, #F4F9FF 100%)',
        }}
      >
        {/* Ambient blobs */}
        <div
          className="df-blob-1 absolute rounded-full pointer-events-none"
          style={{
            width: 480, height: 480,
            top: -140, left: -140,
            background: 'radial-gradient(circle, rgba(147,197,253,0.30) 0%, transparent 66%)',
          }}
        />
        <div
          className="df-blob-2 absolute rounded-full pointer-events-none"
          style={{
            width: 380, height: 380,
            top: '42%', right: -110,
            background: 'radial-gradient(circle, rgba(125,211,252,0.20) 0%, transparent 66%)',
          }}
        />
        <div
          className="df-blob-3 absolute rounded-full pointer-events-none"
          style={{
            width: 300, height: 300,
            bottom: -70, left: '28%',
            background: 'radial-gradient(circle, rgba(134,239,172,0.16) 0%, transparent 66%)',
          }}
        />

        {/* White radial glow behind heading area */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 560, height: 420,
            top: '14%', left: -80,
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.60) 0%, transparent 62%)',
          }}
        />
        {/* Soft blue ambient glow — bottom-left */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 380, height: 380,
            bottom: -50, left: -70,
            background: 'radial-gradient(circle, rgba(147,197,253,0.24) 0%, transparent 62%)',
          }}
        />

        {/* Subtle dot grid */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.07 }}
          aria-hidden="true"
        >
          <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#93C5FD" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* Bottom wave accent */}
        <svg
          className="absolute bottom-0 left-0 w-full pointer-events-none"
          viewBox="0 0 700 130"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 85 C160 18, 540 130, 700 42 L700 130 L0 130 Z" fill="rgba(186,230,253,0.24)" />
          <path d="M0 108 C220 52, 480 120, 700 65 L700 130 L0 130 Z" fill="rgba(147,197,253,0.15)" />
        </svg>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-14 py-11">

          {/* Official logo â€” top-left */}
          <div className="flex-shrink-0">
            <DatafortuneLogo height={48} />
          </div>

          {/* Text block */}
          <div className="flex-1 flex flex-col justify-center pt-5">

            <h1
              className="font-black mb-6"
              style={{
                fontSize: 'clamp(3.4rem, 5vw, 5rem)',
                color: '#0F172A',
                letterSpacing: '-0.05em',
                lineHeight: 0.95,
              }}
            >
              RRF Portal
            </h1>

            <p
              className="font-semibold mb-4"
              style={{ fontSize: '1.2rem', color: '#475569', lineHeight: 1.45 }}
            >
              Resource Requisition Management System
            </p>

            <p
              style={{ color: '#64748B', maxWidth: 340, lineHeight: 1.8, fontSize: 15 }}
            >
              Streamlining hiring workflows with secure enterprise-grade resource planning.
            </p>

            {/* Laptop illustration */}
            <div className="mt-6" style={{ maxWidth: 560 }}>
              <LaptopHero />
            </div>
          </div>

          {/* Left panel footer */}
          <div className="flex-shrink-0 pb-1">
            <p className="text-xs" style={{ color: '#CBD5E1' }}>
              &#169; 2026 Datafortune. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          RIGHT â€” Login panel
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div
        className="flex-1 lg:w-[48%] flex flex-col items-center justify-center px-6 py-14 relative"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 85% 15%, rgba(219,234,254,0.55) 0%, transparent 55%),' +
            'radial-gradient(ellipse 60% 44% at 15% 90%, rgba(224,242,254,0.45) 0%, transparent 55%),' +
            'linear-gradient(170deg, #F8FAFC 0%, #F1F5F9 50%, #F5F8FC 100%)',
        }}
      >
        {/* Mobile-only logo */}
        <div className="lg:hidden mb-8">
          <DatafortuneLogo height={40} />
        </div>

        {/* Login card */}
        <div className="relative w-full z-10 df-card-enter" style={{ maxWidth: 540 }}>
          <div
            style={{
              borderRadius: 28,
              padding: '56px 56px 46px',
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow:
                '0 10px 30px rgba(15,23,42,0.06),' +
                '0 25px 70px rgba(37,99,235,0.10),' +
                '0 0 0 1px rgba(255,255,255,0.35)',
            }}
          >
            {/* Heading */}
            <h2
              className="text-center font-extrabold mb-2"
              style={{ fontSize: '1.875rem', color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.2 }}
            >
              Welcome Back
            </h2>
            <p className="text-sm text-center mb-8" style={{ color: '#94A3B8', lineHeight: 1.5 }}>
              Sign in to continue to RRF Portal
            </p>

            {/* Form */}
            <form onSubmit={handleLogin}>

              {/* User ID */}
              <div className="mb-4">
                <label
                  htmlFor="userId"
                  className="block mb-1.5 text-xs font-bold uppercase"
                  style={{ color: '#475569', letterSpacing: '0.06em' }}
                >
                  User ID
                </label>
                <div className="relative">
                  <span
                    className="absolute top-1/2 -translate-y-1/2 left-3.5 pointer-events-none"
                    style={{ color: '#94A3B8' }}
                  >
                    <UserOutlined style={{ fontSize: 15 }} />
                  </span>
                  <input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    className="df-input w-full rounded-xl text-sm"
                    style={{
                      paddingLeft: 40, paddingRight: 14,
                      paddingTop: 11, paddingBottom: 11,
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                      color: '#0F172A',
                      fontSize: 14,
                      caretColor: '#3B82F6',
                    }}
                    placeholder="Enter your user ID"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label
                  htmlFor="password"
                  className="block mb-1.5 text-xs font-bold uppercase"
                  style={{ color: '#475569', letterSpacing: '0.06em' }}
                >
                  Password
                </label>
                <div className="relative">
                  <span
                    className="absolute top-1/2 -translate-y-1/2 left-3.5 pointer-events-none"
                    style={{ color: '#94A3B8' }}
                  >
                    <LockOutlined style={{ fontSize: 15 }} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="df-input w-full rounded-xl text-sm"
                    style={{
                      paddingLeft: 40, paddingRight: 44,
                      paddingTop: 11, paddingBottom: 11,
                      border: '1.5px solid #E2E8F0',
                      background: '#F8FAFC',
                      color: '#0F172A',
                      fontSize: 14,
                      caretColor: '#3B82F6',
                    }}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1"
                    style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword
                      ? <EyeInvisibleOutlined style={{ fontSize: 15 }} />
                      : <EyeOutlined        style={{ fontSize: 15 }} />
                    }
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between mb-5">
                <label
                  className="flex items-center gap-2 cursor-pointer select-none text-xs"
                  style={{ color: '#64748B' }}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                    disabled={loading}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="df-link text-xs font-semibold"
                  style={{ color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="df-cta-btn w-full flex items-center justify-center gap-2 text-white font-bold text-sm rounded-xl"
                style={{
                  paddingTop: 13, paddingBottom: 13,
                  background: loading
                    ? 'linear-gradient(135deg, #93C5FD, #60A5FA)'
                    : 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 45%, #2563EB 100%)',
                  boxShadow: loading
                    ? 'none'
                    : '0 4px 16px rgba(37,99,235,0.30), 0 1px 4px rgba(15,23,42,0.08)',
                  cursor:   loading ? 'not-allowed' : 'pointer',
                  border:   'none',
                  letterSpacing: '0.025em',
                }}
              >
                {loading ? (
                  <>
                    <span
                      className="animate-spin rounded-full inline-block"
                      style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff' }}
                    />
                    Signing in&#8230;
                  </>
                ) : (
                  <>
                    <LoginOutlined style={{ fontSize: 14 }} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* OR divider */}
            <div className="flex items-center gap-3 my-5">
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #E2E8F0)' }} />
              <span className="text-xs font-medium" style={{ color: '#CBD5E1' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #E2E8F0)' }} />
            </div>

            {/* Microsoft SSO */}
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              disabled={msLoading || loading}
              className="df-ms-btn w-full flex items-center justify-center gap-2.5 font-semibold text-sm rounded-xl"
              style={{
                paddingTop: 11, paddingBottom: 11,
                background: '#FFFFFF',
                border:     '1.5px solid #E2E8F0',
                color:      '#334155',
                cursor:     (msLoading || loading) ? 'not-allowed' : 'pointer',
                opacity:    (msLoading || loading) ? 0.72 : 1,
                letterSpacing: '0.01em',
                transition: 'all 0.2s ease',
              }}
              title="Sign in with your Microsoft work account"
            >
              {msLoading ? (
                <>
                  <span
                    className="animate-spin rounded-full inline-block"
                    style={{ width: 14, height: 14, border: '2px solid #94A3B8', borderTopColor: '#2563EB' }}
                  />
                  Signing in&#8230;
                </>
              ) : (
                <>
                  <MicrosoftIcon />
                  Sign in with Microsoft
                </>
              )}
            </button>
            {/* Security note */}
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1L2 3.8V8c0 3.4 2.5 6.6 6 7.2 3.5-.6 6-3.8 6-7.2V3.8L8 1z"
                  fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.2" />
                <rect x="6.5" y="7.2" width="3" height="3.8" rx="0.6" fill="#CBD5E1" />
                <circle cx="8" cy="6.6" r="1.1" fill="#CBD5E1" />
              </svg>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                Protected by enterprise-grade security
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center mt-5 text-xs" style={{ color: '#CBD5E1' }}>
            &#169; 2026 Datafortune. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
