'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import {
  ArrowLeft, User, Mail, Phone, MapPin, GraduationCap, Briefcase,
  FileText, CheckCircle, XCircle, AlertCircle, Loader2,
  Calendar, IdCard, School, Users,
  Eye, ExternalLink, CreditCard, Shield, Clock,
} from 'lucide-react'
import {
  teachersApi,
  type Teacher, type TeacherContact, type TeacherAddress,
  type TeacherQualification, type TeacherExperience,
  type TeacherBankDetails, type TeacherIdentityDocument,
  type TeacherEmergencyContact,
} from '@/lib/api/teachers'
import { IMAGE_BASE_URL } from '@/lib/api/config'
import ClassAllocationTab from '../_class-allocation/page'
import SalaryStructureTab from '../_SalaryStructureTab/page'
import ActivationTab from '../_ActivationTab/page'

// ─── Helper: build full URL ────────────────────────────────────────────────────
const buildFileUrl = (rel: string): string => {
  if (!rel) return ''
  if (rel.startsWith('http://') || rel.startsWith('https://')) return rel
  const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL
  const path = rel.startsWith('/') ? rel : `/${rel}`
  return `${base}${path}`
}

// ─── Helper: format date ──────────────────────────────────────────────────────
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// ─── Helper: calc experience ──────────────────────────────────────────────────
const calcExp = (exps: TeacherExperience[]): string => {
  if (!exps.length) return '—'
  let totalMonths = 0
  const now = new Date()
  exps.forEach(e => {
    if (!e.from_date) return
    const from = new Date(e.from_date)
    const to = e.is_current ? now : e.to_date ? new Date(e.to_date) : now
    totalMonths += Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()))
  })
  if (!totalMonths) return '< 1 yr'
  const y = Math.floor(totalMonths / 12), m = totalMonths % 12
  if (!y) return `${m} months`
  if (!m) return `${y} year${y > 1 ? 's' : ''}`
  return `${y}y ${m}m`
}

// ─── InfoRow component ────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex flex-col gap-0.5 py-2 border-b border-[#E5E7EB] last:border-0">
    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{label}</span>
    <span className="text-sm font-medium text-[#535359]">{value || '—'}</span>
  </div>
)

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({
  icon: Icon,
  title,
  iconColor = 'text-[#1897C6]',
  badge,
  children,
}: {
  icon: React.ElementType
  title: string
  iconColor?: string
  badge?: React.ReactNode
  children: React.ReactNode
}) => (
  <Card className="border border-[#E5E7EB] shadow-sm rounded-xl">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={20} className={iconColor} />
        <h3 className="text-base font-bold text-[#535359]">{title}</h3>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>
      {children}
    </CardContent>
  </Card>
)
// ─── Status options ─────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'onboarding', label: 'Onboarding', cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { value: 'active',     label: 'Active',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  { value: 'inactive',   label: 'Inactive',   cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  { value: 'blocked',    label: 'Blocked',    cls: 'bg-red-50 text-red-700 border border-red-200' },
  { value: 'archived',   label: 'Archived',   cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
]

