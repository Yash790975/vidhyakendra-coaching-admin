'use client'

import React, { useEffect, useState, useCallback, use } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  User,
  Calendar,
  Briefcase,
  TrendingUp,
  Award,
  BookOpen,
  Users,
  Edit2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { teachersApi } from '@/lib/api/teachers'
import { IMAGE_BASE_URL } from '@/lib/api/config'
import type {
  Teacher,
  TeacherContact,
  TeacherAttendance,
  TeacherSalaryStructure,
} from '@/lib/api/teachers'
import { classesApi } from '@/lib/api/classes'
import type { ClassTeacherAssignment } from '@/lib/api/classes'

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',     label: 'Overview',    path: 'overview' },
  { id: 'teacher',      label: 'Teaching',    path: 'teacher' },
  { id: 'attendance',   label: 'Attendance',  path: 'attendance' },
  { id: 'performance',  label: 'Performance', path: 'performance' },
  { id: 'salary',       label: 'Salary',      path: 'salary' },
  { id: 'leave',        label: 'Leaves',      path: 'leave' },
] as const

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-all rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl text-white shadow-sm ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Layout Component ─────────────────────────────────────────────────────────

export default function ActiveTeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id: teacherId } = use(params)

  const router   = useRouter()
  const pathname = usePathname()

  // ── State ──────────────────────────────────────────────────────────────────
  const [teacher,          setTeacher]          = useState<Teacher | null>(null)
  const [contact,          setContact]          = useState<TeacherContact | null>(null)
  const [assignments,      setAssignments]      = useState<ClassTeacherAssignment[]>([])
  const [recentAttendance, setRecentAttendance] = useState<TeacherAttendance[]>([])
  const [activeSalary,     setActiveSalary]     = useState<TeacherSalaryStructure | null>(null)
  const [loadingHeader,    setLoadingHeader]    = useState(true)
  const [headerError,      setHeaderError]      = useState<string | null>(null)
  const [photoError,       setPhotoError]       = useState(false)

  // ── Active tab from URL path ───────────────────────────────────────────────
  const activeTab = TABS.find((t) => pathname?.endsWith(`/${t.path}`))?.id ?? 'overview'

  // ── Fetch all header data ──────────────────────────────────────────────────
  const fetchHeaderData = useCallback(async () => {
    if (!teacherId || teacherId === 'undefined') {
      setHeaderError('Invalid teacher ID. Please go back and try again.')
      setLoadingHeader(false)
      console.error('[ActiveTeacherLayout] Invalid teacherId:', teacherId)
      return
    }

    setLoadingHeader(true)
    setHeaderError(null)

    try {
      // 1. Teacher master — required
      const teacherRes = await teachersApi.getById(teacherId)
      if (!teacherRes.success || !teacherRes.result) {
       throw new Error('Unable to load teacher profile. Please try again.')
       
      }
    setTeacher(teacherRes.result)

      // 2. Contact — optional (404 is fine)
      try {
        const contactRes = await teachersApi.getContactByTeacher(teacherId)
        if (contactRes.success && contactRes.result) {
          setContact(contactRes.result)
        }
      } catch (e) {
        console.warn('[ActiveTeacherLayout] Contact not found, skipping:', e)
      }

      // 3. Assignments — optional
      try {
        const assignRes = await classesApi.getTeacherAssignmentsByTeacher(teacherId)
         if (assignRes.success && assignRes.result) {
          setAssignments(assignRes.result)
        }
      } catch (e) {
        console.warn('[ActiveTeacherLayout] Assignments not found, skipping:', e)
      }

      // 4. Last 30 days attendance for stat card
      try {
        const attRes = await teachersApi.getAttendanceByTeacher(teacherId)
        if (attRes.success && attRes.result) {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const filtered = attRes.result.filter(
            (r) => new Date(r.date) >= thirtyDaysAgo
          )
          setRecentAttendance(filtered)        }
      } catch (e) {
        console.warn('[ActiveTeacherLayout] Attendance fetch skipped:', e)
      }

      // 5. Active salary structure — optional
      try {
        const salRes = await teachersApi.getActiveSalaryStructureByTeacher(teacherId)
         if (salRes.success && salRes.result) {
          setActiveSalary(salRes.result)
        }
      } catch (e) {
        console.warn('[ActiveTeacherLayout] Salary fetch skipped:', e)
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load teacher data'
      setHeaderError(msg)
      console.error('Failed to load teacher header data:', err)
    } finally {
      setLoadingHeader(false)
    }
  }, [teacherId])

  useEffect(() => {
    fetchHeaderData()
  }, [fetchHeaderData])

  // ── Derived quick stats ────────────────────────────────────────────────────
  const attendancePct = (() => {
    if (!recentAttendance.length) return '—'
    const present = recentAttendance.filter(
      (a) => a.status === 'present' || a.status === 'half_day'
    ).length
    return `${((present / recentAttendance.length) * 100).toFixed(1)}%`
  })()

  const activeAssignmentsCount = assignments.filter((a) => a.status === 'active').length
  const basicSalary = activeSalary?.basic_salary
    ? `₹${activeSalary.basic_salary.toLocaleString('en-IN')}`
    : '—'

  const initials = teacher?.full_name
    ? teacher.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const handleTabChange = (tabPath: string) => {
    router.push(`/dashboard/teachers/active/${teacherId}/${tabPath}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-5">

        {/* Back */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/teachers/active">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Teachers</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

        {/* Error banner */}
        {headerError && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{headerError}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchHeaderData}
              className="h-7 text-rose-600 hover:bg-rose-100"
            >
              Retry
            </Button>
          </div>
        )}



        {/* ── Profile Card ──────────────────────────────────────────────────── */}
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            {loadingHeader ? (
              <div className="flex items-center gap-5 animate-pulse">
                <div className="h-20 w-20 rounded-2xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-200 rounded w-48" />
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Avatar */}
                <div className="flex justify-center sm:justify-start">
<div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white font-bold text-2xl sm:text-3xl shadow-md overflow-hidden">
  {teacher?.upload_photo_url && !photoError ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={teacher.upload_photo_url.startsWith('http')
        ? teacher.upload_photo_url
        : teacher.upload_photo_url.startsWith('/')
          ? `${IMAGE_BASE_URL}${teacher.upload_photo_url}`
          : `${IMAGE_BASE_URL}${teacher.upload_photo_url}`}
      alt={teacher.full_name}
      onError={() => setPhotoError(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    <span>{initials}</span>
  )}
</div> 
                </div>

                {/* Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {teacher?.full_name ?? '—'}
                      </h1>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {teacher?.employment_type
                          ? teacher.employment_type.replace(/_/g, ' ')
                          : ''}{' '}
                        Teacher
                        {contact?.email ? ` · ${contact.email}` : ''}
                      </p>
                    </div>
                    <Link href={`/dashboard/teachers/add?edit=${teacherId}`}>
                      <Button
                        size="sm"
                        className="gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:opacity-90 text-white w-full sm:w-auto shadow-sm"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit Profile
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1897C6]/10">
                        <User className="h-4 w-4 text-[#1897C6]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Teacher Code</p>
                        <p className="text-sm font-semibold font-mono text-gray-800">
                          {teacher?.teacher_code ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1AF37]/10">
                        <Calendar className="h-4 w-4 text-[#F1AF37]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Joined</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {teacher?.joining_date
                            ? new Date(teacher.joining_date).toLocaleDateString('en-IN', {
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                        <Briefcase className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Type</p>
                        <p className="text-sm font-semibold capitalize text-gray-800">
                          {teacher?.teacher_type ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Quick Stats ───────────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Attendance (30d)"
            value={loadingHeader ? '...' : attendancePct}
            icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-gradient-to-br from-[#1897C6] to-[#67BAC3]"
          />
          <StatCard
            label="Assignments"
            value={loadingHeader ? '...' : activeAssignmentsCount}
            icon={<Award className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-gradient-to-br from-[#F1AF37] to-[#D88931]"
          />
          <StatCard
            label="Basic Salary"
            value={loadingHeader ? '...' : basicSalary}
            icon={<BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-gradient-to-br from-green-400 to-green-600"
          />
          <StatCard
            label="Status"
            value={loadingHeader ? '...' : (teacher?.status
  ? teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)
  : '—')}
            icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
            color="bg-gradient-to-br from-purple-400 to-purple-600"
          />
        </div>

        {/* ── Tab Navigation — matches mock TabsList style exactly ─────────── */}
        <div className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto bg-muted rounded-lg p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.path)}
              className={`
                inline-flex items-center justify-center whitespace-nowrap rounded-md
                px-3 py-2 text-xs sm:text-sm font-medium
                ring-offset-background transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:pointer-events-none disabled:opacity-50
                ${activeTab === tab.id
                  ? 'bg-background text-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Child tab page ─────────────────────────────────────────────────── */}
        <div className="pb-6">
          {children}
        </div>

      </div>
    </div>
  )
}