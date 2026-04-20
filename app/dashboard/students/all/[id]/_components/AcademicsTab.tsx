'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GraduationCap,
  TrendingUp,
  CalendarDays,
  FileText,
  Download,
  Printer,
  Loader2,
  BookOpen,
  Award,
  BarChart3,
  Target,
  Activity,
  AlertCircle,
  RefreshCcw,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react'
import { EXAM_TYPE_LABELS, examsApi } from '@/lib/api/exams'
import { subjectsByClassApi } from '@/lib/api/subjects'
import type { ExamMaster, ExamSchedule, StudentExamResult } from '@/lib/api/exams'
import type { SubjectByClass, SubjectRef } from '@/lib/api/subjects'
import type { EnrichedExam } from '../_utils/types'
import { Pagination } from '@/components/pagination'
import { capitalize, formatDate, percentageToGrade, percentageToGpa } from '../_utils/helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AcademicsTabProps {
  enrichedExams: EnrichedExam[]
  exams: ExamMaster[]
  academicYear: string
  setAcademicYear: (year: string) => void
  academicYears: string[]
  loading: boolean
  error?: string | null
  classLabel: string
  /** class_id from student's current academic mapping */
  classId: string | null
  /** batch_id from student's current academic mapping (coaching portal) */
  batchId: string | null
  studentId: string
  subjectsMap: Record<string, string>
  handlePrint: () => void
  handleDownload: () => void
  onRetry?: () => void
  /** Called after add/edit/delete so parent can refresh data */
  onDataChanged: () => void
  /** Per-year class label map: academicYear → "Class X - Section Y" */
  yearClassMap?: Record<string, string>
}

// ─── Subject row used inside dialogs ─────────────────────────────────────────

