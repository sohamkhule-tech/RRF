'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOutlined, SearchOutlined, ReloadOutlined, LeftOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { rrfApi } from '@/lib/api/rrfApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClientLayout from '@/components/ClientLayout';

// ============================================
// WORKFLOW SYSTEM - HR OPEN FOR HIRING PAGE
// Updated: April 8, 2026
// Purpose: List RRFs open for hiring in a professional table format
// ============================================

function OpenForHiringPage() {
  const [rrfs, setRrfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchOpenForHiring();
  }, []);

  const fetchOpenForHiring = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await rrfApi.getOpenForHiring();
      // Ensure we have an array
      setRrfs(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(error.message || 'Failed to load open positions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getPriorityBadge = (priority) => {
    const config = {
      'Low':      { bg: '#f3f4f6', color: '#374151' },
      'Medium':   { bg: '#dbeafe', color: '#1e40af' },
      'High':     { bg: '#fed7aa', color: '#9a3412' },
      'Critical': { bg: '#fee2e2', color: '#991b1b' },
    };
    const c = config[priority] || config['Medium'];
    return (
      <span className="text-xs font-medium"
        style={{ backgroundColor: c.bg, color: c.color, borderRadius: '999px', padding: '6px 12px' }}>
        {priority || 'Medium'}
      </span>
    );
  };

  // Filter RRFs based on search
  const filteredRrfs = Array.isArray(rrfs) ? rrfs.filter(rrf => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (rrf.rrfNumber || '').toLowerCase().includes(search) ||
      (rrf.positionTitle || '').toLowerCase().includes(search) ||
      (rrf.subFunction || '').toLowerCase().includes(search) ||
      (rrf.projectName || '').toLowerCase().includes(search)
    );
  }) : [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all"
      >
        <LeftOutlined />
        Back
      </button>

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Open for Hiring</h1>
          <p className="text-gray-600 mt-1">Active recruitment positions awaiting closure</p>
        </div>
        
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-green-100 rounded-2xl shadow-sm">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl">
            🚀
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Recruitments</p>
            <p className="text-xl md:text-3xl font-black text-green-600">{loading ? '—' : rrfs.length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <SearchOutlined
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            style={{ fontSize: '18px' }}
          />
          <input
            type="text"
            placeholder="Search by RRF ID, Role, Sub-Function, or Project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-50/50 focus:outline-none transition-all text-sm bg-white"
          />
        </div>
        
        <button
          onClick={fetchOpenForHiring}
          disabled={loading}
          className="px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 hover:border-green-500 hover:text-green-600 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-bold shadow-sm"
        >
          <ReloadOutlined className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="pl-8 pr-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">RRF ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role / Title</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sub-Function</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Opened On</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium text-gray-500">Fetching positions...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="text-4xl mb-4">⚠️</div>
                      <p className="text-red-600 font-semibold mb-2">{error}</p>
                      <button onClick={fetchOpenForHiring} className="text-green-600 font-bold hover:underline">Try Again</button>
                    </div>
                  </td>
                </tr>
              ) : filteredRrfs.length > 0 ? (
                filteredRrfs.map((rrf) => (
                  <tr key={rrf.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="pl-8 pr-6 py-5 whitespace-nowrap text-left">
                      <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
                        {rrf.rrfNumber || `RRF-${rrf.id}`}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-left">
                      <div className="text-sm font-bold text-gray-900">{rrf.positionTitle || '—'}</div>
                      <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{rrf.status}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium text-left">
                      {rrf.subFunction || '—'}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 font-medium text-left">
                      {rrf.projectName || '—'}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-green-50 text-green-700 rounded-full font-bold text-xs">
                        {rrf.numberOfPositions || 1}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-left">
                      {getPriorityBadge(rrf.priority)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium text-left">
                      {formatDate(rrf.createdAt)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-left">
                      <button
                        onClick={() => router.push(`/hr/view-rrf/${rrf.id}`)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold flex items-center gap-2"
                      >
                        <EyeOutlined /> View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-5xl opacity-40">📝</div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">No positions found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {searchTerm ? `No results for "${searchTerm}"` : 'There are no active recruitments at this time.'}
                        </p>
                      </div>
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-green-600 font-bold hover:underline">Clear Search</button>
                      )}
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
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-gray-500">Fetching positions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold mb-2">{error}</p>
              <button onClick={fetchOpenForHiring} className="text-green-600 font-bold hover:underline">Try Again</button>
            </div>
          ) : filteredRrfs.length > 0 ? (
            filteredRrfs.map((rrf) => (
              <div key={rrf.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-indigo-600 mb-1">{rrf.rrfNumber || `RRF-${rrf.id}`}</div>
                    <div className="text-sm font-bold text-gray-900 truncate">{rrf.positionTitle || '—'}</div>
                    <div className="text-xs text-gray-500 truncate">{rrf.subFunction || '—'} · {rrf.projectName || '—'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getPriorityBadge(rrf.priority)}
                  <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full font-bold text-xs">
                    {rrf.numberOfPositions || 1} pos
                  </span>
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/hr/view-rrf/${rrf.id}`)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold flex items-center gap-2"
                  >
                    <EyeOutlined /> View Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl opacity-40 mb-4">📝</div>
              <p className="text-lg font-bold text-gray-900">No positions found</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm ? `No results for "${searchTerm}"` : 'There are no active recruitments at this time.'}
              </p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-green-600 font-bold hover:underline mt-2">Clear Search</button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && filteredRrfs.length > 0 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Showing {filteredRrfs.length} of {rrfs.length} position{rrfs.length === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProtectedOpenForHiringPage() {
  return (
    <ProtectedRoute>
      <OpenForHiringPage />
    </ProtectedRoute>
  );
}
