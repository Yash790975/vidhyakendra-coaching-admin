import { apiClient } from './client'
import { ENDPOINTS } from './config'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Teacher {
  _id: string
  institute_id: string
  upload_photo_url?: string | null
  teacher_type: 'school' | 'coaching'
  full_name: string
  father_name?: string | null
  mother_name?: string | null
  gender?: 'male' | 'female' | 'other'
  date_of_birth?: string
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed'
  spouse_name?: string
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'visiting'
  joining_date?: string
  blood_group?: string
status?: 'active' | 'inactive' | 'blocked' | 'archived' | 'onboarding'
  teacher_code?: string
  createdAt?: string
  updatedAt?: string
}

export interface TeacherContact {
  _id?: string
  teacher_id: string
  mobile: string
  email: string
  alternate_mobile?: string
  whatsapp_number?: string
  email_verified?: boolean
  mobile_verified?: boolean
}

export interface TeacherAddress {
  _id?: string
  teacher_id: string
  address_type: 'current' | 'permanent'
  address: string
  city?: string
  state?: string
  pincode?: string
}

export interface TeacherEmergencyContact {
  _id?: string
  teacher_id: string
  name: string
  relation: string
  mobile: string
}

export interface TeacherBankDetails {
  _id?: string
  teacher_id: string
  account_holder_name: string
  bank_name?: string
  branch_name?: string
  account_type?: 'savings' | 'current' | 'salary' | 'other'
  account_number: string
  ifsc_code: string
  upi_id?: string
  is_primary?: boolean
}

export interface TeacherIdentityDocument {
  _id?: string
  teacher_id: string
  document_type: 'pan_card' | 'address_card' | 'passport' | 'driving_license' | 'photo'
  document_number?: string
  masked_number?: string
  teacher_name?: string
  verification_status?: 'pending' | 'approved' | 'rejected'
  verified_by?: string
  rejection_reason?: string
  file_url?: string
  file?: File
}

export interface TeacherQualification {
  _id?: string
  teacher_id: string
  qualification: string
  specialization?: string
  institute_name?: string
  passing_year?: string
  teacher_name?: string
  file_url?: string
  file?: File
}

export interface TeacherExperience {
  _id?: string
  teacher_id: string
  organization_name: string
  role?: string
  responsibilities?: string
  from_date?: string
  to_date?: string
  is_current?: boolean
}

export interface TeacherSalaryStructure {
  _id?: string
  teacher_id: string
  salary_type: 'fixed_monthly' | 'per_lecture' | 'hourly' | 'percentage' | 'hybrid'
  pay_frequency: 'monthly' | 'weekly' | 'bi_weekly' | 'per_session'
  currency?: string
  basic_salary?: number | null
  hra?: number | null
  da?: number | null
  conveyance_allowance?: number | null
  medical_allowance?: number | null
  per_lecture_rate?: number | null
  hourly_rate?: number | null
  revenue_percentage?: number | null
  incentive_amount?: number | null
  bonus_amount?: number | null
  max_lectures_per_month?: number | null
  max_hours_per_month?: number | null
  pf_applicable?: boolean
  pf_percentage?: number | null
  tds_applicable?: boolean
  tds_percentage?: number | null
  other_deductions?: { name: string; amount: number }[]
  effective_from: string
  effective_to?: string | null
  remarks?: string | null
  approved_by?: string | null
  status?: 'active' | 'inactive' | 'archived'
}

export interface TeacherSalaryTransaction {
  _id?: string
  teacher_id: string
  amount: number
  payment_month: string
  payment_date?: string
  payment_mode?: 'bank_transfer' | 'upi' | 'cash'
  reference_id?: string
  status: 'pending' | 'paid' | 'failed'
}

export interface TeacherAttendance {
  _id?: string
  teacher_id: string | { _id: string; teacher_code?: string; full_name: string }
  date: string
  status: 'present' | 'absent' | 'half_day' | 'leave'
check_in_time?: string | null  
check_out_time?: string | null
  remarks?: string
  created_at?: string
  updated_at?: string
}

