'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen, Users, Award, TrendingUp, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { StatsCard } from '@/components/stats-card'
import { Pagination } from '@/components/pagination'
import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'
import { studentsApi } from '@/lib/api/students'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassWithBatches {
  class: ClassMaster
  batches: CoachingBatch[]
  studentCount: number
  attendancePct: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassWiseStudentsPage() {
   const [classData, setClassData] = useState<ClassWithBatches[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('all')
const [currentPage, setCurrentPage] = useState(1)
const PAGE_SIZE = 6

  // ── Fetch all classes + sections + student counts + attendance ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const instituteId =
        typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''
      const classRes = await classesApi.getAll({
        instituteId: instituteId || undefined,
        status: 'active',
      })

      if (!classRes.success || !Array.isArray(classRes.result)) {
        setError('Unable to load classes. Please check your connection or try again.')
        return
      }

      const classes: ClassMaster[] = classRes.result

      const enriched = await Promise.all(
        classes.map(async (cls): Promise<ClassWithBatches> => {
          const [batchesRes, studentsRes, attendanceRes] = await Promise.allSettled([
            classesApi.getBatchesByClass(cls._id),
            studentsApi.getStudentsByClass(cls._id),
            studentsApi.getAttendanceByClass(cls._id),
          ])

          const batches: CoachingBatch[] =
            batchesRes.status === 'fulfilled' && batchesRes.value.success
              ? Array.isArray(batchesRes.value.result)
                ? batchesRes.value.result
                : []
              : []

          const studentCount =
            studentsRes.status === 'fulfilled' && studentsRes.value.success
              ? Array.isArray(studentsRes.value.result)
                ? studentsRes.value.result.length
                : studentsRes.value.result
                ? 1
                : 0
              : 0

          const attendanceRecords =
            attendanceRes.status === 'fulfilled' && attendanceRes.value.success
              ? Array.isArray(attendanceRes.value.result)
                ? attendanceRes.value.result
                : []
              : []

          const presentCount = attendanceRecords.filter(
            (r: any) => r.status === 'present'
          ).length

          const attendancePct =
            attendanceRecords.length > 0
              ? Math.round((presentCount / attendanceRecords.length) * 100)
              : 0

          return { class: cls, batches, studentCount, attendancePct }
        })
      )

      setClassData(enriched)
    } catch (err: any) {
      console.error('[ClassWise] Unexpected error:', err?.message || err)
      setError('Something went wrong while loading class data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Stats ──
  const totalStudents = classData.reduce((sum, c) => sum + c.studentCount, 0)
  const totalClasses = classData.length
  const totalBatches = classData.reduce((sum, c) => sum + c.batches.length, 0)
  const avgAttendance =
    classData.length > 0
      ? (classData.reduce((sum, c) => sum + c.attendancePct, 0) / classData.length).toFixed(1)
      : '0'

  // ── Filter ──
  const filteredClasses =
    selectedClassId === 'all'
      ? classData
      : classData.filter((c) => c.class._id === selectedClassId)

  const totalPages = Math.ceil(filteredClasses.length / PAGE_SIZE)
  const paginatedClasses = filteredClasses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Class-wise Students</h1>
                 <p className="text-muted-foreground">View and manage students by class and batch</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-2">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted animate-pulse shrink-0" />
                  <div className="space-y-2 min-w-0">
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-12 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading class data...</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Class-wise Students</h1>
     <p className="text-muted-foreground">View and manage students by class and batch</p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="ml-auto gap-2 bg-transparent border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class-wise Students</h1>
          <p className="text-muted-foreground">View and manage students by class and section</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2 bg-transparent h-10 hidden sm:flex"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard/students/add" className="flex-1 sm:flex-none">
            <Button className="gap-2 bg-primary w-full sm:w-auto">
              Add New Student
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          color="primary"
        />
        <StatsCard
          title="Total Classes"
          value={totalClasses}
          icon={BookOpen}
          color="secondary"
        />
        <StatsCard
          title="Total Batches"
          value={totalBatches}
          icon={Award}
          color="accent"
        />
        <StatsCard
          title="Avg Attendance"
          value={`${avgAttendance}%`}
          icon={TrendingUp}
          color="success"
        />
      </div>

      {/* ── Class Cards ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Classes</CardTitle>
             <CardDescription>Select a class to view batch-wise breakdown</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={selectedClassId} onValueChange={(val) => { setSelectedClassId(val); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classData.map((c) => (
                    <SelectItem key={c.class._id} value={c.class._id}>
                      {c.class.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold">No classes found</p>
              <p className="text-sm text-muted-foreground text-center">
                No active classes are available for this institute.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedClasses.map(({ class: cls, batches, studentCount, attendancePct }) => (
                <Card
                  key={cls._id}
                  className="border-2 hover:border-primary transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg truncate">{cls.class_name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0 text-xs">{studentCount} Students</Badge>
                    </div>
                         <CardDescription className="text-xs sm:text-sm">
                      {batches.length} Batch{batches.length !== 1 ? 'es' : ''}
                      {attendancePct > 0 ? ` • ${attendancePct}% Attendance` : ''}
                    </CardDescription>            </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                  <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
  {batches.length > 0 ? (
    batches.map((batch) => (
      <Link
        key={batch._id ?? batch.batch_name}
        href={`/dashboard/students/all?class_id=${cls._id}${batch._id ? `&batch_id=${batch._id}` : ''}`}
        className="flex items-center justify-between px-3 py-2 rounded-md border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/40 transition-colors group"
      >
        <span className="text-xs font-medium truncate max-w-[60%] group-hover:text-primary">
          {batch.batch_name}
        </span>
        {batch.start_time && batch.end_time ? (
          <span className="text-xs text-muted-foreground shrink-0 group-hover:text-primary/70">
            {batch.start_time}–{batch.end_time}
          </span>
        ) : null}
      </Link>
    ))
  ) : (
    <p className="text-xs text-muted-foreground py-2">No batches added yet</p>
  )}
</div>

                      <Link href={`/dashboard/students/all?class_id=${cls._id}`}>
                        <Button variant="outline" className="w-full mt-3 sm:mt-4 bg-transparent text-sm">
                          View All Students
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
