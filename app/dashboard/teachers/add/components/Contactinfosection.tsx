'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  ArrowLeft,
  Phone,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import EmergencyContactSection, {
  type EmergencyContactFormData,
  type EmergencyContactRef,
} from './Emergencycontactsection'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactInfoFormData {
  teacher_id: string
  mobile: string
  email: string
  alternate_mobile: string
  whatsapp_number: string
  emergencyContact?: EmergencyContactFormData
}

interface ContactInfoSectionProps {
  teacherId: string
  onSuccess: (formData: ContactInfoFormData) => void
  onPrevious?: () => void
  isEditMode?: boolean
  showPrevious?: boolean
}

interface FieldErrors {
  mobile?: string
  email?: string
  alternate_mobile?: string
}

interface OtpModal {
  open: boolean
  email: string
  otp: string
  isVerifying: boolean
  isResending: boolean
  resendCooldown: number
}

interface AlertModal {
  open: boolean
  title: string
  message: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContactInfoSection({
  teacherId,
  onSuccess,
  onPrevious,
  isEditMode = false,
  showPrevious = false,
}: ContactInfoSectionProps) {

  // ── Two-step UI: contact form → (OTP) → emergency contact form ────────────
  // showEmergency = false  → show contact fields + "Save & Next / Update & Next" button
  // showEmergency = true   → show contact fields (read-only) + emergency section + "Save & Next / Update & Next" button
  const [showEmergency, setShowEmergency] = useState(false)
  const [savedContactData, setSavedContactData] = useState<ContactInfoFormData | null>(null)
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false)

  // Ref to call EmergencyContactSection.submit() from parent button
  const emergencyRef = useRef<EmergencyContactRef>(null)

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<ContactInfoFormData>({
    teacher_id: teacherId,
    mobile: '',
    email: '',
    alternate_mobile: '',
    whatsapp_number: '',
  })

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoadingData, setIsLoadingData] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false)
  const [originalEmail, setOriginalEmail] = useState('')
const [originalMobile, setOriginalMobile] = useState('')

  // ── OTP Modal ──────────────────────────────────────────────────────────────
  const [otpModal, setOtpModal] = useState<OtpModal>({
    open: false,
    email: '',
    otp: '',
    isVerifying: false,
    isResending: false,
    resendCooldown: 0,
  })

  // ── Alert Modal ────────────────────────────────────────────────────────────
  const [alertModal, setAlertModal] = useState<AlertModal>({
    open: false,
    title: '',
    message: '',
  })

  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  // ── Edit mode: fetch existing contact data ─────────────────────────────────
