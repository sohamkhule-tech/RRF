/**
 * RRF API Service
 * All RRF-related API calls
 */

import { api } from './apiConfig';

/**
 * Sanitize RRF payload to ensure DTO compatibility
 * Converts arrays to comma-separated strings and removes invalid values
 */
const sanitizeRrfPayload = (payload) => {
  const sanitized = { ...payload };
  
  // Convert array fields to comma-separated strings
  const arrayToStringFields = ['technologies', 'requiredSkills', 'preferredSkills', 'location'];
  
  arrayToStringFields.forEach(field => {
    if (sanitized[field] !== undefined && sanitized[field] !== null) {
      if (Array.isArray(sanitized[field])) {
        // ✅ FIX: Safe length check - convert non-empty arrays to comma-separated strings
        if (sanitized[field].length > 0) {
          sanitized[field] = sanitized[field].join(', ');
        } else {
          // Empty arrays become undefined (omitted from payload)
          delete sanitized[field];
        }
      } else if (typeof sanitized[field] === 'string') {
        // ✅ FIX: Safe trim check - empty strings or strings with only whitespace
        if (sanitized[field].trim() === '') {
          delete sanitized[field];
        }
      } else {
        // Any other type (object, number, etc.) for these fields should be removed
        console.warn(`[Sanitize] Unexpected type for ${field}:`, typeof sanitized[field], sanitized[field]);
        delete sanitized[field];
      }
    }
  });
  
  // Remove undefined and null values (don't send them to backend)
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined || sanitized[key] === null) {
      delete sanitized[key];
    }
  });

  // Remove raw frontend skill field names that backend DTO rejects.
  // UI state uses mustHaveSkills/niceToHaveSkills; the API only accepts
  // requiredSkills and preferredSkills (already mapped by the form before this point).
  delete sanitized.mustHaveSkills;
  delete sanitized.niceToHaveSkills;
  
  // Log what we're about to send
  console.log('[Sanitize] Final payload types:', {
    technologies: sanitized.technologies ? typeof sanitized.technologies : 'undefined',
    requiredSkills: sanitized.requiredSkills ? typeof sanitized.requiredSkills : 'undefined',
    preferredSkills: sanitized.preferredSkills ? typeof sanitized.preferredSkills : 'undefined',
  });
  console.log('FINAL RRF PAYLOAD', sanitized);
  
  return sanitized;
};

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
    const sanitized = sanitizeRrfPayload(rrfData);
    
    // Ensure interviewPanel contains strictly numbers for backend validation
    if (Array.isArray(sanitized.interviewPanel)) {
      sanitized.interviewPanel = sanitized.interviewPanel.map(id => Number(id)).filter(id => !isNaN(id));
    }

    // Final safety check - ensure no arrays slipped through (except those intended to be arrays like interviewPanel)
    Object.keys(sanitized).forEach(key => {
      if (Array.isArray(sanitized[key]) && key !== 'interviewPanel') {
        console.error(`[RRF API] ERROR: ${key} is still an array!`, sanitized[key]);
        sanitized[key] = sanitized[key].join(', ');
      }
    });
    
    console.log('[RRF API] Sanitized payload:', JSON.stringify(sanitized, null, 2));
    return api.post('/rrf', sanitized);
  },

  /**
   * Update RRF
   */
  update: async (id, rrfData) => {
    const sanitized = sanitizeRrfPayload(rrfData);
    console.log('[RRF API] Sanitized update payload:', sanitized);
    return api.patch(`/rrf/${id}`, sanitized);
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
   * Close RRF (HR action)
   */
  close: async (id, payload) => {
    return api.post(`/rrf/${id}/close`, typeof payload === 'string' ? { notes: payload } : payload);
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
      // TODO 5: Expose reqId (the REQ-xxx stored in sub_id) alongside rrfNumber.
      // displayId logic: show rrfNumber (RRF-xxx) once PMO acts, else show reqId (REQ-xxx).
      displayId: rrf.rrfNumber || rrf.subId,
    }));
  },

  /**
   * Get open positions (PMO dashboard)
   */
  getOpenPositions: async () => {
    const response = await api.get('/rrf/pmo/open-positions');
    return response?.data || [];
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
    const response = await api.get('/rrf/hr/open-for-hiring');
    return response?.data || [];
  },

  /**
   * Delete RRF (PMO only)
   */
  delete: async (id) => {
    return api.delete(`/rrf/${id}`);
  },

  /**
   * Get suggested interviewers based on technologies
   */
  getSuggestedInterviewers: async (technologies = []) => {
    const techQuery = Array.isArray(technologies) ? technologies.join(',') : technologies;
    const response = await api.get(`/rrf/suggested-interviewers?technologies=${encodeURIComponent(techQuery)}`);
    return response?.data || [];
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
    reqId: rrf.subId,          // TODO 5: reqId is the REQ-xxx value stored in sub_id
    rrfNumber: rrf.rrfNumber,
    // displayId: show final RRF-xxx once assigned by PMO, else the REQ-xxx request ID
    displayId: rrf.rrfNumber || rrf.subId,
    role: rrf.positionTitle,
    positionTitle: rrf.positionTitle,
    department: rrf.department,
    project: rrf.projectName || 'N/A',
    projectName: rrf.projectName,
    positions: rrf.headcount,
    headcount: rrf.headcount,
    priority: rrf.priority,
    status: rrf.status === 'rejected' ? 'declined' : rrf.status,
    date: rrf.createdAt ? new Date(rrf.createdAt).toLocaleDateString('en-GB') : 'N/A',
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
    technologies: rrf.technologies,
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
    billingRate: rrf.billingRate,
    billingCurrency: rrf.billingCurrency,
    billingStartDate: rrf.billingStartDate,
    expectedOnboardingDate: rrf.expectedOnboardingDate,
    approvers: rrf.approvers || [],
    // ── Decision / workflow fields ─────────────────────────────────
    declineReason: rrf.declineReason || null,
    notes: rrf.notes || null,
    declinedBy: rrf.declinedBy || null,
    declinedById: rrf.declinedById || null,
    statusHistory: rrf.statusHistory || [],
    candidateName: rrf.candidateName || null,
    joiningDate: rrf.joiningDate || null,
    closureStatus: rrf.closureStatus || null,
    closeReason: rrf.closeReason || null,
    internalRrfNo: rrf.internalRrfNo || null,  // Auto-generated for bench-filled positions
    interviewPanel: rrf.interviewPanel || [],
    interviewers: rrf.interviewers || [],
    // ── Audit / actor names ───────────────────────────────────────
    createdByName: rrf.createdBy?.fullName || null,
    approvedByName: rrf.approvedByName || null,
    declinedByName: rrf.declinedByName || null,
    onHoldByName: rrf.onHoldByName || null,
  };
};

/**
 * Helper function to format RRF list for table display
 */
export const formatRrfListForDisplay = (rrfs) => {
  if (!Array.isArray(rrfs)) return [];
  return rrfs.map(formatRrfForDisplay);
};
