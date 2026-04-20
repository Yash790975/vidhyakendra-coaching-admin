// ─── Config & Client ─────────────────────────────────────────────────────────
export { BASE_URL, ENDPOINTS } from './config'
export { apiClient } from './client'
export type { ApiResponse, PaginatedResponse } from './client'

// ─── Super Admin ──────────────────────────────────────────────────────────────
export { adminApi } from './admin'
export type { Admin, LoginResponse } from './admin'

// export { superAdminNoticesApi } from './superAdminNotices'
// export type { SuperAdminNotice, CreateSuperAdminNoticeRequest } from './superAdminNotices'

// ─── Onboarding & Institute Setup ─────────────────────────────────────────────
// export { onboardingApi } from './onboarding'
// export type { OnboardingBasicInfo, OnboardingInstituteDetails, OnboardingTransaction, Institute } from './onboarding'

// export { instituteAdminApi } from './instituteAdmin'
// export type { InstituteAdmin, InstituteBasicInfo, InstituteDetailsMaster, InstituteDocument, InstituteIdentityDocument } from './instituteAdmin'

// export { subscriptionApi } from './subscription'
// export type { SubscriptionPlan, PlanVariant, SubscriptionTransaction } from './subscription'

// ─── Institute Operations ─────────────────────────────────────────────────────
export { noticesApi } from '../api/notices'
export type { Notice, CreateNoticeRequest } from '../api/notices'

// export { subjectsApi } from './subjects'
// export type { Subject } from './subjects'

// ─── Teachers ─────────────────────────────────────────────────────────────────
// export { teachersApi } from './teachers'
// export type {
//   Teacher,
//   TeacherContact,
//   TeacherAddress,
//   TeacherEmergencyContact,
//   TeacherBankDetails,
//   TeacherIdentityDocument,
//   TeacherQualification,
//   TeacherExperience,
//   TeacherSalaryStructure,
//   TeacherSalaryTransaction,
//   TeacherLeave,
//   TeacherAuth,
// } from './teachers'

// ─── Students ─────────────────────────────────────────────────────────────────
// export { studentsApi } from './students'
// export type {
//   Student,
//   StudentContact,
//   StudentAddress,
//   StudentGuardian,
//   StudentIdentityDocument,
//   StudentAcademicDocument,
//   StudentAcademicMapping,
//   StudentAttendance,
//   StudentStatusHistory,
//   StudentAuth,
// } from './students'

// ─── Classes & Schedule ───────────────────────────────────────────────────────
// export { classesApi } from './classes'
// export type {
//   ClassMaster,
//   ClassSection,
//   CoachingBatch,
//   ClassSubject,
//   ClassSubjectSchedule,
//   ClassTeacherAssignment,
// } from './classes'

// ─── Exams & Homework ─────────────────────────────────────────────────────────
// export { examsApi } from './exams'
// export type {
//   ExamMaster,
//   ExamSchedule,
//   StudentExamResult,
//   HomeworkAssignment,
//   HomeworkSubmission,
// } from './exams'

// ─── Misc ─────────────────────────────────────────────────────────────────────
export { dashboardApi } from './dashboard'

export { teachersApi } from './teachers'
export type { Teacher, TeacherAttendance } from './teachers'










// // Export all API services
// export { apiClient } from './client'
// export type { ApiResponse, PaginatedResponse } from './client'



// export { studentsApi } from './students'
// export type { Student } from './students'

// export { classesApi } from './classes'
// export type { Class, Timetable } from './classes'

// export { examsApi } from './exams'
// export type { Exam, ExamResult } from './exams'

// export { adminApi } from './admin'
// export type { Admin, LoginCredentials, LoginResponse } from './admin'
// // Initialize auth on app load
// import { adminApi } from './admin'
// if (typeof window !== 'undefined') {
//   adminApi.initializeAuth()
// }
