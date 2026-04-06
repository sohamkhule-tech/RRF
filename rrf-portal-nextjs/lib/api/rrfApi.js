/**
 * RRF API Service
 * All RRF-related API calls
 */

import { api } from './apiConfig';

export const rrfApi = {
  /**
   * Get all RRFs with optional filters
   */
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/rrf?${queryString}` : '/rrf';
    return api.get(endpoint);
  },

  /**
   * Get current user's RRFs (My Requests)
   */
  getMyRequests: async () => {
    return api.get('/rrf/my-requests');
  },

  /**
   * Get RRF statistics
   */
  getStatistics: async (all = false) => {
    const endpoint = all ? '/rrf/statistics?all=true' : '/rrf/statistics';
    return api.get(endpoint);
  },

  /**
   * Get single RRF by ID
   */
  getById: async (id) => {
    return api.get(`/rrf/${id}`);
  },

  /**
   * Create new RRF
   */
  create: async (rrfData) => {
    return api.post('/rrf', rrfData);
  },

  /**
   * Update RRF
   */
  update: async (id, rrfData) => {
    return api.put(`/rrf/${id}`, rrfData);
  },

  /**
   * Submit RRF for approval
   */
  submit: async (id) => {
    return api.post(`/rrf/${id}/submit`, {});
  },

  /**
   * Approve RRF
   */
  approve: async (id, comments = '') => {
    return api.post(`/rrf/${id}/approve`, { comments });
  },

  /**
   * Reject RRF
   */
  reject: async (id, comments) => {
    return api.post(`/rrf/${id}/reject`, { comments });
  },

  /**
   * Decline RRF with reason (Approver workflow action)
   */
  decline: async (id, reason) => {
    return api.post(`/rrf/${id}/decline`, { reason });
  },

  /**
   * Put RRF on hold (Approver workflow action)
   */
  putOnHold: async (id, reason) => {
    return api.post(`/rrf/${id}/on-hold`, { reason });
  },

  /**
   * Open RRF for hiring (PMO action)
   */
  openForHiring: async (id) => {
    return api.post(`/rrf/${id}/open-for-hiring`, {});
  },

  /**
   * Fill position by bench resource (PMO action)
   */
  fillByBench: async (id, notes = '') => {
    return api.post(`/rrf/${id}/fill-by-bench`, { notes });
  },

  /**
   * Close RRF (HR action)
   */
  close: async (id, notes = '') => {
    return api.post(`/rrf/${id}/close`, { notes });
  },

  /**
   * Get pending approvals (Approver dashboard)
   * Returns the data array directly for consistent usage.
   */
  getPendingApprovals: async () => {
    const response = await api.get('/rrf/pending-approvals');
    // Normalise: backend returns { success, data: [...] }
    const rrfs = response?.data || [];
    if (!Array.isArray(rrfs)) return [];
    return rrfs.map((rrf) => ({
      ...rrf,
      displayId: rrf.rrfNumber || rrf.subId,
    }));
  },

  /**
   * Get open positions (PMO dashboard)
   */
  getOpenPositions: async () => {
    return api.get('/rrf/pmo/open-positions');
  },

  /**
   * Get PMO dashboard statistics
   */
  getPMODashboardStats: async () => {
    return api.get('/rrf/pmo/dashboard-stats');
  },

  /**
   * Get open for hiring (HR dashboard)
   */
  getOpenForHiring: async () => {
    return api.get('/rrf/hr/open-for-hiring');
  },

  /**
   * Delete RRF (PMO only)
   */
  delete: async (id) => {
    return api.delete(`/rrf/${id}`);
  },
};

/**
 * Helper function to format RRF data for display
 */
export const formatRrfForDisplay = (rrf) => {
  if (!rrf) return null;

  return {
    id: rrf.id,
    subId: rrf.subId,
    rrfNumber: rrf.rrfNumber,
    displayId: rrf.rrfNumber || rrf.subId,
    role: rrf.positionTitle,
    positionTitle: rrf.positionTitle,
    department: rrf.department,
    project: rrf.projectName || 'N/A',
    projectName: rrf.projectName,
    positions: rrf.headcount,
    headcount: rrf.headcount,
    priority: rrf.priority,
    status: rrf.status,
    date: new Date(rrf.createdAt).toLocaleDateString('en-GB'),
    createdAt: rrf.createdAt,
    submittedAt: rrf.submittedAt,
    approvedAt: rrf.approvedAt,
    rejectedAt: rrf.rejectedAt,
    declinedAt: rrf.declinedAt,
    closedAt: rrf.closedAt,
    manager: rrf.createdBy?.fullName || 'Unknown',
    createdBy: rrf.createdBy,
    entity: rrf.entity,
    organisation: rrf.organisation,
    requisitionType: rrf.requisitionType,
    nonBillableSubType: rrf.nonBillableSubType,
    customerName: rrf.customerName,
    function: rrf.function,
    subFunction: rrf.subFunction,
    positionType: rrf.positionType,
    employmentType: rrf.employmentType,
    workMode: rrf.workMode,
    jobDescription: rrf.jobDescription,
    requiredSkills: rrf.requiredSkills,
    preferredSkills: rrf.preferredSkills,
    mustHaveSkills: rrf.mustHaveSkills,
    niceToHaveSkills: rrf.niceToHaveSkills,
    experienceMin: rrf.experienceMin,
    experienceMax: rrf.experienceMax,
    experience:
      rrf.experienceMin && rrf.experienceMax
        ? `${rrf.experienceMin}-${rrf.experienceMax} years`
        : 'N/A',
    budgetMin: rrf.budgetMin,
    budgetMax: rrf.budgetMax,
    budget:
      rrf.budgetMin && rrf.budgetMax
        ? `₹${(rrf.budgetMin / 100000).toFixed(1)}-${(rrf.budgetMax / 100000).toFixed(1)} LPA`
        : 'N/A',
    location: rrf.location,
    urgencyReason: rrf.urgencyReason,
    additionalNotes: rrf.additionalNotes,
    approvers: rrf.approvers || [],
    // ── Decision / workflow fields ─────────────────────────────────
    declineReason: rrf.declineReason || null,
    notes: rrf.notes || null,
    declinedBy: rrf.declinedBy || null,
    declinedById: rrf.declinedById || null,
    statusHistory: rrf.statusHistory || [],
  };
};

/**
 * Helper function to format RRF list for table display
 */
export const formatRrfListForDisplay = (rrfs) => {
  if (!Array.isArray(rrfs)) return [];
  return rrfs.map(formatRrfForDisplay);
};
