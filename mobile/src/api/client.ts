import { API_BASE_URL } from './config';

export function getAuthHeaders(token: string | null | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const { token, ...rest } = options;
  const url = path.startsWith('http') ? path : `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(token),
    ...(rest.headers as Record<string, string>),
  };
  return fetch(url, { ...rest, headers });
}
