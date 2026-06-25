let _getToken: (() => Promise<string | null>) | null = null

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = _getToken ? await _getToken() : null
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}
