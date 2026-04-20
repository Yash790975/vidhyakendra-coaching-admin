'use client'

import { useState, useCallback, useRef } from 'react'
import { examsApi } from '@/lib/api/exams'
import { studentsApi } from '@/lib/api/students'
import { percentageToGrade } from '../_utils/helpers'
import type { ExamMaster, ExamSchedule, StudentExamResult } from '@/lib/api/exams'
import type { StudentAcademicMapping } from '@/lib/api/students'
import type { EnrichedExam } from '../_utils/types'

// ─── Return type ──────────────────────────────────────────────────────────────

interface UseAcademicsReturn {
  exams: ExamMaster[]
  examSchedules: ExamSchedule[]
  examResults: StudentExamResult[]
  enrichedExams: EnrichedExam[]
  subjectsMap: Record<string, string>
  academicYear: string
  setAcademicYear: (year: string) => void
  academicYears: string[]
  /** class_id from student's active academic mapping */
  classId: string | null
  /** batch_id from student's active academic mapping (coaching portal) */
  batchId: string | null
  /** Maps each academic_year → "Class X - Batch Y" label */
  yearClassMap: Record<string, string>
  loading: boolean
  error: string | null
  fetchAcademics: (force?: boolean) => Promise<void>
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && '_id' in value)
    return (value as Record<string, unknown>)['_id'] as string
  return null
}

function extractSubjectFromSchedule(schedule: ExamSchedule): { id: string | null; name: string | null } {
  const sid = schedule.subject_id
  if (!sid) return { id: null, name: null }
  if (typeof sid === 'object' && sid !== null) {
    const obj = sid as Record<string, unknown>
    return { id: (obj['_id'] as string) ?? null, name: (obj['subject_name'] as string) ?? null }
  }
  return { id: sid as string, name: null }
}

function extractExamIdFromSchedule(schedule: ExamSchedule): string | null {
  return extractId(schedule.exam_id)
}

/**
 * Builds a label like "Class 10 - A" from a StudentAcademicMapping.
 * class_id and section_id may be populated objects or plain strings.
 */
