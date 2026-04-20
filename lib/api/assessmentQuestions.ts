import { apiClient } from './client'
import { ENDPOINTS } from './config'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface QuestionOption {
  option_id: string
  option_text: string
}

export interface AssessmentQuestion {
  _id: string
  institute_id: string
  assessment_id: string
  question_text: string
  question_type: 'mcq' | 'short_answer'
  options: QuestionOption[] | null
  correct_options: string[] | null
  correct_answer_text: string | null
  marks: number
  hint: string | null
  explanation: string | null
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface CreateQuestionData {
  institute_id: string
  assessment_id: string
  question_text: string
  question_type: 'mcq' | 'short_answer'
  options?: QuestionOption[]
  correct_options?: string[]
  correct_answer_text?: string
  marks: number
  hint?: string | null
  explanation?: string
  order: number
}

export interface UpdateQuestionData {
  question_text?: string
  options?: QuestionOption[]
  correct_options?: string[]
  correct_answer_text?: string
  marks?: number
  hint?: string | null
  explanation?: string
  order?: number
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const assessmentQuestionsApi = {
  add: (data: CreateQuestionData) =>
    apiClient.post<AssessmentQuestion>(ENDPOINTS.ASSESSMENT_QUESTIONS.BASE, data),

  getByAssessment: (assessmentId: string) =>
    apiClient.get<AssessmentQuestion[]>(ENDPOINTS.ASSESSMENT_QUESTIONS.GET_BY_ASSESSMENT(assessmentId)),

  getById: (id: string) =>
    apiClient.get<AssessmentQuestion>(ENDPOINTS.ASSESSMENT_QUESTIONS.GET_BY_ID(id)),

  update: (id: string, data: UpdateQuestionData) =>
    apiClient.put<AssessmentQuestion>(ENDPOINTS.ASSESSMENT_QUESTIONS.UPDATE(id), data),

  delete: (id: string) =>
    apiClient.delete<void>(ENDPOINTS.ASSESSMENT_QUESTIONS.DELETE(id)),
}