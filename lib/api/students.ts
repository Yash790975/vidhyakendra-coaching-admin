import { apiClient } from './client'
import { ENDPOINTS } from './config'
import { teachersApi } from './teachers'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Student {
  _id: string
  institute_id: string
  student_code: string
  student_type: 'coaching'
  full_name: string
  gender: 'male' | 'female' | 'other'
  date_of_birth: string
  blood_group?: string | null
  religion?: string | null
  caste?: string | null
  category?: string | null
  nationality?: string | null
  // "onboarding" is the default status for newly added students.
  // Admin approves them → "active" → they move to All Students.
  status: 'onboarding' | 'active' | 'inactive' | 'blocked' | 'archived'
  archived_at?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface StudentContact {
  _id?: string
  student_id: string | { _id: string; student_code: string; full_name: string; gender: string }
  contact_type?: 'student' | 'father' | 'mother' | 'guardian'
  mobile: string
  email?: string | null
  alternate_mobile?: string | null
  email_verified?: boolean
  mobile_verified?: boolean
  is_primary?: boolean
}

export interface StudentAddress {
  _id?: string
  student_id: string
  address_type: 'current' | 'permanent'
  address: string
  city: string
  state: string
  pincode: string
}

export interface StudentGuardian {
  _id?: string
  student_id: string | { _id: string; student_code: string; full_name: string }
  name: string
  relation: 'father' | 'mother' | 'guardian' | 'grandfather' | 'grandmother' | 'brother' | 'sister' | 'other'
  mobile: string
  email?: string | null
  occupation?: string | null
  annual_income?: number | null
  is_primary?: boolean
}

export interface StudentIdentityDocument {
  _id?: string
  student_id: string
  document_type: 'birth_certificate' | 'aadhaar_card' | 'pan_card' | 'passport' | 'student_photo'
  file_url?: string
  verification_status?: 'pending' | 'approved' | 'rejected'
  verified_by?: string
  remarks?: string | null
  student_name?: string
  file?: File
}

export interface StudentAcademicDocument {
  _id?: string
  student_id: string
  document_type: 'transfer_certificate' | 'leaving_certificate' | 'marksheet' | 'migration_certificate' | 'bonafide_certificate' | 'character_certificate'
  academic_year?: string | null
  previous_school_name?: string | null
  previous_board?: 'CBSE' | 'ICSE' | 'STATE' | 'IB' | 'OTHER' | null
  class_completed?: string | null
  file_url?: string
  verification_status?: 'pending' | 'approved' | 'rejected'
  verified_by?: string
  remarks?: string | null
  student_name?: string
  file?: File
}

export interface StudentAcademicMapping {
  _id?: string
  student_id: string
  class_id?: string | null
  section_id?: null
  batch_id?: string | null
  mapping_type: 'coaching'
  academic_year: string
  roll_number?: string | null
  joined_at?: string
  left_at?: string | null
  status?: 'active' | 'promoted' | 'completed' | 'dropped' | 'repeated'
}

export interface StudentAttendance {
  _id?: string
  student_id: string
  class_id: string
  batch_id?: string | null
  date: string
  status: 'present' | 'absent' | 'leave'
  marked_by: string
}

export interface StudentStatusHistory {
  _id?: string
  student_id: string
  status: 'onboarding' | 'active' | 'inactive' | 'blocked' | 'archived'
  reason?: string | null
  changed_at?: string
  changed_by: string
}

export interface StudentAuth {
  _id?: string
  student_id: string
  username?: string
  is_first_login?: boolean
  last_login_at?: string | null
  status?: 'active' | 'blocked' | 'disabled'
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const studentsApi = {
  // Students Master
  create: (data: Partial<Student>) =>
    apiClient.post<Student>(ENDPOINTS.STUDENTS.BASE, data),

  getAll: (query?: { institute_id?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (query?.institute_id) params.append('institute_id', query.institute_id)

    // Coaching portal — always filter by coaching student type
    params.append('student_type', 'coaching')

    if (query?.status) params.append('status', query.status)

    const qs = params.toString()
    return apiClient.get<Student[]>(`${ENDPOINTS.STUDENTS.BASE}${qs ? `?${qs}` : ''}`)
  },

  getById: (id: string) =>
    apiClient.get<Student>(ENDPOINTS.STUDENTS.GET_BY_ID(id)),

  getByCode: (code: string) =>
    apiClient.get<Student>(ENDPOINTS.STUDENTS.GET_BY_CODE(code)),

  update: (id: string, data: Partial<Student>) =>
    apiClient.put<Student>(ENDPOINTS.STUDENTS.UPDATE(id), data),

  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENTS.DELETE(id)),

  // ── Activate a student (onboarding → active) ─────────────────────────────
  activate: (id: string) =>
    apiClient.put<Student>(ENDPOINTS.STUDENTS.UPDATE(id), { status: 'active' }),

  // Contact Information
  createContact: (data: StudentContact) =>
    apiClient.post<StudentContact>(ENDPOINTS.STUDENT_CONTACT.BASE, data),

  verifyContactOtp: (data: { email: string; otp: string }) =>
    apiClient.post<void>(ENDPOINTS.STUDENT_CONTACT.VERIFY_OTP, data),

  resendContactOtp: (data: { email: string }) =>
    apiClient.post<void>(ENDPOINTS.STUDENT_CONTACT.RESEND_OTP, data),

  getContactByStudent: (studentId: string) =>
    apiClient.get<StudentContact>(ENDPOINTS.STUDENT_CONTACT.GET_BY_STUDENT(studentId)),

  getAllContactsByStudent: (studentId: string) =>
    apiClient.get<StudentContact[]>(ENDPOINTS.STUDENT_CONTACT.GET_ALL_BY_STUDENT(studentId)),

  getPrimaryContactByStudent: (studentId: string) =>
    apiClient.get<StudentContact>(ENDPOINTS.STUDENT_CONTACT.GET_PRIMARY_BY_STUDENT(studentId)),

  updateContact: (id: string, data: Partial<StudentContact>) =>
    apiClient.put<StudentContact>(ENDPOINTS.STUDENT_CONTACT.UPDATE(id), data),

  deleteContact: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_CONTACT.DELETE(id)),

  // Addresses
  createAddress: (data: StudentAddress) =>
    apiClient.post<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.BASE, data),

  getAddressById: (id: string) =>
    apiClient.get<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.GET_BY_ID(id)),

  getAddressesByStudent: (studentId: string) =>
    apiClient.get<StudentAddress[]>(ENDPOINTS.STUDENT_ADDRESSES.GET_BY_STUDENT(studentId)),

  getAddressByType: (studentId: string, type: 'current' | 'permanent') =>
    apiClient.get<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.GET_BY_TYPE(studentId, type)),

  updateAddress: (id: string, data: Partial<StudentAddress>) =>
    apiClient.put<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.UPDATE(id), data),

  deleteAddress: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_ADDRESSES.DELETE(id)),

  // Guardians
  createGuardian: (data: StudentGuardian) =>
    apiClient.post<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.BASE, data),

  getGuardianById: (id: string) =>
    apiClient.get<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.GET_BY_ID(id)),

  getGuardiansByStudent: (studentId: string) =>
    apiClient.get<StudentGuardian[]>(ENDPOINTS.STUDENT_GUARDIANS.GET_BY_STUDENT(studentId)),

  getPrimaryGuardian: (studentId: string) =>
    apiClient.get<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.GET_PRIMARY(studentId)),

  updateGuardian: (id: string, data: Partial<StudentGuardian>) =>
    apiClient.put<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.UPDATE(id), data),

  deleteGuardian: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_GUARDIANS.DELETE(id)),

  // Identity Documents
  createIdentityDocument: (data: StudentIdentityDocument) => {
    const formData = new FormData()
    formData.append('student_id', data.student_id)
    formData.append('document_type', data.document_type)
    if (data.student_name) formData.append('student_name', data.student_name)
    if (data.remarks) formData.append('remarks', data.remarks)
    if (data.file) formData.append('file', data.file)
    return apiClient.post<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.BASE, formData)
  },

  getIdentityDocumentById: (id: string) =>
    apiClient.get<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.GET_BY_ID(id)),

  getIdentityDocumentsByStudent: (studentId: string) =>
    apiClient.get<StudentIdentityDocument[]>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.GET_BY_STUDENT(studentId)),

  updateIdentityDocument: (id: string, data: { remarks?: string; file?: File }) => {
    const formData = new FormData()
    if (data.remarks) formData.append('remarks', data.remarks)
    if (data.file) formData.append('file', data.file)
    return apiClient.put<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.UPDATE(id), formData)
  },

  verifyIdentityDocument: (id: string, data: { verification_status: 'approved' | 'rejected'; verified_by: string; remarks?: string }) =>
    apiClient.patch<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.VERIFY(id), data),

  deleteIdentityDocument: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.DELETE(id)),

  // Academic Documents
  createAcademicDocument: (data: StudentAcademicDocument) => {
    const formData = new FormData()
    formData.append('student_id', data.student_id)
    formData.append('document_type', data.document_type)
    if (data.student_name) formData.append('student_name', data.student_name)
    if (data.academic_year) formData.append('academic_year', data.academic_year)
    if (data.remarks) formData.append('remarks', data.remarks)
    if (data.file) formData.append('file', data.file)
    return apiClient.post<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.BASE, formData)
  },

  getAcademicDocumentById: (id: string) =>
    apiClient.get<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.GET_BY_ID(id)),

  getAcademicDocumentsByStudent: (studentId: string) =>
    apiClient.get<StudentAcademicDocument[]>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.GET_BY_STUDENT(studentId)),

  updateAcademicDocument: (id: string, data: Partial<Pick<StudentAcademicDocument,
    'academic_year' | 'remarks' | 'file'
  >>) => {
    const formData = new FormData()
    if (data.academic_year)   formData.append('academic_year', data.academic_year)
    if (data.remarks != null) formData.append('remarks',       data.remarks)
    if (data.file)            formData.append('file',          data.file)
    return apiClient.put<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.UPDATE(id), formData)
  },

  verifyAcademicDocument: (id: string, data: { verification_status: 'approved' | 'rejected'; verified_by: string; remarks?: string }) =>
    apiClient.patch<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.VERIFY(id), data),

  deleteAcademicDocument: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.DELETE(id)),

  // Academic Mapping
  createAcademicMapping: (data: Omit<StudentAcademicMapping, 'mapping_type'>) =>
    apiClient.post<StudentAcademicMapping>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.BASE, {
      ...data,
      mapping_type: 'coaching',
    }),

  getAcademicMappingById: (id: string) =>
    apiClient.get<StudentAcademicMapping>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_BY_ID(id)),

  getActiveAcademicMappingByStudent: (studentId: string) =>
    apiClient.get<StudentAcademicMapping[]>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_ACTIVE_BY_STUDENT(studentId)),

  getAcademicMappingHistoryByStudent: (studentId: string) =>
    apiClient.get<StudentAcademicMapping[]>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_HISTORY_BY_STUDENT(studentId)),

  getStudentsByClass: (classId: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<StudentAcademicMapping[]>(`${ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_STUDENTS_BY_CLASS(classId)}${qs ? `?${qs}` : ''}`)
  },

  getStudentsByBatch: (batchId: string, query?: { academic_year?: string }) => {
    const params = new URLSearchParams()
    if (query?.academic_year) params.append('academic_year', query.academic_year)
    const qs = params.toString()
    return apiClient.get<StudentAcademicMapping[]>(`${ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_STUDENTS_BY_BATCH(batchId)}${qs ? `?${qs}` : ''}`)
  },

  updateAcademicMapping: (id: string, data: Partial<StudentAcademicMapping>) =>
    apiClient.put<StudentAcademicMapping>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.UPDATE(id), data),

  deleteAcademicMapping: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.DELETE(id)),

  // Attendance
  createAttendance: (data: StudentAttendance) =>
    apiClient.post<StudentAttendance>(ENDPOINTS.STUDENT_ATTENDANCE.BASE, data),

  createBulkAttendance: (data: { attendances: StudentAttendance[] }) =>
    apiClient.post<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.BULK, data),

  getAttendanceById: (id: string) =>
    apiClient.get<StudentAttendance>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_ID(id)),

  getAttendanceByStudent: (studentId: string) =>
    apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_STUDENT(studentId)),

  getAttendanceStatsByStudent: (studentId: string, query?: { start_date?: string; end_date?: string }) => {
    const params = new URLSearchParams()
    if (query?.start_date) params.append('start_date', query.start_date)
    if (query?.end_date) params.append('end_date', query.end_date)
    const qs = params.toString()
    return apiClient.get(`${ENDPOINTS.STUDENT_ATTENDANCE.GET_STATS_BY_STUDENT(studentId)}${qs ? `?${qs}` : ''}`)
  },

  getAttendanceByClass: (classId: string) =>
    apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_CLASS(classId)),

  getAttendanceByDate: (date: string) =>
    apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_DATE(date)),

  getAttendanceByDateRange: (query: { start_date: string; end_date: string }) => {
    const params = new URLSearchParams()
    params.append('start_date', query.start_date)
    params.append('end_date', query.end_date)
    return apiClient.get<StudentAttendance[]>(`${ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_DATE_RANGE}?${params.toString()}`)
  },

  getAttendanceByTeacher: (teacherId: string) =>
    apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_TEACHER(teacherId)),

  getAttendanceByStatus: (status: string) =>
    apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_STATUS(status)),

  updateAttendance: (id: string, data: Partial<StudentAttendance>) =>
    apiClient.put<StudentAttendance>(ENDPOINTS.STUDENT_ATTENDANCE.UPDATE(id), data),

  deleteAttendance: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_ATTENDANCE.DELETE(id)),

  // Status History
  createStatusHistory: (data: StudentStatusHistory) =>
    apiClient.post<StudentStatusHistory>(ENDPOINTS.STUDENT_STATUS_HISTORY.BASE, data),

  getStatusHistoryById: (id: string) =>
    apiClient.get<StudentStatusHistory>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_ID(id)),

  getStatusHistoryByStudent: (studentId: string) =>
    apiClient.get<StudentStatusHistory[]>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_STUDENT(studentId)),

  getStatusHistoryByStatus: (status: string) =>
    apiClient.get<StudentStatusHistory[]>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_STATUS(status)),

  getStatusHistoryByAdmin: (adminId: string) =>
    apiClient.get<StudentStatusHistory[]>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_ADMIN(adminId)),

  updateStatusHistory: (id: string, data: Partial<StudentStatusHistory>) =>
    apiClient.put<StudentStatusHistory>(ENDPOINTS.STUDENT_STATUS_HISTORY.UPDATE(id), data),

  deleteStatusHistory: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_STATUS_HISTORY.DELETE(id)),

  // Auth
  createAuth: (data: { student_id: string; status?: 'active' | 'blocked' | 'disabled' }) =>
    apiClient.post<StudentAuth>(ENDPOINTS.STUDENT_AUTH.CREATE, data),

  getAllAuth: () =>
    apiClient.get<StudentAuth[]>(ENDPOINTS.STUDENT_AUTH.GET_ALL),

  getAuthById: (id: string) =>
    apiClient.get<StudentAuth>(ENDPOINTS.STUDENT_AUTH.GET_BY_ID(id)),

  getAuthByStudent: (studentId: string) =>
    apiClient.get<StudentAuth>(ENDPOINTS.STUDENT_AUTH.GET_BY_STUDENT(studentId)),

  getAuthByUsername: (username: string) =>
    apiClient.get<StudentAuth>(ENDPOINTS.STUDENT_AUTH.GET_BY_USERNAME(username)),

  updateAuth: (id: string, data: { status: 'active' | 'blocked' | 'disabled' }) =>
    apiClient.put<StudentAuth>(ENDPOINTS.STUDENT_AUTH.UPDATE(id), data),

  deleteAuth: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.STUDENT_AUTH.DELETE(id)),

  verifyLogin: (data: { username: string; password: string }) =>
    apiClient.post<{ token: string; is_first_login: boolean }>(ENDPOINTS.STUDENT_AUTH.VERIFY_LOGIN, data),

  requestOtp: (data: { username: string }) =>
    apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.REQUEST_OTP, data),

  verifyOtp: (data: { username: string; otp: string }) =>
    apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.VERIFY_OTP, data),

  changePassword: (data: { username: string; old_password: string; new_password: string }) =>
    apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.CHANGE_PASSWORD, data),

  resetPassword: (data: { username: string; otp: string; new_password: string }) =>
    apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.RESET_PASSWORD, data),

  // ── Homework Assignments ──────────────────────────────────────────────────
  createHomeworkAssignment:           teachersApi.createHomeworkAssignment,
  getAllHomeworkAssignments:           teachersApi.getAllHomeworkAssignments,
  getHomeworkAssignmentById:          teachersApi.getHomeworkAssignmentById,
  getHomeworkAssignmentsByClass:      teachersApi.getHomeworkAssignmentsByClass,
  updateHomeworkAssignment:           teachersApi.updateHomeworkAssignment,
  deleteHomeworkAssignment:           teachersApi.deleteHomeworkAssignment,
  deleteHomeworkAssignmentAttachment: teachersApi.deleteHomeworkAssignmentAttachment,

  // ── Homework Submissions ──────────────────────────────────────────────────
  createHomeworkSubmission:           teachersApi.createHomeworkSubmission,
  getAllHomeworkSubmissions:           teachersApi.getAllHomeworkSubmissions,
  getHomeworkSubmissionById:          teachersApi.getHomeworkSubmissionById,
  updateHomeworkSubmission:           teachersApi.updateHomeworkSubmission,
  evaluateHomeworkSubmission:         teachersApi.evaluateHomeworkSubmission,
  deleteHomeworkSubmission:           teachersApi.deleteHomeworkSubmission,
  deleteHomeworkSubmissionAttachment: teachersApi.deleteHomeworkSubmissionAttachment,
}





















































































