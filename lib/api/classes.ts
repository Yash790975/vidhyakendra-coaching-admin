import { apiClient } from './client'
import { ENDPOINTS } from './config'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface InstitutePopulated {
  _id: string
  institute_code: string
  institute_name: string
  institute_type: 'school' | 'coaching' | 'both'
}

export interface TeacherPopulated {
  _id: string
  teacher_code: string
  full_name: string
}

export interface BatchPopulated {
  _id: string
  batch_name: string
  start_time: string
  end_time: string
}

export interface SubjectPopulated {
  _id: string
  subject_name: string
  subject_code: string | null
  subject_type: string
}

export interface ClassMaster {
  _id: string
  institute_id: string | InstitutePopulated
  class_name: string
  class_type: 'coaching'
  class_teacher_id?: TeacherPopulated | string | null
  class_capacity?: number | null
  class_level?: string | null
  academic_year: string
  status?: 'active' | 'inactive' | 'archived'
  archived_at?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CoachingBatch {
  _id?: string
  class_id: string | { _id: string; class_name: string; class_type: string; academic_year: string }
  batch_name: string
  start_time: string
  end_time: string
  capacity?: number | null
  status?: 'active' | 'inactive' | 'archived'
  archived_at?: string | null
  createdAt?: string
  updatedAt?: string
}

// class_subjects — no section_id, no batch_id per backend model
export interface ClassSubject {
  _id?: string
  class_id: string | { _id: string; class_name: string; class_type: string; academic_year: string }
  subject_id: string | SubjectPopulated
  is_compulsory?: boolean
  createdAt?: string
  updatedAt?: string
}

// Schedule — coaching uses batch_id (required by backend), section_id omitted
export interface ClassSubjectSchedule {
  _id?: string
  class_id: string | { _id: string; class_name: string; class_type: string; academic_year: string; class_teacher_id?: string }
  section_id?: null
   batch_id: string | (BatchPopulated & { _id: string }) | null
  subject_id: string | SubjectPopulated
  teacher_id: string | TeacherPopulated
  academic_year: string
  day_of_week: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
  start_time: string
  end_time: string
  room_number?: string | null
  status?: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

// Teacher Assignments — coaching roles: class_teacher, batch_incharge, faculty, subject_teacher
export interface ClassTeacherAssignment {
  _id?: string
  teacher_id: string | TeacherPopulated
  class_id: string | { _id: string; class_name: string; class_type: string; academic_year: string }
  section_id?: null
  subject_id?: string | SubjectPopulated | null
  batch_id?: string | BatchPopulated | null
  role: 'class_teacher' | 'subject_teacher' | 'batch_incharge' | 'faculty'
  academic_year: string
  assigned_from?: string
  assigned_to?: string | null
  status?: 'active' | 'inactive' | 'archived'
  archived_at?: string | null
  createdAt?: string
  updatedAt?: string
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateClassPayload {
  institute_id: string
  class_name: string
  class_type: 'coaching'
  class_teacher_id?: string | null
  class_capacity?: number | null
  class_level?: string | null
  academic_year: string
}

export interface CreateBatchPayload {
  class_id: string
  batch_name: string
  start_time: string
  end_time: string
  capacity?: number | null
}

export interface CreateClassSubjectPayload {
  class_id: string
  subject_id: string
  is_compulsory?: boolean
}

// Coaching schedule — batch_id required, section_id must NOT be sent
export interface CreateSchedulePayload {
  class_id: string
  batch_id: string
  subject_id: string
  teacher_id: string
  academic_year: string
  day_of_week: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
  start_time: string
  end_time: string
  room_number?: string | null
}

// Batch Incharge: batch_id required, subject_id must NOT be sent
export interface CreateBatchInchargePayload {
  teacher_id: string
  class_id: string
  batch_id: string
  role: 'batch_incharge'
  academic_year: string
  assigned_from?: string
}

// Faculty: batch_id + subject_id both required
export interface CreateFacultyPayload {
  teacher_id: string
  class_id: string
  batch_id: string
  subject_id: string
  role: 'faculty'
  academic_year: string
  assigned_from?: string
}

// Class Teacher: no batch_id, no subject_id
export interface CreateClassTeacherPayload {
  teacher_id: string
  class_id: string
  role: 'class_teacher'
  academic_year: string
  assigned_from?: string
}

// Subject Teacher (without batch): subject_id required, batch_id null
export interface CreateSubjectTeacherPayload {
  teacher_id: string
  class_id: string
  subject_id: string
  role: 'subject_teacher'
  academic_year: string
  assigned_from?: string
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const classesApi = {
  // ─── Classes Master ──────────────────────────────────────────────────────────

  create: (data: CreateClassPayload) =>
    apiClient.post<ClassMaster>(ENDPOINTS.CLASSES.BASE, data),

  /**
   * Fetch classes — class_type=coaching is always passed internally.
   * This is a coaching portal; the filter is never exposed in the UI.
   */
  getAll: (query?: {
    instituteId?: string
    status?: string
    academic_year?: string
    class_level?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.instituteId) params.append('institute_id', query.instituteId)
    // Coaching portal — always filter by coaching class type
    params.append('class_type', 'coaching')
    if (query?.status) params.append('status', query.status)
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    if (query?.class_level) params.append('class_level', query.class_level)
    const qs = params.toString()
    return apiClient.get<ClassMaster[]>(`${ENDPOINTS.CLASSES.BASE}${qs ? `?${qs}` : ''}`)
  },

  getById: (id: string) =>
    apiClient.get<ClassMaster>(ENDPOINTS.CLASSES.GET_BY_ID(id)),

  getByTeacher: (teacherId: string) =>
    apiClient.get<ClassMaster[]>(ENDPOINTS.CLASSES.GET_BY_TEACHER(teacherId)),

  getByInstituteAndYear: (instituteId: string, year: string) =>
    apiClient.get<ClassMaster[]>(ENDPOINTS.CLASSES.GET_BY_INSTITUTE_AND_YEAR(instituteId, year)),

  update: (id: string, data: Partial<Omit<CreateClassPayload, 'institute_id' | 'class_type'>> & { status?: 'active' | 'inactive' | 'archived' }) =>
    apiClient.put<ClassMaster>(ENDPOINTS.CLASSES.UPDATE(id), data),

  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.CLASSES.DELETE(id)),

