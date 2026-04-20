'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, Send, Pin, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { noticesApi, CreateNoticeRequest, Notice } from '@/lib/api/notices'
import { IMAGE_BASE_URL } from '@/lib/api/config'
import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'
import { studentsApi, type Student } from '@/lib/api/students'
import { teachersApi } from '@/lib/api/teachers'
// ─── Auth helpers ─────────────────────────────────────────────────────────────

/** Read auth info from localStorage (set by admin.ts login flow) */
const getAuthInfo = () => {
  if (typeof window === 'undefined')
    return { instituteId: '', adminId: '', createdByRole: 'institute_admin' as const }
  return {
    instituteId:    localStorage.getItem('instituteId') || '',
    adminId:        localStorage.getItem('adminId')     || '',
    createdByRole:  (localStorage.getItem('role') || 'institute_admin') as 'institute_admin' | 'teacher',
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Only values accepted by the backend enum */
type NoticeCategory = '' | 'urgent' | 'academic' | 'events' | 'news'
type AudienceType   = 'all' | 'teachers' | 'students' | 'specific-classes' | 'specific-users'

interface FormState {
  title:              string
  content:            string
  fullDescription:    string
  category:           NoticeCategory
  isPinned:           boolean
  publishDate:        string
  expiryDate:         string
  audienceType:       AudienceType
  specificClasses:    string[]
  specificBatches:    string[]
  specificStudents:   string[]
  specificTeachers:   string[]
  file:               File | null
  existingDocUrl:     string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateNoticePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const editId       = searchParams.get('edit')
  const isEditMode   = !!editId

const [formData, setFormData] = useState<FormState>({
    title:            '',
    content:          '',
    fullDescription:  '',
    category:         '',
    isPinned:         false,
    publishDate:      '',
    expiryDate:       '',
    audienceType:     'all',
    specificClasses:  [],
    specificBatches:  [],
    specificStudents: [],
    specificTeachers: [],
    file:             null,
    existingDocUrl:   null,
  })

  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [isLoadingEdit, setIsLoadingEdit] = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)

  // ── Audience data (fetched from backend) ──────────────────────────────────
  const [availableClasses,  setAvailableClasses]  = useState<ClassMaster[]>([])
  const [batchesMap,        setBatchesMap]        = useState<Record<string, CoachingBatch[]>>({})
  const [availableStudents, setAvailableStudents] = useState<{ _id: string; full_name: string; class_label: string }[]>([])
  const [availableTeachers, setAvailableTeachers] = useState<{ _id: string; full_name: string; teacher_code: string }[]>([])
  const [loadingAudience,   setLoadingAudience]   = useState(false)
  const [studentSearch,     setStudentSearch]     = useState('')
  const [teacherSearch,     setTeacherSearch]     = useState('')
  const [expandedClassIds,  setExpandedClassIds]  = useState<string[]>([])

  // Set default publish date on client to avoid hydration mismatch
  useEffect(() => {
    if (!isEditMode && !formData.publishDate) {
      setFormData(prev => ({
        ...prev,
        publishDate: new Date().toISOString().split('T')[0],
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  // Load existing notice for edit mode
  useEffect(() => {
    if (!isEditMode || !editId) return

    setIsLoadingEdit(true)
    noticesApi.getById(editId)
      .then((res) => {
        if (res.success && res.result) {
          const n = res.result as Notice
          setFormData({
            title:            n.title           || '',
            content:          n.content         || '',
            fullDescription:  n.fullDescription || '',
            // Guard: if backend somehow returns an unsupported value, fallback to 'events'
            category:         (['urgent','academic','events','news'].includes(n.category)
                                ? n.category as NoticeCategory
                                : 'events'),
            isPinned:         n.isPinned        || false,
            publishDate:      n.publishDate ? n.publishDate.split('T')[0] : '',
            expiryDate:       n.expiryDate  ? n.expiryDate.split('T')[0]  : '',
            audienceType:     (n.audience?.type as AudienceType) || 'all',
           specificClasses: ((n.audience?.classIds ?? []) as Array<string | { _id: string }>).map(
  (c) => (typeof c === 'string' ? c : c._id)
),
            specificBatches: ((n.audience?.batchIds ?? []) as Array<string | { _id: string }>).map(
  (b) => (typeof b === 'string' ? b : b._id)
),           
          specificStudents: ((n.audience?.studentIds ?? []) as Array<string | { _id: string }>).map(
  (s) => (typeof s === 'string' ? s : s._id)
),
specificTeachers: ((n.audience?.teacherIds ?? []) as Array<string | { _id: string }>).map(
  (t) => (typeof t === 'string' ? t : t._id)
),
            file:             null,
            existingDocUrl:   n.docUrl || null,
          })
        } else {
          console.error('[CreateNotice] getById failed:', res.message)
          setSubmitError(res.message || 'Failed to load notice for editing.')
        }
      })
      .catch((err) => {
        console.error('[CreateNotice] getById network error:', err)
        setSubmitError('Network error. Could not load notice details.')
      })
      .finally(() => setIsLoadingEdit(false))
  }, [isEditMode, editId])

  // Fetch classes + batches when specific-classes selected
  useEffect(() => {
    if (formData.audienceType !== 'specific-classes') return
    const iId = typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''
    if (!iId || availableClasses.length > 0) return
    setLoadingAudience(true)
    classesApi.getAll({ instituteId: iId, status: 'active' })
      .then(async (res) => {
        if (!res.success || !Array.isArray(res.result)) return
        setAvailableClasses(res.result)
        const bMap: Record<string, CoachingBatch[]> = {}
        await Promise.allSettled(
          res.result.map(async (cls) => {
            const br = await classesApi.getBatchesByClass(cls._id)
            if (br.success && Array.isArray(br.result)) bMap[cls._id] = br.result
          })
        )
        setBatchesMap(bMap)
      })
      .catch((err) => console.error('[CreateNotice] fetch classes error:', err))
      .finally(() => setLoadingAudience(false))
  }, [formData.audienceType])

  // Fetch students + teachers when specific-users selected
  useEffect(() => {
    if (formData.audienceType !== 'specific-users') return
    const iId = typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''
    if (!iId || availableStudents.length > 0) return
    setLoadingAudience(true)
    Promise.allSettled([
      studentsApi.getAll({ institute_id: iId, status: 'active' }),
      teachersApi.getAll({ institute_id: iId, status: 'active' }),
    ])
      .then(([studRes, teachRes]) => {
        if (studRes.status === 'fulfilled' && studRes.value.success && Array.isArray(studRes.value.result)) {
          setAvailableStudents(
            (studRes.value.result as Student[]).map((s) => ({
              _id: s._id,
              full_name: s.full_name,
              class_label: s.student_code,
            }))
          )
        }
if (teachRes.status === 'fulfilled' && teachRes.value.success && Array.isArray(teachRes.value.result)) {
  setAvailableTeachers(
    (teachRes.value.result as any[]).map((t) => ({
      _id: t._id,
      full_name: t.full_name ?? 'Teacher',
      teacher_code: t.teacher_code ?? '',
      email: t.email ?? '',
    }))
  )
}
      })
      .catch((err) => console.error('[CreateNotice] fetch audience users error:', err))
      .finally(() => setLoadingAudience(false))
  }, [formData.audienceType])

  // Helper: toggle selection
  const toggleItem = (field: 'specificClasses' | 'specificBatches' | 'specificStudents' | 'specificTeachers', id: string) => {
    setFormData(prev => {
      const arr = prev[field] as string[]
      return { ...prev, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] }
    })
  }

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // ─── Submit handler ────────────────────────────────────────────────────────

  const handleSubmit = (status: 'draft' | 'published') => async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    const { instituteId, adminId, createdByRole } = getAuthInfo()

    if (!instituteId || !adminId) {
      setSubmitError('Authentication information is missing. Please log in again.')
      setIsSubmitting(false)
      return
    }

    if (!formData.category) {
  setSubmitError('Please select a category.')
  setIsSubmitting(false)
  return
}

    try {
      if (isEditMode && editId) {
        // ── Edit mode ──────────────────────────────────────────────────────
        const updatePayload: Parameters<typeof noticesApi.update>[1] = {
          title:           formData.title,
          content:         formData.content,
          fullDescription: formData.fullDescription || undefined,
          category:        formData.category,
          isPinned:        formData.isPinned,
          publishDate:     formData.publishDate  || undefined,
          expiryDate:      formData.expiryDate   || undefined,
          audience: {
            type:       formData.audienceType,
            classIds:   formData.audienceType === 'specific-classes' ? formData.specificClasses  : undefined,
            batchIds:   formData.audienceType === 'specific-classes' ? formData.specificBatches  : undefined,
            studentIds: formData.audienceType === 'specific-users'   ? formData.specificStudents : undefined,
            teacherIds: formData.audienceType === 'specific-users'   ? formData.specificTeachers : undefined,
          },          file: formData.file || undefined,
        }

        const res = await noticesApi.update(editId, updatePayload)

        if (!res.success) {
          console.error('[CreateNotice] update failed:', res.message)
          setSubmitError(res.message || 'Failed to update notice. Please try again.')
          setIsSubmitting(false)
          return
        }

        // If "Publish" was clicked and notice is still a draft, also call publish endpoint
        if (status === 'published' && res.result && (res.result as Notice).status === 'draft') {
          const pubRes = await noticesApi.publish(editId)
          if (!pubRes.success) {
            console.error('[CreateNotice] publish after update failed:', pubRes.message)
            // Notice was updated successfully; show partial warning instead of blocking
            setSubmitError('Notice updated, but could not publish automatically. Please publish it from the notices list.')
            setIsSubmitting(false)
            return
          }
        }

      } else {
        // ── Create mode ────────────────────────────────────────────────────
        const createPayload: CreateNoticeRequest = {
          title:           formData.title,
          content:         formData.content,
          fullDescription: formData.fullDescription || undefined,
          instituteId,
          createdBy:       adminId,
          createdByRole,
   audience: {
            type:       formData.audienceType,
            classIds:   formData.audienceType === 'specific-classes' ? formData.specificClasses  : undefined,
            batchIds:   formData.audienceType === 'specific-classes' ? formData.specificBatches  : undefined,
            studentIds: formData.audienceType === 'specific-users'   ? formData.specificStudents : undefined,
            teacherIds: formData.audienceType === 'specific-users'   ? formData.specificTeachers : undefined,
          },
          category:    formData.category,
          isPinned:    formData.isPinned,
          publishDate: formData.publishDate || undefined,
          expiryDate:  formData.expiryDate  || undefined,
          file:        formData.file        || undefined,
        }

        const res = await noticesApi.create(createPayload)

        if (!res.success) {
          console.error('[CreateNotice] create failed:', res.message)
          setSubmitError(res.message || 'Failed to create notice. Please try again.')
          setIsSubmitting(false)
          return
        }

        // If "Publish" was clicked, call publish on the newly-created draft
        if (status === 'published' && res.result) {
          const newNotice = res.result as Notice
          const pubRes    = await noticesApi.publish(newNotice._id)
          if (!pubRes.success) {
            console.error('[CreateNotice] publish after create failed:', pubRes.message)
            setSubmitError('Notice saved as draft, but could not publish automatically. Please publish it from the notices list.')
            setIsSubmitting(false)
            return
          }
        }
      }

      router.push('/dashboard/notices')
    } catch (err) {
      console.error('[CreateNotice] unexpected error:', err)
      setSubmitError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isLoadingEdit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/dashboard/notices">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
            {isEditMode ? 'Edit Notice' : 'Create Notice'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditMode ? 'Update notice information' : 'Create a new notice or announcement'}
          </p>
        </div>
      </div>

      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit('published')} className="space-y-4 sm:space-y-6">
        {/* ── Basic Information ─────────────────────────────────────────── */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Notice Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter notice title"
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                Short Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter brief notice content (will be shown in previews)"
                rows={3}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Keep it concise — this will be displayed in the notice list
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription" className="text-sm font-medium">
                Full Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => handleChange('fullDescription', e.target.value)}
                placeholder="Enter detailed description"
                rows={6}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Provide additional details shown when viewing the full notice
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
          
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value as NoticeCategory)}
                >
                <SelectTrigger id="category" className="h-10">
  <SelectValue placeholder="Select category" />
</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Pin className="h-4 w-4 text-red-500" />
                  <Label htmlFor="isPinned" className="font-medium text-sm cursor-pointer">
                    Pin this notice
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pinned notices appear at the top of the list
                </p>
              </div>
              <Switch
                id="isPinned"
                checked={formData.isPinned}
                onCheckedChange={(checked) => handleChange('isPinned', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Date Settings ──────────────────────────────────────────────── */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-[#F1AF37]/5 to-[#D88931]/5 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Date Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="publishDate" className="text-sm font-medium">
                  Publish Date
                </Label>
                <Input
                  id="publishDate"
                  type="date"
                  value={formData.publishDate}
                  onChange={(e) => handleChange('publishDate', e.target.value)}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Notice will be visible from this date
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate" className="text-sm font-medium">
                  Expiry Date (Optional)
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  min={formData.publishDate}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Notice will be hidden after this date
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Target Audience ────────────────────────────────────────────── */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-purple-500/5 to-purple-600/5 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audienceType" className="text-sm font-medium">
                Audience Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.audienceType}
                onValueChange={(value) => handleChange('audienceType', value as AudienceType)}
              >
                <SelectTrigger id="audienceType" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Students, Teachers, Parents)</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="specific-classes">Specific Classes</SelectItem>
                  <SelectItem value="specific-users">Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.audienceType === 'specific-classes' && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Select Classes &amp; Batches</Label>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#1897C6]/10 text-[#1897C6]">
                    {formData.specificClasses.length} class{formData.specificClasses.length !== 1 ? 'es' : ''} · {formData.specificBatches.length} batch{formData.specificBatches.length !== 1 ? 'es' : ''} selected
                  </span>
                </div>
                {loadingAudience ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading classes...
                  </div>
                ) : availableClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No active classes found.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {availableClasses.map((cls) => {
                      const batches = batchesMap[cls._id] ?? []
                      const isExpanded = expandedClassIds.includes(cls._id)
                      const classSelected = formData.specificClasses.includes(cls._id)
                      return (
                        <div key={cls._id} className="border rounded-lg overflow-hidden bg-background">
                          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => setExpandedClassIds(prev =>
                              prev.includes(cls._id) ? prev.filter(x => x !== cls._id) : [...prev, cls._id]
                            )}>
                            <input
                              type="checkbox"
                              checked={classSelected}
                              onChange={(e) => { e.stopPropagation(); toggleItem('specificClasses', cls._id) }}
                              onClick={e => e.stopPropagation()}
                              className="h-4 w-4 rounded accent-[#1897C6] cursor-pointer"
                            />
                            <span className="font-medium text-sm flex-1">{cls.class_name}</span>
                            {cls.class_level && (
                              <span className="text-xs text-muted-foreground">Level {cls.class_level}</span>
                            )}
                            {batches.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {isExpanded ? '▲' : '▼'} {batches.length} batch{batches.length !== 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                          {isExpanded && batches.length > 0 && (
                            <div className="border-t bg-muted/20 px-3 py-2 flex flex-wrap gap-2">
                              {batches.map((b) => (
                                <label key={b._id} className="flex items-center gap-1.5 cursor-pointer text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                                  style={formData.specificBatches.includes(typeof b._id === 'string' ? b._id : String(b._id ?? ''))
                                    ? { background: '#1897C6', color: '#fff', borderColor: '#1897C6' }
                                    : { background: 'var(--color-background-primary)', borderColor: 'var(--color-border-secondary)', color: 'var(--color-text-primary)' }
                                  }>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={formData.specificBatches.includes(typeof b._id === 'string' ? b._id : String(b._id ?? ''))}
                                    onChange={() => toggleItem('specificBatches', typeof b._id === 'string' ? b._id : String(b._id ?? ''))}
                                  />
                                  {b.batch_name}
                                  {b.start_time && b.end_time && (
                                    <span className="opacity-70 ml-1">({b.start_time}–{b.end_time})</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

             {formData.audienceType === 'specific-users' && (
              <div className="space-y-4">
                {loadingAudience ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
                  </div>
                ) : (
                  <>
                    {/* Students */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                        <Label className="text-sm font-medium text-blue-900">Select Students</Label>
                        {formData.specificStudents.length > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#1897C6] text-white">
                            {formData.specificStudents.length} selected
                          </span>
                        )}
                      </div>
                      <div className="p-3 border-b border-blue-100 bg-blue-50/50">
                        <Input
                          placeholder="Search students by name or code..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y">
                        {availableStudents
                          .filter(s => !studentSearch || s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.class_label.toLowerCase().includes(studentSearch.toLowerCase()))
                          .map((s) => (
                            <label key={s._id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.specificStudents.includes(s._id)}
                                onChange={() => toggleItem('specificStudents', s._id)}
                                className="h-4 w-4 rounded accent-[#1897C6]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{s.full_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{s.class_label}</p>
                              </div>
                            </label>
                          ))}
                        {availableStudents.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No students found.</p>
                        )}
                      </div>
                    </div>

                    {/* Teachers */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-100">
                        <Label className="text-sm font-medium text-green-900">Select Teachers</Label>
                        {formData.specificTeachers.length > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-600 text-white">
                            {formData.specificTeachers.length} selected
                          </span>
                        )}
                      </div>
                      <div className="p-3 border-b border-green-100 bg-green-50/50">
                        <Input
                          placeholder="Search teachers by name or code..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y">
                        {availableTeachers
                          .filter(t => !teacherSearch ||
                            t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                            t.teacher_code.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                            t.teacher_code.toLowerCase().includes(teacherSearch.toLowerCase()))
                          .map((t) => (
                            <label key={t._id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.specificTeachers.includes(t._id)}
                                onChange={() => toggleItem('specificTeachers', t._id)}
                                className="h-4 w-4 rounded accent-[#1897C6]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{t.full_name}</p>
                                <p className="text-xs text-muted-foreground">{t.teacher_code}</p>
                              </div>
                            </label>
                          ))}
                        {availableTeachers.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No teachers found.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {formData.specificStudents.length} student(s) and {formData.specificTeachers.length} teacher(s) selected
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Attachment ─────────────────────────────────────────────────── */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-green-500/5 to-green-600/5 p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Attachment (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {isEditMode && formData.existingDocUrl && !formData.file && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                <span className="text-blue-700 font-medium">Current file:</span>
                <a
                  href={
                    formData.existingDocUrl.startsWith('http')
                      ? formData.existingDocUrl
                      : `${IMAGE_BASE_URL}${formData.existingDocUrl}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline truncate"
                >
                  {formData.existingDocUrl.split('/').pop()}
                </a>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm font-medium">
                {isEditMode ? 'Replace File (Optional)' : 'Upload File (Optional)'}
              </Label>
              <Input
                id="file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,.webp,.gif,.doc,.docx"
                onChange={(e) => handleChange('file', e.target.files?.[0] || null)}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Allowed: JPG, JPEG, PNG, PDF, WEBP, GIF, DOC, DOCX. Max size: 10 MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Actions (sticky footer) ────────────────────────────────────── */}
        <Card className="border-2 sticky bottom-0 z-10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {isEditMode
                  ? 'Update the notice information'
                  : 'Save as draft or publish directly'}
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <Link href="/dashboard/notices" className="flex-1 sm:flex-none">
                  <Button type="button" variant="outline" className="w-full h-10">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none gap-2 h-10"
                  onClick={handleSubmit('draft')}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />
                  }
                  <span className="hidden sm:inline">Save Draft</span>
                  <span className="sm:hidden">Draft</span>
                </Button>
                <Button
                  type="submit"
                  className="flex-1 sm:flex-none gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90 h-10"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                  <span>Publish</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}



