'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  Edit,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import {
  classesApi,
  ClassSubjectSchedule,
  ClassSubject,
  ClassTeacherAssignment,
  CreateSchedulePayload,
  CoachingBatch,
  ClassMaster,
  BatchPopulated,
} from '@/lib/api/classes'
import { subjectsByClassApi, SubjectByClass } from '@/lib/api/subjects'


// ─── Types (mirrored from page.tsx) ──────────────────────────────────────────

interface BatchEnriched extends CoachingBatch {
  _id: string
  studentCount: number
}

export interface ClassEnriched extends ClassMaster {
  batches: BatchEnriched[]
  totalCapacity: number
  totalStudents: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCurrentAcademicYear = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`
}

const isValidAcademicYear = (value: string): boolean =>
  /^\d{4}-\d{2}$/.test(value.trim())

const isValidTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())

const formatTime = (time: string): string => {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${ampm}`
}

const DAY_OPTIONS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
] as const

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
}

// ─── Props ────────────────────────────────────────────────────────────────────

// Replace with:
interface ClassSubjectScheduleProps {
  /** The class currently open in the Edit dialog. Pass null when dialog is closed. */
  selectedClass: ClassEnriched | null
  /** Called when an action-level error should be shown as a toast/banner in the parent */
  onActionError?: (message: string) => void
  /** When true, hides Add/Edit/Delete actions — view only mode */
  readOnly?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassSubjectScheduleManager({
  selectedClass,
  onActionError,
  readOnly = false,
}: ClassSubjectScheduleProps) {  // ── Schedule list ───────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState<ClassSubjectSchedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [schedulesError, setSchedulesError] = useState<string | null>(null)

  // ── Subjects & teachers for dropdowns ──────────────────────────────────────
    const [classSubjects, setClassSubjects] = useState<SubjectByClass[]>([])
  const [classTeachers, setClassTeachers] = useState<ClassTeacherAssignment[]>([])

  // ── Academic year filter (used by loadScheduleData) ─────────────────────────
  const [academicYear] = useState(getCurrentAcademicYear())

  // ── Create schedule dialog ──────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [schBatchId, setSchBatchId] = useState('')
  const [schSubjectId, setSchSubjectId] = useState('')
  const [schTeacherId, setSchTeacherId] = useState('')
  const [schAcademicYear, setSchAcademicYear] = useState(getCurrentAcademicYear())
  const [schDay, setSchDay] = useState<CreateSchedulePayload['day_of_week'] | ''>('')
  const [schStartTime, setSchStartTime] = useState('')
  const [schEndTime, setSchEndTime] = useState('')
  const [schRoomNumber, setSchRoomNumber] = useState('')
  const [schCreateLoading, setSchCreateLoading] = useState(false)
  const [schCreateError, setSchCreateError] = useState<string | null>(null)

  // ── Edit schedule dialog ────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ClassSubjectSchedule | null>(null)
  const [schEditDay, setSchEditDay] = useState<CreateSchedulePayload['day_of_week'] | ''>('')
  const [schEditStartTime, setSchEditStartTime] = useState('')
  const [schEditEndTime, setSchEditEndTime] = useState('')
  const [schEditRoomNumber, setSchEditRoomNumber] = useState('')
  const [schEditTeacherId, setSchEditTeacherId] = useState('')
  const [schEditStatus, setSchEditStatus] = useState<'active' | 'inactive'>('active')
  const [schEditLoading, setSchEditLoading] = useState(false)
  const [schEditError, setSchEditError] = useState<string | null>(null)

  // ── Delete tracker ──────────────────────────────────────────────────────────
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null)

  // ── Internal confirm dialog ─────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  // ─── Load schedules, subjects & teachers ─────────────────────────────────────