// import { apiClient } from './client'
// import { ENDPOINTS } from './config'
// import { teachersApi } from './teachers'

// // ─── Interfaces ───────────────────────────────────────────────────────────────

// export interface Student {
//   _id: string
//   institute_id: string
//   student_code: string
//   student_type: 'coaching'
//   full_name: string 
//   gender: 'male' | 'female' | 'other'
//   date_of_birth: string 
//   blood_group?: string | null
//   religion?: string | null
//   caste?: string | null
//   category?: string | null
//   nationality?: string | null
//   status: 'active' | 'inactive' | 'blocked' | 'archived'
//   archived_at?: string | null
//   createdAt?: string
//   updatedAt?: string
// }

// export interface StudentContact {
//   _id?: string
//   student_id: string | { _id: string; student_code: string; full_name: string; gender: string }
//   contact_type?: 'student' | 'father' | 'mother' | 'guardian'
//   mobile: string
//   email?: string | null
//   alternate_mobile?: string | null
//   email_verified?: boolean
//   mobile_verified?: boolean
//   is_primary?: boolean
// }

// export interface StudentAddress {
//   _id?: string
//   student_id: string
//   address_type: 'current' | 'permanent'
//   address: string
//   city: string
//   state: string
//   pincode: string
// }

// export interface StudentGuardian {
//   _id?: string
//   student_id: string | { _id: string; student_code: string; full_name: string }  
//   name: string
//   relation: 'father' | 'mother' | 'guardian' | 'grandfather' | 'grandmother' | 'brother' | 'sister' | 'other'
//   mobile: string
//   email?: string | null
//   occupation?: string | null
//   annual_income?: number | null
//   is_primary?: boolean
// }

