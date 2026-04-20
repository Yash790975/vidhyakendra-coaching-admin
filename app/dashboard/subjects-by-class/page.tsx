'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  GraduationCap,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Eye,
  Hash,
  Tag,
  Activity,
  Calendar,
  LayersIcon,
} from 'lucide-react'
import {
  subjectsMasterApi,
  subjectsByClassApi,
  type SubjectByClass,
  type SubjectMaster,
  type BatchRef,
  type CreateSubjectByClassPayload,
  type UpdateSubjectByClassPayload,
  SUBJECT_TYPE_OPTIONS_BY_CLASS,
  SUBJECT_TYPE_LABELS_BY_CLASS,
  SUBJECT_STATUS_OPTIONS,
} from '@/lib/api/subjects'
import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'
import { Pagination } from '@/components/pagination'
import type { ApiResponse } from '@/lib/api/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLS(key: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(key) ?? ''
}

function friendlyError(err: unknown): string {
  if (!err) return 'Something went wrong. Please try again.'
  const asApiRes = err as ApiResponse<unknown>
  if (typeof asApiRes === 'object' && 'success' in asApiRes && asApiRes.success === false) {
    const msg = asApiRes.message ?? asApiRes.error ?? 'Request failed.'
    return friendlyError(new Error(msg))
  }
  const msg: string =
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err as { message?: string })?.message ??
    String(err)
  if (/network|fetch|econnrefused/i.test(msg))
    return 'Unable to connect to the server. Please check your internet connection.'
  if (/unauthorized|401/i.test(msg))
    return 'Your session has expired. Please log in again.'
  if (/not found|404/i.test(msg))
    return 'Record not found. It may have already been deleted.'
  if (/duplicate|already exists/i.test(msg))
    return 'This subject is already assigned to this class/section.'
  if (msg.length > 0) {
    // Hide raw/technical messages from user
    if (/objectid|cast|validation|schema|mongoose|stack|at Object|at Array/i.test(msg)) {
      return 'Something went wrong. Please try again.'
    }
    return msg
  }
  return 'Something went wrong. Please try again.'}

