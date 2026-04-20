'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  CheckCircle, XCircle, FileText, GraduationCap,
  Briefcase, AlertCircle, Loader2, Archive, Eye,
} from 'lucide-react'

import {
  studentsApi,
  type Student,
  type StudentContact,
  type StudentAddress,
  type StudentGuardian, 
  type StudentAcademicMapping,
  type StudentIdentityDocument,
  type StudentAcademicDocument,
  type StudentStatusHistory,
} from '@/lib/api/students'
import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'
import { IMAGE_BASE_URL } from '@/lib/api/config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
  return `${base}${path}`
}

function capitalize(s?: string | null): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getCurrentAcademicYear(): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  if (month >= 4) return `${year}-${String(year + 1).slice(2)}`
  return `${year - 1}-${String(year).slice(2)}`
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active:   { label: 'Active',   className: 'bg-green-100 text-green-800 border-green-300'    },
  inactive: { label: 'Inactive', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  blocked:  { label: 'Blocked',  className: 'bg-red-100 text-red-800 border-red-300'          },
  archived: { label: 'Archived', className: 'bg-gray-100 text-gray-800 border-gray-300'       },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: capitalize(status),
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  }
  return (
    <Badge variant="outline" className={`${cfg.className} font-medium`}>
      {cfg.label}
    </Badge>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StudentOnboardingViewPage() {
  const router    = useRouter()
  const params    = useParams()
  const studentId = params.id as string

  // ── Data ────────────────────────────────────────────────────────────────────
  const [student,       setStudent]       = useState<Student | null>(null)
  const [contacts,      setContacts]      = useState<StudentContact[]>([])
  const [addresses,     setAddresses]     = useState<StudentAddress[]>([])
  const [guardians,     setGuardians]     = useState<StudentGuardian[]>([])
  const [mapping,       setMapping]       = useState<StudentAcademicMapping | null>(null)
  const [identityDocs,  setIdentityDocs]  = useState<StudentIdentityDocument[]>([])
  const [academicDocs,  setAcademicDocs]  = useState<StudentAcademicDocument[]>([])
  const [statusHistory, setStatusHistory] = useState<StudentStatusHistory[]>([])
  const [isSavingAllocation, setIsSavingAllocation] = useState(false)
const [allocationSaveMsg, setAllocationSaveMsg]   = useState<'saved' | 'error' | null>(null)
const [isSaveOnly,        setIsSaveOnly]          = useState(false)

  // ── Class / section dropdown data ───────────────────────────────────────────
  const [classes,           setClasses]           = useState<ClassMaster[]>([])
  const [batches,           setBatches]           = useState<CoachingBatch[]>([])
  const [selectedClassId,   setSelectedClassId]   = useState('')
  const [selectedBatchId,   setSelectedBatchId]   = useState('')
  const [classMap,          setClassMap]          = useState<Record<string, string>>({})
  const [batchMap,          setBatchMap]          = useState<Record<string, string>>({})
  const [isFetchingBatches, setIsFetchingBatches] = useState(false)
  const instituteType = typeof window !== 'undefined'
    ? localStorage.getItem('instituteType') ?? 'coaching'
    : 'coaching'

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [isLoading,          setIsLoading]          = useState(true)
  const [pageError,          setPageError]          = useState<string | null>(null)
  const [actionError,        setActionError]        = useState<string | null>(null)
  const [isProcessing,       setIsProcessing]       = useState(false)

  const [showApproveDialog,  setShowApproveDialog]  = useState(false)
  const [showRejectDialog,   setShowRejectDialog]   = useState(false)
  const [showBlockDialog,    setShowBlockDialog]    = useState(false)
  const [showArchiveDialog,  setShowArchiveDialog]  = useState(false)

  const [rejectReason,       setRejectReason]       = useState('')
  const [blockReason,        setBlockReason]        = useState('')
  const [archiveReason,      setArchiveReason]      = useState('')

  // ── Fetch all student data in parallel ──────────────────────────────────────
  useEffect(() => {
    if (!studentId) return
    const fetchAll = async () => {
      setIsLoading(true)
      setPageError(null)
      console.log('[ViewPage] Fetching data for student:', studentId)

      try {
        const [
          studentRes,
          contactsRes,
          addressesRes,
          guardiansRes,
          mappingRes,
          identityDocsRes,
          academicDocsRes,
          historyRes,
        ] = await Promise.allSettled([
          studentsApi.getById(studentId),
          studentsApi.getAllContactsByStudent(studentId),
          studentsApi.getAddressesByStudent(studentId),
          studentsApi.getGuardiansByStudent(studentId),
          studentsApi.getActiveAcademicMappingByStudent(studentId),
          studentsApi.getIdentityDocumentsByStudent(studentId),
          studentsApi.getAcademicDocumentsByStudent(studentId),
          studentsApi.getStatusHistoryByStudent(studentId),
        ])

        // Student — required
        if (
          studentRes.status === 'fulfilled' &&
          studentRes.value.success &&
          studentRes.value.result
        ) {
          setStudent(studentRes.value.result)
          console.log('[ViewPage] Student loaded:', studentRes.value.result.full_name)
        } else {
          const msg =
            studentRes.status === 'fulfilled'
              ? studentRes.value.message || 'Student not found'
              : 'Failed to load student data'
          console.error('[ViewPage] Student fetch failed:', msg)
          setPageError(msg)
          setIsLoading(false)
          return
        }

        // Contacts
        if (contactsRes.status === 'fulfilled' && contactsRes.value.success) {
          setContacts((contactsRes.value.result as StudentContact[]) ?? [])
        } else {
          console.warn('[ViewPage] Contacts not loaded')
        }

        // Addresses
        if (addressesRes.status === 'fulfilled' && addressesRes.value.success) {
          setAddresses((addressesRes.value.result as StudentAddress[]) ?? [])
        } else {
          console.warn('[ViewPage] Addresses not loaded')
        }

        // Guardians
        if (guardiansRes.status === 'fulfilled' && guardiansRes.value.success) {
          setGuardians((guardiansRes.value.result as StudentGuardian[]) ?? [])
        } else {
          console.warn('[ViewPage] Guardians not loaded')
        }

        // Academic mapping
   if (
  mappingRes.status === 'fulfilled' &&
  mappingRes.value.success &&
  mappingRes.value.result
) {
  const raw = mappingRes.value.result
  const m = (Array.isArray(raw) ? raw[0] : raw) as StudentAcademicMapping | undefined
if (m) {
  setMapping(m)
  const classIdStr = typeof m.class_id === 'object' && m.class_id !== null
    ? (m.class_id as any)._id : m.class_id as string
  const batchIdStr = typeof m.batch_id === 'object' && m.batch_id !== null
    ? (m.batch_id as any)._id : m.batch_id as string
  if (classIdStr) setSelectedClassId(classIdStr)
  if (batchIdStr) setSelectedBatchId(batchIdStr)
  console.log('[ViewPage] Mapping loaded, class:', classIdStr, '| batch:', batchIdStr)
}
        } else {
          console.warn('[ViewPage] No active academic mapping found')
        }

        // Identity docs
        if (identityDocsRes.status === 'fulfilled' && identityDocsRes.value.success) {
          setIdentityDocs((identityDocsRes.value.result as StudentIdentityDocument[]) ?? [])
        } else {
          console.warn('[ViewPage] Identity docs not loaded')
        }

        // Academic docs
        if (academicDocsRes.status === 'fulfilled' && academicDocsRes.value.success) {
          setAcademicDocs((academicDocsRes.value.result as StudentAcademicDocument[]) ?? [])
        } else {
          console.warn('[ViewPage] Academic docs not loaded')
        }

        // Status history
        if (historyRes.status === 'fulfilled' && historyRes.value.success) {
          const hist = (historyRes.value.result as StudentStatusHistory[]) ?? []
          setStatusHistory(
            [...hist].sort(
              (a, b) =>
                new Date(b.changed_at ?? 0).getTime() -
                new Date(a.changed_at ?? 0).getTime()
            )
          )
          console.log('[ViewPage] Status history loaded:', hist.length)
        } else {
          console.warn('[ViewPage] Status history not loaded')
        }

      } catch (err: any) {
        console.error('[ViewPage] Unexpected error during fetch:', err)
        setPageError('Unable to connect to the server. Please check your connection.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [studentId])

  // ── Fetch classes for dropdown ──────────────────────────────────────────────
  useEffect(() => {
    const fetchClasses = async () => {
      const instituteId =
        typeof window !== 'undefined' ? localStorage.getItem('instituteId') ?? '' : ''
      if (!instituteId) return
      try {
        const res = await classesApi.getAll({ instituteId, status: 'active' })
        const list: ClassMaster[] = (res as any)?.result ?? (res as any) ?? []
        const classList = Array.isArray(list) ? list : []
        setClasses(classList)
        const cm: Record<string, string> = {}
        classList.forEach((c) => { cm[c._id] = c.class_name })
        setClassMap(cm)
        console.log('[ViewPage] Classes loaded:', classList.length)
      } catch (err) {
        console.error('[ViewPage] Failed to fetch classes for dropdown:', err)
      }
    }
    fetchClasses()
  }, [])

  // ── Fetch batches when selected class changes ───────────────────────────────
  useEffect(() => {
    if (!selectedClassId) {
      setBatches([])
      setBatchMap({})
      return
    }
    const fetchBatches = async () => {
      setIsFetchingBatches(true)
      try {
        const res = await classesApi.getBatchesByClass(selectedClassId)
        const list = (res as any)?.result ?? (res as any) ?? []
        const batchList: CoachingBatch[] = Array.isArray(list) ? list : []
        setBatches(batchList)
        const bm: Record<string, string> = {}
        batchList.forEach((b) => { if (b._id) bm[b._id] = b.batch_name })
        setBatchMap(bm)
        console.log('[ViewPage] Batches loaded:', batchList.length)
      } catch (err) {
        console.error('[ViewPage] Failed to fetch batches:', err)
      } finally {
        setIsFetchingBatches(false)
      }
    }
    fetchBatches()
  }, [selectedClassId])

  // ── Generic status action handler ───────────────────────────────────────────
  const handleStatusAction = async (
    newStatus: 'inactive' | 'blocked' | 'archived',
    reason: string,
    onSuccess: () => void
  ) => {
    if (!student) return
    setIsProcessing(true)
    setActionError(null)
    console.log('[ViewPage] Status action:', newStatus, '| reason:', reason)

    try {
      const statusRes = await studentsApi.update(studentId, { status: newStatus })
      if (!statusRes.success) {
        setActionError(statusRes.message || 'Failed to update student status')
        return
      }
      console.log('[ViewPage] Status updated to:', newStatus)

      const adminId =
        typeof window !== 'undefined' ? localStorage.getItem('adminId') ?? '' : ''
      if (adminId) {
        try {
          await studentsApi.createStatusHistory({
            student_id:  studentId,
            status:      newStatus,
            reason:      reason.trim() || null,
            changed_by:  adminId,
          })
          console.log('[ViewPage] Status history logged')
        } catch (histErr) {
          console.warn('[ViewPage] Status history log failed (non-fatal):', histErr)
        }
      } else {
        console.warn('[ViewPage] adminId not found in localStorage — skipping history log')
      }

      onSuccess()
      router.push('/dashboard/students/onboarding')
    } catch (err: any) {
      console.error('[ViewPage] Status action error:', err)
      setActionError('Unable to connect to the server. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Approve ──────────────────────────────────────────────────────────────────
const handleApprove = async () => {
    setShowApproveDialog(false)
    setIsSaveOnly(false)
    await handleSaveAndApprove()
  }

  const handleReject = async () => {
    await handleStatusAction('inactive', rejectReason, () => {
      setShowRejectDialog(false)
      setRejectReason('')
    })
  }

  const handleBlock = async () => {
    await handleStatusAction('blocked', blockReason, () => {
      setShowBlockDialog(false)
      setBlockReason('')
    })
  }

  const handleArchive = async () => {
    await handleStatusAction('archived', archiveReason, () => {
      setShowArchiveDialog(false)
      setArchiveReason('')
    })
  }

  const handleSaveAndApprove = async () => {
    if (!selectedClassId || !selectedBatchId) return
    setIsSavingAllocation(true)
    setAllocationSaveMsg(null)
    setActionError(null)

    try {
      // Step 1: Save academic mapping
      let mappingSaved = false
      if (mapping?._id) {
        const res = await studentsApi.updateAcademicMapping(mapping._id, {
          class_id: selectedClassId,
          batch_id: selectedBatchId,
        })
        mappingSaved = res.success
        if (!res.success) console.warn('[ViewPage] Mapping update failed:', res.message)
      } else {
        const res = await studentsApi.createAcademicMapping({
          student_id:    studentId,
          class_id:      selectedClassId,
          batch_id:      selectedBatchId,
          academic_year: getCurrentAcademicYear(),
        })
        mappingSaved = res.success
        if (res.success && res.result) setMapping(res.result as StudentAcademicMapping)
        else console.warn('[ViewPage] Mapping create failed:', res.message)
      }

      if (!mappingSaved) {
        setAllocationSaveMsg('error')
        setIsSavingAllocation(false)
        return
      }

      // Step 2: Set student status to active
      const statusRes = await studentsApi.update(studentId, { status: 'active' })
      if (!statusRes.success) {
        setActionError(statusRes.message || 'Failed to approve student')
        setAllocationSaveMsg('error')
        setIsSavingAllocation(false)
        return
      }

      // Step 3: Log status history
      const adminId = typeof window !== 'undefined' ? localStorage.getItem('adminId') ?? '' : ''
      if (adminId) {
        try {
          await studentsApi.createStatusHistory({
            student_id: studentId,
            status:     'active',
            reason:     'Application approved with class allocation',
            changed_by: adminId,
          })
        } catch (histErr) {
          console.warn('[ViewPage] History log failed (non-fatal):', histErr)
        }
      }

      setAllocationSaveMsg('saved')
      setStudent(prev => prev ? { ...prev, status: 'active' } : prev)
      setTimeout(() => {
        router.push('/dashboard/students/all')
      }, 1500)

    } catch (err) {
      console.error('[ViewPage] Save & Approve error:', err)
      setAllocationSaveMsg('error')
      setActionError('Unable to connect to the server. Please try again.')
    } finally {
      setIsSavingAllocation(false)
    }
  }

  const handleSaveAllocation = async () => {
    if (!selectedClassId) return
    setIsSavingAllocation(true)
    setIsSaveOnly(true)
    setAllocationSaveMsg(null)
    setActionError(null)

    try {
      if (mapping?._id) {
        const res = await studentsApi.updateAcademicMapping(mapping._id, {
          class_id: selectedClassId,
          batch_id: selectedBatchId || null,
        })
        setAllocationSaveMsg(res.success ? 'saved' : 'error')
        if (!res.success) setActionError(res.message || 'Failed to update allocation.')
      } else {
        const res = await studentsApi.createAcademicMapping({
          student_id:    studentId,
          class_id:      selectedClassId,
          batch_id:      selectedBatchId || null,
          academic_year: getCurrentAcademicYear(),
        })
        setAllocationSaveMsg(res.success ? 'saved' : 'error')
        if (res.success && res.result) setMapping(res.result as StudentAcademicMapping)
        else if (!res.success) setActionError(res.message || 'Failed to create allocation.')
      }
    } catch {
      setAllocationSaveMsg('error')
      setActionError('Unable to connect to server. Please try again.')
    } finally {
      setIsSavingAllocation(false)
      setTimeout(() => { setAllocationSaveMsg(null); setIsSaveOnly(false) }, 3000)
    }
  }
  // ── Derived / grouped data ───────────────────────────────────────────────────

  const studentContact  = contacts.find((c) => c.contact_type === 'student')
  const fatherContact   = contacts.find((c) => c.contact_type === 'father')
  const motherContact   = contacts.find((c) => c.contact_type === 'mother')
  const guardianContact = contacts.find((c) => c.contact_type === 'guardian')

  const currentAddress   = addresses.find((a) => a.address_type === 'current')
  const permanentAddress = addresses.find((a) => a.address_type === 'permanent')

  const fatherGuardian = guardians.find((g) => g.relation === 'father')
  const motherGuardian = guardians.find((g) => g.relation === 'mother')
  const otherGuardians = guardians.filter((g) => g.relation !== 'father' && g.relation !== 'mother')

  const prevAcademicDoc = academicDocs.find((d) => d.document_type === 'transfer_certificate')

  const allDocs   = [...identityDocs, ...academicDocs]
  const totalDocs = allDocs.filter((d) => d.file_url).length

  // ── Loading / error states ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading student details...</p>
        </div>
      </div>
    )
  }

  if (pageError || !student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="font-medium text-red-700">{pageError || 'Student not found'}</p>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = student.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-2 sm:p-3 md:p-0">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
              Student Application Review
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Review and approve student application
            </p>
          </div>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

         {/* Action buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full">

          {/* Approve — enrolled = active status AND mapping exists */}
          {student.status === 'active' && mapping ? (
            <Button
              disabled
              className="flex-1 min-w-[110px] gap-2 bg-green-100 text-green-700 border border-green-300 cursor-not-allowed h-9 sm:h-10 text-sm opacity-100"
            >
              <CheckCircle className="h-4 w-4" />
              ✓ Enrolled
            </Button>
          ) : (
            <Button
              className="flex-1 min-w-[110px] gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border border-green-700 hover:border-green-800 h-9 sm:h-10 text-sm"
              onClick={() => {
                setActionError(null)
                const card = document.getElementById('class-allocation-card')
                if (card) {
                  card.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  card.classList.add('ring-2', 'ring-[#1897C6]', 'ring-offset-2')
                  setTimeout(() => card.classList.remove('ring-2', 'ring-[#1897C6]', 'ring-offset-2'), 2000)
                }
              }}
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          )}

          {/* Reject */}
          {student.status === 'inactive' ? (
            <Button
              disabled
              variant="outline"
              className="flex-1 min-w-[90px] gap-2 border-gray-300 text-gray-400 cursor-not-allowed h-9 sm:h-10 text-sm opacity-100"
            >
              <XCircle className="h-4 w-4" />
              Rejected
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 min-w-[90px] gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-600 hover:text-red-700 h-9 sm:h-10 text-sm"
              onClick={() => { setActionError(null); setShowRejectDialog(true) }}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          )}

          {/* Block */}
          {student.status === 'blocked' ? (
            <Button
              disabled
              variant="outline"
              className="flex-1 min-w-[90px] gap-2 border-orange-200 text-orange-400 cursor-not-allowed h-9 sm:h-10 text-sm opacity-100"
            >
              <AlertCircle className="h-4 w-4" />
              Blocked
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 min-w-[90px] gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-600 hover:text-orange-700 h-9 sm:h-10 text-sm"
              onClick={() => { setActionError(null); setShowBlockDialog(true) }}
            >
              <AlertCircle className="h-4 w-4" />
              Block
            </Button>
          )}

          {/* Archive */}
          {student.status === 'archived' ? (
            <Button
              disabled
              variant="outline"
              className="flex-1 min-w-[100px] gap-2 border-gray-200 text-gray-400 cursor-not-allowed h-9 sm:h-10 text-sm opacity-100"
            >
              <Archive className="h-4 w-4" />
              Archived
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 min-w-[100px] gap-2 border-gray-400 text-gray-600 hover:bg-gray-50 hover:border-gray-600 hover:text-gray-700 h-9 sm:h-10 text-sm"
              onClick={() => { setActionError(null); setShowArchiveDialog(true) }}
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          )}

        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">

        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">

          {/* Student Profile */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                Student Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 pb-4 sm:pb-6 border-b">
                {/* <Avatar className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 border-4 border-[#1897C6]/20">
                  <AvatarFallback className="bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white text-xl sm:text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar> */}
                {(() => {
  const photoDoc = identityDocs.find(d => d.document_type === 'student_photo' && d.file_url)
  const photoUrl = photoDoc ? buildFileUrl(photoDoc.file_url) : null
  return (
    <>
      {photoUrl ? (
        <img
          src={photoUrl!}
          alt=""
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'
          }}
          className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-full object-cover border-4 border-[#1897C6]/20 shadow-md"
        />
      ) : null}
      <div
        style={{ display: photoUrl ? 'none' : 'flex' }}
        className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-full bg-gradient-to-br from-[#1897C6] to-[#67BAC3] items-center justify-center text-white text-xl sm:text-2xl font-bold border-4 border-[#1897C6]/20 shadow-md shrink-0"
      >
        {initials}
      </div>
    </>
  )
})()}
                <div className="flex-1 text-center sm:text-left space-y-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{student.full_name}</h2>
                  <p className="text-sm text-muted-foreground font-mono">{student.student_code}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                    <StatusBadge status={student.status} />
                    <Badge variant="outline" className="border-[#1897C6] text-[#1897C6] text-xs">
                      Applied:{' '}
                      {student.createdAt
                        ? new Date(student.createdAt).toLocaleDateString('en-IN')
                        : '—'}
                    </Badge>
                  </div>
                </div>
              </div>
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <InfoItem label="Student Code"  value={student.student_code} />
  <InfoItem label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-IN') : ''} icon={Calendar} />
  <InfoItem label="Gender"        value={capitalize(student.gender)} />
  <InfoItem label="Blood Group"   value={student.blood_group} />
  <InfoItem label="Student Type"  value={capitalize(student.student_type)} />
  {student.nationality  && <InfoItem label="Nationality"  value={student.nationality} />}
  {student.religion     && <InfoItem label="Religion"     value={capitalize(student.religion)} />}
  {student.caste        && <InfoItem label="Caste"        value={capitalize(student.caste)} />}
  {student.category     && <InfoItem label="Category"     value={student.category} />}
</div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No contact information available</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {studentContact?.mobile           && <InfoItem label="Student Mobile"   value={studentContact.mobile}           icon={Phone} />}
                  {studentContact?.email            && <InfoItem label="Student Email"    value={studentContact.email}            icon={Mail}  />}
                  {studentContact?.alternate_mobile && <InfoItem label="Alternate Mobile" value={studentContact.alternate_mobile} icon={Phone} />}
                  {fatherContact?.mobile            && <InfoItem label="Father Mobile"    value={fatherContact.mobile}            icon={Phone} />}
                  {fatherContact?.email             && <InfoItem label="Father Email"     value={fatherContact.email}             icon={Mail}  />}
                  {motherContact?.mobile            && <InfoItem label="Mother Mobile"    value={motherContact.mobile}            icon={Phone} />}
                  {motherContact?.email             && <InfoItem label="Mother Email"     value={motherContact.email}             icon={Mail}  />}
                  {guardianContact?.mobile          && <InfoItem label="Guardian Mobile"  value={guardianContact.mobile}          icon={Phone} />}
                  {guardianContact?.email           && <InfoItem label="Guardian Email"   value={guardianContact.email}           icon={Mail}  />}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          {addresses.length > 0 && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
                {currentAddress && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-[#1897C6]">Current Address</h4>
                    <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                      <p className="font-medium text-sm sm:text-base">{currentAddress.address}</p>
                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        <InfoItem label="City"    value={currentAddress.city}    compact />
                        <InfoItem label="State"   value={currentAddress.state}   compact />
                        <InfoItem label="Pincode" value={currentAddress.pincode} compact />
                      </div>
                    </div>
                  </div>
                )}
                {permanentAddress && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-[#1897C6]">Permanent Address</h4>
                    <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                      <p className="font-medium text-sm sm:text-base">{permanentAddress.address}</p>
                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        <InfoItem label="City"    value={permanentAddress.city}    compact />
                        <InfoItem label="State"   value={permanentAddress.state}   compact />
                        <InfoItem label="Pincode" value={permanentAddress.pincode} compact />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Guardian Information */}
          {guardians.length > 0 && (
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                  Guardian Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6">
                {fatherGuardian && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">F</span>
                      Father's Details
                      {fatherGuardian.is_primary && (
                        <Badge variant="outline" className="text-xs border-[#1897C6] text-[#1897C6]">Primary</Badge>
                      )}
                    </h4>
 <div className="grid gap-3 sm:grid-cols-2 bg-blue-50/50 p-4 rounded-lg">
                      <InfoItem label="Name"          value={fatherGuardian.name}                                      compact />
                      <InfoItem label="Mobile"        value={fatherGuardian.mobile}        icon={Phone}     compact />
                     {fatherGuardian.email         && <InfoItem label="Email"         value={fatherGuardian.email}         icon={Mail}      compact />}
                      {fatherGuardian.occupation    && <InfoItem label="Occupation"    value={fatherGuardian.occupation}    icon={Briefcase} compact />}
                      {fatherGuardian.annual_income != null && <InfoItem label="Annual Income" value={`₹${fatherGuardian.annual_income.toLocaleString('en-IN')}`} compact />}
                    </div>
                  </div>
                )}
                {motherGuardian && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-bold">M</span>
                      Mother's Details
                      {motherGuardian.is_primary && (
                        <Badge variant="outline" className="text-xs border-[#1897C6] text-[#1897C6]">Primary</Badge>
                      )}
                    </h4>
 <div className="grid gap-3 sm:grid-cols-2 bg-pink-50/50 p-4 rounded-lg">
                      <InfoItem label="Name"       value={motherGuardian.name}         compact />
                      <InfoItem label="Mobile"     value={motherGuardian.mobile}       icon={Phone}     compact />
                      {motherGuardian.email         && <InfoItem label="Email"         value={motherGuardian.email}                                                      icon={Mail}      compact />}
                      {motherGuardian.occupation    && <InfoItem label="Occupation"    value={motherGuardian.occupation}                                                 icon={Briefcase} compact />}
                      {motherGuardian.annual_income != null && <InfoItem label="Annual Income" value={`₹${motherGuardian.annual_income.toLocaleString('en-IN')}`}        compact />}
                    </div>
                  </div>
                )}
                {otherGuardians.map((g, i) => (
                  <div key={g._id ?? i}>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">G</span>
                      {capitalize(g.relation)}'s Details
                      {g.is_primary && (
                        <Badge variant="outline" className="text-xs border-[#1897C6] text-[#1897C6]">Primary</Badge>
                      )}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 bg-gray-50/50 p-4 rounded-lg">
                      <InfoItem label="Name"     value={g.name}                 compact />
                      <InfoItem label="Relation" value={capitalize(g.relation)} compact />
                      <InfoItem label="Mobile"   value={g.mobile} icon={Phone}  compact />
                      {g.email         && <InfoItem label="Email"         value={g.email}                                          icon={Mail}      compact />}
                      {g.occupation    && <InfoItem label="Occupation"    value={g.occupation}                                     icon={Briefcase} compact />}
                      {g.annual_income != null && <InfoItem label="Annual Income" value={`₹${g.annual_income.toLocaleString('en-IN')}`}              compact />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )} 

          {/* Academic Information */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {mapping ? (
                <div className="grid gap-4 sm:grid-cols-2">
<InfoItem
  label="Class"
  value={(() => {
    if (!mapping.class_id) return '—'
    if (typeof mapping.class_id === 'object' && mapping.class_id !== null)
      return `Class ${(mapping.class_id as any).class_name}`
    return classMap[mapping.class_id as string]
      ? `Class ${classMap[mapping.class_id as string]}`
      : '—'
  })()}
  icon={GraduationCap}
/>
<InfoItem
  label="Batch"
  value={(() => {
    if (!mapping.batch_id) return '—'
    if (typeof mapping.batch_id === 'object' && mapping.batch_id !== null)
      return (mapping.batch_id as any).batch_name ?? '—'
    return batchMap[mapping.batch_id as string] ?? '—'
  })()}
/>
                  <InfoItem label="Academic Year" value={mapping.academic_year} />
                  {mapping.roll_number && <InfoItem label="Roll Number" value={mapping.roll_number} />}
                  {mapping.joined_at && (
                    <InfoItem
                      label="Joining Date"
                      value={new Date(mapping.joined_at).toLocaleDateString('en-IN')}
                      icon={Calendar}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No academic mapping found</p>
              )}
              {prevAcademicDoc && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <p className="text-sm font-semibold text-[#1897C6]">Previous Academic Details</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {prevAcademicDoc.previous_school_name && <InfoItem label="Previous School" value={prevAcademicDoc.previous_school_name} />}
                    {prevAcademicDoc.class_completed      && <InfoItem label="Class Completed" value={prevAcademicDoc.class_completed} />}
                    {prevAcademicDoc.previous_board       && <InfoItem label="Previous Board"  value={prevAcademicDoc.previous_board} />}
                    {prevAcademicDoc.academic_year        && <InfoItem label="Academic Year"   value={prevAcademicDoc.academic_year} />}
                    {prevAcademicDoc.remarks              && <InfoItem label="Remarks"         value={prevAcademicDoc.remarks} />}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Submitted */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                Documents Submitted
                {(() => {
                  const pendingCount = [...identityDocs, ...academicDocs].filter(
                    d => d.file_url && (d.verification_status === 'pending' || !d.verification_status)
                  ).length
                  return pendingCount > 0 ? (
                    <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300 animate-pulse">
                      {pendingCount} pending review
                    </span>
                  ) : null
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {allDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No documents uploaded</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
 {identityDocs.map((doc) => (
  <DocumentItem
    key={doc._id}
    label={capitalize(doc.document_type.replace(/_/g, ' '))}
    fileUrl={buildFileUrl(doc.file_url)}
    docId={doc._id}
    docCategory="identity"
    verificationStatus={doc.verification_status ?? 'pending'}
    rejectionReason={doc.remarks ?? null}
    adminId={typeof window !== 'undefined' ? localStorage.getItem('adminId') ?? undefined : undefined}
  />
))}
   {academicDocs.map((doc) => (
  <DocumentItem
    key={doc._id}
    label={capitalize(doc.document_type.replace(/_/g, ' '))}
    fileUrl={buildFileUrl(doc.file_url)}
    docId={doc._id}
    docCategory="academic"
    verificationStatus={doc.verification_status ?? 'pending'}
    rejectionReason={doc.remarks ?? null}
    adminId={typeof window !== 'undefined' ? localStorage.getItem('adminId') ?? undefined : undefined}
  />
))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div className="space-y-4 sm:space-y-6">

          {/* Class Allocation */}
          <Card id="class-allocation-card" className="border-2 border-[#1897C6]/20 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                Class Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 sm:pt-6 p-4 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="class-select">Assign Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={(v) => { setSelectedClassId(v); setSelectedBatchId('') }}
                >
                  <SelectTrigger id="class-select" className="border-2">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 ? (
                      <SelectItem value="__none" disabled>No classes found</SelectItem>
                    ) : (
                      classes.map((cls) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          Class {cls.class_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Batch dropdown  */}
              {selectedClassId && (
                <div className="space-y-2">
                  <Label htmlFor="batch-select">
                    Assign Batch <span className="text-red-500">*</span>
                  </Label>
                  {isFetchingBatches ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading batches...
                    </div>
                  ) : batches.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      No batches found for this class.
                    </p>
                  ) : (
                    <Select
                      value={selectedBatchId}
                      onValueChange={(v) => setSelectedBatchId(v)}
                    >
                      <SelectTrigger id="batch-select" className="border-2">
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch._id} value={batch._id!}>
                            {batch.batch_name}
                            {batch.start_time && batch.end_time
                              ? ` (${batch.start_time} – ${batch.end_time})`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Enrollment preview */}
              {selectedClassId && selectedBatchId && (
                <span className="block text-sm font-medium text-foreground bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  Student will be enrolled in Class{' '}
                  <strong>{classMap[selectedClassId] ?? selectedClassId}</strong>
                  {' – '}
                  <strong>{batchMap[selectedBatchId] ?? selectedBatchId}</strong>.
                </span>
              )}

              {/* Save feedback message */}
{allocationSaveMsg === 'saved' && !isSaveOnly && (
  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
    <CheckCircle className="h-4 w-4 shrink-0" />
    Student approved & enrolled! Redirecting...
  </div>
)}
{allocationSaveMsg === 'saved' && isSaveOnly && (
  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
    <CheckCircle className="h-4 w-4 shrink-0" />
    Allocation saved successfully!
  </div>
)}
{allocationSaveMsg === 'error' && (
  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
    <AlertCircle className="h-4 w-4 shrink-0" />
    Failed. Please try again.
  </div>
)}

{/* Save Allocation only — mapping save karo, status change mat karo */}
<Button
  variant="outline"
  className="w-full gap-2 border-[#1897C6] text-[#1897C6] hover:bg-[#1897C6]/10"
  onClick={handleSaveAllocation}
  disabled={!selectedClassId || isSavingAllocation || (student.status === 'active' && !!mapping)}
>
  {isSavingAllocation && isSaveOnly ? (
    <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
  ) : (
    <>Save Allocation</>
  )}
</Button>

{/* Save & Approve — mapping save + status active + dialog confirm */}
<Button
  className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-60"
  onClick={() => {
    if (!selectedClassId) {
      setActionError('Please assign a Class first.')
      return
    }
    if (!selectedBatchId) {
      setActionError('Please assign a Batch first.')
      return
    }
    setActionError(null)
    setShowApproveDialog(true)
  }}
  disabled={
    !selectedClassId ||
    !selectedBatchId ||
    isSavingAllocation ||
    (student.status === 'active' && !!mapping)
  }
>
  {student.status === 'active' && mapping ? (
    <><CheckCircle className="h-4 w-4" />Already Enrolled</>
  ) : (
    <><CheckCircle className="h-4 w-4" />Save & Approve</>
  )}
</Button>
            </CardContent>
          </Card>

          {/* Application Summary */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Application Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Application ID</span>
                <span className="font-mono font-semibold text-sm">{student.student_code}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Applied Date</span>
                <span className="font-medium text-sm">
                  {student.createdAt
                    ? new Date(student.createdAt).toLocaleDateString('en-IN')
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm text-muted-foreground">Documents</span>
                <span className="font-medium text-sm">{totalDocs} submitted</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={student.status} />
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          {statusHistory.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Status History</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-2">
                {statusHistory.map((h, i) => {
                  const cfg = STATUS_CONFIG[h.status] ?? {
                    label: capitalize(h.status),
                    className: 'bg-gray-100 text-gray-800 border-gray-300',
                  }
                  return (
                    <div
                      key={h._id ?? i}
                      className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 py-2.5 border-b last:border-0 last:pb-0"
                    >
                      <Badge
                        variant="outline"
                        className={`${cfg.className} text-xs w-fit shrink-0`}
                      >
                        {cfg.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        {h.reason && (
                          <p className="text-sm text-muted-foreground italic truncate">
                            "{h.reason}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {h.changed_at
                            ? new Date(h.changed_at).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* ══════════════════════════════════════════════
           APPROVE DIALOG
      ══════════════════════════════════════════════ */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Student Application
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve and enroll this student?
              {selectedClassId && selectedBatchId && (
                <span className="block mt-2 font-medium text-foreground">
                  Class: <strong>{classMap[selectedClassId] ?? selectedClassId}</strong>
                  {' – '}
                  Batch: <strong>{batchMap[selectedBatchId] ?? selectedBatchId}</strong>
                </span>
              )}
              {!selectedBatchId && selectedClassId && (
                <span className="block mt-2 text-sm text-amber-600">
                  ⚠ No batch selected. Student will be enrolled without a batch.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Approving...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" />Approve & Enroll</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
           REJECT DIALOG
      ══════════════════════════════════════════════ */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Student Application
            </DialogTitle>
            <DialogDescription>
              Student status will be set to <strong>Inactive</strong>. Provide a reason
              (optional but recommended).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="reject-reason">
              Reason for Rejection{' '}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Incomplete documents, failed verification..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowRejectDialog(false); setRejectReason('') }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rejecting...</>
              ) : (
                <><XCircle className="h-4 w-4 mr-2" />Reject Application</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
           BLOCK DIALOG
      ══════════════════════════════════════════════ */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Block Student
            </DialogTitle>
            <DialogDescription>
              Student status will be set to <strong>Blocked</strong>. Provide a reason (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="block-reason">
              Reason for Blocking{' '}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="block-reason"
              placeholder="e.g. Misconduct, pending dues..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowBlockDialog(false); setBlockReason('') }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleBlock}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Blocking...</>
              ) : (
                <><AlertCircle className="h-4 w-4 mr-2" />Block Student</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
           ARCHIVE DIALOG
      ══════════════════════════════════════════════ */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Archive className="h-5 w-5 text-gray-600" />
              Archive Student
            </DialogTitle>
            <DialogDescription>
              Student status will be set to <strong>Archived</strong>. Provide a reason (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="archive-reason">
              Reason for Archiving{' '}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="archive-reason"
              placeholder="e.g. Left school, academic year completed..."
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowArchiveDialog(false); setArchiveReason('') }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-gray-500 text-gray-700 hover:bg-gray-100 hover:border-gray-600"
              onClick={handleArchive}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Archiving...</>
              ) : (
                <><Archive className="h-4 w-4 mr-2" />Archive Student</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Helper Components ────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  icon: Icon,
  compact = false,
}: {
  label: string
  value?: string | number | null
  icon?: React.ComponentType<{ className?: string }>
  compact?: boolean
}) {
  const display = value?.toString().trim()
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-[#1897C6] shrink-0" />}
        {display ? (
          <p className={`${compact ? 'text-sm' : ''} font-medium break-words`}>{display}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic font-normal">Not Provided</p>
        )}
      </div>
    </div>
  )
}

// REPLACE the entire DocumentItem function at the bottom of the file WITH:

function DocumentItem({
  label,
  fileUrl,
  docId,
  docCategory,
  verificationStatus,
  rejectionReason: initialRejectionReason,
  adminId,
  onVerified,
}: {
  label: string
  fileUrl: string | null
  docId?: string
  docCategory?: 'identity' | 'academic'
  verificationStatus?: string
  rejectionReason?: string | null
  adminId?: string
  onVerified?: (docId: string, status: 'approved' | 'rejected', category: 'identity' | 'academic') => void
}) {
  const [isProcessing,        setIsProcessing]        = useState(false)
  const [localStatus,         setLocalStatus]         = useState(verificationStatus)
  const [localRejectionReason,setLocalRejectionReason]= useState<string | null | undefined>(initialRejectionReason)
  const [showRejectDialog,    setShowRejectDialog]    = useState(false)
  const [rejectReason,        setRejectReason]        = useState('')
  const hasFile = !!fileUrl

  const handleVerify = async (status: 'approved' | 'rejected', reason?: string) => {
    if (!docId || !docCategory || !adminId) return
    setIsProcessing(true)
    try {
 const payload: Record<string, unknown> = { verification_status: status, verified_by: adminId }
if (status === 'rejected' && reason) payload.remarks = reason
      const res = docCategory === 'identity'
        ? await studentsApi.verifyIdentityDocument(docId, payload as any)
        : await studentsApi.verifyAcademicDocument(docId, payload as any)

      if (res.success) {
        setLocalStatus(status)
        if (status === 'rejected') setLocalRejectionReason(reason ?? null)
        onVerified?.(docId, status, docCategory)
      }
    } catch (err) {
      console.error('[DocumentItem] Verify error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (rejectReason.trim().length < 10) return
    await handleVerify('rejected', rejectReason.trim())
    setShowRejectDialog(false)
    setRejectReason('')
  }

  const VerifBadge = ({ status }: { status?: string }) => {
    const conf = (
      status === 'approved' ? { cls: 'bg-green-100 text-green-700',   label: 'Approved' } :
      status === 'rejected' ? { cls: 'bg-red-100 text-red-700',       label: 'Rejected' } :
                              { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending'  }
    )
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${conf.cls}`}>
        {conf.label.toUpperCase()}
      </span>
    )
  }

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 hover:border-[#1897C6]/30 transition-colors">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 text-[#1897C6] shrink-0" />
            <p className="text-sm font-bold text-gray-700 capitalize truncate">{label}</p>
          </div>
          <VerifBadge status={localStatus} />
        </div>

        {/* Rejection reason */}
{localStatus === 'rejected' && localRejectionReason && (
  <p className="text-xs text-red-600 mb-2 italic">Reason: {localRejectionReason}</p>
)}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {hasFile && (
            <a href={fileUrl!} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs gap-1 border-gray-200 text-[#1897C6] hover:bg-[#1897C6]/10 hover:border-[#1897C6]/40 hover:text-[#1897C6]"
              >
                <Eye className="h-3 w-3" /> View
              </Button>
            </a>
          )}

          {hasFile && docId && docCategory && localStatus !== 'approved' && localStatus !== 'rejected' && (
            <>
              <Button
                size="sm"
                className="h-8 px-3 text-xs gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors"
                onClick={() => handleVerify('approved')}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <CheckCircle className="h-3 w-3" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs gap-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <XCircle className="h-3 w-3" />}
                Reject
              </Button>
            </>
          )}

          {hasFile && docId && docCategory && (localStatus === 'approved' || localStatus === 'rejected') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setLocalStatus('pending'); setLocalRejectionReason(null) }}
            >
              Re-review
            </Button>
          )}
        </div>
      </div>

      {/* Reject Reason Dialog */}
      <Dialog
        open={showRejectDialog}
        onOpenChange={open => { if (!open) { setShowRejectDialog(false); setRejectReason('') } }}
      >
        <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="doc-reject-reason" className="text-sm font-medium">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="doc-reject-reason"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Document image is not clear, please re-upload..."
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters required.</p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowRejectDialog(false); setRejectReason('') }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={rejectReason.trim().length < 10 || isProcessing}
              className="bg-red-500 hover:bg-red-600 text-white gap-2"
            >
              {isProcessing
                ? <><Loader2 className="h-4 w-4 animate-spin" />Rejecting...</>
                : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
