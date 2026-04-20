'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowRight,
  GraduationCap,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Eye,
  ArrowLeft,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import { IMAGE_BASE_URL } from '@/lib/api/config'


export interface QualificationEntry {
  // ── Backend fields ────────────────────────────────────────────────────────
  _id?: string          // returned after POST/GET (used for PUT)
  qualification: string // required
  specialization: string
  institute_name: string
  passing_year: string  // sent as YYYY string; backend Joi.date() accepts it
  file: File | null     // multipart file upload
  file_url: string      // returned by backend after save (relative path)


}

export interface QualificationFormData {
  qualifications: QualificationEntry[]
}

interface QualificationSectionProps {
  teacherId: string
  teacherName: string
  onSuccess: (formData: QualificationFormData) => void
  onPrevious?: () => void
  showPrevious?: boolean
  isEditMode?: boolean
}

interface FieldErrors {
  [key: string]: string   // key format: `${index}_${fieldName}`
}

interface AlertModal {
  open: boolean
  title: string
  message: string
}

// ─── Helper: blank qualification entry ───────────────────────────────────────
const blankEntry = (): QualificationEntry => ({
  _id: '',
  qualification: '',
  specialization: '',
  institute_name: '',
  passing_year: '',
  file: null,
  file_url: '',

})

// ─── Helper: build full file URL from backend relative path ──────────────────
const buildFileUrl = (relativeUrl: string): string => {
  if (!relativeUrl) return ''
  return `${IMAGE_BASE_URL}${relativeUrl}`
}

