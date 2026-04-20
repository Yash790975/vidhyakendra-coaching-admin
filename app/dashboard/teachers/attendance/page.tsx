'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Calendar,
  Download,
  UserCheck,
  Clock,
  TrendingUp,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  CalendarDays,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { teachersApi, Teacher, TeacherAttendance } from '@/lib/api/teachers'

// ─── Types ─────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave'

interface DailyAttendanceRow {
  teacher: Teacher
  attendanceId?: string
  status: AttendanceStatus | null
  checkInTime: string
  checkOutTime: string
  remarks: string
}

interface AggregatedTeacherAttendance {
  teacherId: string
  teacherName: string
  teacherCode: string
  present: number
  absent: number
  halfDay: number
  leave: number
  total: number
  percentage: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)

const getPerformanceColor = (pct: number) => {
  if (pct >= 95) return 'text-green-600'
  if (pct >= 85) return 'text-blue-600'
  if (pct >= 75) return 'text-yellow-600'
  return 'text-red-600'
}

const getPerformanceStatus = (pct: number) => {
  if (pct >= 95) return 'Excellent'
  if (pct >= 85) return 'Good'
  if (pct >= 75) return 'Average'
  return 'Poor'
}

const formatDateLabel = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

const toISODate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns { from_date, to_date } for a YYYY-MM month string */
const monthRange = (year: number, month: number) => {
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  return { from_date: toISODate(from), to_date: toISODate(to) }
}

/** Returns { from_date, to_date } for an academic year string like "2024-25" */
const yearRange = (academicYear: string) => {
  const [startY] = academicYear.split('-').map(Number)
  return {
    from_date: `${startY}-04-01`,
    to_date: `${startY + 1}-03-31`
  }
}

/** Generate academic years dynamically from 2021 up to currentYear+2 */
const generateAcademicYears = (): string[] => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let y = 2021; y <= currentYear + 2; y++) {
    years.push(`${y}-${String(y + 1).slice(-2)}`)
  }
  return years.reverse()
}

/** Generate calendar years list */
const generateYears = (): number[] => {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = 2021; y <= current + 2; y++) {
    years.push(y)
  }
  return years.reverse()
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

/** Get current academic year string */
const getCurrentAcademicYear = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  // Academic year: April to March
  const startY = m >= 4 ? y : y - 1
  return `${startY}-${String(startY + 1).slice(-2)}`
}

/** Aggregate raw attendance records into per-teacher summary */
const aggregateAttendance = (
  records: TeacherAttendance[],
  teachers: Teacher[]
): AggregatedTeacherAttendance[] => {
  const map: Record<string, AggregatedTeacherAttendance> = {}

  teachers.forEach(t => {
    map[t._id] = {
      teacherId: t._id,
      teacherName: t.full_name,
      teacherCode: t.teacher_code ?? '',
      present: 0,
      absent: 0,
      halfDay: 0,
      leave: 0,
      total: 0,
      percentage: 0,
    }
  })

  records.forEach(r => {
    const tid = typeof r.teacher_id === 'object'
      ? (r.teacher_id as any)._id
      : r.teacher_id
    if (!map[tid]) return
    map[tid].total++
    if (r.status === 'present') map[tid].present++
    else if (r.status === 'absent') map[tid].absent++
    else if (r.status === 'half_day') map[tid].halfDay++
    else if (r.status === 'leave') map[tid].leave++
  })

  return Object.values(map).map(row => ({
    ...row,
    percentage: row.total > 0
      ? Math.round(((row.present + row.halfDay * 0.5) / row.total) * 100)
      : 0
  }))
}

