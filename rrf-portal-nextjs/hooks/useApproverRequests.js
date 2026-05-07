/**
 * useApproverRequests Hook
 * Fetches and manages RRF requests for approver (all pending/on-hold RRFs).
 *
 * Uses useSmartFetch for caching + deduplication.
 */

import { useState, useCallback } from 'react';
import { rrfApi } from '@/lib/api/rrfApi';
import { useSmartFetch } from '@/lib/useSmartFetch';
import { invalidateCachePattern, CACHE_TTL } from '@/lib/apiCache';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useApproverRequests = (status = null, options = {}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { limit = 10 } = options;
  const cacheKey = userId
    ? (status ? `approver-${userId}-${status}-${limit}` : `approver-${userId}-all-${limit}`)
    : null;

  const fetcher = useCallback(() => {
    const params = { limit };
    if (status) params.status = status;
    return rrfApi.getAll(params);
  }, [status, limit]);

  const transform = useCallback((response) => {
    if (response?.success) return response.data || [];
    return [];
  }, []);

  const {
    data,
    loading: smartLoading,
    error: smartError,
    refresh: smartRefresh,
  } = useSmartFetch(cacheKey, fetcher, {
    ttl: CACHE_TTL.LIST,
    transform,
  });

  // Local overrides for optimistic mutations
  const [localOverrides, setLocalOverrides] = useState(null);

  const requests = localOverrides ?? data ?? [];
  const loading = smartLoading && requests.length === 0;
  const error = smartError?.message || null;

  const refresh = useCallback(() => {
    setLocalOverrides(null);
    smartRefresh();
  }, [smartRefresh]);

  const approveRequest = useCallback(async (id, comments = '') => {
    try {
      const response = await rrfApi.approve(id, comments);

      if (response.success) {
        toast.success(response.message || 'RRF approved successfully');
        setLocalOverrides((prev) =>
          (prev ?? requests).filter(req => req.id !== id),
        );
        invalidateCachePattern(/approver|statistics|my-requests/);
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to approve RRF');
      }
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, [requests]);

  const rejectRequest = useCallback(async (id, comments) => {
    if (!comments || comments.trim() === '') {
      toast.error('Please provide a reason for declining');
      return { success: false, error: 'Comments required' };
    }

    try {
      const response = await rrfApi.decline(id, comments);

      if (response.success) {
        toast.success(response.message || 'RRF declined successfully');
        setLocalOverrides((prev) =>
          (prev ?? requests).filter(req => req.id !== id),
        );
        invalidateCachePattern(/approver|statistics|my-requests/);
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to decline RRF');
      }
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, [requests]);

  const putOnHold = useCallback(async (id, comments = '') => {
    try {
      const response = await rrfApi.putOnHold(id, comments);

      if (response.success) {
        toast.success('RRF put on hold successfully');
        setLocalOverrides((prev) =>
          (prev ?? requests).map(req =>
            req.id === id ? { ...req, status: 'on-hold' } : req,
          ),
        );
        invalidateCachePattern(/approver|statistics/);
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to put RRF on hold');
      }
    } catch (err) {
      toast.error(err.message);
      return { success: false, error: err.message };
    }
  }, [requests]);

  return {
    requests,
    loading,
    error,
    refresh,
    approveRequest,
    declineRequest,
    putOnHold,
  };
};
