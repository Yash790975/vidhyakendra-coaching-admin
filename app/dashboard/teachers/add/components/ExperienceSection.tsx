'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Briefcase,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'



export interface ExperienceEntry {
  // ── Backend fields ────────────────────────────────────────────────────────
  _id?: string          
  organization_name: string
  role: string           
  from_date: string    
  to_date: string         
  is_current: boolean     

  responsibilities: string
}

export interface ExperienceFormData {
  experiences: ExperienceEntry[]
}

interface ExperienceSectionProps {
  teacherId: string
  onSuccess: (formData: ExperienceFormData) => void
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

// ─── Helper: blank experience entry ──────────────────────────────────────────
const blankEntry = (): ExperienceEntry => ({
  _id: '',
  organization_name: '',
  role: '',
  from_date: '',
  to_date: '',
  is_current: false,
  responsibilities: '',  
})

// ─── Helper: convert ISO date to YYYY-MM-DD for date input ───────────────────
// Backend returns: "2018-06-01T00:00:00.000Z" → we need "2018-06-01"
const toInputDate = (isoDate: string): string => {
  if (!isoDate) return ''
  try {
    return new Date(isoDate).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExperienceSection({
  teacherId,
  onSuccess,
  onPrevious,
  showPrevious = false,
  isEditMode = false,
}: ExperienceSectionProps) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<ExperienceEntry[]>([blankEntry()])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoadingData, setIsLoadingData] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alertModal, setAlertModal] = useState<AlertModal>({
    open: false, title: '', message: '',
  })

  // ── Edit mode: fetch existing experiences ──────────────────────────────────
  // GET /teacher-experience/teacher/:teacher_id
  useEffect(() => {
    if (!isEditMode || !teacherId) return

    const fetchExperiences = async () => {
      setIsLoadingData(true)
      try {
        const res = await teachersApi.getExperienceByTeacher(teacherId)

        console.log('[ExperienceSection] Fetched existing experiences:', res)

        if (res.success && Array.isArray(res.result) && res.result.length > 0) {
          const fetched: ExperienceEntry[] = res.result.map((e: any) => ({
            _id: e._id ?? '',
            organization_name: e.organization_name ?? '',
            role: e.role ?? '',
            from_date: toInputDate(e.from_date ?? ''),
            to_date: toInputDate(e.to_date ?? ''),
            is_current: e.is_current ?? false,
          responsibilities: e.responsibilities ?? '',
          }))
          setEntries(fetched)
        }
} catch (err) {
  console.error('[ExperienceSection] Failed to fetch experiences:', err)
  showAlert('Could Not Load', 'Failed to load existing experience details. You can re-enter the information below.')
} finally {
        setIsLoadingData(false)
      }
    }

    fetchExperiences()
  }, [isEditMode, teacherId])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showAlert = (title: string, message: string) => {
    setAlertModal({ open: true, title, message })
  }

  const updateEntry = (index: number, field: keyof ExperienceEntry, value: any) => {
    setEntries(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    // Clear field error on change
    const errorKey = `${index}_${field}`
    if (fieldErrors[errorKey]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[errorKey]; return n })
    }
  }

  const addEntry = () => {
    setEntries(prev => [...prev, blankEntry()])
  }

