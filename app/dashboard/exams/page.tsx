'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  FileText,
  GraduationCap,
  Award,
  Clock,
  Target,
  AlertCircle,
  Loader2,
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  Eye,
  Users,
  CalendarCheck,
  CalendarX,
  BookMarked,
  MapPin,
} from 'lucide-react'
import {
  examsApi,
  type ExamMaster,
  type ExamSchedule,
  type CreateExamPayload,
  type UpdateExamPayload,
  EXAM_TYPE_OPTIONS,
  EXAM_STATUS_OPTIONS,
  EXAM_TYPE_LABELS,
  EXAM_STATUS_LABELS,
} from '@/lib/api/exams'
import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'
import { subjectsByClassApi, type SubjectByClass } from '@/lib/api/subjects'
import type { ApiResponse } from '@/lib/api/client'
import SubjectsByClass from '../subjects-by-class/page'
import { Pagination } from '@/components/pagination'

// ═══════════════════════════════════════════════════════════════
// LOCAL TYPES
// ═══════════════════════════════════════════════════════════════

interface DeleteConfirm {
  open: boolean
  type: 'exam' | 'schedule'
  id: string
  name: string
}

interface FormError {
  field: string
  message: string
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getLS(key: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(key) ?? ''
}

function getCurrentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function extractArray<T>(res: unknown): T[] {
  if (!res) return []
  if (Array.isArray(res)) return res as T[]
  const r = res as Record<string, unknown>
  if (Array.isArray(r.result)) return r.result as T[]
  if (Array.isArray(r.data)) return r.data as T[]
  return []
}

// ── User-friendly errors — no technical terms shown to user ──
function friendlyError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.'
  const asRes = err as ApiResponse<unknown>
  if (typeof asRes === 'object' && 'success' in asRes && !asRes.success) {
    const m = asRes.message ?? asRes.error ?? ''
    if (m) return friendlyError(new Error(m as string))
  }
  const msg: string =
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err as { message?: string })?.message ??
    String(err)

  if (/network|fetch|econnrefused|failed to fetch/i.test(msg))
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  if (/unauthorized|401|forbidden|403/i.test(msg))
    return 'Your session has expired. Please log in again.'
  if (/not found|404/i.test(msg))
    return 'The record was not found. It may have already been deleted.'
  if (/duplicate|already exists|conflict|409/i.test(msg))
    return 'A record with this information already exists. Please use different details.'
  if (/already has an exam scheduled/i.test(msg))
    return 'There is already an exam scheduled at this date and time. Please choose a different slot.'
  if (/teacher already has/i.test(msg))
    return 'This invigilator is already assigned to another exam at the same time.'
  if (/class.*section.*already/i.test(msg))
    return 'This class already has an exam scheduled at the same date and time.'
  if (/objectid|cast|validation|schema|mongoose|stack|at Object|at Array|_id|path/i.test(msg))
    return 'Something went wrong. Please check your inputs and try again.'
  if (msg.length > 0 && msg.length < 150 && !/[{[<]/.test(msg))
    return msg
  return 'Something went wrong. Please try again.'
}

function makeEmptyExamForm(instituteId: string, adminId: string): CreateExamPayload {
  return {
    institute_id: instituteId,
    exam_name: '',
    exam_code: '',
    exam_type: 'quarterly',
    academic_year: getCurrentAcademicYear(),
    term: '',
    start_date: '',
    end_date: '',
    description: '',
    instructions: '',
    status: 'draft',
    created_by: adminId || null,
    created_by_role: 'institute_admin',
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Safe helper to extract populated field from backend response ──
// Backend uses .populate("field", "key") — result is an object or null
function getPopulatedString(field: unknown, key: string, prefix = ''): string {
  if (field !== null && field !== undefined && typeof field === 'object') {
    const val = (field as Record<string, unknown>)[key]
    if (val) return prefix ? `${prefix} ${val}` : String(val)
  }
  return '—'
}

// ═══════════════════════════════════════════════════════════════
// COLOR MAPS — match exact backend enum values
// ═══════════════════════════════════════════════════════════════

const STATUS_COLORS: Record<ExamMaster['status'], string> = {
  draft:     'bg-yellow-100 text-yellow-700 border border-yellow-300',
  scheduled: 'bg-blue-100 text-blue-700 border border-blue-300',
  ongoing:   'bg-green-100 text-green-700 border border-green-300',
  completed: 'bg-gray-100 text-gray-600 border border-gray-300',
  archived:  'bg-red-100 text-red-700 border border-red-300',
}

// exam_type enum: quarterly|half_yearly|annual|unit_test|mock|entrance|competitive
const TYPE_COLORS: Record<ExamMaster['exam_type'], string> = {
  quarterly:   'bg-purple-100 text-purple-700 border border-purple-300',
  half_yearly: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
  annual:      'bg-red-100 text-red-700 border border-red-300',
  unit_test:   'bg-orange-100 text-orange-700 border border-orange-300',
  mock:        'bg-cyan-100 text-cyan-700 border border-cyan-300',
  entrance:    'bg-pink-100 text-pink-700 border border-pink-300',
  competitive: 'bg-teal-100 text-teal-700 border border-teal-300',
}

// schedule status enum: scheduled|ongoing|completed|cancelled
const SCHED_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-300',
  ongoing:   'bg-green-100 text-green-700 border-green-300',
  completed: 'bg-gray-100 text-gray-600 border-gray-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
}

// ═══════════════════════════════════════════════════════════════
// SHARED INLINE COMPONENTS
// ═══════════════════════════════════════════════════════════════

function InlineError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1897C6]/10 to-[#67BAC3]/10 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-[#1897C6]" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
      {action}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULE VIEW DIALOG
// Displays all schema fields. Populated by backend:
//   class_id    → class_name
//   batch_id    → batch_name
//   subject_id  → subject_name
//   invigilator_id → full_name, teacher_code
// ═══════════════════════════════════════════════════════════════

function ScheduleViewDialog({ schedule, open, onClose }: {
  schedule: ExamSchedule | null; open: boolean; onClose: () => void
}) {
  if (!schedule) return null

  const clsName       = getPopulatedString(schedule.class_id,      'class_name',  'Class')
  const batchName     = getPopulatedString(schedule.batch_id,      'batch_name')
  const subjectName   = getPopulatedString(schedule.subject_id,    'subject_name')
  const invigilator   = getPopulatedString(schedule.invigilator_id,'full_name')
  const invigilCode   = schedule.invigilator_id !== null &&
    schedule.invigilator_id !== undefined &&
    typeof schedule.invigilator_id === 'object'
    ? (schedule.invigilator_id as any).teacher_code ?? null : null
  const schedStatus   = schedule.status ?? 'scheduled'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Schedule Details</DialogTitle>
          <DialogDescription>View exam schedule details</DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-5 pb-4 border-b bg-gradient-to-br from-[#1897C6]/5 to-[#67BAC3]/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
              <BookMarked className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold leading-snug truncate">{subjectName}</h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${SCHED_STATUS_COLORS[schedStatus] ?? 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                  {schedStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Class & Batch */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Class & Batch</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Class</p>
                <p className="text-sm font-semibold mt-0.5">{clsName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch</p>
                <p className="text-sm font-semibold mt-0.5">{batchName}</p>
              </div>
            </div>
          </div>

          {/* Date / Time / Room — schema fields: exam_date, start_time, end_time, duration_minutes, room_number */}
          <div className="rounded-xl border p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Schedule Details</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1897C6]/10 flex items-center justify-center shrink-0">
                  <CalendarCheck className="h-4 w-4 text-[#1897C6]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exam Date</p>
                  <p className="text-sm font-semibold">{formatDate(schedule.exam_date)}</p>
                </div>
              </div>
              {(schedule.start_time || schedule.end_time) && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-semibold">
                      {schedule.start_time ?? '—'}{schedule.end_time ? ` → ${schedule.end_time}` : ''}
                    </p>
                  </div>
                </div>
              )}
              {schedule.duration_minutes != null && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-semibold">{schedule.duration_minutes} minutes</p>
                  </div>
                </div>
              )}
              {schedule.room_number && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Room</p>
                    <p className="text-sm font-semibold">{schedule.room_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Marks — schema fields: total_marks, pass_marks, theory_marks, practical_marks */}
          <div className="rounded-xl border p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Marks</h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                { label: 'Total Marks', value: schedule.total_marks },
                { label: 'Pass Marks',  value: schedule.pass_marks },
                { label: 'Theory',      value: schedule.theory_marks },
                { label: 'Practical',   value: schedule.practical_marks },
              ] as { label: string; value: number | null | undefined }[])
                .filter(r => r.value != null)
                .map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-bold text-[#1897C6]">{value}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Invigilator — schema field: invigilator_id → full_name, teacher_code */}
          {invigilator !== '—' && (
            <div className="rounded-xl border p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Invigilator</h3>
              <p className="text-sm font-semibold">{invigilator}</p>
              {invigilCode && <p className="text-xs text-muted-foreground font-mono mt-0.5">{invigilCode}</p>}
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ExamsPage() {
  const [instituteId, setInstituteId] = useState('')
  const [adminId, setAdminId] = useState('')

  const [exams, setExams] = useState<ExamMaster[]>([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [examsError, setExamsError] = useState('')

  const [filterType,   setFilterType]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterYear,   setFilterYear]   = useState('all')
  const [currentPage,  setCurrentPage]  = useState(1)
  const PAGE_SIZE = 8

  const [showAddExam,   setShowAddExam]   = useState(false)
  const [showEditExam,  setShowEditExam]  = useState(false)
  const [showViewExam,  setShowViewExam]  = useState(false)
  const [selectedExam,  setSelectedExam]  = useState<ExamMaster | null>(null)
  const [examForm,      setExamForm]      = useState<CreateExamPayload>(makeEmptyExamForm('', ''))
  const [editExamForm,  setEditExamForm]  = useState<UpdateExamPayload>({})
  const [examFormErrors,setExamFormErrors]= useState<FormError[]>([])
  const [examSubmitting,setExamSubmitting]= useState(false)

  const [classesCount, setClassesCount] = useState(0)

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>({ open: false, type: 'exam', id: '', name: '' })
  const [isDeleting,    setIsDeleting]    = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

  // Schedules
  const [expandedExamId,   setExpandedExamId]   = useState<string | null>(null)
  const [schedulesMap,     setSchedulesMap]      = useState<Record<string, ExamSchedule[]>>({})
  const [schedulesLoading, setSchedulesLoading]  = useState<Record<string, boolean>>({})

  const [viewingSchedule,   setViewingSchedule]   = useState<ExamSchedule | null>(null)
  const [showViewSchedule,  setShowViewSchedule]  = useState(false)
  const [showScheduleDialog,setShowScheduleDialog]= useState(false)
  const [editingSchedule,   setEditingSchedule]   = useState<ExamSchedule | null>(null)
  const [scheduleExamId,    setScheduleExamId]    = useState<string>('')
  const [scheduleClasses,   setScheduleClasses]   = useState<ClassMaster[]>([])
  const [scheduleBatches,   setScheduleBatches]   = useState<CoachingBatch[]>([])
  const [scheduleSubjects,  setScheduleSubjects]  = useState<SubjectByClass[]>([])
  const [scheduleForm,      setScheduleForm]      = useState<Partial<ExamSchedule>>({})
  const [scheduleSubmitting,setScheduleSubmitting]= useState(false)
  const [scheduleFormError, setScheduleFormError] = useState<string | null>(null)
  const [loadingBatches,    setLoadingBatches]    = useState(false)
  const [loadingSubjects,   setLoadingSubjects]   = useState(false)
  const [scheduleTeachers,  setScheduleTeachers]  = useState<import('@/lib/api/teachers').Teacher[]>([])

  useEffect(() => {
    const iId = getLS('instituteId')
    const aId = getLS('adminId')
    setInstituteId(iId); setAdminId(aId)
    setExamForm(makeEmptyExamForm(iId, aId))
  }, [])

  useEffect(() => {
    const iId = getLS('instituteId')
    if (!iId) return
    classesApi.getAll({ instituteId: iId, status: 'active' })
      .then((res) => setClassesCount(extractArray<ClassMaster>(res).length))
      .catch(() => setClassesCount(0))
  }, [])

  const fetchExams = useCallback(async () => {
    const iId = getLS('instituteId')
    if (!iId) { setExamsLoading(false); return }
    setExamsLoading(true); setExamsError('')
    try {
      const query: Parameters<typeof examsApi.getAll>[0] = { institute_id: iId }
      if (filterType   !== 'all') query.exam_type     = filterType
      if (filterStatus !== 'all') query.status        = filterStatus
      if (filterYear   !== 'all') query.academic_year = filterYear
      const res = await examsApi.getAll(query)
      setExams(extractArray<ExamMaster>(res))
    } catch (err) {
      setExamsError(friendlyError(err))
    } finally { setExamsLoading(false) }
  }, [filterType, filterStatus, filterYear])

  useEffect(() => { fetchExams() }, [fetchExams])

  function validateExamForm(form: CreateExamPayload | UpdateExamPayload): FormError[] {
    const errs: FormError[] = []
    const name = (form as CreateExamPayload).exam_name ?? (form as UpdateExamPayload).exam_name ?? ''
    if (!name.trim()) errs.push({ field: 'exam_name', message: 'Exam name is required.' })
    const yr = (form as CreateExamPayload).academic_year ?? (form as UpdateExamPayload).academic_year ?? ''
    if (!yr.trim()) errs.push({ field: 'academic_year', message: 'Academic year is required.' })
    return errs
  }

  const handleCreateExam = async () => {
    const errs = validateExamForm(examForm)
    if (errs.length > 0) { setExamFormErrors(errs); return }
    setExamFormErrors([]); setExamSubmitting(true)
    try {
      await examsApi.create({
        ...examForm,
        exam_code:    examForm.exam_code    || null,
        term:         examForm.term         || null,
        start_date:   examForm.start_date   || null,
        end_date:     examForm.end_date     || null,
        description:  examForm.description  || null,
        instructions: examForm.instructions || null,
      })
      setShowAddExam(false)
      setExamForm(makeEmptyExamForm(instituteId, adminId))
      await fetchExams()
    } catch (err) {
      setExamFormErrors([{ field: 'general', message: friendlyError(err) }])
    } finally { setExamSubmitting(false) }
  }

  const handleUpdateExam = async () => {
    if (!selectedExam) return
    const errs = validateExamForm(editExamForm)
    if (errs.length > 0) { setExamFormErrors(errs); return }
    setExamFormErrors([]); setExamSubmitting(true)
    try {
      await examsApi.update(selectedExam._id, {
        ...editExamForm,
        exam_code:    editExamForm.exam_code    || null,
        term:         editExamForm.term         || null,
        start_date:   editExamForm.start_date   || null,
        end_date:     editExamForm.end_date     || null,
        description:  editExamForm.description  || null,
        instructions: editExamForm.instructions || null,
      })
      setShowEditExam(false); setSelectedExam(null); await fetchExams()
    } catch (err) {
      setExamFormErrors([{ field: 'general', message: friendlyError(err) }])
    } finally { setExamSubmitting(false) }
  }

  const openViewExam = (exam: ExamMaster) => { setSelectedExam(exam); setShowViewExam(true) }

  const openEditExam = (exam: ExamMaster) => {
    setSelectedExam(exam); setExamFormErrors([])
    setEditExamForm({
      exam_name:    exam.exam_name,
      exam_code:    exam.exam_code    ?? null,
      exam_type:    exam.exam_type,
      academic_year:exam.academic_year,
      term:         exam.term         ?? '',
      start_date:   exam.start_date   ? exam.start_date.split('T')[0] : '',
      end_date:     exam.end_date     ? exam.end_date.split('T')[0]   : '',
      description:  exam.description  ?? '',
      instructions: exam.instructions ?? '',
      status:       exam.status,
    })
    setShowEditExam(true)
  }

  const openDeleteConfirm = (type: 'exam' | 'schedule', id: string, name: string) => {
    if (!id) return
    setDeleteError('')
    setDeleteConfirm({ open: true, type, id, name })
  }

  // getAllSchedules populates: class_id, batch_id, subject_id, invigilator_id
  const fetchSchedules = async (examId: string) => {
    setSchedulesLoading(prev => ({ ...prev, [examId]: true }))
    try {
      const res = await examsApi.getAllSchedules({ exam_id: examId })
      const list: ExamSchedule[] = Array.isArray(res) ? res : (res as any)?.result ?? []
      setSchedulesMap(prev => ({ ...prev, [examId]: list }))
    } catch {
      setSchedulesMap(prev => ({ ...prev, [examId]: [] }))
    } finally {
      setSchedulesLoading(prev => ({ ...prev, [examId]: false }))
    }
  }

  const toggleExamExpand = (examId: string) => {
    if (expandedExamId === examId) {
      setExpandedExamId(null)
    } else {
      setExpandedExamId(examId)
      fetchSchedules(examId) // always refresh on open
    }
  }

  const openAddSchedule = async (examId: string) => {
    setEditingSchedule(null); setScheduleExamId(examId); setScheduleFormError(null)
    setScheduleForm({
      exam_id: examId, status: 'scheduled',
      total_marks: 100, pass_marks: 40,
      start_time: '', end_time: '', duration_minutes: null, room_number: '',
    })
    const iId = getLS('instituteId')
    try {
      const res = await classesApi.getAll({ instituteId: iId, status: 'active' })
      setScheduleClasses(Array.isArray(res) ? res : (res as any)?.result ?? [])
    } catch { setScheduleClasses([]) }
    setScheduleBatches([]); setScheduleSubjects([])
    // Fetch teachers for invigilator dropdown
    try {
      const res = await import('@/lib/api/teachers').then(m => m.teachersApi.getAll({ instituteId: iId, status: 'active' }))
      const list = Array.isArray(res) ? res : (res as any)?.result ?? []
      setScheduleTeachers(list)
    } catch { setScheduleTeachers([]) }
    setShowScheduleDialog(true)
  }

  const openEditSchedule = async (schedule: ExamSchedule) => {
    setEditingSchedule(schedule)
    setScheduleExamId(
      typeof schedule.exam_id === 'object' ? (schedule.exam_id as any)._id : schedule.exam_id as string
    )
    setScheduleFormError(null)

    // Extract IDs from populated objects (backend returns objects after populate)
    const classId   = typeof schedule.class_id === 'object' && schedule.class_id !== null
      ? (schedule.class_id as any)._id   : schedule.class_id as string
    const batchId   = typeof schedule.batch_id === 'object' && schedule.batch_id !== null
      ? (schedule.batch_id as any)._id   : schedule.batch_id as string | null
    const subjectId = typeof schedule.subject_id === 'object' && schedule.subject_id !== null
      ? (schedule.subject_id as any)._id : schedule.subject_id as string

    setScheduleForm({
      exam_id:          typeof schedule.exam_id === 'object' ? (schedule.exam_id as any)._id : schedule.exam_id,
      class_id:         classId,
      batch_id:         batchId,
      subject_id:       subjectId,
      exam_date:        schedule.exam_date ? schedule.exam_date.split('T')[0] : '',
      total_marks:      schedule.total_marks,
      pass_marks:       schedule.pass_marks       ?? null,
      theory_marks:     schedule.theory_marks     ?? undefined,
      practical_marks:  schedule.practical_marks  ?? undefined,
      status:           schedule.status           ?? 'scheduled',
      // All 4 optional schema fields:
      start_time:       schedule.start_time       ?? '',
      end_time:         schedule.end_time         ?? '',
      duration_minutes: schedule.duration_minutes ?? null,
      room_number:      schedule.room_number      ?? '',
      invigilator_id:   typeof schedule.invigilator_id === 'object' && schedule.invigilator_id !== null
        ? (schedule.invigilator_id as any)._id
        : schedule.invigilator_id ?? null,
    })

    const iId = getLS('instituteId')
    try {
      const res = await classesApi.getAll({ instituteId: iId, status: 'active' })
      setScheduleClasses(Array.isArray(res) ? res : (res as any)?.result ?? [])
    } catch { setScheduleClasses([]) }

    if (classId) {
      setLoadingBatches(true)
      try {
        const res = await classesApi.getBatchesByClass(classId)
        setScheduleBatches(Array.isArray(res) ? res : (res as any)?.result ?? [])
      } catch { setScheduleBatches([]) }
      finally { setLoadingBatches(false) }

      setLoadingSubjects(true)   
      try {
        const res = await subjectsByClassApi.getByClass(classId)
        const list: SubjectByClass[] = Array.isArray(res) ? res : (res as any)?.result ?? []
        setScheduleSubjects(list.filter(s => s.status === 'active'))
      } catch { setScheduleSubjects([]) }
      finally { setLoadingSubjects(false) }
    }
    // Fetch teachers for invigilator dropdown
    try {
      const res = await import('@/lib/api/teachers').then(m => m.teachersApi.getAll({ instituteId: iId, status: 'active' }))
      const list = Array.isArray(res) ? res : (res as any)?.result ?? []
      setScheduleTeachers(list)
    } catch { setScheduleTeachers([]) }
    setShowScheduleDialog(true)
  }

  const onScheduleClassChange = async (classId: string) => {
    setScheduleForm(prev => ({ ...prev, class_id: classId, batch_id: null, subject_id: undefined }))
    setScheduleBatches([]); setScheduleSubjects([])
    setLoadingBatches(true)
    try {
      const res = await classesApi.getBatchesByClass(classId)
      setScheduleBatches(Array.isArray(res) ? res : (res as any)?.result ?? [])
    } catch { setScheduleBatches([]) }
    finally { setLoadingBatches(false) }
    setLoadingSubjects(true)
    try {
      const res = await subjectsByClassApi.getByClass(classId)
      const list: SubjectByClass[] = Array.isArray(res) ? res : (res as any)?.result ?? []
      setScheduleSubjects(list.filter(s => s.status === 'active'))
    } catch { setScheduleSubjects([]) }
    finally { setLoadingSubjects(false) }
  }

  // All payload fields match backend schema exactly
  const handleScheduleSubmit = async () => {
    setScheduleFormError(null)
    if (!scheduleForm.class_id)    { setScheduleFormError('Please select a class.');      return }
    if (!scheduleForm.batch_id)    { setScheduleFormError('Please select a batch.');      return }
    if (!scheduleForm.subject_id)  { setScheduleFormError('Please select a subject.');    return }
    if (!scheduleForm.exam_date)   { setScheduleFormError('Please select an exam date.'); return }
    if (!scheduleForm.total_marks) { setScheduleFormError('Total marks is required.');    return }

    setScheduleSubmitting(true)
    try {
      const commonPayload = {
        class_id:         scheduleForm.class_id   as string,
        batch_id:         scheduleForm.batch_id   as string,
        subject_id:       scheduleForm.subject_id as string,
        exam_date:        scheduleForm.exam_date  as string,
        total_marks:      Number(scheduleForm.total_marks),
        pass_marks:       scheduleForm.pass_marks      ? Number(scheduleForm.pass_marks)      : null,
        theory_marks:     scheduleForm.theory_marks    ? Number(scheduleForm.theory_marks)    : null,
        practical_marks:  scheduleForm.practical_marks ? Number(scheduleForm.practical_marks) : null,
        status:           (scheduleForm.status as ExamSchedule['status']) ?? 'scheduled',
        start_time:       scheduleForm.start_time      || null,
        end_time:         scheduleForm.end_time        || null,
        duration_minutes: scheduleForm.duration_minutes ? Number(scheduleForm.duration_minutes) : null,
        room_number:      scheduleForm.room_number     || null,
        invigilator_id:   scheduleForm.invigilator_id  || null,
      }

      if (editingSchedule?._id) {
        await examsApi.updateSchedule(editingSchedule._id, commonPayload)
      } else {
        await examsApi.createSchedule({
          ...commonPayload,
          exam_id:    scheduleExamId,
          section_id: null, // schema field, default null
        })
      }
      setShowScheduleDialog(false)
      await fetchSchedules(scheduleExamId)
    } catch (err) {
      setScheduleFormError(friendlyError(err))
    } finally {
      setScheduleSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true); setDeleteError('')
    try {
      if (deleteConfirm.type === 'schedule') {
        await examsApi.deleteSchedule(deleteConfirm.id)
        setSchedulesMap(prev => {
          const updated = { ...prev }
          for (const examId of Object.keys(updated)) {
            updated[examId] = updated[examId].filter(s => s._id !== deleteConfirm.id)
          }
          return updated
        })
      } else {
        await examsApi.delete(deleteConfirm.id)
        await fetchExams()
      }
      setDeleteConfirm({ open: false, type: 'exam', id: '', name: '' })
    } catch (err) {
      setDeleteError(friendlyError(err))
    } finally { setIsDeleting(false) }
  }

  const academicYears = Array.from(new Set(exams.map((e) => e.academic_year))).sort().reverse()
  const totalPages    = Math.ceil(exams.length / PAGE_SIZE)
  const paginatedExams= exams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const examStats = {
    total:     exams.length,
    active:    exams.filter(e => e.status === 'ongoing' || e.status === 'scheduled').length,
    completed: exams.filter(e => e.status === 'completed').length,
    draft:     exams.filter(e => e.status === 'draft').length,
  }
  const isExamCreateValid =
    examForm.exam_name.trim().length > 0 && !!examForm.exam_type && examForm.academic_year.trim().length > 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Exams Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Configure exam types and batch-wise subject allocation</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { icon: Award,         color: 'text-[#1897C6]',  bg: 'bg-[#1897C6]',  value: examStats.total,  label: 'Exam Types' },
            { icon: GraduationCap, color: 'text-green-600',  bg: 'bg-green-600',  value: classesCount,     label: 'Classes' },
            { icon: Users,         color: 'text-purple-600', bg: 'bg-purple-600', value: examStats.active, label: 'Active Exams' },
            { icon: BookOpen,      color: 'text-orange-600', bg: 'bg-orange-600', value: examStats.draft,  label: 'Draft Exams' },
          ].map(({ icon: Icon, color, bg, value, label }) => (
            <Card key={label} className="border-2">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
                  <Badge className={`${bg} text-xs text-white`}>{value}</Badge>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="exam-types" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="exam-types" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
              <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="truncate">Exam Types</span>
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="truncate">Subjects by Class</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1 */}
          <TabsContent value="exam-types" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Examination Types</CardTitle>
                    <CardDescription className="mt-1.5">Define exam types that apply to all classes across the institute</CardDescription>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={fetchExams} disabled={examsLoading} title="Refresh">
                      <RefreshCw className={`h-4 w-4 ${examsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={() => { setExamForm(makeEmptyExamForm(instituteId, adminId)); setExamFormErrors([]); setShowAddExam(true) }}
                      className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full md:w-auto">
                      <Plus className="h-4 w-4 mr-2" /> Add Exam Type
                    </Button>
                  </div>
                </div>
                {/* Filters */}
                <div className="flex flex-wrap gap-2 pt-3">
                  <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {EXAM_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {EXAM_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[136px] h-8 text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {examsError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{examsError}</span>
                    <button onClick={fetchExams} className="flex items-center gap-1 text-xs underline hover:no-underline shrink-0">
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                )}

                {examsLoading ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground text-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" /> Loading exams…
                  </div>
                ) : exams.length === 0 ? (
                  <EmptyState icon={Award} title="No Exams Found"
                    description="No exam types have been created yet. Add your first one to get started."
                    action={
                      <Button onClick={() => { setExamForm(makeEmptyExamForm(instituteId, adminId)); setExamFormErrors([]); setShowAddExam(true) }}
                        className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]">
                        <Plus className="h-4 w-4 mr-2" /> Add Exam Type
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {paginatedExams.map((exam) => (
                      <Card key={exam._id} className="border-2 hover:border-[#1897C6]/50 transition-colors">
                        <CardContent className="p-3 sm:p-4">

                          {/* Exam Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
                                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm sm:text-base truncate">{exam.exam_name}</h3>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  {exam.exam_code && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-xs font-mono font-medium">
                                      {exam.exam_code}
                                    </span>
                                  )}
                                  {exam.term && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                                      {exam.term}
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[exam.exam_type] ?? 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                                    {EXAM_TYPE_LABELS[exam.exam_type] ?? exam.exam_type}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[exam.status]}`}>
                                    {EXAM_STATUS_LABELS[exam.status]}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />{exam.academic_year}
                                  </span>
                                  {exam.start_date && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1897C6]">
                                      <Target className="h-3 w-3" />
                                      {formatDate(exam.start_date)}{exam.end_date ? ` → ${formatDate(exam.end_date)}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-[#1897C6]/10 hover:text-[#1897C6]" title="View" onClick={() => openViewExam(exam)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-blue-50 hover:text-blue-600" title="Edit" onClick={() => openEditExam(exam)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => openDeleteConfirm('exam', exam._id, exam.exam_name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <div className="w-px h-5 bg-border mx-0.5" />
                              <Button
                                variant="ghost" size="sm"
                                className={`h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${expandedExamId === exam._id ? 'bg-[#1897C6]/10 text-[#1897C6]' : 'hover:bg-[#1897C6]/10 hover:text-[#1897C6]'}`}
                                onClick={() => toggleExamExpand(exam._id)}
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline text-xs">Schedules</span>
                                {schedulesMap[exam._id]?.length > 0 && (
                                  <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-[#1897C6] text-white text-[10px] font-bold">
                                    {schedulesMap[exam._id].length}
                                  </span>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Schedules Expanded */}
                          {expandedExamId === exam._id && (
                            <div className="mt-3 pt-3 border-t border-dashed">
                              <div className="flex items-center justify-between mb-3 gap-2">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-[#1897C6] shrink-0" />
                                  <span className="text-sm font-semibold text-[#1897C6]">Exam Schedules</span>
                                  {schedulesMap[exam._id] && (
                                    <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-[#1897C6] text-white text-[10px] font-bold">
                                      {schedulesMap[exam._id].length}
                                    </span>
                                  )}
                                </div>
                                <Button size="sm" className="h-7 px-3 text-xs gap-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white shrink-0"
                                  onClick={() => openAddSchedule(exam._id)}>
                                  <Plus className="h-3 w-3" /> Add Schedule
                                </Button>
                              </div>

                              {schedulesLoading[exam._id] ? (
                                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin text-[#1897C6]" /> Loading schedules…
                                </div>
                              ) : !schedulesMap[exam._id] || schedulesMap[exam._id].length === 0 ? (
                                <div className="text-center py-5 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                  No schedules added yet.{' '}
                                  <button className="text-[#1897C6] underline hover:no-underline font-medium" onClick={() => openAddSchedule(exam._id)}>
                                    Add one
                                  </button>
                                </div>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {schedulesMap[exam._id].map((sched) => {
                                    // Backend populates these via .populate()
                                    const clsName     = getPopulatedString(sched.class_id,   'class_name',  'Class')
                                    const batchName   = getPopulatedString(sched.batch_id,   'batch_name')
                                    const subjectName = getPopulatedString(sched.subject_id, 'subject_name')
                                    const schedStatus = sched.status ?? 'scheduled'

                                    return (
                                      <div key={sched._id} className="flex flex-col p-3 rounded-xl border bg-white hover:border-[#1897C6]/40 hover:shadow-sm transition-all gap-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="text-sm font-semibold leading-tight flex-1 min-w-0 truncate">{subjectName}</span>
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${SCHED_STATUS_COLORS[schedStatus] ?? 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                                            {schedStatus}
                                          </span>
                                        </div>

                                        <p className="text-xs text-muted-foreground truncate">{clsName} · {batchName}</p>

                                        {/* Date + Time */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <CalendarDays className="h-3 w-3 shrink-0" />
                                            {sched.exam_date ? formatDate(sched.exam_date) : '—'}
                                          </span>
                                          {(sched.start_time || sched.end_time) && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3 shrink-0" />
                                              {sched.start_time ?? ''}{sched.end_time ? `–${sched.end_time}` : ''}
                                            </span>
                                          )}
                                          {sched.duration_minutes != null && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3 shrink-0" />
                                              {sched.duration_minutes} min
                                            </span>
                                          )}
                                          {sched.room_number && (
                                            <span className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3 shrink-0" />
                                              {sched.room_number}
                                            </span>
                                          )}
                                        </div>

                                        {/* Marks */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Target className="h-3 w-3 shrink-0" />
                                            Max <span className="font-semibold text-foreground ml-0.5">{sched.total_marks}</span>
                                            {sched.pass_marks != null && (
                                              <span className="ml-1">· Pass <span className="font-semibold text-foreground">{sched.pass_marks}</span></span>
                                            )}
                                          </span>
                                        </div>

                                        {(sched.theory_marks != null || sched.practical_marks != null) && (
                                          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                                            {sched.theory_marks    != null && <span>Theory <span className="font-semibold text-foreground">{sched.theory_marks}</span></span>}
                                            {sched.practical_marks != null && <span>Practical <span className="font-semibold text-foreground">{sched.practical_marks}</span></span>}
                                          </div>
                                        )}

                                        <div className="flex items-center gap-1 pt-1 border-t mt-auto">
                                          <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1 hover:bg-[#1897C6]/10 hover:text-[#1897C6]"
                                            onClick={() => { setViewingSchedule(sched); setShowViewSchedule(true) }}>
                                            <Eye className="h-3.5 w-3.5" /><span>View</span>
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1 hover:bg-blue-50 hover:text-blue-600"
                                            onClick={() => openEditSchedule(sched)}>
                                            <Edit className="h-3.5 w-3.5" /><span>Edit</span>
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1 hover:bg-red-50 hover:text-red-600"
                                            onClick={() => openDeleteConfirm('schedule', sched._id!, `${subjectName} schedule`)}>
                                            <Trash2 className="h-3.5 w-3.5" /><span>Delete</span>
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {!examsLoading && totalPages > 1 && (
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2 */}
          <TabsContent value="subjects" className="space-y-4">
            <SubjectsByClass />
          </TabsContent>
        </Tabs>

        {/* View Schedule Dialog */}
        <ScheduleViewDialog
          schedule={viewingSchedule} open={showViewSchedule}
          onClose={() => { setShowViewSchedule(false); setViewingSchedule(null) }}
        />

        {/* View Exam Dialog */}
        <Dialog open={showViewExam} onOpenChange={(o) => { setShowViewExam(o); if (!o) setSelectedExam(null) }}>
          <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{selectedExam?.exam_name ?? 'Exam Details'}</DialogTitle>
              <DialogDescription>View exam type details</DialogDescription>
            </DialogHeader>
            {selectedExam && (
              <>
                <div className="px-5 pt-5 pb-4 border-b">
                  <h2 className="text-lg font-bold leading-snug">{selectedExam.exam_name}</h2>
                  <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {selectedExam.exam_code && <span className="font-mono font-semibold text-[#1897C6]">{selectedExam.exam_code}</span>}
                    {selectedExam.exam_code && <span>•</span>}
                    <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{selectedExam.academic_year}</span>
                    {selectedExam.createdAt && <><span>•</span><span>{formatDate(selectedExam.createdAt)}</span></>}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[selectedExam.exam_type] ?? 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                      {EXAM_TYPE_LABELS[selectedExam.exam_type] ?? selectedExam.exam_type}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedExam.status]}`}>
                      {EXAM_STATUS_LABELS[selectedExam.status]}
                    </span>
                    {selectedExam.term && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                        {selectedExam.term}
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="rounded-xl border bg-blue-50/50 p-4">
                    <h3 className="text-sm font-semibold mb-3">Exam Details</h3>
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      {selectedExam.description
                        ? <p className="text-sm leading-relaxed">{selectedExam.description}</p>
                        : <p className="text-sm text-muted-foreground italic">No description provided.</p>}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Instructions</p>
                      {selectedExam.instructions
                        ? <p className="text-sm leading-relaxed">{selectedExam.instructions}</p>
                        : <p className="text-sm text-muted-foreground italic">No instructions provided.</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <h3 className="text-sm font-semibold mb-3">Schedule</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 rounded-lg bg-white border p-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1897C6]/15 flex items-center justify-center shrink-0">
                          <CalendarCheck className="h-5 w-5 text-[#1897C6]" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Start Date</p>
                          <p className="text-sm font-semibold mt-0.5">{formatDate(selectedExam.start_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-white border p-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                          <CalendarX className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">End Date</p>
                          <p className="text-sm font-semibold mt-0.5">{formatDate(selectedExam.end_date)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <h3 className="text-sm font-semibold mb-3">More Info</h3>
                    <div className="space-y-2">
                      {[
                        { label: 'Academic Year', value: selectedExam.academic_year },
                        { label: 'Exam Code',     value: selectedExam.exam_code },
                        { label: 'Term',          value: selectedExam.term },
                        { label: 'Created',       value: formatDate(selectedExam.createdAt) },
                        { label: 'Last Updated',  value: formatDate(selectedExam.updatedAt) },
                      ].filter(r => r.value && r.value !== '—').map(row => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{row.label}</span>
                          <span className="text-xs font-medium">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 px-5 pb-5">
                  <Button variant="outline" className="flex-1" onClick={() => setShowViewExam(false)}>Close</Button>
                  <Button className="flex-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
                    onClick={() => { setShowViewExam(false); openEditExam(selectedExam) }}>
                    <Edit className="h-4 w-4 mr-2" /> Edit Exam
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Exam Dialog */}
        <Dialog open={showAddExam} onOpenChange={(o) => { if (!examSubmitting) { setShowAddExam(o); if (!o) setExamFormErrors([]) } }}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Exam Type</DialogTitle>
              <DialogDescription>Create a new exam type that will be applicable to all classes</DialogDescription>
            </DialogHeader>
            <ExamForm form={examForm} onChange={(patch) => setExamForm(f => ({ ...f, ...patch }))} errors={examFormErrors} mode="create" />
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowAddExam(false)} disabled={examSubmitting}>Cancel</Button>
              <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={handleCreateExam} disabled={examSubmitting || !isExamCreateValid}>
                {examSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Plus className="h-4 w-4 mr-2" /> Add Exam Type</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Exam Dialog */}
        <Dialog open={showEditExam} onOpenChange={(o) => { if (!examSubmitting) { setShowEditExam(o); if (!o) { setSelectedExam(null); setExamFormErrors([]) } } }}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Exam Type</DialogTitle>
              <DialogDescription>Update details for this exam type</DialogDescription>
            </DialogHeader>
            {selectedExam && (
              <ExamForm form={editExamForm as CreateExamPayload} onChange={(patch) => setEditExamForm(f => ({ ...f, ...patch }))} errors={examFormErrors} mode="edit" />
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowEditExam(false)} disabled={examSubmitting}>Cancel</Button>
              <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={handleUpdateExam} disabled={examSubmitting}>
                {examSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Edit className="h-4 w-4 mr-2" /> Save Changes</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Schedule Dialog */}
        <Dialog open={showScheduleDialog} onOpenChange={(o) => { if (!scheduleSubmitting) { setShowScheduleDialog(o); if (!o) setScheduleFormError(null) } }}>
          <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add Exam Schedule'}</DialogTitle>
              <DialogDescription>{editingSchedule ? 'Update this exam schedule.' : 'Add a new schedule for this exam.'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {scheduleFormError && <InlineError message={scheduleFormError} />}

              <div>
                <Label>Class <span className="text-red-500">*</span></Label>
                <Select value={typeof scheduleForm.class_id === 'string' ? scheduleForm.class_id : ''} onValueChange={onScheduleClassChange}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {scheduleClasses.length === 0
                      ? <SelectItem value="__none" disabled>No classes found</SelectItem>
                      : scheduleClasses.map(c => <SelectItem key={c._id} value={c._id}>Class {c.class_name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Batch <span className="text-red-500">*</span></Label>
                {loadingBatches ? (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading batches…</div>
                ) : (
                  <Select
                    value={typeof scheduleForm.batch_id === 'string' ? scheduleForm.batch_id : ''}
                    onValueChange={(v) => setScheduleForm(prev => ({ ...prev, batch_id: v }))}
                    disabled={!scheduleForm.class_id || scheduleBatches.length === 0}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={scheduleForm.class_id ? (scheduleBatches.length === 0 ? 'No batches found' : 'Select batch') : 'Select class first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleBatches.map(b => (
                        <SelectItem key={b._id} value={b._id!}>
                          {b.batch_name}{b.start_time && b.end_time ? ` (${b.start_time}–${b.end_time})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Subject <span className="text-red-500">*</span></Label>
                {loadingSubjects ? (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…</div>
                ) : (
                  <Select
                    value={typeof scheduleForm.subject_id === 'string' ? scheduleForm.subject_id : ''}
                    onValueChange={(v) => setScheduleForm(prev => ({ ...prev, subject_id: v }))}
                    disabled={!scheduleForm.class_id || scheduleSubjects.length === 0}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={scheduleForm.class_id ? (scheduleSubjects.length === 0 ? 'No subjects found' : 'Select subject') : 'Select class first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleSubjects.map(s => {
                        const subId   = typeof s.subject_id === 'object' ? (s.subject_id as any)._id        : s.subject_id as string
                        const subName = typeof s.subject_id === 'object' ? (s.subject_id as any).subject_name : subId
                        return <SelectItem key={s._id} value={subId}>{subName}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* exam_date — schema: Date, required */}
              <div>
                <Label>Exam Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="mt-1.5"
                  value={typeof scheduleForm.exam_date === 'string' ? scheduleForm.exam_date.split('T')[0] : ''}
                  onChange={e => setScheduleForm(prev => ({ ...prev, exam_date: e.target.value }))}
                />
              </div>

              {/* start_time, end_time — schema: String, default null */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" className="mt-1.5"
                    value={scheduleForm.start_time ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, start_time: e.target.value || null }))}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" className="mt-1.5"
                    value={scheduleForm.end_time ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, end_time: e.target.value || null }))}
                  />
                </div>
              </div>

              {/* duration_minutes, room_number — schema: Number/String, default null */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 180"
                    value={scheduleForm.duration_minutes ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, duration_minutes: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <Label>Room Number</Label>
                  <Input type="text" className="mt-1.5" placeholder="e.g. Room 101"
                    value={scheduleForm.room_number ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, room_number: e.target.value || null }))}
                  />
                </div>
              </div>

              {/* total_marks (required), pass_marks, theory_marks, practical_marks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total Marks <span className="text-red-500">*</span></Label>
                  <Input type="number" min={1} className="mt-1.5" placeholder="e.g. 100"
                    value={scheduleForm.total_marks ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, total_marks: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Pass Marks</Label>
                  <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 40"
                    value={scheduleForm.pass_marks ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, pass_marks: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Theory Marks</Label>
                  <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 70"
                    value={scheduleForm.theory_marks ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, theory_marks: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
                <div>
                  <Label>Practical Marks</Label>
                  <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 30"
                    value={scheduleForm.practical_marks ?? ''}
                    onChange={e => setScheduleForm(prev => ({ ...prev, practical_marks: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
              </div>

              {/* invigilator_id — ref: TeachersMaster → full_name, teacher_code */}
              <div>
                <Label>Invigilator (Teacher)</Label>
                <Select
                  value={typeof scheduleForm.invigilator_id === 'string' ? scheduleForm.invigilator_id : ''}
                  onValueChange={(v) => setScheduleForm(prev => ({ ...prev, invigilator_id: v || null }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select invigilator (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {scheduleTeachers.map(t => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.full_name}{t.teacher_code ? ` (${t.teacher_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* status — enum: scheduled|ongoing|completed|cancelled */}
              <div>
                <Label>Status</Label>
                <Select value={scheduleForm.status ?? 'scheduled'} onValueChange={(v) => setScheduleForm(prev => ({ ...prev, status: v as ExamSchedule['status'] }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={scheduleSubmitting}>Cancel</Button>
              <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white" onClick={handleScheduleSubmit} disabled={scheduleSubmitting}>
                {scheduleSubmitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  : editingSchedule ? <><Edit className="h-4 w-4 mr-2" />Save Changes</> : <><Plus className="h-4 w-4 mr-2" />Add Schedule</>
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirm.open} onOpenChange={(o) => { if (!isDeleting) { setDeleteConfirm(d => ({ ...d, open: o })); if (!o) setDeleteError('') } }}>
          <DialogContent className="max-w-sm w-[95vw]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <DialogTitle className="text-base sm:text-lg">
                  {deleteConfirm.type === 'schedule' ? 'Delete Schedule?' : 'Delete Exam?'}
                </DialogTitle>
              </div>
              <DialogDescription className="pl-[52px] space-y-1 text-sm">
                <span><span className="font-semibold text-foreground">{deleteConfirm.name}</span> will be permanently deleted.</span>
                <span className="block text-xs">This action cannot be undone.</span>
              </DialogDescription>
            </DialogHeader>
            {deleteError && <InlineError message={deleteError} />}
            <DialogFooter className="gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDeleteConfirm(d => ({ ...d, open: false })); setDeleteError('') }} disabled={isDeleting}>Cancel</Button>
              <Button variant="destructive" className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4 mr-2" /> Delete</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ExamForm — matches examsMaster schema exactly
// Fields: exam_name(req), exam_code, exam_type(req), academic_year(req),
//         term, start_date, end_date, description, instructions, status
// ═══════════════════════════════════════════════════════════════

interface ExamFormProps {
  form: Partial<CreateExamPayload>
  onChange: (patch: Partial<CreateExamPayload>) => void
  errors: FormError[]
  mode: 'create' | 'edit'
}

function ExamForm({ form, onChange, errors, mode }: ExamFormProps) {
  const general  = errors.find(e => e.field === 'general')?.message
  const fieldErr = (f: string) => errors.find(e => e.field === f)?.message

  return (
    <div className="space-y-4 py-4">
      {general && <InlineError message={general} />}

      <div>
        <Label htmlFor={`${mode}-exam-name`}>Exam Name <span className="text-red-500">*</span></Label>
        <Input id={`${mode}-exam-name`} placeholder="e.g., Mid-Semester Test 1" className="mt-1.5"
          value={form.exam_name ?? ''} onChange={e => onChange({ exam_name: e.target.value })} />
        {fieldErr('exam_name') && <p className="text-xs text-red-500 mt-1">{fieldErr('exam_name')}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${mode}-exam-code`}>Short Name / Code</Label>
          <Input id={`${mode}-exam-code`} placeholder="e.g., MST-1" className="mt-1.5"
            value={form.exam_code ?? ''} onChange={e => onChange({ exam_code: e.target.value })} />
        </div>
        <div>
          <Label htmlFor={`${mode}-term`}>Term</Label>
          <Input id={`${mode}-term`} placeholder="e.g., Term 1, Q1" className="mt-1.5"
            value={form.term ?? ''} onChange={e => onChange({ term: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${mode}-academic-year`}>Academic Year <span className="text-red-500">*</span></Label>
          <Input id={`${mode}-academic-year`} placeholder="e.g., 2024-2025" className="mt-1.5"
            value={form.academic_year ?? ''} onChange={e => onChange({ academic_year: e.target.value })} />
          {fieldErr('academic_year') && <p className="text-xs text-red-500 mt-1">{fieldErr('academic_year')}</p>}
        </div>
        <div>
          <Label>Exam Type <span className="text-red-500">*</span></Label>
          <Select value={form.exam_type ?? ''} onValueChange={v => onChange({ exam_type: v as ExamMaster['exam_type'] })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>{EXAM_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${mode}-start-date`}>Start Date</Label>
          <Input id={`${mode}-start-date`} type="date" className="mt-1.5"
            value={form.start_date ?? ''} onChange={e => onChange({ start_date: e.target.value })} />
        </div>
        <div>
          <Label htmlFor={`${mode}-end-date`}>End Date</Label>
          <Input id={`${mode}-end-date`} type="date" className="mt-1.5"
            value={form.end_date ?? ''} onChange={e => onChange({ end_date: e.target.value })} />
        </div>
      </div>

      <div>
        <Label>Status</Label>
        <Select value={form.status ?? 'draft'} onValueChange={v => onChange({ status: v as ExamMaster['status'] })}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>{EXAM_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor={`${mode}-description`}>Description</Label>
        <Textarea id={`${mode}-description`} placeholder="Brief description of this exam..." className="mt-1.5 min-h-[70px]"
          value={form.description ?? ''} onChange={e => onChange({ description: e.target.value })} />
      </div>

      <div>
        <Label htmlFor={`${mode}-instructions`}>Instructions</Label>
        <Textarea id={`${mode}-instructions`} placeholder="Instructions for students..." className="mt-1.5 min-h-[70px]"
          value={form.instructions ?? ''} onChange={e => onChange({ instructions: e.target.value })} />
      </div>
    </div>
  )
}






































































// 'use client'

// import { useState, useEffect, useCallback } from 'react'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { Textarea } from '@/components/ui/textarea'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select'
// import {
//   BookOpen,
//   Plus,
//   Edit,
//   Trash2,
//   FileText,
//   GraduationCap,
//   Award,
//   Clock,
//   Target,
//   AlertCircle,
//   Loader2,
//   CalendarDays,
//   RefreshCw,
//   AlertTriangle,
//   Eye,
//   Users,
//   CalendarCheck,
//   CalendarX,
//   BookMarked,
//   MapPin,
// } from 'lucide-react'
// import {
//   examsApi,
//   type ExamMaster,
//   type ExamSchedule,
//   type CreateExamPayload,
//   type UpdateExamPayload,
//   EXAM_TYPE_OPTIONS,
//   EXAM_STATUS_OPTIONS,
//   EXAM_TYPE_LABELS,
//   EXAM_STATUS_LABELS,
// } from '@/lib/api/exams'
// import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'
// import { subjectsByClassApi, type SubjectByClass } from '@/lib/api/subjects'
// import type { ApiResponse } from '@/lib/api/client'
// import SubjectsByClass from '../subjects-by-class/page'
// import { Pagination } from '@/components/pagination'

// // ═══════════════════════════════════════════════════════════════
// // LOCAL TYPES
// // ═══════════════════════════════════════════════════════════════

// interface DeleteConfirm {
//   open: boolean
//   type: 'exam' | 'schedule'
//   id: string
//   name: string
// }

// interface FormError {
//   field: string
//   message: string
// }

// // ═══════════════════════════════════════════════════════════════
// // HELPERS
// // ═══════════════════════════════════════════════════════════════

// function getLS(key: string): string {
//   if (typeof window === 'undefined') return ''
//   return localStorage.getItem(key) ?? ''
// }

// function getCurrentAcademicYear(): string {
//   const now = new Date()
//   const year = now.getFullYear()
//   const month = now.getMonth() + 1
//   return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`
// }

// function extractArray<T>(res: unknown): T[] {
//   if (!res) return []
//   if (Array.isArray(res)) return res as T[]
//   const r = res as Record<string, unknown>
//   if (Array.isArray(r.result)) return r.result as T[]
//   if (Array.isArray(r.data)) return r.data as T[]
//   return []
// }

// // ── User-friendly errors — no technical terms shown to user ──
// function friendlyError(err: unknown): string {
//   if (!err) return 'Something went wrong. Please try again.'
//   const asRes = err as ApiResponse<unknown>
//   if (typeof asRes === 'object' && 'success' in asRes && !asRes.success) {
//     const m = asRes.message ?? asRes.error ?? ''
//     if (m) return friendlyError(new Error(m as string))
//   }
//   const msg: string =
//     (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
//     (err as { message?: string })?.message ??
//     String(err)

//   if (/network|fetch|econnrefused|failed to fetch/i.test(msg))
//     return 'Unable to connect to the server. Please check your internet connection and try again.'
//   if (/unauthorized|401|forbidden|403/i.test(msg))
//     return 'Your session has expired. Please log in again.'
//   if (/not found|404/i.test(msg))
//     return 'The record was not found. It may have already been deleted.'
//   if (/duplicate|already exists|conflict|409/i.test(msg))
//     return 'A record with this information already exists. Please use different details.'
//   if (/already has an exam scheduled/i.test(msg))
//     return 'There is already an exam scheduled at this date and time. Please choose a different slot.'
//   if (/teacher already has/i.test(msg))
//     return 'This invigilator is already assigned to another exam at the same time.'
//   if (/class.*section.*already/i.test(msg))
//     return 'This class already has an exam scheduled at the same date and time.'
//   if (/objectid|cast|validation|schema|mongoose|stack|at Object|at Array|_id|path/i.test(msg))
//     return 'Something went wrong. Please check your inputs and try again.'
//   if (msg.length > 0 && msg.length < 150 && !/[{[<]/.test(msg))
//     return msg
//   return 'Something went wrong. Please try again.'
// }

// function makeEmptyExamForm(instituteId: string, adminId: string): CreateExamPayload {
//   return {
//     institute_id: instituteId,
//     exam_name: '',
//     exam_code: '',
//     exam_type: 'quarterly',
//     academic_year: getCurrentAcademicYear(),
//     term: '',
//     start_date: '',
//     end_date: '',
//     description: '',
//     instructions: '',
//     status: 'draft',
//     created_by: adminId || null,
//     created_by_role: 'institute_admin',
//   }
// }

// function formatDate(dateStr: string | null | undefined): string {
//   if (!dateStr) return '—'
//   try {
//     return new Date(dateStr).toLocaleDateString('en-IN', {
//       day: '2-digit', month: 'short', year: 'numeric',
//     })
//   } catch {
//     return dateStr
//   }
// }

// // ── Safe helper to extract populated field from backend response ──
// // Backend uses .populate("field", "key") — result is an object or null
// function getPopulatedString(field: unknown, key: string, prefix = ''): string {
//   if (field !== null && field !== undefined && typeof field === 'object') {
//     const val = (field as Record<string, unknown>)[key]
//     if (val) return prefix ? `${prefix} ${val}` : String(val)
//   }
//   return '—'
// }

// // ═══════════════════════════════════════════════════════════════
// // COLOR MAPS — match exact backend enum values
// // ═══════════════════════════════════════════════════════════════

// const STATUS_COLORS: Record<ExamMaster['status'], string> = {
//   draft:     'bg-yellow-100 text-yellow-700 border border-yellow-300',
//   scheduled: 'bg-blue-100 text-blue-700 border border-blue-300',
//   ongoing:   'bg-green-100 text-green-700 border border-green-300',
//   completed: 'bg-gray-100 text-gray-600 border border-gray-300',
//   archived:  'bg-red-100 text-red-700 border border-red-300',
// }

// // exam_type enum: quarterly|half_yearly|annual|unit_test|mock|entrance|competitive
// const TYPE_COLORS: Record<ExamMaster['exam_type'], string> = {
//   quarterly:   'bg-purple-100 text-purple-700 border border-purple-300',
//   half_yearly: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
//   annual:      'bg-red-100 text-red-700 border border-red-300',
//   unit_test:   'bg-orange-100 text-orange-700 border border-orange-300',
//   mock:        'bg-cyan-100 text-cyan-700 border border-cyan-300',
//   entrance:    'bg-pink-100 text-pink-700 border border-pink-300',
//   competitive: 'bg-teal-100 text-teal-700 border border-teal-300',
// }

// // schedule status enum: scheduled|ongoing|completed|cancelled
// const SCHED_STATUS_COLORS: Record<string, string> = {
//   scheduled: 'bg-blue-100 text-blue-700 border-blue-300',
//   ongoing:   'bg-green-100 text-green-700 border-green-300',
//   completed: 'bg-gray-100 text-gray-600 border-gray-300',
//   cancelled: 'bg-red-100 text-red-700 border-red-300',
// }

// // ═══════════════════════════════════════════════════════════════
// // SHARED INLINE COMPONENTS
// // ═══════════════════════════════════════════════════════════════

// function InlineError({ message }: { message?: string }) {
//   if (!message) return null
//   return (
//     <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
//       <AlertCircle className="h-3.5 w-3.5 shrink-0" />
//       <span>{message}</span>
//     </div>
//   )
// }

// function EmptyState({ icon: Icon, title, description, action }: {
//   icon: React.ElementType; title: string; description: string; action?: React.ReactNode
// }) {
//   return (
//     <div className="flex flex-col items-center justify-center py-16 text-center">
//       <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1897C6]/10 to-[#67BAC3]/10 flex items-center justify-center mb-4">
//         <Icon className="h-8 w-8 text-[#1897C6]" />
//       </div>
//       <h3 className="text-base font-semibold mb-1">{title}</h3>
//       <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
//       {action}
//     </div>
//   )
// }

// // ═══════════════════════════════════════════════════════════════
// // SCHEDULE VIEW DIALOG
// // Displays all schema fields. Populated by backend:
// //   class_id    → class_name
// //   batch_id    → batch_name
// //   subject_id  → subject_name
// //   invigilator_id → full_name, teacher_code
// // ═══════════════════════════════════════════════════════════════

// function ScheduleViewDialog({ schedule, open, onClose }: {
//   schedule: ExamSchedule | null; open: boolean; onClose: () => void
// }) {
//   if (!schedule) return null

//   const clsName       = getPopulatedString(schedule.class_id,      'class_name',  'Class')
//   const batchName     = getPopulatedString(schedule.batch_id,      'batch_name')
//   const subjectName   = getPopulatedString(schedule.subject_id,    'subject_name')
//   const invigilator   = getPopulatedString(schedule.invigilator_id,'full_name')
//   const invigilCode   = schedule.invigilator_id !== null &&
//     schedule.invigilator_id !== undefined &&
//     typeof schedule.invigilator_id === 'object'
//     ? (schedule.invigilator_id as any).teacher_code ?? null : null
//   const schedStatus   = schedule.status ?? 'scheduled'

//   return (
//     <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
//       <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
//         <DialogHeader className="sr-only">
//           <DialogTitle>Schedule Details</DialogTitle>
//           <DialogDescription>View exam schedule details</DialogDescription>
//         </DialogHeader>

//         <div className="px-5 pt-5 pb-4 border-b bg-gradient-to-br from-[#1897C6]/5 to-[#67BAC3]/5">
//           <div className="flex items-start gap-3">
//             <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
//               <BookMarked className="h-5 w-5 text-white" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <h2 className="text-base font-bold leading-snug truncate">{subjectName}</h2>
//               <div className="flex flex-wrap gap-1.5 mt-2">
//                 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${SCHED_STATUS_COLORS[schedStatus] ?? 'bg-gray-100 text-gray-600 border-gray-300'}`}>
//                   {schedStatus}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="px-5 py-4 space-y-4">
//           {/* Class & Batch */}
//           <div className="rounded-xl border bg-muted/20 p-4">
//             <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Class & Batch</h3>
//             <div className="grid grid-cols-2 gap-3">
//               <div>
//                 <p className="text-xs text-muted-foreground">Class</p>
//                 <p className="text-sm font-semibold mt-0.5">{clsName}</p>
//               </div>
//               <div>
//                 <p className="text-xs text-muted-foreground">Batch</p>
//                 <p className="text-sm font-semibold mt-0.5">{batchName}</p>
//               </div>
//             </div>
//           </div>

//           {/* Date / Time / Room — schema fields: exam_date, start_time, end_time, duration_minutes, room_number */}
//           <div className="rounded-xl border p-4">
//             <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Schedule Details</h3>
//             <div className="space-y-2.5">
//               <div className="flex items-center gap-3">
//                 <div className="w-8 h-8 rounded-lg bg-[#1897C6]/10 flex items-center justify-center shrink-0">
//                   <CalendarCheck className="h-4 w-4 text-[#1897C6]" />
//                 </div>
//                 <div>
//                   <p className="text-xs text-muted-foreground">Exam Date</p>
//                   <p className="text-sm font-semibold">{formatDate(schedule.exam_date)}</p>
//                 </div>
//               </div>
//               {(schedule.start_time || schedule.end_time) && (
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
//                     <Clock className="h-4 w-4 text-purple-600" />
//                   </div>
//                   <div>
//                     <p className="text-xs text-muted-foreground">Time</p>
//                     <p className="text-sm font-semibold">
//                       {schedule.start_time ?? '—'}{schedule.end_time ? ` → ${schedule.end_time}` : ''}
//                     </p>
//                   </div>
//                 </div>
//               )}
//               {schedule.duration_minutes != null && (
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
//                     <Clock className="h-4 w-4 text-orange-500" />
//                   </div>
//                   <div>
//                     <p className="text-xs text-muted-foreground">Duration</p>
//                     <p className="text-sm font-semibold">{schedule.duration_minutes} minutes</p>
//                   </div>
//                 </div>
//               )}
//               {schedule.room_number && (
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
//                     <MapPin className="h-4 w-4 text-green-600" />
//                   </div>
//                   <div>
//                     <p className="text-xs text-muted-foreground">Room</p>
//                     <p className="text-sm font-semibold">{schedule.room_number}</p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Marks — schema fields: total_marks, pass_marks, theory_marks, practical_marks */}
//           <div className="rounded-xl border p-4">
//             <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Marks</h3>
//             <div className="grid grid-cols-2 gap-2">
//               {([
//                 { label: 'Total Marks', value: schedule.total_marks },
//                 { label: 'Pass Marks',  value: schedule.pass_marks },
//                 { label: 'Theory',      value: schedule.theory_marks },
//                 { label: 'Practical',   value: schedule.practical_marks },
//               ] as { label: string; value: number | null | undefined }[])
//                 .filter(r => r.value != null)
//                 .map(({ label, value }) => (
//                   <div key={label} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
//                     <span className="text-xs text-muted-foreground">{label}</span>
//                     <span className="text-sm font-bold text-[#1897C6]">{value}</span>
//                   </div>
//                 ))}
//             </div>
//           </div>

//           {/* Invigilator — schema field: invigilator_id → full_name, teacher_code */}
//           {invigilator !== '—' && (
//             <div className="rounded-xl border p-4">
//               <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Invigilator</h3>
//               <p className="text-sm font-semibold">{invigilator}</p>
//               {invigilCode && <p className="text-xs text-muted-foreground font-mono mt-0.5">{invigilCode}</p>}
//             </div>
//           )}
//         </div>

//         <div className="px-5 pb-5">
//           <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }

// // ═══════════════════════════════════════════════════════════════
// // MAIN PAGE
// // ═══════════════════════════════════════════════════════════════

// export default function ExamsPage() {
//   const [instituteId, setInstituteId] = useState('')
//   const [adminId, setAdminId] = useState('')

//   const [exams, setExams] = useState<ExamMaster[]>([])
//   const [examsLoading, setExamsLoading] = useState(true)
//   const [examsError, setExamsError] = useState('')

//   const [filterType,   setFilterType]   = useState('all')
//   const [filterStatus, setFilterStatus] = useState('all')
//   const [filterYear,   setFilterYear]   = useState('all')
//   const [currentPage,  setCurrentPage]  = useState(1)
//   const PAGE_SIZE = 8

//   const [showAddExam,   setShowAddExam]   = useState(false)
//   const [showEditExam,  setShowEditExam]  = useState(false)
//   const [showViewExam,  setShowViewExam]  = useState(false)
//   const [selectedExam,  setSelectedExam]  = useState<ExamMaster | null>(null)
//   const [examForm,      setExamForm]      = useState<CreateExamPayload>(makeEmptyExamForm('', ''))
//   const [editExamForm,  setEditExamForm]  = useState<UpdateExamPayload>({})
//   const [examFormErrors,setExamFormErrors]= useState<FormError[]>([])
//   const [examSubmitting,setExamSubmitting]= useState(false)

//   const [classesCount, setClassesCount] = useState(0)

//   const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>({ open: false, type: 'exam', id: '', name: '' })
//   const [isDeleting,    setIsDeleting]    = useState(false)
//   const [deleteError,   setDeleteError]   = useState('')

//   // Schedules
//   const [expandedExamId,   setExpandedExamId]   = useState<string | null>(null)
//   const [schedulesMap,     setSchedulesMap]      = useState<Record<string, ExamSchedule[]>>({})
//   const [schedulesLoading, setSchedulesLoading]  = useState<Record<string, boolean>>({})

//   const [viewingSchedule,   setViewingSchedule]   = useState<ExamSchedule | null>(null)
//   const [showViewSchedule,  setShowViewSchedule]  = useState(false)
//   const [showScheduleDialog,setShowScheduleDialog]= useState(false)
//   const [editingSchedule,   setEditingSchedule]   = useState<ExamSchedule | null>(null)
//   const [scheduleExamId,    setScheduleExamId]    = useState<string>('')
//   const [scheduleClasses,   setScheduleClasses]   = useState<ClassMaster[]>([])
//   const [scheduleBatches,   setScheduleBatches]   = useState<CoachingBatch[]>([])
//   const [scheduleSubjects,  setScheduleSubjects]  = useState<SubjectByClass[]>([])
//   const [scheduleForm,      setScheduleForm]      = useState<Partial<ExamSchedule>>({})
//   const [scheduleSubmitting,setScheduleSubmitting]= useState(false)
//   const [scheduleFormError, setScheduleFormError] = useState<string | null>(null)
//   const [loadingBatches,    setLoadingBatches]    = useState(false)
//   const [loadingSubjects,   setLoadingSubjects]   = useState(false)
//   const [scheduleTeachers,  setScheduleTeachers]  = useState<import('@/lib/api/teachers').Teacher[]>([])

//   useEffect(() => {
//     const iId = getLS('instituteId')
//     const aId = getLS('adminId')
//     setInstituteId(iId); setAdminId(aId)
//     setExamForm(makeEmptyExamForm(iId, aId))
//   }, [])

//   useEffect(() => {
//     const iId = getLS('instituteId')
//     if (!iId) return
//     classesApi.getAll({ instituteId: iId, status: 'active' })
//       .then((res) => setClassesCount(extractArray<ClassMaster>(res).length))
//       .catch(() => setClassesCount(0))
//   }, [])

//   const fetchExams = useCallback(async () => {
//     const iId = getLS('instituteId')
//     if (!iId) { setExamsLoading(false); return }
//     setExamsLoading(true); setExamsError('')
//     try {
//       const query: Parameters<typeof examsApi.getAll>[0] = { institute_id: iId }
//       if (filterType   !== 'all') query.exam_type     = filterType
//       if (filterStatus !== 'all') query.status        = filterStatus
//       if (filterYear   !== 'all') query.academic_year = filterYear
//       const res = await examsApi.getAll(query)
//       setExams(extractArray<ExamMaster>(res))
//     } catch (err) {
//       setExamsError(friendlyError(err))
//     } finally { setExamsLoading(false) }
//   }, [filterType, filterStatus, filterYear])

//   useEffect(() => { fetchExams() }, [fetchExams])

//   function validateExamForm(form: CreateExamPayload | UpdateExamPayload): FormError[] {
//     const errs: FormError[] = []
//     const name = (form as CreateExamPayload).exam_name ?? (form as UpdateExamPayload).exam_name ?? ''
//     if (!name.trim()) errs.push({ field: 'exam_name', message: 'Exam name is required.' })
//     const yr = (form as CreateExamPayload).academic_year ?? (form as UpdateExamPayload).academic_year ?? ''
//     if (!yr.trim()) errs.push({ field: 'academic_year', message: 'Academic year is required.' })
//     return errs
//   }

//   const handleCreateExam = async () => {
//     const errs = validateExamForm(examForm)
//     if (errs.length > 0) { setExamFormErrors(errs); return }
//     setExamFormErrors([]); setExamSubmitting(true)
//     try {
//       await examsApi.create({
//         ...examForm,
//         exam_code:    examForm.exam_code    || null,
//         term:         examForm.term         || null,
//         start_date:   examForm.start_date   || null,
//         end_date:     examForm.end_date     || null,
//         description:  examForm.description  || null,
//         instructions: examForm.instructions || null,
//       })
//       setShowAddExam(false)
//       setExamForm(makeEmptyExamForm(instituteId, adminId))
//       await fetchExams()
//     } catch (err) {
//       setExamFormErrors([{ field: 'general', message: friendlyError(err) }])
//     } finally { setExamSubmitting(false) }
//   }

//   const handleUpdateExam = async () => {
//     if (!selectedExam) return
//     const errs = validateExamForm(editExamForm)
//     if (errs.length > 0) { setExamFormErrors(errs); return }
//     setExamFormErrors([]); setExamSubmitting(true)
//     try {
//       await examsApi.update(selectedExam._id, {
//         ...editExamForm,
//         exam_code:    editExamForm.exam_code    || null,
//         term:         editExamForm.term         || null,
//         start_date:   editExamForm.start_date   || null,
//         end_date:     editExamForm.end_date     || null,
//         description:  editExamForm.description  || null,
//         instructions: editExamForm.instructions || null,
//       })
//       setShowEditExam(false); setSelectedExam(null); await fetchExams()
//     } catch (err) {
//       setExamFormErrors([{ field: 'general', message: friendlyError(err) }])
//     } finally { setExamSubmitting(false) }
//   }

//   const openViewExam = (exam: ExamMaster) => { setSelectedExam(exam); setShowViewExam(true) }

//   const openEditExam = (exam: ExamMaster) => {
//     setSelectedExam(exam); setExamFormErrors([])
//     setEditExamForm({
//       exam_name:    exam.exam_name,
//       exam_code:    exam.exam_code    ?? null,
//       exam_type:    exam.exam_type,
//       academic_year:exam.academic_year,
//       term:         exam.term         ?? '',
//       start_date:   exam.start_date   ? exam.start_date.split('T')[0] : '',
//       end_date:     exam.end_date     ? exam.end_date.split('T')[0]   : '',
//       description:  exam.description  ?? '',
//       instructions: exam.instructions ?? '',
//       status:       exam.status,
//     })
//     setShowEditExam(true)
//   }

//   const openDeleteConfirm = (type: 'exam' | 'schedule', id: string, name: string) => {
//     if (!id) return
//     setDeleteError('')
//     setDeleteConfirm({ open: true, type, id, name })
//   }

//   // getAllSchedules populates: class_id, batch_id, subject_id, invigilator_id
//   const fetchSchedules = async (examId: string) => {
//     setSchedulesLoading(prev => ({ ...prev, [examId]: true }))
//     try {
//       const res = await examsApi.getAllSchedules({ exam_id: examId })
//       const list: ExamSchedule[] = Array.isArray(res) ? res : (res as any)?.result ?? []
//       setSchedulesMap(prev => ({ ...prev, [examId]: list }))
//     } catch {
//       setSchedulesMap(prev => ({ ...prev, [examId]: [] }))
//     } finally {
//       setSchedulesLoading(prev => ({ ...prev, [examId]: false }))
//     }
//   }

//   const toggleExamExpand = (examId: string) => {
//     if (expandedExamId === examId) {
//       setExpandedExamId(null)
//     } else {
//       setExpandedExamId(examId)
//       fetchSchedules(examId) // always refresh on open
//     }
//   }

//   const openAddSchedule = async (examId: string) => {
//     setEditingSchedule(null); setScheduleExamId(examId); setScheduleFormError(null)
//     setScheduleForm({
//       exam_id: examId, status: 'scheduled',
//       total_marks: 100, pass_marks: 40,
//       start_time: '', end_time: '', duration_minutes: null, room_number: '',
//     })
//     const iId = getLS('instituteId')
//     try {
//       const res = await classesApi.getAll({ instituteId: iId, status: 'active' })
//       setScheduleClasses(Array.isArray(res) ? res : (res as any)?.result ?? [])
//     } catch { setScheduleClasses([]) }
//     setScheduleBatches([]); setScheduleSubjects([])
//     // Fetch teachers for invigilator dropdown
//     try {
//       const res = await import('@/lib/api/teachers').then(m => m.teachersApi.getAll({ instituteId: iId, status: 'active' }))
//       const list = Array.isArray(res) ? res : (res as any)?.result ?? []
//       setScheduleTeachers(list)
//     } catch { setScheduleTeachers([]) }
//     setShowScheduleDialog(true)
//   }

//   const openEditSchedule = async (schedule: ExamSchedule) => {
//     setEditingSchedule(schedule)
//     setScheduleExamId(
//       typeof schedule.exam_id === 'object' ? (schedule.exam_id as any)._id : schedule.exam_id as string
//     )
//     setScheduleFormError(null)

//     // Extract IDs from populated objects (backend returns objects after populate)
//     const classId   = typeof schedule.class_id === 'object' && schedule.class_id !== null
//       ? (schedule.class_id as any)._id   : schedule.class_id as string
//     const batchId   = typeof schedule.batch_id === 'object' && schedule.batch_id !== null
//       ? (schedule.batch_id as any)._id   : schedule.batch_id as string | null
//     const subjectId = typeof schedule.subject_id === 'object' && schedule.subject_id !== null
//       ? (schedule.subject_id as any)._id : schedule.subject_id as string

//     setScheduleForm({
//       exam_id:          typeof schedule.exam_id === 'object' ? (schedule.exam_id as any)._id : schedule.exam_id,
//       class_id:         classId,
//       batch_id:         batchId,
//       subject_id:       subjectId,
//       exam_date:        schedule.exam_date ? schedule.exam_date.split('T')[0] : '',
//       total_marks:      schedule.total_marks,
//       pass_marks:       schedule.pass_marks       ?? null,
//       theory_marks:     schedule.theory_marks     ?? undefined,
//       practical_marks:  schedule.practical_marks  ?? undefined,
//       status:           schedule.status           ?? 'scheduled',
//       // All 4 optional schema fields:
//       start_time:       schedule.start_time       ?? '',
//       end_time:         schedule.end_time         ?? '',
//       duration_minutes: schedule.duration_minutes ?? null,
//       room_number:      schedule.room_number      ?? '',
//       invigilator_id:   typeof schedule.invigilator_id === 'object' && schedule.invigilator_id !== null
//         ? (schedule.invigilator_id as any)._id
//         : schedule.invigilator_id ?? null,
//     })

//     const iId = getLS('instituteId')
//     try {
//       const res = await classesApi.getAll({ instituteId: iId, status: 'active' })
//       setScheduleClasses(Array.isArray(res) ? res : (res as any)?.result ?? [])
//     } catch { setScheduleClasses([]) }

//     if (classId) {
//       setLoadingBatches(true)
//       try {
//         const res = await classesApi.getBatchesByClass(classId)
//         setScheduleBatches(Array.isArray(res) ? res : (res as any)?.result ?? [])
//       } catch { setScheduleBatches([]) }
//       finally { setLoadingBatches(false) }

//       setLoadingSubjects(true)   
//       try {
//         const res = await subjectsByClassApi.getByClass(classId)
//         const list: SubjectByClass[] = Array.isArray(res) ? res : (res as any)?.result ?? []
//         setScheduleSubjects(list.filter(s => s.status === 'active'))
//       } catch { setScheduleSubjects([]) }
//       finally { setLoadingSubjects(false) }
//     }
//     // Fetch teachers for invigilator dropdown
//     try {
//       const res = await import('@/lib/api/teachers').then(m => m.teachersApi.getAll({ instituteId: iId, status: 'active' }))
//       const list = Array.isArray(res) ? res : (res as any)?.result ?? []
//       setScheduleTeachers(list)
//     } catch { setScheduleTeachers([]) }
//     setShowScheduleDialog(true)
//   }

//   const onScheduleClassChange = async (classId: string) => {
//     setScheduleForm(prev => ({ ...prev, class_id: classId, batch_id: null, subject_id: undefined }))
//     setScheduleBatches([]); setScheduleSubjects([])
//     setLoadingBatches(true)
//     try {
//       const res = await classesApi.getBatchesByClass(classId)
//       setScheduleBatches(Array.isArray(res) ? res : (res as any)?.result ?? [])
//     } catch { setScheduleBatches([]) }
//     finally { setLoadingBatches(false) }
//     setLoadingSubjects(true)
//     try {
//       const res = await subjectsByClassApi.getByClass(classId)
//       const list: SubjectByClass[] = Array.isArray(res) ? res : (res as any)?.result ?? []
//       setScheduleSubjects(list.filter(s => s.status === 'active'))
//     } catch { setScheduleSubjects([]) }
//     finally { setLoadingSubjects(false) }
//   }

//   // All payload fields match backend schema exactly
//   const handleScheduleSubmit = async () => {
//     setScheduleFormError(null)
//     if (!scheduleForm.class_id)    { setScheduleFormError('Please select a class.');      return }
//     if (!scheduleForm.batch_id)    { setScheduleFormError('Please select a batch.');      return }
//     if (!scheduleForm.subject_id)  { setScheduleFormError('Please select a subject.');    return }
//     if (!scheduleForm.exam_date)   { setScheduleFormError('Please select an exam date.'); return }
//     if (!scheduleForm.total_marks) { setScheduleFormError('Total marks is required.');    return }

//     setScheduleSubmitting(true)
//     try {
//       const commonPayload = {
//         class_id:         scheduleForm.class_id   as string,
//         batch_id:         scheduleForm.batch_id   as string,
//         subject_id:       scheduleForm.subject_id as string,
//         exam_date:        scheduleForm.exam_date  as string,
//         total_marks:      Number(scheduleForm.total_marks),
//         pass_marks:       scheduleForm.pass_marks      ? Number(scheduleForm.pass_marks)      : null,
//         theory_marks:     scheduleForm.theory_marks    ? Number(scheduleForm.theory_marks)    : null,
//         practical_marks:  scheduleForm.practical_marks ? Number(scheduleForm.practical_marks) : null,
//         status:           (scheduleForm.status as ExamSchedule['status']) ?? 'scheduled',
//         start_time:       scheduleForm.start_time      || null,
//         end_time:         scheduleForm.end_time        || null,
//         duration_minutes: scheduleForm.duration_minutes ? Number(scheduleForm.duration_minutes) : null,
//         room_number:      scheduleForm.room_number     || null,
//         invigilator_id:   scheduleForm.invigilator_id  || null,
//       }

//       if (editingSchedule?._id) {
//         await examsApi.updateSchedule(editingSchedule._id, commonPayload)
//       } else {
//         await examsApi.createSchedule({
//           ...commonPayload,
//           exam_id:    scheduleExamId,
//           section_id: null, // schema field, default null
//         })
//       }
//       setShowScheduleDialog(false)
//       await fetchSchedules(scheduleExamId)
//     } catch (err) {
//       setScheduleFormError(friendlyError(err))
//     } finally {
//       setScheduleSubmitting(false)
//     }
//   }

//   const handleConfirmDelete = async () => {
//     setIsDeleting(true); setDeleteError('')
//     try {
//       if (deleteConfirm.type === 'schedule') {
//         await examsApi.deleteSchedule(deleteConfirm.id)
//         setSchedulesMap(prev => {
//           const updated = { ...prev }
//           for (const examId of Object.keys(updated)) {
//             updated[examId] = updated[examId].filter(s => s._id !== deleteConfirm.id)
//           }
//           return updated
//         })
//       } else {
//         await examsApi.delete(deleteConfirm.id)
//         await fetchExams()
//       }
//       setDeleteConfirm({ open: false, type: 'exam', id: '', name: '' })
//     } catch (err) {
//       setDeleteError(friendlyError(err))
//     } finally { setIsDeleting(false) }
//   }

//   const academicYears = Array.from(new Set(exams.map((e) => e.academic_year))).sort().reverse()
//   const totalPages    = Math.ceil(exams.length / PAGE_SIZE)
//   const paginatedExams= exams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
//   const examStats = {
//     total:     exams.length,
//     active:    exams.filter(e => e.status === 'ongoing' || e.status === 'scheduled').length,
//     completed: exams.filter(e => e.status === 'completed').length,
//     draft:     exams.filter(e => e.status === 'draft').length,
//   }
//   const isExamCreateValid =
//     examForm.exam_name.trim().length > 0 && !!examForm.exam_type && examForm.academic_year.trim().length > 0

//   return (
//     <div className="min-h-screen bg-background">
//       <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">

//         {/* Header */}
//         <div className="mb-6 sm:mb-8">
//           <div className="flex items-center gap-2 sm:gap-3 mb-2">
//             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
//               <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Exams Management</h1>
//               <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Configure exam types and batch-wise subject allocation</p>
//             </div>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
//           {[
//             { icon: Award,         color: 'text-[#1897C6]',  bg: 'bg-[#1897C6]',  value: examStats.total,  label: 'Exam Types' },
//             { icon: GraduationCap, color: 'text-green-600',  bg: 'bg-green-600',  value: classesCount,     label: 'Classes' },
//             { icon: Users,         color: 'text-purple-600', bg: 'bg-purple-600', value: examStats.active, label: 'Active Exams' },
//             { icon: BookOpen,      color: 'text-orange-600', bg: 'bg-orange-600', value: examStats.draft,  label: 'Draft Exams' },
//           ].map(({ icon: Icon, color, bg, value, label }) => (
//             <Card key={label} className="border-2">
//               <CardContent className="p-3 sm:p-4">
//                 <div className="flex items-center justify-between mb-2">
//                   <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
//                   <Badge className={`${bg} text-xs text-white`}>{value}</Badge>
//                 </div>
//                 <p className="text-xl sm:text-2xl font-bold">{value}</p>
//                 <p className="text-xs text-muted-foreground mt-1">{label}</p>
//               </CardContent>
//             </Card>
//           ))}
//         </div>

//         {/* Tabs */}
//         <Tabs defaultValue="exam-types" className="space-y-4 sm:space-y-6">
//           <TabsList className="grid w-full grid-cols-2 h-auto">
//             <TabsTrigger value="exam-types" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
//               <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="truncate">Exam Types</span>
//             </TabsTrigger>
//             <TabsTrigger value="subjects" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
//               <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="truncate">Subjects by Class</span>
//             </TabsTrigger>
//           </TabsList>

//           {/* TAB 1 */}
//           <TabsContent value="exam-types" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//                   <div>
//                     <CardTitle>Examination Types</CardTitle>
//                     <CardDescription className="mt-1.5">Define exam types that apply to all classes across the institute</CardDescription>
//                   </div>
//                   <div className="flex gap-2 shrink-0">
//                     <Button variant="outline" size="sm" onClick={fetchExams} disabled={examsLoading} title="Refresh">
//                       <RefreshCw className={`h-4 w-4 ${examsLoading ? 'animate-spin' : ''}`} />
//                     </Button>
//                     <Button onClick={() => { setExamForm(makeEmptyExamForm(instituteId, adminId)); setExamFormErrors([]); setShowAddExam(true) }}
//                       className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full md:w-auto">
//                       <Plus className="h-4 w-4 mr-2" /> Add Exam Type
//                     </Button>
//                   </div>
//                 </div>
//                 {/* Filters */}
//                 <div className="flex flex-wrap gap-2 pt-3">
//                   <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1) }}>
//                     <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Types</SelectItem>
//                       {EXAM_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
//                     </SelectContent>
//                   </Select>
//                   <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1) }}>
//                     <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Status</SelectItem>
//                       {EXAM_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
//                     </SelectContent>
//                   </Select>
//                   <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setCurrentPage(1) }}>
//                     <SelectTrigger className="w-[136px] h-8 text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Years</SelectItem>
//                       {academicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </CardHeader>

//               <CardContent>
//                 {examsError && (
//                   <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
//                     <AlertCircle className="h-4 w-4 shrink-0" />
//                     <span className="flex-1">{examsError}</span>
//                     <button onClick={fetchExams} className="flex items-center gap-1 text-xs underline hover:no-underline shrink-0">
//                       <RefreshCw className="h-3 w-3" /> Retry
//                     </button>
//                   </div>
//                 )}

//                 {examsLoading ? (
//                   <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground text-sm">
//                     <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" /> Loading exams…
//                   </div>
//                 ) : exams.length === 0 ? (
//                   <EmptyState icon={Award} title="No Exams Found"
//                     description="No exam types have been created yet. Add your first one to get started."
//                     action={
//                       <Button onClick={() => { setExamForm(makeEmptyExamForm(instituteId, adminId)); setExamFormErrors([]); setShowAddExam(true) }}
//                         className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]">
//                         <Plus className="h-4 w-4 mr-2" /> Add Exam Type
//                       </Button>
//                     }
//                   />
//                 ) : (
//                   <div className="space-y-3">
//                     {paginatedExams.map((exam) => (
//                       <Card key={exam._id} className="border-2 hover:border-[#1897C6]/50 transition-colors">
//                         <CardContent className="p-3 sm:p-4">

//                           {/* Exam Row */}
//                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
//                             <div className="flex items-center gap-3 flex-1 min-w-0">
//                               <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
//                                 <Award className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <h3 className="font-semibold text-sm sm:text-base truncate">{exam.exam_name}</h3>
//                                 <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
//                                   {exam.exam_code && (
//                                     <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-xs font-mono font-medium">
//                                       {exam.exam_code}
//                                     </span>
//                                   )}
//                                   {exam.term && (
//                                     <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
//                                       {exam.term}
//                                     </span>
//                                   )}
//                                   <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[exam.exam_type] ?? 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
//                                     {EXAM_TYPE_LABELS[exam.exam_type] ?? exam.exam_type}
//                                   </span>
//                                   <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[exam.status]}`}>
//                                     {EXAM_STATUS_LABELS[exam.status]}
//                                   </span>
//                                   <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
//                                     <Clock className="h-3 w-3" />{exam.academic_year}
//                                   </span>
//                                   {exam.start_date && (
//                                     <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1897C6]">
//                                       <Target className="h-3 w-3" />
//                                       {formatDate(exam.start_date)}{exam.end_date ? ` → ${formatDate(exam.end_date)}` : ''}
//                                     </span>
//                                   )}
//                                 </div>
//                               </div>
//                             </div>

//                             <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
//                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-[#1897C6]/10 hover:text-[#1897C6]" title="View" onClick={() => openViewExam(exam)}>
//                                 <Eye className="h-4 w-4" />
//                               </Button>
//                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-blue-50 hover:text-blue-600" title="Edit" onClick={() => openEditExam(exam)}>
//                                 <Edit className="h-4 w-4" />
//                               </Button>
//                               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => openDeleteConfirm('exam', exam._id, exam.exam_name)}>
//                                 <Trash2 className="h-4 w-4" />
//                               </Button>
//                               <div className="w-px h-5 bg-border mx-0.5" />
//                               <Button
//                                 variant="ghost" size="sm"
//                                 className={`h-8 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${expandedExamId === exam._id ? 'bg-[#1897C6]/10 text-[#1897C6]' : 'hover:bg-[#1897C6]/10 hover:text-[#1897C6]'}`}
//                                 onClick={() => toggleExamExpand(exam._id)}
//                               >
//                                 <CalendarDays className="h-3.5 w-3.5" />
//                                 <span className="hidden sm:inline text-xs">Schedules</span>
//                                 {schedulesMap[exam._id]?.length > 0 && (
//                                   <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-[#1897C6] text-white text-[10px] font-bold">
//                                     {schedulesMap[exam._id].length}
//                                   </span>
//                                 )}
//                               </Button>
//                             </div>
//                           </div>

//                           {/* Schedules Expanded */}
//                           {expandedExamId === exam._id && (
//                             <div className="mt-3 pt-3 border-t border-dashed">
//                               <div className="flex items-center justify-between mb-3 gap-2">
//                                 <div className="flex items-center gap-2">
//                                   <CalendarDays className="h-4 w-4 text-[#1897C6] shrink-0" />
//                                   <span className="text-sm font-semibold text-[#1897C6]">Exam Schedules</span>
//                                   {schedulesMap[exam._id] && (
//                                     <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-[#1897C6] text-white text-[10px] font-bold">
//                                       {schedulesMap[exam._id].length}
//                                     </span>
//                                   )}
//                                 </div>
//                                 <Button size="sm" className="h-7 px-3 text-xs gap-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white shrink-0"
//                                   onClick={() => openAddSchedule(exam._id)}>
//                                   <Plus className="h-3 w-3" /> Add Schedule
//                                 </Button>
//                               </div>

//                               {schedulesLoading[exam._id] ? (
//                                 <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
//                                   <Loader2 className="h-4 w-4 animate-spin text-[#1897C6]" /> Loading schedules…
//                                 </div>
//                               ) : !schedulesMap[exam._id] || schedulesMap[exam._id].length === 0 ? (
//                                 <div className="text-center py-5 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
//                                   No schedules added yet.{' '}
//                                   <button className="text-[#1897C6] underline hover:no-underline font-medium" onClick={() => openAddSchedule(exam._id)}>
//                                     Add one
//                                   </button>
//                                 </div>
//                               ) : (
//                                 <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
//                                   {schedulesMap[exam._id].map((sched) => {
//                                     // Backend populates these via .populate()
//                                     const clsName     = getPopulatedString(sched.class_id,   'class_name',  'Class')
//                                     const batchName   = getPopulatedString(sched.batch_id,   'batch_name')
//                                     const subjectName = getPopulatedString(sched.subject_id, 'subject_name')
//                                     const schedStatus = sched.status ?? 'scheduled'

//                                     return (
//                                       <div key={sched._id} className="flex flex-col p-3 rounded-xl border bg-white hover:border-[#1897C6]/40 hover:shadow-sm transition-all gap-2">
//                                         <div className="flex items-start justify-between gap-2">
//                                           <span className="text-sm font-semibold leading-tight flex-1 min-w-0 truncate">{subjectName}</span>
//                                           <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${SCHED_STATUS_COLORS[schedStatus] ?? 'bg-gray-100 text-gray-600 border-gray-300'}`}>
//                                             {schedStatus}
//                                           </span>
//                                         </div>

//                                         <p className="text-xs text-muted-foreground truncate">{clsName} · {batchName}</p>

//                                         {/* Date + Time */}
//                                         <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
//                                           <span className="flex items-center gap-1">
//                                             <CalendarDays className="h-3 w-3 shrink-0" />
//                                             {sched.exam_date ? formatDate(sched.exam_date) : '—'}
//                                           </span>
//                                           {(sched.start_time || sched.end_time) && (
//                                             <span className="flex items-center gap-1">
//                                               <Clock className="h-3 w-3 shrink-0" />
//                                               {sched.start_time ?? ''}{sched.end_time ? `–${sched.end_time}` : ''}
//                                             </span>
//                                           )}
//                                           {sched.duration_minutes != null && (
//                                             <span className="flex items-center gap-1">
//                                               <Clock className="h-3 w-3 shrink-0" />
//                                               {sched.duration_minutes} min
//                                             </span>
//                                           )}
//                                           {sched.room_number && (
//                                             <span className="flex items-center gap-1">
//                                               <MapPin className="h-3 w-3 shrink-0" />
//                                               {sched.room_number}
//                                             </span>
//                                           )}
//                                         </div>

//                                         {/* Marks */}
//                                         <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
//                                           <span className="flex items-center gap-1">
//                                             <Target className="h-3 w-3 shrink-0" />
//                                             Max <span className="font-semibold text-foreground ml-0.5">{sched.total_marks}</span>
//                                             {sched.pass_marks != null && (
//                                               <span className="ml-1">· Pass <span className="font-semibold text-foreground">{sched.pass_marks}</span></span>
//                                             )}
//                                           </span>
//                                         </div>

//                                         {(sched.theory_marks != null || sched.practical_marks != null) && (
//                                           <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
//                                             {sched.theory_marks    != null && <span>Theory <span className="font-semibold text-foreground">{sched.theory_marks}</span></span>}
//                                             {sched.practical_marks != null && <span>Practical <span className="font-semibold text-foreground">{sched.practical_marks}</span></span>}
//                                           </div>
//                                         )}

//                                         <div className="flex items-center gap-1 pt-1 border-t mt-auto">
//                                           <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1 hover:bg-[#1897C6]/10 hover:text-[#1897C6]"
//                                             onClick={() => { setViewingSchedule(sched); setShowViewSchedule(true) }}>
//                                             <Eye className="h-3.5 w-3.5" /><span>View</span>
//                                           </Button>
//                                           <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1 hover:bg-blue-50 hover:text-blue-600"
//                                             onClick={() => openEditSchedule(sched)}>
//                                             <Edit className="h-3.5 w-3.5" /><span>Edit</span>
//                                           </Button>
//                                           <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1 hover:bg-red-50 hover:text-red-600"
//                                             onClick={() => openDeleteConfirm('schedule', sched._id!, `${subjectName} schedule`)}>
//                                             <Trash2 className="h-3.5 w-3.5" /><span>Delete</span>
//                                           </Button>
//                                         </div>
//                                       </div>
//                                     )
//                                   })}
//                                 </div>
//                               )}
//                             </div>
//                           )}
//                         </CardContent>
//                       </Card>
//                     ))}
//                   </div>
//                 )}
//                 {!examsLoading && totalPages > 1 && (
//                   <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* TAB 2 */}
//           <TabsContent value="subjects" className="space-y-4">
//             <SubjectsByClass />
//           </TabsContent>
//         </Tabs>

//         {/* View Schedule Dialog */}
//         <ScheduleViewDialog
//           schedule={viewingSchedule} open={showViewSchedule}
//           onClose={() => { setShowViewSchedule(false); setViewingSchedule(null) }}
//         />

//         {/* View Exam Dialog */}
//         <Dialog open={showViewExam} onOpenChange={(o) => { setShowViewExam(o); if (!o) setSelectedExam(null) }}>
//           <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
//             <DialogHeader className="sr-only">
//               <DialogTitle>{selectedExam?.exam_name ?? 'Exam Details'}</DialogTitle>
//               <DialogDescription>View exam type details</DialogDescription>
//             </DialogHeader>
//             {selectedExam && (
//               <>
//                 <div className="px-5 pt-5 pb-4 border-b">
//                   <h2 className="text-lg font-bold leading-snug">{selectedExam.exam_name}</h2>
//                   <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
//                     {selectedExam.exam_code && <span className="font-mono font-semibold text-[#1897C6]">{selectedExam.exam_code}</span>}
//                     {selectedExam.exam_code && <span>•</span>}
//                     <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{selectedExam.academic_year}</span>
//                     {selectedExam.createdAt && <><span>•</span><span>{formatDate(selectedExam.createdAt)}</span></>}
//                   </p>
//                   <div className="flex flex-wrap gap-2 mt-3">
//                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[selectedExam.exam_type] ?? 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
//                       {EXAM_TYPE_LABELS[selectedExam.exam_type] ?? selectedExam.exam_type}
//                     </span>
//                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedExam.status]}`}>
//                       {EXAM_STATUS_LABELS[selectedExam.status]}
//                     </span>
//                     {selectedExam.term && (
//                       <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
//                         {selectedExam.term}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//                 <div className="px-5 py-4 space-y-4">
//                   <div className="rounded-xl border bg-blue-50/50 p-4">
//                     <h3 className="text-sm font-semibold mb-3">Exam Details</h3>
//                     <div className="mb-3">
//                       <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
//                       {selectedExam.description
//                         ? <p className="text-sm leading-relaxed">{selectedExam.description}</p>
//                         : <p className="text-sm text-muted-foreground italic">No description provided.</p>}
//                     </div>
//                     <div>
//                       <p className="text-xs font-medium text-muted-foreground mb-1">Instructions</p>
//                       {selectedExam.instructions
//                         ? <p className="text-sm leading-relaxed">{selectedExam.instructions}</p>
//                         : <p className="text-sm text-muted-foreground italic">No instructions provided.</p>}
//                     </div>
//                   </div>
//                   <div className="rounded-xl border bg-muted/20 p-4">
//                     <h3 className="text-sm font-semibold mb-3">Schedule</h3>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                       <div className="flex items-center gap-3 rounded-lg bg-white border p-3">
//                         <div className="w-10 h-10 rounded-lg bg-[#1897C6]/15 flex items-center justify-center shrink-0">
//                           <CalendarCheck className="h-5 w-5 text-[#1897C6]" />
//                         </div>
//                         <div>
//                           <p className="text-xs text-muted-foreground">Start Date</p>
//                           <p className="text-sm font-semibold mt-0.5">{formatDate(selectedExam.start_date)}</p>
//                         </div>
//                       </div>
//                       <div className="flex items-center gap-3 rounded-lg bg-white border p-3">
//                         <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
//                           <CalendarX className="h-5 w-5 text-orange-500" />
//                         </div>
//                         <div>
//                           <p className="text-xs text-muted-foreground">End Date</p>
//                           <p className="text-sm font-semibold mt-0.5">{formatDate(selectedExam.end_date)}</p>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="rounded-xl border p-4">
//                     <h3 className="text-sm font-semibold mb-3">More Info</h3>
//                     <div className="space-y-2">
//                       {[
//                         { label: 'Academic Year', value: selectedExam.academic_year },
//                         { label: 'Exam Code',     value: selectedExam.exam_code },
//                         { label: 'Term',          value: selectedExam.term },
//                         { label: 'Created',       value: formatDate(selectedExam.createdAt) },
//                         { label: 'Last Updated',  value: formatDate(selectedExam.updatedAt) },
//                       ].filter(r => r.value && r.value !== '—').map(row => (
//                         <div key={row.label} className="flex items-center justify-between">
//                           <span className="text-xs text-muted-foreground">{row.label}</span>
//                           <span className="text-xs font-medium">{row.value}</span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex gap-3 px-5 pb-5">
//                   <Button variant="outline" className="flex-1" onClick={() => setShowViewExam(false)}>Close</Button>
//                   <Button className="flex-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//                     onClick={() => { setShowViewExam(false); openEditExam(selectedExam) }}>
//                     <Edit className="h-4 w-4 mr-2" /> Edit Exam
//                   </Button>
//                 </div>
//               </>
//             )}
//           </DialogContent>
//         </Dialog>

//         {/* Add Exam Dialog */}
//         <Dialog open={showAddExam} onOpenChange={(o) => { if (!examSubmitting) { setShowAddExam(o); if (!o) setExamFormErrors([]) } }}>
//           <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
//             <DialogHeader>
//               <DialogTitle>Add Exam Type</DialogTitle>
//               <DialogDescription>Create a new exam type that will be applicable to all classes</DialogDescription>
//             </DialogHeader>
//             <ExamForm form={examForm} onChange={(patch) => setExamForm(f => ({ ...f, ...patch }))} errors={examFormErrors} mode="create" />
//             <DialogFooter className="flex-col sm:flex-row gap-2">
//               <Button variant="outline" onClick={() => setShowAddExam(false)} disabled={examSubmitting}>Cancel</Button>
//               <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={handleCreateExam} disabled={examSubmitting || !isExamCreateValid}>
//                 {examSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Plus className="h-4 w-4 mr-2" /> Add Exam Type</>}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Edit Exam Dialog */}
//         <Dialog open={showEditExam} onOpenChange={(o) => { if (!examSubmitting) { setShowEditExam(o); if (!o) { setSelectedExam(null); setExamFormErrors([]) } } }}>
//           <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
//             <DialogHeader>
//               <DialogTitle>Edit Exam Type</DialogTitle>
//               <DialogDescription>Update details for this exam type</DialogDescription>
//             </DialogHeader>
//             {selectedExam && (
//               <ExamForm form={editExamForm as CreateExamPayload} onChange={(patch) => setEditExamForm(f => ({ ...f, ...patch }))} errors={examFormErrors} mode="edit" />
//             )}
//             <DialogFooter className="flex-col sm:flex-row gap-2">
//               <Button variant="outline" onClick={() => setShowEditExam(false)} disabled={examSubmitting}>Cancel</Button>
//               <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={handleUpdateExam} disabled={examSubmitting}>
//                 {examSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Edit className="h-4 w-4 mr-2" /> Save Changes</>}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Add/Edit Schedule Dialog */}
//         <Dialog open={showScheduleDialog} onOpenChange={(o) => { if (!scheduleSubmitting) { setShowScheduleDialog(o); if (!o) setScheduleFormError(null) } }}>
//           <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
//             <DialogHeader>
//               <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add Exam Schedule'}</DialogTitle>
//               <DialogDescription>{editingSchedule ? 'Update this exam schedule.' : 'Add a new schedule for this exam.'}</DialogDescription>
//             </DialogHeader>
//             <div className="space-y-4 py-2">
//               {scheduleFormError && <InlineError message={scheduleFormError} />}

//               <div>
//                 <Label>Class <span className="text-red-500">*</span></Label>
//                 <Select value={typeof scheduleForm.class_id === 'string' ? scheduleForm.class_id : ''} onValueChange={onScheduleClassChange}>
//                   <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select class" /></SelectTrigger>
//                   <SelectContent>
//                     {scheduleClasses.length === 0
//                       ? <SelectItem value="__none" disabled>No classes found</SelectItem>
//                       : scheduleClasses.map(c => <SelectItem key={c._id} value={c._id}>Class {c.class_name}</SelectItem>)
//                     }
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div>
//                 <Label>Batch <span className="text-red-500">*</span></Label>
//                 {loadingBatches ? (
//                   <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading batches…</div>
//                 ) : (
//                   <Select
//                     value={typeof scheduleForm.batch_id === 'string' ? scheduleForm.batch_id : ''}
//                     onValueChange={(v) => setScheduleForm(prev => ({ ...prev, batch_id: v }))}
//                     disabled={!scheduleForm.class_id || scheduleBatches.length === 0}
//                   >
//                     <SelectTrigger className="mt-1.5">
//                       <SelectValue placeholder={scheduleForm.class_id ? (scheduleBatches.length === 0 ? 'No batches found' : 'Select batch') : 'Select class first'} />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {scheduleBatches.map(b => (
//                         <SelectItem key={b._id} value={b._id!}>
//                           {b.batch_name}{b.start_time && b.end_time ? ` (${b.start_time}–${b.end_time})` : ''}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 )}
//               </div>

//               <div>
//                 <Label>Subject <span className="text-red-500">*</span></Label>
//                 {loadingSubjects ? (
//                   <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…</div>
//                 ) : (
//                   <Select
//                     value={typeof scheduleForm.subject_id === 'string' ? scheduleForm.subject_id : ''}
//                     onValueChange={(v) => setScheduleForm(prev => ({ ...prev, subject_id: v }))}
//                     disabled={!scheduleForm.class_id || scheduleSubjects.length === 0}
//                   >
//                     <SelectTrigger className="mt-1.5">
//                       <SelectValue placeholder={scheduleForm.class_id ? (scheduleSubjects.length === 0 ? 'No subjects found' : 'Select subject') : 'Select class first'} />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {scheduleSubjects.map(s => {
//                         const subId   = typeof s.subject_id === 'object' ? (s.subject_id as any)._id        : s.subject_id as string
//                         const subName = typeof s.subject_id === 'object' ? (s.subject_id as any).subject_name : subId
//                         return <SelectItem key={s._id} value={subId}>{subName}</SelectItem>
//                       })}
//                     </SelectContent>
//                   </Select>
//                 )}
//               </div>

//               {/* exam_date — schema: Date, required */}
//               <div>
//                 <Label>Exam Date <span className="text-red-500">*</span></Label>
//                 <Input type="date" className="mt-1.5"
//                   value={typeof scheduleForm.exam_date === 'string' ? scheduleForm.exam_date.split('T')[0] : ''}
//                   onChange={e => setScheduleForm(prev => ({ ...prev, exam_date: e.target.value }))}
//                 />
//               </div>

//               {/* start_time, end_time — schema: String, default null */}
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <Label>Start Time</Label>
//                   <Input type="time" className="mt-1.5"
//                     value={scheduleForm.start_time ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, start_time: e.target.value || null }))}
//                   />
//                 </div>
//                 <div>
//                   <Label>End Time</Label>
//                   <Input type="time" className="mt-1.5"
//                     value={scheduleForm.end_time ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, end_time: e.target.value || null }))}
//                   />
//                 </div>
//               </div>

//               {/* duration_minutes, room_number — schema: Number/String, default null */}
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <Label>Duration (minutes)</Label>
//                   <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 180"
//                     value={scheduleForm.duration_minutes ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, duration_minutes: e.target.value ? Number(e.target.value) : null }))}
//                   />
//                 </div>
//                 <div>
//                   <Label>Room Number</Label>
//                   <Input type="text" className="mt-1.5" placeholder="e.g. Room 101"
//                     value={scheduleForm.room_number ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, room_number: e.target.value || null }))}
//                   />
//                 </div>
//               </div>

//               {/* total_marks (required), pass_marks, theory_marks, practical_marks */}
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <Label>Total Marks <span className="text-red-500">*</span></Label>
//                   <Input type="number" min={1} className="mt-1.5" placeholder="e.g. 100"
//                     value={scheduleForm.total_marks ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, total_marks: Number(e.target.value) }))}
//                   />
//                 </div>
//                 <div>
//                   <Label>Pass Marks</Label>
//                   <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 40"
//                     value={scheduleForm.pass_marks ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, pass_marks: Number(e.target.value) }))}
//                   />
//                 </div>
//                 <div>
//                   <Label>Theory Marks</Label>
//                   <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 70"
//                     value={scheduleForm.theory_marks ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, theory_marks: e.target.value ? Number(e.target.value) : undefined }))}
//                   />
//                 </div>
//                 <div>
//                   <Label>Practical Marks</Label>
//                   <Input type="number" min={0} className="mt-1.5" placeholder="e.g. 30"
//                     value={scheduleForm.practical_marks ?? ''}
//                     onChange={e => setScheduleForm(prev => ({ ...prev, practical_marks: e.target.value ? Number(e.target.value) : undefined }))}
//                   />
//                 </div>
//               </div>

//               {/* invigilator_id — ref: TeachersMaster → full_name, teacher_code */}
//               <div>
//                 <Label>Invigilator (Teacher)</Label>
//                 <Select
//                   value={typeof scheduleForm.invigilator_id === 'string' ? scheduleForm.invigilator_id : ''}
//                   onValueChange={(v) => setScheduleForm(prev => ({ ...prev, invigilator_id: v || null }))}
//                 >
//                   <SelectTrigger className="mt-1.5">
//                     <SelectValue placeholder="Select invigilator (optional)" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="__none">None</SelectItem>
//                     {scheduleTeachers.map(t => (
//                       <SelectItem key={t._id} value={t._id}>
//                         {t.full_name}{t.teacher_code ? ` (${t.teacher_code})` : ''}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               {/* status — enum: scheduled|ongoing|completed|cancelled */}
//               <div>
//                 <Label>Status</Label>
//                 <Select value={scheduleForm.status ?? 'scheduled'} onValueChange={(v) => setScheduleForm(prev => ({ ...prev, status: v as ExamSchedule['status'] }))}>
//                   <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="scheduled">Scheduled</SelectItem>
//                     <SelectItem value="ongoing">Ongoing</SelectItem>
//                     <SelectItem value="completed">Completed</SelectItem>
//                     <SelectItem value="cancelled">Cancelled</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>

//             <DialogFooter className="flex-col sm:flex-row gap-2">
//               <Button variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={scheduleSubmitting}>Cancel</Button>
//               <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white" onClick={handleScheduleSubmit} disabled={scheduleSubmitting}>
//                 {scheduleSubmitting
//                   ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
//                   : editingSchedule ? <><Edit className="h-4 w-4 mr-2" />Save Changes</> : <><Plus className="h-4 w-4 mr-2" />Add Schedule</>
//                 }
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Delete Confirm Dialog */}
//         <Dialog open={deleteConfirm.open} onOpenChange={(o) => { if (!isDeleting) { setDeleteConfirm(d => ({ ...d, open: o })); if (!o) setDeleteError('') } }}>
//           <DialogContent className="max-w-sm w-[95vw]">
//             <DialogHeader>
//               <div className="flex items-center gap-3 mb-1">
//                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 shrink-0">
//                   <AlertTriangle className="h-5 w-5 text-red-600" />
//                 </div>
//                 <DialogTitle className="text-base sm:text-lg">
//                   {deleteConfirm.type === 'schedule' ? 'Delete Schedule?' : 'Delete Exam?'}
//                 </DialogTitle>
//               </div>
//               <DialogDescription className="pl-[52px] space-y-1 text-sm">
//                 <span><span className="font-semibold text-foreground">{deleteConfirm.name}</span> will be permanently deleted.</span>
//                 <span className="block text-xs">This action cannot be undone.</span>
//               </DialogDescription>
//             </DialogHeader>
//             {deleteError && <InlineError message={deleteError} />}
//             <DialogFooter className="gap-2">
//               <Button variant="outline" className="flex-1" onClick={() => { setDeleteConfirm(d => ({ ...d, open: false })); setDeleteError('') }} disabled={isDeleting}>Cancel</Button>
//               <Button variant="destructive" className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete} disabled={isDeleting}>
//                 {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4 mr-2" /> Delete</>}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//       </div>
//     </div>
//   )
// }

// // ═══════════════════════════════════════════════════════════════
// // ExamForm — matches examsMaster schema exactly
// // Fields: exam_name(req), exam_code, exam_type(req), academic_year(req),
// //         term, start_date, end_date, description, instructions, status
// // ═══════════════════════════════════════════════════════════════

// interface ExamFormProps {
//   form: Partial<CreateExamPayload>
//   onChange: (patch: Partial<CreateExamPayload>) => void
//   errors: FormError[]
//   mode: 'create' | 'edit'
// }

// function ExamForm({ form, onChange, errors, mode }: ExamFormProps) {
//   const general  = errors.find(e => e.field === 'general')?.message
//   const fieldErr = (f: string) => errors.find(e => e.field === f)?.message

//   return (
//     <div className="space-y-4 py-4">
//       {general && <InlineError message={general} />}

//       <div>
//         <Label htmlFor={`${mode}-exam-name`}>Exam Name <span className="text-red-500">*</span></Label>
//         <Input id={`${mode}-exam-name`} placeholder="e.g., Mid-Semester Test 1" className="mt-1.5"
//           value={form.exam_name ?? ''} onChange={e => onChange({ exam_name: e.target.value })} />
//         {fieldErr('exam_name') && <p className="text-xs text-red-500 mt-1">{fieldErr('exam_name')}</p>}
//       </div>

//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//         <div>
//           <Label htmlFor={`${mode}-exam-code`}>Short Name / Code</Label>
//           <Input id={`${mode}-exam-code`} placeholder="e.g., MST-1" className="mt-1.5"
//             value={form.exam_code ?? ''} onChange={e => onChange({ exam_code: e.target.value })} />
//         </div>
//         <div>
//           <Label htmlFor={`${mode}-term`}>Term</Label>
//           <Input id={`${mode}-term`} placeholder="e.g., Term 1, Q1" className="mt-1.5"
//             value={form.term ?? ''} onChange={e => onChange({ term: e.target.value })} />
//         </div>
//       </div>

//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//         <div>
//           <Label htmlFor={`${mode}-academic-year`}>Academic Year <span className="text-red-500">*</span></Label>
//           <Input id={`${mode}-academic-year`} placeholder="e.g., 2024-2025" className="mt-1.5"
//             value={form.academic_year ?? ''} onChange={e => onChange({ academic_year: e.target.value })} />
//           {fieldErr('academic_year') && <p className="text-xs text-red-500 mt-1">{fieldErr('academic_year')}</p>}
//         </div>
//         <div>
//           <Label>Exam Type <span className="text-red-500">*</span></Label>
//           <Select value={form.exam_type ?? ''} onValueChange={v => onChange({ exam_type: v as ExamMaster['exam_type'] })}>
//             <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select type" /></SelectTrigger>
//             <SelectContent>{EXAM_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
//           </Select>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//         <div>
//           <Label htmlFor={`${mode}-start-date`}>Start Date</Label>
//           <Input id={`${mode}-start-date`} type="date" className="mt-1.5"
//             value={form.start_date ?? ''} onChange={e => onChange({ start_date: e.target.value })} />
//         </div>
//         <div>
//           <Label htmlFor={`${mode}-end-date`}>End Date</Label>
//           <Input id={`${mode}-end-date`} type="date" className="mt-1.5"
//             value={form.end_date ?? ''} onChange={e => onChange({ end_date: e.target.value })} />
//         </div>
//       </div>

//       <div>
//         <Label>Status</Label>
//         <Select value={form.status ?? 'draft'} onValueChange={v => onChange({ status: v as ExamMaster['status'] })}>
//           <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
//           <SelectContent>{EXAM_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
//         </Select>
//       </div>

//       <div>
//         <Label htmlFor={`${mode}-description`}>Description</Label>
//         <Textarea id={`${mode}-description`} placeholder="Brief description of this exam..." className="mt-1.5 min-h-[70px]"
//           value={form.description ?? ''} onChange={e => onChange({ description: e.target.value })} />
//       </div>

//       <div>
//         <Label htmlFor={`${mode}-instructions`}>Instructions</Label>
//         <Textarea id={`${mode}-instructions`} placeholder="Instructions for students..." className="mt-1.5 min-h-[70px]"
//           value={form.instructions ?? ''} onChange={e => onChange({ instructions: e.target.value })} />
//       </div>
//     </div>
//   )
// }

