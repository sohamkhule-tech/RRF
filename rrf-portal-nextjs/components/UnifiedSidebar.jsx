/**
 * UnifiedSidebar — New sidebar using centralized sidebarConfig.
 *
 * Mirrors the EXACT visual design of PermissionBasedSidebar:
 * - Same gradient background
 * - Same logo/branding
 * - Same icon sizes and active-state styling
 * - Same collapse/mobile behavior
 *
 * But internally:
 * - Menu items come from sidebarConfig.js (role-scoped, permission-aware)
 * - Route targets point to /workflow, /dashboard (new unified routes)
 * - No hardcoded role → route mapping inside the component
 *
 * STRANGLER PATTERN: This component coexists with PermissionBasedSidebar.
 * Neither is modified or removed. ClientLayout still uses the old one.
 * This component can be swapped in when ready for manual testing.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePermission } from '@/hooks/usePermission'
import {
  getSidebarItems,
  getPermissionDrivenItems,
  isItemActive,
  USE_PERMISSION_EXPERIMENT,
} from '@/lib/sidebarConfig'

export default function UnifiedSidebar({ isCollapsed = false, isMobile = false, isMobileOpen = false, onMobileClose }) {
  const pathname = usePathname()
  const { hasPermission, user } = usePermission()

  // ── Item selection ─────────────────────────────────────────────────────────
  // USE_PERMISSION_EXPERIMENT = true  → all distinct hrefs across every role,
  //                                     filtered to what this user can access
  // USE_PERMISSION_EXPERIMENT = false → only the items scoped to the user's role,
  //                                     filtered by permission (current default)
  const candidateItems = USE_PERMISSION_EXPERIMENT
    ? getPermissionDrivenItems()
    : getSidebarItems(user)
  // Disabled items are always shown (they render as non-clickable "Coming Soon").
  // Active items require the user to hold the associated permission.
  const menuItems = candidateItems.filter((item) => item.disabled || hasPermission(item.permission))

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 text-white z-50 transition-all duration-300 ease-in-out ${
        isMobile
          ? `w-64 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`
          : isCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0f172a, #1e293b, #4f46e5)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      }}
    >
      {/* Logo */}
      <div className="px-4 md:px-6 py-4 md:py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-xl ring-2 ring-white/20 flex-shrink-0">
              R
            </div>
            {(!isCollapsed || isMobile) && (
              <h1 className="text-xl font-bold text-white transition-opacity duration-300">
                RRF Portal
              </h1>
            )}
          </div>
          {isMobile && (
            <button onClick={onMobileClose} className="text-white/70 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-6 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {menuItems.length > 0 ? (
          menuItems.map((item) => {
            // ── Disabled items: non-clickable with "Soon" badge ──
            if (item.disabled) {
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-3 px-4 py-3.5 text-gray-500 cursor-not-allowed ${
                    isCollapsed && !isMobile ? 'justify-center' : ''
                  }`}
                  title={isCollapsed && !isMobile ? `${item.label} (Coming Soon)` : 'Coming Soon'}
                >
                  <span className="text-xl flex-shrink-0 opacity-40">{item.icon}</span>
                  {(!isCollapsed || isMobile) && (
                    <span className="font-medium text-sm opacity-40">{item.label}</span>
                  )}
                  {(!isCollapsed || isMobile) && (
                    <span className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">Soon</span>
                  )}
                </div>
              )
            }

            // ── Active items: clickable links ──
            const active = isItemActive(item, pathname)
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3.5 transition-all duration-300 group
                  ${active ? 'text-white' : 'text-gray-300 hover:text-white'}
                  ${isCollapsed && !isMobile ? 'justify-center' : ''}
                `}
                style={active ? { background: 'rgba(255,255,255,0.1)', borderRadius: '10px' } : {}}
                title={isCollapsed && !isMobile ? item.label : ''}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {(!isCollapsed || isMobile) && (
                  <span className="font-medium text-sm transition-opacity duration-300">{item.label}</span>
                )}
              </Link>
            )
          })
        ) : (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            {(!isCollapsed || isMobile) && 'No menu items available'}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-white/10">
        {(!isCollapsed || isMobile) ? (
          <div className="text-xs text-gray-400 text-center font-medium transition-opacity duration-300">
            © 2026 RRF Portal
          </div>
        ) : (
          <div className="text-xs text-gray-400 text-center">©</div>
        )}
      </div>
    </aside>
  )
}