  const loadScheduleData = useCallback(
    async (cls: ClassEnriched) => {
      setSchedulesLoading(true)
      setSchedulesError(null)
      try {
        const [schedRes, subjectRes, assignmentRes] = await Promise.all([
          classesApi.getScheduleByClass(cls._id, { academic_year: academicYear }),
          subjectsByClassApi.getByClass(cls._id),
          classesApi.getAllAssignments({ class_id: cls._id, academic_year: academicYear }),
        ])

        setSchedules(
          Array.isArray(schedRes.result)
            ? [...schedRes.result].sort((a, b) => {
                const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
                const di =
                  dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
                if (di !== 0) return di
                return (a.start_time ?? '').localeCompare(b.start_time ?? '')
              })
            : []
        )
        setClassSubjects(
          Array.isArray(subjectRes.result) ? subjectRes.result : []
        )
        setClassTeachers(
          Array.isArray(assignmentRes.result) ? assignmentRes.result : []
        )
      } catch {
        setSchedulesError('Unable to load schedule data. Please try again.')
      } finally {
        setSchedulesLoading(false)
      }
    },
    [academicYear]
  )

  // Reload whenever the selected class changes (i.e. a different class is opened)
  useEffect(() => {
    if (selectedClass) {
      loadScheduleData(selectedClass)
    } else {
      setSchedules([])
      setClassSubjects([])
      setClassTeachers([])
    }
  }, [selectedClass, loadScheduleData])

  // ─── Display helpers ──────────────────────────────────────────────────────────

  const getSubjectName = (subject: string | { _id: string; subject_name: string } | null): string => {
    if (typeof subject === 'object' && subject !== null) return subject.subject_name
    const found = classSubjects.find(
      (cs) =>
        (typeof cs.subject_id === 'object' ? cs.subject_id._id : cs.subject_id) === subject
    )
    if (!found) return 'Unknown Subject'
    return typeof found.subject_id === 'object' ? found.subject_id.subject_name : String(found.subject_id)
  }

  const getTeacherName = (teacher: ClassSubjectSchedule['teacher_id']): string => {
    if (typeof teacher === 'object' && teacher !== null) return teacher.full_name
    const found = classTeachers.find(
      (ct) =>
        (typeof ct.teacher_id === 'object' ? ct.teacher_id._id : ct.teacher_id) === teacher
    )
    if (found && typeof found.teacher_id === 'object') return found.teacher_id.full_name
    return 'Unknown Teacher'
  }

