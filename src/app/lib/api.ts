import {
  clearSession,
  getEmptySession,
  readSession,
  writeSession,
  type AdminSessionProfile,
  type AuthSession,
  type UserSessionProfile,
} from './session'
import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source'

interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  skipAuth?: boolean
  retryOnUnauthorized?: boolean
}

interface RefreshResponse {
  accessToken: string
  refreshToken: string
  user?: UserSessionProfile
  admin?: AdminSessionProfile
}

interface ApiStreamOptions {
  signal?: AbortSignal
  onMessage: (message: EventSourceMessage) => void
  onError?: (error: unknown) => void
  onOpen?: () => void
  onClose?: () => void
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly meta?: Record<string, unknown> | null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function buildUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function parseJsonSafe(response: Response) {
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function extractErrorMessage(errorBody: unknown, status: number) {
  if (typeof errorBody === 'string' && errorBody.trim()) {
    return errorBody
  }

  if (errorBody && typeof errorBody === 'object') {
    const typedBody = errorBody as {
      message?: string | string[]
      error?: { message?: string | string[] }
    }

    if (typeof typedBody.error?.message === 'string' && typedBody.error.message.trim()) {
      return typedBody.error.message
    }

    if (Array.isArray(typedBody.error?.message) && typedBody.error.message.length > 0) {
      return typedBody.error.message.join(', ')
    }

    if (typeof typedBody.message === 'string' && typedBody.message.trim()) {
      return typedBody.message
    }

    if (Array.isArray(typedBody.message) && typedBody.message.length > 0) {
      return typedBody.message.join(', ')
    }
  }

  return `Ошибка запроса (status ${status})`
}

function buildApiError(errorBody: unknown, status: number) {
  const message = extractErrorMessage(errorBody, status)
  const code =
    errorBody && typeof errorBody === 'object'
      ? ((errorBody as { error?: { code?: string } }).error?.code ?? undefined)
      : undefined
  const meta =
    errorBody && typeof errorBody === 'object'
      ? ((errorBody as { error?: { meta?: Record<string, unknown> | null } }).error?.meta ?? null)
      : null

  return new ApiError(message, status, code, meta)
}

async function refreshSessionOnce(currentSession: AuthSession) {
  if (!currentSession.refreshToken) {
    clearSession()
    return getEmptySession()
  }

  const response = await fetch(buildUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
  })

  if (!response.ok) {
    clearSession()
    throw new Error('Не удалось обновить сессию')
  }

  const body = (await parseJsonSafe(response)) as RefreshResponse

  const nextSession = {
    mode: body.admin ? 'admin' : body.user ? 'user' : 'guest',
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    user: body.user ?? null,
    admin: body.admin ?? null,
  } satisfies AuthSession

  writeSession(nextSession)
  return nextSession
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const session = readSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (!options.skipAuth && session.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  })

  if (response.status === 401 && !options.skipAuth && options.retryOnUnauthorized !== false) {
    const refreshedSession = await refreshSessionOnce(session)

    const retryHeaders: Record<string, string> = {
      ...headers,
      Authorization: refreshedSession.accessToken ? `Bearer ${refreshedSession.accessToken}` : '',
    }

    const retryResponse = await fetch(buildUrl(path), {
      ...options,
      headers: retryHeaders,
    })

    if (!retryResponse.ok) {
      const errorBody = await parseJsonSafe(retryResponse)
      throw buildApiError(errorBody, retryResponse.status)
    }

    return (await parseJsonSafe(retryResponse)) as T
  }

  if (!response.ok) {
    const errorBody = await parseJsonSafe(response)
    throw buildApiError(errorBody, response.status)
  }

  return (await parseJsonSafe(response)) as T
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown, options: ApiRequestOptions = {}) {
  return apiRequest<T>(path, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function apiPatch<T>(path: string, body?: unknown, options: ApiRequestOptions = {}) {
  return apiRequest<T>(path, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export function apiDelete<T>(path: string, options: ApiRequestOptions = {}) {
  return apiRequest<T>(path, {
    ...options,
    method: 'DELETE',
  })
}

export async function apiStream(path: string, options: ApiStreamOptions) {
  let currentSession = readSession()
  let hasRetried = false

  const connect = async () => {
    await fetchEventSource(buildUrl(path), {
      method: 'GET',
      signal: options.signal,
      headers: currentSession.accessToken
        ? {
            Authorization: `Bearer ${currentSession.accessToken}`,
          }
        : {},
      onopen: async (response) => {
        if (response.ok) {
          options.onOpen?.()
          return
        }

        if (response.status === 401 && !hasRetried) {
          hasRetried = true
          currentSession = await refreshSessionOnce(currentSession)
          throw new Error('__retry_stream__')
        }

        throw new Error(`Stream failed with status ${response.status}`)
      },
      onmessage: options.onMessage,
      onclose: () => {
        options.onClose?.()
      },
      onerror: (error) => {
        options.onError?.(error)
        throw error
      },
    })
  }

  try {
    await connect()
  } catch (error) {
    if (error instanceof Error && error.message === '__retry_stream__') {
      await connect()
      return
    }

    throw error
  }
}


