'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Calendar, Edit2, Plus, Trash2, AlertCircle, RefreshCw, Save, ClipboardList, Eye, Paperclip, CheckSquare, ExternalLink, ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { classesApi } from '@/lib/api/classes'
import { subjectsByClassApi } from '@/lib/api/subjects'
import { teachersApi } from '@/lib/api/teachers'
import type { ClassMaster, CoachingBatch } from '@/lib/api/classes'
import type { SubjectByClass } from '@/lib/api/subjects'
import type { HomeworkAssignment, HomeworkSubmission, CreateHomeworkAssignmentPayload, UpdateHomeworkAssignmentPayload, HomeworkPriority, HomeworkAssignmentStatus } from '@/lib/api/teachers'
import { IMAGE_BASE_URL } from '@/lib/api/config'
import { resolveClassName, resolveSubjectName, getSubjectOptions } from './assignments/types'
import { Pagination } from '@/components/pagination'


type HWFormState = {
  title: string; description: string; class_id: string; batch_id: string; subject_id: string
  assigned_date: string; due_date: string; total_marks: string; instructions: string
  priority: HomeworkPriority | ''; status: HomeworkAssignmentStatus
}

const HW_FORM_DEFAULTS: HWFormState = {
  title: '', description: '', class_id: '', batch_id: '', subject_id: '',
  assigned_date: new Date().toISOString().split('T')[0], due_date: '', total_marks: '',
  instructions: '', priority: '', status: 'active',
}

const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|svg)$/i
function isImageUrl(url: string): boolean { return IMAGE_EXTS.test(url.split('?')[0]) }
function extractStringId(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj._id === 'string') return obj._id
  }
  return ''
}
function getFullUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${IMAGE_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}
function fileNameFromUrl(url: string): string { return url.split('/').pop() ?? url }
function hwPriorityClass(p: HomeworkPriority | null | undefined): string {
  if (p === 'high') return 'bg-red-50 text-red-700 border-red-300'
  if (p === 'medium') return 'bg-amber-50 text-amber-700 border-amber-300'
  if (p === 'low') return 'bg-blue-50 text-blue-700 border-blue-300'
  return 'bg-gray-100 text-gray-600 border-gray-300'
}
function hwStatusClass(s: HomeworkAssignmentStatus): string {
  if (s === 'active') return 'bg-green-50 text-green-700 border-green-300'
  if (s === 'closed') return 'bg-gray-100 text-gray-600 border-gray-300'
  if (s === 'archived') return 'bg-purple-50 text-purple-700 border-purple-300'
  return ''
}
function hwSubStatusClass(s: HomeworkSubmission['status']): string {
  if (s === 'submitted') return 'bg-blue-50 text-blue-700 border-blue-300'
  if (s === 'evaluated') return 'bg-green-50 text-green-700 border-green-300'
  if (s === 'late_submission') return 'bg-red-50 text-red-700 border-red-300'
  return 'bg-yellow-50 text-yellow-700 border-yellow-300'
}
function formatDate(val: string | null | undefined): string {
  if (!val) return '—'
  try { return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return val }
}

function HomeworkSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border-2 p-4 space-y-3">
          <div className="flex justify-between">
            <div className="h-5 w-52 rounded bg-muted" />
            <div className="flex gap-2"><div className="h-7 w-24 rounded bg-muted" /><div className="h-7 w-7 rounded bg-muted" /><div className="h-7 w-7 rounded bg-muted" /></div>
          </div>
          <div className="flex gap-2"><div className="h-5 w-20 rounded bg-muted" /><div className="h-5 w-24 rounded bg-muted" /><div className="h-5 w-14 rounded bg-muted" /></div>
          <div className="h-4 w-64 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}



interface HomeworkTabProps {
  teacherId: string
  classList: ClassMaster[]
  subjectsByClassMap: Record<string, SubjectByClass[]>
  onClassListLoad: (list: ClassMaster[]) => void
  onSubjectsLoad: (classId: string, subjects: SubjectByClass[]) => void
}

