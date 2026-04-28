'use client'

import { useState, useEffect, useMemo } from 'react'
import { Table, Modal, Form, Input, Select, Switch, Tag, Button, Space, Tooltip, Checkbox } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  UserOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { usersApi } from '@/lib/api/usersApi'
import { subfunctionsApi } from '@/lib/api/subfunctionsApi'
import { fetchFormConfig } from '@/lib/api/formConfig'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [subfunctions, setSubfunctions] = useState([])
  const [techOptions, setTechOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  // ─── Load Data ───────────────────────────────────────────────
  const loadData = async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes, subfunctionsRes, configRes] = await Promise.all([
        usersApi.getAll(),
        usersApi.getRoles(),
        subfunctionsApi.getAll(),
        fetchFormConfig(),
      ])
      setUsers(usersRes?.data || [])
      setRoles(rolesRes?.data || [])
      // ✅ FIX: subfunctionsApi.getAll() already returns response.data (the array)
      setSubfunctions(Array.isArray(subfunctionsRes) ? subfunctionsRes : subfunctionsRes?.data || [])
      
      // Extract technologies from form config
      const techConfig = configRes.find(c => c.fieldName === 'technologies' || c.fieldName === 'primaryTechnologies')
      setTechOptions(techConfig?.options || [])
    } catch (error) {
      toast.error('Failed to load users')
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // ─── Search Filter ──────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return users
    const q = searchText.toLowerCase()
    return users.filter(
      (u) =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.userId || '').toLowerCase().includes(q)
    )
  }, [users, searchText])

  // ─── Create User ────────────────────────────────────────────
  const handleCreate = async (values) => {
    try {
      setSubmitting(true)
      await usersApi.create(values)
      toast.success('User created successfully')
      setIsCreateOpen(false)
      createForm.resetFields()
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Edit User ──────────────────────────────────────────────
  const openEditModal = (user) => {
    // Extract assigned subfunction IDs (backend returns subfunctions: [{ id: 1, name: "SGINTL" }])
    const assignedIds = (user.subfunctions || []).map(sf => Number(sf.id))
    
    setEditingUser(user)
    editForm.setFieldsValue({
      fullName: user.fullName,
      department: user.department || '',
      phone: user.phone || '',
      roleId: user.role?.id,
      isActive: user.isActive,
      subfunctionIds: assignedIds,
      technologies: user.technologies || [],
    })
    setIsEditOpen(true)
  }

  const handleEdit = async (values) => {
    try {
      setSubmitting(true)
      await usersApi.update(editingUser.id, values)
      toast.success('User updated successfully')
      setIsEditOpen(false)
      setEditingUser(null)
      editForm.resetFields()
      await loadData()
    } catch (error) {
      toast.error(error.message || 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Toggle Active with Confirmation ────────────────────────
  const handleToggleActive = (user) => {
    const newStatus = !user.isActive
    Modal.confirm({
      title: `${newStatus ? 'Activate' : 'Deactivate'} User`,
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${user.fullName}?`,
      okText: newStatus ? 'Yes, Activate' : 'Yes, Deactivate',
      cancelText: 'Cancel',
      okButtonProps: newStatus ? {} : { danger: true },
      async onOk() {
        try {
          await usersApi.update(user.id, { isActive: newStatus })
          toast.success(`${user.fullName} ${newStatus ? 'activated' : 'deactivated'}`)
          await loadData()
        } catch (error) {
          toast.error(error.message || 'Failed to update user status')
        }
      },
    })
  }

  // ─── Table Columns ──────────────────────────────────────────
  const columns = [
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      render: (text) => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{text}</span>,
    },
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
      sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(text || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{text}</div>
            <div className="text-xs text-gray-500">{record.department || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span className="text-sm text-gray-600">{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: ['role', 'roleName'],
      key: 'role',
      width: 160,
      filters: roles.map((r) => ({ text: r.roleName, value: r.roleName })),
      onFilter: (value, record) => record.role?.roleName === value,
      render: (text, record) => {
        const code = record.role?.roleCode
        const colorMap = {
          ADMIN: 'red',
          PMO: 'blue',
          APPROVER: 'gold',
          HIRING_MANAGER: 'green',
          HR: 'purple',
        }
        return <Tag color={colorMap[code] || 'default'}>{text || 'Unknown'}</Tag>
      },
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'} className="font-medium">
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              className="text-indigo-600 hover:text-indigo-800"
            />
          </Tooltip>
          <Tooltip title={record.isActive ? 'Deactivate' : 'Activate'}>
            <Switch
              size="small"
              checked={record.isActive}
              onChange={() => handleToggleActive(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 inline-block">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search name, email, or ID..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-[280px]"
              allowClear
            />
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                createForm.resetFields()
                setIsCreateOpen(true)
              }}
              style={{ background: '#4f46e5' }}
            >
              Add User
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <Table
            dataSource={filteredUsers}
            columns={columns}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
            }}
            locale={{
              emptyText: (
                <div className="py-12 text-center">
                  <UserOutlined className="text-5xl text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No users found</p>
                  <p className="text-gray-400 text-sm">Try a different search or add a new user</p>
                </div>
              ),
            }}
          />
        </div>

        {/* ─── Create User Modal ───────────────────────────────── */}
        <Modal
          title="Add New User"
          open={isCreateOpen}
          onCancel={() => setIsCreateOpen(false)}
          footer={null}
          destroyOnHidden
          width={520}
          style={{ maxWidth: '90vw' }}
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            className="mt-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="userId"
                label="User ID"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g. hm002" />
              </Form.Item>
              <Form.Item
                name="fullName"
                label="Full Name"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="John Doe" />
              </Form.Item>
            </div>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Required' },
                { type: 'email', message: 'Invalid email' },
              ]}
            >
              <Input placeholder="john@company.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Required' },
                { min: 4, message: 'At least 4 characters' },
              ]}
            >
              <Input.Password placeholder="Set initial password" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="roleId"
                label="Role"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Select placeholder="Select role">
                  {roles.map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      {r.roleName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="department" label="Department">
                <Input placeholder="Engineering" />
              </Form.Item>
            </div>

            <Form.Item name="phone" label="Phone">
              <Input placeholder="+91 9876543210" />
            </Form.Item>

            <Form.Item
              name="technologies"
              label="Technical Expertise"
              tooltip="Technologies this user can interview for"
            >
              <Select
                mode="multiple"
                placeholder="Select technologies"
                allowClear
                style={{ width: '100%' }}
              >
                {techOptions.map((tech) => (
                  <Select.Option key={tech} value={tech}>
                    {tech}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Conditional Subfunction Selection for APPROVER Role */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.roleId !== currentValues.roleId
              }
            >
              {({ getFieldValue }) => {
                const roleId = getFieldValue('roleId')
                const selectedRole = roles.find(r => r.id === roleId)
                const isApprover = selectedRole?.roleCode === 'APPROVER'
                
                if (!isApprover) return null
                
                return (
                  <Form.Item
                    name="subfunctionIds"
                    label={
                      <span>
                        Subfunctions <span className="text-red-500">*</span>
                      </span>
                    }
                    rules={[
                      { 
                        required: true, 
                        message: 'Select at least one subfunction for APPROVER role',
                        type: 'array',
                        min: 1,
                      }
                    ]}
                  >
                    <Checkbox.Group style={{ width: '100%' }}>
                      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {subfunctions.map(sf => (
                          <Checkbox key={sf.id} value={Number(sf.id)}>
                            <span className="text-sm">
                              {sf.name}
                              <span className="text-xs text-gray-500 ml-1">
                                ({sf.function})
                              </span>
                            </span>
                          </Checkbox>
                        ))}
                      </div>
                    </Checkbox.Group>
                  </Form.Item>
                )
              }}
            </Form.Item>

            <div className="flex justify-end gap-3 mt-2">
              <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ background: '#4f46e5' }}
              >
                Create User
              </Button>
            </div>
          </Form>
        </Modal>

        {/* ─── Edit User Modal ─────────────────────────────────── */}
        <Modal
          title={`Edit User — ${editingUser?.fullName || ''}`}
          open={isEditOpen}
          onCancel={() => {
            setIsEditOpen(false)
            setEditingUser(null)
          }}
          footer={null}
          destroyOnHidden
          width={520}
          style={{ maxWidth: '90vw' }}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEdit}
            className="mt-4"
          >
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="roleId"
                label="Role"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Select>
                  {roles.map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      {r.roleName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="department" label="Department">
                <Input />
              </Form.Item>
            </div>

            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>

            <Form.Item
              name="technologies"
              label="Technical Expertise"
              tooltip="Technologies this user can interview for"
            >
              <Select
                mode="multiple"
                placeholder="Select technologies"
                allowClear
                style={{ width: '100%' }}
              >
                {techOptions.map((tech) => (
                  <Select.Option key={tech} value={tech}>
                    {tech}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* Conditional Subfunction Selection for APPROVER Role */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.roleId !== currentValues.roleId
              }
            >
              {({ getFieldValue }) => {
                const roleId = getFieldValue('roleId')
                const selectedRole = roles.find(r => r.id === roleId)
                const isApprover = selectedRole?.roleCode === 'APPROVER'
                
                if (!isApprover) return null
                
                return (
                  <Form.Item
                    name="subfunctionIds"
                    label={
                      <span>
                        Subfunctions <span className="text-red-500">*</span>
                      </span>
                    }
                    rules={[
                      { 
                        required: true, 
                        message: 'Select at least one subfunction for APPROVER role',
                        type: 'array',
                        min: 1,
                      }
                    ]}
                  >
                    <Checkbox.Group style={{ width: '100%' }}>
                      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {subfunctions.map(sf => (
                          <Checkbox key={sf.id} value={Number(sf.id)}>
                            <span className="text-sm">
                              {sf.name}
                              <span className="text-xs text-gray-500 ml-1">
                                ({sf.function})
                              </span>
                            </span>
                          </Checkbox>
                        ))}
                      </div>
                    </Checkbox.Group>
                  </Form.Item>
                )
              }}
            </Form.Item>

            <Form.Item name="isActive" label="Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>

            <div className="flex justify-end gap-3 mt-2">
              <Button onClick={() => { setIsEditOpen(false); setEditingUser(null) }}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ background: '#4f46e5' }}
              >
                Save Changes
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </div>
  )
}
