'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Plus,
  Eye,
  CheckCircle,
  UserPlus,
  AlertCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatsCard } from '@/components/stats-card'
import {
  studentsApi,
  type Student,
  type StudentGuardian,
  type StudentAcademicMapping,
} from '@/lib/api/students'
import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalState = {
  open: boolean
  type: 'error' | 'confirm' | 'activate'
  title: string
  message: string
  onConfirm?: () => void
}

interface StudentExtra {
  guardian: StudentGuardian | null
  mapping: StudentAcademicMapping | null
  loading: boolean
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  onboarding: { label: 'Onboarding', variant: 'secondary'   },
  active:     { label: 'Active',     variant: 'default'     },
  inactive:   { label: 'Inactive',   variant: 'secondary'   },
  blocked:    { label: 'Blocked',    variant: 'destructive' },
  archived:   { label: 'Archived',   variant: 'outline'     },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentOnboardingPage() {
  const [instituteId, setInstituteId] = useState('')

  const [students, setStudents]         = useState<Student[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [searchQuery, setSearchQuery]   = useState('')
  const [sortBy, setSortBy]             = useState<'newest' | 'oldest' | 'name_asc'>('newest')
  const [classFilter, setClassFilter]   = useState('all')
  const [currentPage, setCurrentPage]   = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [modal, setModal]               = useState<ModalState>({ open: false, type: 'error', title: '', message: '' })
  const [itemsInput, setItemsInput]     = useState('10')

  const [classes,  setClasses]  = useState<ClassMaster[]>([])
  const [classMap, setClassMap] = useState<Record<string, string>>({})
  const [batchMap, setBatchMap] = useState<Record<string, string>>({})
  const [extraData, setExtraData] = useState<Record<string, StudentExtra>>({})
  const fetchedIdsRef = useRef<Set<string>>(new Set())

  // ── Step 1: Read instituteId from localStorage on mount ──────────────────
  useEffect(() => {
    const id = localStorage.getItem('instituteId') ?? ''
    setInstituteId(id)
  }, [])

  // ─── Fetch students with status=onboarding ───────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!instituteId) return
    setIsLoading(true)
    try {
      const res = await studentsApi.getAll({
        institute_id: instituteId,
        status: 'onboarding',          // ← only fetch students pending approval
      })
      const onboardingStudents: Student[] = (res as any)?.result ?? (res as any) ?? []
      setStudents(onboardingStudents)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to load students. Please try again.'
      setModal({ open: true, type: 'error', title: 'Failed to Load Students', message: msg })
    } finally {
      setIsLoading(false)
    }
  }, [instituteId])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  // ─── Fetch classes + batches for lookup maps and filter ─────────────────
  useEffect(() => {
    if (!instituteId) return
    const fetchClassesAndSections = async () => {
      try {
        const res = await classesApi.getAll({ instituteId, status: 'active' })
        const data: ClassMaster[] = (res as any)?.result ?? (res as any) ?? []
        const classList = Array.isArray(data) ? data : []
        setClasses(classList)

        const newClassMap: Record<string, string> = {}
        classList.forEach((cls) => { newClassMap[cls._id] = cls.class_name })

        const newBatchMap: Record<string, string> = {}
        await Promise.allSettled(
          classList.map(async (cls) => {
            try {
              const bRes = await classesApi.getBatchesByClass(cls._id)
              const batches: CoachingBatch[] = (bRes as any)?.result ?? (bRes as any) ?? []
              if (Array.isArray(batches)) {
                batches.forEach((b) => { if (b._id) newBatchMap[b._id] = b.batch_name })
              }
            } catch {}
          })
        )

        setClassMap(newClassMap)
        setBatchMap(newBatchMap)
      } catch (err) {
        console.error('[StudentOnboarding] Failed to fetch classes:', err)
      }
    }
    fetchClassesAndSections()
  }, [instituteId])

  // Reset to page 1 on filter/search/page-size change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, sortBy, classFilter, itemsPerPage])

