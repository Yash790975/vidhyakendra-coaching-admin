'use client'

import React, { useEffect, useState, useCallback, use } from 'react'
import { School, ClipboardList, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { classesApi } from '@/lib/api/classes'
import { subjectsByClassApi } from '@/lib/api/subjects'
import type { ClassMaster } from '@/lib/api/classes'
import type { SubjectByClass } from '@/lib/api/subjects'

// ── FIX: Import AssignmentFromAPI and safeStr from the assignments folder ──
import type { AssignmentFromAPI } from './_components/assignments/types'
import { safeStr } from './_components/assignments/types'

import AssignmentsTab from './_components/assignments/AssignmentsTab'
import HomeworkTab from './_components/HomeworkTab'
import AssessmentTab from './_components/AssessmentTab'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = 'assignments' | 'homework' | 'assessment'

const SECTIONS: {
  key:       SectionKey
  label:     string
  icon:      React.ElementType
  color:     string
  text:      string
  border:    string
  iconBg:    string
  iconColor: string
}[] = [
  {
    key:       'assignments',
    label:     'Assignments',
    icon:       School,
    color:     'bg-emerald-50',
    text:      'text-emerald-700',
    border:    'border-l-emerald-600',
    iconBg:    'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    key:       'homework',
    label:     'Homework',
    icon:       ClipboardList,
    color:     'bg-orange-50',
    text:      'text-orange-700',
    border:    'border-l-orange-500',
    iconBg:    'bg-orange-100',
    iconColor: 'text-orange-500',
  },
  {
    key:       'assessment',
    label:     'Assessment',
    icon:       BookOpen,
    color:     'bg-violet-50',
    text:      'text-violet-700',
    border:    'border-l-violet-500',
    iconBg:    'bg-violet-100',
    iconColor: 'text-violet-500',
  },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="w-44 shrink-0 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="flex-1 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-24 rounded bg-muted" />
              <div className="h-6 w-20 rounded bg-muted" />
            </div>
            <div className="h-4 w-48 rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherTeachingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: teacherId } = use(params)

  const [activeSection, setActiveSection] = useState<SectionKey>('assignments')

  const [assignments, setAssignments]               = useState<AssignmentFromAPI[]>([])
  const [classList, setClassList]                   = useState<ClassMaster[]>([])
  const [subjectsByClassMap, setSubjectsByClassMap] = useState<Record<string, SubjectByClass[]>>({})
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [assignmentsError, setAssignmentsError]     = useState<string | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleClassListLoad = useCallback((list: ClassMaster[]) => {
    setClassList(list)
  }, [])

  const handleSubjectsLoad = useCallback((classId: string, subjects: SubjectByClass[]) => {
    setSubjectsByClassMap((prev) => ({ ...prev, [classId]: subjects }))
  }, [])

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true)
    setAssignmentsError(null)
    try {
      const res = await classesApi.getTeacherAssignmentsByTeacher(teacherId)
      if (!res.success) throw new Error('Unable to load teaching assignments. Please try again.')
      const list = (res.result ?? []) as AssignmentFromAPI[]
      setAssignments(list)
      console.log('[TeacherPage] Assignments loaded:', list.length)

      // Pre-fetch subjects for all unique classes in assignments
      const uniqueClassIds = [
        ...new Set(list.map((a) => safeStr(a.class_id ?? null)).filter(Boolean)),
      ]
      const map: Record<string, SubjectByClass[]> = {}
      await Promise.allSettled(
        uniqueClassIds.map(async (classId) => {
          try {
            const sRes = await subjectsByClassApi.getByClass(classId)
            if (sRes.success && sRes.result) map[classId] = sRes.result
          } catch (e) {
            console.warn('[TeacherPage] Subject fetch skipped for class:', classId, e)
          }
        }),
      )
      setSubjectsByClassMap((prev) => ({ ...prev, ...map }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load teaching assignments'
      setAssignmentsError(msg)
      console.error('[TeacherPage] fetchAssignments error:', err)
    } finally {
      setLoadingAssignments(false)
    }
  }, [teacherId])

  useEffect(() => { void fetchAssignments() }, [fetchAssignments])

  if (!mounted) return <PageSkeleton />

  const sharedProps = {
    teacherId,
    classList,
    subjectsByClassMap,
    onClassListLoad: handleClassListLoad,
    onSubjectsLoad:  handleSubjectsLoad,
  }

  const activeConfig = SECTIONS.find((s) => s.key === activeSection)!

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden sm:flex flex-col gap-2 w-44 shrink-0 sticky top-4">
        {SECTIONS.map(({ key, label, icon: Icon, color, text, border, iconBg, iconColor }) => {
          const isActive = activeSection === key
          return (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={cn(
                'group flex items-center gap-3 w-full px-3 py-3 rounded-xl border text-left transition-all duration-150',
                isActive
                  ? `${color} ${text} border-l-4 ${border} border-t-0 border-r-0 border-b-0 shadow-sm font-medium`
                  : 'bg-background text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors',
                  isActive ? `${iconBg} ${text}` : `${iconBg} ${iconColor}`,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm leading-tight">{label}</span>
            </button>
          )
        })}
      </aside>

      {/* ── Mobile tab bar ── */}
      <div className="flex sm:hidden gap-2 w-full">
        {SECTIONS.map(({ key, label, icon: Icon, color, text, iconBg }) => {
          const isActive = activeSection === key
          return (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-all',
                isActive
                  ? `${color} ${text} border-current`
                  : 'bg-background text-muted-foreground border-border',
              )}
            >
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', iconBg)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Thin colored accent bar matching active section */}
        <div
          className={cn(
            'h-0.5 w-full rounded-full mb-1 transition-colors duration-200',
            activeConfig.color.replace('bg-', 'bg-').replace('50', '400'),
          )}
        />

        {activeSection === 'assignments' && (
          <AssignmentsTab
            {...sharedProps}
            assignments={assignments}
            loading={loadingAssignments}
            error={assignmentsError}
            onRefresh={fetchAssignments}
          />
        )}
        {activeSection === 'homework' && (
          <HomeworkTab {...sharedProps} />
        )}
        {activeSection === 'assessment' && (
          <AssessmentTab {...sharedProps} />
        )}
      </div>

    </div>
  )
}