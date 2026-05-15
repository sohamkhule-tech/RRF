'use client';

/**
 * PHASE 6 — Legacy compatibility redirect.
 * Original implementation preserved below (non-exported) for rollback.
 * Rollback: remove the redirect and restore `export default` on the original component.
 */
import { redirect } from 'next/navigation';
export default function Page() { redirect('/workflow?view=open-positions'); }

// ── Original implementation (preserved for rollback) ────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReloadOutlined, SearchOutlined, LeftOutlined } from '@ant-design/icons';
import { rrfApi } from '@/lib/api/rrfApi';
import ActionButton from '@/components/ActionButton';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClientLayout from '@/components/ClientLayout';

function OpenPositionsPage() {
  const [rrfs, setRrfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const router = useRouter();

  const fetchOpenPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await rrfApi.getOpenPositions();
      const list = response?.data || response || [];
      setRrfs(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load open positions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenPositions();
  }, [fetchOpenPositions]);

  const getPriorityBadge = (priority) => {
    const cfg = {
      'Low':      { bg: '#f3f4f6', color: '#374151' },
      'Medium':   { bg: '#dbeafe', color: '#1e40af' },
      'High':     { bg: '#fed7aa', color: '#9a3412' },
      'Critical': { bg: '#fee2e2', color: '#991b1b' },
    };
    const c = cfg[priority] || cfg['Medium'];
    return (
      <span className="text-xs font-medium"
        style={{ backgroundColor: c.bg, color: c.color, borderRadius: '999px', padding: '6px 12px' }}>
        {priority || 'Medium'}
      </span>
    );
  };

  // Dynamic department list from live data
  const departments = [...new Set(rrfs.map(r => r.department).filter(Boolean))];

  const filteredRrfs = rrfs.filter(rrf => {
    const matchDept = selectedDepartment === 'all' || rrf.department === selectedDepartment;
    if (!matchDept) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (rrf.rrfNumber || '').toLowerCase().includes(s) ||
      (rrf.positionTitle || '').toLowerCase().includes(s) ||
      (rrf.createdBy?.fullName || '').toLowerCase().includes(s) ||
      (rrf.projectName || '').toLowerCase().includes(s) ||
      (rrf.department || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all"
      >
        <LeftOutlined />
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-lg font-bold text-gray-800">
          Approved RRFs — Review and open for hiring
        </p>
        <div className="flex items-center gap-3 px-3 py-2 md:px-5 md:py-3 bg-white border-2 border-orange-200 rounded-xl shadow-md">
          <div className="text-2xl">⏳</div>
          <div>
            <p className="text-sm font-bold text-gray-700">Total Open</p>
            <p className="text-xl md:text-3xl font-bold text-orange-600">{loading ? '—' : rrfs.length}</p>
          </div>
        </div>
      </div>

      {/* Search + Filter + Reload */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <SearchOutlined
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            style={{ fontSize: '16px' }}
          />
          <input
            type="text"
            placeholder="Search by RRF ID, Role, Requester, Project or Department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none text-sm bg-white"
          />
        </div>

        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="w-full md:w-56 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white text-sm font-medium text-gray-700 cursor-pointer"
        >
          <option value="all">📁 All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <button
          onClick={fetchOpenPositions}
          disabled={loading}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
        >
          <ReloadOutlined className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Open Positions</h3>
          <p className="text-sm text-gray-500 mt-0.5">Approved RRFs awaiting PMO action</p>
        </div>

        {error && (
          <div className="mx-6 my-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchOpenPositions} className="underline font-medium ml-4">Retry</button>
          </div>
        )}

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-0">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Approved On</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <ReloadOutlined className="animate-spin text-indigo-500" style={{ fontSize: '28px' }} />
                      <p className="text-sm font-medium">Loading open positions...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRrfs.length > 0 ? (
                filteredRrfs.map((rrf) => (
                  <tr key={rrf.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-sm font-bold text-indigo-600">
                        {rrf.rrfNumber || `RRF-${rrf.id}`}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700">
                      {rrf.createdBy?.fullName || '—'}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rrf.positionTitle || '—'}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                      {rrf.projectName || '—'}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                        {rrf.headcount || 1}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {getPriorityBadge(rrf.priority)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                      {(rrf.approvedAt || rrf.createdAt) ? new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <ActionButton
                        role="PMO"
                        status={rrf.status}
                        href={`/requests/${rrf.id}`}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-4xl opacity-40">📋</div>
                      <p className="text-lg font-medium">No open positions found</p>
                      <p className="text-sm">
                        {searchTerm || selectedDepartment !== 'all'
                          ? 'Try adjusting your filters'
                          : 'No approved RRFs available for action yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden px-2 pb-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              <ReloadOutlined className="animate-spin text-indigo-500" style={{ fontSize: '28px' }} />
              <p className="text-sm font-medium mt-3">Loading open positions...</p>
            </div>
          ) : filteredRrfs.length > 0 ? (
            filteredRrfs.map((rrf) => (
              <div key={rrf.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{rrf.rrfNumber || `RRF-${rrf.id}`}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{rrf.positionTitle || '—'}</div>
                    <div className="text-xs text-gray-500 truncate">{rrf.createdBy?.fullName || '—'} · {rrf.projectName || '—'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(rrf.priority)}
                  <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                    {rrf.headcount || 1} pos
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-3">Approved: {(rrf.approvedAt || rrf.createdAt) ? new Date(rrf.approvedAt || rrf.createdAt).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <ActionButton role="PMO" status={rrf.status} href={`/requests/${rrf.id}`} />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm font-medium">No open positions found</p>
            </div>
          )}
        </div>

        {!loading && filteredRrfs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {filteredRrfs.length} of {rrfs.length} position{rrfs.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Legacy: was `export default OpenPositionsPage;`
