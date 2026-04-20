import type { ExamMaster, ExamSchedule, StudentExamResult } from '@/lib/api/exams'

export interface EnrichedExam {
  exam: ExamMaster
  schedules: ExamSchedule[]
  results: StudentExamResult[]
  totalMarksObtained: number
  totalMaxMarks: number
  percentage: number | null
  grade: string | null
  rank: number | null
}