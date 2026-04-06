'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import * as rrfApi from '@/lib/api/rrfApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClientLayout from '@/components/ClientLayout';

// ============================================
// WORKFLOW SYSTEM - HR OPEN FOR HIRING PAGE
// Created: April 1, 2026
// Purpose: List RRFs open for hiring, close when filled
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
      setRrfs(data);
    } catch (error) {
      setError(error.message || 'Failed to load open positions');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (rrfId) => {
    const notes = window.prompt('Enter notes about closing this RRF (optional):');
    if (notes === null) return;
    try {
      await rrfApi.close(rrfId, notes || '');
      toast.success('RRF closed successfully! Position has been filled.');
      fetchOpenForHiring();
    } catch (error) {
      toast.error(error.message || 'Failed to close RRF');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
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
            onClick={fetchOpenForHiring}
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Open for Hiring</h1>
        <p className="text-gray-600 mt-1">Active recruitment positions</p>
      </div>

      {/* Stats Card */}
      <div className="mb-6 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Active Recruitments</p>
            <p className="text-4xl font-bold mt-1">{rrfs.length}</p>
          </div>
          <CheckCircleOutlined className="text-6xl opacity-20" />
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      )}

      {/* Empty State */}
      {rrfs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Recruitments</h3>
          <p className="text-gray-600">No positions currently open for hiring</p>
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
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
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
                        <span>Opened: <span className="font-medium">{formatDate(rrf.createdAt)}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    {rrf.projectName && (
                      <div>
                        <span className="text-gray-600">Project:</span>
                        <span className="ml-2 font-medium text-gray-900">{rrf.projectName}</span>
                      </div>
                    )}
                    {rrf.customerName && (
                      <div>
                        <span className="text-gray-600">Customer:</span>
                        <span className="ml-2 font-medium text-gray-900">{rrf.customerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/hr/view-rrf/${rrf.id}`)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <EyeOutlined /> View Details
                    </button>
                    <button
                      onClick={() => handleClose(rrf.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <CheckCircleOutlined /> Close RRF (Position Filled)
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
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {rrf.numberOfPositions}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  <div>{rrf.department}</div>
                  {rrf.projectName && <div>Project: {rrf.projectName}</div>}
                  <div className={`inline px-2 py-1 rounded ${getPriorityBadge(rrf.priority)}`}>
                    {rrf.priority}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/hr/view-rrf/${rrf.id}`)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-xs font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleClose(rrf.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-xs font-medium"
                  >
                    Close RRF
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

export default function ProtectedOpenForHiringPage() {
  return (
    <ProtectedRoute>
      <ClientLayout>
        <OpenForHiringPage />
      </ClientLayout>
    </ProtectedRoute>
  );
}
