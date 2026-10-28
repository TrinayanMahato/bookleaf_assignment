import { API_URL } from '../config';

const TOKEN_KEY = 'bookleaf.token';

// sessionStorage is per tab, so an author and an admin can be logged in side by side
// (e.g. an evaluator testing both portals) without overwriting each other's token.
export const sessionStore = {
  get: (key) => sessionStorage.getItem(key),
  set: (key, value) => sessionStorage.setItem(key, value),
  remove: (key) => sessionStorage.removeItem(key),
};

export const tokenStore = {
  get: () => sessionStore.get(TOKEN_KEY),
  set: (token) => sessionStore.set(TOKEN_KEY, token),
  clear: () => sessionStore.remove(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details; // per-field validation messages from Zod, when present
  }
}

// AuthContext listens for this so an expired/invalid token logs the user out everywhere.
export const UNAUTHORIZED_EVENT = 'bookleaf:unauthorized';

// Single place that talks to the backend: attaches the JWT and turns error responses into ApiError.
export async function request(path, { method = 'GET', body, formData, raw = false } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.details);
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

// Builds a query string from an object, skipping empty values and joining arrays with commas.
export const toQuery = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return;
    q.set(k, Array.isArray(v) ? v.join(',') : v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};
