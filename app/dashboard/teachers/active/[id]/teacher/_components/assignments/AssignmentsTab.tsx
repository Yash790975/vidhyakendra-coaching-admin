'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  BookMarked, BookOpen,
} from 'lucide-react'
import type { ClassMaster } from '@/lib/api/classes'
import type { SubjectByClass } from '@/lib/api/subjects'
import type { AssignmentFromAPI } from './types'
import { COACHING_ROLES } from './types'
import { ErrorBanner } from './shared-components'
import BatchInchargeTab from './BatchInchargeTab'
import FacultyTab from './FacultyTab'

// ─── Tab definition (driven by backend role enum, not hardcoded UI) ───────────

type TabId = 'batch_incharge' | 'faculty'

interface TabConfig {
  id: TabId
  label: string
  shortLabel: string
  icon: React.ReactNode
  activeClass: string
  badgeClass: string
  countFn: (all: AssignmentFromAPI[]) => number
}

const TABS: TabConfig[] = [
  {
    id: 'batch_incharge',
    label: 'Batch Incharge',
    shortLabel: 'Incharge',
    icon: <BookMarked className="h-4 w-4" />,
    activeClass: 'bg-white border-b-2 border-emerald-500 text-emerald-700',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    countFn: (all) => all.filter((a) => a.role === 'batch_incharge').length,
  },
  {
    id: 'faculty',
    label: 'Faculty',
    shortLabel: 'Faculty',
    icon: <BookOpen className="h-4 w-4" />,
    activeClass: 'bg-white border-b-2 border-[#F1AF37] text-[#D88931]',
    badgeClass: 'bg-[#F1AF37]/10 text-[#D88931]',
    countFn: (all) => all.filter((a) => a.role === 'faculty').length,
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssignmentsTabProps {
  teacherId: string
  assignments: AssignmentFromAPI[]
  classList: ClassMaster[]
  subjectsByClassMap: Record<string, SubjectByClass[]>
  loading: boolean
  error: string | null
  onRefresh: () => void
  onClassListLoad: (list: ClassMaster[]) => void
  onSubjectsLoad: (classId: string, subjects: SubjectByClass[]) => void
}
// Note: subjectsByClassMap and onSubjectsLoad are only passed to FacultyTab

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssignmentsTab({
  teacherId,
  assignments,
  classList,
  subjectsByClassMap,
  loading,
  error,
  onRefresh,
  onClassListLoad,
  onSubjectsLoad,
}: AssignmentsTabProps) {
const [activeTab, setActiveTab] = useState<TabId>('batch_incharge')

  // Pre-filter assignments per tab — child components receive only what they need
  const biAssignments = assignments.filter((a) => a.role === 'batch_incharge')
  const facultyAssignments = assignments.filter((a) => a.role === 'faculty')
  return (
    <div className="space-y-4">
      {/* Top-level error from parent (e.g. initial load failure) */}
      {error && !loading && (
        <ErrorBanner message={error} onRetry={onRefresh} />
      )}

      {/* ── Role Tabs ── */}
      <div className="rounded-xl border-2 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b bg-muted/30">
          {TABS.map((tab) => {
            const count = tab.countFn(assignments)
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors
                  ${isActive ? tab.activeClass : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
                `}
                aria-selected={isActive}
                role="tab"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span
                  className={`
                    ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold
                    ${isActive ? tab.badgeClass : 'bg-muted text-muted-foreground'}
                  `}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab panels */}
        <div className="p-3 sm:p-6" role="tabpanel">
          {activeTab === 'batch_incharge' && (
            <BatchInchargeTab
              teacherId={teacherId}
              assignments={biAssignments}
              classList={classList}
              loading={loading}
              error={null}
              onRefresh={onRefresh}
              onClassListLoad={onClassListLoad}
            />
          )}
          {activeTab === 'faculty' && (
            <FacultyTab
              teacherId={teacherId}
              assignments={facultyAssignments}
              classList={classList}
              subjectsByClassMap={subjectsByClassMap}
              loading={loading}
              error={null}
              onRefresh={onRefresh}
              onClassListLoad={onClassListLoad}
              onSubjectsLoad={onSubjectsLoad}
            />
          )}
        </div>
      </div>
    </div>
  )
}