const exportToCSV = (rows: AggregatedTeacherAttendance[], title: string) => {
  const headers = ['S.No', 'Teacher Details', 'Attendance Status', 'Check In / Out Time', 'Present', 'Absent', 'Half Day', 'Leave', 'Total Days', 'Percentage', 'Status']
  const csvRows = [
    headers.join(','),
    ...rows.map((r, i) => [
      i + 1,
      `"${r.teacherName}"`,
      r.teacherCode,
      r.present,
      r.absent,
      r.halfDay,
      r.leave,
      r.total,
      `${r.percentage}%`,
      getPerformanceStatus(r.percentage)
    ].join(','))
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// const exportDailyToCSV = (rows: DailyAttendanceRow[], date: string) => {
//   const headers = ['S.No', 'Teacher Name', 'Teacher Code', 'Status', 'Check In', 'Check Out', 'Remarks']
//   const csvRows = [
//     headers.join(','),
//     ...rows.map((r, i) => [
//       i + 1,
//       `"${r.teacher.full_name}"`,
//       r.teacher.teacher_code ?? '',
//       r.status ?? 'Unmarked',
//       r.checkInTime || '-',
//       r.checkOutTime || '-',
//       `"${r.remarks || ''}"`
//     ].join(','))
//   ]
//   const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
//   const url = URL.createObjectURL(blob)
//   const a = document.createElement('a')
//   a.href = url
//   a.download = `attendance-daily-${date}.csv`
//   a.click()
//   URL.revokeObjectURL(url)
// }

// ─── Pagination Component ───────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  startIndex: number
  endIndex: number
  onPageChange: (p: number) => void
  onItemsPerPageChange: (n: number) => void
}

const PaginationBar = ({
  currentPage, totalPages, itemsPerPage, totalItems,
  startIndex, endIndex, onPageChange, onItemsPerPageChange
}: PaginationProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Rows:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(v) => { onItemsPerPageChange(Number(v)); onPageChange(1) }}
            >
              <SelectTrigger className="w-[65px] sm:w-[75px] h-8 sm:h-9 border-2 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 10, 20, 50].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs sm:text-sm font-medium">
            {totalItems === 0 ? '0' : `${startIndex + 1}-${Math.min(endIndex, totalItems)}`} of {totalItems}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
            <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pn: number
              if (totalPages <= 3) pn = i + 1
              else if (currentPage <= 2) pn = i + 1
              else if (currentPage >= totalPages - 1) pn = totalPages - 2 + i
              else pn = currentPage - 1 + i
              return (
                <Button
                  key={pn}
                  variant={currentPage === pn ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pn)}
                  className={`h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 ${currentPage === pn ? 'bg-[#1897C6] border-[#1897C6] text-white hover:bg-[#1897C6]/90' : ''}`}
                >
                  {pn}
                </Button>
              )
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
            <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)

// ─── Feedback Modal ────────────────────────────────────────────────────────

interface FeedbackModalProps {
  open: boolean
  type: 'error' | 'success' | 'info'
  title: string
  message: string
  onClose: () => void
}

