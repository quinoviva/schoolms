let _getToken: (() => Promise<string | null>) | null = null

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const REQUEST_TIMEOUT = 15000

export class ApiError extends Error {
  status: number
  url: string
  body: unknown

  constructor(message: string, status: number, url: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.url = url
    this.body = body
  }
}

async function request<T>(method: string, path: string, body?: unknown, timeout = REQUEST_TIMEOUT): Promise<T> {
  const token = _getToken ? await _getToken() : null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }))
      throw new ApiError(
        errBody.error || `HTTP ${res.status}`,
        res.status,
        `${BASE_URL}${path}`,
        errBody,
      )
    }

    return res.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, `${BASE_URL}${path}`, null)
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      `${BASE_URL}${path}`,
      null,
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}
