'use client'

import React, { use, useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import { classesApi } from '@/lib/api/classes'
import { studentsApi } from '@/lib/api/students'
import type { TeacherAttendance, TeacherExperience } from '@/lib/api/teachers'
import type { ClassTeacherAssignment, ClassSubjectSchedule } from '@/lib/api/classes'
import type { StudentAttendance, StudentAcademicMapping } from '@/lib/api/students'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// ─── Pure Calculation Helpers ─────────────────────────────────────────────────

function getLastSixMonthsStart(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d
}

/** Last-6-months attendance percentage (present + half_day×0.5) */
function calcAttendancePct(records: TeacherAttendance[]): number {
  if (!records.length) return 0
  const from = getLastSixMonthsStart()
  const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
  const filtered = records.filter(r => r.date.split('T')[0] >= fromStr)
  if (!filtered.length) return 0
  const present = filtered.filter(r => r.status === 'present').length
  const halfDay = filtered.filter(r => r.status === 'half_day').length
  return Math.round(((present + halfDay * 0.5) / filtered.length) * 100)
}

/** Total experience in whole years across all entries */
function calcExperienceYears(exps: TeacherExperience[]): number {
  if (!exps.length) return 0
  let months = 0

  const parseLocalDate = (s: string): Date | null => {
    if (!s || typeof s !== 'string') return null
    // Handle both "YYYY-MM-DD" and ISO strings like "2020-06-01T00:00:00.000Z"
    const datePart = s.split('T')[0]
    const parts = datePart.split('-').map(Number)
    if (parts.length < 3 || parts.some(n => isNaN(n))) return null
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    return isNaN(d.getTime()) ? null : d
  }

  exps.forEach(e => {
    const from = e.from_date ? parseLocalDate(e.from_date) : null
    const to = e.is_current ? new Date() : e.to_date ? parseLocalDate(e.to_date) : null
    if (from && to) {
      months +=
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth())
    }
  })

  const result = Math.max(0, Math.round(months / 12))
  return isNaN(result) ? 0 : result
}

/** Maps experience years → 0–1 bonus factor */
function expToBonus(years: number): number {
  if (years >= 15) return 1.0
  if (years >= 10) return 0.85
  if (years >= 5) return 0.70
  if (years >= 3) return 0.55
  if (years >= 1) return 0.40
  return 0.25
}

/** Active schedule slots = lectures this teacher has per week (used only for performance rating) */
function calcLecturesPerWeek(schedules: ClassSubjectSchedule[]): number {
  return schedules.filter(s => s.status !== 'inactive').length
}

/**
 * Composite performance rating /5.0
 *   Attendance   40 % → max 2.00 pts
 *   Schedule load 35 % → max 1.75 pts  (≥5 slots/week = full)
 *   Experience   25 % → max 1.25 pts
 */
function calcPerformanceRating(
  attPct: number,
  schedules: ClassSubjectSchedule[],
  experiences: TeacherExperience[],
): number {
  const attScore = (attPct / 100) * 2.0
  const schedScore = Math.min(calcLecturesPerWeek(schedules) / 5, 1.0) * 1.75
  const expScore = expToBonus(calcExperienceYears(experiences)) * 1.25
  return Math.min(parseFloat((attScore + schedScore + expScore).toFixed(1)), 5.0)
}

/**
 * Proxy feedback score from student-attendance records marked by this teacher.
 * Higher student presence in teacher's classes → better implied engagement.
 */
function calcFeedbackScore(records: StudentAttendance[]): number {
  if (!records.length) return 0
  const present = records.filter(r => r.status === 'present').length
  return Math.min(parseFloat(((present / records.length) * 5).toFixed(1)), 5.0)
}

/**
 * Total unique active classes from teacher assignments (classes.ts).
 * Uses real assignment data — no estimation.
 */
function calcTotalClassesConducted(activeAssignments: ClassTeacherAssignment[]): number {
  const uniqueClassIds = new Set(
    activeAssignments
      .map(a => {
        const cid = a.class_id
        return typeof cid === 'object' && cid !== null
          ? (cid as unknown as { _id: string })._id
          : (cid as string)
      })
      .filter(Boolean),
  )
  return uniqueClassIds.size
}

// ─── Badge Factories ──────────────────────────────────────────────────────────

function getAttBadge(pct: number) {
  if (pct >= 90) return { text: 'Excellent', color: 'green' as const }
  if (pct >= 75) return { text: 'Good', color: 'teal' as const }
  return { text: 'Needs Improvement', color: 'orange' as const }
}

