'use client'

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, UserRound } from 'lucide-react'
import { teachersApi, type TeacherEmergencyContact } from '@/lib/api/teachers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmergencyContactFormData {
  teacher_id: string
  name: string
  relation: string
  mobile: string
  _id?: string
}

// Ref handle — parent calls ref.current.submit()
export interface EmergencyContactRef {
  submit: () => Promise<boolean> // returns true on success, false on validation/API error
}

interface EmergencyContactSectionProps {
  teacherId: string
  isEditMode?: boolean
  onSuccess: (formData: EmergencyContactFormData) => void
}

interface FieldErrors {
  name?: string
  relation?: string
  mobile?: string
}

interface AlertModal {
  open: boolean
  title: string
  message: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const EmergencyContactSection = forwardRef<EmergencyContactRef, EmergencyContactSectionProps>(
  ({ teacherId, isEditMode = false, onSuccess }, ref) => {

    const [formData, setFormData] = useState<EmergencyContactFormData>({
      teacher_id: teacherId,
      name: '',
      relation: '',
      mobile: '',
    })

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(false)

    const [alertModal, setAlertModal] = useState<AlertModal>({
      open: false,
      title: '',
      message: '',
    })

    // ── Edit mode: load existing emergency contact ───────────────────────────

    useEffect(() => {
      if (!isEditMode || !teacherId) return

      const fetchEmergency = async () => {
        setIsLoadingData(true)
        try {
          const res = await teachersApi.getEmergencyContactsByTeacher(teacherId)
          if (res.success && Array.isArray(res.result) && res.result.length > 0) {
            const ec = res.result[0]
            setFormData({
              teacher_id: teacherId,
              _id: ec._id,
              name: ec.name ?? '',
              relation: ec.relation ?? '',
              mobile: ec.mobile ?? '',
            })
          }
        } catch (err) {
          console.error('[EmergencyContactSection] Failed to load:', err)
        } finally {
          setIsLoadingData(false)
        }
      }

      fetchEmergency()
    }, [isEditMode, teacherId])

    // ── Expose submit to parent via ref ──────────────────────────────────────

    useImperativeHandle(ref, () => ({
      submit: handleSubmit,
    }))

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const showAlert = (title: string, message: string) => {
      setAlertModal({ open: true, title, message })
    }

    const handleChange = (field: keyof EmergencyContactFormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }))
      if (fieldErrors[field as keyof FieldErrors]) {
        setFieldErrors(prev => ({ ...prev, [field]: '' }))
      }
    }

    // ─── Validation ──────────────────────────────────────────────────────────

    const validate = (): boolean => {
      const errors: FieldErrors = {}
      if (!formData.name.trim()) errors.name = 'Contact name is required'
      if (!formData.relation.trim()) errors.relation = 'Relationship is required'
      if (!formData.mobile.trim()) {
        errors.mobile = 'Mobile number is required'
      } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
        errors.mobile = 'Enter a valid 10-digit mobile number'
      }
      setFieldErrors(errors)
      return Object.keys(errors).length === 0
    }

    // ─── Submit — called by parent via ref.current.submit() ───────────────────

    const handleSubmit = async (): Promise<boolean> => {
      if (!validate()) return false

      setIsSubmitting(true)

      try {
        // Edit mode + existing record → PUT
        if (isEditMode && formData._id) {
          const payload = {
            name: formData.name.trim(),
            relation: formData.relation.trim(),
            mobile: formData.mobile.trim(),
          }

          console.log('[EmergencyContactSection] PUT /teacher-emergency-contacts/:id — payload:', payload)

          const response = await teachersApi.updateEmergencyContact(formData._id, payload as any)

          console.log('[EmergencyContactSection] Update response:', response)

          if (!response.success) {
            showAlert('Could Not Update', response.message || 'Something went wrong. Please try again.')
            return false
          }

          onSuccess(formData)
          return true
        }

        // Add mode → POST
        const payload: TeacherEmergencyContact = {
          teacher_id: teacherId,
          name: formData.name.trim(),
          relation: formData.relation.trim(),
          mobile: formData.mobile.trim(),
        }

        console.log('[EmergencyContactSection] POST /teacher-emergency-contacts — payload:', payload)

        const response = await teachersApi.createEmergencyContact(payload)

        console.log('[EmergencyContactSection] Create response:', response)

        if (!response.success) {
          const sc = response.statusCode
          if (sc === 400) {
            showAlert('Invalid Information', response.message || 'Please check the details and try again.')
          } else if (sc === 404) {
            showAlert('Teacher Not Found', 'Teacher record was not found. Please refresh and try again.')
          } else {
            showAlert('Could Not Save', response.message || 'Something went wrong. Please try again.')
          }
          return false
        }

        onSuccess({ ...formData, _id: response.result?._id })
        return true

      } catch (err: any) {
        console.error('[EmergencyContactSection] Unexpected error:', err)
        if (!navigator.onLine) {
          showAlert('No Internet Connection', 'Please check your internet connection and try again.')
        } else {
          showAlert('Could Not Save', err?.message || 'Something went wrong. Please try again.')
        }
        return false
      } finally {
        setIsSubmitting(false)
      }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    if (isLoadingData) {
      return (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading emergency contact...
        </div>
      )
    }

    return (
      <>
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <UserRound className="h-5 w-5 text-orange-500" />
              Emergency Contact
            </h3>

            <div className="grid gap-6 sm:grid-cols-2">

              {/* Contact Name */}
              <div className="space-y-2">
                <Label htmlFor="ec_name" className="text-sm font-medium">
                  Contact Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ec_name"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Enter contact name"
                  className={`h-11 ${fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.name && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Relationship */}
              <div className="space-y-2">
                <Label htmlFor="ec_relation" className="text-sm font-medium">
                  Relationship <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ec_relation"
                  value={formData.relation}
                  onChange={e => handleChange('relation', e.target.value)}
                  placeholder="e.g., Father, Mother, Spouse"
                  className={`h-11 ${fieldErrors.relation ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.relation && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.relation}
                  </p>
                )}
              </div>

              {/* Mobile */}
              <div className="space-y-2">
                <Label htmlFor="ec_mobile" className="text-sm font-medium">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ec_mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={e => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={`h-11 ${fieldErrors.mobile ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.mobile && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.mobile}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* No button here — parent ContactInfoSection has the single submit button */}

        </div>

        {/* ── Error / Alert Modal ─────────────────────────────────────────────── */}
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
)

EmergencyContactSection.displayName = 'EmergencyContactSection'

export default EmergencyContactSection