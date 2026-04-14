'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Table, Tag, Select, Input, Button, Tooltip } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { rrfApi, formatRrfForDisplay } from '@/lib/api/rrfApi'
import toast from 'react-hot-toast'

const STATUS_TAG_COLORS = {
  draft: 'default',
  pending: 'orange',
  submitted: 'orange',
  approved: 'green',
  rejected: 'red',
  declined: 'red',
  'on-hold': 'gold',
  'in-progress': 'cyan',
  'open-for-hiring': 'cyan',
  'closed-by-bench': 'purple',
  closed: 'geekblue',
}

export default function AdminRrfManagement() {
  const router = useRouter()
  const [rrfs, setRrfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)
  const [roleFilter, setRoleFilter] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const params = { page: 1, limit: 500 }
      if (statusFilter) {
        params.status = statusFilter
      }
      const res = await rrfApi.getAll(params)
      const data = res?.data || []
      setRrfs(data.map(formatRrfForDisplay))
    } catch (error) {
      toast.error('Failed to load RRFs')
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter])

  // Client-side filters
  const filteredRrfs = useMemo(() => {
    let result = rrfs

    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(
        (r) =>
          (r.displayId || '').toLowerCase().includes(q) ||
          (r.positionTitle || '').toLowerCase().includes(q) ||
          (r.manager || '').toLowerCase().includes(q) ||
          (r.department || '').toLowerCase().includes(q)
      )
    }

    if (roleFilter) {
      result = result.filter((r) => {
        const creatorRole = r.createdBy?.role?.roleName || ''
        return creatorRole.toLowerCase().includes(roleFilter.toLowerCase())
      })
    }

    return result
  }, [rrfs, searchText, roleFilter])

  const columns = [
    {
      title: 'ID',
      dataIndex: 'displayId',
      key: 'displayId',
      width: 120,
      sorter: (a, b) => (a.displayId || '').localeCompare(b.displayId || ''),
      render: (text) => (
        <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">
          {text || '—'}
        </span>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'positionTitle',
      key: 'positionTitle',
      sorter: (a, b) => (a.positionTitle || '').localeCompare(b.positionTitle || ''),
      render: (text, record) => (
        <div>
          <div className="font-semibold text-gray-900 text-sm">{text}</div>
          <div className="text-xs text-gray-500">{record.department || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'manager',
      key: 'manager',
      width: 180,
      render: (text, record) => (
        <div>
          <div className="text-sm text-gray-800">{text}</div>
          <div className="text-xs text-gray-500">
            {record.createdBy?.role?.roleName || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => (
        <Tag color={STATUS_TAG_COLORS[status] || 'default'} className="font-medium capitalize">
          {(status || 'unknown').replace(/-/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (p) => {
        const colors = { High: 'red', Medium: 'gold', Low: 'green' }
        return <Tag color={colors[p] || 'default'}>{p}</Tag>
      },
    },
    {
      title: 'Created',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: (text) => <span className="text-sm text-gray-600">{text}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/admin/rrf-management/${record.id}`)}
          style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 inline-block">
              {filteredRrfs.length} request{filteredRrfs.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
            <Input
              placeholder="Search ID, position, creator..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-60"
              allowClear
            />
            <div className="flex gap-2">
              <Select
                placeholder="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                allowClear
                className="flex-1 sm:w-36"
              >
                <Select.Option value="draft">Draft</Select.Option>
                <Select.Option value="pending">Pending</Select.Option>
                <Select.Option value="approved">Approved</Select.Option>
                <Select.Option value="declined">Declined</Select.Option>
                <Select.Option value="on-hold">On Hold</Select.Option>
                <Select.Option value="in-progress">In Progress</Select.Option>
                <Select.Option value="closed">Closed</Select.Option>
              </Select>
              <Select
                placeholder="Role"
                value={roleFilter}
                onChange={(v) => setRoleFilter(v)}
                allowClear
                className="flex-1 sm:w-36"
              >
                <Select.Option value="Hiring Manager">Hiring Manager</Select.Option>
                <Select.Option value="PMO">PMO</Select.Option>
                <Select.Option value="Admin">Admin</Select.Option>
              </Select>
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table
              dataSource={filteredRrfs}
              columns={columns}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 800 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                size: 'small',
              }}
              locale={{
                emptyText: (
                  <div className="py-12 text-center">
                    <FileTextOutlined className="text-5xl text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No RRF requests found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                  </div>
                ),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