function getRatingBadge(r: number) {
  if (r >= 4.5) return { text: 'Outstanding', color: 'green' as const }
  if (r >= 3.5) return { text: 'Good', color: 'teal' as const }
  return { text: 'Needs Work', color: 'orange' as const }
}

function getFeedbackBadge(s: number) {
  if (s >= 4.5) return { text: 'Excellent', color: 'green' as const }
  if (s >= 4.0) return { text: 'Great', color: 'teal' as const }
  if (s >= 3.0) return { text: 'Good', color: 'teal' as const }
  return { text: 'Average', color: 'orange' as const }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="h-7 gap-1 text-rose-600 hover:bg-rose-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  )
}

function MetricCard({
  title, value, total, badgeText, badgeColor,
  barColor, subtitle, loading, error, onRetry,
}: {
  title: string
  value: number | string
  total?: number
  badgeText: string
  badgeColor: 'green' | 'orange' | 'teal'
  barColor: string
  subtitle: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}) {
  const pct =
    typeof value === 'number' && total
      ? Math.min((value / total) * 100, 100)
      : typeof value === 'number' && !total
        ? Math.min(value, 100)
        : 0

  const badgeStyles = {
    green: 'bg-green-100 text-green-700 border-green-200',
    orange: 'bg-amber-100 text-amber-700 border-amber-200',
    teal: 'bg-teal-100  text-teal-700  border-teal-200',
  }

  const valueColor =
    title === 'Attendance Rate' ? '#1897C6' :
    title === 'Performance Rating' ? '#F1AF37' :
    '#10b981'

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="h-2.5 w-full bg-gray-200 rounded-full" />
        <div className="h-3 w-48 bg-gray-200 rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
        <ErrorBanner message={error} onRetry={onRetry} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
      <p className="text-sm font-semibold text-gray-600">{title}</p>

      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-gray-900">
          {typeof value === 'number' && total ? (
            <>
              <span style={{ color: valueColor }}>{value}</span>
              <span className="text-lg font-semibold text-gray-400">/{total}</span>
            </>
          ) : (
            <span style={{ color: valueColor }}>
              {value}
              {typeof value === 'number' && !total ? '%' : ''}
            </span>
          )}
        </p>
        <Badge
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeStyles[badgeColor]}`}
        >
          {badgeText}
        </Badge>
      </div>

      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}

function TeachingStatBox({
  icon, value, label, iconBg, loading,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  iconBg: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-5 shadow-sm animate-pulse flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gray-200 shrink-0" />
        <div className="space-y-2">
          <div className="h-6 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TeacherPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: teacherId } = use(params)

  // ── State ────────────────────────────────────────────────────────────────────
  const [attendance, setAttendance] = useState<SectionState<TeacherAttendance[]>>({ data: null, loading: true, error: null })
  const [assignments, setAssignments] = useState<SectionState<ClassTeacherAssignment[]>>({ data: null, loading: true, error: null })
  const [experiences, setExperiences] = useState<SectionState<TeacherExperience[]>>({ data: null, loading: true, error: null })
  const [schedule, setSchedule] = useState<SectionState<ClassSubjectSchedule[]>>({ data: null, loading: true, error: null })
  const [studentAttendance, setStudentAttendance] = useState<SectionState<StudentAttendance[]>>({ data: null, loading: true, error: null })
  const [totalStudents, setTotalStudents] = useState<SectionState<number>>({ data: null, loading: true, error: null })

  // ── Independent Fetchers ──────────────────────────────────────────────────────

  const fetchAttendance = useCallback(async () => {
    setAttendance(p => ({ ...p, loading: true, error: null }))
    try {
      const res = await teachersApi.getAttendanceByTeacher(teacherId)
      if (!res.success) throw new Error(res.message ?? 'Failed to load attendance')
      setAttendance({ data: res.result ?? [], loading: false, error: null })
    } catch (err: unknown) {
      console.error('[TeacherPerformance] fetchAttendance error:', err)
      setAttendance({ data: null, loading: false, error: err instanceof Error ? err.message : 'Unable to load attendance' })
    }
  }, [teacherId])

  const fetchExperiences = useCallback(async () => {
    setExperiences(p => ({ ...p, loading: true, error: null }))
    try {
      const res = await teachersApi.getExperienceByTeacher(teacherId)
      if (!res.success) throw new Error(res.message ?? 'Failed to load experience')
      setExperiences({ data: res.result ?? [], loading: false, error: null })
    } catch (err: unknown) {
      setExperiences({ data: null, loading: false, error: err instanceof Error ? err.message : 'Unable to load experience' })
    }
  }, [teacherId])

  const fetchSchedule = useCallback(async () => {
    setSchedule(p => ({ ...p, loading: true, error: null }))
    try {
      const res = await classesApi.getScheduleByTeacher(teacherId)
      if (!res.success) throw new Error(res.message ?? 'Failed to load schedule')
      setSchedule({ data: res.result ?? [], loading: false, error: null })
    } catch (err: unknown) {
      setSchedule({ data: null, loading: false, error: err instanceof Error ? err.message : 'Unable to load schedule' })
    }
  }, [teacherId])

  const fetchStudentAttendance = useCallback(async () => {
    setStudentAttendance(p => ({ ...p, loading: true, error: null }))
    try {
      const res = await studentsApi.getAttendanceByTeacher(teacherId)
      if (!res.success) throw new Error(res.message ?? 'Failed to load feedback data')
      setStudentAttendance({ data: res.result ?? [], loading: false, error: null })
    } catch (err: unknown) {
      setStudentAttendance({ data: null, loading: false, error: err instanceof Error ? err.message : 'Unable to load feedback data' })
    }
  }, [teacherId])

  // ── Dependent Fetcher: total students (needs assignments first) ───────────────

  /**
   * For each unique active class_id from assignments (classes.ts),
   * fetch student mappings in parallel via students.ts,
   * then deduplicate by student_id to get the true unique count.
   */
  const fetchTotalStudents = useCallback(
    async (activeAssignments: ClassTeacherAssignment[]) => {
      setTotalStudents(p => ({ ...p, loading: true, error: null }))
      try {
        const uniqueClassIds = [
          ...new Set(
            activeAssignments
              .filter(a => a.status === 'active' && a.class_id)
              .map(a => {
                const cid = a.class_id
                return typeof cid === 'object' && cid !== null
                  ? (cid as unknown as { _id: string })._id
                  : (cid as string)
              })
              .filter(Boolean),
          ),
        ]

        if (!uniqueClassIds.length) {
          setTotalStudents({ data: 0, loading: false, error: null })
          return
        }

        // Fire all class-student fetches in parallel via students.ts; tolerate partial failures
        const results = await Promise.allSettled(
          uniqueClassIds.map(classId => studentsApi.getStudentsByClass(classId)),
        )

        const uniqueStudentIds = new Set<string>()
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value.success) {
            ;(r.value.result ?? []).forEach((m: StudentAcademicMapping) => {
              // student_id can be a string or a populated object from backend
              const sid =
                typeof m.student_id === 'object' && m.student_id !== null
                  ? (m.student_id as unknown as { _id: string })._id
                  : m.student_id
              if (sid) uniqueStudentIds.add(sid)
            })
          }
        })

        setTotalStudents({ data: uniqueStudentIds.size, loading: false, error: null })
      } catch (err: unknown) {
        setTotalStudents({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Unable to count students',
        })
      }
    },
    [],
  )

  // Uses classesApi.getTeacherAssignmentsByTeacher (classes.ts) then chains fetchTotalStudents
  const fetchAssignments = useCallback(async () => {
    setAssignments(p => ({ ...p, loading: true, error: null }))
    try {
      const res = await classesApi.getTeacherAssignmentsByTeacher(teacherId)
      if (!res.success) throw new Error(res.message ?? 'Failed to load assignments')
      const data = res.result ?? []
      setAssignments({ data, loading: false, error: null })
      // Chain: total-students depends on assignments
      await fetchTotalStudents(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load assignments'
      setAssignments({ data: null, loading: false, error: msg })
      setTotalStudents({ data: null, loading: false, error: 'Unable to load student count' })
    }
  }, [teacherId, fetchTotalStudents])

  // ── Bootstrap: run all independent fetches in parallel ───────────────────────

  useEffect(() => {
    Promise.all([
      fetchAttendance(),
      fetchAssignments(),   // internally chains fetchTotalStudents
      fetchExperiences(),
      fetchSchedule(),
      fetchStudentAttendance(),
    ])
  }, [fetchAttendance, fetchAssignments, fetchExperiences, fetchSchedule, fetchStudentAttendance])

  // ── Derived Values ────────────────────────────────────────────────────────────

  const allAttendance = attendance.data ?? []
  const scheduleData = schedule.data ?? []
  const expData = experiences.data ?? []

  // Active assignments from classes.ts (classesApi.getTeacherAssignmentsByTeacher)
  const activeAssign = assignments.data?.filter(a => a.status === 'active') ?? []

  const attPct = calcAttendancePct(allAttendance)

  // Total Classes Conducted: unique active class_ids from teacher assignments (classes.ts)
  const totalClasses = calcTotalClassesConducted(activeAssign)

  // Years of Experience: derived from experiences data (teachers.ts)
  const expYears = calcExperienceYears(expData)

  // Performance rating: composite of attendance, schedule, experience
  const perfLoading = attendance.loading || schedule.loading || experiences.loading
  const perfError = perfLoading ? null : attendance.error ?? schedule.error ?? experiences.error ?? null
  const perfRating = !perfLoading && !perfError
    ? calcPerformanceRating(attPct, scheduleData, expData)
    : null

  // Feedback score: student-attendance proxy via students.ts
  const feedbackScore = studentAttendance.data
    ? calcFeedbackScore(studentAttendance.data)
    : null

  const attB = getAttBadge(attPct)
  const perfB = perfRating !== null ? getRatingBadge(perfRating) : { text: '—', color: 'teal' as const }
  const feedB = feedbackScore !== null ? getFeedbackBadge(feedbackScore) : { text: '—', color: 'teal' as const }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-1">

      {/* ── 3 Metric Cards ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">

        {/* Card 1 — Attendance Rate */}
        <MetricCard
          title="Attendance Rate"
          value={attPct}
          badgeText={attB.text}
          badgeColor={attB.color}
          barColor="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
          subtitle="Consistent attendance over last 6 months"
          loading={attendance.loading}
          error={attendance.error}
          onRetry={fetchAttendance}
        />

        {/* Card 2 — Performance Rating (weighted composite) */}
        <MetricCard
          title="Performance Rating"
          value={perfRating ?? 0}
          total={5}
          badgeText={perfB.text}
          badgeColor={perfB.color}
          barColor="bg-gradient-to-r from-[#F1AF37] to-[#D88931]"
          subtitle="Weighted: attendance (40%), schedule (35%), experience (25%)"
          loading={perfLoading}
          error={perfError}
          onRetry={() => {
            fetchAttendance()
            fetchSchedule()
            fetchExperiences()
          }}
        />

        {/* Card 3 — Student Feedback (proxy via student attendance) */}
        {/* <MetricCard
          title="Student Feedback"
          value={feedbackScore ?? 0}
          total={5}
          badgeText={feedB.text}
          badgeColor={feedB.color}
          barColor="bg-gradient-to-r from-emerald-400 to-emerald-600"
          subtitle={`Based on ${studentAttendance.data?.length ?? 0} student attendance records`}
          loading={studentAttendance.loading}
          error={studentAttendance.error}
          onRetry={fetchStudentAttendance}
        /> */}
      </div>

      {/* ── Teaching Statistics ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50/60">
          <h3 className="text-base font-semibold text-gray-800">Teaching Statistics</h3>
        </div>

        <div className="p-5 grid gap-4 grid-cols-1 sm:grid-cols-2">

          {/* Total Classes Conducted — from classes.ts (unique active class_ids in assignments) */}
          <TeachingStatBox
            loading={assignments.loading}
            value={assignments.loading ? '—' : totalClasses}
            label="Total Classes Conducted"
            iconBg="bg-[#1897C6]/10"
            icon={
              <svg className="h-6 w-6 text-[#1897C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 3" />
              </svg>
            }
          />

          {/* Total Students Taught — from students.ts (getStudentsByClass per class) */}
          <TeachingStatBox
            loading={totalStudents.loading}
            value={
              totalStudents.loading ? '—' :
              totalStudents.error ? 'N/A' :
              (totalStudents.data ?? 0)
            }
            label="Total Students Taught"
            iconBg="bg-amber-50"
            icon={
              <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6-4a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          {/* Active Assignments — from classes.ts (getTeacherAssignmentsByTeacher, status=active) */}
          <TeachingStatBox
            loading={assignments.loading}
            value={assignments.loading ? '—' : activeAssign.length}
            label="Active Assignments"
            iconBg="bg-emerald-50"
            icon={
              <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
          />

          {/* Years of Experience — from teachers.ts (getExperienceByTeacher) */}
          <TeachingStatBox
            loading={experiences.loading}
            value={experiences.loading ? '—' : experiences.error ? 'N/A' : expYears}
            label="Years of Experience"
            iconBg="bg-purple-50"
            icon={
              <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
          />

        </div>
      </div>

    </div>
  )
}