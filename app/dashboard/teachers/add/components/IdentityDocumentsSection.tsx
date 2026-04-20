'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  ArrowRight,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Upload,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import { IMAGE_BASE_URL } from '@/lib/api/config'



export interface IdentityDocumentsFormData {
  // ── Aadhaar (document_type: 'address_card') ───────────────────────────────
  aadhaar_number: string
  aadhaar_file: File | null
  aadhaar_doc_id: string

  // ── PAN (document_type: 'pan_card') ──────────────────────────────────────
  pan_number: string
  pan_file: File | null
  pan_doc_id: string

  // ── Driving License (document_type: 'driving_license') ───────────────────
  driving_license: string
  driving_license_file: File | null
  driving_license_doc_id: string

  // ── Passport (document_type: 'passport') ─────────────────────────────────
  passport_number: string
  passport_file: File | null
  passport_doc_id: string
}

interface IdentityDocumentsSectionProps {
  teacherId: string
  teacherName: string
  onSuccess: (formData: IdentityDocumentsFormData) => void
  onPrevious?: () => void
  showPrevious?: boolean
  isEditMode?: boolean
}

// Field-level validation errors
interface FieldErrors {
  aadhaar_number?: string
  aadhaar_file?: string
  pan_number?: string
  pan_file?: string
  driving_license?: string
  driving_license_file?: string
  passport_number?: string
  passport_file?: string
}

// Alert/Error modal (no browser alerts)
interface AlertModal {
  open: boolean
  title: string
  message: string
}

// Shape of one document record returned by GET /teacher-identity-documents/teacher/:id
interface ExistingDoc {
  _id: string
  document_type: 'pan_card' | 'address_card' | 'passport' | 'driving_license' | 'photo'
  document_number: string
  masked_number?: string
  verification_status: 'pending' | 'approved' | 'rejected'
  file_url: string          // relative path, e.g. /uploads/teacher_identity_documents/xyz.jpg
  rejection_reason?: string
}


const buildFileUrl = (relativeUrl: string): string => {
  if (!relativeUrl) return ''
  return `${IMAGE_BASE_URL}${relativeUrl}`
}

// ─── Helper: mask Aadhaar → XXXX-XXXX-1234 ───────────────────────────────────
const maskAadhaar = (num: string): string => {
  const clean = num.replace(/\D/g, '')
  if (clean.length !== 12) return ''
  return `XXXX-XXXX-${clean.slice(8)}`
}