export default function HomeworkTab({ teacherId, classList, subjectsByClassMap, onClassListLoad, onSubjectsLoad }: HomeworkTabProps) {
  const classListRef = useRef(classList)
  useEffect(() => { classListRef.current = classList }, [classList])
  const hwFileInputRef = useRef<HTMLInputElement>(null)

  const [hwAssignments, setHwAssignments] = useState<HomeworkAssignment[]>([])
  const [hwLoading, setHwLoading] = useState(false)
  const [hwError, setHwError] = useState<string | null>(null)
  const [hwStatusFilter, setHwStatusFilter] = useState<HomeworkAssignmentStatus | 'all'>('all')
  const [hwCurrentPage, setHwCurrentPage] = useState(1)
  const HW_PAGE_SIZE = 5

  const [hwFormOpen, setHwFormOpen] = useState(false)
  const [hwEditTarget, setHwEditTarget] = useState<HomeworkAssignment | null>(null)
  const [hwFormSaving, setHwFormSaving] = useState(false)
  const [hwFormError, setHwFormError] = useState<string | null>(null)
  const [hwForm, setHwForm] = useState<HWFormState>(HW_FORM_DEFAULTS)
  const [hwFormFiles, setHwFormFiles] = useState<File[]>([])
  const [hwFormBatches, setHwFormBatches] = useState<CoachingBatch[]>([])
  const [hwFormSubjects, setHwFormSubjects] = useState<SubjectByClass[]>([])

  // View dialog state
  const [hwViewOpen, setHwViewOpen] = useState(false)
  const [hwViewTarget, setHwViewTarget] = useState<HomeworkAssignment | null>(null)
  const [hwViewSubs, setHwViewSubs] = useState<HomeworkSubmission[]>([])
  const [hwViewSubsLoading, setHwViewSubsLoading] = useState(false)
  const [hwViewSubsError, setHwViewSubsError] = useState<string | null>(null)

  const [hwDeleteOpen, setHwDeleteOpen] = useState(false)
  const [hwDeleteTarget, setHwDeleteTarget] = useState<HomeworkAssignment | null>(null)
  const [hwDeleting, setHwDeleting] = useState(false)
  const [hwDeleteError, setHwDeleteError] = useState<string | null>(null)

  const [hwSubsOpen, setHwSubsOpen] = useState(false)
  const [hwSubsTarget, setHwSubsTarget] = useState<HomeworkAssignment | null>(null)
  const [hwSubs, setHwSubs] = useState<HomeworkSubmission[]>([])
  const [hwSubsLoading, setHwSubsLoading] = useState(false)
  const [hwSubsError, setHwSubsError] = useState<string | null>(null)

  const [hwEvalOpen, setHwEvalOpen] = useState(false)
  const [hwEvalTarget, setHwEvalTarget] = useState<HomeworkSubmission | null>(null)
  const [hwEvalSaving, setHwEvalSaving] = useState(false)
  const [hwEvalError, setHwEvalError] = useState<string | null>(null)
  const [hwEvalForm, setHwEvalForm] = useState({ marks_obtained: '', feedback: '' })

  const fetchHomeworkAssignments = useCallback(async () => {
    setHwLoading(true); setHwError(null)
    try {
      const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
      const res = await teachersApi.getAllHomeworkAssignments({
        assigned_by: teacherId,
        ...(instituteId ? { institute_id: instituteId } : {}),
      })
      if (!res.success) throw new Error(res.message ?? 'Unable to load homework assignments.')
      const list = res.result ?? []
      setHwAssignments(list)
const extractId = (val: unknown): string => {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj._id === 'string') return obj._id
    if (typeof obj.toString === 'function') return obj.toString()
  }
  return String(val)
}
const uniqueClassIds = [...new Set(list.map((h) => extractId(h.class_id)).filter(Boolean))]
await Promise.allSettled(uniqueClassIds.map(async (classId) => {
  if (subjectsByClassMap[classId]) return
  try {
    const sRes = await subjectsByClassApi.getByClass(classId)
          if (sRes.success && sRes.result) onSubjectsLoad(classId, sRes.result)
        } catch (e) { console.warn('[HomeworkTab] Subject fetch skipped:', classId, e) }
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load homework assignments.'
      setHwError(msg); console.error('[HomeworkTab] fetchHomework error:', err)
    } finally { setHwLoading(false) }
  }, [teacherId, subjectsByClassMap, onSubjectsLoad])

  useEffect(() => { void fetchHomeworkAssignments() }, [fetchHomeworkAssignments])

  const loadClassListSilent = useCallback(async () => {
    if (classListRef.current.length > 0) return
    try {
      const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
      const res = await classesApi.getAll({ ...(instituteId ? { instituteId } : {}), status: 'active' })
      if (res.success) onClassListLoad(res.result ?? [])
    } catch (e) { console.warn('[HomeworkTab] Silent class load failed:', e) }
  }, [onClassListLoad])

  const handleHWFormClassChange = useCallback(async (classId: string) => {
    setHwForm((p) => ({ ...p, class_id: classId, batch_id: '', subject_id: '' }))
    setHwFormBatches([]); setHwFormSubjects([])
    if (!classId) return
    try {
      const [bRes, subRes] = await Promise.allSettled([
        classesApi.getBatchesByClass(classId),
        subjectsByClassApi.getByClass(classId),
      ])
      if (bRes.status === 'fulfilled' && bRes.value.success && bRes.value.result) setHwFormBatches(bRes.value.result)
      if (subRes.status === 'fulfilled' && subRes.value.success && subRes.value.result) { setHwFormSubjects(subRes.value.result); onSubjectsLoad(classId, subRes.value.result) }
    } catch (e) { console.warn('[HomeworkTab] Form class change failed:', e) }
  }, [onSubjectsLoad])

  const handleHWCreate = () => {
    setHwEditTarget(null)
    setHwForm({ ...HW_FORM_DEFAULTS, assigned_date: new Date().toISOString().split('T')[0] })
    setHwFormFiles([]); setHwFormBatches([]); setHwFormSubjects([]); setHwFormError(null)
    void loadClassListSilent(); setHwFormOpen(true)
  }

  const handleHWEdit = async (hw: HomeworkAssignment) => {
    // Normalize: MongoDB may return ObjectId objects — extract string safely
    const extractId = (val: unknown): string => {
      if (!val) return ''
      if (typeof val === 'string') return val
      if (typeof val === 'object') {
        const obj = val as Record<string, unknown>
        if (typeof obj._id === 'string') return obj._id
        if (typeof obj.toString === 'function') return obj.toString()
      }
      return String(val)
    }

    const classId = extractId(hw.class_id)
    const batchId = extractId(hw.batch_id)
    const subjectId = extractId(hw.subject_id)

    setHwEditTarget(hw)
    setHwForm({
      title: hw.title, description: hw.description ?? '',
      class_id: classId, batch_id: batchId, subject_id: subjectId,
      assigned_date: hw.assigned_date.split('T')[0],
      due_date: hw.due_date.split('T')[0],
      total_marks: hw.total_marks?.toString() ?? '',
      instructions: hw.instructions ?? '', priority: hw.priority ?? '', status: hw.status,
    })
    setHwFormFiles([]); setHwFormBatches([]); setHwFormSubjects([]); setHwFormError(null)
    await Promise.allSettled([
      loadClassListSilent(),
      classId ? (async () => {
        try {
          const [bRes, subRes] = await Promise.allSettled([
            classesApi.getBatchesByClass(classId),
            subjectsByClassApi.getByClass(classId),
          ])
          if (bRes.status === 'fulfilled' && bRes.value.success && bRes.value.result) setHwFormBatches(bRes.value.result)
          if (subRes.status === 'fulfilled' && subRes.value.success && subRes.value.result) { setHwFormSubjects(subRes.value.result); onSubjectsLoad(classId, subRes.value.result) }
        } catch (e) { console.warn('[HomeworkTab] Edit pre-load failed:', e) }
      })() : Promise.resolve()
    ])
    setHwFormOpen(true)
  }

  const handleHWSave = async () => {
    if (!hwForm.title.trim()) { setHwFormError('Title is required.'); return }
    if (!hwForm.class_id) { setHwFormError('Class is required.'); return }
    if (!hwForm.batch_id) { setHwFormError('Batch is required.'); return }
    if (!hwForm.subject_id) { setHwFormError('Subject is required.'); return }
    if (!hwForm.assigned_date) { setHwFormError('Assigned date is required.'); return }
    if (!hwForm.due_date) { setHwFormError('Due date is required.'); return }
    setHwFormSaving(true); setHwFormError(null)
    try {
      if (hwEditTarget) {
        const payload: UpdateHomeworkAssignmentPayload = { title: hwForm.title.trim(), description: hwForm.description.trim() || null, class_id: hwForm.class_id, batch_id: hwForm.batch_id || null, subject_id: hwForm.subject_id, assigned_date: hwForm.assigned_date, due_date: hwForm.due_date, total_marks: hwForm.total_marks ? Number(hwForm.total_marks) : null, instructions: hwForm.instructions.trim() || null, priority: (hwForm.priority as HomeworkPriority) || null, status: hwForm.status, attachments: hwFormFiles.length > 0 ? hwFormFiles : undefined }
        const res = await teachersApi.updateHomeworkAssignment(hwEditTarget._id, payload)
        if (!res.success) throw new Error(res.message ?? 'Failed to update assignment.')
        console.log('[HomeworkTab] Assignment updated:', hwEditTarget._id)
      } else {
        const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
        const payload: CreateHomeworkAssignmentPayload = { institute_id: instituteId, title: hwForm.title.trim(), description: hwForm.description.trim() || null, class_id: hwForm.class_id, batch_id: hwForm.batch_id || null, subject_id: hwForm.subject_id, assigned_by: teacherId, assigned_date: hwForm.assigned_date, due_date: hwForm.due_date, total_marks: hwForm.total_marks ? Number(hwForm.total_marks) : null, instructions: hwForm.instructions.trim() || null, priority: (hwForm.priority as HomeworkPriority) || null, status: hwForm.status, attachments: hwFormFiles }
        const res = await teachersApi.createHomeworkAssignment(payload)
        if (!res.success) throw new Error(res.message ?? 'Failed to create assignment.')
        console.log('[HomeworkTab] Assignment created:', res.result?._id)
      }
      await fetchHomeworkAssignments(); setHwFormOpen(false)
    } catch (err: unknown) {
      setHwFormError(err instanceof Error ? err.message : hwEditTarget ? 'Failed to update assignment.' : 'Failed to create assignment.')
      console.error('[HomeworkTab] save error:', err)
    } finally { setHwFormSaving(false) }
  }

  const handleHWDeleteOpen = (hw: HomeworkAssignment) => { setHwDeleteTarget(hw); setHwDeleteError(null); setHwDeleteOpen(true) }

  const handleHWView = async (hw: HomeworkAssignment) => {
    setHwViewTarget(hw)
    setHwViewSubs([])
    setHwViewSubsError(null)
    setHwViewSubsLoading(true)
    setHwViewOpen(true)
    try {
      const res = await teachersApi.getAllHomeworkSubmissions({ homework_id: hw._id })
      if (!res.success) throw new Error(res.message ?? 'Failed to load submissions.')
      setHwViewSubs(res.result ?? [])
    } catch (err: unknown) {
      setHwViewSubsError('Unable to load submission summary. Please try again.')
      console.error('[HomeworkTab] View submissions fetch error:', err)
    } finally {
      setHwViewSubsLoading(false)
    }
  }

  const confirmHWDelete = async () => {
    if (!hwDeleteTarget) return
    setHwDeleting(true)
    try {
      const res = await teachersApi.deleteHomeworkAssignment(hwDeleteTarget._id)
      if (!res.success) throw new Error(res.message ?? 'Failed to delete.')
      console.log('[HomeworkTab] Assignment deleted:', hwDeleteTarget._id)
      await fetchHomeworkAssignments()
    } catch (err: unknown) {
      setHwDeleteError('Failed to delete assignment. Please try again.')
      console.error('[HomeworkTab] delete error:', err)
    } finally { setHwDeleting(false); setHwDeleteOpen(false); setHwDeleteTarget(null) }
  }

  const handleHWViewSubmissions = async (hw: HomeworkAssignment) => {
    setHwSubsTarget(hw); setHwSubs([]); setHwSubsError(null); setHwSubsLoading(true); setHwSubsOpen(true)
    try {
      const res = await teachersApi.getAllHomeworkSubmissions({ homework_id: hw._id })
      if (!res.success) throw new Error(res.message ?? 'Failed to load submissions.')
      setHwSubs(res.result ?? [])
    } catch (err: unknown) {
      setHwSubsError('Failed to load submissions. Please try again.')
      console.error('[HomeworkTab] submissions error:', err)
    } finally { setHwSubsLoading(false) }
  }

  const handleHWEvalOpen = (sub: HomeworkSubmission) => {
    setHwEvalTarget(sub); setHwEvalForm({ marks_obtained: sub.marks_obtained?.toString() ?? '', feedback: sub.feedback ?? '' }); setHwEvalError(null); setHwEvalOpen(true)
  }

  const confirmHWEval = async () => {
    if (!hwEvalTarget) return
    if (!hwEvalForm.marks_obtained.trim()) { setHwEvalError('Marks obtained is required.'); return }
    const marks = Number(hwEvalForm.marks_obtained)
    if (isNaN(marks) || marks < 0) { setHwEvalError('Please enter a valid marks value.'); return }
    setHwEvalSaving(true); setHwEvalError(null)
    try {
      const res = await teachersApi.evaluateHomeworkSubmission(hwEvalTarget._id, { marks_obtained: marks, feedback: hwEvalForm.feedback.trim() || null, evaluated_by: teacherId })
      if (!res.success) throw new Error(res.message ?? 'Failed to evaluate.')
      console.log('[HomeworkTab] Submission evaluated:', hwEvalTarget._id)
      if (res.result) setHwSubs((prev) => prev.map((s) => s._id === hwEvalTarget._id ? res.result! : s))
      setHwEvalOpen(false)
    } catch (err: unknown) {
      setHwEvalError('Failed to save evaluation. Please try again.')
      console.error('[HomeworkTab] evaluate error:', err)
    } finally { setHwEvalSaving(false) }
  }

  const filteredHwAssignments = hwStatusFilter === 'all' ? hwAssignments : hwAssignments.filter((h) => h.status === hwStatusFilter)
  const hwTotalPages = Math.ceil(filteredHwAssignments.length / HW_PAGE_SIZE)
  const hwPagedAssignments = filteredHwAssignments.slice((hwCurrentPage - 1) * HW_PAGE_SIZE, hwCurrentPage * HW_PAGE_SIZE)
  const hwSubjectOptions = getSubjectOptions(hwFormSubjects)

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={hwStatusFilter} onValueChange={(v) => { setHwStatusFilter(v as HomeworkAssignmentStatus | 'all'); setHwCurrentPage(1) }}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {!hwLoading && <Badge variant="outline" className="text-xs font-mono h-9 px-3">{filteredHwAssignments.length} {hwStatusFilter === 'all' ? 'total' : hwStatusFilter}</Badge>}
        </div>
        <Button size="sm" onClick={handleHWCreate} className="w-full sm:w-auto gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9">
          <Plus className="h-4 w-4" /><span className="text-xs sm:text-sm">Create Assignment</span>
        </Button>
      </div>

      {hwError && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{hwError}</span>
          <Button size="sm" variant="ghost" onClick={fetchHomeworkAssignments} className="h-7 gap-1 text-rose-600 hover:bg-rose-100"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
        </div>
      )}

      {hwLoading ? <HomeworkSkeleton /> : filteredHwAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <ClipboardList className="h-10 w-10 opacity-30" />
          <p className="text-sm">{hwStatusFilter === 'all' ? 'No homework assignments found' : `No ${hwStatusFilter} assignments`}</p>
          <Button size="sm" variant="outline" onClick={handleHWCreate} className="gap-2 h-8"><Plus className="h-3.5 w-3.5" /> Create one</Button>
        </div>
      ) : (
        <><div className="space-y-3">
            {hwPagedAssignments.map((hw) => {
              const className = resolveClassName(hw.class_id, classList)
              const subjectName = resolveSubjectName(hw.subject_id, subjectsByClassMap, hw.class_id)
              return (
                <Card key={hw._id} className="border-2 hover:border-[#1897C6]/40 transition-all">
                  <CardContent className="p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base leading-tight truncate">{hw.title}</h4>
                        {hw.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{hw.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs px-2 border-emerald-400 text-emerald-700 hover:bg-emerald-300 transition-colors" onClick={() => handleHWViewSubmissions(hw)}>
                          <CheckSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline">Submissions</span>
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs px-2 border-[#1897C6] text-[#1897C6] hover:bg-[#1897C6] hover:text-white transition-colors" onClick={() => void handleHWView(hw)}>
                          <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline"></span>
                        </Button>

                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit" onClick={() => { void handleHWEdit(hw) } }><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => handleHWDeleteOpen(hw)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-0 text-xs">{className}</Badge>
                      <Badge className="bg-gradient-to-r from-[#F1AF37] to-[#D88931] text-white border-0 text-xs">{subjectName}</Badge>
                      {hw.priority && <Badge variant="outline" className={`text-xs capitalize ${hwPriorityClass(hw.priority)}`}>{hw.priority}</Badge>}
                      <Badge variant="outline" className={`text-xs capitalize ${hwStatusClass(hw.status)}`}>{hw.status}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><span>Assigned: {formatDate(hw.assigned_date)}</span></div>
                      <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /><span>Due: {formatDate(hw.due_date)}</span></div>
                      {hw.total_marks !== null && hw.total_marks !== undefined && <span className="font-medium text-foreground">Marks: {hw.total_marks}</span>}
                      {(hw.attachment_urls?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          {hw.attachment_urls!.map((url, i) => {
                            const full = getFullUrl(url); const name = fileNameFromUrl(url); const isImg = isImageUrl(url)
                            return <a key={i} href={full} target="_blank" rel="noopener noreferrer" title={name} className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-[#1897C6] transition-colors max-w-[120px] truncate">{isImg ? <ImageIcon className="h-3 w-3 shrink-0" /> : <ExternalLink className="h-3 w-3 shrink-0" />}<span className="truncate text-xs">{name.length > 14 ? `${name.slice(0, 14)}…` : name}</span></a>
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div><Pagination
              currentPage={hwCurrentPage}
              totalPages={hwTotalPages}
              onPageChange={setHwCurrentPage} /></>
      )}

      {/* VIEW DIALOG */}
      <Dialog open={hwViewOpen} onOpenChange={setHwViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#1897C6]" />
              Assignment Details
            </DialogTitle>
            <DialogDescription className="text-sm">Full details and submission summary for this assignment.</DialogDescription>
          </DialogHeader>
          {hwViewTarget && (
            <div className="space-y-5">
              {/* Title & Status */}
              <div className="rounded-lg border-2 border-[#1897C6]/20 bg-gradient-to-br from-[#1897C6]/5 to-[#67BAC3]/5 p-4 space-y-2">
                <h3 className="font-semibold text-base sm:text-lg leading-snug">{hwViewTarget.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-0 text-xs">
                    {resolveClassName(hwViewTarget.class_id, classList)}
                  </Badge>
                  <Badge className="bg-gradient-to-r from-[#F1AF37] to-[#D88931] text-white border-0 text-xs">
                    {resolveSubjectName(hwViewTarget.subject_id, subjectsByClassMap, hwViewTarget.class_id)}
                  </Badge>
                  {hwViewTarget.priority && (
                    <Badge variant="outline" className={`text-xs capitalize ${hwPriorityClass(hwViewTarget.priority)}`}>{hwViewTarget.priority}</Badge>
                  )}
                  <Badge variant="outline" className={`text-xs capitalize ${hwStatusClass(hwViewTarget.status)}`}>{hwViewTarget.status}</Badge>
                </div>
              </div>

              {/* Dates & Marks */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Assigned</p>
                  <p className="text-sm font-medium">{formatDate(hwViewTarget.assigned_date)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Due Date</p>
                  <p className="text-sm font-medium">{formatDate(hwViewTarget.due_date)}</p>
                </div>
                {hwViewTarget.total_marks !== null && hwViewTarget.total_marks !== undefined && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Total Marks</p>
                    <p className="text-sm font-medium">{hwViewTarget.total_marks}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {hwViewTarget.description && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                  <p className="text-sm rounded-lg bg-muted/40 px-3 py-2 leading-relaxed">{hwViewTarget.description}</p>
                </div>
              )}

              {/* Instructions */}
              {hwViewTarget.instructions && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instructions</p>
                  <p className="text-sm rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 leading-relaxed text-amber-900">{hwViewTarget.instructions}</p>
                </div>
              )}

              {/* Attachments */}
              {(hwViewTarget.attachment_urls?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {hwViewTarget.attachment_urls!.map((url, i) => {
                      const full = getFullUrl(url); const name = fileNameFromUrl(url); const isImg = isImageUrl(url)
                      return (
                        <a key={i} href={full} target="_blank" rel="noopener noreferrer" title={name}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#1897C6]/30 bg-[#1897C6]/5 px-2.5 py-1.5 text-xs text-[#1897C6] hover:bg-[#1897C6]/10 transition-colors">
                          {isImg ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate max-w-[120px]">{name.length > 18 ? `${name.slice(0, 18)}…` : name}</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Submissions Summary */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submissions Summary</p>
                {hwViewSubsLoading ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-muted" />)}
                  </div>
                ) : hwViewSubsError ? (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{hwViewSubsError}</span>
                    <Button size="sm" variant="ghost" onClick={() => void handleHWView(hwViewTarget)} className="h-7 gap-1 text-rose-600 hover:bg-rose-100 shrink-0"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
                  </div>
                ) : hwViewSubs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2 rounded-lg border border-dashed">
                    <ClipboardList className="h-7 w-7 opacity-30" />
                    <p className="text-sm">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(['pending', 'submitted', 'evaluated', 'late_submission'] as const).map((s) => {
                        const count = hwViewSubs.filter((sub) => sub.status === s).length
                        if (count === 0) return null
                        return <Badge key={s} variant="outline" className={`text-xs capitalize ${hwSubStatusClass(s)}`}>{s.replace('_', ' ')}: {count}</Badge>
                      })}
                    </div>
                    <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                      {hwViewSubs.map((sub) => (
                        <div key={sub._id} className="flex items-center justify-between px-3 py-2 gap-2 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-xs font-medium shrink-0">
                              {typeof sub.student_id === 'object' && sub.student_id !== null
                                ? (sub.student_id as { full_name?: string; student_code?: string }).full_name ?? (sub.student_id as { student_code?: string }).student_code ?? extractStringId(sub.student_id).slice(-8)
                                : String(sub.student_id).slice(-8)}
                            </span>
                            <Badge variant="outline" className={`text-xs capitalize shrink-0 ${hwSubStatusClass(sub.status)}`}>{sub.status.replace('_', ' ')}</Badge>
                            {sub.is_late && <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300 shrink-0">Late</Badge>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {sub.marks_obtained !== null && sub.marks_obtained !== undefined && (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 text-xs">{sub.marks_obtained}{hwViewTarget.total_marks ? `/${hwViewTarget.total_marks}` : ''}</Badge>
                            )}
                            {sub.submission_date && <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(sub.submission_date)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setHwViewOpen(false)} className="h-9">Close</Button>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9 gap-2" onClick={() => { setHwViewOpen(false); void handleHWEdit(hwViewTarget!) }} disabled={!hwViewTarget}>
              <Edit2 className="h-4 w-4" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={hwFormOpen} onOpenChange={setHwFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{hwEditTarget ? 'Edit Homework Assignment' : 'Create Homework Assignment'}</DialogTitle>
            <DialogDescription className="text-sm">{hwEditTarget ? 'Update the homework assignment details.' : 'Fill in the details to create a new homework assignment.'}</DialogDescription>
          </DialogHeader>
          {hwFormError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{hwFormError}</span></div>}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Title <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Math Assignment - Chapter 5" value={hwForm.title} onChange={(e) => setHwForm((p) => ({ ...p, title: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea placeholder="Brief description..." value={hwForm.description} onChange={(e) => setHwForm((p) => ({ ...p, description: e.target.value }))} className="min-h-[72px] resize-none text-sm" />
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Class <span className="text-red-500">*</span></Label>
                <Select value={hwForm.class_id} onValueChange={handleHWFormClassChange}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={classList.length === 0 ? 'Loading...' : 'Select class'} /></SelectTrigger>
                  <SelectContent>{classList.map((c) => <SelectItem key={c._id} value={c._id}>{c.class_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Batch <span className="text-red-500">*</span></Label>
                <Select value={hwForm.batch_id} onValueChange={(v) => setHwForm((p) => ({ ...p, batch_id: v }))} disabled={!hwForm.class_id || hwFormBatches.length === 0}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={!hwForm.class_id ? 'Select class first' : hwFormBatches.length === 0 ? 'No batches found' : 'Select batch'} /></SelectTrigger>
                  <SelectContent>{hwFormBatches.map((b) => <SelectItem key={b._id} value={b._id!}>{b.batch_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Subject <span className="text-red-500">*</span></Label>
              <Select value={hwForm.subject_id} onValueChange={(v) => setHwForm((p) => ({ ...p, subject_id: v }))} disabled={hwSubjectOptions.length === 0}>
                <SelectTrigger className="h-9"><SelectValue placeholder={!hwForm.class_id ? 'Select class first' : hwSubjectOptions.length === 0 ? 'No subjects for this class' : 'Select subject'} /></SelectTrigger>
                <SelectContent>{hwSubjectOptions.map((opt: { key: string; id: string; name: string }) => <SelectItem key={opt.key} value={opt.id}>{opt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Assigned Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={hwForm.assigned_date} onChange={(e) => setHwForm((p) => ({ ...p, assigned_date: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Due Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={hwForm.due_date} onChange={(e) => setHwForm((p) => ({ ...p, due_date: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Total Marks</Label>
                <Input type="number" placeholder="e.g. 100" min={0} value={hwForm.total_marks} onChange={(e) => setHwForm((p) => ({ ...p, total_marks: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={hwForm.priority || '__none__'} onValueChange={(v) => setHwForm((p) => ({ ...p, priority: v === '__none__' ? '' : v as HomeworkPriority }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">None</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {hwEditTarget && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={hwForm.status} onValueChange={(v) => setHwForm((p) => ({ ...p, status: v as HomeworkAssignmentStatus }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Instructions</Label>
              <Textarea placeholder="Additional instructions for students..." value={hwForm.instructions} onChange={(e) => setHwForm((p) => ({ ...p, instructions: e.target.value }))} className="min-h-[64px] resize-none text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{hwEditTarget ? 'Add More Attachments' : 'Attachments'}</Label>
              <input type="file" multiple ref={hwFileInputRef} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={(e) => setHwFormFiles(Array.from(e.target.files ?? []))} />
              <Button type="button" variant="outline" size="sm" className="h-9 gap-2 w-full sm:w-auto" onClick={() => hwFileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />{hwFormFiles.length > 0 ? `${hwFormFiles.length} file(s) selected` : 'Attach Files'}
              </Button>
              {hwFormFiles.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{hwFormFiles.map((f, i) => <Badge key={i} variant="outline" className="text-xs gap-1">{f.name.length > 20 ? `${f.name.slice(0, 20)}…` : f.name}</Badge>)}</div>}
              {hwEditTarget && (hwEditTarget.attachment_urls?.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">{hwEditTarget.attachment_urls!.length} existing attachment(s) will be kept.</p>}
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setHwFormOpen(false)} className="h-9" disabled={hwFormSaving}>Cancel</Button>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9 gap-2" onClick={handleHWSave} disabled={hwFormSaving}>
              {hwFormSaving ? (hwEditTarget ? 'Updating...' : 'Creating...') : <><Save className="h-4 w-4" />{hwEditTarget ? 'Update' : 'Create'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={hwDeleteOpen} onOpenChange={setHwDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
            <AlertDialogDescription>{hwDeleteTarget && <>This will permanently delete <strong>&quot;{hwDeleteTarget.title}&quot;</strong>. All submissions for this assignment will also be removed.</>}</AlertDialogDescription>
            {hwDeleteError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mt-2"><AlertCircle className="h-4 w-4 shrink-0" /><span>{hwDeleteError}</span></div>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hwDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmHWDelete} disabled={hwDeleting} className="bg-red-500 hover:bg-red-600">{hwDeleting ? 'Deleting...' : 'Yes, Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SUBMISSIONS DIALOG */}
      <Dialog open={hwSubsOpen} onOpenChange={setHwSubsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Submissions</DialogTitle>
            <DialogDescription className="text-sm">{hwSubsTarget?.title}</DialogDescription>
          </DialogHeader>
          {hwSubsError && (
            <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{hwSubsError}</span>
              <Button size="sm" variant="ghost" onClick={() => hwSubsTarget && handleHWViewSubmissions(hwSubsTarget)} className="h-7 gap-1 text-rose-600 hover:bg-rose-100"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
            </div>
          )}
          {hwSubsLoading ? (
            <div className="space-y-3 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="rounded-lg border p-3 space-y-2"><div className="flex justify-between"><div className="h-4 w-32 rounded bg-muted" /><div className="h-6 w-20 rounded bg-muted" /></div><div className="h-3 w-48 rounded bg-muted/60" /></div>)}</div>
          ) : hwSubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2"><ClipboardList className="h-8 w-8 opacity-30" /><p className="text-sm">No submissions yet</p></div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['pending', 'submitted', 'evaluated', 'late_submission'] as const).map((s) => {
                  const count = hwSubs.filter((sub) => sub.status === s).length
                  if (count === 0) return null
                  return <Badge key={s} variant="outline" className={`text-xs capitalize ${hwSubStatusClass(s)}`}>{s.replace('_', ' ')}: {count}</Badge>
                })}
              </div>
              {hwSubs.map((sub) => (
                <Card key={sub._id} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {typeof sub.student_id === 'object' && sub.student_id !== null
                            ? (sub.student_id as { full_name?: string; student_code?: string }).full_name ?? (sub.student_id as { student_code?: string }).student_code ?? extractStringId(sub.student_id).slice(-8)
                            : String(sub.student_id).slice(-8)}
                        </Badge>
                        <Badge variant="outline" className={`text-xs capitalize ${hwSubStatusClass(sub.status)}`}>{sub.status.replace('_', ' ')}</Badge>
                        {sub.is_late && <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">Late</Badge>}
                        {sub.marks_obtained !== null && sub.marks_obtained !== undefined && <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 text-xs">{sub.marks_obtained} marks</Badge>}
                      </div>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleHWEvalOpen(sub)}>
                        <CheckSquare className="h-3.5 w-3.5" />{sub.status === 'evaluated' ? 'Re-evaluate' : 'Evaluate'}
                      </Button>
                    </div>
                    {sub.submission_text && <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 rounded px-2 py-1">{sub.submission_text}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {sub.submission_date && <span>Submitted: {formatDate(sub.submission_date)}</span>}
                      {sub.feedback && <span className="italic truncate max-w-[200px]">Feedback: {sub.feedback}</span>}
                      {(sub.attachment_urls?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                          {sub.attachment_urls!.map((url, i) => {
                            const full = getFullUrl(url); const name = fileNameFromUrl(url); const isImg = isImageUrl(url)
                            return <a key={i} href={full} target="_blank" rel="noopener noreferrer" title={name} className="inline-flex items-center gap-0.5 text-xs text-[#1897C6] underline underline-offset-2 hover:text-[#1254a1] transition-colors max-w-[140px] truncate">{isImg ? <ImageIcon className="h-3 w-3 shrink-0" /> : <ExternalLink className="h-3 w-3 shrink-0" />}<span className="truncate">{name.length > 16 ? `${name.slice(0, 16)}…` : name}</span></a>
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setHwSubsOpen(false)} className="h-9">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EVALUATE DIALOG */}
      <Dialog open={hwEvalOpen} onOpenChange={setHwEvalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Evaluate Submission</DialogTitle>
            <DialogDescription className="text-sm">Enter marks and feedback for this submission.</DialogDescription>
          </DialogHeader>
          {hwEvalError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{hwEvalError}</span></div>}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Marks Obtained <span className="text-red-500">*</span>{hwSubsTarget?.total_marks && <span className="text-xs font-normal text-muted-foreground ml-1">/ {hwSubsTarget.total_marks}</span>}</Label>
              <Input type="number" placeholder="e.g. 85" min={0} max={hwSubsTarget?.total_marks ?? undefined} value={hwEvalForm.marks_obtained} onChange={(e) => setHwEvalForm((p) => ({ ...p, marks_obtained: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Feedback</Label>
              <Textarea placeholder="Optional feedback for the student..." value={hwEvalForm.feedback} onChange={(e) => setHwEvalForm((p) => ({ ...p, feedback: e.target.value }))} className="min-h-[88px] resize-none text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setHwEvalOpen(false)} className="h-9" disabled={hwEvalSaving}>Cancel</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-9 gap-2" onClick={confirmHWEval} disabled={hwEvalSaving}>
              {hwEvalSaving ? 'Saving...' : <><CheckSquare className="h-4 w-4" /> Save Evaluation</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}