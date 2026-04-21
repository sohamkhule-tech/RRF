/**
 * API Configuration
 * Base configuration for all API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

/**
 * Emit a custom event so AuthContext / router can handle 401 redirects
 * without causing hard page reloads or losing Next.js router state.
 */
const handleUnauthorized = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    // Dispatch a custom event that ClientLayout (already listening to storage)
    // will pick up and redirect to /login via router.push
    window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: null }));
  }
};

/**
 * Base API request function with error handling
 * ✅ FIX ISSUE 1: Enhanced error logging and validation
 */
export const apiRequest = async (endpoint, options = {}) => {
  // Use absolute URL from environment if present, otherwise default to local
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const token = getAuthToken();

  // Temporary Debug Logs (Requirement 6)
  console.log(`[API Debug] Token: ${token ? 'FOUND' : 'MISSING'}`);
  // console.log(`[API Debug] Token Value: ${token}`); // Uncomment for extreme debugging only

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Requirement 2: Attach Token in All API Requests
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers, // Requirement 3: Verify apiRequest Uses Headers
  };
  
  console.log('[API Request]', options.method || 'GET', endpoint);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Requirement 4: Handle 401 Unauthorized gracefully
    if (response.status === 401) {
      console.warn('[API Auth] 401 Unauthorized detected. Handling...');
      handleUnauthorized();
      throw new Error('Your session has expired. Please login again.');
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;

    if (response.status === 204) {
      data = { success: true };
    } else if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // If it's an empty successful response, don't throw
      if (response.ok && (!text || text.trim() === '')) {
        data = { success: true };
      } else {
        console.error('[API Error] Non-JSON response:', text.slice(0, 200));
        throw new Error(`Server returned unexpected response. Response: ${text.slice(0, 100)}`);
      }
    }

    if (!response.ok) {
      console.error('[API Error]', {
        status: response.status,
        endpoint: endpoint,
        data: data
      });
      
      throw new Error(data.message || data.error || `API Error ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('[Network Error]', error);
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure backend is running.`);
    }
    throw error;
  }
};

/**
 * API request methods
 * ✅ FIX ISSUE 1: Added null-safety checks for request body
 */
export const api = {
  get: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, body, options = {}) => {
    // ✅ FIX ISSUE 1: Ensure body is not null/undefined before stringifying
    if (!body || typeof body !== 'object') {
      console.warn('[API POST] Invalid body provided:', body);
      throw new Error('POST request requires a valid body object');
    }
    return apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch: (endpoint, body, options = {}) => {
    // ✅ FIX ISSUE 1: Add PATCH method with null-safety
    if (!body || typeof body !== 'object') {
      console.warn('[API PATCH] Invalid body provided:', body);
      throw new Error('PATCH request requires a valid body object');
    }
    return apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  put: (endpoint, body, options = {}) => {
    // ✅ FIX ISSUE 1: Ensure body is not null/undefined before stringifying
    if (!body || typeof body !== 'object') {
      console.warn('[API PUT] Invalid body provided:', body);
      throw new Error('PUT request requires a valid body object');
    }
    return apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete: (endpoint, options = {}) =>
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};