// ─── Helper: extract YYYY from ISO date string ────────────────────────────────
// Backend stores passing_year as full date: "2015-01-01T00:00:00.000Z"
// We extract just the year for display in the input
const extractYear = (dateStr: string): string => {
  if (!dateStr) return ''
  // If already a 4-digit year, return as-is
  if (/^\d{4}$/.test(dateStr)) return dateStr
  // Extract year directly from ISO string (YYYY-MM-DD...) — no timezone parsing
  const match = dateStr.match(/^(\d{4})-/)
  if (match) return match[1]
  // Fallback: parse as date
  const year = new Date(dateStr).getFullYear()
  return isNaN(year) ? '' : String(year)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QualificationSection({
  teacherId,
  teacherName,
  onSuccess,
  onPrevious,
  showPrevious = false,
  isEditMode = false,
}: QualificationSectionProps) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<QualificationEntry[]>([blankEntry()])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoadingData, setIsLoadingData] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alertModal, setAlertModal] = useState<AlertModal>({
    open: false, title: '', message: '',
  })

  // File preview blob URLs — indexed by entry index
  const previewUrlsRef = useRef<Record<number, string>>({})
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({})

  // ── Cleanup blob URLs on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [])

  // ── Edit mode: fetch existing qualifications ────────────────────────────────
  // GET /teacher-qualifications/teacher/:teacher_id
  useEffect(() => {
    if (!isEditMode || !teacherId) return

    const fetchQualifications = async () => {
      setIsLoadingData(true)
      try {
        const res = await teachersApi.getQualificationsByTeacher(teacherId)

        console.log('[QualificationSection] Fetched existing qualifications:', res)

        if (res.success && Array.isArray(res.result) && res.result.length > 0) {
          const fetched: QualificationEntry[] = res.result.map((q: any) => ({
            _id: q._id ?? '',
            qualification: q.qualification ?? '',
            specialization: q.specialization ?? '',
            institute_name: q.institute_name ?? '',
                   passing_year: (() => {
              const y = extractYear(q.passing_year ?? '')
              // 1970 = corrupted data (backend stored ms as date) — clear karo
              return y === '1970' ? '' : y
            })(),
            file: null,
            file_url: q.file_url ?? '',

          }))
          setEntries(fetched)
        }
} catch (err) {
  console.error('[QualificationSection] Failed to fetch qualifications:', err)
  showAlert('Could Not Load', 'Failed to load existing qualifications. You can re-enter the details below.')
} finally {
        setIsLoadingData(false)
      }
    }

    fetchQualifications()
  }, [isEditMode, teacherId])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showAlert = (title: string, message: string) => {
    setAlertModal({ open: true, title, message })
  }

  const updateEntry = (index: number, field: keyof QualificationEntry, value: any) => {
    setEntries(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    // Clear field error
    const errorKey = `${index}_${field}`
    if (fieldErrors[errorKey]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[errorKey]; return n })
    }
  }

  const handleFileChange = (index: number, file: File | null) => {
    // Revoke old blob URL
    if (previewUrlsRef.current[index]) {
      URL.revokeObjectURL(previewUrlsRef.current[index])
      previewUrlsRef.current[index] = ''
    }
    const url = file ? URL.createObjectURL(file) : ''
    previewUrlsRef.current[index] = url
    setPreviewUrls(prev => ({ ...prev, [index]: url }))
    updateEntry(index, 'file', file)
  }

  const addEntry = () => {
    setEntries(prev => [...prev, blankEntry()])
  }

 const removeEntry = async (index: number) => {
    if (entries.length === 1) return // keep at least one

    const entry = entries[index]

  
    if (isEditMode && entry._id) {
      try {
        await teachersApi.deleteQualification(entry._id)
      } catch (err) {
        console.error('[QualificationSection] Delete failed:', err)
        showAlert('Delete Failed', 'Could not delete qualification. Please try again.')
        return
      }
    }

    // Revoke blob URL if exists
    if (previewUrlsRef.current[index]) {
      URL.revokeObjectURL(previewUrlsRef.current[index])
      delete previewUrlsRef.current[index]
    }
    setEntries(prev => prev.filter((_, i) => i !== index))
    // Remove preview URL and shift remaining
    setPreviewUrls(prev => {
      const updated: Record<number, string> = {}
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k)
        if (ki < index) updated[ki] = v
        else if (ki > index) updated[ki - 1] = v
      })
      return updated
    })
    // Clear field errors for this index
    setFieldErrors(prev => {
      const updated: FieldErrors = {}
      Object.entries(prev).forEach(([k, v]) => {
        const [ki] = k.split('_')
        if (Number(ki) !== index) updated[k] = v
      })
      return updated
    })
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  // Backend required: teacher_id, qualification, teacher_name, file (on create)
  // Optional: specialization, institute_name, passing_year

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    entries.forEach((entry, index) => {
      // qualification — required
      if (!entry.qualification.trim()) {
        errors[`${index}_qualification`] = 'Qualification is required'
      }

      // passing_year — if provided, must be valid 4-digit year
      if (entry.passing_year.trim()) {
        const year = Number(entry.passing_year.trim())
        const currentYear = new Date().getFullYear()
        if (!/^\d{4}$/.test(entry.passing_year.trim()) || year < 1900 || year > currentYear) {
          errors[`${index}_passing_year`] = `Enter a valid year (1900–${currentYear})`
        }
      }

      // file — required on create; in edit mode required only if no existing file_url
      if (!isEditMode && !entry.file) {
        errors[`${index}_file`] = 'Please upload the qualification certificate'
      } else if (isEditMode && !entry.file && !entry.file_url) {
        errors[`${index}_file`] = 'Please upload the qualification certificate'
      }
    })

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }



  const submitEntry = async (entry: QualificationEntry, index: number): Promise<boolean> => {
    const label = entry.qualification || `Qualification ${index + 1}`

    try {
      let response

      if (isEditMode && entry._id) {
        // ── PUT existing qualification ───────────────────────────────────────
        const updatePayload: any = {
          qualification: entry.qualification.trim(),
        }
        if (entry.specialization.trim()) updatePayload.specialization = entry.specialization.trim()
        if (entry.institute_name.trim()) updatePayload.institute_name = entry.institute_name.trim()
       if (entry.passing_year.trim()) {
          const yr = entry.passing_year.trim()
          // Already full date format se aaya ho to dobara append mat karo
          updatePayload.passing_year = /^\d{4}$/.test(yr) ? `${yr}-06-15` : yr
        }
        if (entry.file) updatePayload.file = entry.file

        console.log(`[QualificationSection] PUT ${label}:`, { id: entry._id, ...updatePayload })
        response = await teachersApi.updateQualification(entry._id, updatePayload)

      } else {
        // ── POST new qualification ───────────────────────────────────────────
        const createPayload: any = {
          teacher_id: teacherId,
          qualification: entry.qualification.trim(),
          teacher_name: teacherName.trim(),   // required by backend Joi validation
          file: entry.file ?? undefined,
        }
        if (entry.specialization.trim()) createPayload.specialization = entry.specialization.trim()
        if (entry.institute_name.trim()) createPayload.institute_name = entry.institute_name.trim()
             if (entry.passing_year.trim()) {
          const yr = entry.passing_year.trim()
          createPayload.passing_year = /^\d{4}$/.test(yr) ? `${yr}-06-15` : yr
        }
        console.log(`[QualificationSection] POST ${label}:`, { ...createPayload, file: entry.file?.name })
        response = await teachersApi.createQualification(createPayload)
      }

      console.log(`[QualificationSection] ${label} API response:`, response)

      if (!response.success) {
        const msg = response.message ?? ''
        if (response.statusCode === 400) {
          showAlert('Invalid Information', msg || `Please check details for ${label} and try again.`)
        } else if (response.statusCode === 404) {
          showAlert('Teacher Not Found', 'Teacher record not found. Please refresh and try again.')
        } else if (response.statusCode === 401 || response.statusCode === 403) {
          showAlert('Access Denied', 'You do not have permission to perform this action.')
        } else {
          showAlert(`Could Not Save ${label}`, msg || 'Something went wrong. Please try again.')
        }
        return false
      }

      // Save returned _id for potential future PUT in same session
      if (response.result?._id) {
        setEntries(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            _id: (response.result as { _id: string })._id,
            file_url: (response.result as any).file_url ?? updated[index].file_url,
          }
          return updated
        })
      }

      return true

    } catch (err: any) {
      console.error(`[QualificationSection] ${label} submission error:`, err)
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
      showAlert('Personal Info Required', 'Please save Personal Information first.')
      return
    }

    if (!teacherName?.trim()) {
      showAlert('Teacher Name Missing', 'Teacher name is required. Please complete Personal Information first.')
      return
    }

    setIsSubmitting(true)

    try {
      // Submit each qualification sequentially
      for (let i = 0; i < entries.length; i++) {
        const ok = await submitEntry(entries[i], i)
        if (!ok) return // stop on first failure
      }

      // All saved successfully
      onSuccess({ qualifications: entries })

    } catch (err: any) {
      console.error('[QualificationSection] Unexpected error:', err)
      if (!navigator.onLine) {
        showAlert('No Internet Connection', 'Please check your connection and try again.')
      } else {
        showAlert('Could Not Save', err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
        <p className="text-sm text-muted-foreground">Loading qualifications...</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-8 w-full overflow-x-hidden">

        {/* Header */}
<div className="flex flex-wrap items-center justify-between gap-2">
  <h3 className="flex items-center gap-2 text-lg font-semibold">
    <GraduationCap className="h-5 w-5 text-[#1897C6]" />
    Educational Qualifications
  </h3>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={addEntry}
    className="gap-2 shrink-0"
  >
    <Plus className="h-4 w-4" />
    Add More
  </Button>
</div>

        {/* Qualification cards */}
        <div className="space-y-6">
          {entries.map((entry, index) => (
            <Card key={index} className="border-2">
              <CardHeader className="pb-3 px-3 sm:px-6 bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Qualification {index + 1}
                    {index === 0 && <span className="ml-1 text-red-500">*</span>}
                  </CardTitle>
                  {entries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

<CardContent className="p-3 sm:p-5">
  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 w-full min-w-0">

              
                  {/* ── Qualification — backend required field ────────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Qualification <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={['B.Ed', 'M.Ed', 'B.A', 'M.A', 'B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'Ph.D', 'Diploma', 'Other'].includes(entry.qualification) ? entry.qualification : entry.qualification ? 'Other' : ''}
                      onValueChange={v => {
                        if (v === 'Other') {
                          updateEntry(index, 'qualification', 'Other')
                        } else {
                          updateEntry(index, 'qualification', v)
                        }
                      }}
                    >
                      <SelectTrigger
                        className={`h-11 ${fieldErrors[`${index}_qualification`] ? 'border-red-500' : ''}`}
                      >
                        <SelectValue placeholder="Select qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        {['B.Ed', 'M.Ed', 'B.A', 'M.A', 'B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'Ph.D', 'Diploma', 'Other'].map(q => (
                          <SelectItem key={q} value={q}>{q}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Other selected — custom input */}
                    {entry.qualification === 'Other' || (!['B.Ed', 'M.Ed', 'B.A', 'M.A', 'B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'Ph.D', 'Diploma', 'Other', ''].includes(entry.qualification)) ? (
                      <Input
                        value={entry.qualification === 'Other' ? '' : entry.qualification}
                        onChange={e => updateEntry(index, 'qualification', e.target.value)}
                        placeholder="Enter your qualification"
                        className={`h-11 mt-2 ${fieldErrors[`${index}_qualification`] ? 'border-red-500' : ''}`}
                        autoFocus
                      />
                    ) : null}

                    {fieldErrors[`${index}_qualification`] && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors[`${index}_qualification`]}
                      </p>
                    )}
                  </div>

                  {/* ── Specialization — backend optional field ───────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Specialization</Label>
                    <Input
                      value={entry.specialization}
                      onChange={e => updateEntry(index, 'specialization', e.target.value)}
                      placeholder="e.g., Physics, Mathematics"
                      className="h-11"
                    />
                  </div>

                  {/* ── Institute Name — backend optional field ───────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Institute Name</Label>
                    <Input
                      value={entry.institute_name}
                      onChange={e => updateEntry(index, 'institute_name', e.target.value)}
                      placeholder="Enter institute name"
                      className="h-11"
                    />
                  </div>

                  {/* ── Passing Year — backend optional field (Joi.date()) ── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Passing Year</Label>
                    <Input
                      value={entry.passing_year}
                      onChange={e =>
                        updateEntry(index, 'passing_year', e.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                      placeholder="YYYY"
                      maxLength={4}
                      className={`h-11 font-mono ${fieldErrors[`${index}_passing_year`] ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors[`${index}_passing_year`] && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors[`${index}_passing_year`]}
                      </p>
                    )}
                  </div>

            





                  {/* ── File Upload — backend required on create ──────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Upload Certificate
                      {/* Required mark: always on create; in edit only if no existing file */}
                      {(!isEditMode || !entry.file_url) && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                      {isEditMode && entry.file_url && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (select new file to replace)
                        </span>
                      )}
                    </Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className={`h-11 ${fieldErrors[`${index}_file`] ? 'border-red-500' : ''}`}
                      onChange={e => handleFileChange(index, e.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">PDF or Image, Max 5MB</p>
                    {fieldErrors[`${index}_file`] && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors[`${index}_file`]}
                      </p>
                    )}

                    {/* File preview — local blob or existing backend URL */}
                    {(previewUrls[index] || entry.file_url) && (
                      <div className="mt-1">
                        <a
                          href={previewUrls[index] || buildFileUrl(entry.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#1897C6] hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {previewUrls[index] ? 'Preview selected file' : 'View uploaded certificate'}
                        </a>
                      </div>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>
          ))}
        </div>

     {/* Action Buttons */}
<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-6">
  {(showPrevious && onPrevious) ? (
    <Button type="button" variant="outline" onClick={onPrevious} className="gap-2 w-full sm:w-auto">
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

      {/* Alert / Error Modal */}
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