import { apiClient } from './client'
import { ENDPOINTS } from './config'
import type { ApiResponse } from './client'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type NoticeStatus = 'draft' | 'published' | 'archived' | 'expired'
export type NoticePriority = 'low' | 'medium' | 'high' | 'urgent'
export type NoticeCategory = 'academic' | 'event' | 'announcement' | 'news'
export type AudienceType = 'all-institutes' | 'specific-institutes'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SuperAdmin {
  _id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NoticeAudience {
  type: AudienceType
  instituteIds: string[] | null
}

export interface SuperAdminNotice {
  _id: string
  title: string
  content: string
  fullDescription: string | null
  docUrl: string | null
  createdBy: string | SuperAdmin
  audience: NoticeAudience
  priority: NoticePriority
  category: NoticeCategory
  isPinned: boolean
  publishDate: string
  expiryDate: string | null
  status: NoticeStatus
  createdAt: string
  updatedAt: string
}

// ─── Request Payload Types ────────────────────────────────────────────────────

export interface CreateNoticePayload {
  title: string
  content: string
  fullDescription?: string | null
  createdBy: string
  audience: {
    type: AudienceType
    instituteIds?: string[] | null
  }
  priority: NoticePriority
  category: NoticeCategory
  isPinned?: boolean
  publishDate?: string | Date
  expiryDate?: string | Date | null
  /** Optional file attachment (PDF, image, etc.) */
  file?: File | null
}

export interface UpdateNoticePayload {
  title?: string
  content?: string
  fullDescription?: string | null
  audience?: {
    type?: AudienceType
    instituteIds?: string[] | null
  }
  priority?: NoticePriority
  category?: NoticeCategory
  isPinned?: boolean
  publishDate?: string | Date
  expiryDate?: string | Date | null
  status?: NoticeStatus
  /** Optional replacement file attachment */
  file?: File | null
}

export interface GetAllNoticesFilters {
  createdBy?: string
  status?: NoticeStatus
  priority?: NoticePriority
  category?: NoticeCategory
  isPinned?: boolean
  audience_type?: AudienceType
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds query string from a filters object, omitting undefined/null values.
 */
function buildQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value))
    }
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

/**
 * Converts a CreateNoticePayload or UpdateNoticePayload into FormData.
 * Nested objects (like `audience`) are JSON-stringified.
 * File is appended only if provided.
 */
function buildNoticeFormData(payload: CreateNoticePayload | UpdateNoticePayload): FormData {
  const formData = new FormData()
  const { file, ...rest } = payload as Record<string, unknown>

  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (typeof value === 'object' && !(value instanceof Date)) {
      formData.append(key, JSON.stringify(value))
    } else {
      formData.append(key, String(value))
    }
  })

  if (file instanceof File) {
    formData.append('file', file)
  }

  return formData
}

// ─── Super Admin Auth API ─────────────────────────────────────────────────────

export interface SuperAdminLoginResponse {
  admin: SuperAdmin
  token: string
}

export const superAdminAuthApi = {
  /**
   * Login with email and password.
   */
  login: (data: { email: string; password: string }): Promise<ApiResponse<SuperAdminLoginResponse>> => {
    console.log('[SuperAdminAuth] Login attempt for:', data.email)
    return apiClient.post<SuperAdminLoginResponse>(ENDPOINTS.ADMIN.LOGIN, data)
  },

  /**
   * Request OTP for password reset.
   */
  requestOtp: (data: { email: string }): Promise<ApiResponse<{ message: string }>> => {
    console.log('[SuperAdminAuth] OTP requested for:', data.email)
    return apiClient.post<{ message: string }>(ENDPOINTS.ADMIN.REQUEST_OTP, data)
  },

  /**
   * Verify OTP received on email.
   */
  verifyOtp: (data: {
    email: string
    otp: string
  }): Promise<ApiResponse<{ message: string; verified: boolean }>> => {
    console.log('[SuperAdminAuth] OTP verify attempt for:', data.email)
    return apiClient.post<{ message: string; verified: boolean }>(ENDPOINTS.ADMIN.VERIFY_OTP, data)
  },

  /**
   * Change password using old password.
   */
  changePassword: (data: {
    email: string
    old_password: string
    new_password: string
  }): Promise<ApiResponse<{ message: string }>> => {
    console.log('[SuperAdminAuth] Change password for:', data.email)
    return apiClient.post<{ message: string }>(ENDPOINTS.ADMIN.CHANGE_PASSWORD, data)
  },

  // ── localStorage helpers ────────────────────────────────────────────────────

  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('superAdminToken', token)
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('superAdminToken')
    }
    return null
  },

  setAdminData: (admin: SuperAdmin): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('superAdminId', admin._id)
      localStorage.setItem('superAdminName', admin.name)
      localStorage.setItem('superAdminEmail', admin.email)
    }
  },

  logout: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('superAdminToken')
      localStorage.removeItem('superAdminId')
      localStorage.removeItem('superAdminName')
      localStorage.removeItem('superAdminEmail')
      console.log('[SuperAdminAuth] Logged out, storage cleared')
    }
  },

  isLoggedIn: (): boolean => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('superAdminToken')
    }
    return false
  },
}

// ─── Super Admin CRUD API ─────────────────────────────────────────────────────

