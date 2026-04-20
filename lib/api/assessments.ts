// assessments.ts
import { apiClient } from './client'
import { ENDPOINTS } from './config'

// ─── Interfaces ───────────────────────────────────────────────────────────────

type PopulatedObject = {
  _id?: string
  class_name?: string
  section_name?: string
  subject_name?: string
  [key: string]: unknown
}

export interface Assessment {
  _id: string
  institute_id: string
  title: string
  description: string | null
  assessment_type: 'mcq' | 'short_answer' | 'mixed'
  class_id: string | PopulatedObject
  section_id: string | PopulatedObject | null
  batch_id: string | PopulatedObject | null
  subject_id: string | PopulatedObject
  academic_year: string
  total_marks: number | null
  pass_marks: number | null
  duration_minutes: number | null
  available_from: string | null
  available_until: string | null
  max_attempts: number | null
  show_result_immediately: boolean | null
  show_answer_key: boolean | null
  status: 'draft' | 'published' | 'closed'
  created_by: string
  createdAt?: string
  updatedAt?: string
}

export interface AssessmentFilters {
  institute_id?: string
  class_id?: string
  section_id?: string
  batch_id?: string
  subject_id?: string
  created_by?: string
  status?: 'draft' | 'published' | 'closed'
  assessment_type?: 'mcq' | 'short_answer' | 'mixed'
  academic_year?: string
  available_now?: boolean
}

export interface CreateAssessmentData {
  institute_id: string
  institute_type: 'school' | 'coaching'
  title: string
  description?: string
  assessment_type: 'mcq' | 'short_answer' | 'mixed'
  class_id: string
  section_id?: null          // coaching mein hamesha null
  batch_id: string           // coaching mein required
  subject_id: string
  academic_year: string
  pass_marks?: number
  duration_minutes?: number
  available_from?: string | null
  available_until?: string | null
  max_attempts?: number
  show_result_immediately?: boolean
  show_answer_key?: boolean
  status?: 'draft' | 'published' | 'closed'
  created_by: string
}

export interface UpdateAssessmentData {
  title?: string
  description?: string
  status?: 'draft' | 'published' | 'closed'
  pass_marks?: number
  duration_minutes?: number
  available_from?: string | null
  available_until?: string | null
  max_attempts?: number
  show_result_immediately?: boolean
  show_answer_key?: boolean
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const assessmentsApi = {
  create: (data: CreateAssessmentData) =>
    apiClient.post<Assessment>(ENDPOINTS.ASSESSMENTS.BASE, data),

  getAll: (filters?: AssessmentFilters) => {
    const query = filters ? '?' + new URLSearchParams(
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString() : ''
    return apiClient.get<Assessment[]>(ENDPOINTS.ASSESSMENTS.BASE + query)
  },

  getById: (id: string) =>
    apiClient.get<Assessment>(ENDPOINTS.ASSESSMENTS.GET_BY_ID(id)),

  getAnalytics: (id: string) =>
    apiClient.get<Record<string, unknown>>(ENDPOINTS.ASSESSMENTS.ANALYTICS(id)),

  update: (id: string, data: UpdateAssessmentData) =>
    apiClient.put<Assessment>(ENDPOINTS.ASSESSMENTS.UPDATE(id), data),

  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.ASSESSMENTS.DELETE(id)),
}