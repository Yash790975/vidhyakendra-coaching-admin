import { apiClient } from './client'
import { ENDPOINTS } from './config'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface InstituteRef {
  _id: string
  institute_code: string
  institute_name: string
  institute_type: 'school' | 'coaching' | 'both'
  status: string
}

export interface Admin {
  _id: string
  institute_id: InstituteRef | string
  name: string
  email: string
  mobile: string
  admin_type: 'school' | 'coaching' | null
  is_first_login: boolean
  last_login_at: string | null
  status: 'active' | 'blocked' | 'disabled'
  created_at?: string
  updated_at?: string
}

export interface LoginResponse {
  admin: Admin
  token: string
  is_first_login: boolean
  institute_type: 'school' | 'coaching' | 'both'
}



// ─── localStorage Keys (single source of truth) ───────────────────────────────
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  ADMIN_ID: 'adminId',
  ADMIN_NAME: 'adminName',
  ADMIN_EMAIL: 'adminEmail',
  ADMIN_TYPE: 'adminType',
  INSTITUTE_ID: 'instituteId',
  INSTITUTE_NAME: 'instituteName',
  INSTITUTE_CODE: 'instituteCode',
  INSTITUTE_TYPE: 'instituteType',
  INSTITUTE_LOGO: 'instituteLogo',
  ROLE: 'role',
} as const

// ─── API Functions ────────────────────────────────────────────────────────────

export const adminApi = {
  // ── CRUD ──────────────────────────────────────────────────────────────────
  create: (data: {
    institute_id: string
    name: string
    email: string
    mobile: string
    admin_type?: 'school' | 'coaching' | null
    status?: 'active' | 'blocked' | 'disabled'
  }) => apiClient.post<Admin>(ENDPOINTS.INSTITUTE_ADMIN.CREATE, data),

  getAll: () =>
    apiClient.get<Admin[]>(ENDPOINTS.INSTITUTE_ADMIN.GET_ALL),

  getById: (id: string) =>
    apiClient.get<Admin>(ENDPOINTS.INSTITUTE_ADMIN.GET_BY_ID(id)),

  getByInstitute: (instituteId: string) =>
    apiClient.get<Admin>(ENDPOINTS.INSTITUTE_ADMIN.GET_BY_INSTITUTE(instituteId)),

  update: (id: string, data: {
    name?: string
    email?: string
    mobile?: string
    status?: string
    admin_type?: 'school' | 'coaching' | null
  }) => apiClient.put<Admin>(ENDPOINTS.INSTITUTE_ADMIN.UPDATE(id), data),

  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.INSTITUTE_ADMIN.DELETE(id)),

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (data: { email: string; password: string }) =>
    apiClient.post<LoginResponse>(ENDPOINTS.INSTITUTE_ADMIN.VERIFY_LOGIN, data),

  requestOtp: (data: { email: string }) =>
    apiClient.post<{ message: string }>(ENDPOINTS.INSTITUTE_ADMIN.REQUEST_OTP, data),

  verifyOtp: (data: { email: string; otp: string }) =>
    apiClient.post<{ message: string; verified: boolean }>(ENDPOINTS.INSTITUTE_ADMIN.VERIFY_OTP, data),

  changePassword: (data: { email: string; old_password: string; new_password: string }) =>
    apiClient.post<{ message: string }>(ENDPOINTS.INSTITUTE_ADMIN.CHANGE_PASSWORD, data),

  resetPassword: (data: { email: string; otp: string; new_password: string }) =>
    apiClient.post<{ message: string }>(ENDPOINTS.INSTITUTE_ADMIN.RESET_PASSWORD, data),

  // ── localStorage helpers ───────────────────────────────────────────────────
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token)
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
    }
    return null
  },

  // Returns stored institute_type from localStorage (set at login time)
  getStoredInstituteType: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.INSTITUTE_TYPE)
    }
    return null
  },

  // Returns stored admin_type from localStorage (set at login time)
  getStoredAdminType: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_TYPE)
    }
    return null
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key)
      })
    }
  },

  isLoggedIn: () => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
    }
    return false
  },
}