  const getBatchName = (
    batchId: ClassSubjectSchedule['batch_id'],
    cls: ClassEnriched | null
  ): string => {
    if (!batchId) return '—'
    if (typeof batchId === 'object' && batchId !== null && 'batch_name' in batchId) {
      return (batchId as BatchPopulated).batch_name
    }
    const id = typeof batchId === 'string' ? batchId : null
    if (!id) return '—'
    if (!cls) return id
    const found = cls.batches.find((b) => b._id === id)
    return found ? found.batch_name : id
  }
  const sortedSchedules = (list: ClassSubjectSchedule[]) =>
    [...list].sort((a, b) => {
      const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const di = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week)
      if (di !== 0) return di
      return (a.start_time ?? '').localeCompare(b.start_time ?? '')
    })

 const deduplicatedTeachers = Array.from(
    new Map(
      classTeachers
        .filter((ct) => ct.teacher_id)
        .map((ct) => {
          const id =
            typeof ct.teacher_id === 'object' ? ct.teacher_id._id : ct.teacher_id
          const name =
            typeof ct.teacher_id === 'object'
              ? ct.teacher_id.full_name
              : ct.teacher_id   // fallback: raw ID string when not populated
          return [id, { id, name }]
        })
    ).values()
  )

  // ─── Reset helpers ────────────────────────────────────────────────────────────

  const resetCreateForm = () => {
    setSchBatchId('')
    setSchSubjectId('')
    setSchTeacherId('')
    setSchAcademicYear(getCurrentAcademicYear())
    setSchDay('')
    setSchStartTime('')
    setSchEndTime('')
    setSchRoomNumber('')
    setSchCreateError(null)
  }

  // ─── Create schedule ──────────────────────────────────────────────────────────

  const handleCreateSchedule = async () => {
    if (!selectedClass) return

    if (!schBatchId) { setSchCreateError('Please select a batch.'); return }
    if (!schSubjectId) { setSchCreateError('Please select a subject.'); return }
    if (!schTeacherId) { setSchCreateError('Please select a teacher.'); return }
    if (!schDay) { setSchCreateError('Please select a day.'); return }
    if (!schStartTime) { setSchCreateError('Start time is required.'); return }
    if (!schEndTime) { setSchCreateError('End time is required.'); return }
    if (!isValidAcademicYear(schAcademicYear)) {
      setSchCreateError('Academic year must be in YYYY-YY format (e.g. 2025-26).')
      return
    }
    if (!isValidTime(schStartTime) || !isValidTime(schEndTime)) {
      setSchCreateError('Please enter valid time values.')
      return
    }
    if (schStartTime >= schEndTime) {
      setSchCreateError('End time must be after start time.')
      return
    }

    setSchCreateLoading(true)
    setSchCreateError(null)

    try {
      const payload: CreateSchedulePayload = {
        class_id: selectedClass._id,
        batch_id: schBatchId,
        subject_id: schSubjectId,
        teacher_id: schTeacherId,
        academic_year: schAcademicYear.trim(),
        day_of_week: schDay as CreateSchedulePayload['day_of_week'],
        start_time: schStartTime,
        end_time: schEndTime,
        room_number: schRoomNumber.trim() || null,
      }

      const res = await classesApi.createSchedule(payload)
      if (!res.success || !res.result) throw new Error(res.message || 'Failed to create schedule.')

      setSchedules((prev) => sortedSchedules([...prev, res.result!]))
      setIsCreateOpen(false)
      resetCreateForm()
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : ''
      if (raw.includes('duplicate') || raw.includes('E11000')) {
        setSchCreateError(
          'A schedule already exists for this batch, subject, day and time.'
        )
      } else if (raw.includes('batch_id') || raw.includes('section_id')) {
        setSchCreateError('Batch is required for coaching schedules.')
      } else if (raw) {
        setSchCreateError(
          'Could not create schedule. Please check the details and try again.'
        )
      } else {
        setSchCreateError('Something went wrong. Please try again.')
      }
    } finally {
      setSchCreateLoading(false)
    }
  }

  // ─── Edit schedule ────────────────────────────────────────────────────────────

  const openEditSchedule = (sch: ClassSubjectSchedule) => {
    setEditingSchedule(sch)
    setSchEditDay(sch.day_of_week)
    setSchEditStartTime(sch.start_time)
    setSchEditEndTime(sch.end_time)
    setSchEditRoomNumber(sch.room_number ?? '')
    setSchEditTeacherId(
      typeof sch.teacher_id === 'object' ? sch.teacher_id._id : (sch.teacher_id ?? '')
    )
    setSchEditStatus(sch.status ?? 'active')
    setSchEditError(null)
    setIsEditOpen(true)
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule?._id) return

    if (!schEditDay) { setSchEditError('Please select a day.'); return }
    if (!schEditStartTime) { setSchEditError('Start time is required.'); return }
    if (!schEditEndTime) { setSchEditError('End time is required.'); return }
    if (!isValidTime(schEditStartTime) || !isValidTime(schEditEndTime)) {
      setSchEditError('Please enter valid time values.')
      return
    }
    if (schEditStartTime >= schEditEndTime) {
      setSchEditError('End time must be after start time.')
      return
    }

    setSchEditLoading(true)
    setSchEditError(null)

    try {
      const res = await classesApi.updateSchedule(editingSchedule._id, {
        day_of_week: schEditDay as CreateSchedulePayload['day_of_week'],
        start_time: schEditStartTime,
        end_time: schEditEndTime,
        room_number: schEditRoomNumber.trim() || null,
        teacher_id: schEditTeacherId || undefined,
        // status: schEditStatus,
      })

      if (!res.success || !res.result)
        throw new Error(res.message || 'Failed to update schedule.')

      setSchedules((prev) =>
        sortedSchedules(
          prev.map((s) => (s._id === editingSchedule._id ? { ...s, ...res.result! } : s))
        )
      )
      setIsEditOpen(false)
      setEditingSchedule(null)
    } catch {
      setSchEditError('Could not update schedule. Please try again.')
    } finally {
      setSchEditLoading(false)
    }
  }

  // ─── Delete schedule ──────────────────────────────────────────────────────────

  const handleDeleteSchedule = (scheduleId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Schedule',
      description:
        'Are you sure you want to remove this schedule slot? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }))
        setDeletingScheduleId(scheduleId)
        try {
          const res = await classesApi.deleteSchedule(scheduleId)
          if (!res.success) throw new Error(res.message || 'Failed to delete schedule.')
          setSchedules((prev) => prev.filter((s) => s._id !== scheduleId))
        } catch {
          const msg = 'Could not delete the schedule slot. Please try again.'
          if (onActionError) onActionError(msg)
        } finally {
          setDeletingScheduleId(null)
        }
      },
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (!selectedClass) return null

  return (
    <>
      {/* ── Schedule Section (rendered inside Edit Class Dialog) ── */}
      <div className="border-t pt-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#1897C6]" />
            Class Schedule
          </Label>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetCreateForm()
                setIsCreateOpen(true)
              }}
              className="h-8 gap-1.5 text-xs border-[#1897C6]/40 text-[#1897C6] hover:bg-[#1897C6]/10 hover:text-[#0F5F7A]"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Add Slot
            </Button>
          )}
        </div>


        {/* Loading */}
        {schedulesLoading && (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading schedule...
          </div>
        )}

        {/* Error */}
        {!schedulesLoading && schedulesError && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {schedulesError}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadScheduleData(selectedClass)}
              className="ml-auto h-7 px-2 text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty */}
        {!schedulesLoading && !schedulesError && schedules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
            No schedule slots added yet. Click{' '}
            <strong>Add Slot</strong> to get started.
          </p>
        )}

        {/* Schedule rows */}
        {!schedulesLoading && !schedulesError && schedules.length > 0 && (
          <div className="space-y-1.5">
            {schedules.map((sch) => {
              const subject_name =
                typeof sch.subject_id === 'object'
                  ? sch.subject_id.subject_name
                  : getSubjectName(sch.subject_id)
              const teacher_name =
                typeof sch.teacher_id === 'object'
                  ? sch.teacher_id.full_name
                  : getTeacherName(sch.teacher_id)
              const batchName = getBatchName(sch.batch_id, selectedClass)

              return (
                <div
                  key={sch._id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  {/* Day pill */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#1897C6]/15 to-[#67BAC3]/15 text-[#1897C6] text-xs font-bold uppercase">
                    {DAY_LABELS[sch.day_of_week] ?? sch.day_of_week}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{subject_name}</span>
                      {sch.status === 'inactive' && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>
                        {formatTime(sch.start_time)} – {formatTime(sch.end_time)}
                      </span>
                      <span>·</span>
                      <span>{batchName}</span>
                      <span>·</span>
                      <span>{teacher_name}</span>
                      {sch.room_number && (
                        <>
                          <span>·</span>
                          <span>Room {sch.room_number}</span>
                        </>
                      )}
                    </div>
                  </div>

                 {/* Actions */}
                  {!readOnly && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditSchedule(sch)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                        title="Edit schedule"
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sch._id && handleDeleteSchedule(sch._id)}
                        disabled={deletingScheduleId === sch._id}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                        title="Delete schedule"
                      >
                        {deletingScheduleId === sch._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create Schedule Dialog ── */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateForm()
          setIsCreateOpen(open)
        }}
      >
        <DialogContent className="max-w-full sm:max-w-lg max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5 text-[#1897C6]" />
              Add Schedule Slot
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedClass.class_name} — schedule a subject slot for a batch
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {schCreateError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {schCreateError}
              </div>
            )}

            {/* Academic Year */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Academic Year <span className="text-red-500">*</span>
              </Label>
              <Input
                value={schAcademicYear}
                onChange={(e) => setSchAcademicYear(e.target.value)}
                placeholder="e.g. 2025-26"
                className="h-9"
              />
            </div>

            {/* Batch */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Batch <span className="text-red-500">*</span>
              </Label>
              <Select value={schBatchId} onValueChange={setSchBatchId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClass.batches.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No batches available — add a batch first
                    </SelectItem>
                  ) : (
                    selectedClass.batches.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.batch_name}
                        {b.start_time &&
                          ` (${formatTime(b.start_time)} – ${formatTime(b.end_time)})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Select value={schSubjectId} onValueChange={setSchSubjectId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {classSubjects.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No subjects assigned to this class
                    </SelectItem>
                  ) : (
                    classSubjects.map((cs) => {
                      const sub = cs.subject_id
                      const id = typeof sub === 'object' ? sub._id : sub
                      const name =
                        typeof sub === 'object' ? sub.subject_name : String(sub)
                      if (!id) return null
                      return (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      )
                    })                  )}
                </SelectContent>
              </Select>
              {classSubjects.length === 0 && !schedulesLoading && (
                <p className="text-xs text-amber-600">
                  No subjects found. Please assign subjects to this class first.
                </p>
              )}
            </div>

            {/* Teacher */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Teacher <span className="text-red-500">*</span>
              </Label>
              <Select value={schTeacherId} onValueChange={setSchTeacherId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {deduplicatedTeachers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No teachers assigned to this class
                    </SelectItem>
                  ) : (
                    deduplicatedTeachers.map(({ id, name }) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {classTeachers.length === 0 && !schedulesLoading && (
                <p className="text-xs text-amber-600">
                  No teachers found. Please assign teachers to this class first.
                </p>
              )}
            </div>

            {/* Day of Week */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Day <span className="text-red-500">*</span>
              </Label>
              <Select
                value={schDay}
                onValueChange={(v) =>
                  setSchDay(v as CreateSchedulePayload['day_of_week'])
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={schStartTime}
                  onChange={(e) => setSchStartTime(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={schEndTime}
                  onChange={(e) => setSchEndTime(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Room Number */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Room Number{' '}
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                value={schRoomNumber}
                onChange={(e) => setSchRoomNumber(e.target.value)}
                placeholder="e.g. Lab-1, Room 101"
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={schCreateLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchedule}
              disabled={schCreateLoading}
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto gap-2"
            >
              {schCreateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {schCreateLoading ? 'Saving...' : 'Save Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Schedule Dialog ── */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSchedule(null)
            setSchEditError(null)
          }
          setIsEditOpen(open)
        }}
      >
        <DialogContent className="max-w-full sm:max-w-md max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#1897C6]" />
              Edit Schedule Slot
            </DialogTitle>
            <DialogDescription className="text-xs">
              You can update time, day, teacher, room number, and status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {schEditError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {schEditError}
              </div>
            )}

            {/* Day */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Day <span className="text-red-500">*</span>
              </Label>
              <Select
                value={schEditDay}
                onValueChange={(v) =>
                  setSchEditDay(v as CreateSchedulePayload['day_of_week'])
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={schEditStartTime}
                  onChange={(e) => setSchEditStartTime(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="time"
                  value={schEditEndTime}
                  onChange={(e) => setSchEditEndTime(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Teacher */}
            <div className="space-y-1.5">
              <Label className="text-sm">Teacher</Label>
              <Select value={schEditTeacherId} onValueChange={setSchEditTeacherId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {deduplicatedTeachers.map(({ id, name }) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room Number */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Room Number{' '}
                <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                value={schEditRoomNumber}
                onChange={(e) => setSchEditRoomNumber(e.target.value)}
                placeholder="e.g. Lab-1, Room 101"
                className="h-9"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-sm">Status</Label>
              <Select
                value={schEditStatus}
                onValueChange={(v) =>
                  setSchEditStatus(v as 'active' | 'inactive')
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={schEditLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSchedule}
              disabled={schEditLoading}
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto gap-2"
            >
              {schEditLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {schEditLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Internal Confirm Dialog ── */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-sm mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDialog.onConfirm}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}