interface SubjectRow {
  subjectByClassId: string   // SubjectByClass._id  — used to find subject_id
  subjectMasterId: string    // subjects_master _id — sent as subject_id to ExamSchedule
  subjectName: string
  theoryMarks: string
  practicalMarks: string
  totalMarks: string         // max marks for this subject
  passMarks: string
  theoryMaxMarks: string
  practicalMaxMarks: string
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const CARD_COLORS = [
  { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-500',   text: 'text-blue-600' },
  { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-500', text: 'text-purple-600' },
  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'bg-green-500',  text: 'text-green-600' },
  { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-500', text: 'text-orange-600' },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && '_id' in (value as object))
    return (value as Record<string, unknown>)['_id'] as string
  return null
}

function resolveSubjectName(
  schedule: ExamSchedule,
  subjectsMap: Record<string, string>,
  fallbackIndex: number
): string {
  const sid = schedule.subject_id
  if (sid && typeof sid === 'object' && 'subject_name' in sid) {
    const name = (sid as Record<string, unknown>)['subject_name'] as string | undefined
    if (name) return name
  }
  const idStr =
    sid && typeof sid === 'object' && '_id' in sid
      ? ((sid as Record<string, unknown>)['_id'] as string)
      : (sid as string | undefined)
  if (idStr && subjectsMap[idStr]) return subjectsMap[idStr]
  return `Subject ${fallbackIndex + 1}`
}

function getSubjectMasterId(sub: SubjectByClass): string {
  if (typeof sub.subject_id === 'object' && sub.subject_id !== null) {
    return (sub.subject_id as SubjectRef)._id
  }
  return sub.subject_id as string
}

function getSubjectMasterName(sub: SubjectByClass): string {
  if (typeof sub.subject_id === 'object' && sub.subject_id !== null) {
    return (sub.subject_id as SubjectRef).subject_name
  }
  return 'Unknown Subject'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

function StatCard({ label, value, textColor }: { label: string; value: string | number; textColor: string }) {
  return (
    <div className="bg-white p-4 rounded-lg border text-center">
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

// ─── Add Exam Dialog ──────────────────────────────────────────────────────────

interface AddExamDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  studentId: string
  classId: string | null
  batchId: string | null
  onSuccess: () => void
}

function AddExamDialog({ open, onOpenChange, studentId, classId, batchId, onSuccess }: AddExamDialogProps) {
  const [allExams, setAllExams]           = useState<ExamMaster[]>([])
  const [subjects, setSubjects]           = useState<SubjectByClass[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [examDate, setExamDate]           = useState('')
  const [subjectRows, setSubjectRows]     = useState<SubjectRow[]>([])
  const [loadingExams, setLoadingExams]   = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [formError, setFormError]         = useState<string | null>(null)

  // Fetch available exams (institute-wide) when dialog opens
  useEffect(() => {
    if (!open) return
    setSelectedExamId('')
    setSubjectRows([])
    setFormError(null)
    setExamDate('')

    const instituteId = typeof window !== 'undefined' ? localStorage.getItem('instituteId') ?? '' : ''
    if (!instituteId) return

    setLoadingExams(true)
    examsApi.getAll({ institute_id: instituteId })
      .then(res => {
        if (res.success) setAllExams(res.result ?? [])
        else console.error('[AddExamDialog] Failed to load exams:', res)
      })
      .catch(err => console.error('[AddExamDialog] Exams fetch error:', err))
      .finally(() => setLoadingExams(false))
  }, [open])

  // Fetch subjects for this class when dialog opens
  useEffect(() => {
    if (!open || !classId) return
    setLoadingSubjects(true)
    subjectsByClassApi.getByClass(classId)
      .then(res => {
        if (res.success) {
          const active = (res.result ?? []).filter(s => s.status === 'active')
          setSubjects(active)
        } else {
          console.error('[AddExamDialog] Failed to load subjects:', res)
        }
      })
      .catch(err => console.error('[AddExamDialog] Subjects fetch error:', err))
      .finally(() => setLoadingSubjects(false))
  }, [open, classId])

  // Build subject rows when subjects load
  useEffect(() => {
    if (subjects.length === 0) return
    setSubjectRows(subjects.map(sub => ({
      subjectByClassId:  sub._id,
      subjectMasterId:   getSubjectMasterId(sub),
      subjectName:       getSubjectMasterName(sub),
      theoryMarks:       '',
      practicalMarks:    '',
      totalMarks:        sub.subject_type === 'both' ? '' : sub.subject_type === 'theory' ? '100' : '50',
      passMarks:         '',
      theoryMaxMarks:    sub.subject_type === 'theory' || sub.subject_type === 'both' ? '70' : '0',
      practicalMaxMarks: sub.subject_type === 'practical' || sub.subject_type === 'both' ? '30' : '0',
    })))
  }, [subjects])

  function updateRow(idx: number, field: keyof SubjectRow, value: string) {
    setSubjectRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function handleSubmit() {
    setFormError(null)
    if (!selectedExamId)     { setFormError('Please select an exam.'); return }
    if (!classId)            { setFormError('Student class information is missing.'); return }
    if (subjectRows.length === 0) { setFormError('No subjects found for this class.'); return }

    const userId   = typeof window !== 'undefined' ? localStorage.getItem('adminId') ?? '' : ''
    const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') ?? '' : ''

    setSubmitting(true)
    try {
      // Step 1: Create ExamSchedule per subject + StudentExamResult per subject
      const results = await Promise.allSettled(
        subjectRows.map(async row => {
          const totalMarksNum   = Number(row.totalMarks)   || 100
          const passMarksNum    = Number(row.passMarks)    || Math.round(totalMarksNum * 0.4)
          const theoryMax       = Number(row.theoryMaxMarks)    || 0
          const practicalMax    = Number(row.practicalMaxMarks) || 0
          const theoryObtained  = row.theoryMarks    !== '' ? Number(row.theoryMarks)    : null
          const practicalObtained = row.practicalMarks !== '' ? Number(row.practicalMarks) : null

          // Create schedule
          const schedRes = await examsApi.createSchedule({
            exam_id:         selectedExamId,
            class_id:        classId!,
            section_id:      null,
            batch_id:        batchId ?? null,
            subject_id:      row.subjectMasterId,
            exam_date:       examDate || new Date().toISOString(),
            total_marks:     totalMarksNum,
            pass_marks:      passMarksNum,
            theory_marks:    theoryMax > 0 ? theoryMax : null,
            practical_marks: practicalMax > 0 ? practicalMax : null,
          })
          if (!schedRes.success || !schedRes.result?._id) {
            throw new Error(`Failed to create schedule for ${row.subjectName}`)
          }

          const scheduleId   = schedRes.result._id
          const totalObtained =
            theoryObtained != null || practicalObtained != null
              ? (theoryObtained ?? 0) + (practicalObtained ?? 0)
              : null
          const percentage   = totalObtained != null && totalMarksNum > 0
            ? Math.round((totalObtained / totalMarksNum) * 100)
            : null
          const grade        = percentage != null ? percentageToGrade(percentage) : null
          const isPassed     = totalObtained != null ? totalObtained >= passMarksNum : null

          // Create result
          await examsApi.createResult({
            exam_schedule_id:        scheduleId,
            student_id:              studentId,
            theory_marks_obtained:   theoryObtained,
            practical_marks_obtained: practicalObtained,
            total_marks_obtained:    totalObtained,
            total_marks:             totalMarksNum,
            percentage,
            grade,
            is_pass:                 isPassed,
            evaluated_by:            userId || null,
            evaluated_by_role:       userRole === 'teacher' ? 'teacher' : 'institute_admin',
          })
        })
      )

      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length > 0) {
        console.error('[AddExamDialog] Some subjects failed:', failed)
        setFormError(`${failed.length} subject(s) could not be saved. Please try again.`)
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error('[AddExamDialog] Submit error:', err)
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl mx-3 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Add New Examination</DialogTitle>
          <DialogDescription>
            Enter examination details and subject-wise marks for the student.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add-exam-select">Examination</Label>
              {loadingExams ? (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading exams…
                </div>
              ) : (
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="mt-2" id="add-exam-select">
                    <SelectValue placeholder="Select examination" />
                  </SelectTrigger>
                  <SelectContent>
                    {allExams.length === 0 ? (
                      <SelectItem value="__none" disabled>No exams available</SelectItem>
                    ) : (
                      allExams.map(e => (
                        <SelectItem key={e._id} value={e._id}>
                          {e.exam_name} ({e.academic_year})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="add-exam-date">Exam Date</Label>
              <Input
                id="add-exam-date"
                type="date"
                className="mt-2"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Subject-wise Marks</h4>

            {loadingSubjects ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
              </div>
            ) : subjectRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {classId ? 'No active subjects found for this class.' : 'Class information not available.'}
              </p>
            ) : (
              <div className="space-y-3">
                {/* Header row */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                  <span className="col-span-3">Subject</span>
                  <span className="col-span-2 text-center">Theory Marks</span>
                  <span className="col-span-2 text-center">Practical Marks</span>
                  <span className="col-span-2 text-center">Max Marks</span>
                  <span className="col-span-3 text-center">Pass Marks</span>
                </div>

                {subjectRows.map((row, idx) => (
                  <div key={row.subjectByClassId} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                    <Label className="col-span-2 sm:col-span-3 text-sm font-medium truncate" title={row.subjectName}>
                      {row.subjectName}
                    </Label>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground sm:hidden">Theory</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Theory"
                        value={row.theoryMarks}
                        onChange={e => updateRow(idx, 'theoryMarks', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground sm:hidden">Practical</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Practical"
                        value={row.practicalMarks}
                        onChange={e => updateRow(idx, 'practicalMarks', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground sm:hidden">Max</span>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Max"
                        value={row.totalMarks}
                        onChange={e => updateRow(idx, 'totalMarks', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <span className="text-xs text-muted-foreground sm:hidden">Pass</span>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Pass marks"
                        value={row.passMarks}
                        onChange={e => updateRow(idx, 'passMarks', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loadingSubjects || loadingExams}
            className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Add Examination'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Exam Dialog ─────────────────────────────────────────────────────────

interface EditExamDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  enriched: EnrichedExam | null
  subjectsMap: Record<string, string>
  studentId: string
  onSuccess: () => void
}

interface EditRow {
  resultId: string
  scheduleId: string
  subjectName: string
  theoryMarks: string
  practicalMarks: string
  totalMaxMarks: number
  passMarks: number
  grade: string
  remarks: string
}

function EditExamDialog({ open, onOpenChange, enriched, subjectsMap, studentId, onSuccess }: EditExamDialogProps) {
  const [rows, setRows]           = useState<EditRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  useEffect(() => {
    if (!open || !enriched) return
    setFormError(null)

    const built: EditRow[] = enriched.results.map((result, rIdx) => {
      const schedId =
        result.exam_schedule_id && typeof result.exam_schedule_id === 'object' && '_id' in result.exam_schedule_id
          ? (result.exam_schedule_id as Record<string, unknown>)['_id'] as string
          : result.exam_schedule_id as string

      const sched = enriched.schedules.find(s => s._id === schedId)
      const subjectName = sched ? resolveSubjectName(sched, subjectsMap, rIdx) : `Subject ${rIdx + 1}`

      return {
        resultId:       result._id ?? '',
        scheduleId:     schedId,
        subjectName,
        theoryMarks:    result.theory_marks_obtained != null ? String(result.theory_marks_obtained) : '',
        practicalMarks: result.practical_marks_obtained != null ? String(result.practical_marks_obtained) : '',
        totalMaxMarks:  sched?.total_marks ?? 100,
        passMarks:      sched?.pass_marks ?? 40,
        grade:          result.grade ?? '',
        remarks:        result.remarks ?? '',
      }
    })
    setRows(built)
  }, [open, enriched, subjectsMap])

  function updateRow(idx: number, field: keyof EditRow, value: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function handleSubmit() {
    setFormError(null)
    if (!enriched) return

    const userId   = typeof window !== 'undefined' ? localStorage.getItem('adminId') ?? '' : ''
    const userRole = typeof window !== 'undefined' ? localStorage.getItem('role') ?? '' : ''

    setSubmitting(true)
    try {
      const results = await Promise.allSettled(
        rows.map(async row => {
          if (!row.resultId) return

          const theory      = row.theoryMarks    !== '' ? Number(row.theoryMarks)    : null
          const practical   = row.practicalMarks !== '' ? Number(row.practicalMarks) : null
          const totalObtained =
            theory != null || practical != null
              ? (theory ?? 0) + (practical ?? 0)
              : null
          const percentage  = totalObtained != null && row.totalMaxMarks > 0
            ? Math.round((totalObtained / row.totalMaxMarks) * 100)
            : null
          const grade       = row.grade || (percentage != null ? percentageToGrade(percentage) : null)
          const isPassed    = totalObtained != null ? totalObtained >= row.passMarks : null

          await examsApi.updateResult(row.resultId, {
            theory_marks_obtained:    theory,
            practical_marks_obtained: practical,
            total_marks_obtained:     totalObtained,
            percentage,
            grade,
            is_pass:                  isPassed,
            remarks:                  row.remarks || null,
            evaluated_by:             userId || null,
            evaluated_by_role:        userRole === 'teacher' ? 'teacher' : 'institute_admin',
          })
        })
      )

      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length > 0) {
        console.error('[EditExamDialog] Some updates failed:', failed)
        setFormError(`${failed.length} subject(s) could not be updated.`)
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error('[EditExamDialog] Submit error:', err)
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-2xl mx-3 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Examination</DialogTitle>
          <DialogDescription>
            Update subject-wise marks for {enriched?.exam.exam_name ?? 'this exam'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Exam info (read-only) */}
          {enriched && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-lg text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Exam</p>
                <p className="font-medium">{enriched.exam.exam_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium">{EXAM_TYPE_LABELS[enriched.exam.exam_type]}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Academic Year</p>
                <p className="font-medium">{enriched.exam.academic_year}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{capitalize(enriched.exam.status)}</p>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Subject-wise Marks</h4>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects found for this exam.</p>
            ) : (
              <div className="space-y-3">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                  <span className="col-span-3">Subject</span>
                  <span className="col-span-2 text-center">Theory</span>
                  <span className="col-span-2 text-center">Practical</span>
                  <span className="col-span-2 text-center">Max</span>
                  <span className="col-span-3 text-center">Remarks</span>
                </div>

                {rows.map((row, idx) => (
                  <div key={row.resultId || idx} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">
                    <Label className="col-span-2 sm:col-span-3 text-sm font-medium truncate" title={row.subjectName}>
                      {row.subjectName}
                      <span className="block text-xs text-muted-foreground font-normal">Max: {row.totalMaxMarks}</span>
                    </Label>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground sm:hidden">Theory</span>
                      <Input
                        type="number"
                        min={0}
                        max={row.totalMaxMarks}
                        placeholder="Theory"
                        value={row.theoryMarks}
                        onChange={e => updateRow(idx, 'theoryMarks', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground sm:hidden">Practical</span>
                      <Input
                        type="number"
                        min={0}
                        max={row.totalMaxMarks}
                        placeholder="Practical"
                        value={row.practicalMarks}
                        onChange={e => updateRow(idx, 'practicalMarks', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground sm:hidden">Max</span>
                      <Input
                        type="number"
                        disabled
                        value={row.totalMaxMarks}
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <span className="text-xs text-muted-foreground sm:hidden">Remarks</span>
                      <Input
                        placeholder="Remarks (optional)"
                        value={row.remarks}
                        onChange={e => updateRow(idx, 'remarks', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || rows.length === 0}
            className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteExamDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  enriched: EnrichedExam | null
  onSuccess: () => void
}

function DeleteExamDialog({ open, onOpenChange, enriched, onSuccess }: DeleteExamDialogProps) {
  const [deleting, setDeleting]   = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!enriched) return
    setDeleteError(null)
    setDeleting(true)

    try {
      // Delete all results first, then schedules
      const resultDeletes = await Promise.allSettled(
        enriched.results
          .filter(r => r._id)
          .map(r => examsApi.deleteResult(r._id!))
      )
      const scheduleDeletes = await Promise.allSettled(
        enriched.schedules
          .filter(s => s._id)
          .map(s => examsApi.deleteSchedule(s._id!))
      )

      const failedResults   = resultDeletes.filter(r => r.status === 'rejected')
      const failedSchedules = scheduleDeletes.filter(r => r.status === 'rejected')

      if (failedResults.length > 0 || failedSchedules.length > 0) {
        console.error('[DeleteExamDialog] Some deletes failed:', { failedResults, failedSchedules })
        setDeleteError('Some records could not be deleted. Please try again.')
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error('[DeleteExamDialog] Delete error:', err)
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-3 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Delete Examination</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{enriched?.exam.exam_name}</span>?
            This will remove all results and schedules for this exam. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {deleteError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{deleteError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting…</> : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main AcademicsTab ────────────────────────────────────────────────────────

export function AcademicsTab({
  enrichedExams,
  exams,
  academicYear,
  setAcademicYear,
  academicYears,
  loading,
  error,
  classLabel,
  classId,
  batchId,
  studentId,
  subjectsMap,
  handlePrint,
  handleDownload,
  onRetry,
  onDataChanged,
  yearClassMap = {},
}: AcademicsTabProps) {

  const [showAdd, setShowAdd]       = useState(false)
  const [showEdit, setShowEdit]     = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedEnriched, setSelectedEnriched] = useState<EnrichedExam | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 5

  // ── Derived values ──────────────────────────────────────────────────────
  const filteredEnrichedExams = academicYear
    ? enrichedExams.filter(e => e.exam.academic_year === academicYear)
    : enrichedExams

  const validPercentages = filteredEnrichedExams
    .map(e => e.percentage)
    .filter((p): p is number => p != null)

  const overallPercentage =
    validPercentages.length > 0
      ? Math.round(validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length)
      : null

  const overallGrade = overallPercentage != null ? percentageToGrade(overallPercentage) : null
  const overallGpa   = overallPercentage != null ? percentageToGpa(overallPercentage)   : null

  const allRanks = filteredEnrichedExams.map(e => e.rank).filter((r): r is number => r != null)
  const classRank = allRanks.length > 0 ? Math.min(...allRanks) : null

  const grandTotalObtained = filteredEnrichedExams.reduce((s, e) => s + e.totalMarksObtained, 0)
  const grandTotalMax      = filteredEnrichedExams.reduce((s, e) => s + e.totalMaxMarks, 0)

  const totalExamPages = Math.ceil(filteredEnrichedExams.length / PAGE_SIZE)
  const paginatedExams = filteredEnrichedExams.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const trendData = filteredEnrichedExams.map((e, idx) => ({
    label:     e.exam.exam_name.length > 12 ? e.exam.exam_name.slice(0, 12) + '…' : e.exam.exam_name,
    fullLabel: e.exam.exam_name,
    pct:       e.percentage ?? 0,
    isFinal:   idx === filteredEnrichedExams.length - 1,
  }))

  const trendImproving =
    trendData.length >= 2
      ? trendData[trendData.length - 1].pct >= trendData[0].pct
      : null

  const summaryBlocks = [
    { bg: 'bg-green-50 border-green-200',   iconBg: 'bg-green-500',  icon: Award,    value: overallGrade ?? '—',                              label: 'Overall Grade',      text: 'text-green-600' },
    { bg: 'bg-cyan-50 border-cyan-200',     iconBg: 'bg-cyan-500',   icon: BarChart3, value: overallPercentage != null ? `${overallPercentage}%` : '—', label: 'Overall Percentage', text: 'text-cyan-600' },
    { bg: 'bg-orange-50 border-orange-200', iconBg: 'bg-orange-500', icon: Target,   value: classRank != null ? `#${classRank}` : '—',        label: 'Best Class Rank',    text: 'text-orange-600' },
    { bg: 'bg-purple-50 border-purple-200', iconBg: 'bg-purple-500', icon: Activity, value: overallGpa != null ? String(overallGpa) : '—',    label: 'GPA (5-point scale)', text: 'text-purple-600' },
  ] as const

  // ── Handlers ────────────────────────────────────────────────────────────
  function openEdit(enriched: EnrichedExam) {
    setSelectedEnriched(enriched)
    setShowEdit(true)
  }

  function openDelete(enriched: EnrichedExam) {
    setSelectedEnriched(enriched)
    setShowDelete(true)
  }

  function handleSuccess() {
    onDataChanged()
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" />
        <span className="ml-2 text-sm text-muted-foreground">Loading academic records…</span>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold">Academic Performance</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
                <RefreshCcw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold">Academic Performance</h2>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download Report</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* ── 1. Summary ──────────────────────────────────────────────── */}
        <Card className="bg-gradient-to-br from-[#1897C6]/10 to-[#67BAC3]/10 border-2 border-[#1897C6]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GraduationCap className="h-5 w-5 text-[#1897C6]" />
              Student Academic Summary
              {academicYear && (
                <Badge className="ml-auto bg-[#1897C6]">
                  {academicYear} · Overall Performance Record
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEnrichedExams.length === 0 ? (
              <EmptyState
                message={
                  exams.length === 0
                    ? 'No exam data found for this student.'
                    : `No exam results found for ${academicYear || 'the selected year'}.`
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {summaryBlocks.map(({ bg, iconBg, icon: Icon, value, label, text }) => (
                  <Card key={label} className={bg}>
                    <CardContent className="p-4 text-center">
                      <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full ${iconBg} text-white mb-2`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <p className={`text-2xl sm:text-3xl font-bold ${text}`}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 2. Trend ────────────────────────────────────────────────── */}
        {trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-5 w-5 text-[#1897C6]" />
                Academic Progress Trend
                {trendImproving != null && (
                  <Badge
                    variant="outline"
                    className={`ml-auto ${trendImproving ? 'text-green-600 border-green-600' : 'text-red-500 border-red-400'}`}
                  >
                    {trendImproving ? '↑ Improving' : '↓ Declining'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-1">
<div className="flex items-end gap-2" style={{ height: '160px', minWidth: `${trendData.length * 64}px` }}>
                {trendData.map((d, idx) => {
                  const barH = Math.round((d.pct / 100) * 120)
                  return (
                   <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group min-w-[56px]"  title={`${d.fullLabel}: ${d.pct}%`}>
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        {d.pct > 0 ? `${d.pct}%` : ''}
                      </span>
                      <div className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '120px', background: '#f3f4f6' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${d.isFinal ? 'bg-gradient-to-t from-[#1897C6] to-[#67BAC3]' : 'bg-gray-300 group-hover:bg-gray-400'}`}
                          style={{ height: `${barH}px` }}
                        />
                      </div>
                      <p className="text-xs font-medium text-center leading-tight max-w-[60px] break-words line-clamp-2">{d.label}</p>
                    </div>
                  )
                })}
                  </div>
            </div>
          </CardContent>
          </Card>
        )}

        {/* ── 3. Year Selector ────────────────────────────────────────── */}
        {academicYears.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarDays className="h-5 w-5 text-[#1897C6]" />
                Select Academic Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                {academicYears.map(year => {
                  const isSelected = year === academicYear
                  const yearExams  = enrichedExams.filter(e => e.exam.academic_year === year)
                  const yearPcts   = yearExams.map(e => e.percentage).filter((p): p is number => p != null)
                  const yearAvg    = yearPcts.length > 0 ? Math.round(yearPcts.reduce((a, b) => a + b, 0) / yearPcts.length) : null
                  const yearGrade  = yearAvg != null ? percentageToGrade(yearAvg) : null
                  // Class label for this year from mapping
                  const yearClass  = yearClassMap[year] ?? null

                  return (
<Card
  key={year}
  className={`cursor-pointer transition-all select-none shrink-0 w-[140px] snap-start ${isSelected ? 'bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white border-[#1897C6] shadow-md' : 'hover:border-[#1897C6] hover:shadow-sm'}`}
  onClick={() => { setAcademicYear(year); setCurrentPage(1) }}
>
  <CardContent className="p-4 text-center">
                        <p className="font-bold text-sm sm:text-base">{year}</p>
                        {yearClass && (
                          <p className={`text-xs mt-0.5 ${isSelected ? 'opacity-90' : 'text-muted-foreground'}`}>
                            {yearClass}
                          </p>
                        )}
                        {yearExams.length > 0 ? (
                          <>
                            <p className={`text-xs mt-1 ${isSelected ? 'opacity-90' : 'text-muted-foreground'}`}>
                              {yearExams.length} exam{yearExams.length !== 1 ? 's' : ''}
                            </p>
                            <p className={`text-xs mt-0.5 font-semibold ${isSelected ? 'opacity-90' : 'text-muted-foreground'}`}>
                              {yearGrade ?? '—'}{yearAvg != null ? `: ${yearAvg}%` : ''}
                            </p>
                          </>
                        ) : (
                          <p className={`text-xs mt-1 ${isSelected ? 'opacity-70' : 'text-muted-foreground'}`}>
                            No results yet
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 4. Examination Results ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-5 w-5 text-[#1897C6]" />
                  Examination Results
                  <Badge>{filteredEnrichedExams.length} Exam{filteredEnrichedExams.length !== 1 ? 's' : ''}</Badge>
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Detailed breakdown of all examination performances{academicYear ? ` for ${academicYear}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white shrink-0"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Exam</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredEnrichedExams.length === 0 ? (
              <EmptyState
                message={
                  enrichedExams.length === 0
                    ? 'No exam results found for this student.'
                    : `No exam results found for ${academicYear}.`
                }
              />
            ) : (
              paginatedExams.map((enriched, idx) => {
                const color = CARD_COLORS[idx % CARD_COLORS.length]

                return (
                  <Card key={enriched.exam._id} className={`${color.bg} ${color.border}`}>
                    <CardContent className="p-3 sm:p-4">
                      {/* Exam header */}
                      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${color.icon} flex items-center justify-center text-white shrink-0`}>
                            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm sm:text-base truncate">{enriched.exam.exam_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {EXAM_TYPE_LABELS[enriched.exam.exam_type]}
                              {classLabel && classLabel !== '—' && ` • ${classLabel}`}
                              {enriched.exam.term && ` • ${enriched.exam.term}`}
                              {enriched.exam.start_date && ` • ${formatDate(enriched.exam.start_date)}`}
                            </p>
                          </div>
                        </div>
                        {/* Edit + Delete icons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(enriched)}
                            title="Edit Exam"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDelete(enriched)}
                            title="Delete Exam"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Score summary */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
  {enriched.percentage != null && (
    <div className="text-center px-1 py-2 bg-white rounded-lg border-2">
      <p className={`text-base sm:text-xl font-bold ${color.text} truncate`}>{enriched.percentage}%</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground">Percentage</p>
    </div>
  )}
  {enriched.grade && (
    <div className="text-center px-1 py-2 bg-white rounded-lg border-2">
      <p className={`text-base sm:text-xl font-bold ${color.text}`}>{enriched.grade}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground">Grade</p>
    </div>
  )}
  {enriched.rank != null && (
    <div className="text-center px-1 py-2 bg-white rounded-lg border-2">
      <p className={`text-base sm:text-xl font-bold ${color.text}`}>#{enriched.rank}</p>
      <p className="text-[10px] sm:text-xs text-muted-foreground">Rank</p>
    </div>
  )}
  {enriched.totalMaxMarks > 0 && (
    <div className="text-center px-1 py-2 bg-white rounded-lg border-2">
      <p className={`text-sm sm:text-lg font-bold ${color.text} truncate`}>
        {enriched.totalMarksObtained}/{enriched.totalMaxMarks}
      </p>
      <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
    </div>
  )}
</div>
                      {/* Subject-wise marks */}
                      {enriched.results.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                            Subject-wise Marks
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {enriched.results.map((result, rIdx) => {
                              const scheduleId =
                                result.exam_schedule_id && typeof result.exam_schedule_id === 'object' && '_id' in result.exam_schedule_id
                                  ? (result.exam_schedule_id as Record<string, unknown>)['_id'] as string
                                  : result.exam_schedule_id as string

                              const sched       = enriched.schedules.find(s => s._id === scheduleId)
                              const maxMarks    = sched?.total_marks ?? null
                              const subjectName = sched ? resolveSubjectName(sched, subjectsMap, rIdx) : `Subject ${rIdx + 1}`

                              const passStatus =
                                result.is_absent === true  ? 'Absent'
                                : result.is_pass === true  ? 'Pass'
                                : result.is_pass === false ? 'Fail'
                                : null

                              return (
                                <div key={result._id ?? rIdx} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                  <div className="min-w-0 pr-2">
                                    <p className="text-xs sm:text-sm font-medium">{subjectName}</p>
                                    {passStatus && (
                                      <p className={`text-xs font-medium ${passStatus === 'Pass' ? 'text-green-600' : passStatus === 'Fail' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                        {passStatus}
                                      </p>
                                    )}
                                    {result.remarks && (
                                      <p className="text-xs text-muted-foreground truncate">{result.remarks}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {result.theory_marks_obtained != null && (
                                      <span className="text-xs text-muted-foreground">T:{result.theory_marks_obtained}</span>
                                    )}
                                    {result.practical_marks_obtained != null && (
                                      <span className="text-xs text-muted-foreground">P:{result.practical_marks_obtained}</span>
                                    )}
                                    <span className="text-sm font-bold">
                                      {result.total_marks_obtained ?? '—'}{maxMarks != null ? `/${maxMarks}` : ''}
                                    </span>
                                    {result.grade && (
                                      <Badge variant="outline" className="text-xs">{result.grade}</Badge>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          {totalExamPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalExamPages}
              onPageChange={setCurrentPage}
            />
          )}
          </CardContent>
        </Card>

        {/* ── 5. Overall Performance ──────────────────────────────────── */}
        {filteredEnrichedExams.length > 0 && (
          <Card className="border-2 border-[#1897C6]/30 bg-gradient-to-br from-[#1897C6]/5 to-[#67BAC3]/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-xl flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-[#1897C6]" />
                Overall Performance
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Cumulative academic achievement across all examinations{academicYear ? ` · ${academicYear}` : ''}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
                {[
                  { gradient: 'from-green-500 to-emerald-500', border: 'border-green-200',  value: overallGrade ?? '—',                                label: 'Overall Grade',      textSize: 'text-3xl' },
                  { gradient: 'from-[#1897C6] to-[#67BAC3]',  border: 'border-blue-200',   value: overallPercentage != null ? `${overallPercentage}%` : '—', label: 'Overall Percentage', textSize: 'text-xl' },
                  { gradient: 'from-purple-500 to-pink-500',   border: 'border-purple-200', value: classRank != null ? `#${classRank}` : '—',           label: 'Best Class Rank',    textSize: 'text-2xl' },
                ].map(({ gradient, border, value, label, textSize }) => (
                  <div key={label} className={`flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 ${border} shadow-sm`}>
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-lg`}>
                      <span className={`${textSize} font-bold text-white`}>{value}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard value={filteredEnrichedExams.reduce((sum, e) => sum + e.schedules.length, 0)} label="Total Subjects"   textColor="text-[#1897C6]" />
                <StatCard value={filteredEnrichedExams.length}                                            label="Exams Completed" textColor="text-green-600" />
                <StatCard value={grandTotalObtained}                                                      label="Marks Obtained"  textColor="text-orange-600" />
                <StatCard value={grandTotalMax}                                                            label="Maximum Marks"   textColor="text-purple-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <AddExamDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        studentId={studentId}
        classId={classId}
        batchId={batchId}
        onSuccess={handleSuccess}
      />

      <EditExamDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        enriched={selectedEnriched}
        subjectsMap={subjectsMap}
        studentId={studentId}
        onSuccess={handleSuccess}
      />

      <DeleteExamDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        enriched={selectedEnriched}
        onSuccess={handleSuccess}
      />
    </>
  )
}
