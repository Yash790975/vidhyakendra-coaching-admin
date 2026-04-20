'use client'

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import { studentsApi, StudentAcademicMapping } from '@/lib/api/students'
import { classesApi, ClassMaster, CoachingBatch } from '@/lib/api/classes'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AcademicInfoHandle {
  save: () => Promise<boolean>
}

export interface AcademicInfoErrors {
  class_id?:      string
  academic_year?: string
}

export interface AcademicSummary {
  className:          string
  sectionName:        string   // school only
  batchName:          string   // coaching only
  rollNumber:         string
  academicYear:       string
  joinedAt:           string
  mappingType:        'school' | 'coaching'
  prevAcademicYear:   string
  prevSchoolName:     string
  prevBoard:          string
  prevClassCompleted: string
  prevRemarks:        string
}

interface AcademicInfoProps {
  studentId:      string
  studentName:    string
  isEditMode:     boolean
  onSaveSuccess?: () => void
  onDataChange?:  (summary: AcademicSummary) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInstituteType(): 'school' | 'coaching' {
  if (typeof window === 'undefined') return 'school'
  return localStorage.getItem('instituteType') === 'coaching' ? 'coaching' : 'school'
}

function getInstituteId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('instituteId') ?? ''
}


// ─── Component ────────────────────────────────────────────────────────────────