// ── Edit mode: fetch existing contact data ─────────────────────────────────
useEffect(() => {
  if (!isEditMode || !teacherId) return

  const fetchContact = async () => {
    setIsLoadingData(true)
    try {
      const res = await teachersApi.getContactByTeacher(teacherId)

    
      if (!res.success) {
        console.log('[ContactInfoSection] No contact record yet — showing fresh form')
        setIsLoadingData(false)
        return 
      }

      if (res.result) {
        const c = res.result
        const loaded: ContactInfoFormData = {
          teacher_id: teacherId,
          mobile: c.mobile ?? '',
          email: c.email ?? '',
          alternate_mobile: c.alternate_mobile ?? '',
          whatsapp_number: c.whatsapp_number ?? '',
        }
        setFormData(loaded)
        setOriginalEmail(c.email ?? '')
        setOriginalMobile(c.mobile ?? '')

        if (c.email_verified && c.mobile_verified) {
          setIsAlreadyVerified(true)
          setSavedContactData(loaded)
          setShowEmergency(true)
        }
      }
    } catch (err) {
      console.error('[ContactInfoSection] Failed to load contact:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  fetchContact()
}, [isEditMode, teacherId])

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showAlert = (title: string, message: string) => {
    setAlertModal({ open: true, title, message })
  }

  const handleChange = (field: keyof ContactInfoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const startCooldown = (seconds = 30) => {
    setOtpModal(prev => ({ ...prev, resendCooldown: seconds }))
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setOtpModal(prev => {
        if (prev.resendCooldown <= 1) {
          clearInterval(cooldownRef.current!)
          return { ...prev, resendCooldown: 0 }
        }
        return { ...prev, resendCooldown: prev.resendCooldown - 1 }
      })
    }, 1000)
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!formData.mobile.trim()) {
      errors.mobile = 'Mobile number is required'
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      errors.mobile = 'Enter a valid 10-digit mobile number (no spaces or +91)'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address'
    }

    if (
      formData.alternate_mobile.trim() &&
      !/^\d{10}$/.test(formData.alternate_mobile.trim())
    ) {
      errors.alternate_mobile = 'Enter a valid 10-digit alternate number'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ─── Step 1: Save contact info ────────────────────────────────────────────
  // Called when button is clicked and showEmergency is false

  const handleContactSubmit = async () => {
    if (!validate()) return

    if (!teacherId) {
      showAlert(
        'Personal Info Required',
        'Please save Personal Information first before filling contact details.'
      )
      return
    }

    setIsSubmitting(true)

    try {
const payload: Record<string, unknown> = {
  teacher_id: teacherId,
  mobile: formData.mobile.trim(),
  email: formData.email.trim().toLowerCase(),
}
if (formData.alternate_mobile.trim()) {
  payload.alternate_mobile = formData.alternate_mobile.trim()
}
if (formData.whatsapp_number.trim()) {
  payload.whatsapp_number = formData.whatsapp_number.trim()
}

      console.log(
        `[ContactInfoSection] ${isEditMode ? 'PUT' : 'POST'} /teacher-contact — payload:`,
        payload
      )

      let response

      if (isEditMode) {
        response = await teachersApi.updateContact(teacherId, payload as any)
      } else {
        response = await teachersApi.createContact(payload as any)
      }

      console.log('[ContactInfoSection] API response:', response)

      if (!response.success) {
        const msg = response.message ?? ''
        if (response.statusCode === 409) {
          // Record exists but not verified — update + resend OTP
          console.log('[ContactInfoSection] 409 detected — switching to PUT + resend OTP')
          try {
            const updateResponse = await teachersApi.updateContact(teacherId, payload as any)
            if (updateResponse.success) {
              await teachersApi.resendContactOtp({ email: formData.email.trim().toLowerCase() })
              setOtpModal({
                open: true,
                email: formData.email.trim().toLowerCase(),
                otp: '',
                isVerifying: false,
                isResending: false,
                resendCooldown: 30,
              })
              startCooldown(30)
            } else {
              showAlert('Could Not Save', updateResponse.message || 'Something went wrong. Please try again.')
            }
          } catch (updateErr: any) {
            showAlert('Could Not Save', updateErr?.message || 'Something went wrong. Please try again.')
          }
          return
        } else if (response.statusCode === 400) {
          showAlert('Invalid Information', msg || 'Please check the contact details and try again.')
        } else if (response.statusCode === 401 || response.statusCode === 403) {
          showAlert('Access Denied', 'You do not have permission to perform this action.')
        } else if (response.statusCode === 404) {
          showAlert('Teacher Not Found', 'Teacher record was not found. Please refresh the page and try again.')
        } else {
          showAlert('Could Not Save', msg || 'Something went wrong. Please try again.')
        }
        return
      }

// ── Edit mode: check if email/mobile changed ──────────────────────────
if (isEditMode) {
  const emailChanged = formData.email.trim().toLowerCase() !== originalEmail.toLowerCase()
  const mobileChanged = formData.mobile.trim() !== originalMobile

  // ── TEMPORARY DEBUG — baad mein hatao ──
  console.log('=== CONTACT DEBUG ===')
  console.log('originalEmail:', JSON.stringify(originalEmail))
  console.log('originalMobile:', JSON.stringify(originalMobile))
  console.log('formData.email:', JSON.stringify(formData.email.trim().toLowerCase()))
  console.log('formData.mobile:', JSON.stringify(formData.mobile.trim()))
  console.log('emailChanged:', emailChanged)
  console.log('mobileChanged:', mobileChanged)
  console.log('====================')

if (emailChanged || mobileChanged) {
  setIsAlreadyVerified(false)
  setShowEmergency(false)
  setOtpModal({
    open: true,
    email: formData.email.trim().toLowerCase(),
    otp: '',
    isVerifying: false,
    isResending: false,
    resendCooldown: 30,
  })
  startCooldown(30)
} else {
    setSavedContactData({ ...formData, teacher_id: teacherId })
    setShowEmergency(true)
  }
  return
}

      // ── Add mode: open OTP modal ───────────────────────────────────────────
      setOtpModal({
        open: true,
        email: formData.email.trim().toLowerCase(),
        otp: '',
        isVerifying: false,
        isResending: false,
        resendCooldown: 30,
      })
      startCooldown(30)

    } catch (err: any) {
      console.error('[ContactInfoSection] Unexpected error:', err)
      if (!navigator.onLine) {
        showAlert('No Internet Connection', 'Please check your internet connection and try again.')
      } else {
        showAlert('Could Not Save', err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Verify OTP ───────────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (!otpModal.otp.trim()) {
      showAlert('OTP Required', 'Please enter the 6-digit OTP sent to your email.')
      return
    }
    if (!/^\d{6}$/.test(otpModal.otp.trim())) {
      showAlert('Invalid OTP Format', 'Please enter a valid 6-digit numeric OTP.')
      return
    }

    setOtpModal(prev => ({ ...prev, isVerifying: true }))

    try {
      const response = await teachersApi.verifyContactOtp({
        email: otpModal.email,
        otp: otpModal.otp.trim(),
      })

      console.log('[ContactInfoSection] OTP verify response:', response)

      if (!response.success) {
        const sc = response.statusCode
        if (sc === 400) {
          const msg = response.message?.toLowerCase() ?? ''
          if (msg.includes('expired')) {
            showAlert('OTP Expired', 'Your OTP has expired. Please click "Resend OTP" to get a new one.')
          } else {
            showAlert('Incorrect OTP', 'The OTP you entered is incorrect. Please check your email and try again.')
          }
        } else if (sc === 410) {
          showAlert('OTP Expired', 'Your OTP has expired. Please click "Resend OTP" to get a new one.')
        } else {
          showAlert('Verification Failed', response.message || 'Could not verify OTP. Please try again.')
        }
        return
      }

      // ── OTP verified ✓ → close modal → show emergency section ─────────────
      if (cooldownRef.current) clearInterval(cooldownRef.current)
      setOtpModal(prev => ({ ...prev, open: false }))

      const contactData: ContactInfoFormData = { ...formData, teacher_id: teacherId }
      setSavedContactData(contactData)
      setShowEmergency(true) // ← this renders EmergencyContactSection

    } catch (err: any) {
      console.error('[ContactInfoSection] OTP verify error:', err)
      showAlert('Verification Failed', err?.message || 'Could not verify OTP. Please try again.')
    } finally {
      setOtpModal(prev => ({ ...prev, isVerifying: false }))
    }
  }

  // ─── Resend OTP ───────────────────────────────────────────────────────────

  const handleResendOtp = async () => {
    if (otpModal.resendCooldown > 0) return

    setOtpModal(prev => ({ ...prev, isResending: true }))

    try {
      const response = await teachersApi.resendContactOtp({ email: otpModal.email })

      console.log('[ContactInfoSection] Resend OTP response:', response)

      if (!response.success) {
        showAlert('Could Not Resend', response.message || 'Failed to resend OTP. Please try again.')
        return
      }

      setOtpModal(prev => ({ ...prev, otp: '' }))
      startCooldown(30)
    } catch (err: any) {
      console.error('[ContactInfoSection] Resend OTP error:', err)
      showAlert('Could Not Resend', err?.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setOtpModal(prev => ({ ...prev, isResending: false }))
    }
  }

  // ─── Step 2: Emergency contact saved → merge and call parent onSuccess ─────

  const handleEmergencySuccess = (emergencyData: EmergencyContactFormData) => {
    const finalData: ContactInfoFormData = {
      ...(savedContactData ?? formData),
      emergencyContact: emergencyData,
    }
    onSuccess(finalData)
  }

  // ─── Final submit button (when emergency section is visible) ──────────────
  // Calls emergencyRef.current.submit() which triggers API + calls handleEmergencySuccess

  const handleFinalSubmit = async () => {
    if (!emergencyRef.current) return
    setIsFinalSubmitting(true)
    try {
      await emergencyRef.current.submit()
      // handleEmergencySuccess will be called inside EmergencyContactSection on success
    } finally {
      setIsFinalSubmitting(false)
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
        <p className="text-sm text-muted-foreground">Loading contact information...</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-8">

        {/* ── Section: Contact Details ──────────────────────────────────────── */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Phone className="h-5 w-5 text-[#1897C6]" />
            Contact Details
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="teacher@example.com"
                // In edit mode once we've moved to emergency step, email is not re-editable
                readOnly={showEmergency}
                className={`h-11 ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''} ${showEmergency ? 'bg-muted cursor-not-allowed' : ''}`}
              />
              {fieldErrors.email && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-sm font-medium">
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mobile"
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

            {/* Alternate Mobile */}
            <div className="space-y-2">
              <Label htmlFor="alternate_mobile" className="text-sm font-medium">
                Alternate Mobile
              </Label>
              <Input
                id="alternate_mobile"
                type="tel"
                value={formData.alternate_mobile}
                onChange={e => handleChange('alternate_mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit alternate number"
                maxLength={10}
                className={`h-11 ${fieldErrors.alternate_mobile ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {fieldErrors.alternate_mobile && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.alternate_mobile}
                </p>
              )}
            </div>

            {/* WhatsApp — STATIC: not in teacher_contact_information schema */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp_number" className="text-sm font-medium">
                WhatsApp Number
               
              </Label>
<Input
  id="whatsapp_number"
  type="tel"
  value={formData.whatsapp_number}
  onChange={e => handleChange('whatsapp_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
  placeholder="10-digit WhatsApp number"
  maxLength={10}
  className="h-11"
/>
            </div>

          </div>
        </div>

        {/* ── Emergency Contact Section ─────────────────────────────────────── */}
        {/* Rendered only after OTP is verified (add mode) or already verified (edit mode) */}
        {showEmergency && (
          <>
            <Separator />
            <EmergencyContactSection
              ref={emergencyRef}
              teacherId={teacherId}
              isEditMode={isEditMode}
              onSuccess={handleEmergencySuccess}
            />
          </>
        )}

        {/* ── Action Buttons ─────────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t pt-6">

          {/* Previous Button */}
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

          {/*
            Single action button — behavior changes based on current step:
            - showEmergency = false  → save contact info (opens OTP in add mode)
            - showEmergency = true   → trigger emergency submit via ref
          */}
          {!showEmergency ? (
            /* ── Contact step button ── */
            <Button
              type="button"
              onClick={handleContactSubmit}
              disabled={isSubmitting}
              className="gap-2 w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : isEditMode ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Update & Next
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Save & Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            /* ── Emergency step button ── */
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isFinalSubmitting}
              className="gap-2 w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90"
            >
              {isFinalSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : isEditMode ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Update & Next
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Save & Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}

        </div>

      </div>

      {/* ── OTP Verification Modal ────────────────────────────────────────────── */}
      <Dialog
        open={otpModal.open}
        onOpenChange={() => {}}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1897C6]" />
              Verify Your Email
            </DialogTitle>
            <DialogDescription>
              A 6-digit OTP has been sent to{' '}
              <span className="font-semibold text-foreground">{otpModal.email}</span>.
              Please enter it below to verify your contact information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="otp_input" className="text-sm font-medium">
                Enter OTP <span className="text-red-500">*</span>
              </Label>
              <Input
                id="otp_input"
                type="text"
                inputMode="numeric"
                value={otpModal.otp}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setOtpModal(prev => ({ ...prev, otp: val }))
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !otpModal.isVerifying) handleVerifyOtp()
                }}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="h-12 text-center text-xl tracking-[0.5em] font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">OTP is valid for 10 minutes</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Didn&apos;t receive the OTP?</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={otpModal.resendCooldown > 0 || otpModal.isResending}
                onClick={handleResendOtp}
                className="gap-1.5 text-[#1897C6] hover:text-[#1897C6]/80"
              >
                {otpModal.isResending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />Resending...</>
                ) : otpModal.resendCooldown > 0 ? (
                  <><RefreshCw className="h-3.5 w-3.5" />Resend in {otpModal.resendCooldown}s</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" />Resend OTP</>
                )}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (cooldownRef.current) clearInterval(cooldownRef.current)
                setOtpModal(prev => ({ ...prev, open: false, otp: '' }))
              }}
              disabled={otpModal.isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpModal.isVerifying || otpModal.otp.length !== 6}
              className="gap-2 w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90"
            >
              {otpModal.isVerifying ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Verifying...</>
              ) : (
                <><ShieldCheck className="h-4 w-4" />Verify OTP</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Error / Alert Modal ───────────────────────────────────────────────── */}
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