// ─── Verification Status Badge ────────────────────────────────────────────────
const VerifBadge = ({ status }: { status?: string }) => {
  const conf = {
    approved: { cls: 'bg-green-100 text-green-700', label: 'Approved' },
    pending:  { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending'  },
    rejected: { cls: 'bg-red-100 text-red-700',       label: 'Rejected' },
  }[status || ''] || { cls: 'bg-gray-100 text-gray-600', label: status || '—' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${conf.cls}`}>
      {conf.label.toUpperCase()}
    </span>
  )
}

// ─── Page State ───────────────────────────────────────────────────────────────
interface PageData {
  teacher: Teacher
  contact: TeacherContact | null
  addresses: TeacherAddress[]
  qualifications: TeacherQualification[]
  experiences: TeacherExperience[]
  bankDetails: TeacherBankDetails[]
  documents: TeacherIdentityDocument[]
  emergencyContacts: TeacherEmergencyContact[]
}

export default function TeacherViewPage() {
  const params = useParams()
  const router = useRouter()
  const teacherId = params.id as string

  const [data, setData] = useState<PageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [photoError, setPhotoError] = useState(false)

  // ── Activate/Reject dialog states ──────────────────────────────────────────
  const [statusChangeOpen, setStatusChangeOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string>('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // ── Reject Document dialog states ─────────────────────────────────────────
  const [rejectDocOpen, setRejectDocOpen] = useState(false)
  const [rejectDocId, setRejectDocId] = useState<string | null>(null)
  const [rejectDocReason, setRejectDocReason] = useState('')
  const [isRejectingDoc, setIsRejectingDoc] = useState(false)

  // ── Result notification ────────────────────────────────────────────────────
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showNotification = useCallback((n: { type: 'success' | 'error'; message: string }) => {
    setNotification(n)
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // ─── Fetch all teacher data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!teacherId) return
    setIsLoading(true)
    setLoadError('')
    try {
      const [teacherRes, contactRes, addrRes, qualRes, expRes, bankRes, docRes, emergencyRes] = await Promise.allSettled([
        teachersApi.getById(teacherId),
        teachersApi.getContactByTeacher(teacherId),
        teachersApi.getAddressesByTeacher(teacherId),
        teachersApi.getQualificationsByTeacher(teacherId),
        teachersApi.getExperienceByTeacher(teacherId),
        teachersApi.getBankDetailsByTeacher(teacherId),
        teachersApi.getIdentityDocumentsByTeacher(teacherId),
        teachersApi.getEmergencyContactsByTeacher(teacherId),
      ])

      if (teacherRes.status === 'rejected' || !teacherRes.value.success) {
        setLoadError('Failed to load teacher details')
        return
      }

      setData({
        teacher:           teacherRes.value.result as Teacher,
        contact:           contactRes.status === 'fulfilled' && contactRes.value.success ? contactRes.value.result as TeacherContact : null,
        addresses:         addrRes.status === 'fulfilled' && addrRes.value.success ? (Array.isArray(addrRes.value.result) ? addrRes.value.result : []) : [],
        qualifications:    qualRes.status === 'fulfilled' && qualRes.value.success ? (Array.isArray(qualRes.value.result) ? qualRes.value.result : []) : [],
        experiences:       expRes.status === 'fulfilled' && expRes.value.success ? (Array.isArray(expRes.value.result) ? expRes.value.result : []) : [],
        bankDetails:       bankRes.status === 'fulfilled' && bankRes.value.success ? (Array.isArray(bankRes.value.result) ? bankRes.value.result : []) : [],
        documents:         docRes.status === 'fulfilled' && docRes.value.success ? (Array.isArray(docRes.value.result) ? docRes.value.result : []) : [],
        emergencyContacts: emergencyRes.status === 'fulfilled' && emergencyRes.value.success ? (Array.isArray(emergencyRes.value.result) ? emergencyRes.value.result : []) : [],
      })
    } catch (err: any) {
      setLoadError(err?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [teacherId])

   useEffect(() => { fetchData() }, [fetchData])

  // Edit page se wapas aane par fresh data fetch karo
  useEffect(() => {
    const handleFocus = () => fetchData()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchData])

const handleStatusChange = async () => {
    if (!data || !pendingStatus) return
    setIsUpdatingStatus(true)
    try {
      const res = await teachersApi.update(teacherId, { status: pendingStatus as any })
        if (res.success) {
        setData(prev => prev ? { ...prev, teacher: { ...prev.teacher, status: pendingStatus as any } } : prev)
        setStatusChangeOpen(false)
        setPendingStatus('')
        showNotification({ type: 'success', message: `Status updated to "${pendingStatus}" successfully.` })
      
        setTimeout(() => {
          router.back()
        }, 1500)
      } else {
        showNotification({ type: 'error', message: res.message || 'Failed to update status' })
        setStatusChangeOpen(false)
      }
    } catch (err: any) {
      showNotification({ type: 'error', message: err?.message || 'Status update failed' })
      setStatusChangeOpen(false)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // ─── Approve identity document ────────────────────────────────────────────
  const handleVerifyDoc = async (docId: string) => {
    const adminId = typeof window !== 'undefined' ? localStorage.getItem('adminId') || '' : ''
    if (!adminId) {
      showNotification({ type: 'error', message: 'Admin session not found. Please login again.' })
      return
    }
    try {
      const res = await teachersApi.verifyIdentityDocument(docId, adminId)
      if (res.success) {
        setData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            documents: prev.documents.map(d =>
              d._id === docId ? { ...d, verification_status: 'approved' } : d
            ),
          }
        })
        showNotification({ type: 'success', message: 'Document approved successfully.' })
      } else {
        showNotification({ type: 'error', message: res.message || 'Could not approve document.' })
      }
    } catch (err: any) {
      showNotification({ type: 'error', message: err?.message || 'Something went wrong.' })
    }
  }

  // ─── Reject identity document ─────────────────────────────────────────────
  const handleRejectDoc = async () => {
    if (!rejectDocId || rejectDocReason.trim().length < 10) return
    const adminId = typeof window !== 'undefined' ? localStorage.getItem('adminId') || '' : ''
    if (!adminId) {
      showNotification({ type: 'error', message: 'Admin session not found. Please login again.' })
      return
    }
    setIsRejectingDoc(true)
    try {
      const res = await teachersApi.rejectIdentityDocument(rejectDocId, {
        rejection_reason: rejectDocReason.trim(),
        verified_by: adminId,
      })
      if (res.success) {
        setData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            documents: prev.documents.map(d =>
              d._id === rejectDocId
                ? { ...d, verification_status: 'rejected', rejection_reason: rejectDocReason.trim() }
                : d
            ),
          }
        })
        setRejectDocOpen(false)
        setRejectDocReason('')
        setRejectDocId(null)
        showNotification({ type: 'success', message: 'Document rejected.' })
      } else {
        showNotification({ type: 'error', message: res.message || 'Could not reject document.' })
      }
    } catch (err: any) {
      showNotification({ type: 'error', message: err?.message || 'Something went wrong.' })
    } finally {
      setIsRejectingDoc(false)
    }
  }

  // ─── Loading / Error states ───────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-[#1897C6]" />
      <p className="text-sm text-[#6B7280] font-medium">Loading teacher details...</p>
    </div>
  )

  if (loadError || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle className="h-10 w-10 text-red-500" />
      <p className="text-base font-semibold text-red-600">{loadError || 'Teacher not found'}</p>
      <Link href="/dashboard/teachers/onboarding">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to List
        </Button>
      </Link>
    </div>
  )

  const { teacher, contact, addresses, qualifications, experiences, bankDetails, documents, emergencyContacts } = data
  const initials = teacher.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const currentAddr = addresses.find(a => a.address_type === 'current')
  const permanentAddr = addresses.find(a => a.address_type === 'permanent')
  const primaryBank = bankDetails.find(b => b.is_primary) || bankDetails[0]


const statusBadgeMap: Record<string, { cls: string; label: string }> = {
  active:      { cls: 'bg-green-100 text-green-700',   label: 'Active'      },
  inactive:    { cls: 'bg-gray-100 text-gray-600',     label: 'Inactive'    },
  blocked:     { cls: 'bg-red-100 text-red-700',       label: 'Blocked'     },
 archived: { cls: 'bg-orange-100 text-orange-700', label: 'Archived' },
  onboarding:  { cls: 'bg-blue-100 text-blue-700',     label: 'Onboarding'  },
}
const statusBadge = statusBadgeMap[teacher.status || ''] ?? { cls: 'bg-gray-100 text-gray-600', label: 'Unknown' }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#F8F9FA] to-[#FEFEFE] overflow-y-auto">
      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">

        {/* ── Notification Banner ── */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg flex items-start gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {notification.type === 'success'
              ? <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        )}

        {/* ── Sticky Page Header ── */}
        <div className="sticky top-0 z-40 bg-[#F8F9FA]/95 backdrop-blur-sm pb-4 -mx-4 md:-mx-8 px-4 md:px-8 pt-2 border-b border-[#E5E7EB]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/teachers/onboarding">
                <Button variant="outline" size="icon" className="h-9 w-9 border-[#E5E7EB]">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
                  Teacher Application Review
                </h1>
                <p className="text-xs text-[#6B7280] mt-0.5">Review and activate teacher profile</p>
              </div>
            </div>
        <div className="flex items-center gap-3">
              <span className="text-xs text-[#6B7280] hidden sm:inline">Status:</span>
              <Select
                value={teacher.status ?? 'onboarding'}
                onValueChange={val => { setPendingStatus(val); setStatusChangeOpen(true) }}
              >
                <SelectTrigger className={`h-10 w-[160px] text-sm font-semibold border-2 ${
                  teacher.status === 'active'     ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                  teacher.status === 'inactive'   ? 'border-gray-300 text-gray-600 bg-gray-50' :
                  teacher.status === 'blocked'    ? 'border-red-300 text-red-600 bg-red-50' :
                  teacher.status === 'archived'   ? 'border-orange-300 text-orange-600 bg-orange-50' :
                  'border-blue-300 text-blue-600 bg-blue-50'
                }`}>
                  <SelectValue />
                </SelectTrigger>
  <SelectContent>
  {STATUS_OPTS.map(opt => (
    <SelectItem key={opt.value} value={opt.value}>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${opt.cls}`}>
        {opt.label}
      </span>
    </SelectItem>
  ))}
