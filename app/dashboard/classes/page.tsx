'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BookOpen,
  Plus,
  Edit,
  Eye,
  Trash2,
  Users,
  PlusCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertCircle,
  Check,
  Clock,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { classesApi, ClassMaster, CoachingBatch } from '@/lib/api/classes'
import ClassSubjectScheduleManager from './ClassSubjectSchedule'
import { studentsApi } from '@/lib/api/students'


// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCurrentAcademicYear = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`
}

const getInstituteId = (): string => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('instituteId') || ''
}

const isValidAcademicYear = (value: string): boolean =>
  /^\d{4}-\d{2}$/.test(value.trim())

const isValidTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())

const formatTime = (time: string): string => {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${m} ${ampm}`
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BatchEnriched extends CoachingBatch {
  _id: string
  studentCount: number
}

interface ClassEnriched extends ClassMaster {
  batches: BatchEnriched[]
  totalCapacity: number
  totalStudents: number
}

// ─── Sorting helpers ──────────────────────────────────────────────────────────

const sortClasses = (list: ClassEnriched[]): ClassEnriched[] =>
  [...list].sort((a, b) => {
    const aNum = parseInt(a.class_name, 10)
    const bNum = parseInt(b.class_name, 10)
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
    return a.class_name.localeCompare(b.class_name)
  })

const sortBatches = (batches: BatchEnriched[]): BatchEnriched[] =>
  [...batches].sort((a, b) => a.batch_name.localeCompare(b.batch_name))

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassesPage() {
  // ── Data state ───────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<ClassEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  // ── Dialog visibility ────────────────────────────────────────────────────────
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddBatchDialogOpen, setIsAddBatchDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassEnriched | null>(null)
const [viewingClass, setViewingClass] = useState<ClassEnriched | null>(null)
const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // ── Create class form ────────────────────────────────────────────────────────
  const [newClassName, setNewClassName] = useState('')
  const [newClassCapacity, setNewClassCapacity] = useState('')
  const [newClassLevel, setNewClassLevel] = useState('')
  const [newAcademicYear, setNewAcademicYear] = useState(getCurrentAcademicYear())
  const [newBatches, setNewBatches] = useState<Array<{ name: string; startTime: string; endTime: string; capacity: string }>>([
    { name: '', startTime: '', endTime: '', capacity: '' },
  ])
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // ── Edit class name ──────────────────────────────────────────────────────────
  const [editClassName, setEditClassName] = useState('')
  const [editClassLoading, setEditClassLoading] = useState(false)
  const [editClassError, setEditClassError] = useState<string | null>(null)

  // ── Edit batch inline ─────────────────────────────────────────────────────────
  // const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  // const [editingBatchName, setEditingBatchName] = useState('')
  // const [editingBatchLoading, setEditingBatchLoading] = useState(false)
  // const [editingBatchError, setEditingBatchError] = useState<string | null>(null)
  // ── Edit batch inline ─────────────────────────────────────────────────────────
const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
const [editingBatchName, setEditingBatchName] = useState('')
const [editingBatchStartTime, setEditingBatchStartTime] = useState('')
const [editingBatchEndTime, setEditingBatchEndTime] = useState('')
const [editingBatchLoading, setEditingBatchLoading] = useState(false)
const [editingBatchError, setEditingBatchError] = useState<string | null>(null)

  // ── Add batch form ────────────────────────────────────────────────────────────
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchStartTime, setNewBatchStartTime] = useState('')
  const [newBatchEndTime, setNewBatchEndTime] = useState('')
  const [newBatchCapacity, setNewBatchCapacity] = useState('')
  const [addBatchLoading, setAddBatchLoading] = useState(false)
  const [addBatchError, setAddBatchError] = useState<string | null>(null)

  // ── Delete trackers ──────────────────────────────────────────────────────────
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)

  // ── Action error banner ──────────────────────────────────────────────────────
  const [actionError, setActionError] = useState<string | null>(null)

  // ── Custom confirm dialog ────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(7)

  // ─── Fetch all classes ────────────────────────────────────────────────────────

  const fetchClasses = useCallback(async () => {
    const instituteId = getInstituteId()
    if (!instituteId) {
      setPageError('Institute information not found. Please log in again.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setPageError(null)

      // class_type=coaching is passed internally by classesApi.getAll
      const res = await classesApi.getAll({ instituteId, status: 'active' })

      if (!res.success || !Array.isArray(res.result)) {
        throw new Error(res.message || 'Failed to load classes.')
      }

      const rawClasses: ClassMaster[] = res.result
      console.log('[Classes] Fetched classes count:', rawClasses.length)

      const enriched: ClassEnriched[] = await Promise.all(
        rawClasses.map(async (cls) => {
          try {
            const [batchesRes, studentsRes] = await Promise.all([
              classesApi.getBatchesByClass(cls._id),
              studentsApi.getStudentsByClass(cls._id),
            ])

            const rawBatches: CoachingBatch[] = batchesRes.result || []
            const allMappings = studentsRes.result || []

            const batches: BatchEnriched[] = sortBatches(
              rawBatches
                .filter((b): b is CoachingBatch & { _id: string } => !!b._id)
                .map((b) => ({
                  ...b,
                  _id: b._id!,
                  studentCount: allMappings.filter((m) => m.batch_id === b._id).length,
                }))
            )

            const totalStudents = allMappings.length
            const totalCapacity =
              batches.length > 0
                ? batches.reduce((sum, b) => sum + (b.capacity || 0), 0)
                : cls.class_capacity || 0

            return { ...cls, batches, totalCapacity, totalStudents }
          } catch (enrichErr) {
            console.error(`[Classes] Failed to enrich class ${cls._id}:`, enrichErr)
            return { ...cls, batches: [], totalCapacity: cls.class_capacity || 0, totalStudents: 0 }
          }
        })
      )

      setClasses(sortClasses(enriched))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load classes.'
      console.error('[Classes] fetchClasses error:', err)
      setPageError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  useEffect(() => {
    if (actionError) {
      const t = setTimeout(() => setActionError(null), 5000)
      return () => clearTimeout(t)
    }
  }, [actionError])

  // ─── Reset helpers ────────────────────────────────────────────────────────────

  const resetCreateForm = () => {
    setNewClassName('')
    setNewClassCapacity('')
    setNewClassLevel('')
    setNewAcademicYear(getCurrentAcademicYear())
    setNewBatches([{ name: '', startTime: '', endTime: '', capacity: '' }])
    setCreateError(null)
  }

  const resetAddBatchForm = () => {
    setNewBatchName('')
    setNewBatchStartTime('')
    setNewBatchEndTime('')
    setNewBatchCapacity('')
    setAddBatchError(null)
  }

//  const resetEditBatchInline = () => { 
//     setEditingBatchId(null)
//     setEditingBatchName('')
//     setEditingBatchError(null)
//   }
const resetEditBatchInline = () => {
  setEditingBatchId(null)
  setEditingBatchName('')
  setEditingBatchStartTime('')
  setEditingBatchEndTime('')
  setEditingBatchError(null)
}

  // ─── Create class ─────────────────────────────────────────────────────────────

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      setCreateError('Class name is required.')
      return
    }
    if (!newAcademicYear.trim() || !isValidAcademicYear(newAcademicYear)) {
      setCreateError('Academic year must be in format YYYY-YY (e.g. 2025-26).')
      return
    }
    if (newClassCapacity && parseInt(newClassCapacity, 10) < 1) {
      setCreateError('Class capacity must be at least 1.')
      return
    }

    // Validate batches that have any data filled
    const filledBatches = newBatches.filter(
      (b) => b.name.trim() || b.startTime || b.endTime || b.capacity
    )
    for (const b of filledBatches) {
      if (!b.name.trim()) { setCreateError('Batch name is required for all batches.'); return }
      if (!b.startTime) { setCreateError(`Start time is required for batch "${b.name}".`); return }
      if (!b.endTime) { setCreateError(`End time is required for batch "${b.name}".`); return }
      if (!isValidTime(b.startTime)) { setCreateError(`Invalid start time for batch "${b.name}". Use HH:MM format.`); return }
      if (!isValidTime(b.endTime)) { setCreateError(`Invalid end time for batch "${b.name}". Use HH:MM format.`); return }
      if (b.startTime >= b.endTime) { setCreateError(`End time must be after start time for batch "${b.name}".`); return }
      if (b.capacity && parseInt(b.capacity, 10) < 1) { setCreateError(`Batch capacity must be at least 1 for "${b.name}".`); return }
    }

    const instituteId = getInstituteId()
    if (!instituteId) {
      setCreateError('Institute information not found. Please log in again.')
      return
    }

    setCreateLoading(true)
    setCreateError(null)

    try {
      const payload = {
        institute_id: instituteId,
        class_name: newClassName.trim(),
        class_type: 'coaching' as const,
        academic_year: newAcademicYear.trim(),
        class_capacity: newClassCapacity ? parseInt(newClassCapacity, 10) : null,
        class_level: newClassLevel.trim() || null,
      }

      console.log('[Classes] Creating class:', payload)
      const res = await classesApi.create(payload)

      if (!res.success || !res.result) throw new Error(res.message || 'Failed to create class.')

      const createdClass = res.result
      console.log('[Classes] Class created:', createdClass._id)

      const validBatches = filledBatches
      const createdBatches: BatchEnriched[] = []

      for (const b of validBatches) {
        try {
          const batchRes = await classesApi.createBatch({
            class_id: createdClass._id,
            batch_name: b.name.trim(),
            start_time: b.startTime,
            end_time: b.endTime,
            capacity: b.capacity ? parseInt(b.capacity, 10) : null,
          })
          if (batchRes.success && batchRes.result && batchRes.result._id) {
            createdBatches.push({ ...batchRes.result, _id: batchRes.result._id, studentCount: 0 })
            console.log('[Classes] Batch created:', batchRes.result._id)
          } else {
            console.warn('[Classes] Batch creation returned no result for:', b.name)
          }
        } catch (batchErr) {
          console.error('[Classes] Batch creation failed for:', b.name, batchErr)
        }
      }

      const totalCapacity =
        createdBatches.length > 0
          ? createdBatches.reduce((sum, b) => sum + (b.capacity || 0), 0)
          : createdClass.class_capacity || 0

      setClasses((prev) =>
        sortClasses([
          {
            ...createdClass,
            batches: sortBatches(createdBatches),
            totalCapacity,
            totalStudents: 0,
          },
          ...prev,
        ])
      )
      setIsCreateDialogOpen(false)
      resetCreateForm()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create class.'
      console.error('[Classes] handleCreateClass error:', err)
      setCreateError(msg)
    } finally {
      setCreateLoading(false)
    }
  }

  // ─── Edit class name ──────────────────────────────────────────────────────────

  const handleEditClassName = async () => {
    if (!selectedClass) return
    if (!editClassName.trim()) { setEditClassError('Class name is required.'); return }
    if (editClassName.trim() === selectedClass.class_name) { setEditClassError('No changes made.'); return }

    setEditClassLoading(true)
    setEditClassError(null)

    try {
      console.log('[Classes] Updating class name:', selectedClass._id)
      const res = await classesApi.update(selectedClass._id, { class_name: editClassName.trim() })

      if (!res.success || !res.result) throw new Error(res.message || 'Failed to update class name.')

      console.log('[Classes] Class name updated:', res.result._id)

      const updatedClass: ClassEnriched = { ...selectedClass, class_name: res.result.class_name }
      setClasses((prev) => sortClasses(prev.map((cls) => (cls._id === selectedClass._id ? updatedClass : cls))))
      setSelectedClass(updatedClass)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update class name.'
      console.error('[Classes] handleEditClassName error:', err)
      setEditClassError(msg)
    } finally {
      setEditClassLoading(false)
    }
  }

  // ─── Edit batch name inline ───────────────────────────────────────────────────

  // const handleEditBatchName = async (batchId: string) => {
  //   if (!selectedClass) return
  //   if (!editingBatchName.trim()) { setEditingBatchError('Batch name is required.'); return }

  //   const original = selectedClass.batches.find((b) => b._id === batchId)
  //   if (original && editingBatchName.trim() === original.batch_name) {
  //     resetEditBatchInline()
  //     return
  //   }

  //   setEditingBatchLoading(true)
  //   setEditingBatchError(null)

  //   try {
  //     console.log('[Classes] Updating batch name:', batchId)
  //     const res = await classesApi.updateBatch(batchId, { batch_name: editingBatchName.trim() })

  //     if (!res.success || !res.result) throw new Error(res.message || 'Failed to update batch name.')

  //     console.log('[Classes] Batch name updated:', batchId)

  //     const updateClass = (cls: ClassEnriched): ClassEnriched => {
  //       if (cls._id !== selectedClass._id) return cls
  //       return {
  //         ...cls,
  //         batches: cls.batches.map((b) =>
  //           b._id === batchId ? { ...b, batch_name: res.result!.batch_name ?? editingBatchName.trim() } : b
  //         ),
  //       }
  //     }

  //     setClasses((prev) => prev.map(updateClass))
  //     setSelectedClass((prev) => (prev ? updateClass(prev) : null))
  //     resetEditBatchInline()
  //   } catch (err: unknown) {
  //     const msg = err instanceof Error ? err.message : 'Failed to update batch name.'
  //     console.error('[Classes] handleEditBatchName error:', err)
  //     setEditingBatchError(msg)
  //   } finally {
  //     setEditingBatchLoading(false)
  //   }
  // }
  const handleEditBatchName = async (batchId: string) => {
  if (!selectedClass) return
  if (!editingBatchName.trim()) { setEditingBatchError('Batch name is required.'); return }
  if (!editingBatchStartTime) { setEditingBatchError('Start time is required.'); return }
  if (!editingBatchEndTime) { setEditingBatchError('End time is required.'); return }
  if (!isValidTime(editingBatchStartTime)) { setEditingBatchError('Invalid start time. Use HH:MM format.'); return }
  if (!isValidTime(editingBatchEndTime)) { setEditingBatchError('Invalid end time. Use HH:MM format.'); return }
  if (editingBatchStartTime >= editingBatchEndTime) { setEditingBatchError('End time must be after start time.'); return }

  const original = selectedClass.batches.find((b) => b._id === batchId)
  if (
    original &&
    editingBatchName.trim() === original.batch_name &&
    editingBatchStartTime === original.start_time &&
    editingBatchEndTime === original.end_time
  ) {
    resetEditBatchInline()
    return
  }

  setEditingBatchLoading(true)
  setEditingBatchError(null)

  try {
    console.log('[Classes] Updating batch:', batchId)
    const res = await classesApi.updateBatch(batchId, {
      batch_name: editingBatchName.trim(),
      start_time: editingBatchStartTime,
      end_time: editingBatchEndTime,
    })

    if (!res.success || !res.result) throw new Error(res.message || 'Failed to update batch.')

    console.log('[Classes] Batch updated:', batchId)

    const updateClass = (cls: ClassEnriched): ClassEnriched => {
      if (cls._id !== selectedClass._id) return cls
      return {
        ...cls,
        batches: cls.batches.map((b) =>
          b._id === batchId
            ? {
                ...b,
                batch_name: res.result!.batch_name ?? editingBatchName.trim(),
                start_time: res.result!.start_time ?? editingBatchStartTime,
                end_time: res.result!.end_time ?? editingBatchEndTime,
              }
            : b
        ),
      }
    }

    setClasses((prev) => prev.map(updateClass))
    setSelectedClass((prev) => (prev ? updateClass(prev) : null))
    resetEditBatchInline()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update batch.'
    console.error('[Classes] handleEditBatchName error:', err)
    setEditingBatchError(msg)
  } finally {
    setEditingBatchLoading(false)
  }
}

  // ─── Add batch ────────────────────────────────────────────────────────────────

  const handleAddBatch = async () => {
    if (!selectedClass) return
    if (!newBatchName.trim()) { setAddBatchError('Batch name is required.'); return }
    if (!newBatchStartTime) { setAddBatchError('Start time is required.'); return }
    if (!newBatchEndTime) { setAddBatchError('End time is required.'); return }
    if (!isValidTime(newBatchStartTime)) { setAddBatchError('Invalid start time. Use HH:MM format (e.g. 09:00).'); return }
    if (!isValidTime(newBatchEndTime)) { setAddBatchError('Invalid end time. Use HH:MM format (e.g. 11:00).'); return }
    if (newBatchStartTime >= newBatchEndTime) { setAddBatchError('End time must be after start time.'); return }
    if (newBatchCapacity && parseInt(newBatchCapacity, 10) < 1) { setAddBatchError('Capacity must be at least 1.'); return }

    setAddBatchLoading(true)
    setAddBatchError(null)

    try {
      const payload = {
        class_id: selectedClass._id,
        batch_name: newBatchName.trim(),
        start_time: newBatchStartTime,
        end_time: newBatchEndTime,
        capacity: newBatchCapacity ? parseInt(newBatchCapacity, 10) : null,
      }

      console.log('[Classes] Adding batch:', payload)
      const res = await classesApi.createBatch(payload)

      if (!res.success || !res.result || !res.result._id) {
        throw new Error(res.message || 'Failed to add batch.')
      }

      const newBatch: BatchEnriched = { ...res.result, _id: res.result._id, studentCount: 0 }
      console.log('[Classes] Batch added:', newBatch._id)

      setClasses((prev) =>
        prev.map((cls) => {
          if (cls._id !== selectedClass._id) return cls
          const updatedBatches = sortBatches([...cls.batches, newBatch])
          return {
            ...cls,
            batches: updatedBatches,
            totalCapacity: cls.totalCapacity + (newBatch.capacity || 0),
          }
        })
      )

      setIsAddBatchDialogOpen(false)
      resetAddBatchForm()
      setSelectedClass(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add batch.'
      console.error('[Classes] handleAddBatch error:', err)
      setAddBatchError(msg)
    } finally {
      setAddBatchLoading(false)
    }
  }

  // ─── Delete class ─────────────────────────────────────────────────────────────

  const handleDeleteClass = (classId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Class',
      description: 'Are you sure you want to delete this class? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }))
        setDeletingClassId(classId)
        try {
          console.log('[Classes] Deleting class:', classId)
          const res = await classesApi.delete(classId)
          if (!res.success) throw new Error(res.message || 'Failed to delete class.')
          console.log('[Classes] Class deleted:', classId)
          setClasses((prev) => {
            const updated = prev.filter((cls) => cls._id !== classId)
            const newTotalPages = Math.ceil(updated.length / itemsPerPage)
            if (currentPage > newTotalPages && newTotalPages > 0) setCurrentPage(newTotalPages)
            return updated
          })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to delete class.'
          console.error('[Classes] handleDeleteClass error:', err)
          setActionError(msg)
        } finally {
          setDeletingClassId(null)
        }
      },
    })
  }

  // ─── Delete batch ─────────────────────────────────────────────────────────────

  const handleDeleteBatch = (classId: string, batchId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Batch',
      description: 'Are you sure you want to delete this batch? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }))
        setDeletingBatchId(batchId)
        try {
          console.log('[Classes] Deleting batch:', batchId)
          const res = await classesApi.deleteBatch(batchId)
          if (!res.success) throw new Error(res.message || 'Failed to delete batch.')
          console.log('[Classes] Batch deleted:', batchId)

          const updateClass = (cls: ClassEnriched): ClassEnriched => {
            if (cls._id !== classId) return cls
            const updatedBatches = cls.batches.filter((b) => b._id !== batchId)
            return {
              ...cls,
              batches: updatedBatches,
              totalCapacity: updatedBatches.reduce((sum, b) => sum + (b.capacity || 0), 0),
              totalStudents: updatedBatches.reduce((sum, b) => sum + b.studentCount, 0),
            }
          }

          setClasses((prev) => prev.map(updateClass))
          if (selectedClass?._id === classId) {
            setSelectedClass((prev) => (prev ? updateClass(prev) : null))
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to delete batch.'
          console.error('[Classes] handleDeleteBatch error:', err)
          setActionError(msg)
        } finally {
          setDeletingBatchId(null)
        }
      },
    })
  }

  // ─── Derived stats ────────────────────────────────────────────────────────────

  const totalClasses = classes.length
  const totalBatches = classes.reduce((sum, cls) => sum + cls.batches.length, 0)
  const totalCapacity = classes.reduce((sum, cls) => sum + cls.totalCapacity, 0)
  const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0)

  const totalPages = Math.ceil(classes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedClasses = classes.slice(startIndex, endIndex)

  // ─── Loading / Error screens ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
          <p className="text-sm text-muted-foreground">Loading classes...</p>
        </div>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm font-medium text-red-600">{pageError}</p>
          <Button variant="outline" onClick={fetchClasses} className="gap-2">
            <Loader2 className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
            Classes Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage classes and batches</p>
        </div>
        <Button  
          onClick={() => { resetCreateForm(); setIsCreateDialogOpen(true) }}
          className="gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create New Class
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Classes</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{totalClasses}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Batches</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{totalBatches}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#67BAC3] to-[#1897C6] text-white">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{totalCapacity}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white">
                <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Students</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{totalStudents}</p>
              </div>
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D87331] to-[#D88931] text-white">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Empty state ── */}
      {classes.length === 0 && (
        <Card className="border-2">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No classes found</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first class to get started</p>
          </CardContent>
        </Card>
      )}

      {/* ── Classes table – Desktop ── */}
      {classes.length > 0 && (
        <Card className="hidden md:block border-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">All Classes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Manage your classes and batches</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5">
 <TableHead className="font-semibold">Class Name</TableHead>
<TableHead className="font-semibold">Level</TableHead>
<TableHead className="font-semibold">Batches</TableHead>
                    <TableHead className="font-semibold">Capacity</TableHead>
                    <TableHead className="font-semibold">Students</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClasses.map((cls) => (
                    <TableRow key={cls._id} className="hover:bg-muted/50">
  <TableCell className="font-medium">{cls.class_name}</TableCell>
<TableCell>
  {cls.class_level ? (
    <Badge variant="secondary" className="text-xs font-medium">{cls.class_level}</Badge>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  )}
</TableCell>
                    <TableCell>
  <div className="flex items-center gap-1 flex-wrap">
    {cls.batches.length === 0 ? (
      <span className="text-xs text-muted-foreground">No batches</span>
    ) : (
      <>
        {cls.batches.slice(0, 2).map((batch) => (
          <Badge key={batch._id} variant="outline" className="text-xs whitespace-nowrap">
            {batch.batch_name}
            <span className="ml-1 text-muted-foreground">{formatTime(batch.start_time)}–{formatTime(batch.end_time)}</span>
          </Badge>
        ))}
        {cls.batches.length > 2 && (
          <Popover>
            <PopoverTrigger asChild>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-slate-200">
                +{cls.batches.length - 2} more
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <p className="text-xs font-semibold text-muted-foreground mb-2">All Batches</p>
              <div className="space-y-1.5">
                {cls.batches.map((batch) => (
                  <div key={batch._id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/40">
                    <span className="font-medium">{batch.batch_name}</span>
                    <span className="text-muted-foreground">{formatTime(batch.start_time)}–{formatTime(batch.end_time)}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </>
    )}
  </div>
</TableCell>
                      <TableCell>{cls.totalCapacity > 0 ? cls.totalCapacity : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cls.totalStudents}</span>
                          {cls.totalCapacity > 0 && (
                            <span className="text-xs text-muted-foreground">/ {cls.totalCapacity}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClass(cls)
                              resetAddBatchForm()
                              setIsAddBatchDialogOpen(true)
                            }}
                            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-800"
                            title="Add Batch"
                          >
                            <PlusCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingClass(cls)
                              setIsViewDialogOpen(true)
                            }}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                            title="View Class"
                          >
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClass(cls)
                              setEditClassName(cls.class_name)
                              setEditClassError(null)
                              resetEditBatchInline()
                              setIsEditDialogOpen(true)
                            }}
                            className="h-8 w-8 p-0 hover:bg-violet-100 hover:text-violet-700"
                            title="Edit Class"
                          >
                            <Edit className="h-4 w-4 text-violet-500" />
                          </Button>

<Button
  variant="ghost"
  size="sm"
  onClick={() => handleDeleteClass(cls._id)}
  disabled={deletingClassId === cls._id}
  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
  title="Delete Class"
>
  {deletingClassId === cls._id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
</Button>


                 
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Classes cards – Mobile ── */}
      {classes.length > 0 && (
        <div className="md:hidden space-y-3">
          {paginatedClasses.map((cls) => (
            <Card key={cls._id} className="border-2">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{cls.class_name}</h3>
                      {cls.class_level && (
                        <p className="text-xs text-muted-foreground">Level {cls.class_level}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {cls.totalStudents} / {cls.totalCapacity > 0 ? cls.totalCapacity : '—'} Students
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {cls.batches.length} {cls.batches.length === 1 ? 'Batch' : 'Batches'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cls.batches.map((batch) => (
                      <Badge key={batch._id} variant="outline" className="text-xs">
                        {batch.batch_name} · {formatTime(batch.start_time)}–{formatTime(batch.end_time)}
                        {batch.capacity ? ` (${batch.studentCount}/${batch.capacity})` : ''}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClass(cls)
                        resetAddBatchForm()
                        setIsAddBatchDialogOpen(true)
                      }}
                      className="flex-1 text-xs gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Batch
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewingClass(cls)
                        setIsViewDialogOpen(true)
                      }}
                      className="flex-1 text-xs gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClass(cls)
                        setEditClassName(cls.class_name)
                        setEditClassError(null)
                        resetEditBatchInline()
                        setIsEditDialogOpen(true)
                      }}
                      className="flex-1 text-xs gap-1"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClass(cls._id)}
                      disabled={deletingClassId === cls._id}
                      className="text-xs text-red-600 hover:bg-red-100 hover:text-red-800"
                    >
                      {deletingClassId === cls._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {classes.length > 7 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Rows:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1) }}
                  >
                    <SelectTrigger className="w-[65px] sm:w-[75px] h-8 sm:h-9 border-2 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-xs sm:text-sm font-medium">
                  {startIndex + 1}–{Math.min(endIndex, classes.length)} of {classes.length}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
                  <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 border-2 gap-2">
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline text-sm">Previous</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages <= 3 ? totalPages : 3, totalPages) }, (_, i) => {
                    let pageNumber: number
                    if (totalPages <= 3) pageNumber = i + 1
                    else if (currentPage <= 2) pageNumber = i + 1
                    else if (currentPage >= totalPages - 1) pageNumber = totalPages - 2 + i
                    else pageNumber = currentPage - 1 + i
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 font-semibold text-xs sm:text-sm ${
                          currentPage === pageNumber
                            ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent'
                            : 'bg-transparent hover:bg-[#1897C6]/10'
                        }`}
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 border-2 gap-2">
                  <span className="hidden sm:inline text-sm">Next</span>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
                  <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ────────────────────────────── DIALOGS ──────────────────────────────── */}

      {/* Create Class Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => { if (!open) resetCreateForm(); setIsCreateDialogOpen(open) }}
      >
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create New Class</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Add a new class with optional batches
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {createError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="className" className="text-sm">
                Class Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="className"
                placeholder="e.g. 10th Grade, Mathematics, JEE Batch"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="h-9 sm:h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classLevel" className="text-sm">
                Class Level <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="classLevel"
                placeholder="e.g. 10, 11, 12"
                value={newClassLevel}
                onChange={(e) => setNewClassLevel(e.target.value)}
                className="h-9 sm:h-10"
              />
              <p className="text-xs text-muted-foreground">Numeric level for this class (used for subject mapping)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academicYear" className="text-sm">
                Academic Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="academicYear"
                placeholder="e.g. 2025-26"
                value={newAcademicYear}
                onChange={(e) => setNewAcademicYear(e.target.value)}
                className="h-9 sm:h-10"
              />
              <p className="text-xs text-muted-foreground">
                Pre-filled based on current date. You can change it if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classCapacity" className="text-sm">
                Class Capacity <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="classCapacity"
                type="number"
                min={1}
                placeholder="Overall class capacity (if no batches)"
                value={newClassCapacity}
                onChange={(e) => setNewClassCapacity(e.target.value)}
                className="h-9 sm:h-10"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you are adding batches with individual capacities
              </p>
            </div>

            {/* Batches */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="text-sm">
                  Batches <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNewBatches([...newBatches, { name: '', startTime: '', endTime: '', capacity: '' }])
                  }
                  className="gap-2 w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Add Batch
                </Button>
              </div>

              {newBatches.map((batch, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Batch {index + 1}</span>
                    {newBatches.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewBatches(newBatches.filter((_, i) => i !== index))}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Batch name (e.g. Morning Batch)"
                      value={batch.name}
                      onChange={(e) => {
                        const updated = [...newBatches]
                        updated[index].name = e.target.value
                        setNewBatches(updated)
                      }}
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Capacity (optional)"
                      value={batch.capacity}
                      onChange={(e) => {
                        const updated = [...newBatches]
                        updated[index].capacity = e.target.value
                        setNewBatches(updated)
                      }}
                      className="h-9 text-sm"
                    />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Start Time</Label>
                      <Input
                        type="time"
                        value={batch.startTime}
                        onChange={(e) => {
                          const updated = [...newBatches]
                          updated[index].startTime = e.target.value
                          setNewBatches(updated)
                        }}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">End Time</Label>
                      <Input
                        type="time"
                        value={batch.endTime}
                        onChange={(e) => {
                          const updated = [...newBatches]
                          updated[index].endTime = e.target.value
                          setNewBatches(updated)
                        }}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClass}
              disabled={createLoading}
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto gap-2"
            >
              {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {createLoading ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) { resetEditBatchInline(); setEditClassError(null) }
          setIsEditDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Class — {selectedClass?.class_name}</DialogTitle>
            <DialogDescription>Update class name or manage batches</DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <div className="space-y-5 py-4">

              {/* Edit class name */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Class Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    placeholder="Enter class name"
                    className="h-9 sm:h-10 flex-1"
                  />
                  <Button
                    onClick={handleEditClassName}
                    disabled={editClassLoading}
                    size="sm"
                    className="h-9 sm:h-10 px-4 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-2"
                  >
                    {editClassLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {editClassLoading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                {editClassError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {editClassError}
                  </p>
                )}
              </div>

              {/* Batches */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-semibold">Batches</Label>

                {selectedClass.batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg">
                    No batches added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedClass.batches.map((batch) => (
                      <div key={batch._id} className="flex items-center gap-2 p-3 border rounded-lg">
                        {/* {editingBatchId === batch._id ? (
                          <div className="flex-1 space-y-1">
                            <div className="flex gap-2">
                              <Input
                                value={editingBatchName}
                                onChange={(e) => setEditingBatchName(e.target.value)}
                                placeholder="Batch name"
                                className="h-8 text-sm flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleEditBatchName(batch._id)}
                                disabled={editingBatchLoading}
                                className="h-8 px-3 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-1"
                              >
                                {editingBatchLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={resetEditBatchInline}
                                disabled={editingBatchLoading}
                                className="h-8 px-2 hover:bg-slate-200 hover:text-slate-900"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            {editingBatchError && (
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {editingBatchError}
                              </p>
                            )}
                          </div>
                        ) : ( */}
                        {editingBatchId === batch._id ? (
  <div className="flex-1 space-y-2">
    <Input
      value={editingBatchName}
      onChange={(e) => setEditingBatchName(e.target.value)}
      placeholder="Batch name"
      className="h-8 text-sm w-full"
      autoFocus
    />
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Start Time</Label>
        <Input
          type="time"
          value={editingBatchStartTime}
          onChange={(e) => setEditingBatchStartTime(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">End Time</Label>
        <Input
          type="time"
          value={editingBatchEndTime}
          onChange={(e) => setEditingBatchEndTime(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
    </div>
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => handleEditBatchName(batch._id)}
        disabled={editingBatchLoading}
        className="h-8 px-3 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-1"
      >
        {editingBatchLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        {editingBatchLoading ? 'Saving...' : 'Save'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={resetEditBatchInline}
        disabled={editingBatchLoading}
        className="h-8 px-2 hover:bg-slate-200 hover:text-slate-900"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
    {editingBatchError && (
      <p className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> {editingBatchError}
      </p>
    )}
  </div>
) : (
                          <>
                            <div className="flex-1">
                              <div className="font-medium">{batch.batch_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatTime(batch.start_time)} – {formatTime(batch.end_time)}
                                {batch.capacity
                                  ? ` · ${batch.studentCount} / ${batch.capacity} students`
                                  : batch.studentCount > 0
                                  ? ` · ${batch.studentCount} students`
                                  : ''}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              // onClick={() => {
                              //   resetEditBatchInline()
                              //   setEditingBatchId(batch._id)
                              //   setEditingBatchName(batch.batch_name)
                              // }}
                              onClick={() => {
                                resetEditBatchInline()
                                setEditingBatchId(batch._id)
                                setEditingBatchName(batch.batch_name)
                                setEditingBatchStartTime(batch.start_time)
                                setEditingBatchEndTime(batch.end_time)
                              }}
                              className="h-8 w-8 p-0 hover:bg-slate-200 hover:text-slate-900"
                              title="Edit batch name"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBatch(selectedClass._id, batch._id)}
                              disabled={deletingBatchId === batch._id}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                              title="Delete batch"
                            >
                              {deletingBatchId === batch._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Class Subject Schedule ── */}
              <ClassSubjectScheduleManager
                selectedClass={selectedClass}
                onActionError={(msg) => setActionError(msg)}
              />

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Batch Dialog */}
      <Dialog
        open={isAddBatchDialogOpen}
        onOpenChange={(open) => { if (!open) resetAddBatchForm(); setIsAddBatchDialogOpen(open) }}
      >
        <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Add Batch to {selectedClass?.class_name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Create a new batch for this class
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {addBatchError && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {addBatchError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="batchName" className="text-sm">
                Batch Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="batchName"
                placeholder="e.g. Morning Batch, Evening Batch"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="h-9 sm:h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="batchStartTime" className="text-sm">
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="batchStartTime"
                  type="time"
                  value={newBatchStartTime}
                  onChange={(e) => setNewBatchStartTime(e.target.value)}
                  className="h-9 sm:h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchEndTime" className="text-sm">
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="batchEndTime"
                  type="time"
                  value={newBatchEndTime}
                  onChange={(e) => setNewBatchEndTime(e.target.value)}
                  className="h-9 sm:h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchCapacity" className="text-sm">
                Capacity <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="batchCapacity"
                type="number"
                min={1}
                placeholder="Enter batch capacity"
                value={newBatchCapacity}
                onChange={(e) => setNewBatchCapacity(e.target.value)}
                className="h-9 sm:h-10"
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddBatchDialogOpen(false)}
              disabled={addBatchLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBatch}
              disabled={addBatchLoading}
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto gap-2"
            >
              {addBatchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {addBatchLoading ? 'Adding...' : 'Add Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Error Banner */}
      {actionError && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-4 bg-white border border-red-200 rounded-lg shadow-lg max-w-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 flex-1">{actionError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionError(null)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

     {/* View Class Dialog */}
      <Dialog
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          if (!open) setViewingClass(null)
          setIsViewDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Eye className="h-5 w-5 text-[#1897C6]" />
              {viewingClass?.class_name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Class details, batches and schedule — read only
            </DialogDescription>
          </DialogHeader>

          {viewingClass && (
            <div className="space-y-5 py-3">

              {/* Class Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
                  <p className="text-xs text-muted-foreground">Class Name</p>
                  <p className="text-sm font-semibold">{viewingClass.class_name}</p>
                </div>
                {viewingClass.class_level && (
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="text-sm font-semibold">{viewingClass.class_level}</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total Students</p>
                  <p className="text-sm font-semibold">
                    {viewingClass.totalStudents}
                    {viewingClass.totalCapacity > 0 && (
                      <span className="text-muted-foreground font-normal"> / {viewingClass.totalCapacity}</span>
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total Batches</p>
                  <p className="text-sm font-semibold">{viewingClass.batches.length}</p>
                </div>
                {viewingClass.totalCapacity > 0 && (
                  <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
                    <p className="text-xs text-muted-foreground">Fill Rate</p>
                    <p className="text-sm font-semibold">
                      {Math.round((viewingClass.totalStudents / viewingClass.totalCapacity) * 100)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Batches */}
              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#1897C6]" />
                  Batches
                </Label>
                {viewingClass.batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
                    No batches added yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {viewingClass.batches.map((batch) => (
                      <div
                        key={batch._id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                      >
                        <div>
                          <p className="text-sm font-medium">{batch.batch_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTime(batch.start_time)} – {formatTime(batch.end_time)}
                            {batch.capacity
                              ? ` · ${batch.studentCount} / ${batch.capacity} students`
                              : batch.studentCount > 0
                              ? ` · ${batch.studentCount} students`
                              : ''}
                          </p>
                        </div>
                        {batch.capacity && batch.capacity > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            {Math.round((batch.studentCount / batch.capacity) * 100)}% full
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule — read only via ClassSubjectScheduleManager */}
              <ClassSubjectScheduleManager
                selectedClass={viewingClass}
                onActionError={() => {}}
                readOnly
              />

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-sm mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDialog.onConfirm}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
















































































// 'use client'

// import { useState, useEffect, useCallback } from 'react'
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from '@/components/ui/dialog'
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table'
// import {
//   BookOpen,
//   Plus,
//   Edit,
//   Eye,
//   Trash2,
//   Users,
//   PlusCircle,
//   X,
//   ChevronLeft,
//   ChevronRight,
//   ChevronsLeft,
//   ChevronsRight,
//   Loader2,
//   AlertCircle,
//   Check,
//   Clock,
// } from 'lucide-react'
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { classesApi, ClassMaster, CoachingBatch } from '@/lib/api/classes'
// import ClassSubjectScheduleManager from './ClassSubjectSchedule'
// import { studentsApi } from '@/lib/api/students'


// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getCurrentAcademicYear = (): string => {
//   const now = new Date()
//   const year = now.getFullYear()
//   const month = now.getMonth() + 1
//   return month >= 4
//     ? `${year}-${String(year + 1).slice(2)}`
//     : `${year - 1}-${String(year).slice(2)}`
// }

// const getInstituteId = (): string => {
//   if (typeof window === 'undefined') return ''
//   return localStorage.getItem('instituteId') || ''
// }

// const isValidAcademicYear = (value: string): boolean =>
//   /^\d{4}-\d{2}$/.test(value.trim())

// const isValidTime = (value: string): boolean =>
//   /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())

// const formatTime = (time: string): string => {
//   if (!time) return ''
//   const [h, m] = time.split(':')
//   const hour = parseInt(h, 10)
//   const ampm = hour >= 12 ? 'PM' : 'AM'
//   const displayHour = hour % 12 === 0 ? 12 : hour % 12
//   return `${displayHour}:${m} ${ampm}`
// }

// // ─── Types ─────────────────────────────────────────────────────────────────────

// interface BatchEnriched extends CoachingBatch {
//   _id: string
//   studentCount: number
// }

// interface ClassEnriched extends ClassMaster {
//   batches: BatchEnriched[]
//   totalCapacity: number
//   totalStudents: number
// }

// // ─── Sorting helpers ──────────────────────────────────────────────────────────

// const sortClasses = (list: ClassEnriched[]): ClassEnriched[] =>
//   [...list].sort((a, b) => {
//     const aNum = parseInt(a.class_name, 10)
//     const bNum = parseInt(b.class_name, 10)
//     if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
//     return a.class_name.localeCompare(b.class_name)
//   })

// const sortBatches = (batches: BatchEnriched[]): BatchEnriched[] =>
//   [...batches].sort((a, b) => a.batch_name.localeCompare(b.batch_name))

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function ClassesPage() {
//   // ── Data state ───────────────────────────────────────────────────────────────
//   const [classes, setClasses] = useState<ClassEnriched[]>([])
//   const [loading, setLoading] = useState(true)
//   const [pageError, setPageError] = useState<string | null>(null)

//   // ── Dialog visibility ────────────────────────────────────────────────────────
//   const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
//   const [isAddBatchDialogOpen, setIsAddBatchDialogOpen] = useState(false)
//   const [selectedClass, setSelectedClass] = useState<ClassEnriched | null>(null)
// const [viewingClass, setViewingClass] = useState<ClassEnriched | null>(null)
// const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

//   // ── Create class form ────────────────────────────────────────────────────────
//   const [newClassName, setNewClassName] = useState('')
//   const [newClassCapacity, setNewClassCapacity] = useState('')
//   const [newClassLevel, setNewClassLevel] = useState('')
//   const [newAcademicYear, setNewAcademicYear] = useState(getCurrentAcademicYear())
//   const [newBatches, setNewBatches] = useState<Array<{ name: string; startTime: string; endTime: string; capacity: string }>>([
//     { name: '', startTime: '', endTime: '', capacity: '' },
//   ])
//   const [createLoading, setCreateLoading] = useState(false)
//   const [createError, setCreateError] = useState<string | null>(null)

//   // ── Edit class name ──────────────────────────────────────────────────────────
//   const [editClassName, setEditClassName] = useState('')
//   const [editClassLoading, setEditClassLoading] = useState(false)
//   const [editClassError, setEditClassError] = useState<string | null>(null)

//   // ── Edit batch inline ─────────────────────────────────────────────────────────
//   const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
//   const [editingBatchName, setEditingBatchName] = useState('')
//   const [editingBatchLoading, setEditingBatchLoading] = useState(false)
//   const [editingBatchError, setEditingBatchError] = useState<string | null>(null)

//   // ── Add batch form ────────────────────────────────────────────────────────────
//   const [newBatchName, setNewBatchName] = useState('')
//   const [newBatchStartTime, setNewBatchStartTime] = useState('')
//   const [newBatchEndTime, setNewBatchEndTime] = useState('')
//   const [newBatchCapacity, setNewBatchCapacity] = useState('')
//   const [addBatchLoading, setAddBatchLoading] = useState(false)
//   const [addBatchError, setAddBatchError] = useState<string | null>(null)

//   // ── Delete trackers ──────────────────────────────────────────────────────────
//   const [deletingClassId, setDeletingClassId] = useState<string | null>(null)
//   const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)

//   // ── Action error banner ──────────────────────────────────────────────────────
//   const [actionError, setActionError] = useState<string | null>(null)

//   // ── Custom confirm dialog ────────────────────────────────────────────────────
//   const [confirmDialog, setConfirmDialog] = useState<{
//     open: boolean
//     title: string
//     description: string
//     onConfirm: () => void
//   }>({ open: false, title: '', description: '', onConfirm: () => {} })

//   // ── Pagination ───────────────────────────────────────────────────────────────
//   const [currentPage, setCurrentPage] = useState(1)
//   const [itemsPerPage, setItemsPerPage] = useState(7)

//   // ─── Fetch all classes ────────────────────────────────────────────────────────

//   const fetchClasses = useCallback(async () => {
//     const instituteId = getInstituteId()
//     if (!instituteId) {
//       setPageError('Institute information not found. Please log in again.')
//       setLoading(false)
//       return
//     }

//     try {
//       setLoading(true)
//       setPageError(null)

//       // class_type=coaching is passed internally by classesApi.getAll
//       const res = await classesApi.getAll({ instituteId, status: 'active' })

//       if (!res.success || !Array.isArray(res.result)) {
//         throw new Error(res.message || 'Failed to load classes.')
//       }

//       const rawClasses: ClassMaster[] = res.result
//       console.log('[Classes] Fetched classes count:', rawClasses.length)

//       const enriched: ClassEnriched[] = await Promise.all(
//         rawClasses.map(async (cls) => {
//           try {
//             const [batchesRes, studentsRes] = await Promise.all([
//               classesApi.getBatchesByClass(cls._id),
//               studentsApi.getStudentsByClass(cls._id),
//             ])

//             const rawBatches: CoachingBatch[] = batchesRes.result || []
//             const allMappings = studentsRes.result || []

//             const batches: BatchEnriched[] = sortBatches(
//               rawBatches
//                 .filter((b): b is CoachingBatch & { _id: string } => !!b._id)
//                 .map((b) => ({
//                   ...b,
//                   _id: b._id!,
//                   studentCount: allMappings.filter((m) => m.batch_id === b._id).length,
//                 }))
//             )

//             const totalStudents = allMappings.length
//             const totalCapacity =
//               batches.length > 0
//                 ? batches.reduce((sum, b) => sum + (b.capacity || 0), 0)
//                 : cls.class_capacity || 0

//             return { ...cls, batches, totalCapacity, totalStudents }
//           } catch (enrichErr) {
//             console.error(`[Classes] Failed to enrich class ${cls._id}:`, enrichErr)
//             return { ...cls, batches: [], totalCapacity: cls.class_capacity || 0, totalStudents: 0 }
//           }
//         })
//       )

//       setClasses(sortClasses(enriched))
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : 'Failed to load classes.'
//       console.error('[Classes] fetchClasses error:', err)
//       setPageError(msg)
//     } finally {
//       setLoading(false)
//     }
//   }, [])

//   useEffect(() => {
//     fetchClasses()
//   }, [fetchClasses])

//   useEffect(() => {
//     if (actionError) {
//       const t = setTimeout(() => setActionError(null), 5000)
//       return () => clearTimeout(t)
//     }
//   }, [actionError])

//   // ─── Reset helpers ────────────────────────────────────────────────────────────

//   const resetCreateForm = () => {
//     setNewClassName('')
//     setNewClassCapacity('')
//     setNewClassLevel('')
//     setNewAcademicYear(getCurrentAcademicYear())
//     setNewBatches([{ name: '', startTime: '', endTime: '', capacity: '' }])
//     setCreateError(null)
//   }

//   const resetAddBatchForm = () => {
//     setNewBatchName('')
//     setNewBatchStartTime('')
//     setNewBatchEndTime('')
//     setNewBatchCapacity('')
//     setAddBatchError(null)
//   }

//   const resetEditBatchInline = () => {
//     setEditingBatchId(null)
//     setEditingBatchName('')
//     setEditingBatchError(null)
//   }

//   // ─── Create class ─────────────────────────────────────────────────────────────

//   const handleCreateClass = async () => {
//     if (!newClassName.trim()) {
//       setCreateError('Class name is required.')
//       return
//     }
//     if (!newAcademicYear.trim() || !isValidAcademicYear(newAcademicYear)) {
//       setCreateError('Academic year must be in format YYYY-YY (e.g. 2025-26).')
//       return
//     }
//     if (newClassCapacity && parseInt(newClassCapacity, 10) < 1) {
//       setCreateError('Class capacity must be at least 1.')
//       return
//     }

//     // Validate batches that have any data filled
//     const filledBatches = newBatches.filter(
//       (b) => b.name.trim() || b.startTime || b.endTime || b.capacity
//     )
//     for (const b of filledBatches) {
//       if (!b.name.trim()) { setCreateError('Batch name is required for all batches.'); return }
//       if (!b.startTime) { setCreateError(`Start time is required for batch "${b.name}".`); return }
//       if (!b.endTime) { setCreateError(`End time is required for batch "${b.name}".`); return }
//       if (!isValidTime(b.startTime)) { setCreateError(`Invalid start time for batch "${b.name}". Use HH:MM format.`); return }
//       if (!isValidTime(b.endTime)) { setCreateError(`Invalid end time for batch "${b.name}". Use HH:MM format.`); return }
//       if (b.startTime >= b.endTime) { setCreateError(`End time must be after start time for batch "${b.name}".`); return }
//       if (b.capacity && parseInt(b.capacity, 10) < 1) { setCreateError(`Batch capacity must be at least 1 for "${b.name}".`); return }
//     }

//     const instituteId = getInstituteId()
//     if (!instituteId) {
//       setCreateError('Institute information not found. Please log in again.')
//       return
//     }

//     setCreateLoading(true)
//     setCreateError(null)

//     try {
//       const payload = {
//         institute_id: instituteId,
//         class_name: newClassName.trim(),
//         class_type: 'coaching' as const,
//         academic_year: newAcademicYear.trim(),
//         class_capacity: newClassCapacity ? parseInt(newClassCapacity, 10) : null,
//         class_level: newClassLevel.trim() || null,
//       }

//       console.log('[Classes] Creating class:', payload)
//       const res = await classesApi.create(payload)

//       if (!res.success || !res.result) throw new Error(res.message || 'Failed to create class.')

//       const createdClass = res.result
//       console.log('[Classes] Class created:', createdClass._id)

//       const validBatches = filledBatches
//       const createdBatches: BatchEnriched[] = []

//       for (const b of validBatches) {
//         try {
//           const batchRes = await classesApi.createBatch({
//             class_id: createdClass._id,
//             batch_name: b.name.trim(),
//             start_time: b.startTime,
//             end_time: b.endTime,
//             capacity: b.capacity ? parseInt(b.capacity, 10) : null,
//           })
//           if (batchRes.success && batchRes.result && batchRes.result._id) {
//             createdBatches.push({ ...batchRes.result, _id: batchRes.result._id, studentCount: 0 })
//             console.log('[Classes] Batch created:', batchRes.result._id)
//           } else {
//             console.warn('[Classes] Batch creation returned no result for:', b.name)
//           }
//         } catch (batchErr) {
//           console.error('[Classes] Batch creation failed for:', b.name, batchErr)
//         }
//       }

//       const totalCapacity =
//         createdBatches.length > 0
//           ? createdBatches.reduce((sum, b) => sum + (b.capacity || 0), 0)
//           : createdClass.class_capacity || 0

//       setClasses((prev) =>
//         sortClasses([
//           {
//             ...createdClass,
//             batches: sortBatches(createdBatches),
//             totalCapacity,
//             totalStudents: 0,
//           },
//           ...prev,
//         ])
//       )
//       setIsCreateDialogOpen(false)
//       resetCreateForm()
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : 'Failed to create class.'
//       console.error('[Classes] handleCreateClass error:', err)
//       setCreateError(msg)
//     } finally {
//       setCreateLoading(false)
//     }
//   }

//   // ─── Edit class name ──────────────────────────────────────────────────────────

//   const handleEditClassName = async () => {
//     if (!selectedClass) return
//     if (!editClassName.trim()) { setEditClassError('Class name is required.'); return }
//     if (editClassName.trim() === selectedClass.class_name) { setEditClassError('No changes made.'); return }

//     setEditClassLoading(true)
//     setEditClassError(null)

//     try {
//       console.log('[Classes] Updating class name:', selectedClass._id)
//       const res = await classesApi.update(selectedClass._id, { class_name: editClassName.trim() })

//       if (!res.success || !res.result) throw new Error(res.message || 'Failed to update class name.')

//       console.log('[Classes] Class name updated:', res.result._id)

//       const updatedClass: ClassEnriched = { ...selectedClass, class_name: res.result.class_name }
//       setClasses((prev) => sortClasses(prev.map((cls) => (cls._id === selectedClass._id ? updatedClass : cls))))
//       setSelectedClass(updatedClass)
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : 'Failed to update class name.'
//       console.error('[Classes] handleEditClassName error:', err)
//       setEditClassError(msg)
//     } finally {
//       setEditClassLoading(false)
//     }
//   }

//   // ─── Edit batch name inline ───────────────────────────────────────────────────

//   const handleEditBatchName = async (batchId: string) => {
//     if (!selectedClass) return
//     if (!editingBatchName.trim()) { setEditingBatchError('Batch name is required.'); return }

//     const original = selectedClass.batches.find((b) => b._id === batchId)
//     if (original && editingBatchName.trim() === original.batch_name) {
//       resetEditBatchInline()
//       return
//     }

//     setEditingBatchLoading(true)
//     setEditingBatchError(null)

//     try {
//       console.log('[Classes] Updating batch name:', batchId)
//       const res = await classesApi.updateBatch(batchId, { batch_name: editingBatchName.trim() })

//       if (!res.success || !res.result) throw new Error(res.message || 'Failed to update batch name.')

//       console.log('[Classes] Batch name updated:', batchId)

//       const updateClass = (cls: ClassEnriched): ClassEnriched => {
//         if (cls._id !== selectedClass._id) return cls
//         return {
//           ...cls,
//           batches: cls.batches.map((b) =>
//             b._id === batchId ? { ...b, batch_name: res.result!.batch_name ?? editingBatchName.trim() } : b
//           ),
//         }
//       }

//       setClasses((prev) => prev.map(updateClass))
//       setSelectedClass((prev) => (prev ? updateClass(prev) : null))
//       resetEditBatchInline()
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : 'Failed to update batch name.'
//       console.error('[Classes] handleEditBatchName error:', err)
//       setEditingBatchError(msg)
//     } finally {
//       setEditingBatchLoading(false)
//     }
//   }

//   // ─── Add batch ────────────────────────────────────────────────────────────────

//   const handleAddBatch = async () => {
//     if (!selectedClass) return
//     if (!newBatchName.trim()) { setAddBatchError('Batch name is required.'); return }
//     if (!newBatchStartTime) { setAddBatchError('Start time is required.'); return }
//     if (!newBatchEndTime) { setAddBatchError('End time is required.'); return }
//     if (!isValidTime(newBatchStartTime)) { setAddBatchError('Invalid start time. Use HH:MM format (e.g. 09:00).'); return }
//     if (!isValidTime(newBatchEndTime)) { setAddBatchError('Invalid end time. Use HH:MM format (e.g. 11:00).'); return }
//     if (newBatchStartTime >= newBatchEndTime) { setAddBatchError('End time must be after start time.'); return }
//     if (newBatchCapacity && parseInt(newBatchCapacity, 10) < 1) { setAddBatchError('Capacity must be at least 1.'); return }

//     setAddBatchLoading(true)
//     setAddBatchError(null)

//     try {
//       const payload = {
//         class_id: selectedClass._id,
//         batch_name: newBatchName.trim(),
//         start_time: newBatchStartTime,
//         end_time: newBatchEndTime,
//         capacity: newBatchCapacity ? parseInt(newBatchCapacity, 10) : null,
//       }

//       console.log('[Classes] Adding batch:', payload)
//       const res = await classesApi.createBatch(payload)

//       if (!res.success || !res.result || !res.result._id) {
//         throw new Error(res.message || 'Failed to add batch.')
//       }

//       const newBatch: BatchEnriched = { ...res.result, _id: res.result._id, studentCount: 0 }
//       console.log('[Classes] Batch added:', newBatch._id)

//       setClasses((prev) =>
//         prev.map((cls) => {
//           if (cls._id !== selectedClass._id) return cls
//           const updatedBatches = sortBatches([...cls.batches, newBatch])
//           return {
//             ...cls,
//             batches: updatedBatches,
//             totalCapacity: cls.totalCapacity + (newBatch.capacity || 0),
//           }
//         })
//       )

//       setIsAddBatchDialogOpen(false)
//       resetAddBatchForm()
//       setSelectedClass(null)
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : 'Failed to add batch.'
//       console.error('[Classes] handleAddBatch error:', err)
//       setAddBatchError(msg)
//     } finally {
//       setAddBatchLoading(false)
//     }
//   }

//   // ─── Delete class ─────────────────────────────────────────────────────────────

//   const handleDeleteClass = (classId: string) => {
//     setConfirmDialog({
//       open: true,
//       title: 'Delete Class',
//       description: 'Are you sure you want to delete this class? This action cannot be undone.',
//       onConfirm: async () => {
//         setConfirmDialog((prev) => ({ ...prev, open: false }))
//         setDeletingClassId(classId)
//         try {
//           console.log('[Classes] Deleting class:', classId)
//           const res = await classesApi.delete(classId)
//           if (!res.success) throw new Error(res.message || 'Failed to delete class.')
//           console.log('[Classes] Class deleted:', classId)
//           setClasses((prev) => {
//             const updated = prev.filter((cls) => cls._id !== classId)
//             const newTotalPages = Math.ceil(updated.length / itemsPerPage)
//             if (currentPage > newTotalPages && newTotalPages > 0) setCurrentPage(newTotalPages)
//             return updated
//           })
//         } catch (err: unknown) {
//           const msg = err instanceof Error ? err.message : 'Failed to delete class.'
//           console.error('[Classes] handleDeleteClass error:', err)
//           setActionError(msg)
//         } finally {
//           setDeletingClassId(null)
//         }
//       },
//     })
//   }

//   // ─── Delete batch ─────────────────────────────────────────────────────────────

//   const handleDeleteBatch = (classId: string, batchId: string) => {
//     setConfirmDialog({
//       open: true,
//       title: 'Delete Batch',
//       description: 'Are you sure you want to delete this batch? This action cannot be undone.',
//       onConfirm: async () => {
//         setConfirmDialog((prev) => ({ ...prev, open: false }))
//         setDeletingBatchId(batchId)
//         try {
//           console.log('[Classes] Deleting batch:', batchId)
//           const res = await classesApi.deleteBatch(batchId)
//           if (!res.success) throw new Error(res.message || 'Failed to delete batch.')
//           console.log('[Classes] Batch deleted:', batchId)

//           const updateClass = (cls: ClassEnriched): ClassEnriched => {
//             if (cls._id !== classId) return cls
//             const updatedBatches = cls.batches.filter((b) => b._id !== batchId)
//             return {
//               ...cls,
//               batches: updatedBatches,
//               totalCapacity: updatedBatches.reduce((sum, b) => sum + (b.capacity || 0), 0),
//               totalStudents: updatedBatches.reduce((sum, b) => sum + b.studentCount, 0),
//             }
//           }

//           setClasses((prev) => prev.map(updateClass))
//           if (selectedClass?._id === classId) {
//             setSelectedClass((prev) => (prev ? updateClass(prev) : null))
//           }
//         } catch (err: unknown) {
//           const msg = err instanceof Error ? err.message : 'Failed to delete batch.'
//           console.error('[Classes] handleDeleteBatch error:', err)
//           setActionError(msg)
//         } finally {
//           setDeletingBatchId(null)
//         }
//       },
//     })
//   }

//   // ─── Derived stats ────────────────────────────────────────────────────────────

//   const totalClasses = classes.length
//   const totalBatches = classes.reduce((sum, cls) => sum + cls.batches.length, 0)
//   const totalCapacity = classes.reduce((sum, cls) => sum + cls.totalCapacity, 0)
//   const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0)

//   const totalPages = Math.ceil(classes.length / itemsPerPage)
//   const startIndex = (currentPage - 1) * itemsPerPage
//   const endIndex = startIndex + itemsPerPage
//   const paginatedClasses = classes.slice(startIndex, endIndex)

//   // ─── Loading / Error screens ──────────────────────────────────────────────────

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-[400px]">
//         <div className="flex flex-col items-center gap-3">
//           <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
//           <p className="text-sm text-muted-foreground">Loading classes...</p>
//         </div>
//       </div>
//     )
//   }

//   if (pageError) {
//     return (
//       <div className="flex items-center justify-center min-h-[400px] p-4">
//         <div className="flex flex-col items-center gap-3 max-w-sm text-center">
//           <AlertCircle className="h-8 w-8 text-red-500" />
//           <p className="text-sm font-medium text-red-600">{pageError}</p>
//           <Button variant="outline" onClick={fetchClasses} className="gap-2">
//             <Loader2 className="h-4 w-4" />
//             Try Again
//           </Button>
//         </div>
//       </div>
//     )
//   }

//   // ─── Main render ──────────────────────────────────────────────────────────────

//   return (
//     <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">

//       {/* ── Header ── */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
//         <div>
//           <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
//             Classes Management
//           </h1>
//           <p className="text-sm text-muted-foreground mt-0.5">Create and manage classes and batches</p>
//         </div>
//         <Button  
//           onClick={() => { resetCreateForm(); setIsCreateDialogOpen(true) }}
//           className="gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto"
//         >
//           <Plus className="h-4 w-4" />
//           Create New Class
//         </Button>
//       </div>

//       {/* ── Stats ── */}
//       <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
//         <Card className="border-2">
//           <CardContent className="p-4 sm:p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-xs sm:text-sm text-muted-foreground">Total Classes</p>
//                 <p className="text-xl sm:text-2xl font-bold mt-1">{totalClasses}</p>
//               </div>
//               <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white">
//                 <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="border-2">
//           <CardContent className="p-4 sm:p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-xs sm:text-sm text-muted-foreground">Total Batches</p>
//                 <p className="text-xl sm:text-2xl font-bold mt-1">{totalBatches}</p>
//               </div>
//               <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#67BAC3] to-[#1897C6] text-white">
//                 <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="border-2">
//           <CardContent className="p-4 sm:p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-xs sm:text-sm text-muted-foreground">Total Capacity</p>
//                 <p className="text-xl sm:text-2xl font-bold mt-1">{totalCapacity}</p>
//               </div>
//               <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white">
//                 <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="border-2">
//           <CardContent className="p-4 sm:p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-xs sm:text-sm text-muted-foreground">Total Students</p>
//                 <p className="text-xl sm:text-2xl font-bold mt-1">{totalStudents}</p>
//               </div>
//               <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D87331] to-[#D88931] text-white">
//                 <Users className="h-5 w-5 sm:h-6 sm:w-6" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* ── Empty state ── */}
//       {classes.length === 0 && (
//         <Card className="border-2">
//           <CardContent className="p-12 text-center">
//             <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
//             <p className="text-base font-medium text-muted-foreground">No classes found</p>
//             <p className="text-sm text-muted-foreground mt-1">Create your first class to get started</p>
//           </CardContent>
//         </Card>
//       )}

//       {/* ── Classes table – Desktop ── */}
//       {classes.length > 0 && (
//         <Card className="hidden md:block border-2">
//           <CardHeader className="p-4 sm:p-6">
//             <CardTitle className="text-lg sm:text-xl">All Classes</CardTitle>
//             <CardDescription className="text-xs sm:text-sm">Manage your classes and batches</CardDescription>
//           </CardHeader>
//           <CardContent className="p-0">
//             <div className="overflow-x-auto">
//               <Table>
//                 <TableHeader>
//                   <TableRow className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5">
//  <TableHead className="font-semibold">Class Name</TableHead>
// <TableHead className="font-semibold">Level</TableHead>
// <TableHead className="font-semibold">Batches</TableHead>
//                     <TableHead className="font-semibold">Capacity</TableHead>
//                     <TableHead className="font-semibold">Students</TableHead>
//                     <TableHead className="font-semibold text-right">Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {paginatedClasses.map((cls) => (
//                     <TableRow key={cls._id} className="hover:bg-muted/50">
//   <TableCell className="font-medium">{cls.class_name}</TableCell>
// <TableCell>
//   {cls.class_level ? (
//     <Badge variant="secondary" className="text-xs font-medium">{cls.class_level}</Badge>
//   ) : (
//     <span className="text-xs text-muted-foreground">—</span>
//   )}
// </TableCell>
//                     <TableCell>
//   <div className="flex items-center gap-1 flex-wrap">
//     {cls.batches.length === 0 ? (
//       <span className="text-xs text-muted-foreground">No batches</span>
//     ) : (
//       <>
//         {cls.batches.slice(0, 2).map((batch) => (
//           <Badge key={batch._id} variant="outline" className="text-xs whitespace-nowrap">
//             {batch.batch_name}
//             <span className="ml-1 text-muted-foreground">{formatTime(batch.start_time)}–{formatTime(batch.end_time)}</span>
//           </Badge>
//         ))}
//         {cls.batches.length > 2 && (
//           <Popover>
//             <PopoverTrigger asChild>
//               <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-slate-200">
//                 +{cls.batches.length - 2} more
//               </Badge>
//             </PopoverTrigger>
//             <PopoverContent className="w-72 p-3" align="start">
//               <p className="text-xs font-semibold text-muted-foreground mb-2">All Batches</p>
//               <div className="space-y-1.5">
//                 {cls.batches.map((batch) => (
//                   <div key={batch._id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/40">
//                     <span className="font-medium">{batch.batch_name}</span>
//                     <span className="text-muted-foreground">{formatTime(batch.start_time)}–{formatTime(batch.end_time)}</span>
//                   </div>
//                 ))}
//               </div>
//             </PopoverContent>
//           </Popover>
//         )}
//       </>
//     )}
//   </div>
// </TableCell>
//                       <TableCell>{cls.totalCapacity > 0 ? cls.totalCapacity : '—'}</TableCell>
//                       <TableCell>
//                         <div className="flex items-center gap-2">
//                           <span className="font-medium">{cls.totalStudents}</span>
//                           {cls.totalCapacity > 0 && (
//                             <span className="text-xs text-muted-foreground">/ {cls.totalCapacity}</span>
//                           )}
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center justify-end gap-1">
//                         <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => {
//                               setSelectedClass(cls)
//                               resetAddBatchForm()
//                               setIsAddBatchDialogOpen(true)
//                             }}
//                             className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-800"
//                             title="Add Batch"
//                           >
//                             <PlusCircle className="h-4 w-4 text-green-600" />
//                           </Button>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => {
//                               setViewingClass(cls)
//                               setIsViewDialogOpen(true)
//                             }}
//                             className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
//                             title="View Class"
//                           >
//                             <Eye className="h-4 w-4 text-blue-500" />
//                           </Button>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => {
//                               setSelectedClass(cls)
//                               setEditClassName(cls.class_name)
//                               setEditClassError(null)
//                               resetEditBatchInline()
//                               setIsEditDialogOpen(true)
//                             }}
//                             className="h-8 w-8 p-0 hover:bg-violet-100 hover:text-violet-700"
//                             title="Edit Class"
//                           >
//                             <Edit className="h-4 w-4 text-violet-500" />
//                           </Button>

// <Button
//   variant="ghost"
//   size="sm"
//   onClick={() => handleDeleteClass(cls._id)}
//   disabled={deletingClassId === cls._id}
//   className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
//   title="Delete Class"
// >
//   {deletingClassId === cls._id ? (
//     <Loader2 className="h-4 w-4 animate-spin" />
//   ) : (
//     <Trash2 className="h-4 w-4" />
//   )}
// </Button>


                 
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* ── Classes cards – Mobile ── */}
//       {classes.length > 0 && (
//         <div className="md:hidden space-y-3">
//           {paginatedClasses.map((cls) => (
//             <Card key={cls._id} className="border-2">
//               <CardContent className="p-4">
//                 <div className="space-y-3">
//                   <div className="flex items-start justify-between">
//                     <div>
//                       <h3 className="font-semibold text-base">{cls.class_name}</h3>
//                       {cls.class_level && (
//                         <p className="text-xs text-muted-foreground">Level {cls.class_level}</p>
//                       )}
//                       <p className="text-xs text-muted-foreground mt-1">
//                         {cls.totalStudents} / {cls.totalCapacity > 0 ? cls.totalCapacity : '—'} Students
//                       </p>
//                     </div>
//                     <Badge variant="secondary" className="text-xs">
//                       {cls.batches.length} {cls.batches.length === 1 ? 'Batch' : 'Batches'}
//                     </Badge>
//                   </div>
//                   <div className="flex flex-wrap gap-1.5">
//                     {cls.batches.map((batch) => (
//                       <Badge key={batch._id} variant="outline" className="text-xs">
//                         {batch.batch_name} · {formatTime(batch.start_time)}–{formatTime(batch.end_time)}
//                         {batch.capacity ? ` (${batch.studentCount}/${batch.capacity})` : ''}
//                       </Badge>
//                     ))}
//                   </div>
//                   <div className="flex gap-2 pt-2 border-t">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => {
//                         setSelectedClass(cls)
//                         resetAddBatchForm()
//                         setIsAddBatchDialogOpen(true)
//                       }}
//                       className="flex-1 text-xs gap-1"
//                     >
//                       <PlusCircle className="h-3.5 w-3.5" />
//                       Add Batch
//                     </Button>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => {
//                         setViewingClass(cls)
//                         setIsViewDialogOpen(true)
//                       }}
//                       className="flex-1 text-xs gap-1"
//                     >
//                       <Eye className="h-3.5 w-3.5" />
//                       View
//                     </Button>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => {
//                         setSelectedClass(cls)
//                         setEditClassName(cls.class_name)
//                         setEditClassError(null)
//                         resetEditBatchInline()
//                         setIsEditDialogOpen(true)
//                       }}
//                       className="flex-1 text-xs gap-1"
//                     >
//                       <Edit className="h-3.5 w-3.5" />
//                       Edit
//                     </Button>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={() => handleDeleteClass(cls._id)}
//                       disabled={deletingClassId === cls._id}
//                       className="text-xs text-red-600 hover:bg-red-100 hover:text-red-800"
//                     >
//                       {deletingClassId === cls._id ? (
//                         <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                       ) : (
//                         <Trash2 className="h-3.5 w-3.5" />
//                       )}
//                     </Button>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       )}

//       {/* ── Pagination ── */}
//       {classes.length > 7 && (
//         <Card>
//           <CardContent className="p-3 sm:p-4">
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
//               <div className="flex items-center justify-between sm:justify-start gap-3">
//                 <div className="flex items-center gap-2">
//                   <span className="text-xs sm:text-sm text-muted-foreground">Rows:</span>
//                   <Select
//                     value={itemsPerPage.toString()}
//                     onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1) }}
//                   >
//                     <SelectTrigger className="w-[65px] sm:w-[75px] h-8 sm:h-9 border-2 text-xs sm:text-sm">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="5">5</SelectItem>
//                       <SelectItem value="7">7</SelectItem>
//                       <SelectItem value="10">10</SelectItem>
//                       <SelectItem value="20">20</SelectItem>
//                       <SelectItem value="50">50</SelectItem>
//                       <SelectItem value="100">100</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <span className="text-xs sm:text-sm font-medium">
//                   {startIndex + 1}–{Math.min(endIndex, classes.length)} of {classes.length}
//                 </span>
//               </div>
//               <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
//                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
//                   <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                 </Button>
//                 <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 border-2 gap-2">
//                   <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                   <span className="hidden sm:inline text-sm">Previous</span>
//                 </Button>
//                 <div className="flex items-center gap-1">
//                   {Array.from({ length: Math.min(totalPages <= 3 ? totalPages : 3, totalPages) }, (_, i) => {
//                     let pageNumber: number
//                     if (totalPages <= 3) pageNumber = i + 1
//                     else if (currentPage <= 2) pageNumber = i + 1
//                     else if (currentPage >= totalPages - 1) pageNumber = totalPages - 2 + i
//                     else pageNumber = currentPage - 1 + i
//                     return (
//                       <Button
//                         key={pageNumber}
//                         variant={currentPage === pageNumber ? 'default' : 'outline'}
//                         size="sm"
//                         onClick={() => setCurrentPage(pageNumber)}
//                         className={`h-8 w-8 sm:h-9 sm:w-9 p-0 border-2 font-semibold text-xs sm:text-sm ${
//                           currentPage === pageNumber
//                             ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent'
//                             : 'bg-transparent hover:bg-[#1897C6]/10'
//                         }`}
//                       >
//                         {pageNumber}
//                       </Button>
//                     )
//                   })}
//                 </div>
//                 <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 border-2 gap-2">
//                   <span className="hidden sm:inline text-sm">Next</span>
//                   <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                 </Button>
//                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-2">
//                   <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                 </Button>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* ────────────────────────────── DIALOGS ──────────────────────────────── */}

//       {/* Create Class Dialog */}
//       <Dialog
//         open={isCreateDialogOpen}
//         onOpenChange={(open) => { if (!open) resetCreateForm(); setIsCreateDialogOpen(open) }}
//       >
//         <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
//           <DialogHeader>
//             <DialogTitle className="text-lg sm:text-xl">Create New Class</DialogTitle>
//             <DialogDescription className="text-xs sm:text-sm">
//               Add a new class with optional batches
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
//             {createError && (
//               <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
//                 <AlertCircle className="h-4 w-4 shrink-0" />
//                 {createError}
//               </div>
//             )}

//             <div className="space-y-2">
//               <Label htmlFor="className" className="text-sm">
//                 Class Name <span className="text-red-500">*</span>
//               </Label>
//               <Input
//                 id="className"
//                 placeholder="e.g. 10th Grade, Mathematics, JEE Batch"
//                 value={newClassName}
//                 onChange={(e) => setNewClassName(e.target.value)}
//                 className="h-9 sm:h-10"
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="classLevel" className="text-sm">
//                 Class Level <span className="text-muted-foreground font-normal">(Optional)</span>
//               </Label>
//               <Input
//                 id="classLevel"
//                 placeholder="e.g. 10, 11, 12"
//                 value={newClassLevel}
//                 onChange={(e) => setNewClassLevel(e.target.value)}
//                 className="h-9 sm:h-10"
//               />
//               <p className="text-xs text-muted-foreground">Numeric level for this class (used for subject mapping)</p>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="academicYear" className="text-sm">
//                 Academic Year <span className="text-red-500">*</span>
//               </Label>
//               <Input
//                 id="academicYear"
//                 placeholder="e.g. 2025-26"
//                 value={newAcademicYear}
//                 onChange={(e) => setNewAcademicYear(e.target.value)}
//                 className="h-9 sm:h-10"
//               />
//               <p className="text-xs text-muted-foreground">
//                 Pre-filled based on current date. You can change it if needed.
//               </p>
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="classCapacity" className="text-sm">
//                 Class Capacity <span className="text-muted-foreground font-normal">(Optional)</span>
//               </Label>
//               <Input
//                 id="classCapacity"
//                 type="number"
//                 min={1}
//                 placeholder="Overall class capacity (if no batches)"
//                 value={newClassCapacity}
//                 onChange={(e) => setNewClassCapacity(e.target.value)}
//                 className="h-9 sm:h-10"
//               />
//               <p className="text-xs text-muted-foreground">
//                 Leave blank if you are adding batches with individual capacities
//               </p>
//             </div>

//             {/* Batches */}
//             <div className="space-y-2 sm:space-y-3">
//               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
//                 <Label className="text-sm">
//                   Batches <span className="text-muted-foreground font-normal">(Optional)</span>
//                 </Label>
//                 <Button
//                   type="button"
//                   variant="outline"
//                   size="sm"
//                   onClick={() =>
//                     setNewBatches([...newBatches, { name: '', startTime: '', endTime: '', capacity: '' }])
//                   }
//                   className="gap-2 w-full sm:w-auto h-8 sm:h-9 text-xs sm:text-sm"
//                 >
//                   <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                   Add Batch
//                 </Button>
//               </div>

//               {newBatches.map((batch, index) => (
//                 <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
//                   <div className="flex items-center justify-between">
//                     <span className="text-xs font-medium text-muted-foreground">Batch {index + 1}</span>
//                     {newBatches.length > 1 && (
//                       <Button
//                         type="button"
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => setNewBatches(newBatches.filter((_, i) => i !== index))}
//                         className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
//                       >
//                         <X className="h-3.5 w-3.5" />
//                       </Button>
//                     )}
//                   </div>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                     <Input
//                       placeholder="Batch name (e.g. Morning Batch)"
//                       value={batch.name}
//                       onChange={(e) => {
//                         const updated = [...newBatches]
//                         updated[index].name = e.target.value
//                         setNewBatches(updated)
//                       }}
//                       className="h-9 text-sm"
//                     />
//                     <Input
//                       type="number"
//                       min={1}
//                       placeholder="Capacity (optional)"
//                       value={batch.capacity}
//                       onChange={(e) => {
//                         const updated = [...newBatches]
//                         updated[index].capacity = e.target.value
//                         setNewBatches(updated)
//                       }}
//                       className="h-9 text-sm"
//                     />
//                     <div className="space-y-1">
//                       <Label className="text-xs text-muted-foreground">Start Time</Label>
//                       <Input
//                         type="time"
//                         value={batch.startTime}
//                         onChange={(e) => {
//                           const updated = [...newBatches]
//                           updated[index].startTime = e.target.value
//                           setNewBatches(updated)
//                         }}
//                         className="h-9 text-sm"
//                       />
//                     </div>
//                     <div className="space-y-1">
//                       <Label className="text-xs text-muted-foreground">End Time</Label>
//                       <Input
//                         type="time"
//                         value={batch.endTime}
//                         onChange={(e) => {
//                           const updated = [...newBatches]
//                           updated[index].endTime = e.target.value
//                           setNewBatches(updated)
//                         }}
//                         className="h-9 text-sm"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
//             <Button
//               variant="outline"
//               onClick={() => setIsCreateDialogOpen(false)}
//               disabled={createLoading}
//               className="w-full sm:w-auto"
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleCreateClass}
//               disabled={createLoading}
//               className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto gap-2"
//             >
//               {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
//               {createLoading ? 'Creating...' : 'Create Class'}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Edit Class Dialog */}
//       <Dialog
//         open={isEditDialogOpen}
//         onOpenChange={(open) => {
//           if (!open) { resetEditBatchInline(); setEditClassError(null) }
//           setIsEditDialogOpen(open)
//         }}
//       >
//         <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
//           <DialogHeader>
//             <DialogTitle>Edit Class — {selectedClass?.class_name}</DialogTitle>
//             <DialogDescription>Update class name or manage batches</DialogDescription>
//           </DialogHeader>

//           {selectedClass && (
//             <div className="space-y-5 py-4">

//               {/* Edit class name */}
//               <div className="space-y-2">
//                 <Label className="text-sm font-semibold">Class Name</Label>
//                 <div className="flex gap-2">
//                   <Input
//                     value={editClassName}
//                     onChange={(e) => setEditClassName(e.target.value)}
//                     placeholder="Enter class name"
//                     className="h-9 sm:h-10 flex-1"
//                   />
//                   <Button
//                     onClick={handleEditClassName}
//                     disabled={editClassLoading}
//                     size="sm"
//                     className="h-9 sm:h-10 px-4 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-2"
//                   >
//                     {editClassLoading ? (
//                       <Loader2 className="h-4 w-4 animate-spin" />
//                     ) : (
//                       <Check className="h-4 w-4" />
//                     )}
//                     {editClassLoading ? 'Saving...' : 'Save'}
//                   </Button>
//                 </div>
//                 {editClassError && (
//                   <p className="text-xs text-red-500 flex items-center gap-1">
//                     <AlertCircle className="h-3 w-3" /> {editClassError}
//                   </p>
//                 )}
//               </div>

//               {/* Batches */}
//               <div className="border-t pt-4 space-y-3">
//                 <Label className="text-sm font-semibold">Batches</Label>

//                 {selectedClass.batches.length === 0 ? (
//                   <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg">
//                     No batches added yet.
//                   </p>
//                 ) : (
//                   <div className="space-y-2">
//                     {selectedClass.batches.map((batch) => (
//                       <div key={batch._id} className="flex items-center gap-2 p-3 border rounded-lg">
//                         {editingBatchId === batch._id ? (
//                           <div className="flex-1 space-y-1">
//                             <div className="flex gap-2">
//                               <Input
//                                 value={editingBatchName}
//                                 onChange={(e) => setEditingBatchName(e.target.value)}
//                                 placeholder="Batch name"
//                                 className="h-8 text-sm flex-1"
//                                 autoFocus
//                               />
//                               <Button
//                                 size="sm"
//                                 onClick={() => handleEditBatchName(batch._id)}
//                                 disabled={editingBatchLoading}
//                                 className="h-8 px-3 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-1"
//                               >
//                                 {editingBatchLoading ? (
//                                   <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                                 ) : (
//                                   <Check className="h-3.5 w-3.5" />
//                                 )}
//                               </Button>
//                               <Button
//                                 size="sm"
//                                 variant="ghost"
//                                 onClick={resetEditBatchInline}
//                                 disabled={editingBatchLoading}
//                                 className="h-8 px-2 hover:bg-slate-200 hover:text-slate-900"
//                               >
//                                 <X className="h-3.5 w-3.5" />
//                               </Button>
//                             </div>
//                             {editingBatchError && (
//                               <p className="text-xs text-red-500 flex items-center gap-1">
//                                 <AlertCircle className="h-3 w-3" /> {editingBatchError}
//                               </p>
//                             )}
//                           </div>
//                         ) : (
//                           <>
//                             <div className="flex-1">
//                               <div className="font-medium">{batch.batch_name}</div>
//                               <div className="text-sm text-muted-foreground">
//                                 {formatTime(batch.start_time)} – {formatTime(batch.end_time)}
//                                 {batch.capacity
//                                   ? ` · ${batch.studentCount} / ${batch.capacity} students`
//                                   : batch.studentCount > 0
//                                   ? ` · ${batch.studentCount} students`
//                                   : ''}
//                               </div>
//                             </div>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => {
//                                 resetEditBatchInline()
//                                 setEditingBatchId(batch._id)
//                                 setEditingBatchName(batch.batch_name)
//                               }}
//                               className="h-8 w-8 p-0 hover:bg-slate-200 hover:text-slate-900"
//                               title="Edit batch name"
//                             >
//                               <Edit className="h-4 w-4" />
//                             </Button>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={() => handleDeleteBatch(selectedClass._id, batch._id)}
//                               disabled={deletingBatchId === batch._id}
//                               className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
//                               title="Delete batch"
//                             >
//                               {deletingBatchId === batch._id ? (
//                                 <Loader2 className="h-4 w-4 animate-spin" />
//                               ) : (
//                                 <Trash2 className="h-4 w-4" />
//                               )}
//                             </Button>
//                           </>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* ── Class Subject Schedule ── */}
//               <ClassSubjectScheduleManager
//                 selectedClass={selectedClass}
//                 onActionError={(msg) => setActionError(msg)}
//               />

//             </div>
//           )}

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
//               Close
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Add Batch Dialog */}
//       <Dialog
//         open={isAddBatchDialogOpen}
//         onOpenChange={(open) => { if (!open) resetAddBatchForm(); setIsAddBatchDialogOpen(open) }}
//       >
//         <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
//           <DialogHeader>
//             <DialogTitle className="text-lg sm:text-xl">
//               Add Batch to {selectedClass?.class_name}
//             </DialogTitle>
//             <DialogDescription className="text-xs sm:text-sm">
//               Create a new batch for this class
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
//             {addBatchError && (
//               <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
//                 <AlertCircle className="h-4 w-4 shrink-0" />
//                 {addBatchError}
//               </div>
//             )}
//             <div className="space-y-2">
//               <Label htmlFor="batchName" className="text-sm">
//                 Batch Name <span className="text-red-500">*</span>
//               </Label>
//               <Input
//                 id="batchName"
//                 placeholder="e.g. Morning Batch, Evening Batch"
//                 value={newBatchName}
//                 onChange={(e) => setNewBatchName(e.target.value)}
//                 className="h-9 sm:h-10"
//               />
//             </div>
//             <div className="grid grid-cols-2 gap-3">
//               <div className="space-y-2">
//                 <Label htmlFor="batchStartTime" className="text-sm">
//                   Start Time <span className="text-red-500">*</span>
//                 </Label>
//                 <Input
//                   id="batchStartTime"
//                   type="time"
//                   value={newBatchStartTime}
//                   onChange={(e) => setNewBatchStartTime(e.target.value)}
//                   className="h-9 sm:h-10"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="batchEndTime" className="text-sm">
//                   End Time <span className="text-red-500">*</span>
//                 </Label>
//                 <Input
//                   id="batchEndTime"
//                   type="time"
//                   value={newBatchEndTime}
//                   onChange={(e) => setNewBatchEndTime(e.target.value)}
//                   className="h-9 sm:h-10"
//                 />
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="batchCapacity" className="text-sm">
//                 Capacity <span className="text-muted-foreground font-normal">(Optional)</span>
//               </Label>
//               <Input
//                 id="batchCapacity"
//                 type="number"
//                 min={1}
//                 placeholder="Enter batch capacity"
//                 value={newBatchCapacity}
//                 onChange={(e) => setNewBatchCapacity(e.target.value)}
//                 className="h-9 sm:h-10"
//               />
//             </div>
//           </div>

//           <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
//             <Button
//               variant="outline"
//               onClick={() => setIsAddBatchDialogOpen(false)}
//               disabled={addBatchLoading}
//               className="w-full sm:w-auto"
//             >
//               Cancel
//             </Button>
//             <Button
//               onClick={handleAddBatch}
//               disabled={addBatchLoading}
//               className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto gap-2"
//             >
//               {addBatchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
//               {addBatchLoading ? 'Adding...' : 'Add Batch'}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Action Error Banner */}
//       {actionError && (
//         <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-4 bg-white border border-red-200 rounded-lg shadow-lg max-w-sm">
//           <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
//           <p className="text-sm text-red-600 flex-1">{actionError}</p>
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={() => setActionError(null)}
//             className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
//           >
//             <X className="h-4 w-4" />
//           </Button>
//         </div>
//       )}

//      {/* View Class Dialog */}
//       <Dialog
//         open={isViewDialogOpen}
//         onOpenChange={(open) => {
//           if (!open) setViewingClass(null)
//           setIsViewDialogOpen(open)
//         }}
//       >
//         <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
//               <Eye className="h-5 w-5 text-[#1897C6]" />
//               {viewingClass?.class_name}
//             </DialogTitle>
//             <DialogDescription className="text-xs sm:text-sm">
//               Class details, batches and schedule — read only
//             </DialogDescription>
//           </DialogHeader>

//           {viewingClass && (
//             <div className="space-y-5 py-3">

//               {/* Class Info */}
//               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
//                 <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
//                   <p className="text-xs text-muted-foreground">Class Name</p>
//                   <p className="text-sm font-semibold">{viewingClass.class_name}</p>
//                 </div>
//                 {viewingClass.class_level && (
//                   <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
//                     <p className="text-xs text-muted-foreground">Level</p>
//                     <p className="text-sm font-semibold">{viewingClass.class_level}</p>
//                   </div>
//                 )}
//                 <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
//                   <p className="text-xs text-muted-foreground">Total Students</p>
//                   <p className="text-sm font-semibold">
//                     {viewingClass.totalStudents}
//                     {viewingClass.totalCapacity > 0 && (
//                       <span className="text-muted-foreground font-normal"> / {viewingClass.totalCapacity}</span>
//                     )}
//                   </p>
//                 </div>
//                 <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
//                   <p className="text-xs text-muted-foreground">Total Batches</p>
//                   <p className="text-sm font-semibold">{viewingClass.batches.length}</p>
//                 </div>
//                 {viewingClass.totalCapacity > 0 && (
//                   <div className="p-3 rounded-lg bg-muted/40 border space-y-0.5">
//                     <p className="text-xs text-muted-foreground">Fill Rate</p>
//                     <p className="text-sm font-semibold">
//                       {Math.round((viewingClass.totalStudents / viewingClass.totalCapacity) * 100)}%
//                     </p>
//                   </div>
//                 )}
//               </div>

//               {/* Batches */}
//               <div className="border-t pt-4 space-y-2">
//                 <Label className="text-sm font-semibold flex items-center gap-1.5">
//                   <Clock className="h-4 w-4 text-[#1897C6]" />
//                   Batches
//                 </Label>
//                 {viewingClass.batches.length === 0 ? (
//                   <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
//                     No batches added yet.
//                   </p>
//                 ) : (
//                   <div className="space-y-2">
//                     {viewingClass.batches.map((batch) => (
//                       <div
//                         key={batch._id}
//                         className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
//                       >
//                         <div>
//                           <p className="text-sm font-medium">{batch.batch_name}</p>
//                           <p className="text-xs text-muted-foreground mt-0.5">
//                             {formatTime(batch.start_time)} – {formatTime(batch.end_time)}
//                             {batch.capacity
//                               ? ` · ${batch.studentCount} / ${batch.capacity} students`
//                               : batch.studentCount > 0
//                               ? ` · ${batch.studentCount} students`
//                               : ''}
//                           </p>
//                         </div>
//                         {batch.capacity && batch.capacity > 0 && (
//                           <Badge
//                             variant="secondary"
//                             className="text-xs"
//                           >
//                             {Math.round((batch.studentCount / batch.capacity) * 100)}% full
//                           </Badge>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Schedule — read only via ClassSubjectScheduleManager */}
//               <ClassSubjectScheduleManager
//                 selectedClass={viewingClass}
//                 onActionError={() => {}}
//                 readOnly
//               />

//             </div>
//           )}

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
//               Close
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Custom Confirm Dialog */}
//       <Dialog
//         open={confirmDialog.open}
//         onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
//       >
//         <DialogContent className="max-w-sm mx-3 sm:mx-auto">
//           <DialogHeader>
//             <DialogTitle>{confirmDialog.title}</DialogTitle>
//             <DialogDescription>{confirmDialog.description}</DialogDescription>
//           </DialogHeader>
//           <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
//             <Button
//               variant="outline"
//               onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
//               className="w-full sm:w-auto"
//             >
//               Cancel
//             </Button>
//             <Button
//               variant="destructive"
//               onClick={confirmDialog.onConfirm}
//               className="w-full sm:w-auto"
//             >
//               Delete
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//     </div>
//   )
// }
