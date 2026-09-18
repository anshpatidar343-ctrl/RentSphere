// Centralized API fetch helper that attaches JWT authentication headers
// and gracefully handles expired / invalid sessions

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json if body is provided
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // Clear invalid credentials and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('owner');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }

    return response;
  } catch (error) {
    console.error(`API request error on ${url}:`, error);
    throw error;
  }
}

export const api = {
  get: (url, options = {}) => apiFetch(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) =>
    apiFetch(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  put: (url, body, options = {}) =>
    apiFetch(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  delete: (url, options = {}) => apiFetch(url, { ...options, method: 'DELETE' })
};

export default api;
