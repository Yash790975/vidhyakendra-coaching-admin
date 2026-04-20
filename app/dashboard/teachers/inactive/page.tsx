'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search, Eye, Edit2, CheckCircle2, Users, AlertCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Download, UserMinus, Loader2, RefreshCw, X, Filter,
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
import Link from 'next/link'
import { IMAGE_BASE_URL } from '@/lib/api/config'
import {
  teachersApi,
  type Teacher,
  type TeacherContact,
  type TeacherQualification,
} from '@/lib/api/teachers'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InactiveTeacherRow {
  teacher: Teacher
  contact: TeacherContact | null
  qualDisplay: string
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InactiveTeachersPage() {
  const [rows, setRows]                   = useState<InactiveTeacherRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [search, setSearch]               = useState('')
  const [currentPage, setCurrentPage]     = useState(1)
  const [itemsPerPage, setItemsPerPage]   = useState(10)
  const [reactivateId, setReactivateId]   = useState<string | null>(null)
  const [isReactivating, setIsReactivating] = useState(false)
  const [actionError, setActionError]     = useState('')

const [statusFilter, setStatusFilter] = useState<'all' | 'inactive' | 'blocked' | 'archived'>('all')

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchInactiveTeachers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
const instituteId = typeof window !== 'undefined'
  ? localStorage.getItem('instituteId') || ''
  : ''

const [inactiveRes, blockedRes, archivedRes] = await Promise.allSettled([
  teachersApi.getAll({ status: 'inactive', ...(instituteId && { institute_id: instituteId }) }),
  teachersApi.getAll({ status: 'blocked',  ...(instituteId && { institute_id: instituteId }) }),
  teachersApi.getAll({ status: 'archived', ...(instituteId && { institute_id: instituteId }) }),
])

      const teacherList: Teacher[] = [
        ...(inactiveRes.status === 'fulfilled' && inactiveRes.value.success && Array.isArray(inactiveRes.value.result) ? inactiveRes.value.result : []),
        ...(blockedRes.status === 'fulfilled' && blockedRes.value.success && Array.isArray(blockedRes.value.result) ? blockedRes.value.result : []),
        ...(archivedRes.status === 'fulfilled' && archivedRes.value.success && Array.isArray(archivedRes.value.result) ? archivedRes.value.result : []),
      ]

      if (!teacherList.length && 
          inactiveRes.status === 'rejected' && 
          blockedRes.status === 'rejected' && 
          archivedRes.status === 'rejected') {
        setError('Unable to load teachers. Please try again.')
        setRows([])
        return
      }

      const enriched = await Promise.all(
        teacherList.map(async (teacher): Promise<InactiveTeacherRow> => {
          const [contactRes, qualRes] = await Promise.allSettled([
            teachersApi.getContactByTeacher(teacher._id),
            teachersApi.getQualificationsByTeacher(teacher._id),
          ])
          const contact =
            contactRes.status === 'fulfilled' &&
            contactRes.value.success &&
            contactRes.value.result
              ? (contactRes.value.result as TeacherContact)
              : null
          const qualifications: TeacherQualification[] =
            qualRes.status === 'fulfilled' &&
            qualRes.value.success &&
            Array.isArray(qualRes.value.result)
              ? qualRes.value.result
              : []
          return {
            teacher,
            contact,
            qualDisplay:
              qualifications.map(q => q.qualification).filter(Boolean).join(', ') || '—',
          }
        })
      )
      setRows(enriched)
    } catch (err: unknown) {
      console.error('[InactiveTeachers] Unexpected error:', err instanceof Error ? err.message : err)
      setError('Something went wrong while loading teachers. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInactiveTeachers() }, [fetchInactiveTeachers])

  // ─── Reactivate ──────────────────────────────────────────────────────────────

  const confirmReactivate = async () => {
    if (!reactivateId) return
    setIsReactivating(true)
    setActionError('')
    try {
      const res = await teachersApi.update(reactivateId, { status: 'active' })
      if (!res.success) {
        console.error('[InactiveTeachers] Reactivate failed:', res.message)
        setActionError('Could not reactivate this teacher. Please try again.')
        return
      }
      setRows(prev => prev.filter(r => r.teacher._id !== reactivateId))
      setReactivateId(null)
    } catch (err: unknown) {
      console.error('[InactiveTeachers] Reactivate error:', err instanceof Error ? err.message : err)
      setActionError('Something went wrong. Please try again.')
    } finally {
      setIsReactivating(false)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filteredRows = rows.filter(row => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q || (
      row.teacher.full_name?.toLowerCase().includes(q) ||
      row.teacher.teacher_code?.toLowerCase().includes(q) ||
      row.contact?.email?.toLowerCase().includes(q) ||
      row.contact?.mobile?.includes(q) ||
      row.qualDisplay.toLowerCase().includes(q)
    )
    const matchStatus = statusFilter === 'all' || row.teacher.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages    = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage))
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // ─── Loading skeleton ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400" />
          <p className="mt-4 text-sm text-muted-foreground">Loading inactive teachers...</p>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Error Banner */}
      {error && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm font-medium text-red-900">{error}</p>
              <Button size="sm" onClick={fetchInactiveTeachers} className="ml-auto shrink-0">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-500 to-gray-700 bg-clip-text text-transparent">
            Inactive Teachers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            View and reactivate deactivated teacher records
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-fit bg-transparent gap-2 h-9 sm:h-10 border-2"
          disabled={!filteredRows.length}
        >
          <Download className="h-4 w-4" />
          <span className="text-sm">Export</span>
        </Button>
      </div>

      {/* Stats */}
     <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total', value: rows.length, gradient: 'from-gray-400 to-gray-500', border: 'hover:border-gray-400/50', icon: UserMinus },
          { label: 'Inactive', value: rows.filter(r => r.teacher.status === 'inactive').length, gradient: 'from-gray-400 to-gray-600', border: 'hover:border-gray-500/50', icon: UserMinus },
          { label: 'Blocked', value: rows.filter(r => r.teacher.status === 'blocked').length, gradient: 'from-red-400 to-red-500', border: 'hover:border-red-400/50', icon: AlertCircle },
          { label: 'Archived', value: rows.filter(r => r.teacher.status === 'archived').length, gradient: 'from-orange-400 to-orange-500', border: 'hover:border-orange-400/50', icon: AlertCircle },
        ].map((card, i) => {
          const Icon = card.icon
          return (
            <Card key={i} className={`border-2 transition-all ${card.border}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-md`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="text-xl sm:text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {/* Table Card */}
      <Card className="border-2">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Inactive Teachers List</CardTitle>
            <Button
              variant="outline" size="sm"
              onClick={fetchInactiveTeachers}
              className="gap-2 h-9 bg-transparent"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">

          {/* Search */}
                 {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, email or mobile..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                className="pl-10 h-10 sm:h-11 text-sm"
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
            <Select
              value={statusFilter}
              onValueChange={v => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1) }}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-11 text-sm">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Table */}
          <div className="border-2 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-100 hover:to-gray-50 border-b-2">
                    <TableHead className="font-semibold text-sm h-14">Name</TableHead>
                    <TableHead className="font-semibold text-sm h-14 hidden md:table-cell">Teacher Code</TableHead>
                    <TableHead className="font-semibold text-sm h-14 hidden md:table-cell">Contact Details</TableHead>
                    <TableHead className="font-semibold text-sm h-14 hidden lg:table-cell">Qualification</TableHead>
                    <TableHead className="font-semibold text-sm h-14 hidden sm:table-cell">Status</TableHead>
                    <TableHead className="font-semibold text-sm h-14 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-base font-semibold">
                            {search ? 'No results found' : 'No inactive teachers'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {search ? 'Try adjusting your search' : 'All teachers are currently active'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map(({ teacher, contact, qualDisplay }) => {
                      const initials =
                        teacher.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                      return (
                        <TableRow
                          key={teacher._id}
                          className="border-b hover:bg-gray-50 transition-colors group"
                        >
                          {/* Name */}
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              {teacher.upload_photo_url ? (
                                <img
                                  src={
                                    teacher.upload_photo_url.startsWith('http')
                                      ? teacher.upload_photo_url
                                      : `${IMAGE_BASE_URL}${teacher.upload_photo_url.startsWith('/') ? '' : '/'}${teacher.upload_photo_url}`
                                  }
                                  alt={teacher.full_name}
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                  className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-md grayscale opacity-70 group-hover:opacity-90 transition-all"
                                />
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-500 font-bold text-sm shadow-md">
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-gray-600">{teacher.full_name}</p>
                                <p className="text-xs text-muted-foreground md:hidden">
                                  {teacher.teacher_code || teacher._id.slice(-6)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Teacher Code */}
                          <TableCell className="hidden md:table-cell py-4">
                            <p className="font-mono font-semibold text-sm text-gray-400">
                              {teacher.teacher_code || '—'}
                            </p>
                          </TableCell>

                          {/* Contact */}
                          <TableCell className="hidden md:table-cell py-4">
                            <p className="text-sm">{contact?.email || '—'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {contact?.mobile ? `+91 ${contact.mobile}` : '—'}
                            </p>
                          </TableCell>

                            {/* Qualification */}
                          <TableCell className="hidden lg:table-cell py-4">
                            {qualDisplay !== '—' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 max-w-[160px] truncate">
                                {qualDisplay}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="hidden sm:table-cell py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              teacher.status === 'inactive' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                              teacher.status === 'blocked'  ? 'bg-red-100 text-red-600 border border-red-200' :
                              teacher.status === 'archived' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
                              'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}>
                              {teacher.status === 'inactive' ? 'Inactive' :
                               teacher.status === 'blocked'  ? 'Blocked' :
                               teacher.status === 'archived' ? 'Archived' : teacher.status}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/dashboard/teachers/active/${teacher._id}`}>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-[#1897C6]/10 hover:text-[#1897C6] transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              </Link>
                              <Link href={`/dashboard/teachers/add?edit=${teacher._id}`}>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                  title="Edit Teacher"
                                >
                                  <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => setReactivateId(teacher._id)}
                                className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                                title="Reactivate Teacher"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

          {/* Pagination */}
          {filteredRows.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Rows:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}
                  >
                    <SelectTrigger className="w-[65px] sm:w-[75px] h-8 sm:h-9 border-2 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-xs sm:text-sm font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filteredRows.length)} of {filteredRows.length}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent disabled:opacity-50">
                  <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent disabled:opacity-50">
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                    let page: number
                    if (totalPages <= 3)          page = i + 1
                    else if (currentPage <= 2)    page = i + 1
                    else if (currentPage >= totalPages - 1) page = totalPages - 2 + i
                    else                          page = currentPage - 1 + i
                    return (
                      <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 font-semibold text-xs sm:text-sm transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-transparent shadow-md'
                            : 'bg-transparent hover:bg-gray-100'
                        }`}>
                        {page}
                      </Button>
                    )
                  })}
                </div>

                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent disabled:opacity-50">
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent disabled:opacity-50">
                  <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Reactivate Confirmation Dialog */}
      <AlertDialog
        open={!!reactivateId}
        onOpenChange={v => { if (!v) { setReactivateId(null); setActionError('') } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Reactivate Teacher
            </AlertDialogTitle>
            <AlertDialogDescription>
              This teacher will be moved back to the active list and will be able to teach again.
              All existing data and assignments are preserved.
            </AlertDialogDescription>
            {actionError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600 mt-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {actionError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReactivate}
              disabled={isReactivating}
              className="bg-green-500 hover:bg-green-600 gap-2"
            >
              {isReactivating
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Reactivating...</>
                : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}