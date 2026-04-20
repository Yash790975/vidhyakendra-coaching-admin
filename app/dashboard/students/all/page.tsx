'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Search, Plus, Eye, Edit, Download, Users, Calendar, TrendingUp,
  BookOpen, Phone, Mail, MapPin, User as UserIcon, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { StatsCard } from '@/components/stats-card'
import {
  studentsApi,
  type Student,
  type StudentContact,
  type StudentAddress,
  type StudentGuardian,
  type StudentAcademicMapping,
} from '@/lib/api/students'
import {
  classesApi,
  type ClassMaster,
} from '@/lib/api/classes'
import { IMAGE_BASE_URL } from '@/lib/api/config'


// ─── Types ─────────────────────────────────────────────────────────────────────

type StudentRow = Student & {
  mobile?: string
  email?: string
  current_address?: string
  city?: string
  state?: string
  pincode?: string
  guardian_name?: string
  guardian_mobile?: string
  father_name?: string
  mother_name?: string
  // raw IDs from mapping
  class_id?: string | null
  batch_id?: string | null
  // resolved names
  class_name?: string
  batch_name?: string
  roll_number?: string
  academic_year?: string
  photo_url?: string | null // ✅ student photo
}

// ─── Component ──────────────────────────────────────────────────────────────────

function buildFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
  return `${base}${path}`
}

function AllStudentsContent() {
  const searchParams = useSearchParams()

  // ── Filters & Pagination ──
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClassId, setFilterClassId] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // ── Dialog State ──
  const [viewStudent] = useState<StudentRow | null>(null)
  const [deactivateStudentId, setDeactivateStudentId] = useState<string | null>(null)

  // ── API State ──
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classes, setClasses] = useState<ClassMaster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalActive: 0,
    presentToday: 0,
    averageAttendance: 0,
    topPerformers: 0,
  })

  // ── Pre-select class/section from URL params ──
  useEffect(() => {
    const classId = searchParams?.get('class_id')
    if (classId) setFilterClassId(classId)
  }, [searchParams])

  // ── Fetch Classes for filter dropdowns ──
  useEffect(() => {
    const instituteId =
      typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''
    classesApi
      .getAll({ instituteId: instituteId || undefined, status: 'active' })
      .then((res) => {
        if (res.success && Array.isArray(res.result)) setClasses(res.result)
      })
      .catch((err) => console.error('[AllStudents] Failed to fetch classes:', err))
  }, [])


  // ── Fetch Students ────────────────────────────────────────────────────────────
