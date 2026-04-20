import { apiClient } from './client'
import { ENDPOINTS } from './config'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface InstituteRef {
  _id: string
  institute_code: string
  institute_name: string 
  institute_type: string  
}

export interface ClassRef { 
  _id: string 
  class_name: string
  class_level: string | null
}

export interface SectionRef {
  _id: string
  section_name: string
}

export interface SubjectRef {
  _id: string
  subject_name: string
  subject_code: string | null
  subject_type: string
}

export interface SubjectMaster {
  _id: string
  institute_id: string | InstituteRef
  subject_name: string
  subject_code: string | null
  subject_type: 'school' | 'coaching'
  class_levels: string[] | null
  description: string | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface BatchRef {
  _id: string
  batch_name: string
  start_time?: string | null
  end_time?: string | null
}

export interface SubjectByClass {
  _id: string
  institute_id: string | InstituteRef
  class_id: string | ClassRef
  section_id: string | SectionRef | null
  batch_id: string | BatchRef | null
  subject_id: string | SubjectRef
  subject_code: string | null
  subject_type: 'theory' | 'practical' | 'both'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateSubjectMasterPayload {
  institute_id: string
  subject_name: string
  subject_code?: string | null
  subject_type: 'school' | 'coaching'
  class_levels?: string[] | null
  description?: string | null
  status?: 'active' | 'inactive' | 'archived'
}

export interface UpdateSubjectMasterPayload {
  subject_name?: string
  subject_type?: 'school' | 'coaching'
  class_levels?: string[] | null
  description?: string | null
  status?: 'active' | 'inactive' | 'archived'
}

export interface CreateSubjectByClassPayload {
  institute_id: string
  class_id: string
  section_id?: string | null
  batch_id?: string | null
  subject_name: string
  subject_type: 'theory' | 'practical' | 'both'
  status?: 'active' | 'inactive'
}

export interface UpdateSubjectByClassPayload {
  subject_type?: 'theory' | 'practical' | 'both'
  status?: 'active' | 'inactive'
}

// ─── Option Labels ────────────────────────────────────────────────────────────

export const SUBJECT_TYPE_OPTIONS_MASTER = [
  { value: 'school',   label: 'School' },
  { value: 'coaching', label: 'Coaching' },
] as const

export const SUBJECT_TYPE_OPTIONS_BY_CLASS = [
  { value: 'theory',    label: 'Theory' },
  { value: 'practical', label: 'Practical' },
  { value: 'both',      label: 'Both (Theory + Practical)' },
] as const

export const SUBJECT_TYPE_LABELS_BY_CLASS: Record<SubjectByClass['subject_type'], string> = {
  theory:    'Theory',
  practical: 'Practical',
  both:      'Theory + Practical',
}

export const SUBJECT_STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

export const SUBJECT_MASTER_STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
] as const

// ─── Subjects Master API ──────────────────────────────────────────────────────

export const subjectsMasterApi = {
  /** POST /subjects-master/subject */
  create: (data: CreateSubjectMasterPayload) =>
    apiClient.post<SubjectMaster>(ENDPOINTS.SUBJECTS.BASE, data),

  /** GET /subjects-master/subject */
  getAll: () =>
    apiClient.get<SubjectMaster[]>(ENDPOINTS.SUBJECTS.BASE),

  /** GET /subjects-master/subject/:id */
  getById: (id: string) =>
    apiClient.get<SubjectMaster>(ENDPOINTS.SUBJECTS.GET_BY_ID(id)),

  /** GET /subjects-master/subject/institute/:institute_id */
  getByInstitute: (instituteId: string) =>
    apiClient.get<SubjectMaster[]>(ENDPOINTS.SUBJECTS.GET_BY_INSTITUTE(instituteId)),

  /** GET /subjects-master/subject/type/:type  — school | coaching */
  getByType: (type: 'school' | 'coaching') =>
    apiClient.get<SubjectMaster[]>(ENDPOINTS.SUBJECTS.GET_BY_TYPE(type)),

  /** GET /subjects-master/subject/status/:status  — active | inactive | archived */
  getByStatus: (status: 'active' | 'inactive' | 'archived') =>
    apiClient.get<SubjectMaster[]>(ENDPOINTS.SUBJECTS.GET_BY_STATUS(status)),

  /** GET /subjects-master/subject/class-level/:class_level */
  getByClassLevel: (level: string) =>
    apiClient.get<SubjectMaster[]>(ENDPOINTS.SUBJECTS.GET_BY_CLASS_LEVEL(level)),

  /** GET /subjects-master/subject/institute/:institute_id/type/:type */
  getByInstituteAndType: (instituteId: string, type: 'school' | 'coaching') =>
    apiClient.get<SubjectMaster[]>(ENDPOINTS.SUBJECTS.GET_BY_INSTITUTE_AND_TYPE(instituteId, type)),

  /** PUT /subjects-master/subject/:id */
  update: (id: string, data: UpdateSubjectMasterPayload) =>
    apiClient.put<SubjectMaster>(ENDPOINTS.SUBJECTS.UPDATE(id), data),

  /** DELETE /subjects-master/subject/:id */
  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.SUBJECTS.DELETE(id)),
}