function getId(ref: string | { _id: string } | null | undefined): string {
  if (!ref) return ''
  if (typeof ref === 'string') return ref
  return ref._id
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ─── Badge colors ─────────────────────────────────────────────────────────────

const TYPE_BADGE_COLORS: Record<SubjectByClass['subject_type'], string> = {
  theory: 'bg-blue-600',
  practical: 'bg-green-600',
  both: 'bg-purple-600',
}

const STATUS_BADGE_COLORS: Record<SubjectByClass['status'], string> = {
  active: 'bg-emerald-600',
  inactive: 'bg-gray-500',
}

// ─── Error Dialog ─────────────────────────────────────────────────────────────

function ErrorDialog({
  open,
  message,
  onClose,
}: {
  open: boolean
  message: string
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Something went wrong
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm text-foreground leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-[#1897C6] to-[#67BAC3]">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View Dialog ──────────────────────────────────────────────────────────────

function ViewSubjectDialog({
  open,
  subject,
  onClose,
  onEdit,
}: {
  open: boolean
  subject: SubjectByClass | null
  onClose: () => void
  onEdit: () => void
}) {
  if (!subject) return null

  const subjectName =
    typeof subject.subject_id === 'object' && subject.subject_id !== null
      ? (subject.subject_id as { subject_name: string }).subject_name
      : String(subject.subject_id)

  const subjectCode =
    subject.subject_code ??
    (typeof subject.subject_id === 'object' && subject.subject_id !== null
      ? (subject.subject_id as { subject_code?: string | null }).subject_code ?? null
      : null)

  const subjectMasterType =
    typeof subject.subject_id === 'object' && subject.subject_id !== null
      ? (subject.subject_id as { subject_type?: string }).subject_type ?? null
      : null

  const className =
    typeof subject.class_id === 'object' && subject.class_id !== null
      ? (subject.class_id as { class_name: string }).class_name
      : String(subject.class_id)

  const classLevel =
    typeof subject.class_id === 'object' && subject.class_id !== null
      ? (subject.class_id as { class_level?: string | null }).class_level ?? null
      : null

  const sectionName =
    subject.section_id === null || subject.section_id === undefined
      ? null
      : typeof subject.section_id === 'object'
      ? (subject.section_id as { section_name: string }).section_name
      : null

  const batchData =
      subject.batch_id === null || subject.batch_id === undefined
        ? null
        : typeof subject.batch_id === 'object'
        ? (subject.batch_id as BatchRef)
        : null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            Subject Details
          </DialogTitle>
          <DialogDescription>Full details of this subject assignment</DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Subject Name + badges */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#1897C6]/8 to-[#67BAC3]/8 border border-[#1897C6]/20">
            <h3 className="text-lg font-bold text-foreground mb-2">{subjectName}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge className={`${TYPE_BADGE_COLORS[subject.subject_type]} text-white text-xs`}>
                {SUBJECT_TYPE_LABELS_BY_CLASS[subject.subject_type]}
              </Badge>
              <Badge className={`${STATUS_BADGE_COLORS[subject.status]} text-white text-xs`}>
                {subject.status.charAt(0).toUpperCase() + subject.status.slice(1)}
              </Badge>
              {subjectCode && (
                <Badge variant="outline" className="text-xs font-mono">
                  {subjectCode}
                </Badge>
              )}
            </div>
          </div>

          {/* Detail rows */}
          <div className="space-y-3">
            {/* Class */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <GraduationCap className="h-4 w-4 text-[#1897C6] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Class</p>
                <p className="text-sm font-semibold">
                  Class {className}
                  {classLevel ? <span className="text-muted-foreground font-normal ml-1">({classLevel})</span> : null}
                </p>
              </div>
            </div>
            {/* Batch */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <LayersIcon className="h-4 w-4 text-[#1897C6] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Batch</p>
                <p className="text-sm font-semibold">
                  {batchData
                    ? `${batchData.batch_name}${batchData.start_time ? ` (${batchData.start_time}–${batchData.end_time})` : ''}`
                    : <span className="text-muted-foreground font-normal">No Batch</span>}
                </p>              </div>
            </div>

            {/* Subject Code */}
            {subjectCode && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Hash className="h-4 w-4 text-[#1897C6] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Subject Code</p>
                  <p className="text-sm font-semibold font-mono">{subjectCode}</p>
                </div>
              </div>
            )}

            {/* Subject Type (theory/practical/both) */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <BookOpen className="h-4 w-4 text-[#1897C6] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Subject Type</p>
                <p className="text-sm font-semibold">{SUBJECT_TYPE_LABELS_BY_CLASS[subject.subject_type]}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Activity className="h-4 w-4 text-[#1897C6] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Status</p>
                <p className="text-sm font-semibold capitalize">{subject.status}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-[#1897C6] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Created At</p>
                <p className="text-sm font-semibold">{formatDate(subject.created_at)}</p>
              </div>
            </div>

            {subject.updated_at && subject.updated_at !== subject.created_at && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-[#1897C6] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Last Updated</p>
                  <p className="text-sm font-semibold">{formatDate(subject.updated_at)}</p>
                </div>
              </div>
            )}

  
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
            onClick={() => { onClose(); onEdit() }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubjectsByClass() {
  const instituteId = getLS('instituteId')
  const [subjects, setSubjects] = useState<SubjectByClass[]>([])
  const [classes, setClasses] = useState<ClassMaster[]>([])
  const [masterSubjects, setMasterSubjects] = useState<SubjectMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // ── Filter state ────────────────────────────────────────────────────────────
const [filterClassId, setFilterClassId] = useState<string>('all')
  const [filterBatchId, setFilterBatchId] = useState<string>('all')
  const [filterBatches, setFilterBatches] = useState<CoachingBatch[]>([])

  // ── Pagination state ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 3

  // ── Error dialog ────────────────────────────────────────────────────────────
  const [errorMsg, setErrorMsg] = useState('')
  const [showError, setShowError] = useState(false)
  const showErr = (err: unknown) => {
    console.error('[SubjectsByClass] raw error ➜', err)
    console.error('[SubjectsByClass] friendly msg ➜', friendlyError(err))
    setErrorMsg(friendlyError(err)) 
    setShowError(true)
  }

  // ── View dialog state ───────────────────────────────────────────────────────
  const [showViewDialog, setShowViewDialog] = useState(false)
 
  // ── Add dialog state ────────────────────────────────────────────────────────
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addMode, setAddMode] = useState<'select' | 'type'>('select')
  const [addForm, setAddForm] = useState<CreateSubjectByClassPayload>({
  institute_id: '',
  class_id: '',
  section_id: null,
  batch_id: null,
  subject_name: '',
  subject_type: 'theory',
  status: 'active',
})
  // const [addDialogSections, setAddDialogSections] = useState<ClassSection[]>([])
  const [addDialogBatches, setAddDialogBatches] = useState<CoachingBatch[]>([])
  const [loadingSections, setLoadingSections] = useState(false)

  // ── Edit dialog state ───────────────────────────────────────────────────────
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<SubjectByClass | null>(null)
  const [editForm, setEditForm] = useState<UpdateSubjectByClassPayload>({})

  // ── Delete dialog state ─────────────────────────────────────────────────────
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // ── Fetch classes ────────────────────────────────────────────────────────────
  const fetchClasses = useCallback(async () => {
    const iId = instituteId || getLS('instituteId')
    if (!iId) return
    try {
      const res = await classesApi.getAll({ instituteId: iId }) as ApiResponse<ClassMaster[]>
      if (res.success) setClasses(Array.isArray(res.result) ? res.result : [])
    } catch (err) { showErr(err) }
  }, [instituteId])

  // ── Fetch subjects master ────────────────────────────────────────────────────
const fetchMasterSubjects = useCallback(async () => {
    const iId = instituteId || getLS('instituteId')
    if (!iId) return
    try {
      const res = await subjectsMasterApi.getByInstituteAndType(iId, 'coaching') as ApiResponse<SubjectMaster[]>
      if (res.success) setMasterSubjects(Array.isArray(res.result) ? res.result : [])
    } catch (err) {
      console.warn('[SubjectsByClass] master subjects fetch failed', err)
    }
  }, [instituteId])

  // ── Fetch subjects by class ──────────────────────────────────────────────────
  const fetchSubjects = useCallback(async () => {
    const iId = instituteId || getLS('instituteId')
    if (!iId) { setLoading(false); return }
    setLoading(true)
    try {
      let res: ApiResponse<SubjectByClass[]>
        if (filterClassId !== 'all' && filterBatchId !== 'all') {
          // No server-side batch filter endpoint exists yet; fetch by class and filter client-side.
          res = await subjectsByClassApi.getByInstituteAndClass(iId, filterClassId) as ApiResponse<SubjectByClass[]>
          if (res.success && Array.isArray(res.result)) {
            res = { ...res, result: res.result.filter((s) => getId(s.batch_id) === filterBatchId) }
          }
        } else if (filterClassId !== 'all') {
          res = await subjectsByClassApi.getByInstituteAndClass(iId, filterClassId) as ApiResponse<SubjectByClass[]>
        } else {
          res = await subjectsByClassApi.getByInstitute(iId) as ApiResponse<SubjectByClass[]>
        }


      if (!res.success) { showErr(res); setSubjects([]); return }
      setSubjects(Array.isArray(res.result) ? res.result : [])
    } catch (err) { showErr(err); setSubjects([]) }
    finally { setLoading(false) }
  }, [instituteId, filterClassId, filterBatchId])

  useEffect(() => {
  if (filterClassId === 'all') { setFilterBatches([]); setFilterBatchId('all'); return }
  classesApi.getBatchesByClass(filterClassId)
    .then((res) => {
      const r = res as ApiResponse<CoachingBatch[]>
      setFilterBatches(Array.isArray(r.result) ? r.result : [])
      setFilterBatchId('all')
    })
    .catch((err) => { console.warn('[SubjectsByClass] filter batches fetch failed ➜', err); setFilterBatches([]) })
}, [filterClassId])
  useEffect(() => {
  if (!addForm.class_id) { setAddDialogBatches([]); return }
  setLoadingSections(true)
  classesApi.getBatchesByClass(addForm.class_id)
    .then((res) => {
      const r = res as ApiResponse<CoachingBatch[]>
      setAddDialogBatches(Array.isArray(r.result) ? r.result : [])
    })
    .catch((err) => { console.warn('[SubjectsByClass] add dialog batches fetch failed ➜', err); setAddDialogBatches([]) })
    .finally(() => setLoadingSections(false))
}, [addForm.class_id])

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => { fetchClasses(); fetchMasterSubjects() }, [fetchClasses, fetchMasterSubjects])
  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  // ── Create ────────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const iId = instituteId || getLS('instituteId')
    if (!addForm.class_id || !addForm.subject_name.trim() || !addForm.subject_type) return
    setSubmitting(true)
    try {
      const payload: CreateSubjectByClassPayload = {
        ...addForm,
        institute_id: iId,
        subject_name: addForm.subject_name.trim(),
        section_id: null,
        batch_id: addForm.batch_id || null,
      }
      const res = await subjectsByClassApi.create(payload) as ApiResponse<SubjectByClass>
      if (!res.success) { showErr(res); return }
      setShowAddDialog(false); resetAddForm(); await fetchSubjects(); await fetchMasterSubjects()
    } catch (err) { showErr(err) }
    finally { setSubmitting(false) }
  }

  // ── Update ────────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selectedSubject) return
    setSubmitting(true)
    try {
      const res = await subjectsByClassApi.update(selectedSubject._id, editForm) as ApiResponse<SubjectByClass>
      if (!res.success) { showErr(res); return }
      setShowEditDialog(false); setSelectedSubject(null); await fetchSubjects()
    } catch (err) { showErr(err) }
    finally { setSubmitting(false) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedSubject) return
    setSubmitting(true)
    try {
      const res = await subjectsByClassApi.delete(selectedSubject._id) as ApiResponse<void>
      if (!res.success) { showErr(res); return }
      setShowDeleteDialog(false); setSelectedSubject(null); await fetchSubjects()
    } catch (err) { showErr(err) }
    finally { setSubmitting(false) }
  }

  // ── Open dialogs ──────────────────────────────────────────────────────────────
  const openViewDialog = (s: SubjectByClass) => { setSelectedSubject(s); setShowViewDialog(true) }
  const openEditDialog = (s: SubjectByClass) => { setSelectedSubject(s); setEditForm({ subject_type: s.subject_type, status: s.status }); setShowEditDialog(true) }
  const resetAddForm = () => {
  setAddForm({ institute_id: '', class_id: '', section_id: null, batch_id: null, subject_name: '', subject_type: 'theory', status: 'active' })
  setAddMode('select'); setAddDialogBatches([])
}

  // ── Group subjects by class → batch ────────────────────────────────────────
  type GroupedBatch = { batchId: string; batchName: string; subjects: SubjectByClass[] }
  type GroupedClass = { classId: string; className: string; batches: GroupedBatch[] }
  const grouped: GroupedClass[] = (() => {
  const map = new Map<string, GroupedClass>()
  for (const s of subjects) {
    const cId = getId(s.class_id)
    const cName = typeof s.class_id === 'object' && s.class_id !== null
      ? (s.class_id as { class_name: string }).class_name : cId
    const bId = getId(s.batch_id) || '__none__'
    const bName =
      typeof s.batch_id === 'object' && s.batch_id !== null
        ? (s.batch_id as BatchRef).batch_name
        : bId === '__none__'
        ? 'No Batch'
        : bId

    if (!map.has(cId)) map.set(cId, { classId: cId, className: cName, batches: [] })
    const cls = map.get(cId)!
    let batch = cls.batches.find((x) => x.batchId === bId)
    if (!batch) { batch = { batchId: bId, batchName: bName, subjects: [] }; cls.batches.push(batch) }
    batch.subjects.push(s)
  }
  return Array.from(map.values())
})()

  const totalPages = Math.ceil(grouped.length / PAGE_SIZE)
  const paginatedGrouped = grouped.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const isAddValid = !!addForm.class_id && addForm.subject_name.trim().length > 0 && !!addForm.subject_type

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Subject Configuration</CardTitle>
            {/* <CardDescription className="mt-1.5">
              Manage subjects assigned to each class and section 
            </CardDescription> */}
            <CardDescription className="mt-1.5">
              Manage subjects assigned to each class and batch
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={fetchSubjects} disabled={loading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={() => { resetAddForm(); setShowAddDialog(true) }}>
              <Plus className="h-4 w-4 mr-2" />Assign Subject
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 pt-3">
          <Select value={filterClassId} onValueChange={(v) => { setFilterClassId(v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c) => <SelectItem key={c._id} value={c._id}>Class {c.class_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterBatchId} onValueChange={(v) => setFilterBatchId(v)} disabled={filterClassId === 'all' || filterBatches.length === 0}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="All Batches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {filterBatches.map((b) => (
              <SelectItem key={b._id!} value={b._id!}>
                {b.batch_name}
                {b.start_time && b.end_time && ` (${b.start_time}–${b.end_time})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>


        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
            <span className="ml-3 text-muted-foreground text-sm">Loading subjects...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1897C6]/10 to-[#67BAC3]/10 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-[#1897C6]" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Subjects Found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              No subjects have been assigned yet. Start by assigning a subject to a class.
            </p>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={() => { resetAddForm(); setShowAddDialog(true) }}>
              <Plus className="h-4 w-4 mr-2" />Assign Subject
            </Button>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">


            {paginatedGrouped.map((cls) => (
              <div key={cls.classId}>
                <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2 border-b-2">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                  <h3 className="text-base sm:text-lg font-bold">Class {cls.className}</h3>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {cls.batches.reduce((a, b) => a + b.subjects.length, 0)} subjects
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {cls.batches.map((batch) => (
                    <Card key={batch.batchId} className="border-2">
                      <CardHeader className="pb-3 pt-3 px-3 sm:pb-4 sm:pt-4 sm:px-6 bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center">
                              <GraduationCap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base mb-1">
                                {batch.batchId === '__none__' ? 'No Batch' : batch.batchName}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-[#1897C6] text-xs">
                                  <BookOpen className="h-3 w-3 mr-1" />
                                  {batch.subjects.length}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] shrink-0"
                            onClick={() => {
                              resetAddForm()
                              setAddForm((f) => ({
                                ...f,
                                class_id: cls.classId,
                                batch_id: batch.batchId === '__none__' ? null : batch.batchId,
                                section_id: null,
                              }))
                              setShowAddDialog(true)
                            }}
                          >
                            <Plus className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline text-xs">Add Subject</span>
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {batch.subjects.map((sub) => {
                            const subjectName =
                              typeof sub.subject_id === 'object' && sub.subject_id !== null
                                ? (sub.subject_id as { subject_name: string }).subject_name
                                : String(sub.subject_id)

                            const subjectCode =
                              sub.subject_code ??
                              (typeof sub.subject_id === 'object' && sub.subject_id !== null
                                ? (sub.subject_id as { subject_code?: string | null }).subject_code ?? null
                                : null)

                            return (
                              <Card
                                key={sub._id}
                                className="border hover:border-[#1897C6] hover:shadow-sm transition-all"
                              >
                                <CardContent className="p-2.5 sm:p-4">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                                        <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-xs sm:text-sm mb-1 truncate">
                                          {subjectName}
                                        </h4>

                                        <div className="flex flex-wrap items-center gap-1">
                                          {subjectCode && (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] font-mono px-1.5 py-0"
                                            >
                                              {subjectCode}
                                            </Badge>
                                          )}

                                          <Badge
                                            className={`${TYPE_BADGE_COLORS[sub.subject_type]} text-white text-[10px] px-1.5 py-0`}
                                          >
                                            {SUBJECT_TYPE_LABELS_BY_CLASS[sub.subject_type]}
                                          </Badge>

                                          <Badge
                                            className={`${STATUS_BADGE_COLORS[sub.status]} text-white text-[10px] px-1.5 py-0`}
                                          >
                                            {sub.status}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-0.5 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-sky-50"
                                        onClick={() => openViewDialog(sub)}
                                        title="View"
                                      >
                                        <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-600" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-blue-50"
                                        onClick={() => openEditDialog(sub)}
                                        title="Edit"
                                      >
                                        <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:bg-red-50"
                                        title="Delete"
                                        onClick={() => {
                                          setSelectedSubject(sub)
                                          setShowDeleteDialog(true)
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
      </CardContent>

      {/* ══════════════════════════════════════════════════════════════════════
          View Subject Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <ViewSubjectDialog
        open={showViewDialog}
        subject={selectedSubject}
        onClose={() => { setShowViewDialog(false); setSelectedSubject(null) }}
        onEdit={() => selectedSubject && openEditDialog(selectedSubject)}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          Add Subject Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!submitting) { setShowAddDialog(open); if (!open) resetAddForm() } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Subject to Class</DialogTitle>
            <DialogDescription>Select a class/section and assign a subject with its type</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Class */}
            <div>
              <Label>Class *</Label>
              <Select value={addForm.class_id} onValueChange={(v) => setAddForm((f) => ({ ...f, class_id: v, section_id: null }))}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c._id} value={c._id}>Class {c.class_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Batch */} 
              <div>
                <Label>Batch <span className="text-muted-foreground text-xs">(optional)</span></Label>
                {loadingSections ? (
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading batches...
                  </div>  
                ) : (
                  <Select
                    value={addForm.batch_id ?? '__none__'}
                    onValueChange={(v) => setAddForm((f) => ({ ...f, batch_id: v === '__none__' ? null : v }))}
                    disabled={!addForm.class_id}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder={addDialogBatches.length === 0 && addForm.class_id ? 'No batches for this class' : 'Select batch (optional)'} />
                    </SelectTrigger>                    <SelectContent>
                      <SelectItem value="__none__">No Batch</SelectItem>
                      {addDialogBatches.map((b) => (
                        <SelectItem key={b._id!} value={b._id!}>
                          {b.batch_name}
                          {b.start_time && b.end_time && ` (${b.start_time}–${b.end_time})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

            {/* Subject */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Subject Name *</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={addMode === 'select' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-xs px-2 ${addMode === 'select' ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3]' : ''}`}
                    onClick={() => { setAddMode('select'); setAddForm((f) => ({ ...f, subject_name: '' })) }}
                  >
                    <Search className="h-3 w-3 mr-1" />Select
                  </Button>
                  <Button
                    type="button"
                    variant={addMode === 'type' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-xs px-2 ${addMode === 'type' ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3]' : ''}`}
                    onClick={() => { setAddMode('type'); setAddForm((f) => ({ ...f, subject_name: '' })) }}
                  >
                    <Edit className="h-3 w-3 mr-1" />Type New
                  </Button>
                </div>
              </div>
              {addMode === 'select' ? (
                <Select
                  value={addForm.subject_name}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, subject_name: v }))}
                  disabled={masterSubjects.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={masterSubjects.length === 0 ? 'No subjects in master — use Type New' : 'Select existing subject'} />
                  </SelectTrigger>
                  <SelectContent>
                    {masterSubjects.map((m) => (
                      <SelectItem key={m._id} value={m.subject_name}>
                        {m.subject_name}{m.subject_code ? ` (${m.subject_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {addMode === 'type' ? (
                <Input
                  placeholder="e.g., Mathematics, Physics, English"
                  value={addForm.subject_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, subject_name: e.target.value }))}
                />
              ) : null}
            </div>

            {/* Subject Type */}
            <div>
              <Label>Subject Type *</Label>
              <Select value={addForm.subject_type} onValueChange={(v) => setAddForm((f) => ({ ...f, subject_type: v as CreateSubjectByClassPayload['subject_type'] }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECT_TYPE_OPTIONS_BY_CLASS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select value={addForm.status ?? 'active'} onValueChange={(v) => setAddForm((f) => ({ ...f, status: v as 'active' | 'inactive' }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetAddForm() }} disabled={submitting}>Cancel</Button>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={handleCreate} disabled={submitting || !isAddValid}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Plus className="h-4 w-4 mr-2" />Assign Subject</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Edit Subject Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!submitting) setShowEditDialog(open) }}>
        <DialogContent className="sm:max-w-sm">
          {selectedSubject && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Subject Assignment</DialogTitle>
                <DialogDescription>Update subject type or status for this assignment</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <p className="font-medium">
                    {typeof selectedSubject.subject_id === 'object' && selectedSubject.subject_id !== null
                      ? (selectedSubject.subject_id as { subject_name: string }).subject_name
                      : String(selectedSubject.subject_id)}
                  </p>
                  {selectedSubject.subject_code && (
                    <p className="text-xs text-muted-foreground font-mono">{selectedSubject.subject_code}</p>
                  )}
                </div>

                <div>
                  <Label>Subject Type *</Label>
                  <Select
                    value={editForm.subject_type ?? selectedSubject.subject_type}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, subject_type: v as SubjectByClass['subject_type'] }))}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECT_TYPE_OPTIONS_BY_CLASS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={editForm.status ?? selectedSubject.status}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as SubjectByClass['status'] }))}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitting}>Cancel</Button>
                <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" onClick={handleUpdate} disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Edit className="h-4 w-4 mr-2" />Save Changes</>}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Delete Confirmation Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!submitting) setShowDeleteDialog(open) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />Remove Subject?
            </DialogTitle>
            <DialogDescription className="pt-1">
              {selectedSubject && (
                <>
                  <span className="font-semibold text-foreground">
                    {typeof selectedSubject.subject_id === 'object' && selectedSubject.subject_id !== null
                      ? (selectedSubject.subject_id as { subject_name: string }).subject_name
                      : 'This subject'}
                  </span>{' '}
                  will be removed from this class/section. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing...</> : <><Trash2 className="h-4 w-4 mr-2" />Remove</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <ErrorDialog open={showError} message={errorMsg} onClose={() => setShowError(false)} />
    </Card>
  )
}