export interface TeacherLeave {
  _id?: string
  teacher_id: string | { _id: string; teacher_code: string; full_name: string }
  leave_type:
    | 'casual' | 'sick' | 'paid' | 'unpaid' | 'earned'
    | 'maternity' | 'paternity' | 'bereavement' | 'marriage'
    | 'study' | 'work_from_home' | 'half_day'
    | 'optional_holiday' | 'restricted_holiday'
  from_date: string
  to_date: string
  reason?: string | null
  status?: 'pending' | 'approved' | 'rejected'
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  created_at?: string
  updated_at?: string
}

export interface TeacherAuth {
  _id?: string
  teacher_id: string
  email: string
  mobile?: string
  is_first_login?: boolean
  status?: 'active' | 'blocked' | 'disabled'
}

// ─── Homework Interfaces ──────────────────────────────────────────────────────

export type HomeworkPriority = 'low' | 'medium' | 'high'
export type HomeworkAssignmentStatus = 'active' | 'closed' | 'archived'
export type HomeworkSubmissionStatus = 'pending' | 'submitted' | 'evaluated' | 'late_submission'

export interface HomeworkAssignment {
  _id: string
  institute_id: string
  title: string
  description: string | null
  subject_id: string
  class_id: string
  section_id: string | null
  batch_id: string | null
  assigned_by: string
  assigned_date: string
  due_date: string
  total_marks: number | null
  attachment_urls: string[] | null
  instructions: string | null
  priority: HomeworkPriority | null
  status: HomeworkAssignmentStatus
  createdAt: string
  updatedAt: string
}

export interface HomeworkSubmission {
  _id: string
  homework_id: string
  student_id: string | { _id: string; full_name?: string; student_code?: string }
  submission_date: string | null
  submission_text: string | null
  attachment_urls: string[] | null
  marks_obtained: number | null
  feedback: string | null
  evaluated_by: string | null
  evaluated_at: string | null
  status: HomeworkSubmissionStatus
  is_late: boolean | null
  createdAt: string
  updatedAt: string
}

export interface CreateHomeworkAssignmentPayload {
  institute_id: string
  title: string
  description?: string | null
  subject_id: string
  class_id: string
  section_id?: string | null
  batch_id?: string | null
  assigned_by: string
  assigned_date: string | Date
  due_date: string | Date
  total_marks?: number | null
  instructions?: string | null
  priority?: HomeworkPriority | null
  status?: HomeworkAssignmentStatus
  attachments?: File[]
}

export interface UpdateHomeworkAssignmentPayload {
  title?: string
  description?: string | null
  subject_id?: string
  class_id?: string
  section_id?: string | null
  batch_id?: string | null
  assigned_date?: string | Date
  due_date?: string | Date
  total_marks?: number | null
  instructions?: string | null
  priority?: HomeworkPriority | null
  status?: HomeworkAssignmentStatus
  attachments?: File[]
}

export interface GetAssignmentsFilters {
  institute_id?: string
  class_id?: string
  section_id?: string
  batch_id?: string
  subject_id?: string
  assigned_by?: string
  status?: HomeworkAssignmentStatus
  priority?: HomeworkPriority
}

export interface CreateHomeworkSubmissionPayload {
  homework_id: string
  student_id: string
  submission_text?: string | null
  status?: HomeworkSubmissionStatus
  attachments?: File[]
}

export interface UpdateHomeworkSubmissionPayload {
  submission_text?: string | null
  status?: HomeworkSubmissionStatus
  attachments?: File[]
}

export interface EvaluateHomeworkPayload {
  marks_obtained: number
  feedback?: string | null
  evaluated_by: string
}

export interface GetSubmissionsFilters {
  homework_id?: string
  student_id?: string
  status?: HomeworkSubmissionStatus
  is_late?: boolean
}

// ─── Helpers (internal) ───────────────────────────────────────────────────────

function buildFormData(
  payload: Record<string, unknown>,
  files: File[] = [],
  fileKey = 'attachments'
): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    formData.append(key, value instanceof Date ? value.toISOString() : String(value))
  }
  files.forEach((file) => formData.append(fileKey, file))
  return formData
}

