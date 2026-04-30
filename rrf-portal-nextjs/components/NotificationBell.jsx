'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { Badge, Spin } from 'antd'
import { useNotifications } from '@/contexts/NotificationContext'
import NotificationItem from '@/components/NotificationItem'

export default function NotificationBell() {
  const router = useRouter()
  const { unreadCount, notifications, loading, markAllAsRead, fetchNotifications } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen(!isOpen)
  }

  const handleViewAll = () => {
    setIsOpen(false)
    router.push('/notifications')
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-600 hover:text-indigo-600"
        title="Notifications"
      >
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined className="text-xl" />
        </Badge>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          style={{ maxHeight: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <CheckOutlined className="text-[10px]" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Spin size="small" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <BellOutlined className="text-3xl mb-2" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 8).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClose={() => setIsOpen(false)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleViewAll}
                className="w-full py-2.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-medium transition-colors"
              >
                View All Notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