export const superAdminCrudApi = {
  /**
   * Add a new super admin.
   */
  add: (data: {
    name: string
    email: string
    password: string
  }): Promise<ApiResponse<SuperAdmin>> => {
    console.log('[SuperAdminCrud] Adding new admin:', data.email)
    return apiClient.post<SuperAdmin>(ENDPOINTS.ADMIN.ADD, data)
  },

  /**
   * Get all super admins.
   */
  getAll: (): Promise<ApiResponse<SuperAdmin[]>> => {
    console.log('[SuperAdminCrud] Fetching all admins')
    return apiClient.get<SuperAdmin[]>(ENDPOINTS.ADMIN.GET_ALL)
  },

  /**
   * Get super admin by ID.
   */
  getById: (id: string): Promise<ApiResponse<SuperAdmin>> => {
    console.log('[SuperAdminCrud] Fetching admin by ID:', id)
    return apiClient.get<SuperAdmin>(ENDPOINTS.ADMIN.GET_BY_ID(id))
  },

  /**
   * Update super admin details.
   */
  update: (data: {
    name?: string
    email?: string
  }): Promise<ApiResponse<SuperAdmin>> => {
    console.log('[SuperAdminCrud] Updating admin')
    return apiClient.put<SuperAdmin>(ENDPOINTS.ADMIN.UPDATE, data)
  },

  /**
   * Delete a super admin by ID.
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    console.log('[SuperAdminCrud] Deleting admin:', id)
    return apiClient.delete<void>(ENDPOINTS.ADMIN.DELETE(id))
  },
}

// ─── Super Admin Notices API ──────────────────────────────────────────────────

export const superAdminNoticesApi = {
  /**
   * Create a new notice.
   * Supports optional file attachment — sends as FormData.
   */
  create: (payload: CreateNoticePayload): Promise<ApiResponse<SuperAdminNotice>> => {
    console.log('[SuperAdminNotices] Creating notice:', payload.title)
    const formData = buildNoticeFormData(payload)
    return apiClient.post<SuperAdminNotice>(ENDPOINTS.SUPER_ADMIN_NOTICES.BASE, formData)
  },

  /**
   * Get all notices with optional filters.
   * Filters: createdBy, status, priority, category, isPinned, audience_type
   */
  getAll: (filters: GetAllNoticesFilters = {}): Promise<ApiResponse<SuperAdminNotice[]>> => {
    const query = buildQueryString(filters as Record<string, unknown>)
    console.log('[SuperAdminNotices] Fetching all notices with filters:', filters)
    return apiClient.get<SuperAdminNotice[]>(`${ENDPOINTS.SUPER_ADMIN_NOTICES.BASE}${query}`)
  },

  /**
   * Get all expired notices with optional filters.
   */
  getExpired: (
    filters: Pick<GetAllNoticesFilters, 'createdBy' | 'priority' | 'category' | 'audience_type'> = {}
  ): Promise<ApiResponse<SuperAdminNotice[]>> => {
    const query = buildQueryString(filters as Record<string, unknown>)
    console.log('[SuperAdminNotices] Fetching expired notices')
    return apiClient.get<SuperAdminNotice[]>(`${ENDPOINTS.SUPER_ADMIN_NOTICES.EXPIRED}${query}`)
  },

  /**
   * Get all published notices.
   */
  getPublished: (): Promise<ApiResponse<SuperAdminNotice[]>> => {
    console.log('[SuperAdminNotices] Fetching published notices')
    return apiClient.get<SuperAdminNotice[]>(ENDPOINTS.SUPER_ADMIN_NOTICES.PUBLISHED)
  },

  /**
   * Get a single notice by its ID.
   */
  getById: (id: string): Promise<ApiResponse<SuperAdminNotice>> => {
    console.log('[SuperAdminNotices] Fetching notice by ID:', id)
    return apiClient.get<SuperAdminNotice>(ENDPOINTS.SUPER_ADMIN_NOTICES.GET_BY_ID(id))
  },

  /**
   * Get all notices targeted to a specific institute.
   */
  getByInstitute: (instituteId: string): Promise<ApiResponse<SuperAdminNotice[]>> => {
    console.log('[SuperAdminNotices] Fetching notices for institute:', instituteId)
    return apiClient.get<SuperAdminNotice[]>(ENDPOINTS.SUPER_ADMIN_NOTICES.GET_BY_INSTITUTE(instituteId))
  },

  /**
   * Update an existing notice by ID.
   * Supports optional file replacement — sends as FormData.
   */
  update: (id: string, payload: UpdateNoticePayload): Promise<ApiResponse<SuperAdminNotice>> => {
    console.log('[SuperAdminNotices] Updating notice:', id)
    const formData = buildNoticeFormData(payload)
    return apiClient.put<SuperAdminNotice>(ENDPOINTS.SUPER_ADMIN_NOTICES.UPDATE(id), formData)
  },

  /**
   * Publish a draft notice by ID.
   */
  publish: (id: string): Promise<ApiResponse<SuperAdminNotice>> => {
    console.log('[SuperAdminNotices] Publishing notice:', id)
    return apiClient.patch<SuperAdminNotice>(ENDPOINTS.SUPER_ADMIN_NOTICES.PUBLISH(id))
  },

  /**
   * Archive a published notice by ID.
   */
  archive: (id: string): Promise<ApiResponse<SuperAdminNotice>> => {
    console.log('[SuperAdminNotices] Archiving notice:', id)
    return apiClient.patch<SuperAdminNotice>(ENDPOINTS.SUPER_ADMIN_NOTICES.ARCHIVE(id))
  },

  /**
   * Delete a notice by ID.
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    console.log('[SuperAdminNotices] Deleting notice:', id)
    return apiClient.delete<void>(ENDPOINTS.SUPER_ADMIN_NOTICES.DELETE(id))
  },
}