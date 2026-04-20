'use client'

import { useState, useCallback, useRef } from 'react'
import { studentsApi } from '@/lib/api/students'
import type { EvaluateHomeworkPayload } from '@/lib/api/teachers'

export type ComputedStatus = 'pending' | 'submitted' | 'graded' | 'overdue'

// ─── Populated response types (match actual API/postman response) ─────────────
// teachers.ts uses `string` for subject_id, assigned_by etc.
// but the backend populates them as objects — we define accurate types here.

export interface PopulatedSubject  { _id: string; subject_name: string }
export interface PopulatedClass    { _id: string; class_name: string }
export interface PopulatedTeacher  { _id: string; full_name: string }
export interface PopulatedStudent  { _id: string; student_code: string; full_name: string }
export interface PopulatedInstitute { _id: string; institute_code: string; institute_name: string }

export type HomeworkSubmissionStatus =
  | 'pending' | 'submitted' | 'evaluated' | 'late_submission'

/** Actual populated shape returned by GET /homework-assignments/class/:id */
export interface PopulatedBatch { _id: string; batch_name: string }

export interface PopulatedHomeworkAssignment {
  _id: string
  institute_id: string | PopulatedInstitute
  title: string
  description: string | null
  subject_id: string | PopulatedSubject
  class_id: string | PopulatedClass
  section_id: string | null
  batch_id: string | PopulatedBatch | null
  assigned_by: string | PopulatedTeacher
  assigned_date: string
  due_date: string
  total_marks: number | null
  attachment_urls: string[] | null
  instructions: string | null
  priority: 'low' | 'medium' | 'high' | null
  status: 'active' | 'closed' | 'archived'
  createdAt: string
  updatedAt: string
}

/** Actual populated shape returned by GET /homework-submissions?student_id=... */
export interface PopulatedHomeworkSubmission {
  _id: string
  homework_id: string | PopulatedHomeworkAssignment
  student_id: string | PopulatedStudent
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

export interface HomeworkWithSubmission extends PopulatedHomeworkAssignment {
  submission?: PopulatedHomeworkSubmission
  computedStatus: ComputedStatus
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely resolve _id from a string or populated object */
function resolveId(field: unknown): string | null {
  if (!field) return null
  if (typeof field === 'string') return field
  if (typeof field === 'object' && field !== null && '_id' in field) {
    return (field as { _id: string })._id
  }
  return null
}

function computeStatus(
  hw: PopulatedHomeworkAssignment,
  submission?: PopulatedHomeworkSubmission
): ComputedStatus {
  if (submission) {
    if (submission.status === 'evaluated' && submission.marks_obtained != null) return 'graded'
    if (submission.status === 'submitted' || submission.status === 'late_submission') return 'submitted'
  }
  if (new Date() > new Date(hw.due_date)) return 'overdue'
  return 'pending'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHomework(
  studentId: string,
  classId?: string | null,
  batchId?: string | null
) {
  const fetchedRef = useRef(false)
  const [assignments, setAssignments] = useState<HomeworkWithSubmission[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [evaluating, setEvaluating]   = useState(false)
  const [evaluateError, setEvaluateError] = useState<string | null>(null)

  const fetchHomework = useCallback(async (force = false) => {
    const resolvedClassId = resolveId(classId)
    const resolvedBatchId = resolveId(batchId)

    if (!studentId || !resolvedClassId) {
      setLoading(false)
      return
    }
    if (fetchedRef.current && !force) return

    setLoading(true)
    setError(null)

    try {
      const [assignmentsRes, submissionsRes] = await Promise.allSettled([
        studentsApi.getHomeworkAssignmentsByClass(resolvedClassId, {
          ...(resolvedBatchId ? { batch_id: resolvedBatchId } : {}),
        }),
        studentsApi.getAllHomeworkSubmissions({ student_id: studentId }),
      ])


      // Hard failure on assignments → show error
      if (assignmentsRes.status === 'rejected') {
        setError('Failed to load homework assignments. Please try again.')
        return
      }

      const assignmentsValue = assignmentsRes.value
      if (!assignmentsValue.success) {
        setError(assignmentsValue.message ?? 'Failed to load homework assignments.')
        return
      }

      const fetchedAssignments: PopulatedHomeworkAssignment[] =
        (assignmentsValue.result as PopulatedHomeworkAssignment[]) ?? []

      // Submissions failure is non-fatal — show assignments without submission status
      const fetchedSubmissions: PopulatedHomeworkSubmission[] =
        submissionsRes.status === 'fulfilled' && submissionsRes.value.success
          ? ((submissionsRes.value.result as PopulatedHomeworkSubmission[]) ?? [])
          : []

      const merged: HomeworkWithSubmission[] = fetchedAssignments.map((hw) => {
        const submission = fetchedSubmissions.find((sub) => {
          // homework_id in submission response is a populated object (postman confirmed)
          const subHwId = resolveId(sub.homework_id)
          return subHwId === hw._id
        })
        return { ...hw, submission, computedStatus: computeStatus(hw, submission) }
      })

      setAssignments(merged)
    } catch (err: any) {
      setError(err?.message ?? 'An unexpected error occurred while loading homework.')
    } finally {
      fetchedRef.current = true
      setLoading(false)
    }
  }, [studentId, classId, batchId])

  const evaluateSubmission = useCallback(async (
    submissionId: string,
    payload: EvaluateHomeworkPayload
  ): Promise<boolean> => {
    setEvaluating(true)
    setEvaluateError(null)
    try {
      const res = await studentsApi.evaluateHomeworkSubmission(submissionId, payload)
      if (!res.success) {
        setEvaluateError(res.message ?? 'Evaluation failed. Please try again.')
        return false
      }
      await fetchHomework(true)
      return true
    } catch (err: any) {
      setEvaluateError(err?.message ?? 'An unexpected error occurred during evaluation.')
      return false
    } finally {
      setEvaluating(false)
    }
  }, [fetchHomework])

  const clearEvaluateError = useCallback(() => setEvaluateError(null), [])

  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

    const deleteAssignment = useCallback(async (assignmentId: string): Promise<boolean> => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await studentsApi.deleteHomeworkAssignment(assignmentId)
      if (!res.success) {
        setDeleteError(res.message ?? 'Failed to delete assignment. Please try again.')
        return false
      }
      await fetchHomework(true)
      return true
    } catch (err: any) {
      console.error('[deleteAssignment]', err)
      setDeleteError(err?.message ?? 'An unexpected error occurred while deleting assignment.')
      return false
    } finally {
      setDeleting(false)
    }
  }, [fetchHomework])


  const clearDeleteError = useCallback(() => setDeleteError(null), [])

  return {
    assignments,
    loading,
    error,
    evaluating,
    evaluateError,
    deleting,
    deleteError,
    fetchHomework,
    evaluateSubmission,
    deleteAssignment,
    clearEvaluateError,
    clearDeleteError,
  }
}