const AcademicInfo = forwardRef<AcademicInfoHandle, AcademicInfoProps>(function AcademicInfo(
  { studentId, studentName, isEditMode, onSaveSuccess, onDataChange },
  ref
) {
  const mappingType = getInstituteType()
  const instituteId = getInstituteId()

  // ── Data lists ────────────────────────────────────────────────────────────────
  const [classes,  setClasses]  = useState<ClassMaster[]>([])
  const [batches,  setBatches]  = useState<CoachingBatch[]>([])

  // ── Current mapping form state ────────────────────────────────────────────────
  const [classId,      setClassId]      = useState('')
  const [className,    setClassName]    = useState('')
  const [batchId,      setBatchId]      = useState('')
  const [batchName,    setBatchName]    = useState('')
  const [rollNumber,   setRollNumber]   = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [joinedAt,     setJoinedAt]     = useState('')

  // ── Existing IDs (edit mode) ──────────────────────────────────────────────────
  const [existingMappingId, setExistingMappingId] = useState<string | null>(null)

  // ── Errors & loading ──────────────────────────────────────────────────────────
  const [errors,            setErrors]            = useState<AcademicInfoErrors>({})
  const [apiError,          setApiError]          = useState<string | null>(null)
  const [isFetchingClasses, setIsFetchingClasses] = useState(false)
  const [isFetchingBatches, setIsFetchingBatches] = useState(false)

  // ── Notify parent on every data change (for Review) ──────────────────────────
  useEffect(() => {
    onDataChange?.({
      className,
      sectionName: '',
      batchName,
      rollNumber,
      academicYear,
      joinedAt,
      mappingType,
      prevAcademicYear:   '',
      prevSchoolName:     '',
      prevBoard:          '',
      prevClassCompleted: '',
      prevRemarks:        '',
    })
  }, [className, batchName, rollNumber, academicYear, joinedAt, mappingType, onDataChange])

  // ── Fetch classes ─────────────────────────────────────────────────────────────
  const fetchClasses = useCallback(async () => {
    if (!instituteId) return
    setIsFetchingClasses(true)
    console.log('[AcademicInfo] Fetching classes for institute:', instituteId)
    try {
      const res = await classesApi.getAll({ instituteId, status: 'active' })
      if (res.success && res.result) {
        setClasses(res.result)
        console.log('[AcademicInfo] Classes loaded:', res.result.length)
      } else {
        console.error('[AcademicInfo] Failed to fetch classes:', res)
      }
    } catch (err) {
      console.error('[AcademicInfo] Unexpected error fetching classes:', err)
    } finally {
      setIsFetchingClasses(false)
    }
  }, [instituteId, mappingType])

  // ── Fetch batches (coaching only) ─────────────────────────────────────────────
  const fetchBatches = useCallback(async (cId: string) => {
    if (!cId || mappingType !== 'coaching') return
    setIsFetchingBatches(true)
    setBatches([])
    setBatchId('')
    setBatchName('')
    console.log('[AcademicInfo] Fetching batches for class:', cId)
    try {
      const res = await classesApi.getBatchesByClass(cId)
      if (res.success && res.result) {
        setBatches(res.result)
        console.log('[AcademicInfo] Batches loaded:', res.result.length)
      } else {
        console.error('[AcademicInfo] Failed to fetch batches:', res)
      }
    } catch (err) {
      console.error('[AcademicInfo] Unexpected error fetching batches:', err)
    } finally {
      setIsFetchingBatches(false)
    }
  }, [mappingType])

 useEffect(() => { fetchClasses() }, [fetchClasses])

  // ── Edit mode: load existing mapping + prev academic doc ──────────────────────
  useEffect(() => {
    if (!studentId || !isEditMode) return
    const loadExisting = async () => {
      console.log('[AcademicInfo] Edit mode — loading existing data for student:', studentId)
      try {
        const mappingRes = await studentsApi.getActiveAcademicMappingByStudent(studentId)
        console.log('[AcademicInfo] RAW mappingRes:', JSON.stringify(mappingRes))
if (mappingRes.success && Array.isArray(mappingRes.result) && mappingRes.result.length > 0) {
  const m = mappingRes.result[0]
  console.log('[AcademicInfo] Mapping _id:', m._id)
  setExistingMappingId(m._id ?? null)
  setAcademicYear(m.academic_year ?? '')
  setRollNumber(m.roll_number ?? '')
  setJoinedAt(
    m.joined_at ? new Date(m.joined_at).toISOString().split('T')[0] : ''
  )

  const classIdStr = typeof m.class_id === 'object' && m.class_id !== null
    ? (m.class_id as any)._id
    : m.class_id as string

  if (classIdStr) {
      setClassId(classIdStr)
      const batRes = await classesApi.getBatchesByClass(classIdStr)
      if (batRes.success && batRes.result) {
        setBatches(batRes.result)
        const batchIdStr = typeof m.batch_id === 'object' && m.batch_id !== null
          ? (m.batch_id as any)._id
          : m.batch_id as string
        if (batchIdStr) {
          setBatchId(batchIdStr)
          const found = batRes.result.find(b => b._id === batchIdStr)
          if (found) setBatchName(found.batch_name ?? '')
        }
      }
    }
}

      } catch (err) {
        console.error('[AcademicInfo] Error loading existing data:', err)
      }
    }
    loadExisting()
}, [studentId, isEditMode, mappingType])

  // ── After classes load in edit mode, restore className ────────────────────────
  useEffect(() => {
    if (!isEditMode || !classId || classes.length === 0) return
    const found = classes.find(c => c._id === classId)
    if (found) setClassName(found.class_name)
  }, [classes, isEditMode, classId])

  // ── Class change ──────────────────────────────────────────────────────────────
  function handleClassChange(cId: string) {
    const selected = classes.find(c => c._id === cId)
    setClassId(cId)
    setClassName(selected?.class_name ?? '')
    setBatchId('')
    setBatchName('')
    setBatches([])
    fetchBatches(cId)
  }

  function handleBatchChange(bId: string) {
    const selected = batches.find(b => b._id === bId)
    setBatchId(bId)
    setBatchName(selected?.batch_name ?? '')
  }

  // ── Validate ──────────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: AcademicInfoErrors = {}
    if (!classId)      errs.class_id      = 'Please select a class'
    if (!academicYear) errs.academic_year = 'Academic year is required (e.g. 2025-26)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    save: async (): Promise<boolean> => {
      if (!validate()) return false
      setApiError(null)

      // ── 1. Save academic mapping ──────────────────────────────────────────────
      const mappingPayload: StudentAcademicMapping = {
        student_id:    studentId,
        mapping_type:  'coaching',
        class_id:      classId   || null,
        batch_id:      batchId   || null,
        academic_year: academicYear,
        roll_number:   rollNumber || null,
        ...(joinedAt ? { joined_at: joinedAt } : {}),
      }

console.log('[AcademicInfo] Saving mapping. existingId:', existingMappingId, 'Payload:', mappingPayload)

      try {
 if (existingMappingId) {
          // Edit mode — academic_year aur joined_at backend update validation mein nahi hain
          const { student_id, mapping_type, academic_year, joined_at, ...updatePayload } = mappingPayload
          const mappingRes = await studentsApi.updateAcademicMapping(existingMappingId, updatePayload)
         if (!mappingRes.success) {
  const msg = mappingRes.message ?? ''
  const friendly = msg.includes('is not allowed') || msg.includes('Bad Request')
    ? 'Unable to save academic details. Please check your inputs and try again.'
    : msg || 'Failed to update academic details. Please try again.'
  setApiError(friendly)
            console.error('[AcademicInfo] Update mapping failed:', mappingRes)
            return false
          }
          console.log('[AcademicInfo] Mapping updated successfully:', existingMappingId)
   } else {
          // Create mode — create new mapping
          const mappingRes = await studentsApi.createAcademicMapping(mappingPayload)
          if (!mappingRes.success || !mappingRes.result) {
            setApiError(mappingRes.message || 'Failed to save academic mapping. Please try again.')
            console.error('[AcademicInfo] Create mapping failed:', mappingRes)
            return false
          }
          setExistingMappingId(mappingRes.result._id ?? null)
          console.log('[AcademicInfo] Mapping created successfully, ID saved:', mappingRes.result._id)
        }
      } catch (err) {
        setApiError('Unable to connect to the server. Please check your connection.')
        console.error('[AcademicInfo] Unexpected error saving mapping:', err)
        return false
      }



      onSaveSuccess?.()
      return true
    },
  }))

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* API Error */}
      {apiError && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {/* ── Section 1: Current Academic Mapping ─────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground border-b pb-2">
          Current Academic Mapping
        </h3>

        {/* Row 1: Class | Section/Batch | Roll Number */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Class */}
          <div className="space-y-1.5">
            <Label htmlFor="acad-class">
              Class
              <span className="text-red-500 ml-1">*</span>
            </Label>
            {isFetchingClasses ? (
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
              </div>
            ) : (
              <Select value={classId} onValueChange={handleClassChange}>
                <SelectTrigger id="acad-class" className={errors.class_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0
                    ? <SelectItem value="__none" disabled>No classes found</SelectItem>
                    : classes.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.class_name}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            )}
            {errors.class_id && <p className="text-xs text-red-600">{errors.class_id}</p>}
          </div>

          {/* Batch (coaching) */}
          <div className="space-y-1.5">
            <Label htmlFor="acad-batch">Batch</Label>
            {isFetchingBatches ? (
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
              </div>
            ) : (
              <Select
                value={batchId}
                onValueChange={handleBatchChange}
                disabled={!classId || batches.length === 0}
              >
                <SelectTrigger id="acad-batch">
                  <SelectValue placeholder={classId ? 'Select batch' : 'Select class first'} />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b._id} value={b._id!}>
                      {b.batch_name}
                      {b.start_time && b.end_time ? ` (${b.start_time}–${b.end_time})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Roll Number */}
          <div className="space-y-1.5">
            <Label htmlFor="acad-roll">Roll Number</Label>
            <Input
              id="acad-roll"
              type="number"
              placeholder="Enter roll number"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
          </div>

        </div>

        {/* Row 2: Academic Year | Joining Date */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1.5">
            <Label htmlFor="acad-year">
              Academic Year<span className="text-red-500">*</span>
            </Label>
            <Input
              id="acad-year"
              placeholder="e.g. 2025-26"
              value={academicYear}
              onChange={(e) => !isEditMode && setAcademicYear(e.target.value)}
              disabled={isEditMode}
              className={`${errors.academic_year ? 'border-red-500' : ''} ${isEditMode ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
            />
            {isEditMode && (
              <p className="text-xs text-muted-foreground">Academic year cannot be changed after enrollment.</p>
            )}
            {errors.academic_year && <p className="text-xs text-red-600">{errors.academic_year}</p>}
          </div>


               <div className="space-y-1.5">
            <Label htmlFor="acad-joined">Joining Date</Label>
            <Input
              id="acad-joined"
              type="date"
              value={joinedAt}
              onChange={(e) => !isEditMode && setJoinedAt(e.target.value)}
              disabled={isEditMode}
              className={isEditMode ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
            />
          </div>

        </div> */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1.5">
            <Label htmlFor="acad-year">
              Academic Year<span className="text-red-500">*</span>
            </Label>
            <Input 
              id="acad-year"
              placeholder="e.g. 2025-26"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={errors.academic_year ? 'border-red-500' : ''}
            />

            {errors.academic_year && (
              <p className="text-xs text-red-600">{errors.academic_year}</p>
            )}
          </div>

  <div className="space-y-1.5">
    <Label htmlFor="acad-joined">Joining Date</Label>
    <Input
      id="acad-joined"
      type="date"
      value={joinedAt}
      onChange={(e) => setJoinedAt(e.target.value)}
    />
  </div>

</div>
      </div>

    

    </div>
  )
})

export default AcademicInfo