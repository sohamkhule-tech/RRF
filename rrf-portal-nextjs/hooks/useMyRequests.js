/**
 * useMyRequests Hook
 * Fetches and manages current user's RRF requests
 */

import { useState, useEffect, useCallback } from 'react';
import { rrfApi, formatRrfListForDisplay } from '@/lib/api/rrfApi';
import toast from 'react-hot-toast';

export const useMyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await rrfApi.getMyRequests();

      if (response && response.success) {
        const data = response.data || [];
        if (data.length === 0) {
          setRequests([]);
        } else {
          const formattedData = formatRrfListForDisplay(data);
          // Filter out draft RRFs — they are accessed via the dedicated Drafts page
          const nonDraftRequests = formattedData.filter(
            (req) => req.status?.toLowerCase() !== 'draft',
          );
          setRequests(nonDraftRequests);
        }
      } else {
        setRequests([]);
      }
    } catch (err) {
      // err.message is already human-readable from apiConfig (TypeError → connection error,
      // HTTP error → backend message, etc.)
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  /**
   * Filter requests by status (client-side)
   */
  const filterByStatus = useCallback(
    (status) => {
      if (!status || status === 'all') {
        return requests;
      }
      return requests.filter(
        (req) => req.status.toLowerCase() === status.toLowerCase(),
      );
    },
    [requests],
  );

  /**
   * Delete RRF
   */
  const deleteRequest = useCallback(async (id) => {
    try {
      await rrfApi.delete(id);
      toast.success('Request deleted successfully');
      setRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (err) {
      toast.error(err.message || 'Failed to delete request');
      throw err;
    }
  }, []);

  /**
   * Submit RRF for approval
   */
  const submitRequest = useCallback(async (id) => {
    try {
      await rrfApi.submit(id);
      toast.success('Request submitted for approval');
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: 'pending' } : req,
        ),
      );
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  return {
    requests,
    loading,
    error,
    refresh,
    filterByStatus,
    deleteRequest,
    submitRequest,
  };
};