// export interface StudentIdentityDocument {
//   _id?: string
//   student_id: string
//   document_type: 'birth_certificate' | 'aadhaar_card' | 'pan_card' | 'passport' | 'student_photo'
//   file_url?: string
//   verification_status?: 'pending' | 'approved' | 'rejected'
//   verified_by?: string
//   remarks?: string | null
//   // form upload fields
//   student_name?: string
//   file?: File
// }

// export interface StudentAcademicDocument {
//   _id?: string
//   student_id: string
//   document_type: 'transfer_certificate' | 'leaving_certificate' | 'marksheet' | 'migration_certificate' | 'bonafide_certificate' | 'character_certificate'
//   academic_year?: string | null
//   previous_school_name?: string | null
//   previous_board?: 'CBSE' | 'ICSE' | 'STATE' | 'IB' | 'OTHER' | null
//   class_completed?: string | null
//   file_url?: string
//   verification_status?: 'pending' | 'approved' | 'rejected'
//   verified_by?: string
//   remarks?: string | null
//   // form upload fields
//   student_name?: string
//   file?: File
// }

// export interface StudentAcademicMapping {
//   _id?: string
//   student_id: string
//   class_id?: string | null
//   section_id?: null
//   batch_id?: string | null
//   mapping_type: 'coaching'
//   academic_year: string
//   roll_number?: string | null
//   joined_at?: string
//   left_at?: string | null
//   status?: 'active' | 'promoted' | 'completed' | 'dropped' | 'repeated'
// }

