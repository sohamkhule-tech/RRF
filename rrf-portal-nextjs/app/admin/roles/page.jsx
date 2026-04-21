'use client'

import { useState, useEffect, useMemo } from 'react'
import { Table, Modal, Checkbox, Tag, Button, Space, Tooltip, Collapse, Spin, Pagination } from 'antd'
import {
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  KeyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { Input } from 'antd'
import { rolesApi } from '@/lib/api/rolesApi'
import { permissionsApi } from '@/lib/api/permissionsApi'
import toast from 'react-hot-toast'

const { Panel } = Collapse

export default function AdminRolesPage() {
  const [roles, setRoles] = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Pagination inside modal
  const PERMS_PAGE_SIZE = 3
  const [permPage, setPermPage] = useState(1)

  // Permission selection state
  const [initialPermissions, setInitialPermissions] = useState([])
  const [selectedPermissions, setSelectedPermissions] = useState([])

  // ─── Load Roles ─────────────────────────────────────────────
  const loadRoles = async () => {
    try {
      setLoading(true)
      const response = await rolesApi.getAll()
      setRoles(response?.data || [])
    } catch (error) {
      toast.error('Failed to load roles')
      console.error('Load roles error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  // ─── Search Filter ──────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    if (!searchText.trim()) return roles
    const q = searchText.toLowerCase()
    return roles.filter(
      (r) =>
        (r.roleName || '').toLowerCase().includes(q) ||
        (r.roleCode || '').toLowerCase().includes(q)
    )
  }, [roles, searchText])

  // ─── Group Permissions by Module ────────────────────────────
  const groupedPermissions = useMemo(() => {
    if (!allPermissions.length) return []
    
    const groups = allPermissions.reduce((acc, perm) => {
      const moduleCode = perm.module?.moduleCode || 'OTHER'
      if (!acc[moduleCode]) {
        acc[moduleCode] = {
          moduleCode,
          moduleName: perm.module?.moduleName || 'Other',
          moduleId: perm.module?.id,
          permissions: [],
        }
      }
      acc[moduleCode].permissions.push(perm)
      return acc
    }, {})

    return Object.values(groups).sort((a, b) =>
      a.moduleName.localeCompare(b.moduleName)
    )
  }, [allPermissions])

  // ─── Paginated slice of module groups ───────────────────────
  const pagedGroups = useMemo(() => {
    const start = (permPage - 1) * PERMS_PAGE_SIZE
    return groupedPermissions.slice(start, start + PERMS_PAGE_SIZE)
  }, [groupedPermissions, permPage])

  // ─── Change Detection ───────────────────────────────────────
  const hasChanges = useMemo(() => {
    if (initialPermissions.length !== selectedPermissions.length) return true
    const initialSet = new Set(initialPermissions)
    return !selectedPermissions.every((id) => initialSet.has(id))
  }, [initialPermissions, selectedPermissions])

  // ─── Select All Checkbox State ─────────────────────────────
  const allChecked = allPermissions.length > 0 && 
    selectedPermissions.length === allPermissions.length
  const indeterminate = selectedPermissions.length > 0 && !allChecked

  // ─── Open Edit Permissions Modal ───────────────────────────
  const openEditModal = async (role) => {
    setSelectedRole(role)
    setIsModalOpen(true)
    setLoadingPermissions(true)
    setPermPage(1) // reset to first page every time modal opens

    try {
      console.log('📋 Opening permissions modal for role:', role)
      console.log('🌐 API Base URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
      
      // Fetch all permissions and role-specific permissions in parallel
      const [allPermsRes, rolePermsRes] = await Promise.all([
        allPermissions.length > 0 
          ? Promise.resolve({ data: allPermissions }) 
          : permissionsApi.getAll(),
        rolesApi.getPermissions(role.id),
      ])

      console.log('✅ All permissions response:', allPermsRes)
      console.log('✅ Role permissions response:', rolePermsRes)

      // Cache all permissions if first time
      if (allPermissions.length === 0) {
        setAllPermissions(allPermsRes?.data || [])
      }

      // Set initial and selected permissions
      const rolePermIds = (rolePermsRes?.data || []).map((p) => p.id)
      setInitialPermissions(rolePermIds)
      setSelectedPermissions(rolePermIds)

      console.log('✅ Modal loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load permissions:', error)
      
      // Provide detailed error message
      let errorMessage = 'Failed to load permissions'
      if (error.message) {
        if (error.message.includes('Cannot connect')) {
          errorMessage = 'Cannot connect to backend. Ensure backend is running on port 4000.'
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access denied. Ensure ROLES.UPDATE permission is assigned to ADMIN role.'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Session expired. Please login again.'
        } else {
          errorMessage = `Failed to load permissions: ${error.message}`
        }
      }
      
      toast.error(errorMessage)
      console.error('🔍 Debugging info:', {
        errorMessage: error.message,
        errorStack: error.stack,
        role: role,
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
      })
      setIsModalOpen(false)
    } finally {
      setLoadingPermissions(false)
    }
  }

  // ─── Handle Modal Close with Unsaved Changes Check ─────────
  const handleCloseModal = () => {
    if (hasChanges) {
      Modal.confirm({
        title: 'Unsaved Changes',
        icon: <ExclamationCircleOutlined />,
        content: 'You have unsaved changes. Are you sure you want to discard them?',
        okText: 'Discard',
        cancelText: 'Keep Editing',
        okButtonProps: { danger: true },
        onOk() {
          resetModal()
        },
      })
    } else {
      resetModal()
    }
  }

  const resetModal = () => {
    setIsModalOpen(false)
    setSelectedRole(null)
    setInitialPermissions([])
    setSelectedPermissions([])
  }

  // ─── Toggle Select All ──────────────────────────────────────
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPermissions(allPermissions.map((p) => p.id))
    } else {
      setSelectedPermissions([])
    }
  }

  // ─── Handle Checkbox Group Change ──────────────────────────
  const handlePermissionChange = (moduleCode, checkedValues) => {
    // Get IDs of permissions NOT in this module
    const modulePermIds = groupedPermissions
      .find((g) => g.moduleCode === moduleCode)
      ?.permissions.map((p) => p.id) || []
    
    const otherPermIds = selectedPermissions.filter(
      (id) => !modulePermIds.includes(id)
    )

    // Combine other permissions with newly checked ones
    setSelectedPermissions([...otherPermIds, ...checkedValues])
  }

  // ─── Save Permissions ───────────────────────────────────────
  const handleSave = async () => {
    if (!selectedRole) return

    try {
      setSubmitting(true)
      await rolesApi.updatePermissions(selectedRole.id, selectedPermissions)
      toast.success(`Permissions updated successfully for ${selectedRole.roleName}`)
      resetModal()
      // Optionally refresh roles list
    } catch (error) {
      toast.error(error.message || 'Failed to update permissions')
      console.error('Update permissions error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Table Columns ──────────────────────────────────────────
  const columns = [
    {
      title: 'Role Name',
      dataIndex: 'roleName',
      key: 'roleName',
      sorter: (a, b) => (a.roleName || '').localeCompare(b.roleName || ''),
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {(text || 'R').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{text}</div>
            <div className="text-xs text-gray-500">{record.description || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role Code',
      dataIndex: 'roleCode',
      key: 'roleCode',
      width: 180,
      render: (text) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
          {text}
        </span>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: (a, b) => a.priority - b.priority,
      render: (priority) => (
        <Tag color={priority === 0 ? 'red' : 'blue'}>{priority}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
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
      width: 120,
      render: (_, record) => (
        <Tooltip title="Edit Permissions">
          <Button
            type="primary"
            icon={<KeyOutlined />}
            onClick={() => openEditModal(record)}
            size="small"
          >
            Permissions
          </Button>
        </Tooltip>
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
              {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search role name or code..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-[280px]"
              allowClear
            />
            <Tooltip title="Refresh">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadRoles} 
                loading={loading} 
              />
            </Tooltip>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <Table
            dataSource={filteredRoles}
            columns={columns}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} role${total !== 1 ? 's' : ''}`,
            }}
            locale={{
              emptyText: (
                <div className="py-12 text-center">
                  <KeyOutlined className="text-5xl text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No roles found</p>
                  <p className="text-gray-400 text-sm">Try a different search</p>
                </div>
              ),
            }}
          />
        </div>

        {/* ─── Edit Permissions Modal ───────────────────────────── */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <KeyOutlined className="text-indigo-600" />
              <span>Manage Permissions for {selectedRole?.roleName}</span>
            </div>
          }
          open={isModalOpen}
          onCancel={handleCloseModal}
          width={720}
          style={{ maxWidth: '90vw' }}
          footer={[
            <Button key="cancel" onClick={handleCloseModal}>
              Cancel
            </Button>,
            <Button
              key="save"
              type="primary"
              onClick={handleSave}
              loading={submitting}
              disabled={!hasChanges || loadingPermissions}
              icon={<CheckCircleOutlined />}
              style={{ background: hasChanges ? '#4f46e5' : undefined }}
            >
              Save Changes
            </Button>,
          ]}
          destroyOnHidden
        >
          {loadingPermissions ? (
            <div className="flex justify-center items-center py-12">
              <Spin size="large" tip="Loading permissions..." />
            </div>
          ) : (
            <div className="py-4">
              {/* Selection Count */}
              <div className="mb-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-700">
                  <strong className="text-indigo-600">{selectedPermissions.length}</strong>
                  {' of '}
                  <strong>{allPermissions.length}</strong>
                  {' permissions selected'}
                </div>
                <Checkbox
                  checked={allChecked}
                  indeterminate={indeterminate}
                  onChange={handleSelectAll}
                  className="font-medium"
                >
                  Select All
                </Checkbox>
              </div>

              {/* Permissions Grouped by Module — paginated */}
              <Collapse
                defaultActiveKey={pagedGroups.map((g) => g.moduleCode)}
                activeKey={pagedGroups.map((g) => g.moduleCode)}
                className="bg-white"
              >
                {pagedGroups.map((group) => {
                  const groupPermIds = group.permissions.map((p) => p.id)
                  const selectedInGroup = selectedPermissions.filter((id) =>
                    groupPermIds.includes(id)
                  )

                  return (
                    <Panel
                      key={group.moduleCode}
                      header={
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">
                            {group.moduleName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {selectedInGroup.length}/{group.permissions.length} selected
                          </span>
                        </div>
                      }
                    >
                      <Checkbox.Group
                        value={selectedInGroup}
                        onChange={(checkedValues) =>
                          handlePermissionChange(group.moduleCode, checkedValues)
                        }
                        className="w-full"
                      >
                        <div className="grid grid-cols-1 gap-2">
                          {group.permissions.map((perm) => (
                            <Checkbox key={perm.id} value={perm.id} className="ml-0">
                              <div>
                                <div className="font-medium text-gray-700">
                                  {perm.permissionName}
                                </div>
                                {perm.description && (
                                  <div className="text-xs text-gray-500">
                                    {perm.description}
                                  </div>
                                )}
                              </div>
                            </Checkbox>
                          ))}
                        </div>
                      </Checkbox.Group>
                    </Panel>
                  )
                })}
              </Collapse>

              {/* Module Pagination */}
              {groupedPermissions.length > PERMS_PAGE_SIZE && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    current={permPage}
                    pageSize={PERMS_PAGE_SIZE}
                    total={groupedPermissions.length}
                    onChange={(page) => setPermPage(page)}
                    showTotal={(total) => `${total} modules total`}
                    size="small"
                  />
                </div>
              )}

              {/* Unsaved Changes Warning */}
              {hasChanges && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <ExclamationCircleOutlined className="text-amber-600" />
                  <span className="text-sm text-amber-800">
                    You have unsaved changes
                  </span>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}