const removeEntry = async (index: number) => {
    if (entries.length === 1) return

    const entry = entries[index]

 
    if (isEditMode && entry._id) {
      try {
        await teachersApi.deleteExperience(entry._id)
      } catch (err) {
        console.error('[ExperienceSection] Delete failed:', err)
        showAlert('Delete Failed', 'Could not delete experience. Please try again.')
        return
      }
    }

    setEntries(prev => prev.filter((_, i) => i !== index))
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
  // Only validates filled entries — section is optional so user can skip
  // If user has started filling an entry, organization_name is required

  const validate = (): boolean => {
    const errors: FieldErrors = {}
    const isAllEmpty = entries.every(e =>
      !e.organization_name.trim() &&
      !e.role.trim() &&
      !e.from_date &&
      !e.to_date
    )

    // If all blank → section skipped, no validation needed
    if (isAllEmpty) return true

    entries.forEach((entry, index) => {
      // organization_name — required if any field in this entry is filled
      const hasAnyData = entry.organization_name.trim() || entry.role.trim() ||
                         entry.from_date || entry.to_date

      if (hasAnyData && !entry.organization_name.trim()) {
        errors[`${index}_organization_name`] = 'Organization name is required'
      }

      // from_date — if to_date is set and is_current is false, from_date should also be set
      if (entry.to_date && !entry.from_date && !entry.is_current) {
        errors[`${index}_from_date`] = 'Please enter a start date'
      }

      // Date range validation
      if (entry.from_date && entry.to_date && !entry.is_current) {
        const from = new Date(entry.from_date)
        const to = new Date(entry.to_date)
        if (to < from) {
          errors[`${index}_to_date`] = 'End date cannot be before start date'
        }
      }
    })

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }


  const submitEntry = async (entry: ExperienceEntry, index: number): Promise<boolean> => {
    const label = entry.organization_name || `Experience ${index + 1}`

    try {
      let response

      if (isEditMode && entry._id) {
        // ── PUT existing experience ──────────────────────────────────────────
        const updatePayload: Partial<typeof entry> = {
          organization_name: entry.organization_name.trim(),
        }
        if (entry.role.trim())    updatePayload.role = entry.role.trim()
        if (entry.from_date)      updatePayload.from_date = entry.from_date
        if (!entry.is_current) {
          updatePayload.to_date = entry.to_date || ''
        }
updatePayload.is_current = entry.is_current
        if (entry.responsibilities.trim()) updatePayload.responsibilities = entry.responsibilities.trim()

        console.log(`[ExperienceSection] PUT ${label}:`, { id: entry._id, ...updatePayload })
        response = await teachersApi.updateExperience(entry._id, updatePayload)

      } else {
        // ── POST new experience ──────────────────────────────────────────────
        const createPayload: any = {
          teacher_id: teacherId,
          organization_name: entry.organization_name.trim(),
        }
        if (entry.role.trim())  createPayload.role = entry.role.trim()
        if (entry.from_date)    createPayload.from_date = entry.from_date
        if (entry.is_current) {
          createPayload.is_current = true
          // to_date not sent when is_current = true (backend default: null)
} else {
          createPayload.is_current = false
          if (entry.to_date) createPayload.to_date = entry.to_date
        }
        if (entry.responsibilities.trim()) createPayload.responsibilities = entry.responsibilities.trim()

        console.log(`[ExperienceSection] POST ${label}:`, createPayload)
        response = await teachersApi.createExperience(createPayload)
      }

      console.log(`[ExperienceSection] ${label} API response:`, response)

      if (!response.success) {
        const msg = response.message ?? ''
        if (response.statusCode === 400) {
          showAlert('Invalid Information', msg || `Please check details for "${label}" and try again.`)
        } else if (response.statusCode === 404) {
          showAlert('Teacher Not Found', 'Teacher record not found. Please refresh and try again.')
        } else if (response.statusCode === 401 || response.statusCode === 403) {
          showAlert('Access Denied', 'You do not have permission to perform this action.')
        } else {
          showAlert(`Could Not Save "${label}"`, msg || 'Something went wrong. Please try again.')
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
          }
          return updated
        })
      }

      return true

    } catch (err: any) {
      console.error(`[ExperienceSection] "${label}" submission error:`, err)
      showAlert(
        `Could Not Save "${label}"`,
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

    // Check if all entries are blank → skip (section is optional)
    const isAllEmpty = entries.every(e =>
      !e.organization_name.trim() && !e.role.trim() && !e.from_date && !e.to_date
    )

    if (isAllEmpty) {
      console.log('[ExperienceSection] Section skipped — no entries filled')
      onSuccess({ experiences: [] })
      return
    }

    setIsSubmitting(true)

    try {
      // Submit only entries that have organization_name (skip truly blank ones)
      const filledEntries = entries.filter(e => e.organization_name.trim())

      for (let i = 0; i < filledEntries.length; i++) {
        const originalIndex = entries.indexOf(filledEntries[i])
        const ok = await submitEntry(filledEntries[i], originalIndex)
        if (!ok) return // Stop on first failure
      }

      onSuccess({ experiences: filledEntries })

    } catch (err: any) {
      console.error('[ExperienceSection] Unexpected error:', err)
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
        <p className="text-sm text-muted-foreground">Loading experience details...</p>
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
    <Briefcase className="h-5 w-5 text-[#1897C6]" />
    Work Experience
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

        {/* Optional section notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            This section is <span className="font-semibold">optional</span>. You can leave it blank and click
            {' '}<span className="font-semibold">Save & Next</span> to skip.
          </p>
        </div>

        {/* Experience cards */}
        <div className="space-y-6">
          {entries.map((entry, index) => (
            <Card key={index} className="border-2">
             <CardHeader className="pb-3 px-3 sm:px-6 bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Experience {index + 1}
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

                  {/* ── Organization Name — backend required field ────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Organization Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={entry.organization_name}
                      onChange={e => updateEntry(index, 'organization_name', e.target.value)}
                      placeholder="Enter organization name"
                      className={`h-11 ${fieldErrors[`${index}_organization_name`] ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors[`${index}_organization_name`] && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors[`${index}_organization_name`]}
                      </p>
                    )}
                  </div>

                  {/* ── Role — backend optional field ────────────────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Role / Designation</Label>
                    <Input
                      value={entry.role}
                      onChange={e => updateEntry(index, 'role', e.target.value)}
                      placeholder="e.g., Mathematics Teacher"
                      className="h-11"
                    />
                  </div>

                  {/* ── From Date — backend optional field (Joi.date()) ───── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">From Date</Label>
                    <Input
                      type="date"
                      value={entry.from_date}
                      onChange={e => updateEntry(index, 'from_date', e.target.value)}
                      className={`h-11 ${fieldErrors[`${index}_from_date`] ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors[`${index}_from_date`] && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors[`${index}_from_date`]}
                      </p>
                    )}
                  </div>

                  {/* ── To Date — backend optional, null when is_current ──── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      To Date
                      {entry.is_current && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (not applicable — currently working)
                        </span>
                      )}
                    </Label>
                    <Input
                      type="date"
                      value={entry.to_date}
                      onChange={e => updateEntry(index, 'to_date', e.target.value)}
                      disabled={entry.is_current}
                      className={`h-11 ${fieldErrors[`${index}_to_date`] ? 'border-red-500' : ''} ${entry.is_current ? 'opacity-50' : ''}`}
                    />
                    {fieldErrors[`${index}_to_date`] && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {fieldErrors[`${index}_to_date`]}
                      </p>
                    )}
                  </div>

                  {/* ── Is Current — backend field, default: false ────────── */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={entry.is_current}
                        onChange={e => {
                          updateEntry(index, 'is_current', e.target.checked)
                          if (e.target.checked) {
                            // Clear to_date when marking as current
                            updateEntry(index, 'to_date', '')
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Currently working here</span>
                    </label>
                  </div>

                
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-sm font-medium">
                      Responsibilities
                      <span className="ml-2 text-xs font-normal text-muted-foreground"></span>
                    </Label>
                    <Textarea
                      value={entry.responsibilities}
                      onChange={e => updateEntry(index, 'responsibilities', e.target.value)}
                      placeholder="Describe key responsibilities"
                      rows={3}
                      className="resize-none"
                    />
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