  // ─── Coaching Batches ─────────────────────────────────────────────────────────

  createBatch: (data: CreateBatchPayload) =>
    apiClient.post<CoachingBatch>(ENDPOINTS.COACHING_BATCHES.BASE, data),

  getAllBatches: (query?: { class_id?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (query?.class_id) params.append('class_id', query.class_id)
    if (query?.status) params.append('status', query.status)
    const qs = params.toString()
    return apiClient.get<CoachingBatch[]>(`${ENDPOINTS.COACHING_BATCHES.BASE}${qs ? `?${qs}` : ''}`)
  },

  getBatchById: (id: string) =>
    apiClient.get<CoachingBatch>(ENDPOINTS.COACHING_BATCHES.GET_BY_ID(id)),

  getBatchesByClass: (classId: string) =>
    apiClient.get<CoachingBatch[]>(ENDPOINTS.COACHING_BATCHES.GET_BY_CLASS(classId)),

  updateBatch: (id: string, data: Partial<CreateBatchPayload>) =>
    apiClient.put<CoachingBatch>(ENDPOINTS.COACHING_BATCHES.UPDATE(id), data),

  deleteBatch: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.COACHING_BATCHES.DELETE(id)),

  // ─── Class Subjects ───────────────────────────────────────────────────────────

  createClassSubject: (data: CreateClassSubjectPayload) =>
    apiClient.post<ClassSubject>(ENDPOINTS.CLASS_SUBJECTS.BASE, data),

  getAllClassSubjects: (query?: { class_id?: string; subject_id?: string; is_compulsory?: boolean }) => {
    const params = new URLSearchParams()
    if (query?.class_id) params.append('class_id', query.class_id)
    if (query?.subject_id) params.append('subject_id', query.subject_id)
    if (query?.is_compulsory !== undefined) params.append('is_compulsory', String(query.is_compulsory))
    const qs = params.toString()
    return apiClient.get<ClassSubject[]>(`${ENDPOINTS.CLASS_SUBJECTS.BASE}${qs ? `?${qs}` : ''}`)
  },

  getClassSubjectById: (id: string) =>
    apiClient.get<ClassSubject>(ENDPOINTS.CLASS_SUBJECTS.GET_BY_ID(id)),

  getClassSubjectsByClass: (classId: string) =>
    apiClient.get<ClassSubject[]>(ENDPOINTS.CLASS_SUBJECTS.GET_BY_CLASS(classId)),

  updateClassSubject: (id: string, data: Partial<CreateClassSubjectPayload>) =>
    apiClient.put<ClassSubject>(ENDPOINTS.CLASS_SUBJECTS.UPDATE(id), data),

  deleteClassSubject: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.CLASS_SUBJECTS.DELETE(id)),

  // ─── Class Subject Schedule (batch_id required for coaching) ─────────────────

  createSchedule: (data: CreateSchedulePayload) =>
    apiClient.post<ClassSubjectSchedule>(ENDPOINTS.CLASS_SUBJECT_SCHEDULE.BASE, data),

  getAllSchedules: (query?: {
    class_id?: string
    batch_id?: string
    subject_id?: string
    teacher_id?: string
    day_of_week?: string
    status?: string
    academic_year?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.class_id) params.append('class_id', query.class_id)
    if (query?.batch_id) params.append('batch_id', query.batch_id)
    if (query?.subject_id) params.append('subject_id', query.subject_id)
    if (query?.teacher_id) params.append('teacher_id', query.teacher_id)
    if (query?.day_of_week) params.append('day_of_week', query.day_of_week)
    if (query?.status) params.append('status', query.status)
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassSubjectSchedule[]>(`${ENDPOINTS.CLASS_SUBJECT_SCHEDULE.BASE}${qs ? `?${qs}` : ''}`)
  },