// export interface StudentAttendance {
//   _id?: string
//   student_id: string
//   class_id: string
//   batch_id?: string | null
//   date: string
//   status: 'present' | 'absent' | 'leave'
//   marked_by: string  // teacher_auth _id
// }

// export interface StudentStatusHistory {
//   _id?: string
//   student_id: string
//   status: 'active' | 'inactive' | 'blocked' | 'archived'
//   reason?: string | null
//   changed_at?: string
//   changed_by: string
// }

// export interface StudentAuth {
//   _id?: string
//   student_id: string
//   username?: string
//   is_first_login?: boolean
//   last_login_at?: string | null
//   status?: 'active' | 'blocked' | 'disabled'
// }

// // ─── API Functions ────────────────────────────────────────────────────────────

// export const studentsApi = {
//   // Students Master
//   create: (data: Partial<Student>) =>
//     apiClient.post<Student>(ENDPOINTS.STUDENTS.BASE, data),

//   getAll: (query?: { institute_id?: string; status?: string }) => {
//     const params = new URLSearchParams()
//     if (query?.institute_id) params.append('institute_id', query.institute_id)

//     // Coaching portal — always filter by coaching student type
//     params.append('student_type', 'coaching')

//     if (query?.status) params.append('status', query.status)

//     const qs = params.toString()
//     return apiClient.get<Student[]>(`${ENDPOINTS.STUDENTS.BASE}${qs ? `?${qs}` : ''}`)
//   },
//   getById: (id: string) =>
//     apiClient.get<Student>(ENDPOINTS.STUDENTS.GET_BY_ID(id)),

