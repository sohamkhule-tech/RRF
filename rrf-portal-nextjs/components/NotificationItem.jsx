'use client'

import { useRouter } from 'next/navigation'
import { useNotifications } from '@/contexts/NotificationContext'
import { useAuth } from '@/contexts/AuthContext'
import { resolveNotificationRoute } from '@/utils/notificationRoutes'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const typeIcons = {
  RRF_SUBMITTED: '📋',
  RRF_RESUBMITTED: '🔄',
  RRF_APPROVED: '✅',
  RRF_REJECTED: '❌',
  RRF_DECLINED: '⛔',
  RRF_ON_HOLD: '⏸️',
  RRF_OPENED_FOR_HIRING: '🟢',
  RRF_FILLED_BY_BENCH: '👥',
  RRF_CLOSED: '🔒',
  RRF_UPDATED: '📝',
  RRF_CREATED: '➕',
  RRF_DELETED: '🗑️',
  USER_CREATED: '👤',
  USER_UPDATED: '✏️',
  USER_ROLE_CHANGED: '🔑',
  USER_ACTIVATED: '✅',
  USER_DEACTIVATED: '🚫',
  USER_SUBFUNCTIONS_CHANGED: '🔧',
  SYSTEM_ANNOUNCEMENT: '📢',
}

export default function NotificationItem({ notification, onClose, showFull = false }) {
  const router = useRouter()
  const { markAsRead } = useNotifications()
  const { user } = useAuth()

  const handleClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
    const route = resolveNotificationRoute(notification, user)
    if (route) {
      router.push(route)
      if (onClose) onClose()
    }
  }

  const icon = typeIcons[notification.type] || '🔔'
  const timeAgo = dayjs(notification.createdAt).fromNow()

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
        notification.isRead
          ? 'bg-white hover:bg-gray-50'
          : 'bg-indigo-50/40 hover:bg-indigo-50/70'
      }`}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 mt-1.5">
        {!notification.isRead ? (
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
        ) : (
          <div className="w-2 h-2" />
        )}
      </div>

      {/* Icon */}
      <div className="flex-shrink-0 text-lg mt-0.5">{icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
          {notification.title}
        </p>
        {showFull && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>

      {/* Priority indicator */}
      {(notification.priority === 'HIGH' || notification.priority === 'CRITICAL') && (
        <div className="flex-shrink-0 mt-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" title="High priority" />
        </div>
      )}
    </div>
  )
}
