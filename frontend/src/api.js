export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Returns headers with JWT for authenticated API requests.
 * @param {string|null|undefined} token - JWT from login/register
 */
export function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
