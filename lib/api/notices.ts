import { apiClient } from './client'
import { ENDPOINTS } from './config'
import { buildQuery } from '@/lib/api/fetchHelper'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoticeAudience {
  type: 'all' | 'teachers' | 'students' | 'specific-classes' | 'specific-users'
  classIds?: string[] | null
  sectionIds?: string[] | null
  batchIds?: string[] | null
  studentIds?: string[] | null
  teacherIds?: string[] | null
}

export interface NoticeInstituteRef {
  _id: string
  institute_code: string
  institute_name: string
}

export interface Notice {
  _id: string
  title: string
  content: string
  fullDescription?: string | null
  docUrl?: string | null
  instituteId: NoticeInstituteRef | string
  createdBy: Record<string, unknown> | string
  createdByModel: 'institute_admins' | 'TeachersMaster'
  createdByRole: 'institute_admin' | 'teacher'
  audience: NoticeAudience
  category: 'urgent' | 'academic' | 'events' | 'news'
  isPinned?: boolean
  publishDate?: string | null
  expiryDate?: string | null
  status: 'draft' | 'published' | 'archived' | 'expired'
  createdAt?: string
  updatedAt?: string
}

export interface CreateNoticeRequest {
  title: string
  content: string
  fullDescription?: string
  instituteId: string
  createdBy: string
  createdByRole: 'institute_admin' | 'teacher'
  audience: NoticeAudience
  category: 'urgent' | 'academic' | 'events' | 'news'
  isPinned?: boolean
  publishDate?: string | null
  expiryDate?: string | null
  file?: File | null
}

export interface GetAllNoticesQuery extends Record<string, string | number | boolean | null | undefined> {
  instituteId?: string
  status?: 'draft' | 'published' | 'archived' | 'expired'
  category?: string
  createdByRole?: string
  createdBy?: string
  isPinned?: boolean
  audience_type?: string
}

// ─── FormData Builder ─────────────────────────────────────────────────────────

const buildNoticeFormData = (data: CreateNoticeRequest): FormData => {
  const formData = new FormData()

  formData.append('title', data.title)
  formData.append('content', data.content)
  if (data.fullDescription) formData.append('fullDescription', data.fullDescription)
  formData.append('instituteId', data.instituteId)
  formData.append('createdBy', data.createdBy)
  formData.append('createdByRole', data.createdByRole)

  // Audience
  formData.append('audience[type]', data.audience.type)
  data.audience.classIds?.forEach((id, i) =>
    formData.append(`audience[classIds][${i}]`, id)
  )
  data.audience.batchIds?.forEach((id, i) =>
    formData.append(`audience[batchIds][${i}]`, id)
  )
  data.audience.studentIds?.forEach((id, i) =>
    formData.append(`audience[studentIds][${i}]`, id)
  )
  data.audience.teacherIds?.forEach((id, i) =>
    formData.append(`audience[teacherIds][${i}]`, id)
  )

  formData.append('category', data.category)
  if (data.isPinned !== undefined) formData.append('isPinned', String(data.isPinned))
  if (data.publishDate) formData.append('publishDate', data.publishDate)
  if (data.expiryDate) formData.append('expiryDate', data.expiryDate)
  if (data.file) formData.append('file', data.file)

  return formData
}

const buildUpdateFormData = (
  data: Partial<Omit<CreateNoticeRequest, 'instituteId' | 'createdBy' | 'createdByRole'>>
): FormData => {
  const formData = new FormData()
  if (data.title) formData.append('title', data.title)
  if (data.content) formData.append('content', data.content)
  if (data.fullDescription) formData.append('fullDescription', data.fullDescription)
  if (data.category) formData.append('category', data.category)
  if (data.isPinned !== undefined) formData.append('isPinned', String(data.isPinned))
  if (data.publishDate) formData.append('publishDate', data.publishDate)
  if (data.expiryDate) formData.append('expiryDate', data.expiryDate)
  if (data.file) formData.append('file', data.file)

  if (data.audience) {
    formData.append('audience[type]', data.audience.type)
  data.audience.classIds?.forEach((id, i) =>
      formData.append(`audience[classIds][${i}]`, id)
    )
    data.audience.batchIds?.forEach((id, i) =>
      formData.append(`audience[batchIds][${i}]`, id)
    )
    data.audience.studentIds?.forEach((id, i) =>
      formData.append(`audience[studentIds][${i}]`, id)
    )
    data.audience.teacherIds?.forEach((id, i) =>
      formData.append(`audience[teacherIds][${i}]`, id)
    )
  }

  return formData
}

// ─── Notices API ──────────────────────────────────────────────────────────────

export const noticesApi = {
  /** Create a new notice (always saved as draft first, then publish separately) */
  create: (data: CreateNoticeRequest) =>
    apiClient.post<Notice>(ENDPOINTS.NOTICES.BASE, buildNoticeFormData(data)),

  /** Get all notices (excludes expired unless status=expired passed) */
  getAll: (query?: GetAllNoticesQuery) =>
    apiClient.get<Notice[]>(buildQuery(ENDPOINTS.NOTICES.BASE, query)),

  /** Get expired notices only */
  getExpired: (query?: { instituteId?: string; category?: string; createdByRole?: string }) =>
    apiClient.get<Notice[]>(buildQuery(ENDPOINTS.NOTICES.EXPIRED, query)),

  /** Get single notice by ID */
  getById: (id: string) =>
    apiClient.get<Notice>(ENDPOINTS.NOTICES.GET_BY_ID(id)),

  /** Get notices visible to a specific student */
  getForStudent: (studentId: string, instituteId: string) =>
    apiClient.get<Notice[]>(ENDPOINTS.NOTICES.GET_FOR_STUDENT(studentId, instituteId)),

  /** Get notices visible to a specific teacher */
  getForTeacher: (teacherId: string, instituteId: string) =>
    apiClient.get<Notice[]>(ENDPOINTS.NOTICES.GET_FOR_TEACHER(teacherId, instituteId)),

 /** Get notices for a specific class/batch (coaching portal) */
  getForClass: (classId: string, instituteId: string, batchId?: string) =>
    apiClient.get<Notice[]>(
      buildQuery(ENDPOINTS.NOTICES.GET_FOR_CLASS(classId, instituteId), {
        batch_id: batchId,
      })
    ),

  /** Update a notice */
  update: (
    id: string,
    data: Partial<Omit<CreateNoticeRequest, 'instituteId' | 'createdBy' | 'createdByRole'>>
  ) => apiClient.put<Notice>(ENDPOINTS.NOTICES.UPDATE(id), buildUpdateFormData(data)),

  /** Publish a draft notice */
  publish: (id: string) =>
    apiClient.patch<Notice>(ENDPOINTS.NOTICES.PUBLISH(id)),

  /** Archive a notice */
  archive: (id: string) =>
    apiClient.patch<Notice>(ENDPOINTS.NOTICES.ARCHIVE(id)),

  /** Delete a notice */
  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.NOTICES.DELETE(id)),
}