//   getByCode: (code: string) =>
//     apiClient.get<Student>(ENDPOINTS.STUDENTS.GET_BY_CODE(code)),

//   update: (id: string, data: Partial<Student>) =>
//     apiClient.put<Student>(ENDPOINTS.STUDENTS.UPDATE(id), data),

//   delete: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENTS.DELETE(id)),

//   // Contact Information
//   createContact: (data: StudentContact) =>
//     apiClient.post<StudentContact>(ENDPOINTS.STUDENT_CONTACT.BASE, data),

//   verifyContactOtp: (data: { email: string; otp: string }) =>
//     apiClient.post<void>(ENDPOINTS.STUDENT_CONTACT.VERIFY_OTP, data),

//   resendContactOtp: (data: { email: string }) =>
//     apiClient.post<void>(ENDPOINTS.STUDENT_CONTACT.RESEND_OTP, data),

//   getContactByStudent: (studentId: string) =>
//     apiClient.get<StudentContact>(ENDPOINTS.STUDENT_CONTACT.GET_BY_STUDENT(studentId)),

//   getAllContactsByStudent: (studentId: string) =>
//     apiClient.get<StudentContact[]>(ENDPOINTS.STUDENT_CONTACT.GET_ALL_BY_STUDENT(studentId)),

//   getPrimaryContactByStudent: (studentId: string) =>
//     apiClient.get<StudentContact>(ENDPOINTS.STUDENT_CONTACT.GET_PRIMARY_BY_STUDENT(studentId)),