const FeedbackModal = ({ open, type, title, message, onClose }: FeedbackModalProps) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className={
          type === 'error' ? 'text-red-600' :
          type === 'success' ? 'text-green-600' :
          'text-blue-600'
        }>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={onClose} variant={type === 'error' ? 'destructive' : 'default'} className={type === 'success' ? 'bg-[#1897C6] hover:bg-[#1897C6]/90' : ''}>
          OK
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TeacherAttendancePage() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'yearly'>('monthly')

  // Daily state
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()))
  const [dailyRows, setDailyRows] = useState<DailyAttendanceRow[]>([])
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState(false)

  // Monthly state — separate month and year selects
  const [selectedMonthNum, setSelectedMonthNum] = useState(new Date().getMonth() + 1)
  const [selectedMonthYear, setSelectedMonthYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState<AggregatedTeacherAttendance[]>([])
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Yearly state — dynamic academic years
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(getCurrentAcademicYear)
  const [yearlyData, setYearlyData] = useState<AggregatedTeacherAttendance[]>([])
  const [loadingYearly, setLoadingYearly] = useState(false)

  // Teachers master list
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(7)

  // Feedback modal
  const [modal, setModal] = useState<{ open: boolean; type: 'error' | 'success' | 'info'; title: string; message: string }>({
    open: false, type: 'info', title: '', message: ''
  })

  const showModal = (type: 'error' | 'success' | 'info', title: string, message: string) => {
    setModal({ open: true, type, title, message })
  }

  // ── Load teachers on mount ─────────────────────────────────────────────
  useEffect(() => {
    const loadTeachers = async () => {
      setLoadingTeachers(true)
      try {
        const instituteId = typeof window !== 'undefined'
  ? (localStorage.getItem('instituteId') ?? '')
  : ''

const res = await teachersApi.getAll({
  status: 'active',
  ...(instituteId ? { instituteId } : {}),
})
         const list: Teacher[] = Array.isArray(res.result) ? res.result : []
        setTeachers(list)
        if (viewMode === 'monthly') void loadMonthlyAttendance(list)
        if (viewMode === 'yearly') void loadYearlyAttendance(list)
      } catch (err: any) {
        console.error('[Attendance] Failed to load teachers:', err)
        showModal('error', 'Failed to Load Teachers', err?.message ?? 'Could not fetch teacher list. Please refresh.')
      } finally {
        setLoadingTeachers(false)
      }
    }
    loadTeachers()
  }, [])

  // ── Load daily attendance ─────────────────────────────────────────────
  const loadDailyAttendance = useCallback(async () => {
    if (!teachers.length) return
    setLoadingDaily(true)
    try {
      const res = await teachersApi.getAttendanceByDate(selectedDate)
      const existingRecords: TeacherAttendance[] = Array.isArray(res.result) ? res.result : []

      const byTeacherId: Record<string, TeacherAttendance> = {}
      existingRecords.forEach(r => {
        const tid = typeof r.teacher_id === 'object'
          ? (r.teacher_id as any)._id
          : r.teacher_id
        byTeacherId[tid] = r
      })

      const rows: DailyAttendanceRow[] = teachers.map(t => {
        const existing = byTeacherId[t._id]
        return {
          teacher: t,
          attendanceId: existing?._id,
          status: existing ? (existing.status as AttendanceStatus) : null,
checkInTime: (() => {
  const val = existing?.check_in_time
  if (!val) return ''
  const iso = new Date(val)
  if (!isNaN(iso.getTime())) return iso.toTimeString().slice(0, 5)
  // fallback: parse "5:32AM" / "10:30PM" format
  const match = String(val).match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
  if (match) {
    let h = parseInt(match[1])
    const m = match[2]
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}`
  }
  return ''
})(),
checkOutTime: (() => {
  const val = existing?.check_out_time
  if (!val) return ''
  const iso = new Date(val)
  if (!isNaN(iso.getTime())) return iso.toTimeString().slice(0, 5)
  const match = String(val).match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
  if (match) {
    let h = parseInt(match[1])
    const m = match[2]
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}`
  }
  return ''
})(),
          remarks: existing?.remarks ?? '',
        }
      })
      setDailyRows(rows)
    } catch (err: any) {
      console.error('[Attendance] Failed to load daily attendance:', err)
      setDailyRows(teachers.map(t => ({
        teacher: t,
        status: null,
        checkInTime: '',
        checkOutTime: '',
        remarks: '',
      })))
    } finally {
      setLoadingDaily(false)
    }
  }, [selectedDate, teachers])

  useEffect(() => {
    if (viewMode === 'daily') loadDailyAttendance()
  }, [viewMode, selectedDate, teachers, loadDailyAttendance])

  // ── Load monthly attendance ───────────────────────────────────────────
 const loadMonthlyAttendance = useCallback(async (teacherList?: Teacher[]) => {
    const activeTeachers = teacherList ?? teachers
    if (!activeTeachers.length) return
    setLoadingMonthly(true)
    try {
      const { from_date, to_date } = monthRange(selectedMonthYear, selectedMonthNum)
      const teacherIds = activeTeachers.map(t => t._id)
      const res = await teachersApi.getAttendanceByDateRange({ from_date, to_date })
      const records: TeacherAttendance[] = (Array.isArray(res.result) ? res.result : []).filter(r => {
        const tid = typeof r.teacher_id === 'object' ? (r.teacher_id as any)._id : r.teacher_id
        return teacherIds.includes(tid)
      })
      setMonthlyData(aggregateAttendance(records, activeTeachers))
    } catch (err: any) {
      console.error('[Attendance] Failed to load monthly attendance:', err)
      showModal('error', 'Failed to Load Monthly Data', err?.message ?? 'Could not fetch monthly attendance.')
    } finally {
      setLoadingMonthly(false)
    }
  }, [selectedMonthNum, selectedMonthYear, teachers])


  useEffect(() => {
    if (viewMode === 'monthly') loadMonthlyAttendance()
  }, [viewMode, selectedMonthNum, selectedMonthYear, teachers, loadMonthlyAttendance])

  // ── Load yearly attendance ────────────────────────────────────────────
