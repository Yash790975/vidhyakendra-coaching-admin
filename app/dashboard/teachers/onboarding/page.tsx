'use client'

import dynamic from 'next/dynamic'
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Eye, Edit2, Trash2, UserPlus, AlertCircle,
  CheckCircle, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Filter, Download, Loader2, RefreshCw, X,
  FileText,
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { IMAGE_BASE_URL } from '@/lib/api/config'
import {
  teachersApi,
  type Teacher,
  type TeacherContact,
  type TeacherQualification,
  type TeacherExperience,
  type TeacherIdentityDocument,
} from '@/lib/api/teachers'

// ─── Types ────────────────────────────────────────────────────────────────────

type TeacherStatus = 'active' | 'inactive' | 'blocked' | 'archived' | 'onboarding'


const STATUS_CONFIG: Record<TeacherStatus, { color: string; label: string }> = {
  onboarding: { color: 'text-blue-600',   label: 'Onboarding'  },
  active:     { color: 'text-emerald-600',label: 'Active'       },
  inactive:   { color: 'text-gray-500',   label: 'Inactive'     },
  blocked:    { color: 'text-red-500',    label: 'Blocked'      },
  archived:   { color: 'text-orange-500', label: 'Archived'     },
}
const calcExperience = (exps: TeacherExperience[]): string => {
  if (!exps.length) return '—'
  let totalMonths = 0
  const now = new Date()
  exps.forEach(e => {
    if (!e.from_date) return
    const from = new Date(e.from_date)
    const to = e.is_current ? now : e.to_date ? new Date(e.to_date) : now
    totalMonths += Math.max(
      0,
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
    )
  })
  if (!totalMonths) return '< 1 Yr'
  const y = Math.floor(totalMonths / 12), m = totalMonths % 12
  if (!y) return `${m} Month${m > 1 ? 's' : ''}`
  if (!m) return `${y} Year${y > 1 ? 's' : ''}`
  return `${y}Y ${m}M`
}

const getQualDisplay = (quals: TeacherQualification[]): string =>
  quals.map(q => q.qualification).filter(Boolean).join(', ') || '—'

interface RowData {
  teacher: Teacher
  contact: TeacherContact | null
  qualifications: TeacherQualification[]
  experiences: TeacherExperience[]
  documents: TeacherIdentityDocument[]
  expDisplay: string
  qualDisplay: string
  appliedDate: string
}