//   updateContact: (id: string, data: Partial<StudentContact>) =>
//     apiClient.put<StudentContact>(ENDPOINTS.STUDENT_CONTACT.UPDATE(id), data),

//   deleteContact: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_CONTACT.DELETE(id)),

//   // Addresses
//   createAddress: (data: StudentAddress) =>
//     apiClient.post<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.BASE, data),

//   getAddressById: (id: string) =>
//     apiClient.get<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.GET_BY_ID(id)),

//   getAddressesByStudent: (studentId: string) =>
//     apiClient.get<StudentAddress[]>(ENDPOINTS.STUDENT_ADDRESSES.GET_BY_STUDENT(studentId)),

//   getAddressByType: (studentId: string, type: 'current' | 'permanent') =>
//     apiClient.get<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.GET_BY_TYPE(studentId, type)),

//   updateAddress: (id: string, data: Partial<StudentAddress>) =>
//     apiClient.put<StudentAddress>(ENDPOINTS.STUDENT_ADDRESSES.UPDATE(id), data),

//   deleteAddress: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_ADDRESSES.DELETE(id)),

//   // Guardians
//   createGuardian: (data: StudentGuardian) =>
//     apiClient.post<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.BASE, data),

//   getGuardianById: (id: string) =>
//     apiClient.get<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.GET_BY_ID(id)),

//   getGuardiansByStudent: (studentId: string) =>
//     apiClient.get<StudentGuardian[]>(ENDPOINTS.STUDENT_GUARDIANS.GET_BY_STUDENT(studentId)),

//   getPrimaryGuardian: (studentId: string) =>
//     apiClient.get<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.GET_PRIMARY(studentId)),

//   updateGuardian: (id: string, data: Partial<StudentGuardian>) =>
//     apiClient.put<StudentGuardian>(ENDPOINTS.STUDENT_GUARDIANS.UPDATE(id), data),

//   deleteGuardian: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_GUARDIANS.DELETE(id)),

//   // Identity Documents
//   createIdentityDocument: (data: StudentIdentityDocument) => {
//     const formData = new FormData()
//     formData.append('student_id', data.student_id)
//     formData.append('document_type', data.document_type)
//     if (data.student_name) formData.append('student_name', data.student_name)
//     if (data.remarks) formData.append('remarks', data.remarks)
//     if (data.file) formData.append('file', data.file)
//     return apiClient.post<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.BASE, formData)
//   },

//   getIdentityDocumentById: (id: string) =>
//     apiClient.get<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.GET_BY_ID(id)),

//   getIdentityDocumentsByStudent: (studentId: string) =>
//     apiClient.get<StudentIdentityDocument[]>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.GET_BY_STUDENT(studentId)),

//   updateIdentityDocument: (id: string, data: { remarks?: string; file?: File }) => {
//     const formData = new FormData()
//     if (data.remarks) formData.append('remarks', data.remarks)
//     if (data.file) formData.append('file', data.file)
//     return apiClient.put<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.UPDATE(id), formData)
//   },

//   verifyIdentityDocument: (id: string, data: { verification_status: 'approved' | 'rejected'; verified_by: string; remarks?: string }) =>
//     apiClient.patch<StudentIdentityDocument>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.VERIFY(id), data),

//   deleteIdentityDocument: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_IDENTITY_DOCUMENTS.DELETE(id)),

//   // Academic Documents
//   createAcademicDocument: (data: StudentAcademicDocument) => {
//     const formData = new FormData()
//     formData.append('student_id', data.student_id)
//     formData.append('document_type', data.document_type)
//     if (data.student_name) formData.append('student_name', data.student_name)
//     if (data.academic_year) formData.append('academic_year', data.academic_year)
//     if (data.remarks) formData.append('remarks', data.remarks)
//     if (data.file) formData.append('file', data.file)
//     return apiClient.post<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.BASE, formData)
//   },

//   getAcademicDocumentById: (id: string) =>
//     apiClient.get<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.GET_BY_ID(id)),

//   getAcademicDocumentsByStudent: (studentId: string) =>
//     apiClient.get<StudentAcademicDocument[]>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.GET_BY_STUDENT(studentId)),