// ─── Helper: mask PAN → XXXXX1234F ───────────────────────────────────────────
const maskPan = (pan: string): string => {
  const clean = pan.toUpperCase().trim()
  if (clean.length !== 10) return ''
  return `XXXXX${clean.slice(5)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IdentityDocumentsSection({
  teacherId,
  teacherName,
  onSuccess,
  onPrevious,
  showPrevious = false,
  isEditMode = false,
}: IdentityDocumentsSectionProps) {

  // ── Form state ─────────────────────────────────────────────────────────────
const [formData, setFormData] = useState<IdentityDocumentsFormData>({
    aadhaar_number: '',
    aadhaar_file: null,
    aadhaar_doc_id: '',
    pan_number: '',
    pan_file: null,
    pan_doc_id: '',
    driving_license: '',
    driving_license_file: null,
    driving_license_doc_id: '',
    passport_number: '',
    passport_file: null,
    passport_doc_id: '',
  })

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoadingData, setIsLoadingData] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── File preview — blob URLs for newly selected files ─────────────────────
const aadhaarPreviewRef = useRef<string>('')
  const panPreviewRef = useRef<string>('')
  const dlPreviewRef = useRef<string>('')
  const passportPreviewRef = useRef<string>('')
  const [aadhaarPreview, setAadhaarPreview] = useState<string>('')
  const [panPreview, setPanPreview] = useState<string>('')
  const [dlPreview, setDlPreview] = useState<string>('')
  const [passportPreview, setPassportPreview] = useState<string>('')

  // ── Existing file URLs from backend (edit mode) ────────────────────────────
  const [existingAadhaarUrl, setExistingAadhaarUrl] = useState<string>('')
  const [existingPanUrl, setExistingPanUrl] = useState<string>('')
  const [existingDlUrl, setExistingDlUrl] = useState<string>('')
  const [existingPassportUrl, setExistingPassportUrl] = useState<string>('')

  // ── Verification status from backend (edit mode) ──────────────────────────
  const [aadhaarStatus, setAadhaarStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [panStatus, setPanStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [dlStatus, setDlStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [passportStatus, setPassportStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('')
  const [aadhaarRejectionReason, setAadhaarRejectionReason] = useState<string>('')
  const [panRejectionReason, setPanRejectionReason] = useState<string>('')
  const [dlRejectionReason, setDlRejectionReason] = useState<string>('')
  const [passportRejectionReason, setPassportRejectionReason] = useState<string>('')

  // ── Alert modal ────────────────────────────────────────────────────────────
  const [alertModal, setAlertModal] = useState<AlertModal>({
    open: false, title: '', message: '',
  })

  // ── Cleanup blob URLs on unmount ───────────────────────────────────────────
useEffect(() => {
    return () => {
      if (aadhaarPreviewRef.current) URL.revokeObjectURL(aadhaarPreviewRef.current)
      if (panPreviewRef.current) URL.revokeObjectURL(panPreviewRef.current)
      if (dlPreviewRef.current) URL.revokeObjectURL(dlPreviewRef.current)
      if (passportPreviewRef.current) URL.revokeObjectURL(passportPreviewRef.current)
    }
  }, [])

  // ── Edit mode: fetch existing documents ────────────────────────────────────
  // GET /teacher-identity-documents/teacher/:teacher_id
  // Returns array of ExistingDoc — find address_card (Aadhaar) and pan_card separately
  useEffect(() => {
    if (!isEditMode || !teacherId) return

    const fetchDocuments = async () => {
      setIsLoadingData(true)
      try {
        const res = await teachersApi.getIdentityDocumentsByTeacher(teacherId)

        console.log('[IdentityDocumentsSection] Fetched existing docs:', res)

        if (res.success && Array.isArray(res.result)) {
          const docs = res.result as ExistingDoc[]

          // ── Find Aadhaar (address_card) ────────────────────────────────────
          const aadhaarDoc = docs.find(d => d.document_type === 'address_card')
          if (aadhaarDoc) {
            setFormData(prev => ({
              ...prev,
              aadhaar_number: aadhaarDoc.masked_number ?? aadhaarDoc.document_number ?? '',
              aadhaar_doc_id: aadhaarDoc._id,
            }))
            setExistingAadhaarUrl(buildFileUrl(aadhaarDoc.file_url))
            setAadhaarStatus(aadhaarDoc.verification_status)
            setAadhaarRejectionReason(aadhaarDoc.rejection_reason ?? '')
          }


// ── Find PAN (pan_card) ────────────────────────────────────────────
          const panDoc = docs.find(d => d.document_type === 'pan_card')
          if (panDoc) {
            setFormData(prev => ({
              ...prev,
              pan_number: panDoc.masked_number ?? panDoc.document_number ?? '',
              pan_doc_id: panDoc._id,
            }))
            setExistingPanUrl(buildFileUrl(panDoc.file_url))
            setPanStatus(panDoc.verification_status)
            setPanRejectionReason(panDoc.rejection_reason ?? '')
          }

          // ── Find Driving License ──────────────────────────────────────────
          const dlDoc = docs.find(d => d.document_type === 'driving_license')
          if (dlDoc) {
            setFormData(prev => ({
              ...prev,
              driving_license: dlDoc.masked_number ?? dlDoc.document_number ?? '',
              driving_license_doc_id: dlDoc._id,
            }))
            setExistingDlUrl(buildFileUrl(dlDoc.file_url))
            setDlStatus(dlDoc.verification_status)
            setDlRejectionReason(dlDoc.rejection_reason ?? '')
          }

          // ── Find Passport ─────────────────────────────────────────────────
          const passportDoc = docs.find(d => d.document_type === 'passport')
          if (passportDoc) {
            setFormData(prev => ({
              ...prev,
              passport_number: passportDoc.masked_number ?? passportDoc.document_number ?? '',
              passport_doc_id: passportDoc._id,
            }))
            setExistingPassportUrl(buildFileUrl(passportDoc.file_url))
            setPassportStatus(passportDoc.verification_status)
            setPassportRejectionReason(passportDoc.rejection_reason ?? '')
          }
        }
} catch (err) {
  console.error('[IdentityDocumentsSection] Failed to load existing documents:', err)
  showAlert('Could Not Load', 'Failed to load existing documents. You can re-upload them below.')
} finally {
        setIsLoadingData(false)
      }
    }

    fetchDocuments()
  }, [isEditMode, teacherId])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showAlert = (title: string, message: string) => {
    setAlertModal({ open: true, title, message })
  }

  // Handle file input change — create blob preview URL, revoke old one
const handleFileChange = (
    field: 'aadhaar_file' | 'pan_file' | 'driving_license_file' | 'passport_file',
    file: File | null
  ) => {
    setFormData(prev => ({ ...prev, [field]: file }))

    const previewMap = {
      aadhaar_file:        { ref: aadhaarPreviewRef,  setter: setAadhaarPreview },
      pan_file:            { ref: panPreviewRef,       setter: setPanPreview },
      driving_license_file:{ ref: dlPreviewRef,        setter: setDlPreview },
      passport_file:       { ref: passportPreviewRef,  setter: setPassportPreview },
    }
    const { ref, setter } = previewMap[field]
    if (ref.current) { URL.revokeObjectURL(ref.current); ref.current = '' }
    const url = file ? URL.createObjectURL(file) : ''
    ref.current = url
    setter(url)

    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleNumberChange = (
    field: 'aadhaar_number' | 'pan_number',
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    const errorKey = field as keyof FieldErrors
    if (fieldErrors[errorKey]) {
      setFieldErrors(prev => ({ ...prev, [errorKey]: undefined }))
    }
  }



  const validate = (): boolean => {
    const errors: FieldErrors = {}

    // Aadhaar number — 12 digits
    if (!formData.aadhaar_number.trim()) {
      errors.aadhaar_number = 'Aadhaar number is required'
} else if (
  !/^\d{12}$/.test(formData.aadhaar_number.trim()) &&
  !/^XXXX-XXXX-\d{4}$/.test(formData.aadhaar_number.trim())
) {
  errors.aadhaar_number = 'Enter a valid 12-digit Aadhaar number (no spaces)'
}

    // Aadhaar file:
    //   Create mode → always required
    //   Edit mode   → required only if no existing file on backend
    if (!isEditMode && !formData.aadhaar_file) {
      errors.aadhaar_file = 'Please upload Aadhaar document'
    } else if (isEditMode && !formData.aadhaar_file && !existingAadhaarUrl) {
      errors.aadhaar_file = 'Please upload Aadhaar document'
    }

    // PAN number — standard format ABCDE1234F
    if (!formData.pan_number.trim()) {
      errors.pan_number = 'PAN number is required'
} else if (
  !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.trim().toUpperCase()) &&
  !/^XXXXX[0-9A-Z]{4,5}$/.test(formData.pan_number.trim().toUpperCase())
) {
  errors.pan_number = 'Enter a valid PAN number (e.g. ABCDE1234F)'
}

    // PAN file: same logic as Aadhaar
    if (!isEditMode && !formData.pan_file) {
      errors.pan_file = 'Please upload PAN document'
    } else if (isEditMode && !formData.pan_file && !existingPanUrl) {
      errors.pan_file = 'Please upload PAN document'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }


const submitDocument = async (
    docType: 'address_card' | 'pan_card' | 'driving_license' | 'passport',
    docNumber: string,
    maskedNumber: string,
    file: File | null,
    existingDocId: string
  ): Promise<boolean> => {
    const labelMap = {
  address_card: 'Aadhaar',
  pan_card: 'PAN',
  driving_license: 'Driving License',
  passport: 'Passport',
}
const label = labelMap[docType] ?? docType

    try {
      let response

      if (isEditMode && existingDocId) {
        // ── PUT /teacher-identity-documents/:id ─────────────────────────────
        // teachersApi.updateIdentityDocument builds FormData internally.
        // We pass file only if a new one was selected; backend keeps old file otherwise.
const updatePayload: any = {
  document_number: docNumber.trim(),
  masked_number: maskedNumber,
  teacher_name: teacherName.trim(),
}
if (file) updatePayload.file = file

        console.log(`[IdentityDocumentsSection] PUT ${label}:`, { id: existingDocId, ...updatePayload })
        response = await teachersApi.updateIdentityDocument(existingDocId, updatePayload)

      } else {
        // ── POST /teacher-identity-documents ────────────────────────────────
        // teachersApi.createIdentityDocument builds FormData internally.
        // We cast to 'any' to pass teacher_name (not in TeacherIdentityDocument type).
        // IMPORTANT: teachers.ts → createIdentityDocument must append teacher_name from data.
        // See the updated teachers.ts file for this change.
            const createPayload: any = {
            teacher_id: teacherId,
            document_type: docType,
            document_number: docNumber.trim(),
            teacher_name: teacherName.trim(),
            file: file ?? undefined,
            }

        console.log(`[IdentityDocumentsSection] POST ${label}:`, { ...createPayload, file: file?.name })
        response = await teachersApi.createIdentityDocument(createPayload)
      }

      console.log(`[IdentityDocumentsSection] ${label} API response:`, response)

      if (!response.success) {
        const msg = response.message ?? ''

        if (response.statusCode === 400) {
          showAlert(
            `Invalid ${label} Information`,
            msg || `Please check the ${label} details and try again.`
          )
        } else if (response.statusCode === 409) {
          showAlert(
            `${label} Already Exists`,
            `A ${label} document already exists for this teacher. It will be updated instead.`
          )
          // 409 on create — the document already exists (unique index on teacher_id + document_type)
          // In real flow: switch to PUT automatically. For now, surface the error.
        } else if (response.statusCode === 404) {
          showAlert(
            'Teacher Not Found',
            'Teacher record not found. Please refresh the page and try again.'
          )
        } else if (response.statusCode === 401 || response.statusCode === 403) {
          showAlert(
            'Access Denied',
            'You do not have permission to perform this action. Please contact your administrator.'
          )
        } else {
          showAlert(
            `Could Not Save ${label}`,
            msg || 'Something went wrong. Please try again.'
          )
        }
        return false
      }

      // ── Save returned _id for potential future PUT in same session ─────────
if (response.result?._id) {
  const docId = (response.result as { _id: string })._id
  if (docType === 'address_card') {
    setFormData(prev => ({ ...prev, aadhaar_doc_id: docId }))
  } else if (docType === 'pan_card') {
    setFormData(prev => ({ ...prev, pan_doc_id: docId }))
  } else if (docType === 'driving_license') {
    setFormData(prev => ({ ...prev, driving_license_doc_id: docId }))
  } else if (docType === 'passport') {
    setFormData(prev => ({ ...prev, passport_doc_id: docId }))
  }
}

      return true

    } catch (err: any) {
      console.error(`[IdentityDocumentsSection] ${label} submission error:`, err)
      showAlert(
        `Could Not Save ${label}`,
        err?.message || 'Something went wrong. Please try again.'
      )
      return false
    }
  }

  // ─── Main submit handler ──────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return

    if (!teacherId) {
      showAlert(
        'Personal Info Required',
        'Please save Personal Information first before filling document details.'
      )
      return
    }

    if (!teacherName?.trim()) {
      showAlert(
        'Teacher Name Missing',
        'Teacher name is required for document upload. Please go back and complete Personal Information.'
      )
      return
    }

    setIsSubmitting(true)

    try {
      // ── Step 1: Save Aadhaar (address_card) ───────────────────────────────
      const aadhaarOk = await submitDocument(
        'address_card',
        formData.aadhaar_number,
        maskAadhaar(formData.aadhaar_number),
        formData.aadhaar_file,
        formData.aadhaar_doc_id
      )
      if (!aadhaarOk) return

      // ── Step 2: Save PAN (pan_card) ───────────────────────────────────────
// ── Step 2: Save PAN (pan_card) ───────────────────────────────────────
      const panOk = await submitDocument(
        'pan_card',
        formData.pan_number.toUpperCase(),
        maskPan(formData.pan_number),
        formData.pan_file,
        formData.pan_doc_id
      )
      if (!panOk) return

      // ── Step 3: Save Driving License (optional) ───────────────────────────
      if (formData.driving_license.trim() || formData.driving_license_file) {
        if (formData.driving_license.trim() && formData.driving_license_file || 
            formData.driving_license.trim() && (isEditMode && existingDlUrl)) {
          await submitDocument(
            'driving_license',
            formData.driving_license.trim(),
            formData.driving_license.trim(),
            formData.driving_license_file,
            formData.driving_license_doc_id
          )
        }
      }

      // ── Step 4: Save Passport (optional) ─────────────────────────────────
      if (formData.passport_number.trim() || formData.passport_file) {
        if (formData.passport_number.trim() && formData.passport_file ||
            formData.passport_number.trim() && (isEditMode && existingPassportUrl)) {
          await submitDocument(
            'passport',
            formData.passport_number.trim().toUpperCase(),
            formData.passport_number.trim().toUpperCase(),
            formData.passport_file,
            formData.passport_doc_id
          )
        }
      }

      // ── All documents saved — proceed ─────────────────────────────────────
      onSuccess(formData)

    } catch (err: any) {
      console.error('[IdentityDocumentsSection] Unexpected submit error:', err)
      if (!navigator.onLine) {
        showAlert(
          'No Internet Connection',
          'Please check your internet connection and try again.'
        )
      } else {
        showAlert('Could Not Save', err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Sub-components ───────────────────────────────────────────────────────

  // Verification status badge — shown in edit mode
  const StatusBadge = ({
    status,
    reason,
  }: {
    status: 'pending' | 'approved' | 'rejected' | ''
    reason?: string
  }) => {
    if (!status) return null

    const config = {
      approved: {
        icon: CheckCircle2,
        className: 'bg-green-50 text-green-700 border-green-200',
        label: 'Approved',
      },
      pending: {
        icon: Clock,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Pending Verification',
      },
      rejected: {
        icon: XCircle,
        className: 'bg-red-50 text-red-700 border-red-200',
        label: 'Rejected',
      },
    }[status]

    if (!config) return null
    const Icon = config.icon

    return (
      <div className="flex flex-col gap-1">
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {config.label}
        </div>
        {status === 'rejected' && reason && (
          <p className="text-xs text-red-500 pl-1">{reason}</p>
        )}
      </div>
    )
  }

  // File preview — shows local blob OR existing backend URL
  // localPreview: blob URL (newly selected file)
  // existingUrl:  full URL built from buildFileUrl (edit mode)
  const FilePreview = ({
    localPreview,
    existingUrl,
    fileName,
    label,
  }: {
    localPreview: string
    existingUrl: string
    fileName?: string
    label: string
  }) => {
    const activeUrl = localPreview || existingUrl
    if (!activeUrl) return null

    // Determine if the file is an image (for inline thumbnail)
    const isImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(activeUrl) ||
      (localPreview && fileName && /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName))

    return (
      <div className="mt-2 space-y-2">
        {/* Link to open in new tab */}
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#1897C6] hover:underline"
        >
          <Eye className="h-3.5 w-3.5" />
          {localPreview ? 'Preview selected file' : `View uploaded ${label}`}
        </a>

        {/* Inline thumbnail for existing image files (not blob) */}
{isImage && localPreview && (
  <div className="h-20 w-28 overflow-hidden rounded-lg border border-border bg-muted">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={localPreview}
      alt={`${label} document preview`}
      className="h-full w-full object-cover"
    />
  </div>
)}
      </div>
    )
  }

  // ─── Loading state (edit mode fetching data) ──────────────────────────────

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
        <p className="text-sm text-muted-foreground">Loading identity documents...</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-8">

        <div>
          <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-[#1897C6]" />
            Identity Documents
          </h3>

          <div className="space-y-6">

            {/* ── Aadhaar Card ──────────────────────────────────────────────
                Backend document_type : 'address_card'
                Fields sent to POST   : teacher_id, document_type, document_number,
                                        masked_number, teacher_name, file
                Fields sent to PUT    : document_number, masked_number, file (if changed)
            ─────────────────────────────────────────────────────────────── */}
            <Card className="border-2">
              <CardContent className="p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">
                      Aadhaar Card
                      <span className="ml-1 text-red-500">*</span>
                    </h4>

                  </div>
                  {/* Verification status badge — edit mode only */}
                  {isEditMode && <StatusBadge status={aadhaarStatus} reason={aadhaarRejectionReason} />}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">

                  {/* Aadhaar Number — sent as document_number to backend */}
                  <div className="space-y-2">
                    <Label htmlFor="aadhaar_number" className="text-sm font-medium">
                      Aadhaar Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="aadhaar_number"
                      value={formData.aadhaar_number}
onChange={e => {
    const val = e.target.value
    // Edit mode mein masked format allow karo (XXXX-XXXX-1234)
    if (/^X{4}-X{4}-\d{0,4}$/.test(val)) {
      handleNumberChange('aadhaar_number', val)
    } else {
      handleNumberChange('aadhaar_number', val.replace(/\D/g, '').slice(0, 12))
    }
  }}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={12}
                      className={`h-11 font-mono tracking-wider ${
                        fieldErrors.aadhaar_number
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : ''
                      }`}
                    />
                    {fieldErrors.aadhaar_number && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors.aadhaar_number}
                      </p>
                    )}
                  </div>

                  {/* Aadhaar File upload — sent as multipart file to backend */}
                  <div className="space-y-2">
                    <Label htmlFor="aadhaar_file" className="text-sm font-medium">
                      Upload Aadhaar
                      {/* Required mark: always on create; on edit only if no existing file */}
                      {(!isEditMode || !existingAadhaarUrl) && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                      {isEditMode && existingAadhaarUrl && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (select new file to replace)
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="aadhaar_file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className={`h-11 ${
                          fieldErrors.aadhaar_file
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : ''
                        }`}
                        onChange={e =>
                          handleFileChange('aadhaar_file', e.target.files?.[0] ?? null)
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">PDF or Image, Max 5MB</p>
                    {fieldErrors.aadhaar_file && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors.aadhaar_file}
                      </p>
                    )}
                    {/* Preview — local blob (new file) OR existing backend URL */}
                    <FilePreview
                      localPreview={aadhaarPreview}
                      existingUrl={existingAadhaarUrl}
                      fileName={formData.aadhaar_file?.name}
                      label="Aadhaar"
                    />
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* ── PAN Card ──────────────────────────────────────────────────
                Backend document_type : 'pan_card'
                Fields sent to POST   : teacher_id, document_type, document_number,
                                        masked_number, teacher_name, file
                Fields sent to PUT    : document_number, masked_number, file (if changed)
            ─────────────────────────────────────────────────────────────── */}
            <Card className="border-2">
              <CardContent className="p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">
                      PAN Card
                      <span className="ml-1 text-red-500">*</span>
                    </h4>
                  </div>
                  {/* Verification status badge — edit mode only */}
                  {isEditMode && <StatusBadge status={panStatus} reason={panRejectionReason} />}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">

                  {/* PAN Number — sent as document_number to backend */}
                  <div className="space-y-2">
                    <Label htmlFor="pan_number" className="text-sm font-medium">
                      PAN Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pan_number"
                      value={formData.pan_number}
                      onChange={e =>
                        handleNumberChange(
                          'pan_number',
                          e.target.value.toUpperCase().slice(0, 10)
                        )
                      }
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className={`h-11 font-mono tracking-wider ${
                        fieldErrors.pan_number
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : ''
                      }`}
                    />
                    {fieldErrors.pan_number && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors.pan_number}
                      </p>
                    )}
                  </div>

                  {/* PAN File upload — sent as multipart file to backend */}
                  <div className="space-y-2">
                    <Label htmlFor="pan_file" className="text-sm font-medium">
                      Upload PAN
                      {(!isEditMode || !existingPanUrl) && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                      {isEditMode && existingPanUrl && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (select new file to replace)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="pan_file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className={`h-11 ${
                        fieldErrors.pan_file
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : ''
                      }`}
                      onChange={e =>
                        handleFileChange('pan_file', e.target.files?.[0] ?? null)
                      }
                    />
                    <p className="text-xs text-muted-foreground">PDF or Image, Max 5MB</p>
                    {fieldErrors.pan_file && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors.pan_file}
                      </p>
                    )}
                    {/* Preview — local blob (new file) OR existing backend URL */}
                    <FilePreview
                      localPreview={panPreview}
                      existingUrl={existingPanUrl}
                      fileName={formData.pan_file?.name}
                      label="PAN"
                    />
                  </div>

                </div>
              </CardContent>
            </Card>

                    {/* ── Driving License ──────────────────────────────────────────
                Backend document_type: 'driving_license' (optional)
            ─────────────────────────────────────────────────────────────── */}
            <Card className="border-2">
              <CardContent className="p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">Driving License</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Optional</p>
                  </div>
                  {isEditMode && <StatusBadge status={dlStatus} reason={dlRejectionReason} />}
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="driving_license" className="text-sm font-medium">
                      DL Number
                    </Label>
                    <Input
                      id="driving_license"
                      value={formData.driving_license}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, driving_license: e.target.value.toUpperCase() }))
                      }
                      placeholder="Enter DL number"
                      className="h-11 font-mono tracking-wider"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driving_license_file" className="text-sm font-medium">
                      Upload DL
                      {isEditMode && existingDlUrl && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(select new file to replace)</span>
                      )}
                    </Label>
                    <Input
                      id="driving_license_file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="h-11"
                      onChange={e => handleFileChange('driving_license_file', e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">PDF or Image, Max 5MB</p>
                    <FilePreview
                      localPreview={dlPreview}
                      existingUrl={existingDlUrl}
                      fileName={formData.driving_license_file?.name}
                      label="Driving License"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Passport ─────────────────────────────────────────────────
                Backend document_type: 'passport' (optional)
            ─────────────────────────────────────────────────────────────── */}
            <Card className="border-2">
              <CardContent className="p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">Passport</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Optional</p>
                  </div>
                  {isEditMode && <StatusBadge status={passportStatus} reason={passportRejectionReason} />}
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="passport_number" className="text-sm font-medium">
                      Passport Number
                    </Label>
                    <Input
                      id="passport_number"
                      value={formData.passport_number}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, passport_number: e.target.value.toUpperCase() }))
                      }
                      placeholder="e.g. A1234567"
                      className="h-11 font-mono tracking-wider"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport_file" className="text-sm font-medium">
                      Upload Passport
                      {isEditMode && existingPassportUrl && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(select new file to replace)</span>
                      )}
                    </Label>
                    <Input
                      id="passport_file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="h-11"
                      onChange={e => handleFileChange('passport_file', e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">PDF or Image, Max 5MB</p>
                    <FilePreview
                      localPreview={passportPreview}
                      existingUrl={existingPassportUrl}
                      fileName={formData.passport_file?.name}
                      label="Passport"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          

          </div>
        </div>

    {/* ── Action Buttons ───────────────────────────────────────────────── */}
<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-6">
  {(showPrevious && onPrevious) ? (
    <Button
      type="button"
      variant="outline"
      onClick={onPrevious}
      className="gap-2 w-full sm:w-auto"
    >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <>Save & Next<ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>

      </div>

      {/* ── Alert / Error Modal — no browser alert() calls ───────────────── */}
      <Dialog
        open={alertModal.open}
        onOpenChange={open => setAlertModal(prev => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {alertModal.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground">
              {alertModal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlertModal(prev => ({ ...prev, open: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 