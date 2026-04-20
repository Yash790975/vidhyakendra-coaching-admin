'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  GraduationCap,
  Bell,
  UserPlus,
  AlertCircle,
  BookOpen,
  Calendar,
  Crown,
  Eye,
  Clock,
  CheckCircle2,
  RefreshCw,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { StatsCard } from '@/components/stats-card'
import { studentsApi } from '@/lib/api/students'
import { teachersApi } from '@/lib/api/teachers'
import { classesApi } from '@/lib/api/classes'
import { superAdminNoticesApi, type SuperAdminNotice } from '@/lib/api/superadmin'
import { settingsApi, getPlanName } from '@/lib/api/settings'
import { IMAGE_BASE_URL } from '@/lib/api/config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recently'
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return 'Recently'
  const diffSec = Math.floor((Date.now() - then) / 1000)
  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getInstituteId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('instituteId') ?? ''
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  pendingStudents: number
  totalTeachers: number
  activeTeachers: number
  pendingTeachers: number
  totalClasses: number
}

interface ClassWithDetails {
  _id: string
  class_name: string
  batches: string[]
  totalStudents: number
}

interface ActivityItem {
  id: string
  type: 'student' | 'teacher' | 'notice' | 'attendance'
  action: string
  name: string
  time: string
  createdAt: string
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

function StatsSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function NoticesSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ActivitySkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function ClassSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-2 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section Error ────────────────────────────────────────────────────────────

function SectionError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}

// ─── Notice Detail Modal ──────────────────────────────────────────────────────

