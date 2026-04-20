'use client'

import React, { useEffect, useState, useCallback, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User, Phone, MapPin, Briefcase, GraduationCap,
  FileText, IdCard, Eye, Download, AlertCircle, RefreshCw,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import type {
  Teacher, TeacherContact, TeacherAddress,
  TeacherIdentityDocument, TeacherQualification, TeacherExperience,
} from '@/lib/api/teachers'

import { IMAGE_BASE_URL } from '@/lib/api/config'

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} className="h-7 gap-1 text-rose-600 hover:bg-rose-100">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="grid grid-cols-3 gap-2">
          <div className="h-4 rounded bg-muted" />
          <div className="col-span-2 h-4 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

function InfoRow({ label, value, mono, className, children }: {
  label: string; value?: string | null; mono?: boolean; className?: string; children?: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-xs sm:text-sm text-muted-foreground">{label}:</span>
      <span className={`col-span-2 text-xs sm:text-sm font-medium flex items-center flex-wrap gap-1 break-all ${mono ? 'font-mono' : ''} ${className ?? ''}`}>
        {value ?? '—'}{children}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
const map: Record<string, string> = {
  active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive:    'bg-amber-50 text-amber-700 border-amber-200',
  blocked:     'bg-rose-50 text-rose-700 border-rose-200',
  archived:    'bg-slate-50 text-slate-700 border-slate-200',
  onboarding:  'bg-blue-50 text-blue-700 border-blue-200',
}
  return <Badge className={`${map[status] ?? map.inactive} text-xs capitalize`}>{status}</Badge>
}

function AddressCard({ label, address }: { label: string; address: TeacherAddress }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground capitalize">{label}</p>
      <p className="text-sm">
        {[address.address, address.city, address.state, address.pincode].filter(Boolean).join(', ')}
      </p>
    </div>
  )
}

function resolveFileUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${IMAGE_BASE_URL}/uploads/${url.replace(/^\/?(uploads\/)?/, '')}`
}

function ImagePreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-medium text-muted-foreground">Document Preview</p>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none px-2"
          >✕</button>
        </div>
        <div className="flex items-center justify-center bg-muted/20 min-h-[300px] max-h-[75vh] overflow-auto p-4">
          {isImage ? (
            <img
              src={url}
              alt="Document preview"
              className="max-w-full max-h-[65vh] object-contain rounded-lg shadow"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : (
            <iframe
              src={url}
              className="w-full h-[65vh] rounded border-0"
              title="Document preview"
            />
          )}
          <p className="hidden text-sm text-muted-foreground">Unable to load preview. <a href={url} target="_blank" rel="noreferrer" className="text-[#1897C6] underline">Open in new tab</a></p>
        </div>
      </div>
    </div>
  )
}

function DocumentRow({ doc }: { doc: TeacherIdentityDocument }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const statusConfig: Record<string, { label: string; className: string }> = {
    approved: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
    rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  }
  const verStatus = doc.verification_status ?? 'pending'
  const config = statusConfig[verStatus] ?? statusConfig.pending

   return (
      <>
        {previewUrl && <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border hover:border-[#F1AF37]/30 transition-all">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-[#F1AF37] shrink-0" />
              <p className="font-medium text-sm capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
            </div>
            {(doc.masked_number || doc.document_number) && (
              <p className="text-xs text-muted-foreground ml-6">{doc.masked_number ?? doc.document_number}</p>
            )}
            {doc.rejection_reason && verStatus === 'rejected' && (
              <p className="text-xs text-rose-600 ml-6 mt-0.5">Reason: {doc.rejection_reason}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-6 sm:ml-0">
            <Badge className={`${config.className} text-xs`}>{config.label}</Badge>
            {doc.file_url && (
              <>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#1897C6] hover:bg-[#1897C6]/20 hover:text-[#1270A0]"
                  onClick={() => setPreviewUrl(resolveFileUrl(doc.file_url!))}>
                  <Eye className="h-3 w-3 mr-1" />View
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-600 hover:bg-green-200 hover:text-green-800"
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = resolveFileUrl(doc.file_url!)
                    a.download = `${doc.document_type}.pdf`
                    a.click()
                  }}>
                  <Download className="h-3 w-3 mr-1" />Download
                </Button>
              </>
            )}
          </div>
        </div>
      </>
    )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function TeacherOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>  // ✅ Next.js 15: Promise type
}) {
  const { id: teacherId } = use(params)  // ✅ React.use() to unwrap

  const [teacher,        setTeacher]        = useState<Teacher | null>(null)
  const [contact,        setContact]        = useState<TeacherContact | null>(null)
  const [addresses,      setAddresses]      = useState<TeacherAddress[]>([])
  const [documents,      setDocuments]      = useState<TeacherIdentityDocument[]>([])
  const [qualifications, setQualifications] = useState<TeacherQualification[]>([])
  const [experiences,    setExperiences]    = useState<TeacherExperience[]>([])

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState({
    teacher: true, contact: true, addresses: true,
    documents: true, qualifications: true, experiences: true,
  })
  const [errors, setErrors] = useState<Record<string, string | null>>({
    teacher: null, contact: null, addresses: null,
    documents: null, qualifications: null, experiences: null,
  })

  const fetchTeacher = useCallback(async () => {
    setLoading((p) => ({ ...p, teacher: true }))
    setErrors((p)  => ({ ...p, teacher: null }))
    try {
      const res = await teachersApi.getById(teacherId)
      if (!res.success || !res.result) throw new Error(res.message || 'Failed to load teacher')
      setTeacher(res.result)
      console.log('[TeacherOverview] Teacher loaded:', res.result._id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load teacher details'
      setErrors((p) => ({ ...p, teacher: msg }))
      console.error('[TeacherOverview] fetchTeacher error:', err)
    } finally {
      setLoading((p) => ({ ...p, teacher: false }))
    }
  }, [teacherId])

const fetchContact = useCallback(async () => {
  setLoading((p) => ({ ...p, contact: true }))
  setErrors((p)  => ({ ...p, contact: null }))
  try {
    const res = await teachersApi.getContactByTeacher(teacherId)
    // ✅ statusCode check hatao — success/result se hi handle karo
    if (!res.success || !res.result) {
      setContact(null)
      return
    }
    setContact(res.result)
    console.log('[TeacherOverview] Contact loaded')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to load contact details'
    setErrors((p) => ({ ...p, contact: msg }))
    console.error('[TeacherOverview] fetchContact error:', err)
  } finally {
    setLoading((p) => ({ ...p, contact: false }))
  }
}, [teacherId])

  const fetchAddresses = useCallback(async () => {
    setLoading((p) => ({ ...p, addresses: true }))
    setErrors((p)  => ({ ...p, addresses: null }))
    try {
      const res = await teachersApi.getAddressesByTeacher(teacherId)
      if (!res.success) throw new Error(res.message || 'Failed to load addresses')
      setAddresses(res.result ?? [])
      console.log('[TeacherOverview] Addresses loaded:', res.result?.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load address details'
      setErrors((p) => ({ ...p, addresses: msg }))
      console.error('[TeacherOverview] fetchAddresses error:', err)
    } finally {
      setLoading((p) => ({ ...p, addresses: false }))
    }
  }, [teacherId])

  const fetchDocuments = useCallback(async () => {
    setLoading((p) => ({ ...p, documents: true }))
    setErrors((p)  => ({ ...p, documents: null }))
    try {
      const res = await teachersApi.getIdentityDocumentsByTeacher(teacherId)
      if (!res.success) throw new Error(res.message || 'Failed to load documents')
      setDocuments(res.result ?? [])
      console.log('[TeacherOverview] Documents loaded:', res.result?.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load identity documents'
      setErrors((p) => ({ ...p, documents: msg }))
      console.error('[TeacherOverview] fetchDocuments error:', err)
    } finally {
      setLoading((p) => ({ ...p, documents: false }))
    }
  }, [teacherId])

  const fetchQualifications = useCallback(async () => {
    setLoading((p) => ({ ...p, qualifications: true }))
    setErrors((p)  => ({ ...p, qualifications: null }))
    try {
      const res = await teachersApi.getQualificationsByTeacher(teacherId)
      if (!res.success) throw new Error(res.message || 'Failed to load qualifications')
      setQualifications(res.result ?? [])
      console.log('[TeacherOverview] Qualifications loaded:', res.result?.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load qualifications'
      setErrors((p) => ({ ...p, qualifications: msg }))
      console.error('[TeacherOverview] fetchQualifications error:', err)
    } finally {
      setLoading((p) => ({ ...p, qualifications: false }))
    }
  }, [teacherId])

  const fetchExperiences = useCallback(async () => {
    setLoading((p) => ({ ...p, experiences: true }))
    setErrors((p)  => ({ ...p, experiences: null }))
    try {
      const res = await teachersApi.getExperienceByTeacher(teacherId)
      if (!res.success) throw new Error(res.message || 'Failed to load experience')
      setExperiences(res.result ?? [])
      console.log('[TeacherOverview] Experiences loaded:', res.result?.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load experience details'
      setErrors((p) => ({ ...p, experiences: msg }))
      console.error('[TeacherOverview] fetchExperiences error:', err)
    } finally {
      setLoading((p) => ({ ...p, experiences: false }))
    }
  }, [teacherId])

  useEffect(() => {
    fetchTeacher(); fetchContact(); fetchAddresses()
    fetchDocuments(); fetchQualifications(); fetchExperiences()
  }, [fetchTeacher, fetchContact, fetchAddresses, fetchDocuments, fetchQualifications, fetchExperiences])

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const formatEmploymentType = (type?: string | null) => {
    const map: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', visiting: 'Visiting' }
    return type ? (map[type] ?? type) : '—'
  }

  const currentAddress   = addresses.find((a) => a.address_type === 'current')
  const permanentAddress = addresses.find((a) => a.address_type === 'permanent')

 return (
    <>
      {previewUrl && <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
      <div className="space-y-4">
        {errors.teacher && <ErrorBanner message={errors.teacher} onRetry={fetchTeacher} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-[#1897C6]" />
              <CardTitle className="text-base sm:text-lg">Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3">
            {loading.teacher ? <SectionSkeleton /> : teacher ? (
              <>
                <InfoRow label="Full Name"      value={teacher.full_name} />
                <InfoRow label="Father's Name"  value={teacher.father_name} />
                <InfoRow label="Mother's Name"  value={teacher.mother_name} />
                <InfoRow label="Date of Birth"  value={formatDate(teacher.date_of_birth)} />
                <InfoRow label="Gender"         value={teacher.gender}         className="capitalize" />
                <InfoRow label="Blood Group"    value={teacher.blood_group} />
                <InfoRow label="Marital Status" value={teacher.marital_status} className="capitalize" />
                {teacher.marital_status === 'married' && <InfoRow label="Spouse Name" value={teacher.spouse_name} />}
              </>
            ) : <p className="text-sm text-muted-foreground">No personal information available</p>}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-[#1897C6]" />
              <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3">
            {loading.contact ? <SectionSkeleton /> : errors.contact ? (
              <ErrorBanner message={errors.contact} onRetry={fetchContact} />
            ) : contact ? (
              <>
                <InfoRow label="Email" value={contact.email}>
                  {contact.email_verified && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Verified</Badge>}
                </InfoRow>
                <InfoRow label="Mobile" value={contact.mobile}>
                  {contact.mobile_verified && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Verified</Badge>}
                </InfoRow>
                <InfoRow label="Alt Mobile" value={contact.alternate_mobile} />

                <InfoRow label="WhatsApp"   value={contact.whatsapp_number} />
              </>
            ) : <p className="text-sm text-muted-foreground">No contact information available</p>}
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-[#F1AF37]/5 to-[#D88931]/5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-[#F1AF37]" />
              <CardTitle className="text-base sm:text-lg">Professional Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3">
            {loading.teacher ? <SectionSkeleton /> : teacher ? (
              <>
                <InfoRow label="Teacher Code" value={teacher.teacher_code} mono />
                <InfoRow label="Teacher Type" value={teacher.teacher_type}        className="capitalize" />
                <InfoRow label="Employment"   value={formatEmploymentType(teacher.employment_type)} />
                <InfoRow label="Joining Date" value={formatDate(teacher.joining_date)} />
                <InfoRow label="Status"><StatusBadge status={teacher.status ?? 'active'} /></InfoRow>
              </>
            ) : <p className="text-sm text-muted-foreground">No professional information available</p>}
          </CardContent>
        </Card>

        {/* Qualifications */}
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-[#F1AF37]/5 to-[#D88931]/5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-[#F1AF37]" />
              <CardTitle className="text-base sm:text-lg">Qualifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading.qualifications ? <SectionSkeleton /> : errors.qualifications ? (
              <ErrorBanner message={errors.qualifications} onRetry={fetchQualifications} />
            ) : qualifications.length > 0 ? (
              <div className="space-y-3">
                {qualifications.map((q, i) => (
                  <div key={q._id ?? i} className="rounded-lg border p-3 bg-muted/30 space-y-1">
                    <p className="font-semibold text-sm">{q.qualification}</p>
                    {q.specialization && <p className="text-xs text-muted-foreground">Specialization: {q.specialization}</p>}
                    {q.institute_name  && <p className="text-xs text-muted-foreground">Institute: {q.institute_name}</p>}
                    {q.passing_year    && <p className="text-xs text-muted-foreground">Year: {q.passing_year}</p>}
                       {q.file_url && (
                      <div className="pt-1 flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#1897C6] hover:bg-[#1897C6]/20 hover:text-[#1270A0]"
                          onClick={() => setPreviewUrl(resolveFileUrl(q.file_url!))}>
                          <Eye className="h-3 w-3 mr-1" />View
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-600 hover:bg-green-200 hover:text-green-800"
                          onClick={() => { const a = document.createElement('a'); a.href = resolveFileUrl(q.file_url!); a.download = `qual_${i}.pdf`; a.click() }}>
                          <Download className="h-3 w-3 mr-1" />Download
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No qualifications added</p>}
          </CardContent>
        </Card>
      </div>

      {/* Work Experience */}
      {(experiences.length > 0 || loading.experiences || errors.experiences) && (
        <Card className="border-2">
          <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-[#1897C6]" />
              <CardTitle className="text-base sm:text-lg">Work Experience</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading.experiences ? <SectionSkeleton /> : errors.experiences ? (
              <ErrorBanner message={errors.experiences} onRetry={fetchExperiences} />
            ) : (
              <div className="space-y-3">
                {experiences.map((exp, i) => (
                  <div key={exp._id ?? i} className="rounded-lg border p-3 bg-muted/30 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{exp.organization_name}</p>
                        {exp.role && <p className="text-xs text-muted-foreground">{exp.role}</p>}
                      </div>
                      {exp.is_current && <Badge className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">Current</Badge>}
                    </div>
                    {(exp.from_date || exp.to_date) && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(exp.from_date)} — {exp.is_current ? 'Present' : formatDate(exp.to_date)}
                      </p>
                    )}
                    {exp.responsibilities && <p className="text-xs text-muted-foreground mt-1">{exp.responsibilities}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Address */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#1897C6]" />
            <CardTitle className="text-base sm:text-lg">Address</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading.addresses ? <SectionSkeleton /> : errors.addresses ? (
            <ErrorBanner message={errors.addresses} onRetry={fetchAddresses} />
          ) : addresses.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentAddress   && <AddressCard label="Current Address"   address={currentAddress} />}
              {permanentAddress && <AddressCard label="Permanent Address" address={permanentAddress} />}
              {!currentAddress && !permanentAddress && addresses.map((addr, i) => (
                <AddressCard key={addr._id ?? i} label={addr.address_type} address={addr} />
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No address information available</p>}
        </CardContent>
      </Card>

      {/* Identity Documents */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-[#F1AF37]/5 to-[#D88931]/5 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <IdCard className="h-5 w-5 text-[#F1AF37]" />
            <CardTitle className="text-base sm:text-lg">Identity Documents</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading.documents ? (
            <div className="space-y-2 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted" />)}</div>
          ) : errors.documents ? (
            <ErrorBanner message={errors.documents} onRetry={fetchDocuments} />
          ) : documents.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {documents.map((doc, i) => <DocumentRow key={doc._id ?? i} doc={doc} />)}
            </div>
          ) : <p className="text-sm text-muted-foreground">No identity documents uploaded</p>}
        </CardContent>
      </Card>
      </div>
    </>
  )
}