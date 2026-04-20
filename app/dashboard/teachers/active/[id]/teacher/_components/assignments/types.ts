// ─── Shared Types ─────────────────────────────────────────────────────────────

import type { ClassMaster, ClassTeacherAssignment } from '@/lib/api/classes'
import type { SubjectByClass } from '@/lib/api/subjects'

export type PopulatedObject = {
  _id?: string
  class_name?: string
  section_name?: string
  subject_name?: string
  teacher_code?: string
  full_name?: string
  [key: string]: unknown
}

/** Matches exactly what the backend returns (populated fields) */
export type AssignmentFromAPI = {
  _id?: string
  class_id: string | PopulatedObject | null
  section_id?: string | PopulatedObject | null
  subject_id?: string | PopulatedObject | null
  batch_id?: string | PopulatedObject | null
  teacher_id: string | PopulatedObject
  /** Backend enum — coaching portal uses: batch_incharge | faculty */
  role: 'class_teacher' | 'subject_teacher' | 'principal' | 'vice_principal' | 'lab_assistant' | 'batch_incharge' | 'faculty'
  academic_year: string | null
  assigned_from?: string | null
  assigned_to?: string | null
  status?: 'active' | 'inactive' | 'archived'
  archived_at?: string | null
  createdAt?: string
  updatedAt?: string
}

/** Fields editable in Edit dialog — matches what PUT /:id accepts */
export type EditAssignmentForm = {
  section_id: string
  academic_year: string
  assigned_from: string
  assigned_to: string
  status: 'active' | 'inactive' | 'archived'
}

export type AssignmentTabId = 'batch_incharge' | 'faculty'

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Safely extract string from a string | PopulatedObject | null | undefined */
export function safeStr(val: string | PopulatedObject | null | undefined): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && typeof val._id === 'string') return val._id
  return ''
}

/** Extract plain string ID from any shape (string, ObjectId, populated object) */
export function extractId(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj._id === 'string') return obj._id
  }
  return ''
}

/** Read a string key from an object safely */
export function objStr(val: unknown, key: string): string {
  if (!val || typeof val !== 'object') return ''
  const o = val as Record<string, unknown>
  return typeof o[key] === 'string' ? (o[key] as string) : ''
}

/** Convert any date value to YYYY-MM-DD for date input */
export function toDateInput(val: string | PopulatedObject | null | undefined): string {
  const s = safeStr(val ?? null)
  if (!s) return ''
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

/** Format date string for display */
export function formatDate(val: string | PopulatedObject | null | undefined): string {
  const s = safeStr(val ?? null)
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return s
  }
}

/** Resolve class display name — uses populated object first, falls back to classList lookup */
export function resolveClassName(
  classId: string | PopulatedObject | null | undefined,
  classList: ClassMaster[],
): string {
  if (classId && typeof classId === 'object' && typeof classId.class_name === 'string') {
    return classId.class_name
  }
  const id = safeStr(classId ?? null)
  return classList.find((c) => c._id === id)?.class_name ?? id
}

/** Resolve section display name — not used in coaching portal, kept for type safety */
export function resolveSectionName(sectionId: string | PopulatedObject | null | undefined): string {
  if (!sectionId) return ''
  if (typeof sectionId === 'object' && typeof sectionId.section_name === 'string') {
    return sectionId.section_name
  }
  return typeof sectionId === 'string' ? sectionId : ''
}

/** Resolve batch display name from populated object or raw string */
export function resolveBatchName(batchId: string | PopulatedObject | null | undefined): string {
  if (!batchId) return ''
  if (typeof batchId === 'object') {
    const name = objStr(batchId, 'batch_name')
    if (name) return name
  }
  return typeof batchId === 'string' ? batchId : ''
}

/** Resolve batch time string (e.g. "06:00 – 10:00") */
export function resolveBatchTime(batchId: string | PopulatedObject | null | undefined): string {
  if (!batchId || typeof batchId !== 'object') return ''
  const start = objStr(batchId, 'start_time')
  const end = objStr(batchId, 'end_time')
  if (start && end) return `${start} – ${end}`
  return ''
}

/** Resolve subject display name — uses populated object first, falls back to subjectsByClassMap lookup */
export function resolveSubjectName(
  subjectId: string | PopulatedObject | null | undefined,
  subjectsByClassMap: Record<string, SubjectByClass[]>,
  classIdStr: string,
): string {
  if (subjectId && typeof subjectId === 'object') {
    const name = objStr(subjectId, 'subject_name')
    if (name) return name
  }
  const idStr = safeStr(subjectId ?? null)
  if (!idStr) return '—'
  const subjects = subjectsByClassMap[classIdStr] ?? []
  const match = subjects.find((s) => {
    const sid =
      typeof s.subject_id === 'object'
        ? objStr(s.subject_id, '_id')
        : (s.subject_id as string | undefined) ?? ''
    return sid === idStr
  })
  if (match) {
    const name = objStr(match.subject_id, 'subject_name')
    if (name) return name
  }
  return idStr
}

/** Build subject options list from SubjectByClass array */
export function getSubjectOptions(
  subjects: SubjectByClass[],
): { id: string; name: string; key: string }[] {
  return subjects.map((s) => {
    const ref = s.subject_id
    let sid = ''
    let sname = ''
    if (ref && typeof ref === 'object') {
      sid = objStr(ref, '_id')
      sname = objStr(ref, 'subject_name') || sid
    } else if (typeof ref === 'string') {
      sid = ref
      sname = ref
    }
    return { id: sid, name: sname, key: s._id ?? sid }
  })
}

/** Human-readable role label */
export function getRoleLabel(role: AssignmentFromAPI['role']): string {
  const labels: Record<AssignmentFromAPI['role'], string> = {
    batch_incharge: 'Batch Incharge',
    faculty: 'Faculty',
    class_teacher: 'Class Teacher',
    subject_teacher: 'Subject Teacher',
    principal: 'Principal',
    vice_principal: 'Vice Principal',
    lab_assistant: 'Lab Assistant',
  }
  return labels[role] ?? role
}

/** Coaching portal roles — only these two tabs shown */
export const COACHING_ROLES: AssignmentFromAPI['role'][] = [
  'batch_incharge',
  'faculty',
]

export const ITEMS_PER_PAGE = 7