function NoticeModal({
  notice,
  onClose,
}: {
  notice: SuperAdminNotice | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!notice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        {notice && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-2">
                {notice.isPinned && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-100 mt-0.5">
                    <Bell className="h-3 w-3 text-amber-600" />
                  </div>
                )}
                <DialogTitle className="text-base leading-snug flex-1 text-left">
                  {notice.title}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize text-xs">
                  {notice.category}
                </Badge>
                <Badge variant="secondary" className="capitalize text-xs">
                  {notice.status}
                </Badge>
                {notice.isPinned && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                    Pinned
                  </Badge>
                )}
                {notice.publishDate && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                    <Calendar className="h-3 w-3" />
                    <span suppressHydrationWarning>
                      {new Date(notice.publishDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {notice.content}
              </p>

              {/* Full description */}
              {notice.fullDescription && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t pt-4">
                  {notice.fullDescription}
                </p>
              )}

{/* Attachment */}
              {notice.docUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-blue-300 text-blue-500 hover:bg-blue-300 w-full sm:w-auto"
                  onClick={() => {
                    const rawUrl = notice.docUrl!
                    const fullUrl = /^https?:\/\//i.test(rawUrl)
                      ? rawUrl
                      : `${IMAGE_BASE_URL.replace(/\/$/, '')}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
                    const isPdf = /\.pdf(\?.*)?$/i.test(fullUrl)
                    if (isPdf) {
                      window.open(fullUrl, '_blank', 'noopener,noreferrer')
                    } else {
                      const anchor = document.createElement('a')
                      anchor.href = fullUrl
                      anchor.download = notice.title || 'attachment'
                      anchor.target = '_blank'
                      anchor.rel = 'noopener noreferrer'
                      document.body.appendChild(anchor)
                      anchor.click()
                      document.body.removeChild(anchor)
                    }
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {notice.docUrl && /\.pdf(\?.*)?$/i.test(notice.docUrl)
                    ? 'View / Download PDF'
                    : 'View Attachment'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function DashboardPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
const [adminNotices, setAdminNotices] = useState<SuperAdminNotice[]>([])
const [selectedNotice, setSelectedNotice] = useState<SuperAdminNotice | null>(null)

  const [statsLoading, setStatsLoading] = useState(true)
  const [classesLoading, setClassesLoading] = useState(true)
  const [noticesLoading, setNoticesLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)

  const [statsError, setStatsError] = useState<string | null>(null)
  const [classesError, setClassesError] = useState<string | null>(null)
  const [noticesError, setNoticesError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [planInfo, setPlanInfo] = useState<{
  plan: string
  expiryDate: string
  daysLeft: number
  isActive: boolean
} | null>(null)
const [planLoading, setPlanLoading] = useState(true)

  // ── Fetch Stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const instituteId = getInstituteId()
    if (!instituteId) {
      setStatsError('Institute session not found. Please log in again.')
      setStatsLoading(false)
      return
    }
    setStatsLoading(true)
    setStatsError(null)
    try {
      const [studentsRes, teachersRes, classesRes] = await Promise.allSettled([
        studentsApi.getAll({ institute_id: instituteId }),
        teachersApi.getAll({ instituteId }),
        classesApi.getAll({ instituteId, status: 'active' }),
      ])

      if (studentsRes.status === 'rejected') {
        console.error('[Dashboard/Stats] Students fetch failed:', studentsRes.reason)
      }
      if (teachersRes.status === 'rejected') {
        console.error('[Dashboard/Stats] Teachers fetch failed:', teachersRes.reason)
      }
      if (classesRes.status === 'rejected') {
        console.error('[Dashboard/Stats] Classes fetch failed:', classesRes.reason)
      }

      const students =
        studentsRes.status === 'fulfilled' && studentsRes.value.success
          ? (studentsRes.value.result ?? [])
          : []
      const teachers =
        teachersRes.status === 'fulfilled' && teachersRes.value.success
          ? (teachersRes.value.result ?? [])
          : []
      const classesData =
        classesRes.status === 'fulfilled' && classesRes.value.success
          ? (classesRes.value.result ?? [])
          : []

      setStats({
        totalStudents: students.length,
        activeStudents: students.filter((s) => s.status === 'active').length,
        // inactive = pending (new students start as inactive per backend)
        pendingStudents: students.filter((s) => s.status === 'inactive').length,
        totalTeachers: teachers.length,
        activeTeachers: teachers.filter((t) => t.status === 'active').length,
        pendingTeachers: teachers.filter((t) => t.status === 'onboarding').length,
        totalClasses: classesData.length,
      })
    } catch (err) {
      console.error('[Dashboard/Stats] Unexpected error:', err)
      setStatsError('Failed to load statistics. Please try again.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // ── Fetch Plan Info ─────────────────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    setPlanLoading(true)
    try {
      const data = await settingsApi.getInstituteData()
      const sub = data.subscription

      // No subscription record found
      if (!sub) {
        setPlanInfo(null)
        return
      }

      // Only show plan if payment was successful and record is active
      // Backend payment_status enum: 'success' | 'failed' | 'refunded' — 'pending' does NOT exist
      if (sub.payment_status !== 'success' || !sub.is_active) {
        setPlanInfo(null)
        return
      }

      // subscription_end_date required to compute expiry
      if (!sub.subscription_end_date) {
        setPlanInfo(null)
        return
      }

      const endDate = new Date(sub.subscription_end_date)
      const today = new Date()
      const diffMs = endDate.getTime() - today.getTime()
      const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

      // getPlanName from settings.ts — single source of truth
      // Guards against unpopulated variant ref (string vs object)
      const plan = getPlanName(sub.subscription_plan_variant_id)

      setPlanInfo({
        plan,
        expiryDate: sub.subscription_end_date,
        daysLeft,
        // isActive = payment success + is_active flag + not yet expired
        isActive: daysLeft > 0,
      })
    } catch (err) {
      console.error('[Dashboard/Plan] Fetch failed:', err)
      setPlanInfo(null)
    } finally {
      setPlanLoading(false)
    }
  }, [])

  // ── Fetch Notices ──────────────────────────────────────────────────────────
const fetchNotices = useCallback(async () => {
    setNoticesLoading(true)
    setNoticesError(null)
    try {
      const res = await superAdminNoticesApi.getPublished()
      if (res.success) {
        const sorted = (res.result ?? [])
          .slice()
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime()
          )
        console.log('[Dashboard/Notices] Super admin notices fetched. Count:', sorted.length)
        setAdminNotices(sorted.slice(0, 3))
      } else {
        console.error('[Dashboard/Notices] API returned failure:', res.message)
        setNoticesError('Could not load announcements. Please try again.')
      }
    } catch (err) {
      console.error('[Dashboard/Notices] Fetch failed:', err)
      setNoticesError('Could not load announcements. Please try again.')
    } finally {
      setNoticesLoading(false)
    }
  }, [])

  // ── Fetch Recent Activity ──────────────────────────────────────────────────
const fetchActivity = useCallback(async () => {
  const instituteId = getInstituteId()
  if (!instituteId) {
    setActivityLoading(false)
    return
  }
  setActivityLoading(true)
  setActivityError(null)
  try {
    const today = new Date().toISOString().split('T')[0]

const [studentsRes, teachersRes, noticesRes, attendanceRes] =
      await Promise.allSettled([
        studentsApi.getAll({ institute_id: instituteId }),
        teachersApi.getAll({ instituteId }),
        superAdminNoticesApi.getPublished(),
        studentsApi.getAttendanceByDate(today),
      ])

    const activityItems: ActivityItem[] = []

    // ── Teachers ─────────────────────────────────────────────────────────
    if (teachersRes.status === 'fulfilled' && teachersRes.value.success) {
      const teachers = teachersRes.value.result ?? []
      teachers
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        )
        .slice(0, 3)
        .forEach((t) => {
          activityItems.push({
            id: `teacher-${t._id}`,
            type: 'teacher',
            action:
              t.status === 'onboarding'
                ? 'Teacher registered'
                : t.status === 'active'
                ? 'Teacher activated'
                : 'Teacher added',
            name: t.full_name,
            time: timeAgo(t.createdAt),
            createdAt: t.createdAt ?? new Date().toISOString(),
          })
        })
    } else if (teachersRes.status === 'rejected') {
      console.error('[Dashboard/Activity] Teachers fetch failed:', teachersRes.reason)
    }

    // ── Students ──────────────────────────────────────────────────────────
    if (studentsRes.status === 'fulfilled' && studentsRes.value.success) {
      const students = studentsRes.value.result ?? []
      students
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        )
        .slice(0, 3)
        .forEach((s) => {
          activityItems.push({
            id: `student-${s._id}`,
            type: 'student',
            action: 'Student enrolled',
            name: s.full_name,
            time: timeAgo(s.createdAt),
            createdAt: s.createdAt ?? new Date().toISOString(),
          })
        })
    } else if (studentsRes.status === 'rejected') {
      console.error('[Dashboard/Activity] Students fetch failed:', studentsRes.reason)
    }

    // ── Notices ───────────────────────────────────────────────────────────
    if (noticesRes.status === 'fulfilled' && noticesRes.value.success) {
      const notices = noticesRes.value.result ?? []
      notices.slice(0, 2).forEach((n) => {
        activityItems.push({
          id: `notice-${n._id}`,
          type: 'notice',
          action: 'Notice published',
          name: n.title,
          time: timeAgo(n.createdAt),
          createdAt: n.createdAt ?? new Date().toISOString(),
        })
      })
    } else if (noticesRes.status === 'rejected') {
      console.error('[Dashboard/Activity] Notices fetch failed:', noticesRes.reason)
    }

    // ── Attendance (today) ────────────────────────────────────────────────
    if (attendanceRes.status === 'fulfilled' && attendanceRes.value.success) {
      const records = attendanceRes.value.result ?? []
      if (records.length > 0) {
        // Represent as a single summary activity item (most recent date)
        activityItems.push({
          id: `attendance-${today}`,
          type: 'attendance',
          action: 'Attendance marked',
          name: `${records.length} student${records.length === 1 ? '' : 's'} marked today`,
          time: 'Today',
          createdAt: new Date().toISOString(),
        })
      }
    } else if (attendanceRes.status === 'rejected') {
      console.error('[Dashboard/Activity] Attendance fetch failed:', attendanceRes.reason)
    }

    // Sort and keep top 5
    activityItems.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
   setActivities(activityItems.slice(0, 4))
  } catch (err) {
    console.error('[Dashboard/Activity] Unexpected error:', err)
    setActivityError('Could not load recent activity.')
  } finally {
    setActivityLoading(false)
  }
}, [])

  // ── Fetch Classes with sections + student counts ───────────────────────────
const fetchClasses = useCallback(async () => {
  const instituteId = getInstituteId()
  const academicYear = getCurrentAcademicYear()   
  if (!instituteId) {
    setClassesLoading(false)
    return
  }
  setClassesLoading(true)
  setClassesError(null)
  try {
    const classesRes = await classesApi.getAll({
      instituteId,
      status: 'active',
    })

    if (!classesRes.success) {
      console.error('[Dashboard/Classes] API returned failure:', classesRes.message)
      setClassesError('Could not load class list. Please try again.')
      return
    }

    const classesData = classesRes.result ?? []

    const classDetails = await Promise.all(
      classesData.map(async (cls) => {
const [batchesRes, studentMappingsRes] = await Promise.allSettled([
            classesApi.getBatchesByClass(cls._id),
            studentsApi.getStudentsByClass(cls._id),
          ])

        if (batchesRes.status === 'rejected') {
          console.error(
            `[Dashboard/Classes] Batches fetch failed for "${cls.class_name}":`,
            batchesRes.reason
          )
        }
        if (studentMappingsRes.status === 'rejected') {
          console.error(
            `[Dashboard/Classes] Student count fetch failed for "${cls.class_name}":`,
            studentMappingsRes.reason
          )
        }

        const batches =
          batchesRes.status === 'fulfilled' && batchesRes.value.success
            ? (batchesRes.value.result ?? []).map((b: { batch_name: string }) => b.batch_name)
            : []

        const allMappings =
          studentMappingsRes.status === 'fulfilled' &&
          studentMappingsRes.value.success
            ? (studentMappingsRes.value.result ?? [])
            : []
        const totalStudents = Array.isArray(allMappings)
          ? allMappings.filter(
              (m) =>
                m.status !== 'dropped' &&
                m.status !== 'completed'
            ).length
          : 0

        return {
          _id: cls._id,
          class_name: cls.class_name,
          batches,
          totalStudents,
        }
      })
    )

    setClasses(classDetails)
  } catch (err) {
    console.error('[Dashboard/Classes] Unexpected error:', err)
    setClassesError('Could not load class details. Please try again.')
  } finally {
    setClassesLoading(false)
  }
}, [])

  // ── Bootstrap all sections on mount ───────────────────────────────────────
useEffect(() => {
  fetchStats()
  fetchNotices()
  fetchActivity()
  fetchClasses()
  fetchPlan()
}, [fetchStats, fetchNotices, fetchActivity, fetchClasses, fetchPlan])

  // ── Derived values ─────────────────────────────────────────────────────────
  const pendingApprovals =
    (stats?.pendingTeachers ?? 0) + (stats?.pendingStudents ?? 0)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header with Plan Info ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Welcome back! Here&apos;s an overview of your institute
          </p>
        </div>

        {/* Premium Plan card*/}
<Card className="bg-gradient-to-br from-[#F1AF37]/10 to-[#D88931]/10 border-[#F1AF37]/20 shadow-sm w-full lg:w-auto">
  <CardContent className="p-3 sm:p-4">
    {planLoading ? (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    ) : planInfo ? (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white shadow-sm">
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{planInfo.plan}</p>
            <Badge
              variant="secondary"
              className={
                planInfo.isActive
                  ? 'bg-green-100 text-green-700 text-xs'
                  : 'bg-red-100 text-red-700 text-xs'
              }
            >
              {planInfo.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {planInfo.daysLeft > 0 ? (
              <>
                Expires in{' '}
                <span className="font-semibold text-[#D87331]">
                  {planInfo.daysLeft} days
                </span>
                <span className="hidden sm:inline"> •</span>
                <span className="block sm:inline sm:ml-1" suppressHydrationWarning>
                  {new Date(planInfo.expiryDate).toLocaleDateString('en-IN')}
                </span>
              </>
            ) : (
              <span className="font-semibold text-red-500">Plan expired</span>
            )}
          </p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white shadow-sm">
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">No active plan</p>
          <p className="text-xs text-muted-foreground">Contact support</p>
        </div>
      </div>
    )}
  </CardContent>
</Card>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────────────── */}
      {statsLoading ? (
        <StatsSkeletons />
      ) : statsError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <SectionError message={statsError} onRetry={fetchStats} />
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            color="primary"
          />
          <StatsCard
            title="Total Teachers"
            value={stats.totalTeachers}
            icon={GraduationCap}
            color="secondary"
          />
          <StatsCard
            title="Active Classes"
            value={stats.totalClasses}
            icon={BookOpen}
            color="accent"
          />
          <StatsCard
            title="Pending Approvals"
            value={pendingApprovals}
            icon={AlertCircle}
            color="warning"
          />
        </div>
      ) : null}

      {/* ── Admin Announcements ───────────────────────────────────────────── */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">
                  Admin Announcements
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                 Important updates from super admin
                </p>
              </div>
            </div>
            <Link href="/dashboard/admin-notices">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {noticesLoading ? (
            <NoticesSkeletons />
          ) : noticesError ? (
            <SectionError message={noticesError} onRetry={fetchNotices} />
          ) : adminNotices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No published announcements yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adminNotices.map((notice) => (
                <Card
                  key={notice._id}
                  className="group cursor-pointer border hover:border-[#1897C6]/50 transition-all hover:shadow-md bg-card"
                  onClick={() => setSelectedNotice(notice)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start gap-2">
                          {notice.isPinned && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-100 mt-0.5">
                              <Bell className="h-3 w-3 text-amber-600" />
                            </div>
                          )}
                          <h3 className="font-semibold text-sm sm:text-base flex-1 group-hover:text-[#1897C6] transition-colors leading-snug">
                            {notice.title}
                          </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {notice.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {notice.category}
                          </Badge>
                          {notice.docUrl && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-blue-100 text-blue-700"
                            >
                              Has attachment
                            </Badge>
                          )}
                          {notice.publishDate && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                              <Calendar className="h-3 w-3" />
                              <span suppressHydrationWarning>
                                {new Date(notice.publishDate).toLocaleDateString(
                                  'en-IN',
                                  { day: 'numeric', month: 'short' }
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Actions + Recent Activity ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/dashboard/teachers/add">
              <Card className="group cursor-pointer overflow-hidden border-2 border-transparent hover:border-[#1897C6] transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 group-hover:from-[#1897C6]/10 group-hover:to-[#67BAC3]/10 transition-all">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white shadow-lg group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base">
                        Add Teacher
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Onboard new faculty
                      </p>
                    </div>
                    <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6] group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/students/add">
              <Card className="group cursor-pointer overflow-hidden border-2 border-transparent hover:border-[#F1AF37] transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-[#F1AF37]/5 to-[#D88931]/5 group-hover:from-[#F1AF37]/10 group-hover:to-[#D88931]/10 transition-all">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base">
                        Add Student
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Enroll new student
                      </p>
                    </div>
                    <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-[#F1AF37] group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/notices/create">
              <Card className="group cursor-pointer overflow-hidden border-2 border-transparent hover:border-[#D87331] transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-[#D87331]/5 to-[#D88931]/5 group-hover:from-[#D87331]/10 group-hover:to-[#D88931]/10 transition-all">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D87331] to-[#D88931] text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base">
                        Create Notice
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Publish announcement
                      </p>
                    </div>
                    <Bell className="h-5 w-5 text-[#D87331] group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <ActivitySkeletons />
            ) : activityError ? (
              <SectionError message={activityError} onRetry={fetchActivity} />
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No recent activity found.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
<div
  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
    activity.type === 'student'
      ? 'bg-[#1897C6]/10'
      : activity.type === 'teacher'
      ? 'bg-[#F1AF37]/10'
      : activity.type === 'attendance'
      ? 'bg-green-500/10'
      : 'bg-[#D87331]/10'
  }`}
>
  {activity.type === 'student' && (
    <Users className="h-5 w-5 text-[#1897C6]" />
  )}
  {activity.type === 'teacher' && (
    <GraduationCap className="h-5 w-5 text-[#F1AF37]" />
  )}
  {activity.type === 'attendance' && (
    <CheckCircle2 className="h-5 w-5 text-green-500" />
  )}
  {activity.type === 'notice' && (
    <Bell className="h-5 w-5 text-[#D87331]" />
  )}
</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Classes Overview + Pending Approvals ──────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students by Class */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1897C6] text-white">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold">
                    Students by Class
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Class-wise student distribution
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-[#1897C6] text-[#1897C6] font-semibold"
              >
                {classesLoading ? '—' : `${classes.length} Classes`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {classesLoading ? (
              <ClassSkeletons />
            ) : classesError ? (
              <SectionError message={classesError} onRetry={fetchClasses} />
            ) : classes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No active classes found.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:transparent">
                {classes.map((cls) => (
                  <div
                    key={cls._id}
                    className="group border-2 rounded-lg p-4 hover:border-[#1897C6] hover:shadow-md transition-all bg-card"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1897C6] text-white font-bold text-[10px] text-center leading-tight p-1">
  {cls.class_name.replace(/class\s*/i, '').trim() ||
    cls.class_name}
</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground break-words">
                            {/^\d+$/.test(cls.class_name.trim())
                              ? `Class ${cls.class_name.trim()}`
                              : /^class\s+\d+$/i.test(cls.class_name.trim())
                              ? cls.class_name.trim()
                              : cls.class_name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {cls.batches.length}{' '}
                                {cls.batches.length === 1
  ? 'Batch'
  : 'Batches'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-[#1897C6]" />
                              <span className="text-xs font-semibold text-[#1897C6]">
                                {cls.totalStudents} Students
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t">
  <div className="flex items-center gap-1.5 flex-wrap">
                        {cls.batches.length > 0 ? (
                          <>
                            <span className="text-xs font-medium text-muted-foreground mr-1">
  Batches:
</span>
                            {cls.batches.map((section) => (
<div
  key={section}
  className="inline-flex items-center justify-center rounded border-2 border-muted bg-muted/50 text-xs font-semibold text-foreground group-hover:border-[#1897C6] group-hover:bg-[#1897C6] group-hover:text-white transition-all px-2 py-1 max-w-[100px] truncate"
  title={section}
>
    {section}
  </div>
))}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No sections
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/students/all?class=${cls._id}`}
                      >
                        <Button
                          size="sm"
                          className="bg-[#1897C6] hover:bg-[#1897C6]/90 text-white"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View Students
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-3 bg-gradient-to-r from-[#D87331]/5 to-[#D88931]/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#D87331] to-[#D88931] text-white shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <CardTitle className="text-base sm:text-lg">
                Pending Approvals
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-3">
              <Link href="/dashboard/teachers/onboarding">
                <Card className="group cursor-pointer border-2 border-transparent hover:border-[#F1AF37] transition-all hover:shadow-md">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white shadow-md group-hover:scale-110 transition-transform">
                        <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base">
                            Teacher Applications
                          </p>
                          <Badge className="bg-[#F1AF37] text-white border-0">
                            {statsLoading ? '—' : (stats?.pendingTeachers ?? 0)}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Waiting for your review
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#F1AF37] group-hover:translate-x-1 transition-transform hidden sm:block" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/students/onboarding">
                <Card className="group cursor-pointer border-2 border-transparent hover:border-[#1897C6] transition-all hover:shadow-md">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white shadow-md group-hover:scale-110 transition-transform">
                        <Users className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm sm:text-base">
                            Student Applications
                          </p>
                          <Badge className="bg-[#1897C6] text-white border-0">
                            {statsLoading ? '—' : (stats?.pendingStudents ?? 0)}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Waiting for your review
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1897C6] group-hover:translate-x-1 transition-transform hidden sm:block" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Notice Detail Modal ───────────────────────────────────────────── */}
      <NoticeModal
        notice={selectedNotice}
        onClose={() => setSelectedNotice(null)}
      />
    </div>
  )
}