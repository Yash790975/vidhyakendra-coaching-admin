
const IS_PROD = true; // 🔁 manually toggle

export const BASE_URL = IS_PROD
  ? 'https://api.vidhyakendra.com/sms'
  : 'http://localhost:4000/sms';

export const IMAGE_BASE_URL = IS_PROD
  ? 'https://api.vidhyakendra.com/sms'
  : 'http://localhost:4000/sms'; 

export const API_CONFIG = { 
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;
 
export const ENDPOINTS = { 
  // ─── Super Admin Auth ────────────────────────────────────────────────────────
  ADMIN: { 
    ADD: '/admin/add',  
    UPDATE: '/admin/update',
    GET_ALL: '/admin/getAll', 
    GET_BY_ID: (id: string) => `/admin/getById/${id}`,
    DELETE: (id: string) => `/admin/${id}`,
    LOGIN: '/admin/login',
    REQUEST_OTP: '/admin/request-otp',
    VERIFY_OTP: '/admin/verify-otp',
    CHANGE_PASSWORD: '/admin/change-password',
  },

  // ─── Super Admin Notices ─────────────────────────────────────────────────────
  SUPER_ADMIN_NOTICES: {
    BASE: '/super-admin-notices',
    GET_BY_ID: (id: string) => `/super-admin-notices/${id}`,
    EXPIRED: '/super-admin-notices/expired',
    PUBLISHED: '/super-admin-notices/published',
    GET_BY_INSTITUTE: (instituteId: string) => `/super-admin-notices/institute/${instituteId}`,
    PUBLISH: (id: string) => `/super-admin-notices/${id}/publish`,
    ARCHIVE: (id: string) => `/super-admin-notices/${id}/archive`,
    DELETE: (id: string) => `/super-admin-notices/${id}`,
    UPDATE: (id: string) => `/super-admin-notices/${id}`,
  },

  // ─── Institute Notices ────────────────────────────────────────────────────────
  NOTICES: {
    BASE: '/notices',
    GET_BY_ID: (id: string) => `/notices/${id}`,
    EXPIRED: '/notices/expired',
    GET_FOR_STUDENT: (studentId: string, instituteId: string) =>
      `/notices/student/${studentId}/institute/${instituteId}`,
    GET_FOR_TEACHER: (teacherId: string, instituteId: string) =>
      `/notices/teacher/${teacherId}/institute/${instituteId}`,
    GET_FOR_CLASS: (classId: string, instituteId: string) =>
      `/notices/class/${classId}/institute/${instituteId}`,
    PUBLISH: (id: string) => `/notices/${id}/publish`,
    ARCHIVE: (id: string) => `/notices/${id}/archive`,
    UPDATE: (id: string) => `/notices/${id}`,
    DELETE: (id: string) => `/notices/${id}`,
  },

  // ─── Homework Assignments ─────────────────────────────────────────────────────
  HOMEWORK_ASSIGNMENTS: {
    BASE: '/homework-assignments',
    GET_BY_ID: (id: string) => `/homework-assignments/${id}`,
    GET_BY_CLASS: (classId: string) => `/homework-assignments/class/${classId}`,
    UPDATE: (id: string) => `/homework-assignments/${id}`,
    DELETE: (id: string) => `/homework-assignments/${id}`,
    DELETE_ATTACHMENT: (id: string) => `/homework-assignments/${id}/attachment`,
  },

  // ─── Homework Submissions ─────────────────────────────────────────────────────
  HOMEWORK_SUBMISSIONS: {
    BASE: '/homework-submissions',
    GET_BY_ID: (id: string) => `/homework-submissions/${id}`,
    UPDATE: (id: string) => `/homework-submissions/${id}`,
    EVALUATE: (id: string) => `/homework-submissions/${id}/evaluate`,
    DELETE_ATTACHMENT: (id: string) => `/homework-submissions/${id}/attachment`,
    DELETE: (id: string) => `/homework-submissions/${id}`,
  },

  // ─── Exams Master ─────────────────────────────────────────────────────────────
  EXAMS_MASTER: {
    BASE: '/exams-master',
    GET_BY_ID: (id: string) => `/exams-master/${id}`,
    UPDATE: (id: string) => `/exams-master/${id}`,
    DELETE: (id: string) => `/exams-master/${id}`,
  },

  // ─── Exam Schedules ───────────────────────────────────────────────────────────
  EXAM_SCHEDULES: {
    BASE: '/exam-schedules',
    GET_BY_ID: (id: string) => `/exam-schedules/${id}`,
    GET_BY_EXAM: (examId: string) => `/exam-schedules/exam/${examId}`,
    UPDATE: (id: string) => `/exam-schedules/${id}`,
    DELETE: (id: string) => `/exam-schedules/${id}`,
  },

  // ─── Student Exam Results ─────────────────────────────────────────────────────
  STUDENT_EXAM_RESULTS: {
    BASE: '/student-exam-results',
    GET_BY_ID: (id: string) => `/student-exam-results/${id}`,
    GET_BY_STUDENT: (studentId: string) => `/student-exam-results/student/${studentId}`,
    GET_BY_EXAM_SCHEDULE: (scheduleId: string) => `/student-exam-results/exam-schedule/${scheduleId}`,
    UPDATE: (id: string) => `/student-exam-results/${id}`,
    DELETE: (id: string) => `/student-exam-results/${id}`,
  },

  // ─── Subscription Plans ───────────────────────────────────────────────────────
  SUBSCRIPTION_PLANS: {
    BASE: '/subscription-plans',
    GET_BY_ID: (id: string) => `/subscription-plans/${id}`,
    ACTIVE: '/subscription-plans/active',
    UPDATE: (id: string) => `/subscription-plans/${id}`,
    DELETE: (id: string) => `/subscription-plans/${id}`,
  },

  // ─── Assessments ──────────────────────────────────────────────────────────────
ASSESSMENTS: {
  BASE: '/assessments',
  GET_BY_ID: (id: string) => `/assessments/${id}`,
  ANALYTICS: (id: string) => `/assessments/${id}/analytics`,
  UPDATE: (id: string) => `/assessments/${id}`,
  DELETE: (id: string) => `/assessments/${id}`,
},

// ─── Assessment Questions ─────────────────────────────────────────────────────
ASSESSMENT_QUESTIONS: {
  BASE: '/assessment-questions',
  GET_BY_ID: (id: string) => `/assessment-questions/${id}`,
  GET_BY_ASSESSMENT: (assessmentId: string) => `/assessment-questions/assessment/${assessmentId}`,
  UPDATE: (id: string) => `/assessment-questions/${id}`,
  DELETE: (id: string) => `/assessment-questions/${id}`,
},

// ─── Assessment Attempts ──────────────────────────────────────────────────────
ASSESSMENT_ATTEMPTS: {
  START: '/assessment-attempts/start',
  GET_BY_ID: (id: string) => `/assessment-attempts/${id}`,
  GET_BY_ASSESSMENT: (assessmentId: string) => `/assessment-attempts/assessment/${assessmentId}`,
  GET_BY_STUDENT: (studentId: string) => `/assessment-attempts/student/${studentId}`,
  SUBMIT: (id: string) => `/assessment-attempts/${id}/submit`,
  EVALUATE: (id: string) => `/assessment-attempts/${id}/evaluate`,
},

// ─── Assessment Answers ───────────────────────────────────────────────────────
ASSESSMENT_ANSWERS: {
  BASE: '/assessment-answers',
  GET_BY_ATTEMPT: (attemptId: string) => `/assessment-answers/attempt/${attemptId}`,
  EVALUATE: (id: string) => `/assessment-answers/${id}/evaluate`,
},

  // ─── Plan Variants ────────────────────────────────────────────────────────────
  PLAN_VARIANTS: {
    BASE: '/plan-variants',
    GET_BY_ID: (id: string) => `/plan-variants/${id}`,
    GET_BY_INSTITUTE_TYPE: (type: string) => `/plan-variants/institute/${type}`,
    GET_BY_PLAN_MASTER: (planMasterId: string) => `/plan-variants/plan-master/${planMasterId}`,
    UPDATE: (id: string) => `/plan-variants/${id}`,
    DELETE: (id: string) => `/plan-variants/${id}`,
  },

  // ─── Onboarding ───────────────────────────────────────────────────────────────
  ONBOARDING: {
    BASE: '/onboarding',
    SEND_OTP: '/onboarding/send-otp',
    RESEND_OTP: '/onboarding/resend-otp',
    VERIFY_OTP: '/onboarding/verify-otp',
    VERIFIED: '/onboarding/verified',
    UNVERIFIED: '/onboarding/unverified',
    GET_BY_ID: (id: string) => `/onboarding/${id}`,
    UPDATE: (id: string) => `/onboarding/${id}`,
    DELETE: (id: string) => `/onboarding/${id}`,
  },

  // ─── Onboarding Institute Details ────────────────────────────────────────────
  INSTITUTE_DETAILS: {
    BASE: '/institute-details',
    GET_BY_ID: (id: string) => `/institute-details/${id}`,
    GET_BY_BASIC_INFO: (basicInfoId: string) => `/institute-details/basic-info/${basicInfoId}`,
    GET_COMPLETE: (basicInfoId: string) => `/institute-details/complete/${basicInfoId}`,
    GET_BY_SCHOOL_BOARD: (board: string) => `/institute-details/school-board/${board}`,
    GET_BY_SCHOOL_TYPE: (type: string) => `/institute-details/school-type/${type}`,
    GET_BY_MEDIUM: (medium: string) => `/institute-details/medium/${medium}`,
    GET_BY_STUDENTS_RANGE: (range: string) => `/institute-details/students-range/${range}`,
    UPDATE: (id: string) => `/institute-details/${id}`,
    DELETE: (id: string) => `/institute-details/${id}`,
  },

  // ─── Onboarding Transactions ─────────────────────────────────────────────────
  ONBOARDING_TRANSACTIONS: {
    BASE: '/onboarding-transactions',
    GET_BY_ID: (id: string) => `/onboarding-transactions/${id}`,
    GET_BY_REFERENCE: (refId: string) => `/onboarding-transactions/reference/${refId}`,
    GET_BY_ONBOARDING: (onboardingId: string) => `/onboarding-transactions/onboarding/${onboardingId}`,
    GET_BY_PAYMENT_STATUS: (status: string) => `/onboarding-transactions/payment-status/${status}`,
    GET_BY_APPLICATION_STATUS: (status: string) =>
      `/onboarding-transactions/onboarding-transactions/application-status/${status}`,
    ALL_FULL_DETAILS: '/onboarding-transactions/transactions/full-details',
    FULL_DETAILS_BY_ONBOARDING: (onboardingId: string) =>
      `/onboarding-transactions/transaction/full-details/onboarding/${onboardingId}`,
    UPDATE: (id: string) => `/onboarding-transactions/update-transaction/${id}`,
    UPDATE_PAYMENT_STATUS: (id: string) => `/onboarding-transactions/${id}/payment-status`,
    UPDATE_APPLICATION_STATUS: (id: string) => `/onboarding-transactions/${id}/application-status`,
    DELETE: (id: string) => `/onboarding-transactions/${id}`,
  },

  // ─── Institutes ───────────────────────────────────────────────────────────────
  INSTITUTES: {
    ACTIVATE: '/institutes/activate',
    BASE: '/institutes',
    GET_BY_ID: (id: string) => `/institutes/${id}`,
    GET_BY_CODE: (code: string) => `/institutes/code/${code}`,
    GET_BY_TYPE: (type: string) => `/institutes/type/${type}`,
    GET_BY_STATUS: (status: string) => `/institutes/status/${status}`,
    UPDATE: (id: string) => `/institutes/${id}`,
    DELETE: (id: string) => `/institutes/${id}`,
  },

  // ─── Institute Basic Info ─────────────────────────────────────────────────────
  INSTITUTE_BASIC_INFO: {
    BASE: '/institute-basic-info',
    GET_BY_ID: (id: string) => `/institute-basic-info/${id}`,
    GET_BY_INSTITUTE: (instituteId: string) => `/institute-basic-info/institute/${instituteId}`,
    VERIFIED_LIST: '/institute-basic-info/verified/list',
    UPDATE: (id: string) => `/institute-basic-info/${id}`,
    DELETE: (id: string) => `/institute-basic-info/${id}`,
  },

  // ─── Institute Details Master ─────────────────────────────────────────────────
  INSTITUTE_DETAILS_MASTER: {
    BASE: '/institute-details-master',
    GET_BY_ID: (id: string) => `/institute-details-master/${id}`,
    GET_BY_INSTITUTE: (instituteId: string) => `/institute-details-master/institute/${instituteId}`,
    GET_BY_SCHOOL_BOARD: (board: string) => `/institute-details-master/school-board/${board}`,
    GET_BY_SCHOOL_TYPE: (type: string) => `/institute-details-master/school-type/${type}`,
    GET_BY_MEDIUM: (medium: string) => `/institute-details-master/medium/${medium}`,
    GET_BY_STUDENTS_RANGE: (range: string) => `/institute-details-master/students-range/${range}`,
    UPDATE: (id: string) => `/institute-details-master/${id}`,
    DELETE: (id: string) => `/institute-details-master/${id}`,
  },

  // ─── Subscription Transactions ────────────────────────────────────────────────
  SUBSCRIPTION_TRANSACTIONS: {
    BASE: '/subscription-transactions',
    GET_BY_ID: (id: string) => `/subscription-transactions/${id}`,
    GET_BY_INSTITUTE: (instituteId: string) => `/subscription-transactions/institute/${instituteId}`,
    ACTIVE: '/subscription-transactions/active/list',
    EXPIRED: '/subscription-transactions/expired/list',
    EXPIRING: (days: number) => `/subscription-transactions/expiring/${days}`,
    UPDATE: (id: string) => `/subscription-transactions/${id}`,
    DEACTIVATE: (id: string) => `/subscription-transactions/${id}/deactivate`,
    DELETE: (id: string) => `/subscription-transactions/${id}`,
  },

  // ─── Institute Documents ──────────────────────────────────────────────────────
  INSTITUTE_DOCUMENTS: {
    BASE: '/institute-documents',
    GET_BY_ID: (id: string) => `/institute-documents/${id}`,
    GET_BY_INSTITUTE: (instituteId: string) => `/institute-documents/institute/${instituteId}`,
    UPDATE: (id: string) => `/institute-documents/${id}`,
    VERIFY: (id: string) => `/institute-documents/${id}/verify`,
    DELETE: (id: string) => `/institute-documents/${id}`,
  },

  // ─── Institute Identity Documents ────────────────────────────────────────────
  INSTITUTE_IDENTITY_DOCUMENTS: {
    BASE: '/institute-identity-documents',
    GET_BY_ID: (id: string) => `/institute-identity-documents/${id}`,
    GET_BY_INSTITUTE: (instituteId: string) => `/institute-identity-documents/institute/${instituteId}`,
    UPDATE: (id: string) => `/institute-identity-documents/${id}`,
    VERIFY: (id: string) => `/institute-identity-documents/${id}/verify`,
    DELETE: (id: string) => `/institute-identity-documents/${id}`,
  },

  // ─── Institute Admin ──────────────────────────────────────────────────────────
  INSTITUTE_ADMIN: {
    CREATE: '/institute-admin/create',
    GET_ALL: '/institute-admin/get-all',
    GET_BY_ID: (id: string) => `/institute-admin/get/${id}`,
    GET_BY_INSTITUTE: (instituteId: string) => `/institute-admin/get-by-institute/${instituteId}`,
    GET_BY_TYPE: (type: string) => `/institute-admin/get-by-type/${type}`,
    UPDATE: (id: string) => `/institute-admin/update/${id}`,
    DELETE: (id: string) => `/institute-admin/delete/${id}`,
    VERIFY_LOGIN: '/institute-admin/verify-login',
    REQUEST_OTP: '/institute-admin/request-otp',
    VERIFY_OTP: '/institute-admin/verify-otp',
    CHANGE_PASSWORD: '/institute-admin/change-password',
    RESET_PASSWORD: '/institute-admin/reset-password',
  },

  // ─── Teachers Master ──────────────────────────────────────────────────────────
  TEACHERS: {
    BASE: '/teachers',
    GET_BY_ID: (id: string) => `/teachers/${id}`,
    GET_BY_CODE: (code: string) => `/teachers/code/${code}`,
    GET_WITH_ALL_DETAILS: (id: string) => `/teachers/teacher-with-all-details/${id}`,
    UPDATE: (id: string) => `/teachers/${id}`,
    UPDATE_WITH_ALL_DETAILS: (id: string) => `/teachers/update-with-all-details/${id}`,
    DELETE: (id: string) => `/teachers/${id}`,
  },

  // ─── Teacher Contact Information ──────────────────────────────────────────────
  TEACHER_CONTACT: {
    BASE: '/teacher-contact-information/contact',
    VERIFY_OTP: '/teacher-contact-information/contact/verify-otp',
    RESEND_OTP: '/teacher-contact-information/contact/resend-otp',
    GET_BY_TEACHER: (teacherId: string) => `/teacher-contact-information/contact/${teacherId}`,
    UPDATE: (teacherId: string) => `/teacher-contact-information/contact/${teacherId}`,
    DELETE: (teacherId: string) => `/teacher-contact-information/contact/${teacherId}`,
  },

  // ─── Teacher Addresses ────────────────────────────────────────────────────────
  TEACHER_ADDRESSES: {
    BASE: '/teacher-addresses/address',
    GET_BY_ID: (id: string) => `/teacher-addresses/address/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/teacher-addresses/address/teacher/${teacherId}`,
    UPDATE: (id: string) => `/teacher-addresses/address/${id}`,
    DELETE: (id: string) => `/teacher-addresses/address/${id}`,
  },

  // ─── Teacher Identity Documents ───────────────────────────────────────────────
  TEACHER_IDENTITY_DOCUMENTS: {
    BASE: '/teacher-identity-documents/identity-document',
    GET_BY_ID: (id: string) => `/teacher-identity-documents/identity-document/${id}`,
    GET_BY_TEACHER: (teacherId: string) =>
      `/teacher-identity-documents/identity-document/teacher/${teacherId}`,
    UPDATE: (id: string) => `/teacher-identity-documents/identity-document/${id}`,
  VERIFY: (id: string) => `/teacher-identity-documents/identity-document/${id}/verify`,
REJECT: (id: string) => `/teacher-identity-documents/identity-document/${id}/verify`,
    DELETE: (id: string) => `/teacher-identity-documents/identity-document/${id}`,
  },

  // ─── Teacher Qualifications ───────────────────────────────────────────────────
  TEACHER_QUALIFICATIONS: {
    BASE: '/teacher-qualification-details/qualification',
    GET_BY_ID: (id: string) => `/teacher-qualification-details/qualification/${id}`,
    GET_BY_TEACHER: (teacherId: string) =>
      `/teacher-qualification-details/qualification/teacher/${teacherId}`,
    UPDATE: (id: string) => `/teacher-qualification-details/qualification/${id}`,
    DELETE: (id: string) => `/teacher-qualification-details/qualification/${id}`,
  },

  // ─── Teacher Experience ───────────────────────────────────────────────────────
  TEACHER_EXPERIENCE: {
    BASE: '/teacher-experience/experience',
    GET_BY_ID: (id: string) => `/teacher-experience/experience/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/teacher-experience/experience/teacher/${teacherId}`,
    UPDATE: (id: string) => `/teacher-experience/experience/${id}`,
    DELETE: (id: string) => `/teacher-experience/experience/${id}`,
  },

  // ─── Teacher Bank Details ─────────────────────────────────────────────────────
  TEACHER_BANK_DETAILS: {
    BASE: '/teacher-bank-details/bank-details',
    GET_BY_BANK_ID: (id: string) => `/teacher-bank-details/bank-details/id/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/teacher-bank-details/bank-details/${teacherId}`,
    UPDATE: (id: string) => `/teacher-bank-details/bank-details/${id}`,
    DELETE: (id: string) => `/teacher-bank-details/bank-details/${id}`,
  },

  // ─── Teacher Emergency Contacts ───────────────────────────────────────────────
  TEACHER_EMERGENCY_CONTACTS: {
    BASE: '/teacher-emergency-contacts/emergency-contact',
    GET_BY_ID: (id: string) => `/teacher-emergency-contacts/emergency-contact/id/${id}`,
    GET_BY_TEACHER: (teacherId: string) =>
      `/teacher-emergency-contacts/emergency-contact/${teacherId}`,
    UPDATE: (id: string) => `/teacher-emergency-contacts/emergency-contact/${id}`,
    DELETE: (id: string) => `/teacher-emergency-contacts/emergency-contact/${id}`,
  },

  // ─── Teacher Auth ─────────────────────────────────────────────────────────────
  TEACHER_AUTH: {
    CREATE: '/teacher-auth/create',
    GET_ALL: '/teacher-auth/get-all',
    GET_BY_ID: (id: string) => `/teacher-auth/get/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/teacher-auth/get-by-teacher/${teacherId}`,
    UPDATE: (id: string) => `/teacher-auth/update/${id}`,
    DELETE: (id: string) => `/teacher-auth/delete/${id}`,
    VERIFY_LOGIN: '/teacher-auth/verify-login',
    REQUEST_OTP: '/teacher-auth/request-otp',
    VERIFY_OTP: '/teacher-auth/verify-otp',
    CHANGE_PASSWORD: '/teacher-auth/change-password',
    RESET_PASSWORD: '/teacher-auth/reset-password',
  },

  // ─── Teacher Salary Structure ─────────────────────────────────────────────────
  TEACHER_SALARY_STRUCTURE: {
    BASE: '/teacher-salary-structure/salary-structure',
    GET_BY_ID: (id: string) => `/teacher-salary-structure/salary-structure/${id}`,
    GET_BY_TEACHER: (teacherId: string) =>
      `/teacher-salary-structure/salary-structure/teacher/${teacherId}`,
    GET_ACTIVE_BY_TEACHER: (teacherId: string) =>
      `/teacher-salary-structure/salary-structure/teacher/${teacherId}/active`,
    UPDATE: (id: string) => `/teacher-salary-structure/salary-structure/${id}`,
    APPROVE: (id: string) => `/teacher-salary-structure/salary-structure/${id}/approve`,
    ARCHIVE: (id: string) => `/teacher-salary-structure/salary-structure/${id}/archive`,
    DELETE: (id: string) => `/teacher-salary-structure/salary-structure/${id}`,
  },

  // ─── Teacher Salary Transactions ──────────────────────────────────────────────
  TEACHER_SALARY_TRANSACTIONS: {
    BASE: '/teacher-salary-transactions/transaction',
    GET_BY_ID: (id: string) => `/teacher-salary-transactions/transaction/${id}`,
    GET_BY_TEACHER: (teacherId: string) =>
      `/teacher-salary-transactions/transaction/teacher/${teacherId}`,
    GET_BY_MONTH: (month: string) => `/teacher-salary-transactions/transaction/month/${month}`,
    GET_BY_STATUS: (status: string) => `/teacher-salary-transactions/transaction/status/${status}`,
    UPDATE: (id: string) => `/teacher-salary-transactions/transaction/${id}`,
    DELETE: (id: string) => `/teacher-salary-transactions/transaction/${id}`,
  },

  // ─── Teacher Attendance ───────────────────────────────────────────────────────
  TEACHER_ATTENDANCE: {
    BASE: '/teacher-attendance/attendance',
    GET_BY_ID: (id: string) => `/teacher-attendance/attendance/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/teacher-attendance/attendance/teacher/${teacherId}`,
    GET_BY_DATE: (date: string) => `/teacher-attendance/attendance/date/${date}`,
    GET_BY_DATE_RANGE: '/teacher-attendance/attendance/date-range',
    UPDATE: (id: string) => `/teacher-attendance/attendance/${id}`,
    DELETE: (id: string) => `/teacher-attendance/attendance/${id}`,
  },

  // ─── Teacher Leaves ───────────────────────────────────────────────────────────
  TEACHER_LEAVES: {
    BASE: '/teacher-leaves/leave',
    GET_BY_ID: (id: string) => `/teacher-leaves/leave/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/teacher-leaves/leave/teacher/${teacherId}`,
    GET_BY_STATUS: (status: string) => `/teacher-leaves/leave/status/${status}`,
    UPDATE: (id: string) => `/teacher-leaves/leave/${id}`,
    APPROVE: (id: string) => `/teacher-leaves/leave/${id}/approve`,
    REJECT: (id: string) => `/teacher-leaves/leave/${id}/reject`,
    DELETE: (id: string) => `/teacher-leaves/leave/${id}`,
  },

  // ─── Subjects Master ──────────────────────────────────────────────────────────
  SUBJECTS: {
    BASE: '/subjects-master/subject',
    GET_BY_ID: (id: string) => `/subjects-master/subject/${id}`,
    GET_BY_INSTITUTE: (instituteId: string) => `/subjects-master/subject/institute/${instituteId}`,
    GET_BY_TYPE: (type: string) => `/subjects-master/subject/type/${type}`,
    GET_BY_STATUS: (status: string) => `/subjects-master/subject/status/${status}`,
    GET_BY_CLASS_LEVEL: (level: string) => `/subjects-master/subject/class-level/${level}`,
    GET_BY_INSTITUTE_AND_TYPE: (instituteId: string, type: string) =>
      `/subjects-master/subject/institute/${instituteId}/type/${type}`,
    UPDATE: (id: string) => `/subjects-master/subject/${id}`,
    DELETE: (id: string) => `/subjects-master/subject/${id}`,
  },

  // ─── Subjects By Class ────────────────────────────────────────────────────────
SUBJECTS_BY_CLASS: {
  BASE: '/subjects-by-class/subject-by-class',
  GET_BY_ID: (id: string) => `/subjects-by-class/subject-by-class/${id}`,
  GET_BY_INSTITUTE: (instituteId: string) => `/subjects-by-class/subject-by-class/institute/${instituteId}`,
  GET_BY_CLASS: (classId: string) => `/subjects-by-class/subject-by-class/class/${classId}`,
  GET_BY_INSTITUTE_AND_CLASS: (iId: string, cId: string) =>
    `/subjects-by-class/subject-by-class/institute/${iId}/class/${cId}`,
  GET_BY_INSTITUTE_CLASS_AND_SECTION: (iId: string, cId: string, sId: string) =>
    `/subjects-by-class/subject-by-class/institute/${iId}/class/${cId}/section/${sId}`,
  GET_BY_STATUS: (status: string) => `/subjects-by-class/subject-by-class/status/${status}`,
  GET_BY_TYPE: (type: string) => `/subjects-by-class/subject-by-class/type/${type}`,
  UPDATE: (id: string) => `/subjects-by-class/subject-by-class/${id}`,
  DELETE: (id: string) => `/subjects-by-class/subject-by-class/${id}`,
},

// ─── Students Master ──────────────────────────────────────────────────────────
STUDENTS: {
  BASE: '/students',
  GET_BY_ID: (id: string) => `/students/${id}`,
  GET_BY_CODE: (code: string) => `/students/code/${code}`,
  GET_CLASS_TEACHER: (studentId: string) => `/students/${studentId}/class-teacher`,
  UPDATE: (id: string) => `/students/${id}`,
  DELETE: (id: string) => `/students/${id}`,
},

// ─── Student Contact Information ──────────────────────────────────────────────
STUDENT_CONTACT: {
  BASE: '/student-contact-information/contact',
  VERIFY_OTP: '/student-contact-information/contact/verify-otp',
  RESEND_OTP: '/student-contact-information/contact/resend-otp',
  GET_BY_STUDENT: (studentId: string) => `/student-contact-information/contact/${studentId}`,
  GET_ALL_BY_STUDENT: (studentId: string) => `/student-contact-information/contacts/${studentId}`,
  GET_PRIMARY_BY_STUDENT: (studentId: string) => `/student-contact-information/contact/primary/${studentId}`,
  UPDATE: (id: string) => `/student-contact-information/contact/${id}`,
  DELETE: (id: string) => `/student-contact-information/contact/${id}`,
},

// ─── Student Addresses ────────────────────────────────────────────────────────
STUDENT_ADDRESSES: {
  BASE: '/student-addresses',
  GET_BY_ID: (id: string) => `/student-addresses/${id}`,
  GET_BY_STUDENT: (studentId: string) => `/student-addresses/student/${studentId}`,
  GET_BY_TYPE: (studentId: string, type: string) => `/student-addresses/student/${studentId}/type/${type}`,
  UPDATE: (id: string) => `/student-addresses/${id}`,
  DELETE: (id: string) => `/student-addresses/${id}`,
},

// ─── Student Guardians ────────────────────────────────────────────────────────
STUDENT_GUARDIANS: {
  BASE: '/student-guardians',
  GET_BY_ID: (id: string) => `/student-guardians/${id}`,
  GET_BY_STUDENT: (studentId: string) => `/student-guardians/student/${studentId}`,
  GET_PRIMARY: (studentId: string) => `/student-guardians/student/${studentId}/primary`,
  UPDATE: (id: string) => `/student-guardians/${id}`,
  DELETE: (id: string) => `/student-guardians/${id}`,
},

// ─── Student Identity Documents ───────────────────────────────────────────────
STUDENT_IDENTITY_DOCUMENTS: {
  BASE: '/student-identity-documents/identity-document',
  GET_BY_ID: (id: string) => `/student-identity-documents/identity-document/${id}`,
  GET_BY_STUDENT: (studentId: string) => `/student-identity-documents/identity-document/student/${studentId}`,
  UPDATE: (id: string) => `/student-identity-documents/identity-document/${id}`,
  VERIFY: (id: string) => `/student-identity-documents/identity-document/${id}/verify`,
  DELETE: (id: string) => `/student-identity-documents/identity-document/${id}`,
},

// ─── Student Academic Documents ───────────────────────────────────────────────
STUDENT_ACADEMIC_DOCUMENTS: {
  BASE: '/student-academic-documents/academic-document',
  GET_BY_ID: (id: string) => `/student-academic-documents/academic-document/${id}`,
  GET_BY_STUDENT: (studentId: string) => `/student-academic-documents/academic-document/student/${studentId}`,
  UPDATE: (id: string) => `/student-academic-documents/academic-document/${id}`,
  VERIFY: (id: string) => `/student-academic-documents/academic-document/${id}/verify`,
  DELETE: (id: string) => `/student-academic-documents/academic-document/${id}`,
},

// ─── Student Academic Mapping ─────────────────────────────────────────────────
STUDENT_ACADEMIC_MAPPING: {
  BASE: '/student-academic-mapping',
  GET_BY_ID: (id: string) => `/student-academic-mapping/${id}`,
  GET_ACTIVE_BY_STUDENT: (studentId: string) => `/student-academic-mapping/student/${studentId}/active`,
  GET_HISTORY_BY_STUDENT: (studentId: string) => `/student-academic-mapping/student/${studentId}/history`,
  GET_STUDENTS_BY_CLASS: (classId: string) => `/student-academic-mapping/class/${classId}/students`,
  GET_STUDENTS_BY_BATCH: (batchId: string) => `/student-academic-mapping/batch/${batchId}/students`,
  UPDATE: (id: string) => `/student-academic-mapping/${id}`,
  PROMOTE: (id: string) => `/student-academic-mapping/${id}/promote`,
  DELETE: (id: string) => `/student-academic-mapping/${id}`,
},
// ─── Student Attendance ───────────────────────────────────────────────────────
STUDENT_ATTENDANCE: {
  BASE: '/student-attendance/attendance',
  BULK: '/student-attendance/attendance/bulk',
  GET_BY_ID: (id: string) => `/student-attendance/attendance/${id}`,
  GET_BY_STUDENT: (studentId: string) => `/student-attendance/attendance/student/${studentId}`,
  GET_STATS_BY_STUDENT: (studentId: string) => `/student-attendance/attendance/student/${studentId}/stats`,
  GET_BY_CLASS: (classId: string) => `/student-attendance/attendance/class/${classId}`,
  GET_BY_DATE: (date: string) => `/student-attendance/attendance/date/${date}`,
  GET_BY_DATE_RANGE: '/student-attendance/attendance/date-range/filter',  // ✅ FIXED
  GET_BY_TEACHER: (teacherId: string) => `/student-attendance/attendance/teacher/${teacherId}`,
  GET_BY_STATUS: (status: string) => `/student-attendance/attendance/status/${status}`,
  UPDATE: (id: string) => `/student-attendance/attendance/${id}`,
  DELETE: (id: string) => `/student-attendance/attendance/${id}`,
},


// ─── Student Status History ───────────────────────────────────────────────────
STUDENT_STATUS_HISTORY: {
  BASE: '/student-status-history/status-history',
  GET_BY_ID: (id: string) => `/student-status-history/status-history/${id}`,
  GET_BY_STUDENT: (studentId: string) => `/student-status-history/status-history/student/${studentId}`,
  GET_BY_STATUS: (status: string) => `/student-status-history/status-history/status/${status}`,
  GET_BY_ADMIN: (adminId: string) => `/student-status-history/status-history/admin/${adminId}`,
  UPDATE: (id: string) => `/student-status-history/status-history/${id}`,
  DELETE: (id: string) => `/student-status-history/status-history/${id}`,
},


// ─── Student Auth ─────────────────────────────────────────────────────────────
STUDENT_AUTH: {
  CREATE: '/student-auth/create',
  GET_ALL: '/student-auth/get-all',
  GET_BY_ID: (id: string) => `/student-auth/get/${id}`,
  GET_BY_STUDENT: (studentId: string) => `/student-auth/get-by-student/${studentId}`,
  GET_BY_USERNAME: (username: string) => `/student-auth/get-by-username/${username}`,
  UPDATE: (id: string) => `/student-auth/update/${id}`,
  DELETE: (id: string) => `/student-auth/delete/${id}`,
  VERIFY_LOGIN: '/student-auth/verify-login',
  REQUEST_OTP: '/student-auth/request-otp',
  VERIFY_OTP: '/student-auth/verify-otp',
  CHANGE_PASSWORD: '/student-auth/change-password',
  RESET_PASSWORD: '/student-auth/reset-password',
},
  // ─── Classes Master ───────────────────────────────────────────────────────────
  CLASSES: {
    BASE: '/classes',
    GET_BY_ID: (id: string) => `/classes/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/classes/teacher/${teacherId}`,
    GET_BY_INSTITUTE_AND_YEAR: (instituteId: string, year: string) =>
      `/classes/institute/${instituteId}/year/${year}`,
    UPDATE: (id: string) => `/classes/${id}`,
    DELETE: (id: string) => `/classes/${id}`,
  },

  // ─── Class Sections ───────────────────────────────────────────────────────────
  CLASS_SECTIONS: {
    BASE: '/class-sections',
    GET_BY_ID: (id: string) => `/class-sections/${id}`,
    GET_BY_CLASS: (classId: string) => `/class-sections/class/${classId}`,
    UPDATE: (id: string) => `/class-sections/${id}`,
    DELETE: (id: string) => `/class-sections/${id}`,
  },

  // ─── Coaching Batches ─────────────────────────────────────────────────────────
  COACHING_BATCHES: {
    BASE: '/coaching-batches',
    GET_BY_ID: (id: string) => `/coaching-batches/${id}`,
    GET_BY_CLASS: (classId: string) => `/coaching-batches/class/${classId}`,
    UPDATE: (id: string) => `/coaching-batches/${id}`,
    DELETE: (id: string) => `/coaching-batches/${id}`,
  },

  // ─── Class Subjects ───────────────────────────────────────────────────────────
  CLASS_SUBJECTS: {
    BASE: '/class-subjects',
    GET_BY_ID: (id: string) => `/class-subjects/${id}`,
    GET_BY_CLASS: (classId: string) => `/class-subjects/class/${classId}`,
    UPDATE: (id: string) => `/class-subjects/${id}`,
    DELETE: (id: string) => `/class-subjects/${id}`,
  },

  // ─── Class Subject Schedule (Timetable) ───────────────────────────────────────
  CLASS_SUBJECT_SCHEDULE: {
    BASE: '/class-subject-schedule',
    GET_BY_ID: (id: string) => `/class-subject-schedule/${id}`,
    GET_BY_CLASS: (classId: string) => `/class-subject-schedule/class/${classId}`,
    GET_BY_TEACHER: (teacherId: string) => `/class-subject-schedule/teacher/${teacherId}`,
    GET_BY_BATCH: (batchId: string) => `/class-subject-schedule/batch/${batchId}`,
    GET_BY_DAY: (classId: string, day: string) =>
      `/class-subject-schedule/class/${classId}/day/${day}`,
    UPDATE: (id: string) => `/class-subject-schedule/${id}`,
    DELETE: (id: string) => `/class-subject-schedule/${id}`,
  },

  // ─── Class Teacher Assignments ────────────────────────────────────────────────
  CLASS_TEACHER_ASSIGNMENTS: {
    BASE: '/class-teacher-assignments',
    GET_BY_ID: (id: string) => `/class-teacher-assignments/${id}`,
    GET_BY_TEACHER: (teacherId: string) => `/class-teacher-assignments/teacher/${teacherId}`,
    GET_BY_CLASS: (classId: string) => `/class-teacher-assignments/class/${classId}`,
    GET_CLASS_TEACHER: (classId: string) =>
      `/class-teacher-assignments/class/${classId}/class-teacher`,
    GET_BY_ROLE: (role: string) => `/class-teacher-assignments/role/${role}`,
    GET_BY_SUBJECT: (subjectId: string) => `/class-teacher-assignments/subject/${subjectId}`,
    GET_BATCH_INCHARGE: (batchId: string) => `/class-teacher-assignments/batch/${batchId}/incharge`,
    UPDATE: (id: string) => `/class-teacher-assignments/${id}`,
    END: (id: string) => `/class-teacher-assignments/${id}/end`,
    DELETE: (id: string) => `/class-teacher-assignments/${id}`,
  },

  // ─── Fee Structures ───────────────────────────────────────────────────────────
  FEE_STRUCTURES: {
    BASE: '/fee-structures/fee-structure',
    GET_BY_ID: (id: string) => `/fee-structures/fee-structure/${id}`,
    GET_BY_CLASS: (classId: string) => `/fee-structures/fee-structure/class/${classId}`,
    UPDATE: (id: string) => `/fee-structures/fee-structure/${id}`,
    DELETE: (id: string) => `/fee-structures/fee-structure/${id}`,
  },

  // ─── Fee Terms ────────────────────────────────────────────────────────────────
  FEE_TERMS: {
    BASE: '/fee-terms/fee-term',
    BULK: '/fee-terms/fee-term/bulk',
    GET_BY_ID: (id: string) => `/fee-terms/fee-term/${id}`,
    GET_BY_INSTITUTE_AND_YEAR: (instituteId: string, year: string) =>
      `/fee-terms/fee-term/institute/${instituteId}/year/${year}`,
    UPDATE: (id: string) => `/fee-terms/fee-term/${id}`,
    DELETE: (id: string) => `/fee-terms/fee-term/${id}`,
  },

  // ─── Student Fees ─────────────────────────────────────────────────────────────
   STUDENT_FEES: {
    BASE: '/student-fees/student-fee',
    GENERATE: '/student-fees/student-fee/generate',
    GET_BY_ID: (id: string) => `/student-fees/student-fee/${id}`,
    GET_BY_STUDENT: (studentId: string) => `/student-fees/student-fee/student/${studentId}`,
    GET_BY_BATCH: (batchId: string) => `/student-fees/student-fee/batch/${batchId}`,
    UPDATE: (id: string) => `/student-fees/student-fee/${id}`,
    APPLY_LATE_FEE: (id: string) => `/student-fees/student-fee/${id}/apply-late-fee`,
    DELETE: (id: string) => `/student-fees/student-fee/${id}`,
  },

  // ─── Fee Receipts ─────────────────────────────────────────────────────────────
  FEE_RECEIPTS: {
    BASE: '/fee-receipts/fee-receipt',
    GET_BY_ID: (id: string) => `/fee-receipts/fee-receipt/${id}`,
    GET_BY_STUDENT: (studentId: string) => `/fee-receipts/fee-receipt/student/${studentId}`,
    GET_BY_STUDENT_FEE: (studentFeeId: string) => `/fee-receipts/fee-receipt/student-fee/${studentFeeId}`,
    DELETE: (id: string) => `/fee-receipts/fee-receipt/${id}`,
  },
} as const