// updateAcademicDocument: (id: string, data: Partial<Pick<StudentAcademicDocument, 
//   'academic_year' | 'remarks' | 'file'
// >>) => {
//   const formData = new FormData()
//   if (data.academic_year)   formData.append('academic_year', data.academic_year)
//   if (data.remarks != null) formData.append('remarks',       data.remarks)
//   if (data.file)            formData.append('file',          data.file)
//   return apiClient.put<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.UPDATE(id), formData)
// },

//   verifyAcademicDocument: (id: string, data: { verification_status: 'approved' | 'rejected'; verified_by: string; remarks?: string }) =>
//     apiClient.patch<StudentAcademicDocument>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.VERIFY(id), data),

//   deleteAcademicDocument: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_ACADEMIC_DOCUMENTS.DELETE(id)),

//   // Academic Mapping
//     createAcademicMapping: (data: Omit<StudentAcademicMapping, 'mapping_type'>) =>
//     apiClient.post<StudentAcademicMapping>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.BASE, {
//       ...data,
//       mapping_type: 'coaching',
//     }),
//   getAcademicMappingById: (id: string) =>
//     apiClient.get<StudentAcademicMapping>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_BY_ID(id)),

//  getActiveAcademicMappingByStudent: (studentId: string) =>
//   apiClient.get<StudentAcademicMapping[]>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_ACTIVE_BY_STUDENT(studentId)),

//   getAcademicMappingHistoryByStudent: (studentId: string) =>
//     apiClient.get<StudentAcademicMapping[]>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_HISTORY_BY_STUDENT(studentId)),

//   getStudentsByClass: (classId: string, query?: { academic_year?: string }) => {
//     const params = new URLSearchParams()
//     if (query?.academic_year) params.append('academic_year', query.academic_year)
//     const qs = params.toString()
//     return apiClient.get<StudentAcademicMapping[]>(`${ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_STUDENTS_BY_CLASS(classId)}${qs ? `?${qs}` : ''}`)
//   },

//   getStudentsByBatch: (batchId: string, query?: { academic_year?: string }) => {
//     const params = new URLSearchParams()
//     if (query?.academic_year) params.append('academic_year', query.academic_year)
//     const qs = params.toString()
//     return apiClient.get<StudentAcademicMapping[]>(`${ENDPOINTS.STUDENT_ACADEMIC_MAPPING.GET_STUDENTS_BY_BATCH(batchId)}${qs ? `?${qs}` : ''}`)
//   },

//   updateAcademicMapping: (id: string, data: Partial<StudentAcademicMapping>) =>
//     apiClient.put<StudentAcademicMapping>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.UPDATE(id), data),

//   deleteAcademicMapping: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_ACADEMIC_MAPPING.DELETE(id)),

//   // Attendance
//   createAttendance: (data: StudentAttendance) =>
//     apiClient.post<StudentAttendance>(ENDPOINTS.STUDENT_ATTENDANCE.BASE, data),

//   createBulkAttendance: (data: { attendances: StudentAttendance[] }) =>
//     apiClient.post<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.BULK, data),

//   getAttendanceById: (id: string) =>
//     apiClient.get<StudentAttendance>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_ID(id)),

//   getAttendanceByStudent: (studentId: string) =>
//     apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_STUDENT(studentId)),

//   getAttendanceStatsByStudent: (studentId: string, query?: { start_date?: string; end_date?: string }) => {
//     const params = new URLSearchParams()
//     if (query?.start_date) params.append('start_date', query.start_date)
//     if (query?.end_date) params.append('end_date', query.end_date)
//     const qs = params.toString()
//     return apiClient.get(`${ENDPOINTS.STUDENT_ATTENDANCE.GET_STATS_BY_STUDENT(studentId)}${qs ? `?${qs}` : ''}`)
//   },

//   getAttendanceByClass: (classId: string) =>
//     apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_CLASS(classId)),

//   getAttendanceByDate: (date: string) =>
//     apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_DATE(date)),

//   getAttendanceByDateRange: (query: { start_date: string; end_date: string }) => {
//     const params = new URLSearchParams()
//     params.append('start_date', query.start_date)
//     params.append('end_date', query.end_date)
//     return apiClient.get<StudentAttendance[]>(`${ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_DATE_RANGE}?${params.toString()}`)
//   },

//   getAttendanceByTeacher: (teacherId: string) =>
//     apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_TEACHER(teacherId)),

//   getAttendanceByStatus: (status: string) =>
//     apiClient.get<StudentAttendance[]>(ENDPOINTS.STUDENT_ATTENDANCE.GET_BY_STATUS(status)),

//   updateAttendance: (id: string, data: Partial<StudentAttendance>) =>
//     apiClient.put<StudentAttendance>(ENDPOINTS.STUDENT_ATTENDANCE.UPDATE(id), data),

