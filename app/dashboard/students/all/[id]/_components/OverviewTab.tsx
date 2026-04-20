'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { User, Phone, Mail, MapPin, GraduationCap, Users, FileText, Loader2, Eye, CheckCircle, XCircle } from 'lucide-react'
import type { Student, StudentContact, StudentAddress, StudentGuardian, StudentAcademicMapping, StudentIdentityDocument, StudentAcademicDocument } from '@/lib/api/students'
import type { ClassMaster, CoachingBatch } from '@/lib/api/classes'

// Define ClassSection locally if not exported from classes module
interface ClassSection {
  _id?: string
  section_name: string
  [key: string]: unknown
}
import { buildFileUrl, capitalize, formatDate, InfoItem } from '../_utils/helpers'
import { studentsApi } from '@/lib/api/students'

interface OverviewTabProps {
  student: Student
  contacts: StudentContact[]
  addresses: StudentAddress[]
  guardians: StudentGuardian[]
  mapping: StudentAcademicMapping | null
  classInfo: ClassMaster | null
  batchInfo: CoachingBatch | null
  classLabel: string
  identityDocs: StudentIdentityDocument[]
  academicDocs: StudentAcademicDocument[]
  adminId?: string
}

export function OverviewTab({
  student, contacts, addresses, guardians, mapping,
  classInfo, batchInfo, classLabel,
  identityDocs, academicDocs, adminId,
}: OverviewTabProps) {
  const allDocs = [...identityDocs, ...academicDocs]

  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold">Complete Student Profile</h2>
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-[#1897C6]" /> Personal Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Student Code"  value={student.student_code} />
              <InfoItem label="Date of Birth" value={formatDate(student.date_of_birth)} />
              <InfoItem label="Gender"        value={capitalize(student.gender)} />
              <InfoItem label="Blood Group"   value={student.blood_group} />
              <InfoItem label="Student Type"  value={capitalize(student.student_type)} />
              {student.nationality && <InfoItem label="Nationality"  value={student.nationality} />}
              {student.religion    && <InfoItem label="Religion"     value={capitalize(student.religion)} />}
              {student.caste       && <InfoItem label="Caste"        value={capitalize(student.caste)} />}
              {student.category    && <InfoItem label="Category"     value={student.category} />}
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-[#1897C6]" /> Contact Information</CardTitle></CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No contact information available</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {contacts.find(c => c.contact_type === 'student')?.mobile           && <InfoItem label="Student Mobile"   value={contacts.find(c => c.contact_type === 'student')!.mobile}            icon={Phone} />}
                {contacts.find(c => c.contact_type === 'student')?.email            && <InfoItem label="Student Email"    value={contacts.find(c => c.contact_type === 'student')!.email!}             icon={Mail} />}
                {contacts.find(c => c.contact_type === 'student')?.alternate_mobile && <InfoItem label="Alternate Mobile" value={contacts.find(c => c.contact_type === 'student')!.alternate_mobile!}  icon={Phone} />}
                {contacts.find(c => c.contact_type === 'father')?.mobile            && <InfoItem label="Father Mobile"    value={contacts.find(c => c.contact_type === 'father')!.mobile}              icon={Phone} />}
                {contacts.find(c => c.contact_type === 'father')?.email             && <InfoItem label="Father Email"     value={contacts.find(c => c.contact_type === 'father')!.email!}               icon={Mail} />}
                {contacts.find(c => c.contact_type === 'mother')?.mobile            && <InfoItem label="Mother Mobile"    value={contacts.find(c => c.contact_type === 'mother')!.mobile}              icon={Phone} />}
                {contacts.find(c => c.contact_type === 'mother')?.email             && <InfoItem label="Mother Email"     value={contacts.find(c => c.contact_type === 'mother')!.email!}               icon={Mail} />}
                {contacts.find(c => c.contact_type === 'guardian')?.mobile          && <InfoItem label="Guardian Mobile"  value={contacts.find(c => c.contact_type === 'guardian')!.mobile}            icon={Phone} />}
                {contacts.find(c => c.contact_type === 'guardian')?.email           && <InfoItem label="Guardian Email"   value={contacts.find(c => c.contact_type === 'guardian')!.email!}             icon={Mail} />}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Addresses */}
        {addresses.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[#1897C6]" /> Address Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(['current', 'permanent'] as const).map(type => {
                const addr = addresses.find(a => a.address_type === type)
                if (!addr) return null
                return (
                  <div key={type}>
                    <h4 className="text-sm font-semibold mb-3 text-[#1897C6]">{type === 'current' ? 'Current' : 'Permanent'} Address</h4>
                    <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                      <p className="font-medium text-sm">{addr.address}</p>
                      <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        <InfoItem label="City"    value={addr.city} />
                        <InfoItem label="State"   value={addr.state} />
                        <InfoItem label="Pincode" value={addr.pincode} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Guardians */}
        {guardians.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#1897C6]" /> Guardian Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {guardians.map((g, i) => (
                <div key={g._id ?? i}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{capitalize(g.relation)}</p>
                    {g.is_primary && <Badge className="bg-[#1897C6] text-white text-xs">Primary</Badge>}
                  </div>
                  <div className="bg-muted/20 p-3 rounded-lg space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoItem label="Name"   value={g.name} />
                      <InfoItem label="Mobile" value={g.mobile} icon={Phone} />
                    </div>
                    {g.email && <InfoItem label="Email" value={g.email} icon={Mail} />}
                    {(g.occupation || g.annual_income != null) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {g.occupation          && <InfoItem label="Occupation"    value={g.occupation} />}
                        {g.annual_income != null && <InfoItem label="Annual Income" value={`₹${Number(g.annual_income).toLocaleString('en-IN')}`} />}
                      </div>
                    )}
                  </div>
                  {i < guardians.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Academic Info */}
        <Card className={addresses.length > 0 && guardians.length > 0 ? 'lg:col-span-2' : ''}>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-[#1897C6]" /> Academic Information</CardTitle></CardHeader>
          <CardContent>
            {!mapping ? (
              <p className="text-sm text-muted-foreground italic">No active academic mapping found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoItem label="Student Type"  value={capitalize(student.student_type)} />
                <InfoItem label="Class"         value={classInfo?.class_name} />
                  <InfoItem label="Batch" value={batchInfo?.batch_name ?? null} />
                <InfoItem label="Roll Number"   value={mapping.roll_number} />
                <InfoItem label="Academic Year" value={mapping.academic_year} />
                <InfoItem label="Joined On"     value={formatDate(mapping.joined_at)} />
                <InfoItem label="Status"        value={capitalize(mapping.status)} />
              </div>
            )}
            {(() => {
              const prevDoc = academicDocs.find(d => d.document_type === 'transfer_certificate')
              if (!prevDoc) return null
              return (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <p className="text-sm font-semibold text-[#1897C6]">Previous Academic Details</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {prevDoc.previous_school_name && <InfoItem label="Previous School" value={prevDoc.previous_school_name} />}
                    {prevDoc.class_completed      && <InfoItem label="Class Completed" value={prevDoc.class_completed} />}
                    {prevDoc.previous_board       && <InfoItem label="Previous Board"  value={prevDoc.previous_board} />}
                    {prevDoc.academic_year        && <InfoItem label="Academic Year"   value={prevDoc.academic_year} />}
                    {prevDoc.remarks              && <InfoItem label="Remarks"         value={prevDoc.remarks} />}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* Documents */}
        {allDocs.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#1897C6]" /> Documents Submitted
                {(() => {
                  const pendingCount = allDocs.filter(
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
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {identityDocs.map(doc => (
                  <DocVerifyItem
                    key={doc._id}
                    label={capitalize(doc.document_type.replace(/_/g, ' '))}
                    fileUrl={buildFileUrl(doc.file_url)}
                    docId={doc._id}
                    docCategory="identity"
                    verificationStatus={doc.verification_status ?? 'pending'}
                    rejectionReason={doc.remarks ?? null}
                    adminId={adminId}
                  />
                ))}
                {academicDocs.map(doc => (
                  <DocVerifyItem
                    key={doc._id}
                    label={capitalize(doc.document_type.replace(/_/g, ' '))}
                    fileUrl={buildFileUrl(doc.file_url)}
                    docId={doc._id}
                    docCategory="academic"
                    verificationStatus={doc.verification_status ?? 'pending'}
                    rejectionReason={doc.remarks ?? null}
                    adminId={adminId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        

      </div>
    </div>
  )
}
// ─── Document Verify Item (inline, same file) ─────────────────────────────────

function DocVerifyItem({
  label,
  fileUrl,
  docId,
  docCategory,
  verificationStatus,
  rejectionReason: initialRejectionReason,
  adminId,
}: {
  label: string
  fileUrl: string | null
  docId?: string
  docCategory?: 'identity' | 'academic'
  verificationStatus?: string
  rejectionReason?: string | null
  adminId?: string
}) {
  const [isProcessing,         setIsProcessing]         = useState(false)
  const [localStatus,          setLocalStatus]          = useState(verificationStatus)
  const [localRejectionReason, setLocalRejectionReason] = useState<string | null | undefined>(initialRejectionReason)
  const [showRejectDialog,     setShowRejectDialog]     = useState(false)
  const [rejectReason,         setRejectReason]         = useState('')

  const hasFile   = !!fileUrl
  const canVerify = hasFile && !!docId && !!docCategory && !!adminId
  const isPending = localStatus !== 'approved' && localStatus !== 'rejected'

  const handleVerify = async (status: 'approved' | 'rejected', reason?: string) => {
    if (!canVerify) return
    setIsProcessing(true)
    try {
      const payload: Record<string, unknown> = { verification_status: status, verified_by: adminId }
      if (status === 'rejected' && reason) payload.remarks = reason
      const res = docCategory === 'identity'
        ? await studentsApi.verifyIdentityDocument(docId!, payload as any)
        : await studentsApi.verifyAcademicDocument(docId!, payload as any)
      if (res.success) {
        setLocalStatus(status)
        if (status === 'rejected') setLocalRejectionReason(reason ?? null)
      }
    } catch (err) {
      console.error('[DocVerifyItem] Verify error:', err)
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
    const conf =
      status === 'approved' ? { cls: 'bg-green-100 text-green-700',   label: 'Approved' } :
      status === 'rejected' ? { cls: 'bg-red-100 text-red-700',       label: 'Rejected' } :
                              { cls: 'bg-yellow-100 text-yellow-700', label: 'Pending'  }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${conf.cls}`}>
        {conf.label.toUpperCase()}
      </span>
    )
  }

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 hover:border-[#1897C6]/30 transition-colors">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 text-[#1897C6] shrink-0" />
            <p className="text-sm font-bold text-gray-700 capitalize truncate">{label}</p>
          </div>
          <VerifBadge status={localStatus} />
        </div>

        {localStatus === 'rejected' && localRejectionReason && (
          <p className="text-xs text-red-600 mb-2 italic">Reason: {localRejectionReason}</p>
        )}

        {!hasFile && (
          <p className="text-xs text-muted-foreground italic mb-2">No file uploaded</p>
        )}

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

          {canVerify && isPending && (
            <>
              <Button
                size="sm"
                className="h-8 px-3 text-xs gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors"
                onClick={() => handleVerify('approved')}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs gap-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                Reject
              </Button>
            </>
          )}

          {canVerify && !isPending && (
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

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowRejectDialog(false); setRejectReason('') } }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-semibold text-lg">
              <XCircle className="h-5 w-5" /> Reject Document
            </div>
            <p className="text-sm text-muted-foreground">Please provide a reason for rejecting this document.</p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Document image is not clear, please re-upload..."
                className="w-full min-h-[100px] resize-none border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1897C6]"
              />
              <p className="text-xs text-muted-foreground">Minimum 10 characters required.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason('') }} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={rejectReason.trim().length < 10 || isProcessing}
                className="bg-red-500 hover:bg-red-600 text-white gap-2"
              >
                {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" />Rejecting...</> : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}