const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const instituteId =
        typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''

      console.log('[AllStudents] Fetching students for instituteId:', instituteId)

      const res = await studentsApi.getAll({
        institute_id: instituteId || undefined,
        status: 'active',
      })

      const rawList: Student[] = Array.isArray(res?.result) ? res.result : []

      console.log('[AllStudents] Total students fetched:', rawList.length)

      if (rawList.length === 0) {
        setStudents([])
        setStats({ totalActive: 0, presentToday: 0, averageAttendance: 0, topPerformers: 0 })
        return
      }

      // All Students = only those whose status is 'active' (approved by admin)
      const enrolledStudents = rawList.filter(s => s.status === 'active')
      console.log('[AllStudents] Total fetched:', rawList.length, '| Active (enrolled):', enrolledStudents.length)

      if (enrolledStudents.length === 0) {
        setStudents([])
        setStats({ totalActive: 0, presentToday: 0, averageAttendance: 0, topPerformers: 0 })
        return
      }

      // Enrich each student with contact, address, guardian, mapping in parallel
      const enriched = await Promise.all(
        enrolledStudents.map(async (student): Promise<StudentRow> => {
          const id = student._id

            const [contactRes, addressRes, guardianRes, mappingRes, identityDocsRes] = await Promise.allSettled([
            studentsApi.getPrimaryContactByStudent(id),
            studentsApi.getAddressesByStudent(id),
            studentsApi.getGuardiansByStudent(id),
            studentsApi.getActiveAcademicMappingByStudent(id),
            studentsApi.getIdentityDocumentsByStudent(id), // ✅ photo 
          ])

          // Contact
          const contact: StudentContact | null =
            contactRes.status === 'fulfilled'
              ? ((contactRes.value as any)?.result ?? null)
              : null

          // Addresses — find current
          const addressList: StudentAddress[] =
            addressRes.status === 'fulfilled'
              ? ((addressRes.value as any)?.result ?? [])
              : []
          const currentAddr = Array.isArray(addressList)
            ? addressList.find((a) => a.address_type === 'current')
            : undefined

          // Guardians
          const guardianList: StudentGuardian[] =
            guardianRes.status === 'fulfilled'
              ? Array.isArray((guardianRes.value as any)?.result)
                ? (guardianRes.value as any).result
                : []
              : []
          const primaryGuardian =
            guardianList.find((g) => g.is_primary) ?? guardianList[0] ?? null
          const father = guardianList.find((g) => g.relation === 'father')
          const mother = guardianList.find((g) => g.relation === 'mother')

          // Academic Mapping
const mappingRaw =
  mappingRes.status === 'fulfilled'
    ? ((mappingRes.value as any)?.result ?? null)
    : null
const mapping: StudentAcademicMapping | null = Array.isArray(mappingRaw)
  ? (mappingRaw[0] ?? null)
  : mappingRaw

          // Resolve class name and batch name
          let class_name: string | undefined
          let batch_name: string | undefined

        if (mapping?.class_id) {
  if (typeof mapping.class_id === 'object' && mapping.class_id !== null) {
    class_name = (mapping.class_id as any).class_name
  } else {
    try {
      const classRes = await classesApi.getById(mapping.class_id as string)
      if (classRes.success && classRes.result) {
        class_name = classRes.result.class_name
      }
    } catch (e) {
      console.warn(`[AllStudents] Could not resolve class_id: ${mapping.class_id}`)
    }
  }
}

    // Resolve batch name
        if (mapping?.batch_id) {
          if (typeof mapping.batch_id === 'object' && mapping.batch_id !== null) {
            batch_name = (mapping.batch_id as any).batch_name
          } else {
            try {
              const batRes = await classesApi.getBatchById(mapping.batch_id as string)
              if (batRes.success && batRes.result) {
                batch_name = batRes.result.batch_name
              }
            } catch (e) {
              console.warn(`[AllStudents] Could not resolve batch_id: ${mapping.batch_id}`)
            }
          }
        }


       // Photo URL
          const identityDocs =
            identityDocsRes.status === 'fulfilled'
              ? ((identityDocsRes.value as any)?.result ?? [])
              : []
          const photoDoc = Array.isArray(identityDocs)
            ? identityDocs.find(
                (d: any) => d.document_type === 'student_photo' && d.file_url
              )
            : null
          const photo_url = photoDoc ? buildFileUrl(photoDoc.file_url) : null

          console.log(
            `[AllStudents] Student: ${student.full_name} | Class: ${class_name ?? 'N/A'} | Batch: ${batch_name ?? 'N/A'} | Roll: ${mapping?.roll_number ?? 'N/A'}`
          )
          return {
            ...student,
            mobile: contact?.mobile,
            email: contact?.email ?? undefined,
            current_address: currentAddr?.address,
            city: currentAddr?.city,
            state: currentAddr?.state,
            pincode: currentAddr?.pincode,
            guardian_name: primaryGuardian?.name,
            guardian_mobile: primaryGuardian?.mobile,
            father_name: father?.name,
            mother_name: mother?.name,
            class_id: mapping?.class_id ?? null,
            batch_id: mapping?.batch_id ?? null,
            class_name,
            batch_name,
            roll_number: mapping?.roll_number ?? undefined,
            academic_year: mapping?.academic_year,
            photo_url,
          }
        })
      )

      setStudents(enriched)
      setStats({
        totalActive: enriched.length,
        presentToday: 0,
        averageAttendance: 0,
        topPerformers: 0,
      })
    } catch (err: any) {
      console.error('[AllStudents] Error fetching students:', err)
      setError(err?.message ?? 'Failed to load students. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // ── Deactivate Student ──────────────────────────────────────────────────────
  const handleDeactivateStudent = async (id: string) => {
    try {
      // Step 1: do Status inactive 
      await studentsApi.update(id, { status: 'inactive' })

      setStudents((prev) => prev.filter((s) => s._id !== id))
      setStats((prev) => ({ ...prev, totalActive: prev.totalActive - 1 }))
      setDeactivateStudentId(null)
      console.log('[AllStudents] Student deactivated + mapping removed:', id)
    } catch (err: any) {
      console.error('[AllStudents] Error deactivating student:', err)
    }
  }

  // ── CSV Export ──
  const handleExport = () => {
    const headers = ['Student Name', 'Student Code', 'Class', 'Batch', 'Roll No', 'Guardian', 'Guardian Mobile', 'Mobile', 'Status']
    const rows = filteredStudents.map((s) => [
      `"${s.full_name}"`,
      `"${s.student_code}"`,
      `"${s.class_name ?? ''}"`,
      `"${s.batch_name ?? ''}"`,
      `"${s.roll_number ?? ''}"`,
      `"${s.guardian_name ?? ''}"`,
      `"${s.guardian_mobile ?? ''}"`,
      `"${s.mobile ?? ''}"`,
      `"${s.status}"`,
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    console.log('[AllStudents] CSV exported')
  }

  // ── Filter & Paginate ───────────────────────────────────────────────────────
  const filteredStudents = students.filter((student) => {
    const name = student.full_name?.toLowerCase() ?? ''
    const code = student.student_code?.toLowerCase() ?? ''
    const query = searchQuery.toLowerCase()

    const matchesSearch = name.includes(query) || code.includes(query)
const studentClassId = typeof student.class_id === 'object' && student.class_id !== null
  ? (student.class_id as any)._id
  : student.class_id

const matchesClass = filterClassId === 'all' || studentClassId === filterClassId
    return matchesSearch && matchesClass
  })

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
            All Students
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and monitor all enrolled students
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 flex-1 sm:flex-initial"
            onClick={handleExport}
            disabled={filteredStudents.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Link href="/dashboard/students/add" className="flex-1 sm:flex-initial">
            <Button className="gap-2 w-full bg-gradient-to-r from-[#1897C6] to-[#67BAC3]">
              <Plus className="h-4 w-4" />
              <span className="sm:inline">Add Student</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Active Students" value={stats.totalActive} icon={Users} color="primary" />
        <StatsCard title="Present Today" value={stats.presentToday} icon={Calendar} color="success" />
        <StatsCard title="Average Attendance" value={`${stats.averageAttendance}%`} icon={TrendingUp} color="secondary" />
        <StatsCard title="Top Performers" value={stats.topPerformers} icon={BookOpen} color="accent" />
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <CardTitle className="text-lg sm:text-xl">Students List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {/* Class filter — real API data */}
                <Select
                  value={filterClassId}
                  onValueChange={(v) => { setFilterClassId(v); setCurrentPage(1) }}
                >
                  <SelectTrigger className="flex-1 sm:w-36">
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
              <p className="text-sm text-muted-foreground">Loading students...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm font-medium text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchStudents}>
                Retry
              </Button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block border-2 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 hover:from-[#1897C6]/5 hover:to-[#67BAC3]/5 border-b-2">
                        <TableHead className="font-semibold text-sm h-14">Student</TableHead>
                        <TableHead className="font-semibold text-sm h-14">Student Code</TableHead>
                        <TableHead className="font-semibold text-sm h-14">Class / Batch</TableHead>
                        <TableHead className="font-semibold text-sm h-14">Roll No</TableHead>
                        <TableHead className="font-semibold text-sm h-14">Guardian</TableHead>
                        <TableHead className="font-semibold text-sm h-14 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <Users className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-lg font-semibold">No students found</p>
                                <p className="text-sm text-muted-foreground">
                                  Try adjusting your search or filters
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedStudents.map((student) => (
                          <TableRow key={student._id} className="hover:bg-muted/50 transition-colors">

                    {/* Student name only */}
                            <TableCell>
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                                  {student.photo_url ? (
                                    <img
                                      src={student.photo_url}
                                      alt=""
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'
                                      }}
                                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover border-2 border-[#1897C6]/20"
                                    />
                                  ) : null}
                                  <div
                                    style={{ display: student.photo_url ? 'none' : 'flex' }}
                                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-[#1897C6] to-[#67BAC3] items-center justify-center text-white text-xs sm:text-sm font-semibold border-2 border-[#1897C6]/20"
                                  >
                                    {getInitials(student.full_name)}
                                  </div>
                                </div>
                                <p className="font-medium text-sm sm:text-base truncate max-w-[160px]">
                                  {student.full_name}
                                </p>
                              </div>
                            </TableCell>


                            {/* Student Code */}
                            <TableCell>
                              <span className="font-mono text-xs sm:text-sm">
                                {student.student_code ?? '—'}
                              </span>
                            </TableCell>

                            {/* Class / Section — resolved names */}
                            <TableCell>
                              {student.class_name ? (
                                <Badge variant="outline" className="text-xs">
                                  {student.class_name}
                                  {student.batch_name ? ` / ${student.batch_name}` : ''}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not assigned</span>
                              )}
                            </TableCell>

                            {/* Roll No */}
                            <TableCell>
                              <span className="text-sm">{student.roll_number ?? '—'}</span>
                            </TableCell>

                            {/* Guardian */}
                            <TableCell>
                              <div className="text-xs sm:text-sm">
                                <p className="font-medium truncate max-w-[150px]">
                                  {student.guardian_name ?? '—'}
                                </p>
                                <p className="text-muted-foreground truncate max-w-[150px]">
                                  {student.guardian_mobile ?? ''}
                                </p>
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                              <Link href={`/dashboard/students/all/${student._id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="View Details"
                                  >
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
                                  onClick={() => setDeactivateStudentId(student._id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Deactivate"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {paginatedStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Users className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No students found</p>
                  </div>
                ) : (
                  paginatedStudents.map((student) => (
                    <Card key={student._id} className="border-2 hover:border-[#1897C6]/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0">
                            {student.photo_url ? (
                              <img
                                src={student.photo_url}
                                alt=""
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'
                                }}
                                className="h-12 w-12 rounded-full object-cover border-2 border-[#1897C6]/20"
                              />
                            ) : null}
                            <div
                              style={{ display: student.photo_url ? 'none' : 'flex' }}
                              className="h-12 w-12 rounded-full bg-gradient-to-br from-[#1897C6] to-[#67BAC3] items-center justify-center text-white font-semibold border-2 border-[#1897C6]/20"
                            >
                              {getInitials(student.full_name)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <h3 className="font-semibold text-base leading-tight">{student.full_name}</h3>
                              <p className="text-xs text-muted-foreground font-mono">{student.student_code ?? '—'}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {student.class_name && (
                                <Badge variant="outline" className="text-xs">
                                  {student.class_name}{student.batch_name ? ` / ${student.batch_name}` : ''}
                                </Badge>
                              )}
                              {student.roll_number && (
                                <Badge variant="outline" className="text-xs">Roll: {student.roll_number}</Badge>
                              )}
                            </div>
                            {student.guardian_name && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users className="h-3 w-3 shrink-0" />
                                <span className="truncate">{student.guardian_name}</span>
                                {student.guardian_mobile && (
                                  <span className="shrink-0">• {student.guardian_mobile}</span>
                                )}
                              </div>
                            )}
                            <div className="flex gap-1 pt-1">
                       <Link href={`/dashboard/students/all/${student._id}`} className="flex-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Link href={`/dashboard/students/add?edit=${student._id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeactivateStudentId(student._id)}
                                className="h-8 px-2 text-red-600 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredStudents.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 pt-3 sm:pt-4 border-t mt-4">
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">Rows:</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1) }}
                      >
                        <SelectTrigger className="w-[65px] sm:w-[75px] h-8 sm:h-9 border-2 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 20, 50, 100].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-xs sm:text-sm font-medium">
                      {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 sm:h-9 px-2 sm:px-3 border-2 gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline text-sm">Previous</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let page: number
                        if (totalPages <= 3) page = i + 1
                        else if (currentPage <= 2) page = i + 1
                        else if (currentPage >= totalPages - 1) page = totalPages - 2 + i
                        else page = currentPage - 1 + i
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 font-semibold text-xs sm:text-sm transition-all ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent shadow-md'
                                : 'hover:bg-[#1897C6]/10 hover:border-[#1897C6]'
                            }`}
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 sm:h-9 px-2 sm:px-3 border-2 gap-1"
                    >
                      <span className="hidden sm:inline text-sm">Next</span>
                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2"
                    >
                      <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Deactivate Confirmation Dialog ── */}
      <Dialog open={!!deactivateStudentId} onOpenChange={() => setDeactivateStudentId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this student? Their status will be set to inactive.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeactivateStudentId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deactivateStudentId && handleDeactivateStudent(deactivateStudentId)}
            >
              <X className="h-4 w-4 mr-2" />
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Page Export ────────────────────────────────────────────────────────────────

export default function AllStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
            <p className="text-sm text-muted-foreground">Loading students...</p>
          </div>
        </div>
      }
    >
      <AllStudentsContent />
    </Suspense>
  )
}