  getScheduleById: (id: string) =>
    apiClient.get<ClassSubjectSchedule>(ENDPOINTS.CLASS_SUBJECT_SCHEDULE.GET_BY_ID(id)),

  // Coaching: pass batch_id as query param (not section_id)
  getScheduleByClass: (classId: string, query?: { batch_id?: string; academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.batch_id) params.append('batch_id', query.batch_id)
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassSubjectSchedule[]>(
      `${ENDPOINTS.CLASS_SUBJECT_SCHEDULE.GET_BY_CLASS(classId)}${qs ? `?${qs}` : ''}`
    )
  },

  getScheduleByTeacher: (teacherId: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassSubjectSchedule[]>(
      `${ENDPOINTS.CLASS_SUBJECT_SCHEDULE.GET_BY_TEACHER(teacherId)}${qs ? `?${qs}` : ''}`
    )
  },

  getScheduleByBatch: (batchId: string, query?: { academic_year?: string; day_of_week?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    if (query?.day_of_week) params.append('day_of_week', query.day_of_week)
    const qs = params.toString()
    return apiClient.get<ClassSubjectSchedule[]>(
      `${ENDPOINTS.CLASS_SUBJECT_SCHEDULE.GET_BY_BATCH(batchId)}${qs ? `?${qs}` : ''}`
    )
  },

  updateSchedule: (id: string, data: Partial<Omit<CreateSchedulePayload, 'class_id'>>) =>
    apiClient.put<ClassSubjectSchedule>(ENDPOINTS.CLASS_SUBJECT_SCHEDULE.UPDATE(id), data),

  deleteSchedule: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.CLASS_SUBJECT_SCHEDULE.DELETE(id)),

  // ─── Teacher Assignments (Coaching roles only) ────────────────────────────────

  /**
   * Batch Incharge: batch_id required, subject_id must NOT be sent.
   */
  createBatchIncharge: (data: CreateBatchInchargePayload) =>
    apiClient.post<ClassTeacherAssignment>(ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BASE, data),

  /**
   * Faculty (subject teacher per batch): batch_id + subject_id both required.
   */
  createFaculty: (data: CreateFacultyPayload) =>
    apiClient.post<ClassTeacherAssignment>(ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BASE, data),

  /**
   * Class Teacher: no batch_id, no subject_id.
   */
  createClassTeacher: (data: CreateClassTeacherPayload) =>
    apiClient.post<ClassTeacherAssignment>(ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BASE, data),

  /**
   * Subject Teacher (without batch): subject_id required, batch_id null.
   */
  createSubjectTeacher: (data: CreateSubjectTeacherPayload) =>
    apiClient.post<ClassTeacherAssignment>(ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BASE, data),

  getAllAssignments: (query?: {
    teacher_id?: string
    class_id?: string
    batch_id?: string
    subject_id?: string
    role?: string
    academic_year?: string
    status?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.teacher_id) params.append('teacher_id', query.teacher_id)
    if (query?.class_id) params.append('class_id', query.class_id)
    if (query?.batch_id) params.append('batch_id', query.batch_id)
    if (query?.subject_id) params.append('subject_id', query.subject_id)
    if (query?.role) params.append('role', query.role)
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    if (query?.status) params.append('status', query.status)
    const qs = params.toString()
    return apiClient.get<ClassTeacherAssignment[]>(
      `${ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.BASE}${qs ? `?${qs}` : ''}`
    )
  },

  getTeacherAssignmentById: (id: string) =>
    apiClient.get<ClassTeacherAssignment>(ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.GET_BY_ID(id)),

  getTeacherAssignmentsByTeacher: (teacherId: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassTeacherAssignment[]>(
      `${ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.GET_BY_TEACHER(teacherId)}${qs ? `?${qs}` : ''}`
    )
  },

  getTeacherAssignmentsByClass: (classId: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassTeacherAssignment[]>(
      `${ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.GET_BY_CLASS(classId)}${qs ? `?${qs}` : ''}`
    )
  },

  getBatchInchargeByBatch: (batchId: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassTeacherAssignment[]>(
      `${ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.GET_BATCH_INCHARGE(batchId)}${qs ? `?${qs}` : ''}`
    )
  },

  getTeacherAssignmentsByRole: (role: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassTeacherAssignment[]>(
      `${ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.GET_BY_ROLE(role)}${qs ? `?${qs}` : ''}`
    )
  },

  getSubjectTeachers: (subjectId: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<ClassTeacherAssignment[]>(
      `${ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.GET_BY_SUBJECT(subjectId)}${qs ? `?${qs}` : ''}`
    )
  },

  updateTeacherAssignment: (id: string, data: Partial<ClassTeacherAssignment>) =>
    apiClient.put<ClassTeacherAssignment>(ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.UPDATE(id), data),

  endTeacherAssignment: (id: string, end_date?: string) =>
    apiClient.patch<ClassTeacherAssignment>(
      ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.END(id),
      end_date ? { end_date } : {}
    ),

  deleteTeacherAssignment: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.CLASS_TEACHER_ASSIGNMENTS.DELETE(id)),
}