// ─── Subjects By Class API ────────────────────────────────────────────────────

export const subjectsByClassApi = {
  /** POST /subjects-by-class/subject-by-class */
  create: (data: CreateSubjectByClassPayload) =>
    apiClient.post<SubjectByClass>(ENDPOINTS.SUBJECTS_BY_CLASS.BASE, data),

  /** GET /subjects-by-class/subject-by-class */
  getAll: () =>
    apiClient.get<SubjectByClass[]>(ENDPOINTS.SUBJECTS_BY_CLASS.BASE),

  /** GET /subjects-by-class/subject-by-class/:id */
  getById: (id: string) =>
    apiClient.get<SubjectByClass>(ENDPOINTS.SUBJECTS_BY_CLASS.GET_BY_ID(id)),

  /** GET /subjects-by-class/subject-by-class/institute/:institute_id */
  getByInstitute: (instituteId: string) =>
    apiClient.get<SubjectByClass[]>(ENDPOINTS.SUBJECTS_BY_CLASS.GET_BY_INSTITUTE(instituteId)),

  /** GET /subjects-by-class/subject-by-class/class/:class_id */
  getByClass: (classId: string) =>
    apiClient.get<SubjectByClass[]>(ENDPOINTS.SUBJECTS_BY_CLASS.GET_BY_CLASS(classId)),

  /** GET /subjects-by-class/subject-by-class/institute/:institute_id/class/:class_id */
  getByInstituteAndClass: (instituteId: string, classId: string) =>
    apiClient.get<SubjectByClass[]>(
      ENDPOINTS.SUBJECTS_BY_CLASS.GET_BY_INSTITUTE_AND_CLASS(instituteId, classId)
    ),

  /** GET /subjects-by-class/subject-by-class/institute/:institute_id/class/:class_id/section/:section_id */
  getByInstituteClassAndSection: (instituteId: string, classId: string, sectionId: string) =>
    apiClient.get<SubjectByClass[]>(
      ENDPOINTS.SUBJECTS_BY_CLASS.GET_BY_INSTITUTE_CLASS_AND_SECTION(instituteId, classId, sectionId)
    ),

  /** GET /subjects-by-class/subject-by-class/status/:status  — active | inactive */
  getByStatus: (status: 'active' | 'inactive') =>
    apiClient.get<SubjectByClass[]>(ENDPOINTS.SUBJECTS_BY_CLASS.GET_BY_STATUS(status)),

  /** GET /subjects-by-class/subject-by-class/type/:type  — theory | practical | both */
  getByType: (type: 'theory' | 'practical' | 'both') =>
    apiClient.get<SubjectByClass[]>(ENDPOINTS.SUBJECTS_BY_CLASS.GET_BY_TYPE(type)),

  /** PUT /subjects-by-class/subject-by-class/:id */
  update: (id: string, data: UpdateSubjectByClassPayload) =>
    apiClient.put<SubjectByClass>(ENDPOINTS.SUBJECTS_BY_CLASS.UPDATE(id), data),

  /** DELETE /subjects-by-class/subject-by-class/:id */
  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.SUBJECTS_BY_CLASS.DELETE(id)),
}