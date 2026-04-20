

import { BASE_URL } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchHelperResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  statusCode?: number
}

export interface FetchHelperOptions {
  /** Override default timeout (default: 30000ms) */
  timeout?: number
  /** Number of retry attempts on network failure (default: 0) */
  retries?: number
  /** Extra headers to merge */
  headers?: Record<string, string>
  /** If true, skips attaching Authorization header */
  skipAuth?: boolean
  /** Called before the request fires (e.g. show loader) */
  onStart?: () => void
  /** Called when the request finishes (success or failure) */
  onFinish?: () => void
  /** Called on success with parsed data */
  onSuccess?: <T>(data: T) => void
  /** Called on error with error message */
  onError?: (message: string) => void
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

export const tokenHelper = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('authToken')
  },

  set: (token: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem('authToken', token)
  },

  remove: (): void => {
    if (typeof window !== 'undefined') localStorage.removeItem('authToken')
  },

  isLoggedIn: (): boolean => {
    return !!tokenHelper.get()
  },
}

// ─── Core Fetch Engine ────────────────────────────────────────────────────────

async function coreFetch<T>(
  endpoint: string,
  method: string,
  body?: unknown | FormData,
  options: FetchHelperOptions = {}
): Promise<FetchHelperResponse<T>> {
  const {
    timeout = 30000,
    retries = 0,
    headers: extraHeaders = {},
    skipAuth = false,
    onStart,
    onFinish,
    onSuccess,
    onError,
  } = options

  onStart?.()

  const isFormData = body instanceof FormData
  const token = skipAuth ? null : tokenHelper.get()

  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: controller.signal,
    ...(body !== undefined
      ? { body: isFormData ? (body as FormData) : JSON.stringify(body) }
      : {}),
  }

  let attempt = 0

  while (attempt <= retries) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, fetchOptions)
      clearTimeout(timeoutId)

      let parsed: FetchHelperResponse<T>

      try {
        parsed = await response.json()
      } catch {
        parsed = {
          success: false,
          error: 'Invalid JSON response from server',
          statusCode: response.status,
        }
      }

      // Attach HTTP status if not present
      if (!parsed.statusCode) parsed.statusCode = response.status

      // Handle 401 — auto logout
      if (response.status === 401) {
        tokenHelper.remove()
        parsed.success = false
        parsed.error = parsed.error || 'Session expired. Please login again.'
      }

      if (!response.ok) {
        parsed.success = false
        const errMsg = parsed.message || parsed.error || `Request failed (${response.status})`
        onError?.(errMsg)
        onFinish?.()
        return parsed
      }

      onSuccess?.(parsed.data)
      onFinish?.()
      return parsed
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      attempt++

      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const isLastAttempt = attempt > retries

      if (isLastAttempt) {
        const errorMsg = isAbort
          ? 'Request timed out. Please check your connection.'
          : (err as Error)?.message || 'Network error. Please try again.'

        onError?.(errorMsg)
        onFinish?.()

        return {
          success: false,
          error: errorMsg,
          statusCode: isAbort ? 408 : 0,
        }
      }

      // Wait before retry (exponential backoff)
      await new Promise((res) => setTimeout(res, 500 * attempt))
    }
  }

  // Fallback (should never reach here)
  onFinish?.()
  return { success: false, error: 'Unexpected error occurred' }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const fetchHelper = {
  /** GET request */
  get: <T = unknown>(
    endpoint: string,
    options?: FetchHelperOptions
  ): Promise<FetchHelperResponse<T>> =>
    coreFetch<T>(endpoint, 'GET', undefined, options),

  /** POST request with JSON body */
  post: <T = unknown>(
    endpoint: string,
    body: unknown,
    options?: FetchHelperOptions
  ): Promise<FetchHelperResponse<T>> =>
    coreFetch<T>(endpoint, 'POST', body, options),

  /** PUT request with JSON body */
  put: <T = unknown>(
    endpoint: string,
    body: unknown,
    options?: FetchHelperOptions
  ): Promise<FetchHelperResponse<T>> =>
    coreFetch<T>(endpoint, 'PUT', body, options),

  /** PATCH request with optional JSON body */
  patch: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: FetchHelperOptions
  ): Promise<FetchHelperResponse<T>> =>
    coreFetch<T>(endpoint, 'PATCH', body, options),

  /** DELETE request with optional JSON body */
  delete: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: FetchHelperOptions
  ): Promise<FetchHelperResponse<T>> =>
    coreFetch<T>(endpoint, 'DELETE', body, options),

  /**
   * Upload files using FormData (multipart/form-data).
   * Content-Type header is NOT set manually so browser sets boundary automatically.
   */
  upload: <T = unknown>(
    endpoint: string,
    formData: FormData,
    method: 'POST' | 'PUT' = 'POST',
    options?: FetchHelperOptions
  ): Promise<FetchHelperResponse<T>> =>
    coreFetch<T>(endpoint, method, formData, options),
}

// ─── Query String Builder ─────────────────────────────────────────────────────

/**
 * Builds a URL with query parameters, ignoring undefined/null values.
 *
 * @example
 * buildQuery('/students', { status: 'active', page: 1, search: undefined })
 * // → '/students?status=active&page=1'
 */
export function buildQuery(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return endpoint
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value))
    }
  }
  const queryString = qs.toString()
  return queryString ? `${endpoint}?${queryString}` : endpoint
}

// ─── FormData Builder ─────────────────────────────────────────────────────────

/**
 * Converts a plain object into FormData.
 * Supports File, File[], string, number, boolean values.
 * Ignores undefined/null values.
 *
 * @example
 * const fd = buildFormData({ name: 'Rahul', photo: fileInput.files[0] })
 */
export function buildFormData(
  data: Record<string, string | number | boolean | File | File[] | undefined | null>
): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      value.forEach((file) => formData.append(key, file))
    } else if (value instanceof File) {
      formData.append(key, value)
    } else {
      formData.append(key, String(value))
    }
  }
  return formData
}