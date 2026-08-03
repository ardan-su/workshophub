/**
 * Thin fetch wrapper shared by every page.
 * - Automatically attaches the JWT bearer token.
 * - Automatically JSON-encodes plain object bodies (FormData is passed through as-is).
 * - Redirects to /login.html on 401.
 * - Always resolves with the parsed body; throws an Error with a readable .message on failure.
 */
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('wh_token');
}

async function apiRequest(path, { method = 'GET', body, isForm = false, query } = {}) {
  let url = `${API_BASE}${path}`;
  if (query && Object.keys(query).length) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Is it running?');
  }

  let json = null;
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = null;
    }
  }

  if (response.status === 401) {
    localStorage.removeItem('wh_token');
    localStorage.removeItem('wh_user');
    if (!location.pathname.endsWith('login.html') && !location.pathname.endsWith('register.html')) {
      location.href = '/login.html';
    }
    throw new Error((json && json.message) || 'Session expired.');
  }

  if (!response.ok) {
    const err = new Error((json && json.message) || `Request failed (${response.status})`);
    err.status = response.status;
    err.errors = json && json.errors;
    throw err;
  }

  return json ? json.data : null;
}

const api = {
  get: (path, query) => apiRequest(path, { method: 'GET', query }),
  post: (path, body, opts = {}) => apiRequest(path, { method: 'POST', body, ...opts }),
  put: (path, body, opts = {}) => apiRequest(path, { method: 'PUT', body, ...opts }),
  patch: (path, body, opts = {}) => apiRequest(path, { method: 'PATCH', body, ...opts }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
  base: API_BASE,
};
