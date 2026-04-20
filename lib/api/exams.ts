import { apiClient } from './client'
import { ENDPOINTS } from './config'

// ═══════════════════════════════════════════════════════════════
// INTERFACES — Exams Master
// ═══════════════════════════════════════════════════════════════

export interface ExamMaster {
  _id: string
   institute_id: string | { _id: string; institute_name: string; institute_code: string; institute_type: string }
  exam_name: string
  exam_code?: string | null
    exam_type: 'quarterly' | 'half_yearly' | 'annual' | 'unit_test' | 'mock' | 'entrance' | 'competitive'
  academic_year: string
  term?: string | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  instructions?: string | null
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'archived'
  created_by?: string | null
  // DB stores 'institute_admins' | 'TeachersMaster' — this is what API returns
  created_by_model?: 'institute_admins' | 'TeachersMaster' | null
  createdAt?: string
  updatedAt?: string
}


export interface CreateExamPayload {
  institute_id: string
  exam_name: string
  exam_code?: string | null
  exam_type: 'quarterly' | 'half_yearly' | 'annual' | 'unit_test' | 'mock' | 'entrance' | 'competitive'
  academic_year: string
  term?: string | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  instructions?: string | null
  // status is optional — backend defaults to 'draft'
  status?: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'archived'
  created_by?: string | null
  // backend Joi expects 'created_by_role', not 'created_by_model'
  created_by_role?: 'institute_admin' | 'teacher' | null
}

export interface UpdateExamPayload {
  exam_name?: string
  exam_code?: string | null
  exam_type?: 'quarterly' | 'half_yearly' | 'annual' | 'unit_test' | 'mock' | 'entrance' | 'competitive'
  academic_year?: string
  term?: string | null
  start_date?: string | null
  end_date?: string | null
  description?: string | null
  instructions?: string | null
  status?: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'archived'
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES — Exam Schedules
// ═══════════════════════════════════════════════════════════════

export interface ExamSchedule {
  _id?: string
  exam_id: string | { _id: string; exam_name: string; exam_type: string }
  class_id: string | { _id: string; class_name: string; class_level?: string | null } | null
  section_id?: string | null
  batch_id?: string | { _id: string; batch_name: string; start_time?: string | null; end_time?: string | null } | null
  subject_id: string | { _id: string; subject_name: string; subject_code?: string | null; subject_type: string }
  exam_date: string
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
  room_number?: string | null
  total_marks: number
  pass_marks?: number | null
  theory_marks?: number | null
  practical_marks?: number | null
  invigilator_id?: string | { _id: string; full_name?: string; teacher_code?: string } | null
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  createdAt?: string
  updatedAt?: string
}


export interface CreateExamSchedulePayload
  extends Omit<ExamSchedule, '_id' | 'createdAt' | 'updatedAt'> {}

export interface StudentExamResult {
  _id?: string
  exam_schedule_id: string
  student_id: string
  theory_marks_obtained?: number | null
  practical_marks_obtained?: number | null
  total_marks_obtained?: number | null
  // total_marks = the max marks for the exam (not the obtained)
  total_marks?: number | null
  percentage?: number | null
  grade?: string | null
  rank?: number | null
  remarks?: string | null
  is_absent?: boolean | null
  is_pass?: boolean | null
  evaluated_by?: string | null
  // DB stores 'institute_admins' | 'TeachersMaster' — this is what API returns
  evaluated_by_model?: 'institute_admins' | 'TeachersMaster' | null
  // evaluated_at exists in DB model — added here so it is accessible after fetch
  evaluated_at?: string | null
  createdAt?: string
  updatedAt?: string
}

// Payload used when creating or updating a result.
// Backend Joi validation expects 'evaluated_by_role', not 'evaluated_by_model'.
export interface StudentExamResultPayload
  extends Omit<StudentExamResult, 'evaluated_by_model' | 'evaluated_at'> {
  evaluated_by_role?: 'institute_admin' | 'teacher' | null
}

// ═══════════════════════════════════════════════════════════════
// INTERFACES — Homework Assignments
// ═══════════════════════════════════════════════════════════════

export interface HomeworkAssignment {
  _id?: string
  class_id: string
  section_id?: string | null
  subject_id: string
  teacher_id: string
  title: string
  description?: string | null
  due_date: string
  file_urls?: string[]
  // file uploads — only used in create/update, not returned by API
  files?: File[]
}

export interface HomeworkSubmission {
  _id?: string
  homework_id: string
  student_id: string
  submission_date?: string | null
  remarks?: string | null
  file_urls?: string[]
  marks?: number | null
  feedback?: string | null
  status?: 'submitted' | 'evaluated' | 'late'
  // file uploads — only used in create/update
  files?: File[]
}

// ═══════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════

export const EXAM_TYPE_LABELS: Record<ExamMaster['exam_type'], string> = {
  quarterly:   'Quarterly',
  half_yearly: 'Half Yearly',
  annual:      'Annual',
  unit_test:   'Unit Test',
  mock:        'Mock',
  entrance:    'Entrance',
  competitive: 'Competitive',
}

export const EXAM_STATUS_LABELS: Record<ExamMaster['status'], string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  ongoing: 'Ongoing',
  completed: 'Completed',
  archived: 'Archived',
}