function buildClassLabel(mapping: StudentAcademicMapping): string {
  const classId = mapping.class_id
  const batchId = mapping.batch_id

  const className =
    classId && typeof classId === 'object' && 'class_name' in classId
      ? (classId as Record<string, unknown>)['class_name'] as string
      : null

  const batchName =
    batchId && typeof batchId === 'object' && 'batch_name' in batchId
      ? (batchId as Record<string, unknown>)['batch_name'] as string
      : null

  if (className && batchName) return `Class ${className} - ${batchName}`
  if (className) return `Class ${className}`
  return ''
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAcademics(studentId: string): UseAcademicsReturn {
  const fetchedRef = useRef(false)

  const [exams,         setExams]         = useState<ExamMaster[]>([])
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([])
  const [examResults,   setExamResults]   = useState<StudentExamResult[]>([])
  const [enrichedExams, setEnrichedExams] = useState<EnrichedExam[]>([])
  const [subjectsMap,   setSubjectsMap]   = useState<Record<string, string>>({})
  const [academicYear,  setAcademicYear]  = useState('')
  const [academicYears, setAcademicYears] = useState<string[]>([])
  const [classId,       setClassId]       = useState<string | null>(null)
  const [batchId,       setBatchId]       = useState<string | null>(null)
  const [yearClassMap,  setYearClassMap]  = useState<Record<string, string>>({})
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const fetchAcademics = useCallback(async (force = false) => {
    if (!studentId || (fetchedRef.current && !force)) return

    setLoading(true)
    setError(null)

    try {
      const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''

      // ── Step 1: Parallel fetch — exams + results + academic mapping ────
      const [examsRes, resultsRes, mappingRes] = await Promise.allSettled([
        instituteId
          ? examsApi.getAll({ institute_id: instituteId })
          : Promise.resolve({ success: true as const, result: [] as ExamMaster[] }),
        examsApi.getAllResults({ student_id: studentId }),
        studentsApi.getAcademicMappingHistoryByStudent(studentId),
      ])

      if (examsRes.status === 'rejected')   console.error('[useAcademics] Exams fetch failed:', examsRes.reason)
      if (resultsRes.status === 'rejected') console.error('[useAcademics] Results fetch failed:', resultsRes.reason)
      if (mappingRes.status === 'rejected') console.error('[useAcademics] Mapping fetch failed:', mappingRes.reason)

      const fetchedExams: ExamMaster[] =
        examsRes.status === 'fulfilled' && examsRes.value.success
          ? (examsRes.value.result ?? [])
          : []

      const fetchedResults: StudentExamResult[] =
        resultsRes.status === 'fulfilled' && resultsRes.value.success
          ? (resultsRes.value.result ?? [])
          : []

      const allMappings: StudentAcademicMapping[] =
        mappingRes.status === 'fulfilled' && mappingRes.value.success
          ? (mappingRes.value.result ?? [])
          : []

      setExams(fetchedExams)
      setExamResults(fetchedResults)

      // ── Step 2: Build yearClassMap from full mapping history ───────────
      // Each mapping has an academic_year. Build label per year.
      const ycMap: Record<string, string> = {}
      for (const mapping of allMappings) {
        if (mapping.academic_year) {
          const label = buildClassLabel(mapping)
          if (label) ycMap[mapping.academic_year] = label
        }
      }
      setYearClassMap(ycMap)

      // Current (active) mapping — for classId/sectionId used in Add dialog
      const activeMapping = allMappings.find(m => m.status === 'active')
        ?? allMappings.sort((a, b) => {
          const dA = a.joined_at ? new Date(a.joined_at).getTime() : 0
          const dB = b.joined_at ? new Date(b.joined_at).getTime() : 0
          return dB - dA
        })[0]
        ?? null

          const currentClassId = activeMapping ? extractId(activeMapping.class_id) : null
      const currentBatchId = activeMapping ? extractId(activeMapping.batch_id)  : null
      setClassId(currentClassId)
      setBatchId(currentBatchId)

      // ── Step 3: Academic years from exams (all institute exams) ────────
      const years = [...new Set(fetchedExams.map(e => e.academic_year).filter(Boolean))].sort().reverse()
      setAcademicYears(years)
      if (years.length > 0) setAcademicYear(years[0])

      // ── Step 4: Early return if no results ─────────────────────────────
      if (fetchedResults.length === 0) {
        setExamSchedules([])
        setSubjectsMap({})
        setEnrichedExams([])
        fetchedRef.current = true
        setLoading(false)
        return
      }

      // ── Step 5: Collect unique schedule IDs from results ───────────────
      const scheduleIds = [
        ...new Set(
          fetchedResults
            .map(r => extractId(r.exam_schedule_id))
            .filter((id): id is string => Boolean(id))
        ),
      ]

      // ── Step 6: Fetch schedules ────────────────────────────────────────
      let fetchedSchedules: ExamSchedule[] = []
      if (scheduleIds.length > 0) {
        const scheduleResults = await Promise.allSettled(
          scheduleIds.map(id => examsApi.getScheduleById(id))
        )

        fetchedSchedules = scheduleResults
          .filter(
            (r): r is PromiseFulfilledResult<{ success: boolean; result: ExamSchedule }> =>
              r.status === 'fulfilled' && r.value?.success === true
          )
          .map(r => r.value.result)
          .filter(Boolean)

        const failCount = scheduleResults.filter(r => r.status === 'rejected' || !(r as PromiseFulfilledResult<any>).value?.success).length
        if (failCount > 0) {
          console.warn(`[useAcademics] ${failCount} of ${scheduleIds.length} schedule(s) could not be loaded.`)
        }
      }

      setExamSchedules(fetchedSchedules)

      // ── Step 7: Build subjectsMap from populated schedule objects ──────
      // API populates subject_id as { _id, subject_name } — no extra calls needed.
      const sMap: Record<string, string> = {}
      for (const schedule of fetchedSchedules) {
        const { id, name } = extractSubjectFromSchedule(schedule)
        if (id && name) sMap[id] = name
      }

      const unresolvedIds = fetchedSchedules
        .map(s => extractSubjectFromSchedule(s))
        .filter(({ id, name }) => id && !name && !sMap[id!])
        .map(({ id }) => id)

      if (unresolvedIds.length > 0) {
        console.warn('[useAcademics] Subject names not resolved (API did not populate):', unresolvedIds)
      }

      setSubjectsMap(sMap)

      // ── Step 8: Build enriched exam list ──────────────────────────────
      const enriched: EnrichedExam[] = fetchedExams
        .filter(exam => {
          const relevantScheduleIds = fetchedSchedules
            .filter(s => extractExamIdFromSchedule(s) === exam._id)
            .map(s => s._id)
            .filter(Boolean) as string[]

          return fetchedResults.some(r => {
            const sid = extractId(r.exam_schedule_id)
            return sid && relevantScheduleIds.includes(sid)
          })
        })
        .map(exam => {
          const examScheduleList = fetchedSchedules.filter(
            s => extractExamIdFromSchedule(s) === exam._id
          )
          const examResultList = fetchedResults.filter(r => {
            const sid = extractId(r.exam_schedule_id)
            return examScheduleList.some(s => s._id === sid)
          })

          const totalMarksObtained = examResultList.reduce((sum, r) => sum + (r.total_marks_obtained ?? 0), 0)
          const totalMaxMarks      = examScheduleList.reduce((sum, s) => sum + (s.total_marks ?? 0), 0)
          const percentage         = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : null

          const ranks = examResultList.map(r => r.rank).filter((r): r is number => r != null)
          const rank  = ranks.length > 0 ? Math.min(...ranks) : null

          const gradeFromResult = examResultList.find(r => r.grade)?.grade ?? null
          const grade           = gradeFromResult ?? (percentage != null ? percentageToGrade(percentage) : null)

          return {
            exam,
            schedules: examScheduleList,
            results:   examResultList,
            totalMarksObtained,
            totalMaxMarks,
            percentage,
            grade,
            rank,
          } satisfies EnrichedExam
        })
        .sort((a, b) => {
          const dA = a.exam.start_date ? new Date(a.exam.start_date).getTime() : 0
          const dB = b.exam.start_date ? new Date(b.exam.start_date).getTime() : 0
          return dA - dB
        })

      setEnrichedExams(enriched)
    } catch (err: unknown) {
      console.error('[useAcademics] Unexpected error:', err)
      setError('Unable to load academic records. Please try again.')
    } finally {
      fetchedRef.current = true
      setLoading(false)
    }
  }, [studentId])

  return {
    exams,
    examSchedules,
    examResults,
    enrichedExams,
    subjectsMap,
    academicYear,
    setAcademicYear,
    academicYears,
    classId,
    batchId,
    yearClassMap,
    loading,
    error,
    fetchAcademics,
  }
}























// 'use client'

// import { useState, useCallback, useRef } from 'react'
// import { examsApi } from '@/lib/api/exams'
// import { percentageToGrade } from '../_utils/helpers'
// import type { ExamMaster, ExamSchedule, StudentExamResult } from '@/lib/api/exams'
// import type { EnrichedExam } from '../_utils/types'

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface UseAcademicsReturn {
//   exams: ExamMaster[]
//   examSchedules: ExamSchedule[]
//   examResults: StudentExamResult[]
//   enrichedExams: EnrichedExam[]
//   subjectsMap: Record<string, string>
//   academicYear: string
//   setAcademicYear: (year: string) => void
//   academicYears: string[]
//   loading: boolean
//   error: string | null
//   fetchAcademics: (force?: boolean) => Promise<void>
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// /**
//  * Extracts a plain string ID from a value that may be a populated object or a string.
//  */
// function extractId(value: unknown): string | null {
//   if (!value) return null
//   if (typeof value === 'string') return value
//   if (typeof value === 'object' && value !== null && '_id' in value) {
//     return (value as Record<string, unknown>)['_id'] as string
//   }
//   return null
// }

// /**
//  * Extracts subject name from a schedule's subject_id field.
//  * The API populates subject_id as { _id, subject_name } in responses.
//  */
// function extractSubjectFromSchedule(
//   schedule: ExamSchedule
// ): { id: string | null; name: string | null } {
//   const sid = schedule.subject_id
//   if (!sid) return { id: null, name: null }

//   if (typeof sid === 'object' && sid !== null) {
//     const obj = sid as Record<string, unknown>
//     return {
//       id: (obj['_id'] as string) ?? null,
//       name: (obj['subject_name'] as string) ?? null,
//     }
//   }

//   return { id: sid as string, name: null }
// }

// /**
//  * Resolves exam_id from a schedule (may be populated object or plain string).
//  */
// function extractExamIdFromSchedule(schedule: ExamSchedule): string | null {
//   return extractId(schedule.exam_id)
// }

// // ─── Hook ─────────────────────────────────────────────────────────────────────

// export function useAcademics(studentId: string): UseAcademicsReturn {
//   const fetchedRef = useRef(false)

//   const [exams, setExams] = useState<ExamMaster[]>([])
//   const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([])
//   const [examResults, setExamResults] = useState<StudentExamResult[]>([])
//   const [enrichedExams, setEnrichedExams] = useState<EnrichedExam[]>([])
//   const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({})
//   const [academicYear, setAcademicYear] = useState<string>('')
//   const [academicYears, setAcademicYears] = useState<string[]>([])
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)

//   const fetchAcademics = useCallback(
//     async (force = false) => {
//       if (!studentId || (fetchedRef.current && !force)) return

//       setLoading(true)
//       setError(null)

//       try {
//         const instituteId =
//           typeof window !== 'undefined'
//             ? (localStorage.getItem('instituteId') ?? '')
//             : ''

//         // ── Step 1: Fetch exams + results in parallel ──────────────────────
//         const [examsRes, resultsRes] = await Promise.allSettled([
//           instituteId
//             ? examsApi.getAll({ institute_id: instituteId })
//             : Promise.resolve({ success: true as const, result: [] as ExamMaster[] }),
//           examsApi.getAllResults({ student_id: studentId }),
//         ])

//         if (examsRes.status === 'rejected') {
//           console.error('[useAcademics] Exams fetch failed:', examsRes.reason)
//         }
//         if (resultsRes.status === 'rejected') {
//           console.error('[useAcademics] Results fetch failed:', resultsRes.reason)
//         }

//         const fetchedExams: ExamMaster[] =
//           examsRes.status === 'fulfilled' && examsRes.value.success
//             ? (examsRes.value.result ?? [])
//             : []

//         const fetchedResults: StudentExamResult[] =
//           resultsRes.status === 'fulfilled' && resultsRes.value.success
//             ? (resultsRes.value.result ?? [])
//             : []

//         setExams(fetchedExams)
//         setExamResults(fetchedResults)

//         // ── Step 2: Derive academic years ──────────────────────────────────
//         const years = [
//           ...new Set(fetchedExams.map((e) => e.academic_year).filter(Boolean)),
//         ]
//           .sort()
//           .reverse()

//         setAcademicYears(years)
//         if (years.length > 0) setAcademicYear(years[0])

//         if (fetchedResults.length === 0) {
//           // No results — nothing more to fetch
//           setExamSchedules([])
//           setSubjectsMap({})
//           setEnrichedExams([])
//           fetchedRef.current = true
//           setLoading(false)
//           return
//         }

//         // ── Step 3: Collect unique schedule IDs from results ───────────────
//         const scheduleIds = [
//           ...new Set(
//             fetchedResults
//               .map((r) => extractId(r.exam_schedule_id))
//               .filter((id): id is string => Boolean(id))
//           ),
//         ]

//         // ── Step 4: Fetch all schedules (individual fetch per ID) ──────────
//         // NOTE: If a batch endpoint like getSchedulesByExam exists and covers
//         // all needed IDs, prefer that. Here we use getScheduleById per the
//         // available API. Failed fetches are logged but do not break the page.
//         let fetchedSchedules: ExamSchedule[] = []

//         if (scheduleIds.length > 0) {
//           const scheduleResults = await Promise.allSettled(
//             scheduleIds.map((id) => examsApi.getScheduleById(id))
//           )

//           fetchedSchedules = scheduleResults
//             .filter(
//               (r): r is PromiseFulfilledResult<{ success: boolean; result: ExamSchedule }> =>
//                 r.status === 'fulfilled' && r.value?.success === true
//             )
//             .map((r) => r.value.result)
//             .filter(Boolean)

//           const failCount = scheduleResults.filter(
//             (r) => r.status === 'rejected' || !r.value?.success
//           ).length

//           if (failCount > 0) {
//             console.warn(
//               `[useAcademics] ${failCount} of ${scheduleIds.length} schedule(s) could not be loaded.`
//             )
//           }
//         }

//         setExamSchedules(fetchedSchedules)

//         // ── Step 5: Build subject name map ─────────────────────────────────
//         // Priority: use already-populated subject_id objects from schedules.
//         // Avoids unnecessary extra API calls when the API already returns names.
//         const sMap: Record<string, string> = {}

//         for (const schedule of fetchedSchedules) {
//           const { id, name } = extractSubjectFromSchedule(schedule)
//           if (id && name) {
//             sMap[id] = name
//           }
//         }

//         // If any subject IDs still have no name, do NOT call subjectsByClassApi
//         // because the subject_id on ExamSchedule refers to subjects_master, not
//         // subjects_by_class. The populated API response already includes the name.
//         // Log unresolved IDs for debugging only.
//         const unresolvedIds = fetchedSchedules
//           .map((s) => extractSubjectFromSchedule(s))
//           .filter(({ id, name }) => id && !name && !sMap[id!])
//           .map(({ id }) => id)

//         if (unresolvedIds.length > 0) {
//           console.warn(
//             '[useAcademics] Subject names not resolved for IDs (API did not populate):',
//             unresolvedIds
//           )
//         }

//         setSubjectsMap(sMap)

//         // ── Step 6: Build EnrichedExam list ───────────────────────────────
//         // Only include exams that have at least one result for this student.
//         const enriched: EnrichedExam[] = fetchedExams
//           .filter((exam) => {
//             // Find schedules belonging to this exam
//             const relevantScheduleIds = fetchedSchedules
//               .filter((s) => extractExamIdFromSchedule(s) === exam._id)
//               .map((s) => s._id)
//               .filter(Boolean) as string[]

//             // Check if student has any result for these schedules
//             return fetchedResults.some((r) => {
//               const schedId = extractId(r.exam_schedule_id)
//               return schedId && relevantScheduleIds.includes(schedId)
//             })
//           })
//           .map((exam) => {
//             const examScheduleList = fetchedSchedules.filter(
//               (s) => extractExamIdFromSchedule(s) === exam._id
//             )

//             const examResultList = fetchedResults.filter((r) => {
//               const schedId = extractId(r.exam_schedule_id)
//               return examScheduleList.some((s) => s._id === schedId)
//             })

//             const totalMarksObtained = examResultList.reduce(
//               (sum, r) => sum + (r.total_marks_obtained ?? 0),
//               0
//             )
//             const totalMaxMarks = examScheduleList.reduce(
//               (sum, s) => sum + (s.total_marks ?? 0),
//               0
//             )

//             const percentage =
//               totalMaxMarks > 0
//                 ? Math.round((totalMarksObtained / totalMaxMarks) * 100)
//                 : null

//             const ranks = examResultList
//               .map((r) => r.rank)
//               .filter((r): r is number => r != null)
//             const rank = ranks.length > 0 ? Math.min(...ranks) : null

//             // Grade: prefer what API returned, else compute from percentage
//             const gradeFromResult = examResultList.find((r) => r.grade)?.grade ?? null
//             const grade =
//               gradeFromResult ?? (percentage != null ? percentageToGrade(percentage) : null)

//             return {
//               exam,
//               schedules: examScheduleList,
//               results: examResultList,
//               totalMarksObtained,
//               totalMaxMarks,
//               percentage,
//               grade,
//               rank,
//             } satisfies EnrichedExam
//           })
//           .sort((a, b) => {
//             const dA = a.exam.start_date ? new Date(a.exam.start_date).getTime() : 0
//             const dB = b.exam.start_date ? new Date(b.exam.start_date).getTime() : 0
//             return dA - dB
//           })

//         setEnrichedExams(enriched)
//       } catch (err: unknown) {
//         const message =
//           err instanceof Error ? err.message : 'Failed to load academic data.'
//         console.error('[useAcademics] Unexpected error:', err)
//         // User-friendly message — no technical details exposed in UI
//         setError('Unable to load academic records. Please try again.')
//         void message // used in console above
//       } finally {
//         fetchedRef.current = true
//         setLoading(false)
//       }
//     },
//     [studentId]
//   )

//   return {
//     exams,
//     examSchedules,
//     examResults,
//     enrichedExams,
//     subjectsMap,
//     academicYear,
//     setAcademicYear,
//     academicYears,
//     loading,
//     error,
//     fetchAcademics,
//   }
// }






















// 'use client'

// import { useState, useCallback, useRef } from 'react'
// import { examsApi, ExamMaster, StudentExamResult, ExamSchedule } from '@/lib/api/exams'
// import { subjectsByClassApi, SubjectRef } from '@/lib/api/subjects'
// import { percentageToGrade } from '../_utils/helpers'
// import type { EnrichedExam } from '../_utils/types'

// export function useAcademics(studentId: string) {
//   const fetchedRef = useRef(false)

//   const [exams,         setExams]         = useState<ExamMaster[]>([])
//   const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([])
//   const [examResults,   setExamResults]   = useState<StudentExamResult[]>([])
//   const [enrichedExams, setEnrichedExams] = useState<EnrichedExam[]>([])
//   const [subjectsMap,   setSubjectsMap]   = useState<Record<string, string>>({})
//   const [academicYear,  setAcademicYear]  = useState<string>('')
//   const [academicYears, setAcademicYears] = useState<string[]>([])
//   const [loading,       setLoading]       = useState(false)
//   const [error,         setError]         = useState<string | null>(null)

//   const fetchAcademics = useCallback(async (force = false) => {
//     if (!studentId || (fetchedRef.current && !force)) return

//     setLoading(true)
//     setError(null)

//     try {
//       // const instituteId   = typeof window !== 'undefined' ? (localStorage.getItem('instituteId')   ?? '') : ''
//       // const instituteType = typeof window !== 'undefined' ? (localStorage.getItem('instituteType') ?? '') : ''

//       // student_type must match institute_type ('school' | 'coaching')
//       // instituteType from localStorage is used to filter relevant students/exams
//       // const studentType: 'school' | 'coaching' | undefined =
//       //   instituteType === 'school' || instituteType === 'coaching'
//       //     ? instituteType
//       //     : undefined

//       // const [examsRes, resultsRes] = await Promise.allSettled([

//       const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//       // examsApi.getAll already filters by institute_id — student_type not required here
//       // student_type filtering is handled at the student fetch level (getAll with student_type param)

//       const [examsRes, resultsRes] = await Promise.allSettled([
//         instituteId
//           ? examsApi.getAll({ institute_id: instituteId })
//           : Promise.resolve({ success: true, result: [] as ExamMaster[] }),
//         examsApi.getAllResults({ student_id: studentId }),
//       ])

//       if (examsRes.status === 'rejected') {
//         console.error('[useAcademics] Failed to fetch exams:', examsRes.reason)
//       }
//       if (resultsRes.status === 'rejected') {
//         console.error('[useAcademics] Failed to fetch exam results:', resultsRes.reason)
//       }

//       const fetchedExams: ExamMaster[] =
//         examsRes.status === 'fulfilled' && examsRes.value.success
//           ? (examsRes.value.result ?? [])
//           : []

//       const fetchedResults: StudentExamResult[] =
//         resultsRes.status === 'fulfilled' && resultsRes.value.success
//           ? (resultsRes.value.result ?? [])
//           : []

//       setExams(fetchedExams)
//       setExamResults(fetchedResults)

//       const years = [...new Set(fetchedExams.map(e => e.academic_year))].sort().reverse()
//       setAcademicYears(years)
//       if (years.length > 0) setAcademicYear(years[0])

//       // Collect unique schedule IDs from results
//       const scheduleIds = [...new Set(
//         fetchedResults
//           .map(r => {
//             const sid = r.exam_schedule_id
//             if (!sid) return null
//             return typeof sid === 'object' && sid !== null ? (sid as any)._id : sid
//           })
//           .filter(Boolean) as string[]
//       )]

//       let fetchedSchedules: ExamSchedule[] = []
//       if (scheduleIds.length > 0) {
//         const res = await Promise.allSettled(scheduleIds.map(id => examsApi.getScheduleById(id)))
//         fetchedSchedules = res
//           .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
//           .map(r => r.value.result as ExamSchedule)

//         const failedCount = res.filter(r => r.status === 'rejected').length
//         if (failedCount > 0) {
//           console.error(`[useAcademics] ${failedCount} schedule(s) failed to load`)
//         }
//       }

//       // Filter schedules by student_type if instituteType is known
//       // ExamSchedule does not have student_type directly — filter via ExamMaster
//       // Only keep schedules whose exam belongs to the correct institute
//       // (institute_id filter on examsApi.getAll already handles this)
//       // student_type filter applies to the student record itself (done at student level)
//       // Here we ensure enriched exams only include data relevant to the institute type

//       setExamSchedules(fetchedSchedules)

//       // Build subject name map
//       const subjectIds = [...new Set(
//         fetchedSchedules
//           .map(s =>
//             typeof s.subject_id === 'object' && s.subject_id !== null
//               ? (s.subject_id as any)._id as string
//               : s.subject_id as string
//           )
//           .filter(Boolean)
//       )]

//       const sMap: Record<string, string> = {}
//       if (subjectIds.length > 0) {
//         await Promise.allSettled(subjectIds.map(async (sid) => {
//           try {
//             const res = await subjectsByClassApi.getById(sid)
//             if (res.success && res.result) {
//               const subj      = res.result
//               const subjRefId = typeof subj.subject_id === 'object' && subj.subject_id !== null
//                 ? (subj.subject_id as SubjectRef)._id
//                 : subj.subject_id as string
//               const subjName  = typeof subj.subject_id === 'object' && subj.subject_id !== null
//                 ? (subj.subject_id as SubjectRef).subject_name
//                 : null
//               if (subjName) {
//                 if (sid) sMap[sid] = subjName
//                 if (subjRefId && subjRefId !== sid) sMap[subjRefId] = subjName
//               }
//             }
//           } catch (e) {
//             console.error('[useAcademics] Subject fetch error for id', sid, ':', e)
//           }
//         }))
//       }
//       setSubjectsMap(sMap)

//       // Build enriched exams — filter to exams that have at least one result for this student
//       const enriched: EnrichedExam[] = fetchedExams
//         .filter(exam => {
//           const examScheduleIds = fetchedSchedules
//             .filter(s => {
//               const sid = typeof s.exam_id === 'object' && s.exam_id !== null
//                 ? (s.exam_id as any)._id
//                 : s.exam_id
//               return sid === exam._id
//             })
//             .map(s => s._id!)
//           return fetchedResults.some(r => examScheduleIds.includes(r.exam_schedule_id))
//         })
//         .map(exam => {
//           const examSched = fetchedSchedules.filter(s => {
//             const sid = typeof s.exam_id === 'object' && s.exam_id !== null
//               ? (s.exam_id as any)._id
//               : s.exam_id
//             return sid === exam._id
//           })

//           const examResultsList = fetchedResults.filter(r =>
//             examSched.some(s => s._id === r.exam_schedule_id)
//           )

//           const totalObtained = examResultsList.reduce((sum, r) => sum + (r.total_marks_obtained ?? 0), 0)
//           const totalMax      = examSched.reduce((sum, s) => sum + (s.total_marks ?? 0), 0)
//           const pct           = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null
//           const ranks         = examResultsList.map(r => r.rank).filter((r): r is number => r != null)
//           const rank          = ranks.length > 0 ? Math.min(...ranks) : null
//           const gradeFromResult = examResultsList.find(r => r.grade)?.grade ?? null
//           const grade         = gradeFromResult ?? (pct != null ? percentageToGrade(pct) : null)

//           return {
//             exam,
//             schedules: examSched,
//             results: examResultsList,
//             totalMarksObtained: totalObtained,
//             totalMaxMarks: totalMax,
//             percentage: pct,
//             grade,
//             rank,
//           }
//         })
//         .sort((a, b) => {
//           const dA = a.exam.start_date ? new Date(a.exam.start_date).getTime() : 0
//           const dB = b.exam.start_date ? new Date(b.exam.start_date).getTime() : 0
//           return dA - dB
//         })

//       setEnrichedExams(enriched)
//     } catch (err: any) {
//       const message = err?.message ?? 'Failed to load academic data. Please try again.'
//       console.error('[useAcademics] Unexpected error:', err)
//       setError(message)
//     } finally {
//       fetchedRef.current = true
//       setLoading(false)
//     }
//   }, [studentId])

//   return {
//     exams,
//     examSchedules,
//     examResults,
//     enrichedExams,
//     subjectsMap,
//     academicYear,
//     setAcademicYear,
//     academicYears,
//     loading,
//     error,
//     fetchAcademics,
//   }
// }
















// 'use client'

// import { useState, useCallback, useRef } from 'react'
// import { examsApi, ExamMaster, StudentExamResult, ExamSchedule } from '@/lib/api/exams'
// import { subjectsByClassApi, SubjectRef } from '@/lib/api/subjects'
// import { percentageToGrade } from '../_utils/helpers'
// import type { EnrichedExam } from '../_utils/types'

// export function useAcademics(studentId: string) {
//   const fetchedRef = useRef(false)

//   const [exams,         setExams]         = useState<ExamMaster[]>([])
//   const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([])
//   const [examResults,   setExamResults]   = useState<StudentExamResult[]>([])
//   const [enrichedExams, setEnrichedExams] = useState<EnrichedExam[]>([])
//   const [subjectsMap,   setSubjectsMap]   = useState<Record<string, string>>({})
//   const [academicYear,  setAcademicYear]  = useState<string>('')
//   const [academicYears, setAcademicYears] = useState<string[]>([])
//   const [loading,       setLoading]       = useState(false)

//   const fetchAcademics = useCallback(async (force = false) => {
//     if (!studentId || (fetchedRef.current && !force)) return
//     setLoading(true)
//     try {
//       const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''

//       const [examsRes, resultsRes] = await Promise.allSettled([
//         instituteId
//           ? examsApi.getAll({ institute_id: instituteId })
//           : Promise.resolve({ success: true, result: [] as ExamMaster[] }),
//         examsApi.getAllResults({ student_id: studentId }),
//       ])

//       const fetchedExams: ExamMaster[] =
//         examsRes.status === 'fulfilled' && examsRes.value.success ? (examsRes.value.result ?? []) : []
//       const fetchedResults: StudentExamResult[] =
//         resultsRes.status === 'fulfilled' && resultsRes.value.success ? (resultsRes.value.result ?? []) : []

//       setExams(fetchedExams)
//       setExamResults(fetchedResults)

//       const years = [...new Set(fetchedExams.map(e => e.academic_year))].sort().reverse()
//       setAcademicYears(years)
//       if (years.length > 0) setAcademicYear(years[0])

//       const scheduleIds = [...new Set(
//         fetchedResults
//           .map(r => { const sid = r.exam_schedule_id; if (!sid) return null; return typeof sid === 'object' && sid !== null ? (sid as any)._id : sid })
//           .filter(Boolean) as string[]
//       )]

//       let fetchedSchedules: ExamSchedule[] = []
//       if (scheduleIds.length > 0) {
//         const res = await Promise.allSettled(scheduleIds.map(id => examsApi.getScheduleById(id)))
//         fetchedSchedules = res
//           .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.success)
//           .map(r => r.value.result as ExamSchedule)
//       }
//       setExamSchedules(fetchedSchedules)

//       const subjectIds = [...new Set(
//         fetchedSchedules
//           .map(s => typeof s.subject_id === 'object' && s.subject_id !== null ? (s.subject_id as any)._id as string : s.subject_id as string)
//           .filter(Boolean)
//       )]
//       const sMap: Record<string, string> = {}
//       if (subjectIds.length > 0) {
//         await Promise.allSettled(subjectIds.map(async (sid) => {
//           try {
//             const res = await subjectsByClassApi.getById(sid)
//             if (res.success && res.result) {
//               const subj = res.result
//               const subjRefId = typeof subj.subject_id === 'object' && subj.subject_id !== null ? (subj.subject_id as SubjectRef)._id : subj.subject_id as string
//               const subjName  = typeof subj.subject_id === 'object' && subj.subject_id !== null ? (subj.subject_id as SubjectRef).subject_name : null
//               if (subjName) {
//                 if (sid) sMap[sid] = subjName
//                 if (subjRefId && subjRefId !== sid) sMap[subjRefId] = subjName
//               }
//             }
//           } catch (e) { console.error('[fetchAcademics] subject fetch error:', e) }
//         }))
//       }
//       setSubjectsMap(sMap)

//       const enriched: EnrichedExam[] = fetchedExams
//         .filter(exam => {
//           const examScheduleIds = fetchedSchedules
//             .filter(s => { const sid = typeof s.exam_id === 'object' && s.exam_id !== null ? (s.exam_id as any)._id : s.exam_id; return sid === exam._id })
//             .map(s => s._id!)
//           return fetchedResults.some(r => examScheduleIds.includes(r.exam_schedule_id))
//         })
//         .map(exam => {
//           const examSched = fetchedSchedules.filter(s => {
//             const sid = typeof s.exam_id === 'object' && s.exam_id !== null ? (s.exam_id as any)._id : s.exam_id
//             return sid === exam._id
//           })
//           const examResultsList = fetchedResults.filter(r => examSched.some(s => s._id === r.exam_schedule_id))
//           const totalObtained = examResultsList.reduce((sum, r) => sum + (r.total_marks_obtained ?? 0), 0)
//           const totalMax      = examSched.reduce((sum, s) => sum + (s.total_marks ?? 0), 0)
//           const pct           = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null
//           const ranks         = examResultsList.map(r => r.rank).filter((r): r is number => r != null)
//           const rank          = ranks.length > 0 ? Math.min(...ranks) : null
//           const gradeFromResult = examResultsList.find(r => r.grade)?.grade ?? null
//           const grade         = gradeFromResult ?? (pct != null ? percentageToGrade(pct) : null)
//           return { exam, schedules: examSched, results: examResultsList, totalMarksObtained: totalObtained, totalMaxMarks: totalMax, percentage: pct, grade, rank }
//         })
//         .sort((a, b) => {
//           const dA = a.exam.start_date ? new Date(a.exam.start_date).getTime() : 0
//           const dB = b.exam.start_date ? new Date(b.exam.start_date).getTime() : 0
//           return dA - dB
//         })

//       setEnrichedExams(enriched)
//     } catch (err) {
//       console.error('[StudentDetail] fetchAcademics error:', err)
//     } finally {
//       fetchedRef.current = true
//       setLoading(false)
//     }
//   }, [studentId])

//   return { exams, examSchedules, examResults, enrichedExams, subjectsMap, academicYear, setAcademicYear, academicYears, loading, fetchAcademics }
// }