</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Main Layout: Left sticky + Right scrollable ── */}
        <div className="grid lg:grid-cols-3 gap-6 pt-2">

          {/* ════ LEFT COLUMN — Sticky Profile Summary ════ */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-5">

              {/* Profile Card */}
              <Card className="border border-[#E5E7EB] shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="text-center">
<div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center text-white text-2xl sm:text-3xl font-bold mx-auto mb-4 shadow-md overflow-hidden">
  {teacher.upload_photo_url && !photoError ? (
    <img
      src={buildFileUrl(teacher.upload_photo_url)}
      alt={teacher.full_name}
      onError={() => setPhotoError(true)}
      className="w-full h-full object-cover"
    />
  ) : (
    <span>{initials}</span>
  )}
</div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#535359] mb-1">{teacher.full_name}</h2>
                    {teacher.teacher_code && (
                      <p className="text-xs font-mono text-[#6B7280] mb-2">{teacher.teacher_code}</p>
                    )}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.cls}`}>
                      {statusBadge.label.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-5 pt-5 border-t border-[#E5E7EB] space-y-3">
                    {contact?.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail size={15} className="text-[#6B7280] shrink-0" />
                        <span className="text-[#535359] truncate text-xs">{contact.email}</span>
                      </div>
                    )}
                    {contact?.mobile && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone size={15} className="text-[#6B7280] shrink-0" />
                        <span className="text-[#535359] text-xs">+91 {contact.mobile}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar size={15} className="text-[#6B7280] shrink-0" />
                      <span className="text-[#535359] text-xs">
                        Applied: {teacher.createdAt ? fmtDate(teacher.createdAt) : '—'}
                      </span>
                    </div>
                    {teacher.teacher_type && (
                      <div className="flex items-center gap-3 text-sm">
                        <School size={15} className="text-[#6B7280] shrink-0" />
                        <span className="text-[#535359] text-xs capitalize">{teacher.teacher_type}</span>
                      </div>
                    )}
                    {teacher.employment_type && (
                      <div className="flex items-center gap-3 text-sm">
                        <Briefcase size={15} className="text-[#6B7280] shrink-0" />
                        <span className="text-[#535359] text-xs capitalize">{teacher.employment_type.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="border border-[#E5E7EB] shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <h3 className="text-xs font-bold text-[#535359] uppercase tracking-wide mb-4">Profile Summary</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-[#1897C6]">{documents.length}</p>
                      <p className="text-xs text-[#6B7280]">Documents Uploaded</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#F1AF37]">{qualifications.length}</p>
                      <p className="text-xs text-[#6B7280]">Qualifications</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#D87331]">{experiences.length > 0 ? calcExp(experiences) : '—'}</p>
                      <p className="text-xs text-[#6B7280]">Total Experience</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{primaryBank ? '1' : '0'}</p>
                      <p className="text-xs text-[#6B7280]">Bank Account</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* ════ RIGHT COLUMN — Tabs + All Sections ════ */}
          <div className="lg:col-span-2 space-y-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1 bg-[#E5E7EB]/60 p-1.5 rounded-xl mb-5">
                {[
                  { value: 'overview',    label: 'Overview'         },
                  { value: 'allocations', label: 'Class Allocation'  },
                  { value: 'salary',      label: 'Salary Structure'  },
                  { value: 'activation',  label: 'Activation'        },
                ].map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value}
                    className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#1897C6] data-[state=active]:to-[#67BAC3] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ══════════════════════════════════════════════════════════
                  OVERVIEW TAB
              ══════════════════════════════════════════════════════════ */}
              <TabsContent value="overview" className="space-y-5 mt-0">

                {/* Personal Information */}
                <SectionCard icon={User} title="Personal Information">
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <InfoRow label="Full Name"       value={teacher.full_name} />
                    <InfoRow label="Gender"          value={teacher.gender} />
                    <InfoRow label="Date of Birth"   value={fmtDate(teacher.date_of_birth)} />
                    <InfoRow label="Blood Group"     value={teacher.blood_group} />
                    <InfoRow label="Marital Status"  value={teacher.marital_status} />
                    {teacher.marital_status === 'married' && (
                      <InfoRow label="Spouse Name"   value={teacher.spouse_name} />
                    )}
                    <InfoRow label="Father's Name"   value={teacher.father_name} />
                    <InfoRow label="Mother's Name"   value={teacher.mother_name} />
                    <InfoRow label="Employment Type" value={teacher.employment_type?.replace('_', ' ')} />
                    <InfoRow label="Teacher Type"    value={teacher.teacher_type} />
                    <InfoRow label="Joining Date"    value={fmtDate(teacher.joining_date)} />
                  </div>
                </SectionCard>

                {/* Contact Information */}
                <SectionCard
                  icon={Phone}
                  title="Contact Information"
                >
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <InfoRow label="Mobile"           value={contact ? `+91 ${contact.mobile}` : null} />
                    <InfoRow label="Email"            value={contact?.email} />
                    <InfoRow label="Alternate Mobile" value={contact?.alternate_mobile ? `+91 ${contact.alternate_mobile}` : null} />
                    <InfoRow label="Email Verified"   value={contact?.email_verified ? 'Yes ✓' : 'No'} />
                                        <InfoRow label="Mobile Verified"  value={contact?.mobile_verified ? 'Yes ✓' : 'No'} />
                    {(contact as any)?.whatsapp_number && (
                      <InfoRow label="WhatsApp" value={`+91 ${(contact as any).whatsapp_number}`} />
                    )}
                  </div>
                </SectionCard>

                {/* Address Details */}
                <SectionCard icon={MapPin} title="Address Details">
                  {currentAddr ? (
                    <>
                      <p className="text-xs font-bold text-[#535359] uppercase tracking-wide mb-3">Current Address</p>
                      <div className="grid sm:grid-cols-2 gap-x-6">
                        <InfoRow label="Street"   value={currentAddr.address} />
                        <InfoRow label="City"     value={currentAddr.city} />
                        <InfoRow label="State"    value={currentAddr.state} />
                        <InfoRow label="PIN Code" value={currentAddr.pincode} />
                      </div>
                    </>
                  ) : <p className="text-sm text-[#6B7280]">No address added</p>}

                  {permanentAddr && (
                    <>
                      <div className="border-t border-[#E5E7EB] my-4" />
                      <p className="text-xs font-bold text-[#535359] uppercase tracking-wide mb-3">Permanent Address</p>
                      <div className="grid sm:grid-cols-2 gap-x-6">
                        <InfoRow label="Street"   value={permanentAddr.address} />
                        <InfoRow label="City"     value={permanentAddr.city} />
                        <InfoRow label="State"    value={permanentAddr.state} />
                        <InfoRow label="PIN Code" value={permanentAddr.pincode} />
                      </div>
                    </>
                  )}
                </SectionCard>

                {/* Emergency Contacts */}
                <SectionCard
                  icon={Users}
                  title="Emergency Contacts"
                  iconColor="text-red-500"
                >
                  {emergencyContacts.length === 0
                    ? <p className="text-sm text-[#6B7280]">No emergency contacts added</p>
                    : emergencyContacts.map((ec, i) => (
                      <div key={i} className="py-3 border-b border-[#E5E7EB] last:border-0">
                        <div className="grid sm:grid-cols-3 gap-x-6">
                          <InfoRow label="Name"     value={ec.name} />
                          <InfoRow label="Relation" value={ec.relation} />
                          <InfoRow label="Mobile"   value={`+91 ${ec.mobile}`} />
                        </div>
                      </div>
                    ))
                  }
                </SectionCard>

                {/* Identity Documents */}
                <SectionCard
                  icon={IdCard}
                  title="Identity Documents"
                  iconColor="text-[#F1AF37]"
                  badge={
                    <span className="text-xs text-[#6B7280] flex items-center gap-1">
                      <Shield size={12} /> Managed by Admin
                    </span>
                  }
                >
                  {documents.length === 0
                    ? <p className="text-sm text-[#6B7280]">No documents uploaded</p>
                    : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {documents.map((doc, i) => (
                          <div key={i} className="border border-[#E5E7EB] rounded-lg p-4 hover:border-[#1897C6]/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3.5 w-3.5 text-[#F1AF37] shrink-0" />
                                  <p className="text-sm font-bold text-[#535359] capitalize">
                                    {doc.document_type?.replace(/_/g, ' ')}
                                  </p>
                                </div>
                                {doc.masked_number && (
                                  <p className="text-xs text-[#6B7280] mt-1 font-mono">{doc.masked_number}</p>
                                )}
                              </div>
                              <VerifBadge status={doc.verification_status} />
                            </div>

                            {doc.verification_status === 'rejected' && doc.rejection_reason && (
                              <p className="text-xs text-red-600 mb-2">Reason: {doc.rejection_reason}</p>
                            )}

                            <div className="flex flex-wrap gap-2 mt-2">
                              {doc.file_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(buildFileUrl(doc.file_url!), '_blank')}
                                  className="h-8 px-3 text-xs gap-1 border-[#E5E7EB] text-[#1897C6] hover:bg-[#1897C6]/10 hover:border-[#1897C6]/40 hover:text-[#1897C6]">
                                  <Eye className="h-3 w-3" /> View
                                </Button>
                              )}
                              {doc.verification_status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVerifyDoc(doc._id!)}
                                    className="h-8 px-3 text-xs gap-1 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors">
                                    <CheckCircle className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setRejectDocId(doc._id!); setRejectDocOpen(true) }}
                                    className="h-8 px-3 text-xs gap-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors">
                                    <XCircle className="h-3 w-3" /> Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </SectionCard>

                {/* Bank Details */}
                <SectionCard
                  icon={CreditCard}
                  title="Bank Account Details"
                  iconColor="text-[#F1AF37]"
                  badge={
                    <span className="text-xs text-[#6B7280] flex items-center gap-1">
                      <Shield size={12} /> Managed by Admin
                    </span>
                  }
                >
                  {!primaryBank
                    ? <p className="text-sm text-[#6B7280]">No bank details added</p>
                    : (
                      <div className="grid sm:grid-cols-2 gap-x-6">
                        <InfoRow label="Account Holder" value={primaryBank.account_holder_name} />
                        <InfoRow label="Bank Name"       value={primaryBank.bank_name} />
                        <InfoRow label="Account Number"  value={primaryBank.account_number ? `****${primaryBank.account_number.slice(-4)}` : null} />
                        <InfoRow label="IFSC Code"        value={primaryBank.ifsc_code} />
                        <InfoRow label="Branch Name"      value={primaryBank.branch_name} />
                        <InfoRow label="Account Type"     value={primaryBank.account_type} />
                        <InfoRow label="UPI ID"           value={primaryBank.upi_id} />
                        <InfoRow label="Primary Account"  value={primaryBank.is_primary ? 'Yes' : 'No'} />
                      </div>
                    )
                  }
                </SectionCard>

                {/* Educational Qualifications */}
                <SectionCard
                  icon={GraduationCap}
                  title="Educational Qualifications"
                  badge={
                    <span className="text-xs text-[#6B7280] flex items-center gap-1">
                      <Shield size={12} /> Managed by Admin
                    </span>
                  }
                >
                  {qualifications.length === 0
                    ? <p className="text-sm text-[#6B7280]">No qualifications added</p>
                    : (
                      <div className="space-y-3">
                        {qualifications.map((q, i) => (
                          <div key={i} className="border-l-4 border-[#1897C6] pl-4 py-2 flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <p className="font-bold text-[#535359]">{q.qualification}</p>
                              {q.specialization && (
                                <p className="text-sm text-[#6B7280]">{q.specialization}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-[#9CA3AF] flex-wrap">
                                {q.institute_name && <span>{q.institute_name}</span>}
                                {q.institute_name && q.passing_year && <span>•</span>}
                                 {q.passing_year && <span>{q.passing_year.match(/^(\d{4})-/) ? q.passing_year.match(/^(\d{4})-/)![1] : new Date(q.passing_year).getFullYear()}</span>}                              </div>
                            </div>
                            {q.file_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(buildFileUrl(q.file_url!), '_blank')}
                                className="h-8 px-3 text-xs gap-1 border-[#E5E7EB] text-[#1897C6] hover:bg-[#1897C6]/10 hover:border-[#1897C6]/40 hover:text-[#1897C6] shrink-0">
                                <ExternalLink className="h-3 w-3" />
                                {/\.(jpg|jpeg|png|webp)$/i.test(q.file_url) ? 'View' : 'Certificate'}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  }
                </SectionCard>

                {/* Work Experience */}
                <SectionCard
                  icon={Briefcase}
                  title="Work Experience"
                  badge={
                    <span className="text-xs text-[#6B7280] flex items-center gap-1">
                      <Shield size={12} /> Managed by Admin
                    </span>
                  }
                >
                  {experiences.length === 0
                    ? <p className="text-sm text-[#6B7280]">No experience added</p>
                    : (
                      <>
                        <p className="text-xs font-medium text-[#6B7280] mb-4">
                          Total Experience: <span className="text-[#535359] font-bold">{calcExp(experiences)}</span>
                        </p>
                        <div className="space-y-3">
                          {experiences.map((exp, i) => (
                            <div key={i} className="border-l-4 border-[#D87331] pl-4 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <p className="font-bold text-[#535359]">{exp.role}</p>
                                  <p className="text-sm text-[#6B7280]">{exp.organization_name}</p>
                                  {(exp as any).responsibilities && (
                                    <p className="text-xs text-[#6B7280]">{(exp as any).responsibilities}</p>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                                    <Clock size={12} />
                                    <span>
                                      {fmtDate(exp.from_date)} →{' '}
                                      {exp.is_current
                                        ? <span className="font-medium text-emerald-600">Present</span>
                                        : fmtDate(exp.to_date)
                                      }
                                    </span>
                                  </div>
                                </div>
                                {exp.is_current && (
                                  <span className="bg-[#1897C6]/10 text-[#1897C6] px-2 py-0.5 rounded text-xs font-semibold shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  }
                </SectionCard>

              </TabsContent>

              {/* CLASS ALLOCATION TAB */}
              <TabsContent value="allocations" forceMount>
                <div className={activeTab === 'allocations' ? 'block' : 'hidden'}>
                  <ClassAllocationTab
                    teacherId={teacherId}
                    onNotify={showNotification}
                  />
                </div>
              </TabsContent>

              {/* SALARY STRUCTURE TAB */}
              <TabsContent value="salary" forceMount>
                <div className={activeTab === 'salary' ? 'block' : 'hidden'}>
                  <SalaryStructureTab
                    teacherId={teacherId}
                    onNotify={showNotification}
                  />
                </div>
              </TabsContent>

              {/* ACTIVATION TAB */}
              <TabsContent value="activation" className="mt-0">
                <ActivationTab
                  teacherId={teacherId}
                  teacher={teacher}
                  onNotify={showNotification}
                  onActivated={() => {
                    setData(prev => prev
                      ? { ...prev, teacher: { ...prev.teacher, status: 'active' } }
                      : prev
                    )
                  }}
                />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>



    {/* ── Status Change Confirmation Dialog ── */}
      <AlertDialog open={statusChangeOpen} onOpenChange={v => { if (!v) { setStatusChangeOpen(false); setPendingStatus('') } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Status Change
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>You are about to change <strong>{data?.teacher.full_name}</strong>'s status to:</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  pendingStatus === 'active'   ? 'bg-emerald-100 text-emerald-700' :
                  pendingStatus === 'inactive' ? 'bg-gray-100 text-gray-700' :
                  pendingStatus === 'blocked'  ? 'bg-red-100 text-red-700' :
                  pendingStatus === 'archived' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {pendingStatus?.toUpperCase()}
                </span>
                {pendingStatus !== 'onboarding' && (
                  <p className="text-xs text-[#6B7280] pt-1">
                    {pendingStatus === 'active'   && 'Teacher will appear in Active Teachers list.'}
                    {pendingStatus === 'inactive' && 'Teacher will appear in Inactive Teachers list.'}
                    {pendingStatus === 'blocked'  && 'Teacher will appear in Inactive Teachers list as Blocked.'}
                    {pendingStatus === 'archived' && 'Teacher will appear in Inactive Teachers list as Archived.'}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={isUpdatingStatus}
              className={`gap-2 ${
                pendingStatus === 'active'   ? 'bg-emerald-500 hover:bg-emerald-600' :
                pendingStatus === 'blocked'  ? 'bg-red-500 hover:bg-red-600' :
                pendingStatus === 'archived' ? 'bg-orange-500 hover:bg-orange-600' :
                'bg-gray-500 hover:bg-gray-600'
              }`}>
              {isUpdatingStatus
                ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</>
                : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reject Document Dialog ── */}
      <Dialog open={rejectDocOpen} onOpenChange={open => {
        if (!open) { setRejectDocOpen(false); setRejectDocReason(''); setRejectDocId(null) }
      }}>
        <DialogContent className="max-w-md">
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
            <Label className="text-sm font-medium">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={rejectDocReason}
              onChange={e => setRejectDocReason(e.target.value)}
              placeholder="e.g. Document image is not clear, please re-upload"
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-[#6B7280]">Minimum 10 characters required.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setRejectDocOpen(false); setRejectDocReason(''); setRejectDocId(null) }}
              disabled={isRejectingDoc}>
              Cancel
            </Button>
            <Button
              onClick={handleRejectDoc}
              disabled={rejectDocReason.trim().length < 10 || isRejectingDoc}
              className="bg-red-500 hover:bg-red-600 gap-2">
              {isRejectingDoc
                ? <><Loader2 className="h-4 w-4 animate-spin" />Rejecting...</>
                : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
