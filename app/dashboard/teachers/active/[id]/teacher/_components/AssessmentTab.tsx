'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, AlertCircle, RefreshCw, Save, Edit2, BookOpen, ChevronDown, ChevronUp, Clock, Calendar, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { classesApi } from '@/lib/api/classes'
import { subjectsByClassApi } from '@/lib/api/subjects'
import { assessmentsApi } from '@/lib/api/assessments'
import type { ClassMaster, CoachingBatch } from '@/lib/api/classes'
import type { SubjectByClass } from '@/lib/api/subjects'
import type { Assessment, CreateAssessmentData, UpdateAssessmentData } from '@/lib/api/assessments'
import type { AssessmentQuestion, CreateQuestionData, QuestionOption } from '@/lib/api/assessmentQuestions'
import { assessmentQuestionsApi } from '@/lib/api/assessmentQuestions'
import { getSubjectOptions } from './assignments/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type AssessmentFormState = {
  title: string; description: string; assessment_type: 'mcq' | 'short_answer' | 'mixed'
  class_id: string; batch_id: string; subject_id: string; academic_year: string
  pass_marks: string; duration_minutes: string; available_from: string; available_until: string
  max_attempts: string; show_result_immediately: boolean; show_answer_key: boolean
  status: 'draft' | 'published' | 'closed'
}

const ASSESSMENT_FORM_DEFAULTS: AssessmentFormState = {
  title: '', description: '', assessment_type: 'mcq', class_id: '', batch_id: '',
  subject_id: '', academic_year: '', pass_marks: '', duration_minutes: '',
  available_from: '', available_until: '', max_attempts: '1',
  show_result_immediately: true, show_answer_key: false, status: 'draft',
}

type QuestionFormState = {
  question_text: string; question_type: 'mcq' | 'short_answer'
  options: QuestionOption[]; correct_options: string[]
  correct_answer_text: string; marks: string; hint: string; explanation: string; order: string
}

const Q_FORM_DEFAULTS: QuestionFormState = {
  question_text: '', question_type: 'mcq',
  options: [{ option_id: 'A', option_text: '' }, { option_id: 'B', option_text: '' }, { option_id: 'C', option_text: '' }, { option_id: 'D', option_text: '' }],
  correct_options: [], correct_answer_text: '', marks: '1', hint: '', explanation: '', order: '1',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateTimeLocal(val: string | null | undefined): string {
  if (!val) return ''
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 16)
  } catch { return '' }
}

function formatDateTime(val: string | null | undefined): string {
  if (!val) return '—'
  try {
    // Backend returns Indian locale string: "14/04/2026, 03:30:00 pm"
    // Parse it manually: DD/MM/YYYY, hh:mm:ss am/pm
    const indiaMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)$/i)
    if (indiaMatch) {
      const [, dd, mm, yyyy, hh, min, , ampm] = indiaMatch
      let hours = parseInt(hh, 10)
      if (ampm.toLowerCase() === 'pm' && hours !== 12) hours += 12
      if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0
      const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), hours, parseInt(min))
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      }
    }
    // Fallback: ISO or other standard format
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
    return val
  } catch { return val }
}

function assessmentStatusClass(s: Assessment['status']): string {
  if (s === 'published') return 'bg-green-50 text-green-700 border-green-300'
  if (s === 'closed') return 'bg-gray-100 text-gray-600 border-gray-300'
  return 'bg-amber-50 text-amber-700 border-amber-300'
}