//   deleteAttendance: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_ATTENDANCE.DELETE(id)),

//   // Status History
//   createStatusHistory: (data: StudentStatusHistory) =>
//     apiClient.post<StudentStatusHistory>(ENDPOINTS.STUDENT_STATUS_HISTORY.BASE, data),

//   getStatusHistoryById: (id: string) =>
//     apiClient.get<StudentStatusHistory>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_ID(id)),

//   getStatusHistoryByStudent: (studentId: string) =>
//     apiClient.get<StudentStatusHistory[]>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_STUDENT(studentId)),

//   getStatusHistoryByStatus: (status: string) =>
//     apiClient.get<StudentStatusHistory[]>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_STATUS(status)),

//   getStatusHistoryByAdmin: (adminId: string) =>
//     apiClient.get<StudentStatusHistory[]>(ENDPOINTS.STUDENT_STATUS_HISTORY.GET_BY_ADMIN(adminId)),

//   updateStatusHistory: (id: string, data: Partial<StudentStatusHistory>) =>
//     apiClient.put<StudentStatusHistory>(ENDPOINTS.STUDENT_STATUS_HISTORY.UPDATE(id), data),

//   deleteStatusHistory: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_STATUS_HISTORY.DELETE(id)),

//   // Auth
//   createAuth: (data: { student_id: string; status?: 'active' | 'blocked' | 'disabled' }) =>
//     apiClient.post<StudentAuth>(ENDPOINTS.STUDENT_AUTH.CREATE, data),

//   getAllAuth: () =>
//     apiClient.get<StudentAuth[]>(ENDPOINTS.STUDENT_AUTH.GET_ALL),

//   getAuthById: (id: string) =>
//     apiClient.get<StudentAuth>(ENDPOINTS.STUDENT_AUTH.GET_BY_ID(id)),

//   getAuthByStudent: (studentId: string) =>
//     apiClient.get<StudentAuth>(ENDPOINTS.STUDENT_AUTH.GET_BY_STUDENT(studentId)),

//   getAuthByUsername: (username: string) =>
//     apiClient.get<StudentAuth>(ENDPOINTS.STUDENT_AUTH.GET_BY_USERNAME(username)),

//   updateAuth: (id: string, data: { status: 'active' | 'blocked' | 'disabled' }) =>
//     apiClient.put<StudentAuth>(ENDPOINTS.STUDENT_AUTH.UPDATE(id), data),

//   deleteAuth: (id: string) =>
//     apiClient.delete<void>(ENDPOINTS.STUDENT_AUTH.DELETE(id)),

//   verifyLogin: (data: { username: string; password: string }) =>
//     apiClient.post<{ token: string; is_first_login: boolean }>(ENDPOINTS.STUDENT_AUTH.VERIFY_LOGIN, data),

//   requestOtp: (data: { username: string }) =>
//     apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.REQUEST_OTP, data),

//   verifyOtp: (data: { username: string; otp: string }) =>
//     apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.VERIFY_OTP, data),

//   changePassword: (data: { username: string; old_password: string; new_password: string }) =>
//     apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.CHANGE_PASSWORD, data),

//   resetPassword: (data: { username: string; otp: string; new_password: string }) =>
//     apiClient.post<void>(ENDPOINTS.STUDENT_AUTH.RESET_PASSWORD, data), 

//   // ── Homework Assignments ──────────────────────────────────────────────────
//   createHomeworkAssignment:             teachersApi.createHomeworkAssignment,
//   getAllHomeworkAssignments:             teachersApi.getAllHomeworkAssignments,
//   getHomeworkAssignmentById:            teachersApi.getHomeworkAssignmentById,
//   getHomeworkAssignmentsByClass:        teachersApi.getHomeworkAssignmentsByClass,
//   updateHomeworkAssignment:             teachersApi.updateHomeworkAssignment,
//   deleteHomeworkAssignment:             teachersApi.deleteHomeworkAssignment,
//   deleteHomeworkAssignmentAttachment:   teachersApi.deleteHomeworkAssignmentAttachment,

//   // ── Homework Submissions ──────────────────────────────────────────────────
//   createHomeworkSubmission:             teachersApi.createHomeworkSubmission,
//   getAllHomeworkSubmissions:             teachersApi.getAllHomeworkSubmissions,
//   getHomeworkSubmissionById:            teachersApi.getHomeworkSubmissionById,
//   updateHomeworkSubmission:             teachersApi.updateHomeworkSubmission,
//   evaluateHomeworkSubmission:           teachersApi.evaluateHomeworkSubmission,
//   deleteHomeworkSubmission:             teachersApi.deleteHomeworkSubmission,
//   deleteHomeworkSubmissionAttachment:   teachersApi.deleteHomeworkSubmissionAttachment,

// }
