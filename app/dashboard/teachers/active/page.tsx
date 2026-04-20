'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Eye,
  Edit2,
  Archive,
  Users,
  CheckCircle,
  TrendingUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Download,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { teachersApi, Teacher } from '@/lib/api'
import { TeacherContact, TeacherQualification } from '@/lib/api/teachers'
import { IMAGE_BASE_URL } from '@/lib/api/config'


interface ActiveTeacherRow {
  teacher: Teacher
  contact: TeacherContact | null
  qualDisplay: string
}
export default function ActiveTeachersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(10)



const [rows, setRows] = useState<ActiveTeacherRow[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [stats, setStats] = useState({
  total: 0,
  presentToday: 0,
  avgAttendance: 0,
  topPerformers: 0,
})

const fetchTeachers = useCallback(async () => {
  try {
    setLoading(true)
    setError(null)
    const instituteId = typeof window !== 'undefined'
  ? localStorage.getItem('instituteId') || ''
  : ''

const response = await teachersApi.getAll({
  status: 'active',
  ...(instituteId && { institute_id: instituteId }),
})
    if (!response.success) {
      setError(response.message || 'Failed to load teachers.')
      setRows([])
      return
    }
    const teacherList: Teacher[] = Array.isArray(response.result) ? response.result : []
    const enriched = await Promise.all(
      teacherList.map(async (teacher): Promise<ActiveTeacherRow> => {
        const [contactRes, qualRes] = await Promise.allSettled([
          teachersApi.getContactByTeacher(teacher._id),
          teachersApi.getQualificationsByTeacher(teacher._id),
        ])
        const contact =
          contactRes.status === 'fulfilled' && contactRes.value.success && contactRes.value.result
            ? (contactRes.value.result as TeacherContact)
            : null
        const qualifications: TeacherQualification[] =
          qualRes.status === 'fulfilled' && qualRes.value.success && Array.isArray(qualRes.value.result)
            ? qualRes.value.result
            : []
        const qualDisplay = qualifications.map(q => q.qualification).filter(Boolean).join(', ') || '—'
        return { teacher, contact, qualDisplay }
      })
    )
    setRows(enriched)
    setStats({ total: enriched.length, presentToday: 0, avgAttendance: 0, topPerformers: 0 })
  } catch (err: any) {
    setError('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}, [])

useEffect(() => { fetchTeachers() }, [fetchTeachers])

  // Search filter
const filteredRows = rows.filter((row) => {
  const q = searchQuery.toLowerCase()
  return (
    row.teacher.full_name.toLowerCase().includes(q) ||
    (row.teacher.teacher_code?.toLowerCase().includes(q) ?? false) ||
    row.contact?.email?.toLowerCase().includes(q) ||
    row.contact?.mobile?.includes(q) ||
    row.qualDisplay.toLowerCase().includes(q)
  )
})
const totalPages = Math.ceil(filteredRows.length / itemsPerPage)
const paginatedRows = filteredRows.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)

  const handleArchive = (id: string) => {
    setSelectedTeacherId(id)
    setArchiveDialogOpen(true)
  }

 const confirmArchive = async () => {
  if (!selectedTeacherId) return
  try {
    const res = await teachersApi.update(selectedTeacherId, { status: 'inactive' })
    if (!res.success) {
      setError(`Failed to mark inactive: ${res.message || 'Unknown error'}`)
      return
    }
    setRows(prev => prev.filter(r => r.teacher._id !== selectedTeacherId))
    setArchiveDialogOpen(false)
    setSelectedTeacherId(null)
  } catch (err: any) {
    setError('Could not mark teacher as inactive. Please try again.')
  }
}

  // Teacher initials for avatar
  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1897C6]"></div>
         <p className="mt-4 text-sm text-muted-foreground">Loading teachers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Error Banner */}
      {error && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm font-medium text-red-900">{error}</p>
              <Button size="sm" onClick={fetchTeachers} className="ml-auto shrink-0">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
            Active Teachers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and monitor your teaching staff
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-fit bg-transparent gap-2 h-9 sm:h-10 border-2"
        >
          <Download className="h-4 w-4" />
          <span className="text-sm">Export Teachers</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
        <Card className="border-2 hover:border-[#1897C6]/50 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white shadow-md">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Active</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-green-500/50 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white shadow-md">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Present Today</p>
                {/* TODO: Real-time attendance API se fetch karo */}
                <p className="text-xl sm:text-2xl font-bold text-muted-foreground">—</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-blue-500/50 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-md">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Attendance</p>
                {/* TODO: Attendance summary API se fetch karo */}
                <p className="text-xl sm:text-2xl font-bold text-muted-foreground">—</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-[#F1AF37]/50 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white shadow-md">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Top Performers</p>
                {/* TODO: Performance API se fetch karo */}
                <p className="text-xl sm:text-2xl font-bold text-muted-foreground">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teachers Table */}
      <Card className="border-2">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">Teachers Directory</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or teacher code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 h-10 sm:h-11 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border-2 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 hover:from-[#1897C6]/5 hover:to-[#67BAC3]/5 border-b-2">
<TableHead className="font-semibold text-sm h-14">Name</TableHead>
<TableHead className="font-semibold text-sm h-14 hidden md:table-cell">Teacher Code</TableHead>
<TableHead className="font-semibold text-sm h-14 hidden md:table-cell">Contact Details</TableHead>
<TableHead className="font-semibold text-sm h-14 hidden lg:table-cell">Qualification</TableHead>
<TableHead className="font-semibold text-sm h-14 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                 {paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Users className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
<p className="text-lg font-semibold">
  {searchQuery ? 'No results found' : 'No active teachers yet'}
</p>
<p className="text-sm text-muted-foreground">
  {searchQuery ? 'Try a different search term' : 'Add teachers to get started'}
</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                  paginatedRows.map(({ teacher, contact, qualDisplay }) => {
  const initials = teacher.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <TableRow key={teacher._id} className="hover:bg-gradient-to-r hover:from-[#1897C6]/5 hover:to-transparent transition-all border-b group">
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          {teacher.upload_photo_url ? (
            <img
              src={teacher.upload_photo_url.startsWith('http')
                ? teacher.upload_photo_url
                : `${IMAGE_BASE_URL}${teacher.upload_photo_url.startsWith('/') ? '' : '/'}${teacher.upload_photo_url}`}
              alt={teacher.full_name}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm">{teacher.full_name}</p>
            <p className="text-xs text-muted-foreground md:hidden">
              {teacher.teacher_code || teacher._id.slice(-6)}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell py-4">
        <p className="font-mono font-semibold text-sm text-[#1897C6]">
          {teacher.teacher_code || '—'}
        </p>
      </TableCell>
      <TableCell className="hidden md:table-cell py-4">
        <p className="text-sm">{contact?.email || '—'}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {contact?.mobile ? `+91 ${contact.mobile}` : '—'}
        </p>
      </TableCell>
      <TableCell className="hidden lg:table-cell py-4">
        {qualDisplay !== '—' ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 max-w-[160px] truncate">
            {qualDisplay}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/dashboard/teachers/active/${teacher._id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-[#1897C6]/10 hover:text-[#1897C6] transition-colors" title="View Details">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </Link>
          <Link href={`/dashboard/teachers/add?edit=${teacher._id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-[#F1AF37]/10 hover:text-[#F1AF37] transition-colors" title="Edit Teacher">
              <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-colors" title="Mark Inactive" onClick={() => handleArchive(teacher._id)}>
            <Archive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 pt-3 sm:pt-4 border-t">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Rows:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[65px] sm:w-[75px] h-8 sm:h-9 border-2 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-xs sm:text-sm font-medium">
  {(currentPage - 1) * itemsPerPage + 1}–
  {Math.min(currentPage * itemsPerPage, filteredRows.length)} of{' '}
  {filteredRows.length}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent hover:bg-[#1897C6]/10 hover:border-[#1897C6] disabled:opacity-50 transition-all"
                >
                  <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent hover:bg-[#1897C6]/10 hover:border-[#1897C6] disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: Math.min(totalPages <= 3 ? totalPages : 3, totalPages) },
                    (_, i) => {
                      let pageNumber: number
                      if (totalPages <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage <= 2) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 1) {
                        pageNumber = totalPages - 2 + i
                      } else {
                        pageNumber = currentPage - 1 + i
                      }
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 font-semibold text-xs sm:text-sm transition-all ${
                            currentPage === pageNumber
                              ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent shadow-md'
                              : 'bg-transparent hover:bg-[#1897C6]/10 hover:border-[#1897C6]'
                          }`}
                        >
                          {pageNumber}
                        </Button>
                      )
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent hover:bg-[#1897C6]/10 hover:border-[#1897C6] disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 bg-transparent hover:bg-[#1897C6]/10 hover:border-[#1897C6] disabled:opacity-50 transition-all"
                >
                  <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
<AlertDialogTitle>Mark Teacher as Inactive?</AlertDialogTitle>
<AlertDialogDescription>
  This teacher will be moved to the inactive list and will no longer appear
  in active teachers. All data will be preserved and can be reactivated anytime.
</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive} className="bg-orange-500 hover:bg-orange-600">
              Mark Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}