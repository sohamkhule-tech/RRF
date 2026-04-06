'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOutlined, RocketOutlined, TeamOutlined} from '@ant-design/icons';
import toast from 'react-hot-toast';
import * as rrfApi from '@/lib/api/rrfApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClientLayout from '@/components/ClientLayout';

// ============================================
// WORKFLOW SYSTEM - PMO OPEN POSITIONS PAGE
// Created: April 1, 2026
// Purpose: List approved RRFs and PMO actions
// ============================================

function OpenPositionsPage() {
  const [rrfs, setRrfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchOpenPositions();
  }, []);

  const fetchOpenPositions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await rrfApi.getOpenPositions();
      setRrfs(data);
    } catch (error) {
      setError(error.message || 'Failed to load open positions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForHiring = async (rrfId) => {
    if (!window.confirm('Open this position for recruitment?')) return;
    try {
      await rrfApi.openForHiring(rrfId);
      toast.success('Position opened for hiring! HR team can now start recruitment.');
      fetchOpenPositions();
    } catch (error) {
      toast.error(error.message || 'Failed to open for hiring');
    }
  };

  const handleFillByBench = async (rrfId) => {
    const notes = window.prompt('Enter notes about filling from bench (optional):');
    try {
      await rrfApi.fillByBench(rrfId, notes || '');
      toast.success('Position filled from bench successfully!');
      fetchOpenPositions();
    } catch (error) {
      toast.error(error.message || 'Failed to mark as filled by bench');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getPriorityBadge = (priority) => {
    const config = {
      'Low': 'bg-gray-100 text-gray-800',
      'Medium': 'bg-blue-100 text-blue-800',
      'High': 'bg-orange-100 text-orange-800',
      'Critical': 'bg-red-100 text-red-800'
    };
    return config[priority] || config['Medium'];
  };

  // Filter RRFs based on search
  const filteredRrfs = rrfs.filter(rrf => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (rrf.rrfNumber || '').toLowerCase().includes(search) ||
      (rrf.positionTitle || '').toLowerCase().includes(search) ||
      (rrf.department || '').toLowerCase().includes(search) ||
      (rrf.projectName || '').toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading open positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchOpenPositions}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Open Positions</h1>
        <p className="text-gray-600 mt-1">Approved RRFs ready for action</p>
      </div>

      {/* Stats Card */}
      <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Total Open Positions</p>
            <p className="text-4xl font-bold mt-1">{rrfs.length}</p>
          </div>
          <RocketOutlined className="text-6xl opacity-20" />
        </div>
      </div>

      {/* Search Bar */}
      {rrfs.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by RRF#, Role, Department, or Project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {/* Empty State */}
      {rrfs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Open Positions</h3>
          <p className="text-gray-600">No approved RRFs available for action</p>
        </div>
      ) : (
        /* RRF Cards - Desktop */
        <>
          <div className="hidden md:block space-y-4">
            {filteredRrfs.map((rrf) => (
              <div key={rrf.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {rrf.rrfNumber} - {rrf.positionTitle}
                        </h3>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {rrf.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>Department: <span className="font-medium">{rrf.department}</span></span>
                        <span>Positions: <span className="font-medium">{rrf.numberOfPositions}</span></span>
                        <span>Priority: 
                          <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${getPriorityBadge(rrf.priority)}`}>
                            {rrf.priority}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {rrf.projectName && (
                    <div className="mb-4 text-sm text-gray-600">
                      <span className="font-medium">Project:</span> {rrf.projectName}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/pmo/view-rrf/${rrf.id}`)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <EyeOutlined /> View Details
                    </button>
                    <button
                      onClick={() => handleOpenForHiring(rrf.id)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <RocketOutlined /> Open for Recruitment
                    </button>
                    <button
                      onClick={() => handleFillByBench(rrf.id)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <TeamOutlined /> Fill from Bench
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* RRF Cards - Mobile */}
          <div className="md:hidden space-y-4">
            {filteredRrfs.map((rrf) => (
              <div key={rrf.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-indigo-600">{rrf.rrfNumber}</div>
                    <div className="text-sm font-medium text-gray-900 mt-1">{rrf.positionTitle}</div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    {rrf.numberOfPositions}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  <div>{rrf.department}</div>
                  {rrf.projectName && <div>Project: {rrf.projectName}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/pmo/view-rrf/${rrf.id}`)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-xs font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleOpenForHiring(rrf.id)}
                    className="flex-1 px-3 py-2 bg-indigo-500 text-white rounded text-xs font-medium"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleFillByBench(rrf.id)}
                    className="flex-1 px-3 py-2 bg-purple-500 text-white rounded text-xs font-medium"
                  >
                    Bench
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Results Count */}
      {filteredRrfs.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Showing {filteredRrfs.length} of {rrfs.length} position{rrfs.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

export default function ProtectedOpenPositionsPage() {
  return (
    <ProtectedRoute>
      <ClientLayout>
        <OpenPositionsPage />
      </ClientLayout>
    </ProtectedRoute>
  );
}
