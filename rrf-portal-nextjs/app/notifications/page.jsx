'use client'

import { useState, useEffect, useCallback } from 'react'
import { BellOutlined, CheckOutlined, FilterOutlined, DeleteOutlined } from '@ant-design/icons'
import { Spin, Empty, Pagination, Select } from 'antd'
import { useNotifications } from '@/contexts/NotificationContext'
import { getNotifications, deleteNotification } from '@/lib/api/notificationsApi'
import NotificationItem from '@/components/NotificationItem'
import toast from 'react-hot-toast'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'RRF', label: 'RRF' },
  { value: 'USER', label: 'Users' },
]

export default function NotificationsPage() {
  const { markAllAsRead, fetchUnreadCount } = useNotifications()
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page, limit: 20 }

      if (filter === 'unread') {
        params.isRead = 'false'
      } else if (filter === 'RRF') {
        params.entityType = 'RRF'
      } else if (filter === 'USER') {
        params.entityType = 'USER'
      }

      const res = await getNotifications(params)
      if (res?.success) {
        setNotifications(res.data)
        setTotal(res.total)
      }
    } catch (err) {
      console.error('[NotificationsPage] Fetch error:', err.message)
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    fetchData()
    toast.success('All notifications marked as read')
  }

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setTotal((prev) => prev - 1)
      fetchUnreadCount()
      toast.success('Notification deleted')
    } catch (err) {
      toast.error('Failed to delete notification')
    }
  }

  const handleFilterChange = (value) => {
    setFilter(value)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BellOutlined className="text-indigo-600 text-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">{total} total</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={filter}
              onChange={handleFilterChange}
              options={filterOptions}
              style={{ width: 130 }}
              size="middle"
              suffixIcon={<FilterOutlined />}
            />
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <CheckOutlined className="text-xs" />
              Mark all read
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spin size="large" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-gray-400">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </span>
                }
              />
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-center group">
                  <div className="flex-1">
                    <NotificationItem
                      notification={notification}
                      showFull={true}
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(notification.id)
                    }}
                    className="flex-shrink-0 p-2 mr-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center mt-6">
            <Pagination
              current={page}
              total={total}
              pageSize={20}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