  // ─── Fetch guardian + academic mapping for visible students ──────────────
  const fetchExtraForVisible = useCallback(async (visibleStudents: Student[]) => {
    const toFetch = visibleStudents.filter((s) => !fetchedIdsRef.current.has(s._id))
    if (toFetch.length === 0) return

    toFetch.forEach((s) => fetchedIdsRef.current.add(s._id))

    setExtraData((prev) => {
      const patch: Record<string, StudentExtra> = {}
      toFetch.forEach((s) => { patch[s._id] = { guardian: null, mapping: null, loading: true } })
      return { ...prev, ...patch }
    })

    const results = await Promise.allSettled(
      toFetch.map(async (student) => {
        let guardian: StudentGuardian | null = null
        let mapping: StudentAcademicMapping | null = null

        try {
          const gRes = await studentsApi.getPrimaryGuardian(student._id)
          guardian = (gRes as any)?.result ?? null
        } catch {}

        try {
          const mRes = await studentsApi.getActiveAcademicMappingByStudent(student._id)
          const mRaw = (mRes as any)?.result ?? null
          mapping = Array.isArray(mRaw) ? (mRaw[0] ?? null) : mRaw
        } catch {}

        return { id: student._id, guardian, mapping }
      })
    )

    setExtraData((prev) => {
      const patch: Record<string, StudentExtra> = {}
      results.forEach((result, i) => {
        const studentId = toFetch[i]._id
        if (result.status === 'fulfilled') {
          patch[studentId] = { ...result.value, loading: false }
        } else {
          fetchedIdsRef.current.delete(studentId)
          patch[studentId] = { guardian: null, mapping: null, loading: false }
        }
      })
      return { ...prev, ...patch }
    })
  }, [])

  // ─── Filter + Sort + Paginate ─────────────────────────────────────────────