const loadYearlyAttendance = useCallback(async (teacherList?: Teacher[]) => {
    const activeTeachers = teacherList ?? teachers
    if (!activeTeachers.length) return
    setLoadingYearly(true)
    try {
      const { from_date, to_date } = yearRange(selectedAcademicYear)
      const teacherIds = activeTeachers.map(t => t._id)
      const res = await teachersApi.getAttendanceByDateRange({ from_date, to_date })
      const records: TeacherAttendance[] = (Array.isArray(res.result) ? res.result : []).filter(r => {
        const tid = typeof r.teacher_id === 'object' ? (r.teacher_id as any)._id : r.teacher_id
        return teacherIds.includes(tid)
      })
      setYearlyData(aggregateAttendance(records, activeTeachers))
    } catch (err: any) {
      console.error('[Attendance] Failed to load yearly attendance:', err)
      showModal('error', 'Failed to Load Yearly Data', err?.message ?? 'Could not fetch yearly attendance.')
    } finally {
      setLoadingYearly(false)
    }
  }, [selectedAcademicYear, teachers])


  useEffect(() => {
    if (viewMode === 'yearly') loadYearlyAttendance()
  }, [viewMode, selectedAcademicYear, teachers, loadYearlyAttendance])

  // Reset page when view changes
  useEffect(() => { setCurrentPage(1) }, [viewMode])

  // ── Mark daily attendance ─────────────────────────────────────────────
  const markAttendance = (teacherId: string, status: AttendanceStatus) => {
    setDailyRows(prev => prev.map(row =>
      row.teacher._id === teacherId
        ? { ...row, status: row.status === status ? null : status }
        : row
    ))
  }

  const markAllPresent = () => setDailyRows(prev => prev.map(r => ({ ...r, status: 'present' as AttendanceStatus })))
  const markAllAbsent = () => setDailyRows(prev => prev.map(r => ({ ...r, status: 'absent' as AttendanceStatus })))

  const getAttendanceCounts = () => {
    const present = dailyRows.filter(r => r.status === 'present').length
    const absent = dailyRows.filter(r => r.status === 'absent').length
    const halfDay = dailyRows.filter(r => r.status === 'half_day').length
    const leave = dailyRows.filter(r => r.status === 'leave').length
    const unmarked = dailyRows.filter(r => r.status === null).length
    return { present, absent, halfDay, leave, unmarked }
  }

  // ── Save attendance (create or update) ───────────────────────────────
  const saveAttendance = async () => {
    const unmarked = dailyRows.filter(r => r.status === null)
    if (unmarked.length > 0) {
      showModal('info', 'Unmarked Teachers', `${unmarked.length} teacher(s) still have no attendance marked. Please mark all before saving.`)
      return
    }

    setSavingAttendance(true)
    let successCount = 0
    let errorCount = 0

    for (const row of dailyRows) {
      if (!row.status) continue
try {
if (row.attendanceId) {
  await teachersApi.updateAttendance(row.attendanceId, {
    status: row.status!,
    check_in_time: row.checkInTime 
? new Date(`${selectedDate}T${row.checkInTime}:00`).toISOString()
: undefined,
    check_out_time: row.checkOutTime
? new Date(`${selectedDate}T${row.checkOutTime}:00`).toISOString()
: undefined,
    remarks: row.remarks || undefined,
  })
} else {
  const res = await teachersApi.createAttendance({
    teacher_id: row.teacher._id,
    date: selectedDate,
    status: row.status!,
    check_in_time: row.checkInTime 
? new Date(`${selectedDate}T${row.checkInTime}:00`).toISOString()
: undefined,
    check_out_time: row.checkOutTime
? new Date(`${selectedDate}T${row.checkOutTime}:00`).toISOString()
: undefined,
    remarks: row.remarks || undefined,
  })
    const created = res.result as TeacherAttendance
    setDailyRows(prev => prev.map(r =>
      r.teacher._id === row.teacher._id
        ? { ...r, attendanceId: created?._id }
        : r
    ))
  }
  successCount++
} catch (err: any) {
  errorCount++
  console.error(`[Attendance] Failed to save for teacher ${row.teacher.full_name}:`, err)
}
    }

    setSavingAttendance(false)

  if (errorCount === 0) {
      showModal('success', 'Attendance Saved', `Attendance saved successfully for ${successCount} teacher(s).`)
      void loadMonthlyAttendance()
      void loadYearlyAttendance()
    } else {
      showModal('error', 'Partial Save', `Saved ${successCount} records but ${errorCount} failed. Check console for details.`)
    }
  }

  // ── Pagination helpers ────────────────────────────────────────────────
  const getCurrentData = () => {
    if (viewMode === 'daily') return dailyRows
    if (viewMode === 'monthly') return monthlyData
    return yearlyData
  }

  const currentData = getCurrentData()
  const totalPages = Math.max(1, Math.ceil(currentData.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = currentData.slice(startIndex, endIndex)
  const counts = getAttendanceCounts()

  // ── Monthly summary stats ─────────────────────────────────────────────
  const monthlyStats = {
    avg: monthlyData.length
      ? Math.round(monthlyData.reduce((s, r) => s + r.percentage, 0) / monthlyData.length)
      : 0,
    excellent: monthlyData.filter(r => r.percentage >= 95).length,
    good: monthlyData.filter(r => r.percentage >= 75 && r.percentage < 95).length,
    totalDays: monthlyData.length ? Math.max(...monthlyData.map(r => r.total), 0) : 0,
  }

  // ── Yearly summary stats ──────────────────────────────────────────────
  const yearlyStats = {
    totalDays: yearlyData.length ? Math.max(...yearlyData.map(r => r.total), 0) : 0,
    avgPresent: yearlyData.length
      ? Math.round(yearlyData.reduce((s, r) => s + r.percentage, 0) / yearlyData.length)
      : 0,
    best: yearlyData.length ? Math.max(...yearlyData.map(r => r.percentage), 0) : 0,
    total: teachers.length,
  }

  const isLoading =
    (viewMode === 'daily' && (loadingTeachers || loadingDaily)) ||
    (viewMode === 'monthly' && (loadingTeachers || loadingMonthly)) ||
    (viewMode === 'yearly' && (loadingTeachers || loadingYearly))

  // ── Dynamic year/month label for monthly view ─────────────────────────
  const selectedMonthLabel = new Date(selectedMonthYear, selectedMonthNum - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">

        {/* Feedback Modal */}
        <FeedbackModal
          open={modal.open}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={() => setModal(prev => ({ ...prev, open: false }))}
        />

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link href="/dashboard/teachers/active">
            <Button variant="ghost" size="sm" className="mb-3 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Teachers
            </Button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Attendance Management</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Track and manage teacher attendance</p>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex rounded-lg border p-1 bg-muted/30">
            {(['daily', 'monthly', 'yearly'] as const).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={`${viewMode === mode ? 'bg-[#1897C6] text-white' : ''} text-xs sm:text-sm`}
              >
                {mode === 'daily' && <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />}
                {mode === 'monthly' && <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />}
                {mode === 'yearly' && <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">Academic Year {selectedAcademicYear}</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
          </div>
        )}

        {/* ── Daily View ─────────────────────────────────────────────────── */}
        {viewMode === 'daily' && !isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {/* Date Selector */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-2 block">Select Date</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1) }}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-2">{formatDateLabel(selectedDate)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <Button size="sm" className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" onClick={markAllPresent}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark All Present
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 sm:flex-none" onClick={markAllAbsent}>
                      <XCircle className="h-4 w-4 mr-1.5" />Mark All Absent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats — 5 cards: Present, Absent, Half Day, Leave, Unmarked */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {[
                { icon: CheckCircle2, label: 'Present', count: counts.present, color: 'text-green-600' },
                { icon: XCircle, label: 'Absent', count: counts.absent, color: 'text-red-600' },
                { icon: AlertCircle, label: 'Half Day', count: counts.halfDay, color: 'text-yellow-600' },
                { icon: CalendarDays, label: 'On Leave', count: counts.leave, color: 'text-purple-600' },
                { icon: Clock, label: 'Unmarked', count: counts.unmarked, color: 'text-gray-600' },
              ].map(({ icon: Icon, label, count, color }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Teacher List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Teacher Attendance — {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
            <thead className="hidden md:table-header-group">
  <tr className="border-b bg-muted/50">
    <th className="text-left p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-16">S.No</th>
    <th className="text-left p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teacher Details</th>
    <th className="text-center p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance Status</th>
    <th className="text-center p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">Check In / Out</th>
  </tr>
</thead>
                    <tbody>
                      {(paginatedData as DailyAttendanceRow[]).map((row, index) => (
                    <tr key={row.teacher._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
  {/* Mobile: full-width card layout, Desktop: normal columns */}
  <td colSpan={4} className="p-0 sm:p-0 md:hidden">
    <div className="p-3 space-y-2">
      {/* Teacher info + serial */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-5">{startIndex + index + 1}.</span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[#1897C6] text-white text-xs font-semibold">
            {getInitials(row.teacher.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{row.teacher.full_name}</p>
          <p className="text-xs text-muted-foreground">{row.teacher.teacher_code}</p>
        </div>
      </div>
      {/* Status buttons */}
      <div className="flex flex-wrap gap-1.5 pl-7">
        {(
          [
            { value: 'present', label: 'Present', icon: CheckCircle2, active: 'bg-green-600 hover:bg-green-700 text-white border-green-600', hover: 'hover:bg-green-50' },
            { value: 'absent', label: 'Absent', icon: XCircle, active: 'bg-red-600 hover:bg-red-700 text-white border-red-600', hover: 'hover:bg-red-50' },
            { value: 'half_day', label: 'Half Day', icon: AlertCircle, active: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600', hover: 'hover:bg-yellow-50' },
            { value: 'leave', label: 'Leave', icon: CalendarDays, active: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600', hover: 'hover:bg-purple-50' },
          ] as const
        ).map(({ value, label, icon: Icon, active, hover }) => (
          <Button
            key={value}
            size="sm"
            variant={row.status === value ? 'default' : 'outline'}
            className={`text-xs h-7 px-2 ${row.status === value ? active : hover}`}
            onClick={() => markAttendance(row.teacher._id, value)}
          >
            <Icon className="h-3 w-3 mr-1" />{label}
          </Button>
        ))}
      </div>
      {/* Check in/out */}
      <div className="flex items-center gap-2 pl-7">
        <Input
          type="time"
          value={row.checkInTime}
          onChange={(e) => setDailyRows(prev => prev.map(r =>
            r.teacher._id === row.teacher._id ? { ...r, checkInTime: e.target.value } : r
          ))}
          className="h-7 text-xs w-28"
        />
        <span className="text-xs text-muted-foreground">—</span>
        <Input
          type="time"
          value={row.checkOutTime}
          onChange={(e) => setDailyRows(prev => prev.map(r =>
            r.teacher._id === row.teacher._id ? { ...r, checkOutTime: e.target.value } : r
          ))}
          className="h-7 text-xs w-28"
        />
      </div>
    </div>
  </td>
  {/* Desktop columns — hidden on mobile */}
  <td className="hidden md:table-cell p-3 sm:p-4">
    <p className="text-sm font-medium text-muted-foreground">{startIndex + index + 1}</p>
  </td>
  <td className="hidden md:table-cell p-3 sm:p-4">
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
        <AvatarFallback className="bg-[#1897C6] text-white text-xs font-semibold">
          {getInitials(row.teacher.full_name)}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-sm">{row.teacher.full_name}</p>
        <p className="text-xs text-muted-foreground">{row.teacher.teacher_code}</p>
      </div>
    </div>
  </td>
  <td className="hidden md:table-cell p-3 sm:p-4">
    <div className="flex flex-wrap justify-center gap-2">
      {(
        [
          { value: 'present', label: 'Present', icon: CheckCircle2, active: 'bg-green-600 hover:bg-green-700 text-white border-green-600', hover: 'hover:bg-green-300' },
          { value: 'absent', label: 'Absent', icon: XCircle, active: 'bg-red-600 hover:bg-red-700 text-white border-red-600', hover: 'hover:bg-red-300' },
          { value: 'half_day', label: 'Half Day', icon: AlertCircle, active: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600', hover: 'hover:bg-yellow-300' },
          { value: 'leave', label: 'Leave', icon: CalendarDays, active: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600', hover: 'hover:bg-purple-300' },
        ] as const
      ).map(({ value, label, icon: Icon, active, hover }) => (
        <Button
          key={value}
          size="sm"
          variant={row.status === value ? 'default' : 'outline'}
          className={`text-xs ${row.status === value ? active : hover}`}
          onClick={() => markAttendance(row.teacher._id, value)}
        >
          <Icon className="h-3 w-3 mr-1" />{label}
        </Button>
      ))}
    </div>
  </td>
  <td className="hidden md:table-cell p-2 sm:p-3 w-32">
    <div className="flex flex-col gap-1 items-center">
      <Input
        type="time"
        value={row.checkInTime}
        onChange={(e) => setDailyRows(prev => prev.map(r =>
          r.teacher._id === row.teacher._id ? { ...r, checkInTime: e.target.value } : r
        ))}
        className="h-7 text-xs w-full max-w-[110px]"
      />
      <Input
        type="time"
        value={row.checkOutTime}
        onChange={(e) => setDailyRows(prev => prev.map(r =>
          r.teacher._id === row.teacher._id ? { ...r, checkOutTime: e.target.value } : r
        ))}
        className="h-7 text-xs w-full max-w-[110px]"
      />
    </div>
  </td>
</tr>
                      ))}
                      {dailyRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
                            No teachers found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {counts.unmarked > 0 && (
                  <div className="p-4 border-t bg-yellow-50">
                    <p className="text-sm text-yellow-800 text-center">
                      ⚠️ {counts.unmarked} teacher(s) pending attendance
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {dailyRows.length > 7 && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={dailyRows.length}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                className="bg-[#1897C6] hover:bg-[#1897C6]/90 w-full sm:w-auto"
                onClick={saveAttendance}
                disabled={savingAttendance}
              >
                {savingAttendance ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {savingAttendance ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        )}

        {/* ── Monthly View ───────────────────────────────────────────────── */}
        {viewMode === 'monthly' && !isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {/* Month + Year Selector */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">Select Month</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedMonthNum.toString()}
                        onValueChange={(v) => { setSelectedMonthNum(Number(v)); setCurrentPage(1) }}
                      >
                        <SelectTrigger className="w-[140px] border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => (
                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedMonthYear.toString()}
                        onValueChange={(v) => { setSelectedMonthYear(Number(v)); setCurrentPage(1) }}
                      >
                        <SelectTrigger className="w-[100px] border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {generateYears().map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="bg-[#1897C6] hover:bg-[#1897C6]/90 w-full sm:w-auto"
                    onClick={() => exportToCSV(monthlyData, `attendance-monthly-${selectedMonthYear}-${selectedMonthNum}`)}
                    disabled={monthlyData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Avg. Attendance</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#1897C6]">{monthlyStats.avg}%</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Excellent (95%+)</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{monthlyStats.excellent}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Good (75-94%)</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{monthlyStats.good}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Total Days</p>
                <p className="text-2xl sm:text-3xl font-bold">{monthlyStats.totalDays}</p>
              </CardContent></Card>
            </div>

            {/* Monthly Report Table */}
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Monthly Attendance Report</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{selectedMonthLabel}</p>
                  </div>
                  <Badge variant="secondary">{monthlyData.length} Teachers</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {['Teacher', 'Present', 'Absent', 'Half Day', 'Leave', 'Total Days', 'Percentage', 'Status'].map(h => (
                          <th key={h} className={`p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${h === 'Teacher' ? 'text-left' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No attendance data for this month</td>
                        </tr>
                      ) : (paginatedData as AggregatedTeacherAttendance[]).map((row) => (
                        <tr key={row.teacherId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-[#1897C6] text-white text-xs font-semibold">
                                  {getInitials(row.teacherName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm">{row.teacherName}</p>
                                <p className="text-xs text-muted-foreground">{row.teacherCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{row.present}</Badge>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{row.absent}</Badge>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{row.halfDay}</Badge>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{row.leave}</Badge>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <span className="text-sm font-semibold">{row.total}</span>
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-bold ${getPerformanceColor(row.percentage)}`}>{row.percentage}%</span>
                              <Progress value={row.percentage} className="h-1.5 w-16" />
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <Badge variant="outline" className={
                              row.percentage >= 95 ? 'bg-green-50 text-green-700 border-green-200' :
                              row.percentage >= 85 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              row.percentage >= 75 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }>
                              {getPerformanceStatus(row.percentage)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {monthlyData.length > 7 && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={monthlyData.length}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        )}

        {/* ── Yearly View ────────────────────────────────────────────────── */}
        {viewMode === 'yearly' && !isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {/* Year Selector */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold mb-1">Academic Year {selectedAcademicYear}</h3>
                      <p className="text-sm text-muted-foreground">Complete yearly attendance overview</p>
                    </div>
                    <Button
                      className="bg-[#1897C6] hover:bg-[#1897C6]/90 w-full sm:w-auto"
                      onClick={() => exportToCSV(yearlyData, `attendance-yearly-${selectedAcademicYear}`)}
                      disabled={yearlyData.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Yearly Report
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Select Year:</Label>
                    <Select
                      value={selectedAcademicYear}
                      onValueChange={(v) => { setSelectedAcademicYear(v); setCurrentPage(1) }}
                    >
                      <SelectTrigger className="w-[140px] sm:w-[160px] border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generateAcademicYears().map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yearly Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Total Days</p>
                <p className="text-2xl sm:text-3xl font-bold">{yearlyStats.totalDays}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Avg. Present</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{yearlyStats.avgPresent}%</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Best Performance</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#1897C6]">{yearlyStats.best}%</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Total Teachers</p>
                <p className="text-2xl sm:text-3xl font-bold">{yearlyStats.total}</p>
              </CardContent></Card>
            </div>

            {/* Yearly Report Table */}
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-base sm:text-lg">Yearly Attendance Report</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Academic Year {selectedAcademicYear} • Complete Overview</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {['S.No', 'Teacher', 'Present', 'Absent', 'Half Day', 'Leave', 'Total Days', 'Percentage'].map(h => (
                          <th key={h} className={`p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${h === 'Teacher' ? 'text-left' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No attendance data for this year</td>
                        </tr>
                      ) : (paginatedData as AggregatedTeacherAttendance[]).map((row, index) => (
                        <tr key={row.teacherId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-3 sm:p-4">
                            <p className="text-sm font-medium text-muted-foreground">{startIndex + index + 1}</p>
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-[#1897C6] text-white text-xs font-semibold">
                                  {getInitials(row.teacherName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm">{row.teacherName}</p>
                                <p className="text-xs text-muted-foreground">{row.teacherCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <span className="text-sm font-semibold text-green-600">{row.present}</span>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <span className="text-sm font-semibold text-red-600">{row.absent}</span>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <span className="text-sm font-semibold text-yellow-600">{row.halfDay}</span>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <span className="text-sm font-semibold text-purple-600">{row.leave}</span>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <span className="text-sm font-semibold">{row.total}</span>
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex flex-col items-center gap-2">
                              <span className={`text-base font-bold ${getPerformanceColor(row.percentage)}`}>{row.percentage}%</span>
                              <Progress value={row.percentage} className="h-2 w-20" />
                              <Badge variant="outline" className={
                                row.percentage >= 95 ? 'bg-green-50 text-green-700 border-green-200' :
                                row.percentage >= 85 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                row.percentage >= 75 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }>
                                {getPerformanceStatus(row.percentage)}
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {yearlyData.length > 7 && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={yearlyData.length}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}