'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead } from '@/lib/api/notificationsApi'

const NotificationContext = createContext({})

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      if (res?.success) {
        setUnreadCount(res.data.count)
      }
    } catch (err) {
      // Silently fail — non-critical
    }
  }, [])

  // Fetch recent notifications (for dropdown)
  const fetchNotifications = useCallback(async (params = {}) => {
    try {
      setLoading(true)
      const res = await getNotifications({ limit: 10, ...params })
      if (res?.success) {
        setNotifications(res.data)
        return res
      }
    } catch (err) {
      console.error('[Notifications] Fetch error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark single notification as read
  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('[Notifications] Mark read error:', err.message)
    }
  }, [])

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err.message)
    }
  }, [])

  // WebSocket connection
  useEffect(() => {
    if (!user) {
      // Disconnect if logged out
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setUnreadCount(0)
      setNotifications([])
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    // Initial fetch
    fetchUnreadCount()
    fetchNotifications()

    // Connect WebSocket
    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    })

    socket.on('connect', () => {
      console.log('[WS] Connected to notifications')
    })

    socket.on('notification', (data) => {
      // Add to top of list
      setNotifications((prev) => [{ ...data, isRead: false }, ...prev].slice(0, 20))
      setUnreadCount((prev) => prev + 1)

      // Show toast
      const priority = data.priority || 'MEDIUM'
      if (priority === 'HIGH' || priority === 'CRITICAL') {
        toast(data.title || 'New notification', {
          icon: '🔔',
          duration: 5000,
          style: {
            borderLeft: '4px solid #6366f1',
          },
        })
      } else {
        toast(data.title || 'New notification', {
          icon: '🔔',
          duration: 3000,
        })
      }
    })

    socket.on('unread-count', (data) => {
      setUnreadCount(data.count)
    })

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.warn('[WS] Connection error:', error.message)
    })

    socketRef.current = socket

    // Polling fallback: refresh unread count every 60s
    const pollInterval = setInterval(fetchUnreadCount, 60000)

    return () => {
      clearInterval(pollInterval)
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (socket) {
        socket.disconnect()
      }
      socketRef.current = null
    }
  }, [user, fetchUnreadCount, fetchNotifications])

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        fetchUnreadCount,
        fetchNotifications,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
