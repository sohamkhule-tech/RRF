'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { rrfApi } from '@/lib/api/rrfApi'

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadDrafts = useCallback(async () => {
    setLoading(true)
    try {
      // Drafts now live in the backend as DRAFT-status RRFs
      const response = await rrfApi.getMyRequests()
      const allRequests = response?.data || []
      const draftRrfs = allRequests.filter(
        (r) => r.status?.toLowerCase() === 'draft'
      )
      setDrafts(draftRrfs)
    } catch (error) {
      toast.error('Failed to load drafts')
      setDrafts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const handleDelete = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return
    try {
      await rrfApi.delete(draftId)
      setDrafts((prev) => prev.filter((d) => d.id !== draftId))
      toast.success('Draft deleted successfully!')
    } catch (error) {
      toast.error('Failed to delete draft')
    }
  }

  const handleEdit = (draftId) => {
    router.push(`/hiring-manager/create-rrf?draftId=${draftId}`)
  }

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'Low':      { bg: '#f3f4f6', color: '#374151' },
      'Medium':   { bg: '#dbeafe', color: '#1e40af' },
      'High':     { bg: '#fed7aa', color: '#9a3412' },
      'Critical': { bg: '#fee2e2', color: '#991b1b' },
    }
    const config = priorityConfig[priority] || priorityConfig['Medium']
    return (
      <span className="text-xs font-medium" style={{ backgroundColor: config.bg, color: config.color, borderRadius: '999px', padding: '6px 12px' }}>
        {priority || 'Medium'}
      </span>
    )
  }

  const filteredDrafts = drafts.filter((draft) => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (
      (draft.positionTitle || '').toLowerCase().includes(s) ||
      (draft.department || '').toLowerCase().includes(s) ||
      (draft.projectName || '').toLowerCase().includes(s) ||
      (draft.customerName || '').toLowerCase().includes(s)
    )
  })

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen" style={{ background: '#F5F7FB' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading drafts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8" style={{ background: '#F5F7FB', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg text-gray-800 font-bold">Resume your incomplete RRF requests</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-indigo-200 rounded-xl shadow-md">
          <div className="text-2xl">📝</div>
          <div>
            <p className="text-sm text-gray-700 font-bold">Total Drafts</p>
            <p className="text-3xl font-bold text-indigo-600">{drafts.length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search by Job Title, Department, Project, or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3.5 pl-12 pr-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all duration-300 bg-white hover:border-gray-300 hover:shadow-md text-sm placeholder-gray-400"
            style={{ fontSize: '14px' }}
          />
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-3 ml-1">
            Found {filteredDrafts.length} result{filteredDrafts.length !== 1 ? 's' : ''} for &quot;{searchTerm}&quot;
          </p>
        )}
      </div>

      {/* Empty State */}
      {filteredDrafts.length === 0 && (
        <div className="bg-white text-center py-16" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Drafts Found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'No drafts match your search' : "You haven't saved any RRF drafts yet"}
          </p>
          <Link href="/hiring-manager/create-rrf">
            <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300" style={{ borderRadius: '10px' }}>
              Create New RRF
            </button>
          </Link>
        </div>
      )}

      {/* Drafts Table */}
      {drafts.length > 0 && (
        <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', padding: '20px' }}>
          <div className="px-2 py-4 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Your Saved Drafts</h3>
              <p className="text-sm text-gray-500 mt-1">Click on any draft to continue editing</p>
            </div>
            <Link href="/hiring-manager/create-rrf">
              <button
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px' }}
              >
                <PlusOutlined />
                Create New RRF
              </button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Draft ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Saved On</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDrafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-600">DRAFT-{draft.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{draft.positionTitle || 'Untitled'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{draft.department || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        {draft.requisitionType || 'Not Set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{draft.headcount || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getPriorityBadge(draft.priority)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        const d = new Date(draft.updatedAt || draft.createdAt)
                        const day    = String(d.getDate()).padStart(2, '0')
                        const month  = String(d.getMonth() + 1).padStart(2, '0')
                        const year   = d.getFullYear()
                        const hour   = String(d.getHours()).padStart(2, '0')
                        const minute = String(d.getMinutes()).padStart(2, '0')
                        return `${day}/${month}/${year} ${hour}:${minute}`
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(draft.id)}
                          className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-1"
                          style={{ borderRadius: '8px' }}
                        >
                          <EditOutlined />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(draft.id)}
                          className="px-3 py-2 border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-all duration-300 flex items-center gap-1"
                          style={{ borderRadius: '8px' }}
                        >
                          <DeleteOutlined />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
