'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  School, BookOpen, BookMarked, Plus, Trash2,
  CheckCircle, Users, Loader2, AlertCircle, Save,
} from 'lucide-react'
import {
  classesApi,
  type ClassMaster,
  type CoachingBatch,
  type ClassTeacherAssignment,
} from '@/lib/api/classes'
import { subjectsMasterApi, type SubjectMaster } from '@/lib/api/subjects'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassWithBatches extends ClassMaster {
  batches: CoachingBatch[]
}

// Subject Teaching Allocation: one subject → many (class+batch) combos
interface SubjectAllocation {
  subject_id: string
  subject_name: string
  // Each entry = one faculty record: class_id + batch_id + subject_id
  entries: { classId: string; className: string; batchId: string; batchName: string }[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClassAllocationTabProps {
  teacherId: string
  onNotify?: (n: { type: 'success' | 'error'; message: string }) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveId = (val: unknown): string => {
  if (!val) return ''
  if (typeof val === 'object' && '_id' in (val as object)) return (val as { _id: string })._id
  return val as string
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClassAllocationTab({ teacherId, onNotify }: ClassAllocationTabProps) {
  const instituteId =
    typeof window !== 'undefined' ? localStorage.getItem('instituteId') || '' : ''

  // ── Data ────────────────────────────────────────────────────────────────────
  const [classesWithBatches, setClassesWithBatches] = useState<ClassWithBatches[]>([])
  const [subjects, setSubjects] = useState<SubjectMaster[]>([])
  const [academicYear, setAcademicYear] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // ── Card 1: Class Teacher Assignment ────────────────────────────────────────
  // role = 'class_teacher' → class_id + teacher_id + academic_year (no batch, no subject)
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [ctClassId, setCtClassId] = useState('')

  // ── Card 2: Batch Incharge ───────────────────────────────────────────────────
  // role = 'batch_incharge' → class_id + batch_id + teacher_id + academic_year (no subject)
  const [isBatchIncharge, setIsBatchIncharge] = useState(false)
  const [biClassId, setBiClassId] = useState('')
  const [biBatchId, setBiBatchId] = useState('')

  // ── Card 3: Subject Teaching (Faculty) ─────────────────────────────────────
  // role = 'faculty' → class_id + batch_id + subject_id + teacher_id + academic_year
  const [subjectAllocations, setSubjectAllocations] = useState<SubjectAllocation[]>([])

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!instituteId || !teacherId) {
      setLoadError('Institute or Teacher ID is missing. Please refresh the page.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError('')
    try {
      // 1. Active coaching classes for this institute
      const classRes = await classesApi.getAll({ instituteId, status: 'active' })
      const classList: ClassMaster[] =
        classRes.success && Array.isArray(classRes.result) ? classRes.result : []

      // 2. Batches for each class in parallel
      const batchResults = await Promise.allSettled(
        classList.map(cls => classesApi.getBatchesByClass(cls._id))
      )
      const cwb: ClassWithBatches[] = classList.map((cls, i) => {
        const br = batchResults[i]
        const batches: CoachingBatch[] =
          br.status === 'fulfilled' && br.value.success && Array.isArray(br.value.result)
            ? br.value.result.filter(b => b.status === 'active')
            : []
        return { ...cls, batches }
      })
      setClassesWithBatches(cwb)

      // Derive academic year from first class
      const derivedYear = classList[0]?.academic_year || ''
      setAcademicYear(derivedYear)

      // 3. Coaching subjects for this institute
      const subjectRes = await subjectsMasterApi.getByInstituteAndType(instituteId, 'coaching')
      const subjectList: SubjectMaster[] =
        subjectRes.success && Array.isArray(subjectRes.result)
          ? subjectRes.result.filter(s => s.status === 'active')
          : []
      setSubjects(subjectList)

      // 4. Existing assignments for this teacher (scoped to current academic year)
      if (!derivedYear) {
        console.warn('[ClassAllocation] No academic year found — skipping pre-fill')
        return
      }
      const assignRes = await classesApi.getTeacherAssignmentsByTeacher(teacherId, {
        academic_year: derivedYear,
      })
      if (!assignRes.success || !Array.isArray(assignRes.result)) return

      const assignments: ClassTeacherAssignment[] = assignRes.result

      // ── Pre-fill class_teacher ──────────────────────────────────────────────
      const ctRecord = assignments.find(a => a.role === 'class_teacher')
      if (ctRecord) {
        setIsClassTeacher(true)
        setCtClassId(resolveId(ctRecord.class_id))
      }

      // ── Pre-fill batch_incharge ─────────────────────────────────────────────
      const biRecord = assignments.find(a => a.role === 'batch_incharge')
      if (biRecord) {
        setIsBatchIncharge(true)
        setBiClassId(resolveId(biRecord.class_id))
        setBiBatchId(resolveId(biRecord.batch_id))
      }

      // ── Pre-fill faculty (subject allocations) ──────────────────────────────
      const facultyRecords = assignments.filter(a => a.role === 'faculty')
      const grouped: Record<string, SubjectAllocation> = {}
      facultyRecords.forEach(a => {
        if (!a.subject_id || !a.batch_id) return
        const subjectId = resolveId(a.subject_id)
        const classId = resolveId(a.class_id)
        const batchId = resolveId(a.batch_id)
        const subj = subjectList.find(s => s._id === subjectId)
        const cls = cwb.find(c => c._id === classId)
        const batch = cls?.batches.find(b => b._id === batchId)

        if (!subj || !cls) {
          console.warn('[ClassAllocation] Pre-fill skip — subject or class not in active list:', {
            subjectId, classId,
          })
          return
        }
        if (!grouped[subjectId]) {
          grouped[subjectId] = { subject_id: subjectId, subject_name: subj.subject_name, entries: [] }
        }
        grouped[subjectId].entries.push({
          classId,
          className: cls.class_name,
          batchId,
          batchName: batch?.batch_name || batchId,
        })
      })
      setSubjectAllocations(Object.values(grouped))

    } catch (err: any) {
      console.error('[ClassAllocation] Failed to load:', err)
      setLoadError('Failed to load class data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [teacherId, instituteId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedCtClass = classesWithBatches.find(c => c._id === ctClassId)
  const selectedBiClass = classesWithBatches.find(c => c._id === biClassId)

  // ── Subject allocation helpers ───────────────────────────────────────────────
  const addSubjectAllocation = () => {
    setSubjectAllocations(prev => [
      ...prev,
      { subject_id: '', subject_name: '', entries: [] },
    ])
  }

  const removeSubjectAllocation = (index: number) => {
    setSubjectAllocations(prev => prev.filter((_, i) => i !== index))
  }

  const updateAllocationSubject = (index: number, subjectId: string) => {
    const subj = subjects.find(s => s._id === subjectId)
    if (!subj) return
    setSubjectAllocations(prev =>
      prev.map((a, i) =>
        i === index ? { ...a, subject_id: subjectId, subject_name: subj.subject_name, entries: [] } : a
      )
    )
  }

  const toggleEntry = (
    allocationIndex: number,
    cls: ClassWithBatches,
    batch: CoachingBatch
  ) => {
    const batchId = batch._id || ''
    setSubjectAllocations(prev =>
      prev.map((a, i) => {
        if (i !== allocationIndex) return a
        const exists = a.entries.some(e => e.classId === cls._id && e.batchId === batchId)
        return {
          ...a,
          entries: exists
            ? a.entries.filter(e => !(e.classId === cls._id && e.batchId === batchId))
            : [...a.entries, {
                classId: cls._id,
                className: cls.class_name,
                batchId,
                batchName: batch.batch_name,
              }],
        }
      })
    )
  }

  const isEntrySelected = (allocationIndex: number, classId: string, batchId: string) =>
    subjectAllocations[allocationIndex]?.entries.some(
      e => e.classId === classId && e.batchId === batchId
    ) || false

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!academicYear) {
      onNotify?.({ type: 'error', message: 'Academic year not found. Please refresh and try again.' })
      return
    }

    // Validate class_teacher
    if (isClassTeacher && !ctClassId) {
      onNotify?.({ type: 'error', message: 'Please select a class for Class Teacher assignment.' })
      return
    }

    // Validate batch_incharge
    if (isBatchIncharge && (!biClassId || !biBatchId)) {
      onNotify?.({ type: 'error', message: 'Please select both class and batch for Batch Incharge assignment.' })
      return
    }

    // Validate faculty entries
    for (const alloc of subjectAllocations) {
      if (alloc.subject_id && alloc.entries.length === 0) {
        onNotify?.({ type: 'error', message: `Please select at least one batch for subject "${alloc.subject_name}".` })
        return
      }
    }

    setIsSaving(true)
    try {
      // Step 1: Delete all existing assignments for this teacher in current academic year
      const existingRes = await classesApi.getTeacherAssignmentsByTeacher(teacherId, {
        academic_year: academicYear,
      })
      if (
        existingRes.success &&
        Array.isArray(existingRes.result) &&
        existingRes.result.length > 0
      ) {
        await Promise.allSettled(
          existingRes.result.map((a: ClassTeacherAssignment) => {
            const id = resolveId(a._id)
            return id ? classesApi.deleteTeacherAssignment(id) : Promise.resolve()
          })
        )
      }

      const promises: Promise<any>[] = []

      // Step 2: class_teacher → class_id + teacher_id + role + academic_year
      if (isClassTeacher && ctClassId) {
        promises.push(
          classesApi.createClassTeacher({
            teacher_id: teacherId,
            class_id: ctClassId,
            role: 'class_teacher',
            academic_year: academicYear,
          })
        )
      }

      // Step 3: batch_incharge → class_id + batch_id + teacher_id + role + academic_year
      if (isBatchIncharge && biClassId && biBatchId) {
        promises.push(
          classesApi.createBatchIncharge({
            teacher_id: teacherId,
            class_id: biClassId,
            batch_id: biBatchId,
            role: 'batch_incharge',
            academic_year: academicYear,
          })
        )
      }

      // Step 4: faculty → class_id + batch_id + subject_id + teacher_id + role + academic_year
      subjectAllocations.forEach(alloc => {
        if (!alloc.subject_id) return
        alloc.entries.forEach(entry => {
          promises.push(
            classesApi.createFaculty({
              teacher_id: teacherId,
              class_id: entry.classId,
              batch_id: entry.batchId,
              subject_id: alloc.subject_id,
              role: 'faculty',
              academic_year: academicYear,
            })
          )
        })
      })

      if (promises.length === 0) {
        onNotify?.({ type: 'error', message: 'No allocations to save. Please add at least one.' })
        setIsSaving(false)
        return
      }

      const results = await Promise.allSettled(promises)
      const failed = results.filter(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)
      )

      if (failed.length > 0) {
        console.error('[ClassAllocation] Save failures:', failed.map(f =>
          f.status === 'rejected'
            ? (f as PromiseRejectedResult).reason
            : (f as PromiseFulfilledResult<any>).value?.message
        ))
      }

      if (failed.length === 0) {
        onNotify?.({ type: 'success', message: 'Class allocations saved successfully!' })
      } else if (failed.length < results.length) {
        console.warn(`[ClassAllocation] Partial save: ${results.length - failed.length}/${results.length} succeeded`)
        onNotify?.({
          type: 'success',
          message: 'Most allocations saved. A few could not be saved — please check and try again.',
        })
      } else {
        onNotify?.({ type: 'error', message: 'Could not save allocations. Please refresh and try again.' })
      }
    } catch (err: any) {
      console.error('[ClassAllocation] Unexpected error during save:', err)
      onNotify?.({ type: 'error', message: 'Something went wrong. Please refresh the page and try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Summary check ─────────────────────────────────────────────────────────────
  const hasSummary =
    (isClassTeacher && !!ctClassId) ||
    (isBatchIncharge && !!biClassId && !!biBatchId) ||
    subjectAllocations.some(a => a.subject_id && a.entries.length > 0)

  // ── Loading / Error states ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
        <p className="text-sm text-muted-foreground">Loading class data...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-600 font-medium text-center max-w-sm">{loadError}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">

      {/* ── Card 1: Class Teacher Assignment ─────────────────────────────────── */}
      {/* role = 'class_teacher' | payload: teacher_id + class_id + academic_year */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white shadow-sm">
                <School className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Class Teacher Assignment</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assign as overall class teacher (no batch required)
                </p>
              </div>
            </div>
            <Checkbox
              checked={isClassTeacher}
              onCheckedChange={checked => {
                setIsClassTeacher(checked as boolean)
                if (!checked) setCtClassId('')
              }}
              className="h-6 w-6 border-2 border-blue-500 data-[state=checked]:bg-[#0f6a8f] data-[state=checked]:border-[#0f6a8f]"
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isClassTeacher ? (
            <div className="max-w-sm space-y-2">
              <Label className="text-sm font-medium">
                Class <span className="text-red-500">*</span>
              </Label>
              <Select value={ctClassId} onValueChange={setCtClassId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classesWithBatches.length === 0 ? (
                    <SelectItem value="_none" disabled>No active classes found</SelectItem>
                  ) : (
                    classesWithBatches.map(cls => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.class_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {ctClassId && selectedCtClass && (
                <p className="text-xs text-muted-foreground pt-1">
                  Academic year: <span className="font-medium">{selectedCtClass.academic_year}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Enable to assign as class teacher</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Card 2: Batch Incharge ────────────────────────────────────────────── */}
      {/* role = 'batch_incharge' | payload: teacher_id + class_id + batch_id + academic_year */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-500/5 to-purple-400/5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-400 text-white shadow-sm">
                <BookMarked className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Batch Incharge</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assign as incharge for a specific batch
                </p>
              </div>
            </div>
            <Checkbox
              checked={isBatchIncharge}
              onCheckedChange={checked => {
                setIsBatchIncharge(checked as boolean)
                if (!checked) { setBiClassId(''); setBiBatchId('') }
              }}
              className="h-6 w-6 border-2 border-purple-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isBatchIncharge ? (
            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
              {/* Class */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Class <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={biClassId}
                  onValueChange={val => { setBiClassId(val); setBiBatchId('') }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classesWithBatches.length === 0 ? (
                      <SelectItem value="_none" disabled>No active classes found</SelectItem>
                    ) : (
                      classesWithBatches.map(cls => (
                        <SelectItem key={cls._id} value={cls._id}>
                          {cls.class_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Batch */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Batch <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={biBatchId}
                  onValueChange={setBiBatchId}
                  disabled={!biClassId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={biClassId ? 'Select batch' : 'Select class first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBiClass?.batches.length === 0 ? (
                      <SelectItem value="_none" disabled>No active batches for this class</SelectItem>
                    ) : (
                      selectedBiClass?.batches.map(b => (
                        <SelectItem key={b._id} value={b._id || ''}>
                          {b.batch_name} ({b.start_time} – {b.end_time})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookMarked className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Enable to assign as batch incharge</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Card 3: Subject Teaching (Faculty) ───────────────────────────────── */}
      {/* role = 'faculty' | payload: teacher_id + class_id + batch_id + subject_id + academic_year */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#F1AF37]/5 to-[#D88931]/5 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white shadow-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Subject Teaching Allocation</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assign as faculty — subject + class + batch
                </p>
              </div>
            </div>
            <Button
              onClick={addSubjectAllocation}
              className="gap-2 bg-gradient-to-r from-[#F1AF37] to-[#D88931] hover:from-[#F1AF37]/90 hover:to-[#D88931]/90 h-9 w-full sm:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {subjectAllocations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground mb-4">No subject allocations yet</p>
              <Button onClick={addSubjectAllocation} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Subject
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subjectAllocations.map((allocation, index) => (
                <Card key={index} className="border-2 overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-3 pt-4 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-sm font-medium">Subject {index + 1}</Label>
                        <Select
                          value={allocation.subject_id}
                          onValueChange={val => updateAllocationSubject(index, val)}
                        >
                          <SelectTrigger className="h-10 bg-white">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.length === 0 ? (
                              <SelectItem value="_none" disabled>No coaching subjects found</SelectItem>
                            ) : (
                              subjects.map(s => (
                                <SelectItem key={s._id} value={s._id}>
                                  {s.subject_name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubjectAllocation(index)}
                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                        title="Remove subject"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  {allocation.subject_id && (
                    <CardContent className="p-4 space-y-4">
                      <Label className="text-sm font-medium">
                        Select Class &amp; Batch
                      </Label>

                      {classesWithBatches.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No active classes found.</p>
                      ) : (
                        <div className="space-y-5">
                          {classesWithBatches.map(cls => (
                            <div key={cls._id}>
                              <p className="text-sm font-semibold text-foreground mb-2">
                                {cls.class_name}
                              </p>
                              {cls.batches.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic pl-1">
                                  No active batches for this class
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {cls.batches.map(batch => {
                                    const selected = isEntrySelected(index, cls._id, batch._id || '')
                                    return (
                                      <button
                                        key={batch._id}
                                        type="button"
                                        onClick={() => toggleEntry(index, cls, batch)}
                                        className={`px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                                          selected
                                            ? 'bg-gradient-to-r from-[#F1AF37] to-[#D88931] text-white border-transparent shadow-sm'
                                            : 'bg-white border-border hover:border-[#F1AF37] hover:bg-[#F1AF37]/5 text-foreground'
                                        }`}
                                      >
                                        {batch.batch_name}
                                        <span className="opacity-70 ml-1 font-normal">
                                          {batch.start_time}–{batch.end_time}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {allocation.entries.length > 0 && (
                        <div className="p-3 bg-gradient-to-r from-[#F1AF37]/10 to-[#D88931]/10 rounded-lg border-2 border-[#F1AF37]/30">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Selected: {allocation.entries.length}{' '}
                            {allocation.entries.length === 1 ? 'batch' : 'batches'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {allocation.entries.map((entry, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-white text-[#D87331] border-[#F1AF37]/40 text-xs"
                              >
                                {entry.className} — {entry.batchName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Card 4: Allocation Summary ───────────────────────────────────────── */}
      {hasSummary && (
        <Card className="border-2 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base sm:text-lg text-emerald-900">
                Allocation Summary
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Class Teacher */}
            {isClassTeacher && ctClassId && (
              <div className="p-3 bg-white rounded-lg border-2 border-emerald-200">
                <p className="text-xs font-semibold text-emerald-800 mb-2 uppercase tracking-wide">
                  Class Teacher
                </p>
                <Badge className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white">
                  {selectedCtClass?.class_name || ctClassId}
                </Badge>
              </div>
            )}

            {/* Batch Incharge */}
            {isBatchIncharge && biClassId && biBatchId && (
              <div className="p-3 bg-white rounded-lg border-2 border-emerald-200">
                <p className="text-xs font-semibold text-emerald-800 mb-2 uppercase tracking-wide">
                  Batch Incharge
                </p>
                <Badge className="bg-gradient-to-r from-purple-500 to-purple-400 text-white">
                  {selectedBiClass?.class_name} —{' '}
                  {selectedBiClass?.batches.find(b => b._id === biBatchId)?.batch_name || biBatchId}
                </Badge>
              </div>
            )}

            {/* Faculty (Subject Allocations) */}
            {subjectAllocations
              .filter(a => a.subject_id && a.entries.length > 0)
              .map((alloc, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border-2 border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-800 mb-2 uppercase tracking-wide">
                    Faculty — {alloc.subject_name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {alloc.entries.map((entry, j) => (
                      <Badge
                        key={j}
                        variant="outline"
                        className="text-xs bg-[#F1AF37]/10 text-[#D87331] border-[#F1AF37]/40"
                      >
                        {entry.className} — {entry.batchName}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}

          </CardContent>
        </Card>
      )}

      {/* ── Save Button ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2 pb-4">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasSummary}
          className="gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90 shadow-md h-11 px-8 disabled:opacity-50"
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
          ) : (
            <><Save className="h-4 w-4" />Save Allocations</>
          )}
        </Button>
      </div>

    </div>
  )
}