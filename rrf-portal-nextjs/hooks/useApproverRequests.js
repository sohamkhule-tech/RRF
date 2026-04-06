/**
 * useApproverRequests Hook
 * Fetches and manages RRF requests for approver (all pending/on-hold RRFs)
 */

import { useState, useEffect, useCallback } from 'react';
import { rrfApi } from '@/lib/api/rrfApi';
import toast from 'react-hot-toast';

export const useApproverRequests = (status = null) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (status) {
        params.status = status;
      }

      const response = await rrfApi.getAll(params);

      if (response.success) {
        setRequests(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch RRF requests');
      }
    } catch (err) {
      setError(err.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  const refresh = useCallback(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approveRequest = useCallback(async (id, comments = '') => {
    try {
      const response = await rrfApi.approve(id, comments);

      if (response.success) {
        toast.success(response.message || 'RRF approved successfully');
        setRequests(prev => prev.filter(req => req.id !== id));
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to approve RRF');
      }
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const rejectRequest = useCallback(async (id, comments) => {
    if (!comments || comments.trim() === '') {
      toast.error('Please provide a reason for declining');
      return { success: false, error: 'Comments required' };
    }

    try {
      // Use rrfApi.decline (/decline endpoint) — not rrfApi.reject (/reject endpoint).
      // /decline saves rrf.declineReason + rrf.declinedAt so the HM view can display the reason.
      const response = await rrfApi.decline(id, comments);

      if (response.success) {
        toast.success(response.message || 'RRF declined successfully');
        setRequests(prev => prev.filter(req => req.id !== id));
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to decline RRF');
      }
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const putOnHold = useCallback(async (id, comments = '') => {
    try {
      const response = await rrfApi.putOnHold(id, comments);

      if (response.success) {
        toast.success('RRF put on hold successfully');
        setRequests(prev =>
          prev.map(req => req.id === id ? { ...req, status: 'on-hold' } : req)
        );
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to put RRF on hold');
      }
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    refresh,
    approveRequest,
    rejectRequest,
    putOnHold,
  };
};