function buildQueryString(filters?: Record<string, unknown>): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const teachersApi = {

  // ── Teachers Master ────────────────────────────────────────────────────────
  create: (data: Partial<Teacher> | FormData) =>
    apiClient.post<Teacher>(ENDPOINTS.TEACHERS.BASE, data),

getAll: (query?: { instituteId?: string; institute_id?: string; status?: string; employment_type?: string }) => {
  const params = new URLSearchParams()

  const instId = query?.institute_id || query?.instituteId
  if (instId) params.append('institute_id', instId)

  // Coaching portal — always filter by coaching teacher type
  params.append('teacher_type', 'coaching')

  if (query?.status) params.append('status', query.status)
  if (query?.employment_type) params.append('employment_type', query.employment_type)

  const qs = params.toString()
  return apiClient.get<Teacher[]>(`${ENDPOINTS.TEACHERS.BASE}${qs ? `?${qs}` : ''}`)
},

  getById: (id: string) =>
    apiClient.get<Teacher>(ENDPOINTS.TEACHERS.GET_BY_ID(id)),

  getByCode: (code: string) =>
    apiClient.get<Teacher>(ENDPOINTS.TEACHERS.GET_BY_CODE(code)),

  getWithAllDetails: (id: string) =>
    apiClient.get<Teacher>(ENDPOINTS.TEACHERS.GET_WITH_ALL_DETAILS(id)),

  update: (id: string, data: Partial<Teacher> | FormData) =>
    apiClient.put<Teacher>(ENDPOINTS.TEACHERS.UPDATE(id), data),

  updateWithAllDetails: (id: string, data: Partial<Teacher>) =>
    apiClient.put<Teacher>(ENDPOINTS.TEACHERS.UPDATE_WITH_ALL_DETAILS(id), data),

  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHERS.DELETE(id)),

  // ── Contact Information ────────────────────────────────────────────────────
  createContact: (data: TeacherContact) =>
    apiClient.post<TeacherContact>(ENDPOINTS.TEACHER_CONTACT.BASE, data),

  verifyContactOtp: (data: { email: string; otp: string }) =>
    apiClient.post<TeacherContact>(ENDPOINTS.TEACHER_CONTACT.VERIFY_OTP, data),

  resendContactOtp: (data: { email: string }) =>
    apiClient.post<{ message: string }>(ENDPOINTS.TEACHER_CONTACT.RESEND_OTP, data),

  getContactByTeacher: async (teacherId: string) => {
    try {
      const res = await apiClient.get<TeacherContact>(
        ENDPOINTS.TEACHER_CONTACT.GET_BY_TEACHER(teacherId)
      )
      if (!res.success && (res.statusCode === 404 || res.message?.includes('not found'))) {
        return { success: false as const, result: null, statusCode: 404 }
      }
      return res
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.status === 404 || err?.response?.status === 404) {
        return { success: false as const, result: null, statusCode: 404 }
      }
      throw err
    }
  },

  updateContact: (teacherId: string, data: Partial<TeacherContact>) =>
    apiClient.put<TeacherContact>(ENDPOINTS.TEACHER_CONTACT.UPDATE(teacherId), data),

  deleteContact: (teacherId: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_CONTACT.DELETE(teacherId)),

  // ── Addresses ─────────────────────────────────────────────────────────────
  createAddress: (data: TeacherAddress) =>
    apiClient.post<TeacherAddress>(ENDPOINTS.TEACHER_ADDRESSES.BASE, data),

  getAddressById: (id: string) =>
    apiClient.get<TeacherAddress>(ENDPOINTS.TEACHER_ADDRESSES.GET_BY_ID(id)),

  getAddressesByTeacher: (teacherId: string) =>
    apiClient.get<TeacherAddress[]>(ENDPOINTS.TEACHER_ADDRESSES.GET_BY_TEACHER(teacherId)),

  updateAddress: (id: string, data: Partial<TeacherAddress>) =>
    apiClient.put<TeacherAddress>(ENDPOINTS.TEACHER_ADDRESSES.UPDATE(id), data),

  deleteAddress: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_ADDRESSES.DELETE(id)),

  // ── Emergency Contacts ────────────────────────────────────────────────────
  createEmergencyContact: (data: TeacherEmergencyContact) =>
    apiClient.post<TeacherEmergencyContact>(ENDPOINTS.TEACHER_EMERGENCY_CONTACTS.BASE, data),

  getEmergencyContactById: (id: string) =>
    apiClient.get<TeacherEmergencyContact>(ENDPOINTS.TEACHER_EMERGENCY_CONTACTS.GET_BY_ID(id)),

  getEmergencyContactsByTeacher: (teacherId: string) =>
    apiClient.get<TeacherEmergencyContact[]>(
      ENDPOINTS.TEACHER_EMERGENCY_CONTACTS.GET_BY_TEACHER(teacherId)
    ),

  updateEmergencyContact: (id: string, data: Partial<TeacherEmergencyContact>) =>
    apiClient.put<TeacherEmergencyContact>(
      ENDPOINTS.TEACHER_EMERGENCY_CONTACTS.UPDATE(id), data
    ),

  deleteEmergencyContact: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_EMERGENCY_CONTACTS.DELETE(id)),

  // ── Bank Details ──────────────────────────────────────────────────────────
  createBankDetails: (data: TeacherBankDetails) =>
    apiClient.post<TeacherBankDetails>(ENDPOINTS.TEACHER_BANK_DETAILS.BASE, data),

  getBankDetailsById: (id: string) =>
    apiClient.get<TeacherBankDetails>(ENDPOINTS.TEACHER_BANK_DETAILS.GET_BY_BANK_ID(id)),

  getBankDetailsByTeacher: (teacherId: string) =>
    apiClient.get<TeacherBankDetails[]>(ENDPOINTS.TEACHER_BANK_DETAILS.GET_BY_TEACHER(teacherId)),

  updateBankDetails: (id: string, data: Partial<TeacherBankDetails>) =>
    apiClient.put<TeacherBankDetails>(ENDPOINTS.TEACHER_BANK_DETAILS.UPDATE(id), data),

  deleteBankDetails: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_BANK_DETAILS.DELETE(id)),

  // ── Identity Documents ────────────────────────────────────────────────────
  createIdentityDocument: (data: TeacherIdentityDocument) => {
    const formData = new FormData()
    formData.append('teacher_id', data.teacher_id)
    formData.append('document_type', data.document_type)
    if (data.document_number) formData.append('document_number', data.document_number)
    if (data.masked_number) formData.append('masked_number', data.masked_number)
    if (data.teacher_name) formData.append('teacher_name', data.teacher_name)
    if (data.file) formData.append('file', data.file)
    return apiClient.post<TeacherIdentityDocument>(
      ENDPOINTS.TEACHER_IDENTITY_DOCUMENTS.BASE, formData
    )
  },

  getIdentityDocumentById: (id: string) =>
    apiClient.get<TeacherIdentityDocument>(
      ENDPOINTS.TEACHER_IDENTITY_DOCUMENTS.GET_BY_ID(id)
    ),

  getIdentityDocumentsByTeacher: (teacherId: string) =>
    apiClient.get<TeacherIdentityDocument[]>(
      ENDPOINTS.TEACHER_IDENTITY_DOCUMENTS.GET_BY_TEACHER(teacherId)
    ),

  updateIdentityDocument: (id: string, data: Partial<TeacherIdentityDocument>) => {
    const formData = new FormData()
    if (data.document_number) formData.append('document_number', data.document_number)
    if (data.masked_number) formData.append('masked_number', data.masked_number)
    if (data.teacher_name) formData.append('teacher_name', data.teacher_name)
    if (data.teacher_id) formData.append('teacher_id', data.teacher_id)
    if (data.document_type) formData.append('document_type', data.document_type)
    if (data.file) formData.append('file', data.file)
    return apiClient.put<TeacherIdentityDocument>(
      ENDPOINTS.TEACHER_IDENTITY_DOCUMENTS.UPDATE(id), formData
    )
  },

  verifyIdentityDocument: (id: string, verifiedBy: string) =>
    apiClient.patch<TeacherIdentityDocument>(
      ENDPOINTS.TEACHER_IDENTITY_DOCUMENTS.VERIFY(id),
      { verification_status: 'approved', verified_by: verifiedBy }
    ),

  rejectIdentityDocument: (id: string, data: { rejection_reason: string; verified_by: string }) =>
    apiClient.patch<TeacherIdentityDocument>(
      ENDPOINTS.TEACHER_IDENTITY_DOCUMENTS.VERIFY(id),
      { verification_status: 'rejected', verified_by: data.verified_by, rejection_reason: data.rejection_reason }
    ),

  deleteIdentityDocument: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_IDENTITY_DOCUMENTS.DELETE(id)),

  // ── Qualifications ────────────────────────────────────────────────────────
  createQualification: (data: TeacherQualification) => {
    const formData = new FormData()
    formData.append('teacher_id', data.teacher_id)
    formData.append('qualification', data.qualification)
    if (data.teacher_name) formData.append('teacher_name', data.teacher_name)
    if (data.institute_name) formData.append('institute_name', data.institute_name)
    if (data.passing_year) formData.append('passing_year', data.passing_year)
    if (data.specialization) formData.append('specialization', data.specialization)
    if (data.file) formData.append('file', data.file)
    return apiClient.post<TeacherQualification>(ENDPOINTS.TEACHER_QUALIFICATIONS.BASE, formData)
  },

  getQualificationById: (id: string) =>
    apiClient.get<TeacherQualification>(ENDPOINTS.TEACHER_QUALIFICATIONS.GET_BY_ID(id)),

  getQualificationsByTeacher: (teacherId: string) =>
    apiClient.get<TeacherQualification[]>(
      ENDPOINTS.TEACHER_QUALIFICATIONS.GET_BY_TEACHER(teacherId)
    ),

  updateQualification: (id: string, data: Partial<TeacherQualification>) => {
    const formData = new FormData()
    if (data.qualification) formData.append('qualification', data.qualification)
    if (data.specialization) formData.append('specialization', data.specialization)
    if (data.file) formData.append('file', data.file)
    return apiClient.put<TeacherQualification>(
      ENDPOINTS.TEACHER_QUALIFICATIONS.UPDATE(id), formData
    )
  },

  deleteQualification: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_QUALIFICATIONS.DELETE(id)),

  // ── Experience ────────────────────────────────────────────────────────────
  createExperience: (data: TeacherExperience) =>
    apiClient.post<TeacherExperience>(ENDPOINTS.TEACHER_EXPERIENCE.BASE, data),

  getExperienceById: (id: string) =>
    apiClient.get<TeacherExperience>(ENDPOINTS.TEACHER_EXPERIENCE.GET_BY_ID(id)),

  getExperienceByTeacher: (teacherId: string) =>
    apiClient.get<TeacherExperience[]>(ENDPOINTS.TEACHER_EXPERIENCE.GET_BY_TEACHER(teacherId)),

  updateExperience: (id: string, data: Partial<TeacherExperience>) =>
    apiClient.put<TeacherExperience>(ENDPOINTS.TEACHER_EXPERIENCE.UPDATE(id), data),

  deleteExperience: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_EXPERIENCE.DELETE(id)),

  // ── Salary Structure ──────────────────────────────────────────────────────
  createSalaryStructure: (data: TeacherSalaryStructure) =>
    apiClient.post<TeacherSalaryStructure>(ENDPOINTS.TEACHER_SALARY_STRUCTURE.BASE, data),

  getSalaryStructureById: (id: string) =>
    apiClient.get<TeacherSalaryStructure>(ENDPOINTS.TEACHER_SALARY_STRUCTURE.GET_BY_ID(id)),

  getSalaryStructureByTeacher: (teacherId: string) =>
    apiClient.get<TeacherSalaryStructure[]>(
      ENDPOINTS.TEACHER_SALARY_STRUCTURE.GET_BY_TEACHER(teacherId)
    ),

  getActiveSalaryStructureByTeacher: (teacherId: string) =>
    apiClient.get<TeacherSalaryStructure>(
      ENDPOINTS.TEACHER_SALARY_STRUCTURE.GET_ACTIVE_BY_TEACHER(teacherId)
    ),

  updateSalaryStructure: (id: string, data: Partial<TeacherSalaryStructure>) =>
    apiClient.put<TeacherSalaryStructure>(ENDPOINTS.TEACHER_SALARY_STRUCTURE.UPDATE(id), data),

  approveSalaryStructure: (id: string) =>
    apiClient.patch<TeacherSalaryStructure>(ENDPOINTS.TEACHER_SALARY_STRUCTURE.APPROVE(id)),

  archiveSalaryStructure: (id: string) =>
    apiClient.patch<TeacherSalaryStructure>(ENDPOINTS.TEACHER_SALARY_STRUCTURE.ARCHIVE(id)),

  deleteSalaryStructure: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_SALARY_STRUCTURE.DELETE(id)),

  // ── Salary Transactions ───────────────────────────────────────────────────
  createSalaryTransaction: (data: TeacherSalaryTransaction) =>
    apiClient.post<TeacherSalaryTransaction>(ENDPOINTS.TEACHER_SALARY_TRANSACTIONS.BASE, data),

  getSalaryTransactionById: (id: string) =>
    apiClient.get<TeacherSalaryTransaction>(
      ENDPOINTS.TEACHER_SALARY_TRANSACTIONS.GET_BY_ID(id)
    ),

  getSalaryTransactionsByTeacher: (teacherId: string) =>
    apiClient.get<TeacherSalaryTransaction[]>(
      ENDPOINTS.TEACHER_SALARY_TRANSACTIONS.GET_BY_TEACHER(teacherId)
    ),

  getSalaryTransactionsByMonth: (month: string) =>
    apiClient.get<TeacherSalaryTransaction[]>(
      ENDPOINTS.TEACHER_SALARY_TRANSACTIONS.GET_BY_MONTH(month)
    ),

  getSalaryTransactionsByStatus: (status: string) =>
    apiClient.get<TeacherSalaryTransaction[]>(
      ENDPOINTS.TEACHER_SALARY_TRANSACTIONS.GET_BY_STATUS(status)
    ),

  updateSalaryTransaction: (id: string, data: Partial<TeacherSalaryTransaction>) =>
    apiClient.put<TeacherSalaryTransaction>(
      ENDPOINTS.TEACHER_SALARY_TRANSACTIONS.UPDATE(id), data
    ),

  deleteSalaryTransaction: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_SALARY_TRANSACTIONS.DELETE(id)),

  // ── Attendance ────────────────────────────────────────────────────────────
  createAttendance: (data: Omit<TeacherAttendance, '_id' | 'created_at' | 'updated_at'> & { teacher_id: string }) =>
    apiClient.post<TeacherAttendance>(ENDPOINTS.TEACHER_ATTENDANCE.BASE, data),

  getAttendanceById: (id: string) =>
    apiClient.get<TeacherAttendance>(ENDPOINTS.TEACHER_ATTENDANCE.GET_BY_ID(id)),

  getAttendanceByTeacher: (teacherId: string) =>
    apiClient.get<TeacherAttendance[]>(ENDPOINTS.TEACHER_ATTENDANCE.GET_BY_TEACHER(teacherId)),

  getAttendanceByDate: (date: string) =>
    apiClient.get<TeacherAttendance[]>(ENDPOINTS.TEACHER_ATTENDANCE.GET_BY_DATE(date)),

  getAttendanceByDateRange: (query: { teacherId?: string; from_date: string; to_date: string }) => {
    const params = new URLSearchParams()
    if (query.teacherId) params.append('teacherId', query.teacherId)
    params.append('startDate', query.from_date)
    params.append('endDate', query.to_date)
    return apiClient.get<TeacherAttendance[]>(
      `${ENDPOINTS.TEACHER_ATTENDANCE.GET_BY_DATE_RANGE}?${params.toString()}`
    )
  },

  updateAttendance: (id: string, data: Partial<Omit<TeacherAttendance, 'teacher_id'> & { teacher_id?: string }>) =>
    apiClient.put<TeacherAttendance>(ENDPOINTS.TEACHER_ATTENDANCE.UPDATE(id), data),

  deleteAttendance: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_ATTENDANCE.DELETE(id)),

  // ── Leaves ────────────────────────────────────────────────────────────────
  createLeave: (data: {
    teacher_id: string
    leave_type: TeacherLeave['leave_type']
    from_date: string
    to_date: string
    reason?: string
    status?: 'pending' | 'approved' | 'rejected'
  }) =>
    apiClient.post<TeacherLeave>(ENDPOINTS.TEACHER_LEAVES.BASE, data),

  getAllLeaves: () =>
    apiClient.get<TeacherLeave[]>(ENDPOINTS.TEACHER_LEAVES.BASE),

  getLeaveById: (id: string) =>
    apiClient.get<TeacherLeave>(ENDPOINTS.TEACHER_LEAVES.GET_BY_ID(id)),

  getLeavesByTeacher: (teacherId: string) =>
    apiClient.get<TeacherLeave[]>(ENDPOINTS.TEACHER_LEAVES.GET_BY_TEACHER(teacherId)),

  getLeavesByStatus: (status: string) =>
    apiClient.get<TeacherLeave[]>(ENDPOINTS.TEACHER_LEAVES.GET_BY_STATUS(status)),

  updateLeave: (id: string, data: {
    leave_type?: TeacherLeave['leave_type']
    to_date?: string
    reason?: string
  }) =>
    apiClient.put<TeacherLeave>(ENDPOINTS.TEACHER_LEAVES.UPDATE(id), data),

  approveLeave: (id: string, approvedBy: string) =>
    apiClient.put<TeacherLeave>(ENDPOINTS.TEACHER_LEAVES.APPROVE(id), { approved_by: approvedBy }),

  rejectLeave: (id: string, approvedBy: string, rejectionReason: string) =>
    apiClient.put<TeacherLeave>(ENDPOINTS.TEACHER_LEAVES.REJECT(id), {
      approved_by: approvedBy,
      rejection_reason: rejectionReason,
    }),

  deleteLeave: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_LEAVES.DELETE(id)),

  // ── Auth ──────────────────────────────────────────────────────────────────
  createAuth: (data: TeacherAuth) =>
    apiClient.post<TeacherAuth>(ENDPOINTS.TEACHER_AUTH.CREATE, data),

  getAllAuth: () =>
    apiClient.get<TeacherAuth[]>(ENDPOINTS.TEACHER_AUTH.GET_ALL),

  getAuthById: (id: string) =>
    apiClient.get<TeacherAuth>(ENDPOINTS.TEACHER_AUTH.GET_BY_ID(id)),

  getAuthByTeacher: (teacherId: string) =>
    apiClient.get<TeacherAuth>(ENDPOINTS.TEACHER_AUTH.GET_BY_TEACHER(teacherId)),

  updateAuth: (id: string, data: Partial<TeacherAuth>) =>
    apiClient.put<TeacherAuth>(ENDPOINTS.TEACHER_AUTH.UPDATE(id), data),

  deleteAuth: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.TEACHER_AUTH.DELETE(id)),

  verifyLogin: (data: { username: string; password: string }) =>
    apiClient.post<{ token: string; is_first_login: boolean }>(
      ENDPOINTS.TEACHER_AUTH.VERIFY_LOGIN, data
    ),

  requestOtp: (data: { username: string }) =>
    apiClient.post<void>(ENDPOINTS.TEACHER_AUTH.REQUEST_OTP, data),

  verifyOtp: (data: { username: string; otp: string }) =>
    apiClient.post<void>(ENDPOINTS.TEACHER_AUTH.VERIFY_OTP, data),

  changePassword: (data: { username: string; otp: string; newPassword: string }) =>
    apiClient.post<void>(ENDPOINTS.TEACHER_AUTH.CHANGE_PASSWORD, data),

  resetPassword: (data: { username: string; newPassword: string }) =>
    apiClient.post<void>(ENDPOINTS.TEACHER_AUTH.RESET_PASSWORD, data),

  // ── Homework Assignments ──────────────────────────────────────────────────

  /**
   * POST /homework-assignments  (multipart/form-data)
   */
  createHomeworkAssignment: (payload: CreateHomeworkAssignmentPayload) => {
    const { attachments = [], ...rest } = payload
    const formData = buildFormData(rest as Record<string, unknown>, attachments)
    return apiClient.post<HomeworkAssignment>(ENDPOINTS.HOMEWORK_ASSIGNMENTS.BASE, formData)
  },

  /**
   * GET /homework-assignments?institute_id=...&status=...
   */
  getAllHomeworkAssignments: (filters?: GetAssignmentsFilters) => {
    const qs = buildQueryString(filters as Record<string, unknown>)
    return apiClient.get<HomeworkAssignment[]>(
      `${ENDPOINTS.HOMEWORK_ASSIGNMENTS.BASE}${qs}`
    )
  },

  /**
   * GET /homework-assignments/:id
   */
  getHomeworkAssignmentById: (id: string) =>
    apiClient.get<HomeworkAssignment>(ENDPOINTS.HOMEWORK_ASSIGNMENTS.GET_BY_ID(id)),

  /**
   * GET /homework-assignments/class/:classId?section_id=...&batch_id=...
   */
  getHomeworkAssignmentsByClass: (
    classId: string,
    options?: { section_id?: string; batch_id?: string }
  ) => {
    const qs = buildQueryString(options as Record<string, unknown>)
    return apiClient.get<HomeworkAssignment[]>(
      `${ENDPOINTS.HOMEWORK_ASSIGNMENTS.GET_BY_CLASS(classId)}${qs}`
    )
  },

  /**
   * PUT /homework-assignments/:id  (multipart/form-data)
   */
  updateHomeworkAssignment: (id: string, payload: UpdateHomeworkAssignmentPayload) => {
    const { attachments = [], ...rest } = payload
    const formData = buildFormData(rest as Record<string, unknown>, attachments)
    return apiClient.put<HomeworkAssignment>(ENDPOINTS.HOMEWORK_ASSIGNMENTS.UPDATE(id), formData)
  },

  /**
   * DELETE /homework-assignments/:id
   */
  deleteHomeworkAssignment: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.HOMEWORK_ASSIGNMENTS.DELETE(id)),

  /**
   * DELETE /homework-assignments/:id/attachment  body: { attachment_url }
   */
  deleteHomeworkAssignmentAttachment: (id: string, attachmentUrl: string) =>
    apiClient.delete<HomeworkAssignment>(
      ENDPOINTS.HOMEWORK_ASSIGNMENTS.DELETE_ATTACHMENT(id),
      { attachment_url: attachmentUrl }
    ),

  // ── Homework Submissions ──────────────────────────────────────────────────

  /**
   * POST /homework-submissions  (multipart/form-data)
   */
  createHomeworkSubmission: (payload: CreateHomeworkSubmissionPayload) => {
    const { attachments = [], ...rest } = payload
    const formData = buildFormData(rest as Record<string, unknown>, attachments)
    return apiClient.post<HomeworkSubmission>(ENDPOINTS.HOMEWORK_SUBMISSIONS.BASE, formData)
  },

  /**
   * GET /homework-submissions?homework_id=...&status=...
   */
  getAllHomeworkSubmissions: (filters?: GetSubmissionsFilters) => {
    const qs = buildQueryString(filters as Record<string, unknown>)
    return apiClient.get<HomeworkSubmission[]>(
      `${ENDPOINTS.HOMEWORK_SUBMISSIONS.BASE}${qs}`
    )
  },

  /**
   * GET /homework-submissions/:id
   */
  getHomeworkSubmissionById: (id: string) =>
    apiClient.get<HomeworkSubmission>(ENDPOINTS.HOMEWORK_SUBMISSIONS.GET_BY_ID(id)),

  /**
   * PUT /homework-submissions/:id  (multipart/form-data)
   */
  updateHomeworkSubmission: (id: string, payload: UpdateHomeworkSubmissionPayload) => {
    const { attachments = [], ...rest } = payload
    const formData = buildFormData(rest as Record<string, unknown>, attachments)
    return apiClient.put<HomeworkSubmission>(ENDPOINTS.HOMEWORK_SUBMISSIONS.UPDATE(id), formData)
  },

  /**
   * PATCH /homework-submissions/:id/evaluate  (JSON)
   */
  evaluateHomeworkSubmission: (id: string, payload: EvaluateHomeworkPayload) =>
    apiClient.patch<HomeworkSubmission>(
      ENDPOINTS.HOMEWORK_SUBMISSIONS.EVALUATE(id),
      payload
    ),

  /**
   * DELETE /homework-submissions/:id
   */
  deleteHomeworkSubmission: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.HOMEWORK_SUBMISSIONS.DELETE(id)),

  /**
   * DELETE /homework-submissions/:id/attachment  body: { attachment_url }
   */
  deleteHomeworkSubmissionAttachment: (id: string, attachmentUrl: string) =>
    apiClient.delete<HomeworkSubmission>(
      ENDPOINTS.HOMEWORK_SUBMISSIONS.DELETE_ATTACHMENT(id),
      { attachment_url: attachmentUrl }
    ),
}