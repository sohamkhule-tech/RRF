const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Fetch all form configurations
 * Public endpoint - available to all authenticated users
 */
export async function fetchFormConfig() {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_URL}/rrf/form-config`, {
      method: 'GET',
      cache: 'no-store', // Disable Next.js aggressive caching
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error fetching form config');
    return data.data;
  } catch (error) {
    console.error('Error fetching form config:', error);
    throw error;
  }
}

/**
 * Update form configuration
 * PMO-only endpoint
 */
export async function updateFormConfig(fieldName, requestData) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_URL}/rrf/form-config/${fieldName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(requestData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error updating form config');
    return data.data;
  } catch (error) {
    console.error('Error updating form config:', error);
    throw error;
  }
}