  const filteredStudents = students
    .filter((s) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        s.full_name.toLowerCase().includes(q) ||
        s.student_code.toLowerCase().includes(q)
      const matchesClass = (() => {
        if (classFilter === 'all') return true
        const extra = extraData[s._id]
        if (!extra || extra.loading) return false
        const mappingClassId =
          typeof extra.mapping?.class_id === 'object' && extra.mapping?.class_id !== null
            ? (extra.mapping.class_id as any)._id
            : extra.mapping?.class_id
        return mappingClassId === classFilter
      })()
      return matchesSearch && matchesClass
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
      if (sortBy === 'name_asc') return a.full_name.localeCompare(b.full_name)
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    })

  const totalPages        = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const paginatedIds = paginatedStudents.map((s) => s._id).join(',')
  useEffect(() => {
    if (paginatedStudents.length > 0) fetchExtraForVisible(paginatedStudents)
  }, [paginatedIds, fetchExtraForVisible])

  const stats = { total: students.length }

  // ─── Activate (onboarding → active) ──────────────────────────────────────

  const confirmActivate = (student: Student) => {
    setModal({
      open: true,
      type: 'activate',
      title: 'Activate Student',
      message: `Are you sure you want to activate "${student.full_name}" (${student.student_code})? Their profile will move to All Students.`,
      onConfirm: () => handleActivate(student._id),
    })
  }

  const handleActivate = async (id: string) => {
    setModal((m) => ({ ...m, open: false }))
    setActivatingId(id)
    try {
      await studentsApi.activate(id)
      // Remove from onboarding list (they are now "active")
      setStudents((prev) => prev.filter((s) => s._id !== id))
      setExtraData((prev) => { const copy = { ...prev }; delete copy[id]; return copy })
      fetchedIdsRef.current.delete(id)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to activate student. Please try again.'
      setModal({ open: true, type: 'error', title: 'Activation Failed', message: msg })
    } finally {
      setActivatingId(null)
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  const confirmDelete = (student: Student) => {
    setModal({
      open: true,
      type: 'confirm',
      title: 'Delete Student',
      message: `Are you sure you want to delete "${student.full_name}" (${student.student_code})? This action cannot be undone.`,
      onConfirm: () => handleDelete(student._id),
    })
  }

  const handleDelete = async (id: string) => {
    setModal((m) => ({ ...m, open: false }))
    setDeletingId(id)
    try {
      await studentsApi.delete(id)
      setStudents((prev) => prev.filter((s) => s._id !== id))
      setExtraData((prev) => { const copy = { ...prev }; delete copy[id]; return copy })
      fetchedIdsRef.current.delete(id)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete student. Please try again.'
      setModal({ open: true, type: 'error', title: 'Delete Failed', message: msg })
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Class/Batch label helper ─────────────────────────────────────────────

  function getClassBatchLabel(extra: StudentExtra | undefined): string | null {
    if (!extra || extra.loading) return null
    const m = extra.mapping
    if (!m || !m.class_id) return '—'

    const classIdStr =
      typeof m.class_id === 'object' && m.class_id !== null
        ? (m.class_id as any)._id
        : (m.class_id as string)
    const classDisplayName =
      typeof m.class_id === 'object' && m.class_id !== null
        ? (m.class_id as any).class_name
        : (classMap[classIdStr] ?? classIdStr)

    const batchIdStr =
      typeof m.batch_id === 'object' && m.batch_id !== null
        ? (m.batch_id as any)._id
        : (m.batch_id as string | undefined)
    const batchDisplayName =
      typeof m.batch_id === 'object' && m.batch_id !== null
        ? (m.batch_id as any).batch_name
        : batchIdStr
          ? (batchMap[batchIdStr] ?? null)
          : null

    const cName = `Class ${classDisplayName}`
    return batchDisplayName ? `${cName} - ${batchDisplayName}` : cName
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">

      {/* ── Modal ── */}
      <Dialog
        open={modal.open}
        onOpenChange={(open) => { if (!open) setModal((m) => ({ ...m, open: false })) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              {modal.type === 'error'    && <AlertCircle  className="h-5 w-5 text-red-500 shrink-0" />}
              {modal.type === 'confirm'  && <Trash2       className="h-5 w-5 text-red-500 shrink-0" />}
              {modal.type === 'activate' && <CheckCircle  className="h-5 w-5 text-green-500 shrink-0" />}
              <DialogTitle
                className={
                  modal.type === 'activate' ? 'text-green-700' : 'text-red-700'
                }
              >
                {modal.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-relaxed pl-8">
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal((m) => ({ ...m, open: false }))}>
              Cancel
            </Button>

            {modal.type === 'activate' && modal.onConfirm && (
              <Button
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                onClick={modal.onConfirm}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Yes, Activate
              </Button>
            )}

            {modal.type === 'confirm' && modal.onConfirm && (
              <Button variant="destructive" onClick={modal.onConfirm}>
                Yes, Delete
              </Button>
            )}

            {modal.type === 'error' && (
              <Button variant="destructive" onClick={() => setModal((m) => ({ ...m, open: false }))}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Student Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve new student applications
          </p>
        </div>
        <Link href="/dashboard/students/add" className="w-full sm:w-auto">
          <Button className="gap-2 w-full bg-gradient-to-r from-[#1897C6] to-[#67BAC3]">
            <Plus className="h-4 w-4" />
            Add New Student
          </Button>
        </Link>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pending Approval"
          value={stats.total}
          icon={UserPlus}
          color="primary"
        />
      </div>

      {/* ── Table Card ── */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <CardTitle className="text-lg sm:text-xl">Onboarding Applications</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {/* Class filter */}
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] border-2">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        Class {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort by */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-full sm:w-[190px] border-2">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Applied: Newest First</SelectItem>
                    <SelectItem value="oldest">Applied: Oldest First</SelectItem>
                    <SelectItem value="name_asc">Name: A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">

          {/* ══ DESKTOP TABLE ══ */}
          <div className="hidden md:block">
            <div className="border-2 rounded-xl overflow-hidden mx-4 mb-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 hover:from-[#1897C6]/5 hover:to-[#67BAC3]/5 border-b-2">
                      <TableHead className="font-semibold text-sm h-14">Student</TableHead>
                      <TableHead className="font-semibold text-sm h-14">Class / Batch</TableHead>
                      <TableHead className="font-semibold text-sm h-14 hidden lg:table-cell">Date of Birth</TableHead>
                      <TableHead className="font-semibold text-sm h-14 hidden lg:table-cell">Guardian Details</TableHead>
                      <TableHead className="font-semibold text-sm h-14">Applied Date</TableHead>
                      <TableHead className="font-semibold text-sm h-14">Status</TableHead>
                      <TableHead className="font-semibold text-sm h-14 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Loading students...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                          No onboarding students found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedStudents.map((student) => {
                        const statusCfg       = STATUS_CONFIG[student.status] ?? { label: student.status, variant: 'outline' as const }
                        const isDeleting      = deletingId === student._id
                        const isActivating    = activatingId === student._id
                        const extra           = extraData[student._id]
                        const isExtraLoading  = !extra || extra.loading
                        const classBatchLabel = getClassBatchLabel(extra)
                        const guardianName    = isExtraLoading ? null : (extra.guardian?.name ?? '—')
                        const guardianMobile  = isExtraLoading ? null : (extra.guardian?.mobile ?? null)

                        return (
                          <TableRow key={student._id} className="hover:bg-muted/50 transition-colors">

                            {/* Student */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white text-xs">
                                    {getInitials(student.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{student.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{student.student_code}</p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Class / Batch */}
                            <TableCell>
                              {isExtraLoading ? (
                                <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                              ) : (
                                <Badge variant="outline" className="text-xs">{classBatchLabel}</Badge>
                              )}
                            </TableCell>

                            {/* DOB */}
                            <TableCell className="hidden lg:table-cell text-sm">
                              {student.date_of_birth
                                ? new Date(student.date_of_birth).toLocaleDateString('en-IN')
                                : '—'}
                            </TableCell>

                            {/* Guardian */}
                            <TableCell className="hidden lg:table-cell">
                              {isExtraLoading ? (
                                <div className="space-y-1">
                                  <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <p className="font-medium truncate max-w-[150px]">{guardianName}</p>
                                  {guardianMobile && (
                                    <p className="text-xs text-muted-foreground">{guardianMobile}</p>
                                  )}
                                </div>
                              )}
                            </TableCell>

                            {/* Applied Date */}
                            <TableCell className="text-sm">
                              {student.createdAt
                                ? new Date(student.createdAt).toLocaleDateString('en-IN')
                                : '—'}
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* ── Activate button ── */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 gap-1 text-xs font-medium"
                                  disabled={isActivating || isDeleting}
                                  onClick={() => confirmActivate(student)}
                                  title="Activate student"
                                >
                                  {isActivating
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <><CheckCircle className="h-4 w-4" /><span className="hidden xl:inline">Activate</span></>
                                  }
                                </Button>

                                <Link href={`/dashboard/students/onboarding/${student._id}`}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>

                                <Link href={`/dashboard/students/add?edit=${student._id}`}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={isDeleting || isActivating}
                                  onClick={() => confirmDelete(student)}
                                >
                                  {isDeleting
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>

                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* ══ MOBILE CARDS ══ */}
          <div className="md:hidden space-y-3 px-3 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading students...</span>
              </div>
            ) : paginatedStudents.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">
                No onboarding students found.
              </p>
            ) : (
              paginatedStudents.map((student) => {
                const statusCfg       = STATUS_CONFIG[student.status] ?? { label: student.status, variant: 'outline' as const }
                const isDeleting      = deletingId === student._id
                const isActivating    = activatingId === student._id
                const extra           = extraData[student._id]
                const isExtraLoading  = !extra || extra.loading
                const classBatchLabel = getClassBatchLabel(extra)

                return (
                  <Card key={student._id} className="border shadow-sm">
                    <CardContent className="p-4">

                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white text-sm">
                              {getInitials(student.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{student.student_code}</p>
                            {isExtraLoading ? (
                              <div className="h-4 w-16 bg-muted animate-pulse rounded mt-1" />
                            ) : (
                              <Badge variant="outline" className="text-xs mt-1">{classBatchLabel}</Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant={statusCfg.variant} className="shrink-0 text-xs">
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Guardian</p>
                          {isExtraLoading ? (
                            <div className="h-3 w-20 bg-muted animate-pulse rounded mt-1" />
                          ) : (
                            <p className="font-medium text-foreground truncate">
                              {extra.guardian?.name ?? '—'}
                            </p>
                          )}
                          {!isExtraLoading && extra.guardian?.mobile && (
                            <p className="text-muted-foreground">{extra.guardian.mobile}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date of Birth</p>
                          <p className="font-medium text-foreground">
                            {student.date_of_birth
                              ? new Date(student.date_of_birth).toLocaleDateString('en-IN')
                              : '—'}
                          </p>
                          <p className="text-muted-foreground mt-1">Applied</p>
                          <p className="font-medium text-foreground">
                            {student.createdAt
                              ? new Date(student.createdAt).toLocaleDateString('en-IN')
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 pt-3 border-t flex items-center justify-between gap-1">
                        {/* Activate */}
                        <Button
                          size="sm"
                          className="h-8 px-3 gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white"
                          disabled={isActivating || isDeleting}
                          onClick={() => confirmActivate(student)}
                        >
                          {isActivating
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><CheckCircle className="h-3.5 w-3.5" /> Activate</>
                          }
                        </Button>

                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/students/onboarding/${student._id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/students/add?edit=${student._id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isDeleting || isActivating}
                            onClick={() => confirmDelete(student)}
                          >
                            {isDeleting
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* ── Pagination ── */}
          {filteredStudents.length > 7 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 px-4 sm:px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows:</span>
                  <Input
                    type="number"
                    min={1}
                    value={itemsInput}
                    onChange={(e) => {
                      setItemsInput(e.target.value)
                      const n = parseInt(e.target.value)
                      if (n > 0) { setItemsPerPage(n); setCurrentPage(1) }
                    }}
                    className="w-[70px] h-9 text-sm text-center"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredStudents.length === 0
                    ? '0'
                    : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredStudents.length)}`
                  } of {filteredStudents.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0 bg-transparent disabled:opacity-40"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-3 gap-1.5 bg-transparent disabled:opacity-40 text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="default" size="sm"
                  className="h-9 w-9 p-0 font-medium text-sm bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent shadow-sm pointer-events-none"
                >
                  {currentPage}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 gap-1.5 bg-transparent disabled:opacity-40 text-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0 bg-transparent disabled:opacity-40"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}