function typeLabel(t: Assessment['assessment_type']): string {
  if (t === 'mcq') return 'MCQ'
  if (t === 'short_answer') return 'Short Answer'
  return 'Mixed'
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function AssessmentSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border-2 p-4 space-y-3">
          <div className="flex justify-between"><div className="h-5 w-52 rounded bg-muted" /><div className="flex gap-2"><div className="h-7 w-20 rounded bg-muted" /><div className="h-7 w-7 rounded bg-muted" /><div className="h-7 w-7 rounded bg-muted" /></div></div>
          <div className="flex gap-2"><div className="h-5 w-16 rounded bg-muted" /><div className="h-5 w-20 rounded bg-muted" /><div className="h-5 w-24 rounded bg-muted" /></div>
          <div className="h-4 w-64 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssessmentTabProps {
  teacherId: string
  classList: ClassMaster[]
  subjectsByClassMap: Record<string, SubjectByClass[]>
  onClassListLoad: (list: ClassMaster[]) => void
  onSubjectsLoad: (classId: string, subjects: SubjectByClass[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentTab({ teacherId, classList, subjectsByClassMap, onClassListLoad, onSubjectsLoad }: AssessmentTabProps) {
  // ── Assessment list state ──────────────────────────────────────────────────
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<Assessment['status'] | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // ── Questions per assessment ───────────────────────────────────────────────
  const [questionsMap, setQuestionsMap] = useState<Record<string, AssessmentQuestion[]>>({})
  const [questionsLoading, setQuestionsLoading] = useState<Record<string, boolean>>({})

  // ── Assessment form dialog ─────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Assessment | null>(null)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<AssessmentFormState>(ASSESSMENT_FORM_DEFAULTS)
  const [formBatches, setFormBatches] = useState<CoachingBatch[]>([])
  const [formSubjects, setFormSubjects] = useState<SubjectByClass[]>([])

  // ── Assessment delete dialog ───────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Question form dialog ───────────────────────────────────────────────────
  const [qFormOpen, setQFormOpen] = useState(false)
  const [qFormAssessment, setQFormAssessment] = useState<Assessment | null>(null)
  const [qEditTarget, setQEditTarget] = useState<AssessmentQuestion | null>(null)
  const [qFormSaving, setQFormSaving] = useState(false)
  const [qFormError, setQFormError] = useState<string | null>(null)
  const [qForm, setQForm] = useState<QuestionFormState>(Q_FORM_DEFAULTS)

  // ── Question delete dialog ─────────────────────────────────────────────────
  const [qDeleteOpen, setQDeleteOpen] = useState(false)
  const [qDeleteTarget, setQDeleteTarget] = useState<{ q: AssessmentQuestion; assessmentId: string } | null>(null)
  const [qDeleting, setQDeleting] = useState(false)
  const [qDeleteError, setQDeleteError] = useState<string | null>(null)

  // ── View dialog state ──────────────────────────────────────────────────────
  const [viewOpen, setViewOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState<Assessment | null>(null)
  const [viewQuestions, setViewQuestions] = useState<AssessmentQuestion[]>([])
  const [viewQLoading, setViewQLoading] = useState(false)

  const handleView = async (a: Assessment) => {
    setViewTarget(a)
    setViewOpen(true)
    setViewQuestions([])
    setViewQLoading(true)
    try {
      const res = await assessmentQuestionsApi.getByAssessment(a._id)
      if (res.success) setViewQuestions(res.result ?? [])
    } catch (e) { console.warn('[AssessmentTab] View questions load failed:', e) }
    finally { setViewQLoading(false) }
  }

  // ── Fetch assessments ──────────────────────────────────────────────────────
  const fetchAssessments = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await assessmentsApi.getAll({ created_by: teacherId })
      if (!res.success) throw new Error(res.message ?? 'Unable to load assessments.')
      setAssessments(res.result ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load assessments.'
      setError(msg); console.error('[AssessmentTab] fetchAssessments error:', err)
    } finally { setLoading(false) }
  }, [teacherId])

  useEffect(() => { void fetchAssessments() }, [fetchAssessments])

  // ── Fetch questions for an assessment ─────────────────────────────────────
  const fetchQuestions = useCallback(async (assessmentId: string) => {
    setQuestionsLoading((p) => ({ ...p, [assessmentId]: true }))
    try {
      const res = await assessmentQuestionsApi.getByAssessment(assessmentId)
      if (!res.success) throw new Error(res.message ?? 'Failed to load questions.')
      setQuestionsMap((p) => ({ ...p, [assessmentId]: res.result ?? [] }))
    } catch (err) {
      console.error('[AssessmentTab] fetchQuestions error:', assessmentId, err)
    } finally {
      setQuestionsLoading((p) => ({ ...p, [assessmentId]: false }))
    }
  }, [])

  const handleToggleExpand = (assessmentId: string) => {
    if (expandedId === assessmentId) { setExpandedId(null); return }
    setExpandedId(assessmentId)
    if (!questionsMap[assessmentId]) void fetchQuestions(assessmentId)
  }

  // ── Silent loaders ─────────────────────────────────────────────────────────
  const loadClassListSilent = useCallback(async () => {
    if (classList.length > 0) return
    try {
      const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
      const res = await classesApi.getAll({ ...(instituteId ? { instituteId } : {}), status: 'active' })
      if (res.success) onClassListLoad(res.result ?? [])
    } catch (e) { console.warn('[AssessmentTab] Silent class load failed:', e) }
  }, [classList.length, onClassListLoad])

  // ── Assessment form class change ───────────────────────────────────────────
  const handleFormClassChange = useCallback(async (classId: string) => {
    setForm((p) => ({ ...p, class_id: classId, batch_id: '', subject_id: '' }))
    setFormBatches([]); setFormSubjects([])
    if (!classId) return
    try {
      const [bRes, subRes] = await Promise.allSettled([
        classesApi.getBatchesByClass(classId),
        subjectsByClassApi.getByClass(classId),
      ])
      if (bRes.status === 'fulfilled' && bRes.value.success && bRes.value.result) setFormBatches(bRes.value.result)
      if (subRes.status === 'fulfilled' && subRes.value.success && subRes.value.result) {
        setFormSubjects(subRes.value.result); onSubjectsLoad(classId, subRes.value.result)
      }
    } catch (e) { console.warn('[AssessmentTab] Form class change failed:', e) }
  }, [onSubjectsLoad])

  // ── Create/Edit Assessment ─────────────────────────────────────────────────
  const handleCreate = () => {
    setEditTarget(null); setForm(ASSESSMENT_FORM_DEFAULTS); setFormBatches([]); setFormSubjects([]); setFormError(null)
    void loadClassListSilent(); setFormOpen(true)
  }

const handleEdit = async (a: Assessment) => {
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

    const classId = extractId(a.class_id)
    const batchId = extractId(a.batch_id)
    const subjectId = extractId(a.subject_id)

    setEditTarget(a)
    setForm({
      title: a.title, description: a.description ?? '', assessment_type: a.assessment_type,
      class_id: classId, batch_id: batchId, subject_id: subjectId,
      academic_year: a.academic_year, pass_marks: a.pass_marks?.toString() ?? '',
      duration_minutes: a.duration_minutes?.toString() ?? '',
      available_from: toDateTimeLocal(a.available_from),
      available_until: toDateTimeLocal(a.available_until),
      max_attempts: a.max_attempts?.toString() ?? '1',
      show_result_immediately: a.show_result_immediately ?? true,
      show_answer_key: a.show_answer_key ?? false,
      status: a.status,
    })
    setFormBatches([]); setFormSubjects([]); setFormError(null)
    await Promise.allSettled([
      loadClassListSilent(),
      classId ? (async () => {
        try {
          const [bRes, subRes] = await Promise.allSettled([
            classesApi.getBatchesByClass(classId),
            subjectsByClassApi.getByClass(classId),
          ])
          if (bRes.status === 'fulfilled' && bRes.value.success && bRes.value.result) setFormBatches(bRes.value.result)
          if (subRes.status === 'fulfilled' && subRes.value.success && subRes.value.result) { setFormSubjects(subRes.value.result); onSubjectsLoad(classId, subRes.value.result) }
        } catch (e) { console.warn('[AssessmentTab] Edit pre-load failed:', e) }
      })() : Promise.resolve()
    ])
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.class_id) { setFormError('Class is required.'); return }
    if (!editTarget && !form.batch_id) { setFormError('Batch is required.'); return }
    if (!form.subject_id) { setFormError('Subject is required.'); return }
    if (!form.academic_year.trim()) { setFormError('Academic year is required.'); return }
    setFormSaving(true); setFormError(null)
    try {
      if (editTarget) {
const payload: UpdateAssessmentData = {
  title: form.title.trim(),
  description: form.description.trim() || undefined,
  status: form.status,
  pass_marks: form.pass_marks ? Number(form.pass_marks) : undefined,
  duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
available_from: form.available_from ? form.available_from : null,
available_until: form.available_until ? form.available_until : null,
  max_attempts: form.max_attempts ? Number(form.max_attempts) : undefined,
  show_result_immediately: form.show_result_immediately,
  show_answer_key: form.show_answer_key,
}


        const res = await assessmentsApi.update(editTarget._id, payload)
        if (!res.success) throw new Error(res.message ?? 'Failed to update assessment.')
        console.log('[AssessmentTab] Assessment updated:', editTarget._id)
      } else {
        const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
        if (!instituteId) { setFormError('Institute ID not found. Please refresh the page and try again.'); setFormSaving(false); return }
  const instituteType = localStorage.getItem('instituteType') ?? ''
const payload: CreateAssessmentData = {
  institute_id: instituteId, institute_type: instituteType as 'school' | 'coaching',
  title: form.title.trim(), description: form.description.trim() || undefined,
  assessment_type: form.assessment_type, class_id: form.class_id,
  section_id: null, batch_id: form.batch_id,
  subject_id: form.subject_id, academic_year: form.academic_year.trim(),
          pass_marks: form.pass_marks ? Number(form.pass_marks) : undefined,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
          available_from: form.available_from ? form.available_from : undefined,
available_until: form.available_until ? form.available_until : undefined,
          max_attempts: form.max_attempts ? Number(form.max_attempts) : undefined,
          show_result_immediately: form.show_result_immediately, show_answer_key: form.show_answer_key,
          status: form.status, created_by: teacherId,
        }
        const res = await assessmentsApi.create(payload)
        if (!res.success) throw new Error(res.message ?? 'Failed to create assessment.')
        console.log('[AssessmentTab] Assessment created:', res.result?._id)
      }
      await fetchAssessments(); setFormOpen(false)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : editTarget ? 'Failed to update assessment.' : 'Failed to create assessment.')
      console.error('[AssessmentTab] save error:', err)
    } finally { setFormSaving(false) }
  }

  const handleDeleteOpen = (a: Assessment) => { setDeleteTarget(a); setDeleteError(null); setDeleteOpen(true) }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await assessmentsApi.delete(deleteTarget._id)
      if (!res.success) throw new Error(res.message ?? 'Failed to delete.')
      console.log('[AssessmentTab] Assessment deleted:', deleteTarget._id)
      await fetchAssessments()
    } catch (err: unknown) {
      setDeleteError('Failed to delete assessment. Please try again.')
      console.error('[AssessmentTab] delete error:', err)
    } finally { setDeleting(false); setDeleteOpen(false); setDeleteTarget(null) }
  }

  // ── Question Create/Edit ───────────────────────────────────────────────────
  const handleAddQuestion = (a: Assessment) => {
    setQFormAssessment(a); setQEditTarget(null)
    const existingCount = questionsMap[a._id]?.length ?? 0
    setQForm({ ...Q_FORM_DEFAULTS, order: (existingCount + 1).toString() })
    setQFormError(null); setQFormOpen(true)
  }

  const handleEditQuestion = (q: AssessmentQuestion, a: Assessment) => {
    setQFormAssessment(a); setQEditTarget(q)
    setQForm({
      question_text: q.question_text, question_type: q.question_type,
      options: q.options ?? [{ option_id: 'A', option_text: '' }, { option_id: 'B', option_text: '' }, { option_id: 'C', option_text: '' }, { option_id: 'D', option_text: '' }],
      correct_options: q.correct_options ?? [], correct_answer_text: q.correct_answer_text ?? '',
      marks: q.marks.toString(), hint: q.hint ?? '', explanation: q.explanation ?? '', order: q.order.toString(),
    })
    setQFormError(null); setQFormOpen(true)
  }

  const handleQSave = async () => {
    if (!qForm.question_text.trim()) { setQFormError('Question text is required.'); return }
    if (!qForm.marks || Number(qForm.marks) <= 0) { setQFormError('Marks must be greater than 0.'); return }
    if (qForm.question_type === 'mcq') {
      if (qForm.options.some((o) => !o.option_text.trim())) { setQFormError('All option texts are required for MCQ.'); return }
      if (qForm.correct_options.length === 0) { setQFormError('At least one correct option is required.'); return }
    }
    if (qForm.question_type === 'short_answer' && !qForm.correct_answer_text.trim()) {
      setQFormError('Correct answer text is required for short answer.'); return
    }
    if (!qFormAssessment) return
    setQFormSaving(true); setQFormError(null)
    try {
      const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
      if (!instituteId && !qEditTarget) { setQFormError('Institute ID not found. Please refresh the page and try again.'); setQFormSaving(false); return }
      if (qEditTarget) {
const cleanOptions = qForm.options.map(({ option_id, option_text }) => ({ option_id, option_text }))

const res = await assessmentQuestionsApi.update(qEditTarget._id, {
  question_text: qForm.question_text.trim(),
  options: qForm.question_type === 'mcq' ? cleanOptions : undefined,
  correct_options: qForm.question_type === 'mcq' ? qForm.correct_options : undefined,
  correct_answer_text: qForm.question_type === 'short_answer' ? qForm.correct_answer_text.trim() : undefined,
  marks: Number(qForm.marks),
  hint: qForm.hint.trim() || null,
  explanation: qForm.explanation.trim() || undefined,
  order: Number(qForm.order),
})
if (!res.success) throw new Error(res.message ?? 'Failed to update question.')
console.log('[AssessmentTab] Question updated:', qEditTarget._id)
      } else {
        const payload: CreateQuestionData = {
          institute_id: instituteId, assessment_id: qFormAssessment._id,
          question_text: qForm.question_text.trim(), question_type: qForm.question_type,
          marks: Number(qForm.marks), order: Number(qForm.order),
          ...(qForm.question_type === 'mcq' ? { options: qForm.options, correct_options: qForm.correct_options } : {}),
          ...(qForm.question_type === 'short_answer' ? { correct_answer_text: qForm.correct_answer_text.trim() } : {}),
          hint: qForm.hint.trim() || null, explanation: qForm.explanation.trim() || undefined,
        }
        const res = await assessmentQuestionsApi.add(payload)
        if (!res.success) throw new Error(res.message ?? 'Failed to add question.')
        console.log('[AssessmentTab] Question added:', res.result?._id)
      }
      await fetchQuestions(qFormAssessment._id); setQFormOpen(false)
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : ''
const friendlyMsg = rawMsg.includes('is not allowed') || rawMsg.includes('Bad Request')
  ? 'Something went wrong while saving. Please check your inputs and try again.'
  : rawMsg || 'Failed to save question. Please try again.'
setQFormError(friendlyMsg)
      console.error('[AssessmentTab] qSave error:', err)
    } finally { setQFormSaving(false) }
  }

  const handleQDeleteOpen = (q: AssessmentQuestion, assessmentId: string) => {
    setQDeleteTarget({ q, assessmentId }); setQDeleteError(null); setQDeleteOpen(true)
  }

  const confirmQDelete = async () => {
    if (!qDeleteTarget) return
    setQDeleting(true)
    try {
      const res = await assessmentQuestionsApi.delete(qDeleteTarget.q._id)
      if (!res.success) throw new Error(res.message ?? 'Failed to delete question.')
      console.log('[AssessmentTab] Question deleted:', qDeleteTarget.q._id)
      await fetchQuestions(qDeleteTarget.assessmentId)
    } catch (err: unknown) {
      setQDeleteError('Failed to delete question. Please try again.')
      console.error('[AssessmentTab] qDelete error:', err)
    } finally { setQDeleting(false); setQDeleteOpen(false); setQDeleteTarget(null) }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = statusFilter === 'all' ? assessments : assessments.filter((a) => a.status === statusFilter)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const subjectOptions = getSubjectOptions(formSubjects)

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as Assessment['status'] | 'all'); setCurrentPage(1) }}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          {!loading && <Badge variant="outline" className="text-xs font-mono h-9 px-3">{filtered.length} {statusFilter === 'all' ? 'total' : statusFilter}</Badge>}
        </div>
        <Button size="sm" onClick={handleCreate} className="w-full sm:w-auto gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9">
          <Plus className="h-4 w-4" /><span className="text-xs sm:text-sm">Create Assessment</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /><span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchAssessments} className="h-7 gap-1 text-rose-600 hover:bg-rose-100"><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
        </div>
      )}

      {loading ? <AssessmentSkeleton /> : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm">{statusFilter === 'all' ? 'No assessments found' : `No ${statusFilter} assessments`}</p>
          <Button size="sm" variant="outline" onClick={handleCreate} className="gap-2 h-8"><Plus className="h-3.5 w-3.5" /> Create one</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((a) => {
            const isExpanded = expandedId === a._id
            const questions = questionsMap[a._id] ?? []
            const qLoading = questionsLoading[a._id] ?? false
            const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
            return (
              <Card key={a._id} className="border-2 hover:border-[#1897C6]/40 transition-all">
                <CardContent className="p-3 sm:p-4 space-y-3">
                  {/* Row 1: title + actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base leading-tight truncate">{a.title}</h4>
                      {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#1897C6] hover:text-[#1254a1] hover:bg-[#1897C6]/10" title="View" onClick={() => void handleView(a)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit" onClick={() => void handleEdit(a)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" title="Delete" onClick={() => handleDeleteOpen(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {/* Row 2: badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">{typeLabel(a.assessment_type)}</Badge>
                    <Badge variant="outline" className={`text-xs capitalize ${assessmentStatusClass(a.status)}`}>{a.status}</Badge>
                    {a.duration_minutes && <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" />{a.duration_minutes} min</Badge>}
                    {a.max_attempts && <Badge variant="outline" className="text-xs">Max {a.max_attempts} attempt{a.max_attempts > 1 ? 's' : ''}</Badge>}
                    {questions.length > 0 && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">{questions.length} Q · {totalMarks} marks</Badge>}
                  </div>
                  {/* Row 3: dates */}
                  {(a.available_from || a.available_until) && (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {a.available_from && <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><span>From: {formatDateTime(a.available_from)}</span></div>}
                      {a.available_until && <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /><span>Until: {formatDateTime(a.available_until)}</span></div>}
                    </div>
                  )}
                  {/* Expand / Questions section */}
                  <div className="border-t pt-2">
                    <button
                      className="flex items-center gap-2 text-xs font-semibold text-[#1897C6] hover:text-[#1254a1] transition-colors w-full text-left"
                      onClick={() => handleToggleExpand(a._id)}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Hide Questions' : `Manage Questions (${questions.length})`}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {qLoading ? (
                          <div className="space-y-2 animate-pulse">{[1, 2].map((i) => <div key={i} className="h-10 rounded bg-muted/50" />)}</div>
                        ) : questions.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">No questions added yet.</p>
                        ) : (
                          questions.map((q, idx) => (
                            <div key={q._id} className="flex items-start gap-2 p-2 rounded-lg border bg-muted/20 text-xs">
                              <span className="font-semibold text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground line-clamp-2">{q.question_text}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs py-0 h-4">{q.question_type === 'mcq' ? 'MCQ' : 'Short Answer'}</Badge>
                                  <Badge variant="outline" className="text-xs py-0 h-4">{q.marks} mark{q.marks > 1 ? 's' : ''}</Badge>
                                  {q.question_type === 'mcq' && q.correct_options && q.correct_options.length > 0 && (
                                    <Badge className="text-xs py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-300">Ans: {q.correct_options.join(', ')}</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => handleEditQuestion(q, a)}><Edit2 className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50" onClick={() => handleQDeleteOpen(q, a._id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ))
                        )}
                        <Button size="sm" variant="outline" className="w-full h-8 gap-2 text-xs border-dashed border-[#1897C6] text-[#1897C6] hover:bg-[#1897C6]/20 hover:text-[#1270A0] hover:border-[#1270A0]" onClick={() => handleAddQuestion(a)}>
                          <Plus className="h-3.5 w-3.5" /> Add Question
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} assessments
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 p-0"
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-90" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                acc.push(p)
                return acc
              }, [])
              .map((item, i) =>
                item === 'ellipsis' ? (
                  <span key={`e-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                ) : (
                  <Button
                    key={item}
                    variant={currentPage === item ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(item as number)}
                    className={`h-7 w-7 p-0 text-xs ${currentPage === item ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] border-transparent text-white' : ''}`}
                  >
                    {item}
                  </Button>
                )
              )}
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 p-0"
            >
              <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
            </Button>
          </div>
        </div>
      )}

      {/* ════ ASSESSMENT FORM DIALOG ════ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{editTarget ? 'Edit Assessment' : 'Create Assessment'}</DialogTitle>
            <DialogDescription className="text-sm">{editTarget ? 'Update the assessment details.' : 'Create a new assessment for your students.'}</DialogDescription>
          </DialogHeader>
          {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{formError}</span></div>}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Title <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Chapter 3 Quiz" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea placeholder="Brief description..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="min-h-[64px] resize-none text-sm" />
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Assessment Type <span className="text-red-500">*</span></Label>
                <Select value={form.assessment_type} onValueChange={(v) => setForm((p) => ({ ...p, assessment_type: v as AssessmentFormState['assessment_type'] }))} disabled={!!editTarget}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="mcq">MCQ</SelectItem><SelectItem value="short_answer">Short Answer</SelectItem><SelectItem value="mixed">Mixed</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Academic Year <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. 2025-26" value={form.academic_year} onChange={(e) => setForm((p) => ({ ...p, academic_year: e.target.value }))} className="h-9" disabled={!!editTarget} />
              </div>
            </div>
            {!editTarget && (
              <>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Class <span className="text-red-500">*</span></Label>
                    <Select value={form.class_id} onValueChange={handleFormClassChange}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={classList.length === 0 ? 'Loading...' : 'Select class'} /></SelectTrigger>
                      <SelectContent>{classList.map((c) => <SelectItem key={c._id} value={c._id}>{c.class_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Batch <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.batch_id}
                      onValueChange={(v) => setForm((p) => ({ ...p, batch_id: v }))}
                      disabled={!form.class_id || formBatches.length === 0}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={!form.class_id ? 'Select class first' : formBatches.length === 0 ? 'No batches found' : 'Select batch'} />
                      </SelectTrigger>
                      <SelectContent>
                        {formBatches.map((b) => (
                          <SelectItem key={b._id} value={b._id!}>
                            {b.batch_name}
                            {b.start_time && b.end_time ? ` (${b.start_time}–${b.end_time})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Subject <span className="text-red-500">*</span></Label>
                  <Select value={form.subject_id} onValueChange={(v) => setForm((p) => ({ ...p, subject_id: v }))} disabled={subjectOptions.length === 0}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={!form.class_id ? 'Select class first' : subjectOptions.length === 0 ? 'No subjects for this class' : 'Select subject'} /></SelectTrigger>
                    <SelectContent>{subjectOptions.map((opt: { key: string; id: string; name: string }) =>
<SelectItem key={opt.key} value={opt.id}>{opt.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Pass Marks</Label>
                <Input type="number" placeholder="e.g. 8" min={0} value={form.pass_marks} onChange={(e) => setForm((p) => ({ ...p, pass_marks: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Duration (min)</Label>
                <Input type="number" placeholder="e.g. 30" min={1} value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Max Attempts</Label>
                <Input type="number" placeholder="e.g. 1" min={1} value={form.max_attempts} onChange={(e) => setForm((p) => ({ ...p, max_attempts: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Available From</Label>
                <Input type="datetime-local" value={form.available_from} onChange={(e) => setForm((p) => ({ ...p, available_from: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Available Until</Label>
                <Input type="datetime-local" value={form.available_until} onChange={(e) => setForm((p) => ({ ...p, available_until: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Switch id="show-result" checked={form.show_result_immediately} onCheckedChange={(v) => setForm((p) => ({ ...p, show_result_immediately: v }))} />
                <Label htmlFor="show-result" className="text-sm cursor-pointer">Show result immediately</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-answer" checked={form.show_answer_key} onCheckedChange={(v) => setForm((p) => ({ ...p, show_answer_key: v }))} />
                <Label htmlFor="show-answer" className="text-sm cursor-pointer">Show answer key</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as AssessmentFormState['status'] }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="h-9" disabled={formSaving}>Cancel</Button>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9 gap-2" onClick={handleSave} disabled={formSaving}>
              {formSaving ? (editTarget ? 'Updating...' : 'Creating...') : <><Save className="h-4 w-4" />{editTarget ? 'Update' : 'Create'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ ASSESSMENT DELETE DIALOG ════ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget && <>This will permanently delete <strong>&quot;{deleteTarget.title}&quot;</strong>. All questions and student attempts will also be removed.</>}</AlertDialogDescription>
            {deleteError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mt-2"><AlertCircle className="h-4 w-4 shrink-0" /><span>{deleteError}</span></div>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600">{deleting ? 'Deleting...' : 'Yes, Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════ QUESTION FORM DIALOG ════ */}
      <Dialog open={qFormOpen} onOpenChange={setQFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{qEditTarget ? 'Edit Question' : 'Add Question'}</DialogTitle>
            <DialogDescription className="text-sm">{qFormAssessment?.title}</DialogDescription>
          </DialogHeader>
          {qFormError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{qFormError}</span></div>}
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Question Type <span className="text-red-500">*</span></Label>
                <Select value={qForm.question_type} onValueChange={(v) => setQForm((p) => ({ ...p, question_type: v as 'mcq' | 'short_answer' }))} disabled={!!qEditTarget}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="mcq">MCQ</SelectItem><SelectItem value="short_answer">Short Answer</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Marks <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="e.g. 2" min={1} value={qForm.marks} onChange={(e) => setQForm((p) => ({ ...p, marks: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Order</Label>
                  <Input type="number" placeholder="e.g. 1" min={1} value={qForm.order} onChange={(e) => setQForm((p) => ({ ...p, order: e.target.value }))} className="h-9" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Question Text <span className="text-red-500">*</span></Label>
              <Textarea placeholder="Enter your question here..." value={qForm.question_text} onChange={(e) => setQForm((p) => ({ ...p, question_text: e.target.value }))} className="min-h-[80px] resize-none text-sm" />
            </div>

            {qForm.question_type === 'mcq' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Options <span className="text-red-500">*</span></Label>
                {qForm.options.map((opt, idx) => (
                  <div key={opt.option_id} className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">{opt.option_id}.</span>
                    <Input placeholder={`Option ${opt.option_id}`} value={opt.option_text}
                      onChange={(e) => setQForm((p) => ({ ...p, options: p.options.map((o, i) => i === idx ? { ...o, option_text: e.target.value } : o) }))}
                      className="h-9 flex-1" />
                    <input type="checkbox" id={`opt-${opt.option_id}`} checked={qForm.correct_options.includes(opt.option_id)}
                      onChange={(e) => setQForm((p) => ({ ...p, correct_options: e.target.checked ? [...p.correct_options, opt.option_id] : p.correct_options.filter((c) => c !== opt.option_id) }))}
                      className="h-4 w-4 cursor-pointer accent-emerald-600" title="Mark as correct" />
                    <Label htmlFor={`opt-${opt.option_id}`} className="text-xs text-emerald-700 cursor-pointer">Correct</Label>
                  </div>
                ))}
              </div>
            )}

            {qForm.question_type === 'short_answer' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Expected Answer <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. New Delhi" value={qForm.correct_answer_text} onChange={(e) => setQForm((p) => ({ ...p, correct_answer_text: e.target.value }))} className="h-9" />
              </div>
            )}

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Hint</Label>
                <Input placeholder="Optional hint for students" value={qForm.hint} onChange={(e) => setQForm((p) => ({ ...p, hint: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Explanation</Label>
                <Input placeholder="Explanation for the answer" value={qForm.explanation} onChange={(e) => setQForm((p) => ({ ...p, explanation: e.target.value }))} className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setQFormOpen(false)} className="h-9" disabled={qFormSaving}>Cancel</Button>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9 gap-2" onClick={handleQSave} disabled={qFormSaving}>
              {qFormSaving ? 'Saving...' : <><Save className="h-4 w-4" />{qEditTarget ? 'Update' : 'Add Question'}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ QUESTION DELETE DIALOG ════ */}
      <AlertDialog open={qDeleteOpen} onOpenChange={setQDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>{qDeleteTarget && <>This will permanently delete the question: <strong>&quot;{qDeleteTarget.q.question_text.slice(0, 60)}{qDeleteTarget.q.question_text.length > 60 ? '…' : ''}&quot;</strong></>}</AlertDialogDescription>
            {qDeleteError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mt-2"><AlertCircle className="h-4 w-4 shrink-0" /><span>{qDeleteError}</span></div>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={qDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmQDelete} disabled={qDeleting} className="bg-red-500 hover:bg-red-600">{qDeleting ? 'Deleting...' : 'Yes, Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    {/* ════ VIEW ASSESSMENT DIALOG ════ */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl leading-tight break-words">
                  {viewTarget?.title}
                </DialogTitle>
                {viewTarget?.description && (
                  <p className="text-sm text-muted-foreground mt-1 break-words">{viewTarget.description}</p>
                )}
              </div>
              {viewTarget && (
                <Badge variant="outline" className={`text-xs capitalize shrink-0 mt-0.5 ${assessmentStatusClass(viewTarget.status)}`}>
                  {viewTarget.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {viewTarget && (
            <div className="space-y-5 pt-1">

              {/* ── Assessment Meta Info ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Type</p>
                  <p className="text-sm font-medium">{typeLabel(viewTarget.assessment_type)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Academic Year</p>
                  <p className="text-sm font-medium">{viewTarget.academic_year}</p>
                </div>
                {viewTarget.pass_marks != null && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pass Marks</p>
                    <p className="text-sm font-medium">{viewTarget.pass_marks}</p>
                  </div>
                )}
                {viewTarget.duration_minutes != null && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Duration</p>
                    <p className="text-sm font-medium">{viewTarget.duration_minutes} min</p>
                  </div>
                )}
                {viewTarget.max_attempts != null && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Max Attempts</p>
                    <p className="text-sm font-medium">{viewTarget.max_attempts}</p>
                  </div>
                )}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Questions</p>
                  <p className="text-sm font-medium">{viewQLoading ? '…' : viewQuestions.length}</p>
                </div>
                {!viewQLoading && viewQuestions.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Marks</p>
                    <p className="text-sm font-medium">{viewQuestions.reduce((s, q) => s + q.marks, 0)}</p>
                  </div>
                )}
              </div>

              {/* ── Settings Row ── */}
              <div className="flex flex-wrap gap-3">
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium ${viewTarget.show_result_immediately ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {viewTarget.show_result_immediately ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  Show Result Immediately
                </div>
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium ${viewTarget.show_answer_key ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {viewTarget.show_answer_key ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  Show Answer Key
                </div>
              </div>

              {/* ── Dates ── */}
              {(viewTarget.available_from || viewTarget.available_until) && (
                <div className="flex flex-col sm:flex-row gap-3">
                  {viewTarget.available_from && (
                    <div className="flex-1 rounded-lg border bg-blue-50/50 border-blue-100 p-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Available From</p>
                        <p className="text-sm font-medium text-blue-900">{formatDateTime(viewTarget.available_from)}</p>
                      </div>
                    </div>
                  )}
                  {viewTarget.available_until && (
                    <div className="flex-1 rounded-lg border bg-orange-50/50 border-orange-100 p-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">Available Until</p>
                        <p className="text-sm font-medium text-orange-900">{formatDateTime(viewTarget.available_until)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Questions Section ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b">
                  <h3 className="text-sm font-semibold text-foreground">
                    Questions
                    {!viewQLoading && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({viewQuestions.length} · {viewQuestions.reduce((s, q) => s + q.marks, 0)} marks)
                      </span>
                    )}
                  </h3>
                </div>

                {viewQLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted/50" />
                    ))}
                  </div>
                ) : viewQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <BookOpen className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No questions added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewQuestions.map((q, idx) => (
                      <div key={q._id} className="rounded-lg border bg-muted/10 p-3 space-y-2">
                        {/* Question header */}
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-[#1897C6] shrink-0 mt-0.5 w-5">Q{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground break-words">{q.question_text}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className="text-xs py-0 h-5">{q.question_type === 'mcq' ? 'MCQ' : 'Short Answer'}</Badge>
                            <Badge variant="outline" className="text-xs py-0 h-5 bg-purple-50 text-purple-700 border-purple-200">{q.marks}m</Badge>
                          </div>
                        </div>

                        {/* MCQ Options */}
                        {q.question_type === 'mcq' && q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-7">
                            {q.options.map((opt) => {
                              const isCorrect = q.correct_options?.includes(opt.option_id)
                              return (
                                <div key={opt.option_id} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs border ${isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium' : 'bg-background border-border text-muted-foreground'}`}>
                                  <span className={`font-bold w-4 shrink-0 ${isCorrect ? 'text-emerald-600' : 'text-muted-foreground'}`}>{opt.option_id}.</span>
                                  <span className="break-words flex-1">{opt.option_text}</span>
                                  {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Short Answer */}
                        {q.question_type === 'short_answer' && q.correct_answer_text && (
                          <div className="ml-7 flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span><span className="font-semibold">Answer:</span> {q.correct_answer_text}</span>
                          </div>
                        )}

                        {/* Hint / Explanation */}
                        {(q.hint || q.explanation) && (
                          <div className="ml-7 flex flex-col gap-1">
                            {q.hint && (
                              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                <span className="font-semibold">Hint:</span> {q.hint}
                              </p>
                            )}
                            {q.explanation && (
                              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                <span className="font-semibold">Explanation:</span> {q.explanation}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t mt-2">
            <Button variant="outline" onClick={() => setViewOpen(false)} className="h-9">Close</Button>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9 gap-2" onClick={() => { setViewOpen(false); void handleEdit(viewTarget!) }}>
              <Edit2 className="h-4 w-4" /> Edit Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}