export const EXAM_TYPE_OPTIONS = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'mock', label: 'Mock' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'competitive', label: 'Competitive' },
] as const

export const EXAM_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
] as const

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const examsApi = {
  // ─── Exams Master ─────────────────────────────────────────────────────────

  create: (data: CreateExamPayload) =>
    apiClient.post<ExamMaster>(ENDPOINTS.EXAMS_MASTER.BASE, data),

  // Backend getAllExams reads: institute_id, exam_type, academic_year, status
  getAll: (query?: {
    institute_id?: string
    exam_type?: string
    academic_year?: string
    status?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.institute_id) params.append('institute_id', query.institute_id)
    if (query?.exam_type) params.append('exam_type', query.exam_type)
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    if (query?.status) params.append('status', query.status)
    const qs = params.toString()
    return apiClient.get<ExamMaster[]>(
      `${ENDPOINTS.EXAMS_MASTER.BASE}${qs ? `?${qs}` : ''}`
    )
  },

  getById: (id: string) =>
    apiClient.get<ExamMaster>(ENDPOINTS.EXAMS_MASTER.GET_BY_ID(id)),

  update: (id: string, data: UpdateExamPayload) =>
    apiClient.put<ExamMaster>(ENDPOINTS.EXAMS_MASTER.UPDATE(id), data),

  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.EXAMS_MASTER.DELETE(id)),

  // ─── Exam Schedules ───────────────────────────────────────────────────────

  createSchedule: (data: CreateExamSchedulePayload) =>
  apiClient.post<ExamSchedule>(ENDPOINTS.EXAM_SCHEDULES.BASE, data),

  // Backend getAllExamSchedules reads: exam_id, class_id, section_id, batch_id, subject_id, status
  getAllSchedules: (query?: {
    exam_id?: string
    class_id?: string
    section_id?: string
    batch_id?: string
    subject_id?: string
    status?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.exam_id) params.append('exam_id', query.exam_id)
    if (query?.class_id) params.append('class_id', query.class_id)
    if (query?.section_id) params.append('section_id', query.section_id)
    if (query?.batch_id) params.append('batch_id', query.batch_id)
    if (query?.subject_id) params.append('subject_id', query.subject_id)
    if (query?.status) params.append('status', query.status)
    const qs = params.toString()
    return apiClient.get<ExamSchedule[]>(
      `${ENDPOINTS.EXAM_SCHEDULES.BASE}${qs ? `?${qs}` : ''}`
    )
  },

  getScheduleById: (id: string) =>
    apiClient.get<ExamSchedule>(ENDPOINTS.EXAM_SCHEDULES.GET_BY_ID(id)),

  // GET /exam-schedules/exam/:exam_id
  getSchedulesByExam: (examId: string) =>
    apiClient.get<ExamSchedule[]>(ENDPOINTS.EXAM_SCHEDULES.GET_BY_EXAM(examId)),

  updateSchedule: (id: string, data: Partial<ExamSchedule>) =>
    apiClient.put<ExamSchedule>(ENDPOINTS.EXAM_SCHEDULES.UPDATE(id), data),

  deleteSchedule: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.EXAM_SCHEDULES.DELETE(id)),

  // ─── Student Exam Results ─────────────────────────────────────────────────

  // Uses StudentExamResultPayload so 'evaluated_by_role' is sent to backend (matches Joi validation)
  createResult: (data: StudentExamResultPayload) =>
    apiClient.post<StudentExamResult>(ENDPOINTS.STUDENT_EXAM_RESULTS.BASE, data),

  // Backend getAllStudentExamResults reads: exam_schedule_id, student_id, is_absent, is_pass
  getAllResults: (query?: {
    exam_schedule_id?: string
    student_id?: string
    is_absent?: boolean
    is_pass?: boolean
  }) => {
    const params = new URLSearchParams()
    if (query?.exam_schedule_id) params.append('exam_schedule_id', query.exam_schedule_id)
    if (query?.student_id) params.append('student_id', query.student_id)
    if (query?.is_absent !== undefined) params.append('is_absent', String(query.is_absent))
    if (query?.is_pass !== undefined) params.append('is_pass', String(query.is_pass))
    const qs = params.toString()
    return apiClient.get<StudentExamResult[]>(
      `${ENDPOINTS.STUDENT_EXAM_RESULTS.BASE}${qs ? `?${qs}` : ''}`
    )
  },

  getResultById: (id: string) =>
    apiClient.get<StudentExamResult>(ENDPOINTS.STUDENT_EXAM_RESULTS.GET_BY_ID(id)),

  // GET /student-exam-results/student/:student_id
  getResultsByStudent: (studentId: string) =>
    apiClient.get<StudentExamResult[]>(
      ENDPOINTS.STUDENT_EXAM_RESULTS.GET_BY_STUDENT(studentId)
    ),

  // GET /student-exam-results/exam-schedule/:exam_schedule_id
  getResultsByExamSchedule: (examScheduleId: string) =>
    apiClient.get<StudentExamResult[]>(
      ENDPOINTS.STUDENT_EXAM_RESULTS.GET_BY_EXAM_SCHEDULE(examScheduleId)
    ),

  // Uses StudentExamResultPayload so 'evaluated_by_role' is sent to backend (matches Joi validation)
  updateResult: (id: string, data: Partial<StudentExamResultPayload>) =>
    apiClient.put<StudentExamResult>(ENDPOINTS.STUDENT_EXAM_RESULTS.UPDATE(id), data),

  deleteResult: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_EXAM_RESULTS.DELETE(id)),

  // ─── Homework Assignments ─────────────────────────────────────────────────

  createHomework: (data: HomeworkAssignment) => {
    const formData = new FormData()
    formData.append('class_id', data.class_id)
    formData.append('subject_id', data.subject_id)
    formData.append('teacher_id', data.teacher_id)
    formData.append('title', data.title)
    formData.append('due_date', data.due_date)
    if (data.section_id) formData.append('section_id', data.section_id)
    if (data.description) formData.append('description', data.description)
    data.files?.forEach((file) => formData.append('files', file))
    return apiClient.post<HomeworkAssignment>(
      ENDPOINTS.HOMEWORK_ASSIGNMENTS.BASE,
      formData
    )
  },

  // Backend reads req.query — use snake_case keys
  getAllHomework: (query?: {
    class_id?: string
    section_id?: string
    teacher_id?: string
    subject_id?: string
  }) => {
    const params = new URLSearchParams()
    if (query?.class_id) params.append('class_id', query.class_id)
    if (query?.section_id) params.append('section_id', query.section_id)
    if (query?.teacher_id) params.append('teacher_id', query.teacher_id)
    if (query?.subject_id) params.append('subject_id', query.subject_id)
    const qs = params.toString()
    return apiClient.get<HomeworkAssignment[]>(
      `${ENDPOINTS.HOMEWORK_ASSIGNMENTS.BASE}${qs ? `?${qs}` : ''}`
    )
  },

  getHomeworkById: (id: string) =>
    apiClient.get<HomeworkAssignment>(ENDPOINTS.HOMEWORK_ASSIGNMENTS.GET_BY_ID(id)),

  getHomeworkByClass: (classId: string) =>
    apiClient.get<HomeworkAssignment[]>(
      ENDPOINTS.HOMEWORK_ASSIGNMENTS.GET_BY_CLASS(classId)
    ),

  updateHomework: (id: string, data: Partial<HomeworkAssignment>) => {
    const formData = new FormData()
    if (data.title) formData.append('title', data.title)
    if (data.description) formData.append('description', data.description)
    if (data.due_date) formData.append('due_date', data.due_date)
    data.files?.forEach((file) => formData.append('files', file))
    return apiClient.put<HomeworkAssignment>(
      ENDPOINTS.HOMEWORK_ASSIGNMENTS.UPDATE(id),
      formData
    )
  },

  deleteHomework: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.HOMEWORK_ASSIGNMENTS.DELETE(id)),

  deleteHomeworkAttachment: (id: string, data: { file_url: string }) =>
    apiClient.delete<void>(ENDPOINTS.HOMEWORK_ASSIGNMENTS.DELETE_ATTACHMENT(id), data),

  // ─── Homework Submissions ─────────────────────────────────────────────────

  createSubmission: (data: HomeworkSubmission) => {
    const formData = new FormData()
    formData.append('homework_id', data.homework_id)
    formData.append('student_id', data.student_id)
    if (data.remarks) formData.append('remarks', data.remarks)
    data.files?.forEach((file) => formData.append('files', file))
    return apiClient.post<HomeworkSubmission>(
      ENDPOINTS.HOMEWORK_SUBMISSIONS.BASE,
      formData
    )
  },

  // Backend reads req.query — use snake_case keys
  getAllSubmissions: (query?: {
    homework_id?: string
    student_id?: string
    status?: 'submitted' | 'evaluated' | 'late'
  }) => {
    const params = new URLSearchParams()
    if (query?.homework_id) params.append('homework_id', query.homework_id)
    if (query?.student_id) params.append('student_id', query.student_id)
    if (query?.status) params.append('status', query.status)
    const qs = params.toString()
    return apiClient.get<HomeworkSubmission[]>(
      `${ENDPOINTS.HOMEWORK_SUBMISSIONS.BASE}${qs ? `?${qs}` : ''}`
    )
  },

  getSubmissionById: (id: string) =>
    apiClient.get<HomeworkSubmission>(ENDPOINTS.HOMEWORK_SUBMISSIONS.GET_BY_ID(id)),

  updateSubmission: (id: string, data: Partial<HomeworkSubmission>) => {
    const formData = new FormData()
    if (data.remarks) formData.append('remarks', data.remarks)
    data.files?.forEach((file) => formData.append('files', file))
    return apiClient.put<HomeworkSubmission>(
      ENDPOINTS.HOMEWORK_SUBMISSIONS.UPDATE(id),
      formData
    )
  },

  evaluateSubmission: (
    id: string,
    data: { marks: number; feedback?: string }
  ) =>
    apiClient.patch<HomeworkSubmission>(
      ENDPOINTS.HOMEWORK_SUBMISSIONS.EVALUATE(id),
      data
    ),

  deleteSubmissionAttachment: (id: string, data: { file_url: string }) =>
    apiClient.delete<void>(
      ENDPOINTS.HOMEWORK_SUBMISSIONS.DELETE_ATTACHMENT(id),
      data
    ),

  deleteSubmission: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.HOMEWORK_SUBMISSIONS.DELETE(id)),
}