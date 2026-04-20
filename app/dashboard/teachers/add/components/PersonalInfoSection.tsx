'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Separator } from '@/components/ui/separator'
import { ArrowRight, ArrowLeft, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import { IMAGE_BASE_URL } from '@/lib/api/config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalInfoFormData {
  // ─── Backend fields (teachers_master schema) ───────────────────────────────
  full_name: string
  gender: 'male' | 'female' | 'other' | ''
  date_of_birth: string
  teacher_type: 'school' | 'coaching' | ''
  employment_type: 'full_time' | 'part_time' | 'contract' | 'visiting' | ''
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | ''
  spouse_name: string
  blood_group: string
  joining_date: string

  // ─── Backend optional fields ────────────────────────────────────────────────
  father_name: string
  mother_name: string
  upload_photo_url?: string | null
  status?: 'active' | 'inactive' | 'blocked' | 'archived' | 'onboarding'
}

interface PersonalInfoSectionProps {
  onSuccess: (teacherId: string, formData: PersonalInfoFormData) => void
  onPrevious?: () => void   // shown only if provided (edit mode, non-first section)
  isEditMode?: boolean
  teacherId?: string        // required in edit mode
  showPrevious?: boolean    // whether to show Previous button
}

const initialFormData: PersonalInfoFormData = {
  full_name: '',
  gender: '',
  date_of_birth: '',
  teacher_type: '',
  employment_type: '',
  marital_status: '',
  spouse_name: '',
  blood_group: '',
  joining_date: '',
  father_name: '',
  mother_name: '',
  upload_photo_url: null,
  status: undefined,
}
// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalInfoSection({
  onSuccess,
  onPrevious,
  isEditMode = false,
  teacherId,
  showPrevious = false,
}: PersonalInfoSectionProps) {
  const [formData, setFormData] = useState<PersonalInfoFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(isEditMode && !!teacherId)
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalInfoFormData, string>>>({})
  const [successMsg, setSuccessMsg] = useState('')
  const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false, title: '', message: '',
  })
  const [instituteType, setInstituteType] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // ── Read instituteType from localStorage ──────────────────────────────────
  useEffect(() => {
    const type = localStorage.getItem('instituteType') || ''
    setInstituteType(type)
    if (!isEditMode) {
      setFormData(prev => ({ ...prev, teacher_type: 'coaching' }))
    }
  }, [isEditMode])

  // ── Edit mode: fetch existing teacher data ────────────────────────────────
  // GET /teachers/:id → pre-fill backend fields only
  useEffect(() => {
    if (!isEditMode || !teacherId) return

    const fetchTeacher = async () => {
      setIsLoadingData(true)
      try {
        const res = await teachersApi.getById(teacherId)
        if (res.success && res.result) {
          const t = res.result
setFormData(prev => ({
  ...prev,
  full_name:        t.full_name        ?? '',
  gender:           (t.gender          ?? '') as PersonalInfoFormData['gender'],
  date_of_birth:    t.date_of_birth    ? t.date_of_birth.split('T')[0] : '',
  teacher_type:     'coaching',
  employment_type:  (t.employment_type ?? '') as PersonalInfoFormData['employment_type'],
  marital_status:   (t.marital_status  ?? '') as PersonalInfoFormData['marital_status'],
  spouse_name:      t.spouse_name      ?? '',
  blood_group:      t.blood_group      ?? '',
  joining_date:     t.joining_date     ? t.joining_date.split('T')[0] : '',
  father_name:      t.father_name      ?? '',
  mother_name:      t.mother_name      ?? '',
  upload_photo_url: t.upload_photo_url ?? null,
  status:           t.status           ?? undefined,
}))
          if (t.upload_photo_url) {
const url = t.upload_photo_url.startsWith('http')
  ? t.upload_photo_url
  : `${IMAGE_BASE_URL}${t.upload_photo_url.startsWith('/') ? '' : '/'}${t.upload_photo_url}`
            setPhotoPreview(url)
          }
        }
      } catch (err) {
        console.error('[PersonalInfoSection] Failed to fetch teacher:', err)
        showError('Load Failed', 'Could not load existing teacher data. Please try again.')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchTeacher()
  }, [isEditMode, teacherId])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showError = (title: string, message: string) => {
    setErrorModal({ open: true, title, message })
  }

  const handleChange = (field: keyof PersonalInfoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    setSuccessMsg('')
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    showError('File Too Large', 'Photo must be under 5MB.')
    return
  }
  setPhotoFile(file)
  setPhotoPreview(URL.createObjectURL(file))
}

  // ─── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PersonalInfoFormData, string>> = {}
    if (!formData.full_name.trim())  newErrors.full_name = 'Full name is required'
    if (!formData.gender)            newErrors.gender = 'Please select a gender'
    if (!formData.date_of_birth)     newErrors.date_of_birth = 'Date of birth is required'
    if (!formData.employment_type)   newErrors.employment_type = 'Please select employment type'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  // Create mode: POST /teachers
  // Edit mode:   PUT  /teachers/:id
  // Both: only send backend fields (static fields excluded)

  const handleSubmit = async () => {
    if (!validate()) return

    const instituteId = localStorage.getItem('instituteId')
    if (!instituteId && !isEditMode) {
      showError('Session Expired', 'Your session has expired. Please log in again.')
      return
    }

    setIsSubmitting(true)
    setSuccessMsg('')

    try {
// ── Build payload as FormData (supports photo upload) ──────────────────
const fd = new FormData()
fd.append('full_name',       formData.full_name.trim())
fd.append('gender',          formData.gender)
fd.append('date_of_birth',   formData.date_of_birth)
fd.append('teacher_type',    formData.teacher_type)
fd.append('employment_type', formData.employment_type)

if (!isEditMode && instituteId) fd.append('institute_id', instituteId)
if (formData.father_name.trim())  fd.append('father_name', formData.father_name.trim())
if (formData.mother_name.trim())  fd.append('mother_name', formData.mother_name.trim())
if (formData.marital_status)      fd.append('marital_status', formData.marital_status)
if (formData.marital_status === 'married' && formData.spouse_name.trim())
  fd.append('spouse_name', formData.spouse_name.trim())
if (formData.blood_group)   fd.append('blood_group', formData.blood_group)
if (formData.joining_date)  fd.append('joining_date', formData.joining_date)
if (photoFile) fd.append('upload_photo', photoFile)

console.log(`[PersonalInfoSection] ${isEditMode ? 'PUT' : 'POST'} payload (FormData)`)

   let response
      let resolvedTeacherId: string

      if (isEditMode && teacherId) {
        response = await teachersApi.update(teacherId, fd as any)
        resolvedTeacherId = teacherId
      } else {
        response = await teachersApi.create(fd as any)
        resolvedTeacherId = response?.result?._id ?? ''
      }

      console.log('[PersonalInfoSection] API response:', response)

      if (!response.success) {
        const msg = response.message || ''
        if (response.statusCode === 400) {
          showError('Invalid Information', msg || 'Please check the details and try again.')
        } else if (response.statusCode === 409) {
          showError('Duplicate Record', 'A teacher with this code already exists in your institute.')
        } else if (response.statusCode === 404) {
          showError('Not Found', 'Teacher record not found. Please refresh and try again.')
        } else {
          showError('Could Not Save', msg || 'Something went wrong. Please try again.')
        }
        return
      }

      if (!resolvedTeacherId) {
        showError('Unexpected Error', 'Teacher was saved but ID was not returned. Please refresh.')
        return
      }

      if (isEditMode) {
        setSuccessMsg('Personal information updated successfully!')
        setTimeout(() => setSuccessMsg(''), 3000)
      }

      onSuccess(resolvedTeacherId, formData)

    } catch (err: any) {
      console.error('[PersonalInfoSection] Error:', err)
      if (!navigator.onLine) {
        showError('No Internet Connection', 'Please check your connection and try again.')
      } else {
        showError('Could Not Save', err?.message || 'Something went wrong. Please try again.')
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
        <p className="text-sm text-muted-foreground">Loading personal information...</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-8">

        {/* ── Success Banner ────────────────────────────────────────────────── */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700">{successMsg}</p>
          </div>
        )}

        {/* ── Section 1: Basic Information ─────────────────────────────────── */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5 text-[#1897C6]" />
            Basic Information
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">

            {/* Full Name — backend required */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                placeholder="Enter full name as per documents"
                className={`h-11 ${errors.full_name ? 'border-red-500' : ''}`}
              />
              {errors.full_name && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />{errors.full_name}
                </p>
              )}
            </div>

            {/* Date of Birth — backend required */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth" className="text-sm font-medium">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={e => handleChange('date_of_birth', e.target.value)}
                className={`h-11 ${errors.date_of_birth ? 'border-red-500' : ''}`}
              />
              {errors.date_of_birth && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />{errors.date_of_birth}
                </p>
              )}
            </div>

            {/* Gender — backend required */}
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium">
                Gender <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.gender} onValueChange={v => handleChange('gender', v)}>
                <SelectTrigger className={`h-11 ${errors.gender ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />{errors.gender}
                </p>
              )}
            </div>

            {/* Blood Group — backend optional */}
            <div className="space-y-2">
              <Label htmlFor="blood_group" className="text-sm font-medium">Blood Group</Label>
              <Select value={formData.blood_group} onValueChange={v => handleChange('blood_group', v)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Father's Name */}
            <div className="space-y-2">
              <Label htmlFor="father_name" className="text-sm font-medium">
                Father&apos;s Name
              </Label>
              <Input
                id="father_name"
                value={formData.father_name}
                onChange={e => handleChange('father_name', e.target.value)}
                placeholder="Enter father's name"
                className="h-11"
              />
            </div>

            {/* Mother's Name */}
            <div className="space-y-2">
              <Label htmlFor="mother_name" className="text-sm font-medium">
                Mother&apos;s Name
              </Label>
              <Input
                id="mother_name"
                value={formData.mother_name}
                onChange={e => handleChange('mother_name', e.target.value)}
                placeholder="Enter mother's name"
                className="h-11"
              />
            </div>

          </div>
        </div>

        <Separator />

        {/* ── Section 2: Employment Details ────────────────────────────────── */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Employment Details</h3>
          <div className="grid gap-6 sm:grid-cols-2">

            {/* Employment Type — backend required */}
            <div className="space-y-2">
              <Label htmlFor="employment_type" className="text-sm font-medium">
                Employment Type <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.employment_type} onValueChange={v => handleChange('employment_type', v)}>
                <SelectTrigger className={`h-11 ${errors.employment_type ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="visiting">Visiting</SelectItem>
                </SelectContent>
              </Select>
              {errors.employment_type && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />{errors.employment_type}
                </p>
              )}
            </div>

            {/* Joining Date — backend optional */}
            <div className="space-y-2">
              <Label htmlFor="joining_date" className="text-sm font-medium">Joining Date</Label>
              <Input
                id="joining_date"
                type="date"
                value={formData.joining_date}
                onChange={e => handleChange('joining_date', e.target.value)}
                className="h-11"
              />
            </div>

          </div>
        </div>

        <Separator />

        {/* ── Section 3: Additional Details ────────────────────────────────── */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Additional Details</h3>
          <div className="grid gap-6 sm:grid-cols-2">

            {/* Marital Status — backend optional */}
            <div className="space-y-2">
              <Label htmlFor="marital_status" className="text-sm font-medium">Marital Status</Label>
              <Select value={formData.marital_status} onValueChange={v => handleChange('marital_status', v)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Spouse Name — backend optional, only if married */}
            {formData.marital_status === 'married' && (
              <div className="space-y-2">
                <Label htmlFor="spouse_name" className="text-sm font-medium">Spouse Name</Label>
                <Input
                  id="spouse_name"
                  value={formData.spouse_name}
                  onChange={e => handleChange('spouse_name', e.target.value)}
                  placeholder="Enter spouse name"
                  className="h-11"
                />
              </div>
            )}

{/* Upload Photo */}
<div className="space-y-2">
  <Label htmlFor="photo_upload" className="text-sm font-medium">
    Upload Photo
  </Label>
  <div className="flex items-center gap-3">
    {photoPreview && (
      <img
        src={photoPreview}
        alt="Preview"
        className="h-11 w-11 rounded-full object-cover border border-border shrink-0"
      />
    )}
    <Input
      id="photo_upload"
      type="file"
      accept="image/*"
      className="h-11"
      onChange={handlePhotoChange}
    />
  </div>
  <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG only</p>
</div>






          </div>
        </div>

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-6">

          {/* Previous Button — shown in edit mode or when showPrevious=true */}
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
            <div /> // spacer to keep Update/Save button on right
          )}

          {/* Save & Next / Update Button */}
<Button
  type="button"
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="gap-2 w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90"
>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{isEditMode ? 'Updating...' : 'Saving...'}</>
            ) : isEditMode ? (
              <><CheckCircle2 className="h-4 w-4" />Update & Next<ArrowRight className="h-4 w-4" /></>
            ) : (
              <>Save & Next<ArrowRight className="h-4 w-4" /></>
            )}
          </Button>

        </div>

      </div>

      {/* ── Error Modal ───────────────────────────────────────────────────── */}
      <Dialog open={errorModal.open} onOpenChange={open => setErrorModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {errorModal.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground">
              {errorModal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorModal(prev => ({ ...prev, open: false }))}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