const exportCSV = (rows: RowData[]) => {
  const headers = ['Name', 'Mobile', 'Email', 'Qualification', 'Experience', 'Applied Date', 'Status', 'Employment Type', 'Teacher Code']
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.teacher.full_name || ''}"`,
      `"${r.contact?.mobile || ''}"`,
      `"${r.contact?.email || ''}"`,
      `"${r.qualDisplay}"`,
      `"${r.expDisplay}"`,
      `"${r.appliedDate}"`,
       `"${r.teacher.status ?? ''}"`,
      `"${r.teacher.employment_type || ''}"`,
      `"${r.teacher.teacher_code || ''}"`,
    ].join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `teacher_onboarding_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function TeacherOnboardingPage() {
  const router = useRouter()

  const pathname = usePathname()
   const [allRows, setAllRows] = useState<RowData[]>([])
  const [statsCount, setStatsCount] = useState({ total: 0, pending: 0, approved: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
 const [itemsPerPage, setItemsPerPage] = useState(7)
const [itemsInput, setItemsInput] = useState('7')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // ─── Fetch all data ──────────────────────────────────────────────────────────

 const fetchAll = useCallback(async (statusToFetch?: string) => {
    setIsLoading(true)
    setLoadError('')
    try {
      const instituteId =
        typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''
      const query: Record<string, string> = {}
      if (instituteId) query.institute_id = instituteId
      if (statusToFetch) query.status = statusToFetch
      query.teacher_type = 'coaching'
      const res = await teachersApi.getAll(query)
      if (!res.success || !Array.isArray(res.result)) {
        const msg = res.message || 'Failed to load teachers'
      console.log('[TeacherOnboarding] Load failed:', msg)
      setLoadError('Unable to load teachers. Please check your connection or try again.')
        return
      }

      const teachers: Teacher[] = res.result

      const rows = await Promise.all(
        teachers.map(async (teacher): Promise<RowData> => {
          const [contactRes, qualRes, expRes, docRes] = await Promise.allSettled([
            teachersApi.getContactByTeacher(teacher._id),
            teachersApi.getQualificationsByTeacher(teacher._id),
            teachersApi.getExperienceByTeacher(teacher._id),
            teachersApi.getIdentityDocumentsByTeacher(teacher._id),
          ])

const contact =
  contactRes.status === 'fulfilled' &&
  contactRes.value.success &&
  contactRes.value.result
    ? (contactRes.value.result as TeacherContact)
    : null
          const qualifications: TeacherQualification[] =
            qualRes.status === 'fulfilled' && qualRes.value.success
              ? Array.isArray(qualRes.value.result) ? qualRes.value.result : []
              : []
          const experiences: TeacherExperience[] =
            expRes.status === 'fulfilled' && expRes.value.success
              ? Array.isArray(expRes.value.result) ? expRes.value.result : []
              : []
          const documents: TeacherIdentityDocument[] =
            docRes.status === 'fulfilled' && docRes.value.success
              ? Array.isArray(docRes.value.result) ? docRes.value.result : []
              : []

           const appliedDate = teacher.joining_date
            ? new Date(teacher.joining_date).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
            : teacher.createdAt
              ? new Date(teacher.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
              : '—'

          return {
            teacher, contact, qualifications, experiences, documents,
            expDisplay: calcExperience(experiences),
            qualDisplay: getQualDisplay(qualifications),
            appliedDate,
          }
        })
      )
      setAllRows(rows)
    } catch (err: any) {
      console.log('[TeacherOnboarding] Unexpected error:', err?.message || err)
      setLoadError('Something went wrong while loading teachers. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }, [])

   useEffect(() => {
    fetchAll('onboarding')

    // Stats ke liye sirf count chahiye — no extra per-teacher calls
    const fetchStats = async () => {
      try {
        const instituteId = typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''
        const query: Record<string, string> = {}
        if (instituteId) query.institute_id = instituteId

        // coaching teachers stats
        query.teacher_type = 'coaching'
        const allRes = await teachersApi.getAll(query)
        if (allRes.success && Array.isArray(allRes.result)) {
          const all = allRes.result as Teacher[]
          setStatsCount({
            total:    all.length,
            pending:  all.filter(t => t.status === 'onboarding').length,
            approved: all.filter(t => t.status === 'active').length,
          })
        }
      } catch (err) {
        console.warn('[TeacherOnboarding] stats fetch failed ➜', err)
      }
    }
    fetchStats()
  }, [fetchAll, pathname])


  // ─── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:     statsCount.total,
    pending:   statsCount.pending,
    documents: allRows.filter(r => r.documents.length === 0).length,
    approved:  statsCount.approved,
  }), [statsCount, allRows])  // ─── Filtered + paginated ────────────────────────────────────────────────────

 const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim()
    const baseRows = allRows.filter(row => row.teacher.status === 'onboarding')
    if (!q) return baseRows
    return baseRows.filter(row =>
      row.teacher.full_name?.toLowerCase().includes(q) ||
      row.contact?.email?.toLowerCase().includes(q) ||
      row.contact?.mobile?.includes(q) ||
      row.qualDisplay.toLowerCase().includes(q)
    )
  }, [allRows, search])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage))
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

   useEffect(() => { setCurrentPage(1) }, [search, itemsPerPage])

  // ─── Navigation helpers ───────────────────────────────────────────────────────

  const handleView = (teacherId: string) => {
    router.push(`/dashboard/teachers/onboarding/${teacherId}`)
  }

  const handleEdit = (teacherId: string) => {
    router.push(`/dashboard/teachers/add?edit=${teacherId}`)
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      const res = await teachersApi.delete(deleteId)
      if (res.success) {
        setAllRows(prev => prev.filter(r => r.teacher._id !== deleteId))
        setDeleteId(null)
      } else {
              console.log('[TeacherOnboarding] Delete failed:', res.message)
        setDeleteError('Could not delete this teacher. Please try again.')

      }
    } catch (err: any) {
      console.log('[TeacherOnboarding] Delete error:', err?.message || err)
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }


  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-0">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
            Teacher Onboarding
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and manage new teacher applications
          </p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/teachers/add')}
          className="gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90 shadow-md h-11 px-6 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Add New Teacher
        </Button>
      </div>

    {/* ── Stats Cards ── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Applications', value: stats.total,     icon: UserPlus,   gradient: 'from-[#1897C6] to-[#67BAC3]', border: 'hover:border-[#1897C6]/50' },
          { label: 'Pending Review',     value: stats.pending,   icon: AlertCircle, gradient: 'from-amber-400 to-orange-400', border: 'hover:border-amber-400/50' },
          { label: 'Documents Required', value: stats.documents, icon: FileText,    gradient: 'from-orange-400 to-red-400',   border: 'hover:border-orange-400/50' },
          { label: 'Approved',           value: stats.approved,  icon: CheckCircle, gradient: 'from-emerald-400 to-green-500',border: 'hover:border-emerald-400/50' },
        ].map((card, i) => {
          const Icon = card.icon
          return (
            <Card key={i} className={`border-2 transition-all ${card.border}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-md`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{card.label}</p>
                    <p className="text-xl sm:text-2xl font-bold">
                      {isLoading ? <span className="text-muted-foreground/40">—</span> : card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Table Card ── */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Applications List</CardTitle>
            <div className="flex items-center gap-2">
               <Button
                variant="outline" size="sm"
                onClick={() => fetchAll('onboarding')} disabled={isLoading}
                className="gap-2 h-9 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-sm">Refresh</span>
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => exportCSV(filteredRows)}
                disabled={!filteredRows.length}
                className="gap-2 h-9 bg-transparent"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 space-y-4">

          {/* ── Search + Filter ── */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, mobile..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-11 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* <Select
              value={statusFilter}
              onValueChange={v => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-full sm:w-[200px] h-11 text-sm">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
<SelectContent>
  <SelectItem value="all">All Status</SelectItem>
  <SelectItem value="onboarding">Onboarding</SelectItem>
  <SelectItem value="active">Active</SelectItem>
  <SelectItem value="inactive">Inactive</SelectItem>
  <SelectItem value="blocked">Blocked</SelectItem>
  <SelectItem value="archived">Archived</SelectItem>
</SelectContent>
            </Select> */}
          </div>

          {/* ── Error Banner ── */}
{loadError && (
  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-sm text-red-700">
    <AlertCircle className="h-4 w-4 shrink-0" />
    {loadError}
    <button
      onClick={() => fetchAll('onboarding')}
      className="ml-auto underline text-xs hover:no-underline"
    >
      Retry
    </button>
  </div>
)}
          {/* ── Table ── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                  <TableHead className="font-semibold text-sm h-12 pl-4">Name</TableHead>
                  <TableHead className="font-semibold text-sm h-12 hidden md:table-cell">Contact</TableHead>
                  <TableHead className="font-semibold text-sm h-12 hidden lg:table-cell">Qualification</TableHead>
                  <TableHead className="font-semibold text-sm h-12 hidden xl:table-cell">Experience</TableHead>
                  <TableHead className="font-semibold text-sm h-12 hidden sm:table-cell">Applied Date</TableHead>
                  <TableHead className="font-semibold text-sm h-12">Status</TableHead>
                  <TableHead className="font-semibold text-sm h-12 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* ── Loading skeleton ── */}
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b">
                      <TableCell className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse shrink-0" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                            <div className="h-2.5 w-20 bg-muted/60 rounded animate-pulse" />
                          </div>
                        </div>
                      </TableCell>
                      {[0, 1, 2, 3, 4, 5].map(j => (
                        <TableCell
                          key={j}
                          className={`py-4 ${
                            j === 0 ? 'hidden md:table-cell' :
                            j === 1 ? 'hidden lg:table-cell' :
                            j === 2 ? 'hidden xl:table-cell' :
                            j === 3 ? 'hidden sm:table-cell' : ''
                          }`}
                        >
                          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))

                ) : paginatedRows.length === 0 ? (
                  /* ── Empty state ── */
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <UserPlus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-semibold">No applications found</p>
                        <p className="text-sm text-muted-foreground">
                                          {search
                            ? 'Try adjusting your search'
                            : 'No teachers found for this status'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>

                ) : (
                  /* ── Data rows ── */
             paginatedRows.map(row => {
                    const initials =
                      row.teacher.full_name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || '?'

                    return (
                      <TableRow
                        key={row.teacher._id}
                        className="border-b hover:bg-muted/30 transition-colors group"
                      >
                        {/* Name */}
                        <TableCell className="py-3.5 pl-4">
                          <div className="flex items-center gap-3">
                        {row.teacher.upload_photo_url ? (
                          <img
src={row.teacher.upload_photo_url.startsWith('http')
  ? row.teacher.upload_photo_url
  : `${IMAGE_BASE_URL}${row.teacher.upload_photo_url.startsWith('/') ? '' : '/'}${row.teacher.upload_photo_url}`}
                            alt={row.teacher.full_name}
                            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {initials}
                          </div>
                        )}
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{row.teacher.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate md:hidden">
                                {row.contact?.email || row.contact?.mobile || '—'}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell className="hidden md:table-cell py-3.5">
                          <p className="text-sm">{row.contact?.email || '—'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {row.contact?.mobile ? `+91 ${row.contact.mobile}` : '—'}
                          </p>
                        </TableCell>

                        {/* Qualification */}
                        <TableCell className="hidden lg:table-cell py-3.5">
                          {row.qualDisplay !== '—' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 max-w-[160px] truncate">
                              {row.qualDisplay}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Experience */}
                        <TableCell className="hidden xl:table-cell py-3.5">
                          <span className="text-sm font-medium">{row.expDisplay}</span>
                        </TableCell>

                        {/* Applied Date */}
                        <TableCell className="hidden sm:table-cell py-3.5">
                          <span className="text-sm text-muted-foreground">{row.appliedDate}</span>
                        </TableCell>

                                    {/* Status */}
                        <TableCell className="py-3.5">
                          {(() => {
                            const s = STATUS_CONFIG[row.teacher.status as TeacherStatus] ?? { color: 'text-gray-500', label: row.teacher.status ?? '—' }
                            return (
                              <span className={`text-sm font-medium ${s.color}`}>
                                {s.label}
                              </span>
                            )
                          })()}
                        </TableCell>

                        {/* Actions — View, Edit, Delete */}
                        <TableCell className="py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1">

                            {/* View */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(row.teacher._id)}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-[#1897C6]/10 hover:text-[#1897C6] text-muted-foreground transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(row.teacher._id)}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-amber-50 hover:text-amber-600 text-muted-foreground transition-colors"
                              title="Edit Teacher"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(row.teacher._id)}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors"
                              title="Delete Teacher"
                            >
                              <Trash2 className="h-4 w-4" />
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

          {/* ── Pagination ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows:</span>

                  <Input
                type="number"
                min={1}
                value={itemsInput}
                onChange={e => {
                  setItemsInput(e.target.value)
                  const n = parseInt(e.target.value)
                  if (n > 0) { setItemsPerPage(n); setCurrentPage(1) }
                }}
                className="w-[70px] h-9 text-sm text-center"
              />
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredRows.length === 0
                  ? '0'
                  : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredRows.length)}`
                } of {filteredRows.length}
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
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3 gap-1.5 bg-transparent disabled:opacity-40 text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {/* {pageButtons.map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 w-9 p-0 font-medium text-sm ${
                    currentPage === page
                      ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent shadow-sm'
                      : 'bg-transparent hover:bg-[#1897C6]/10'
                  }`}
                >
                  {page}
                </Button>
              ))} */}

                <Button
                variant="default"
                size="sm"
                className="h-9 w-9 p-0 font-medium text-sm bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent shadow-sm pointer-events-none"
              >
                {currentPage}
              </Button>

              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-3 gap-1.5 bg-transparent disabled:opacity-40 text-sm"
              >
                Next
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

        </CardContent>
      </Card>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) { setDeleteId(null); setDeleteError('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Teacher Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently delete this teacher application and all associated data. This action cannot be undone.
            </AlertDialogDescription>
            {deleteError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600 mt-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {deleteError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 gap-2"
            >
              {isDeleting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</>
                : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}


const TeacherOnboardingPageDynamic = dynamic(() => Promise.resolve(TeacherOnboardingPage), {
  ssr: false,
})

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <TeacherOnboardingPageDynamic />
    </Suspense>
  )
}