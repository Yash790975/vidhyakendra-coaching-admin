'use client'

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Input }         from '@/components/ui/input'
import { Label }         from '@/components/ui/label'
import { Badge }         from '@/components/ui/badge'
import { Button }        from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Plus,
  User,
  X,
} from 'lucide-react'
import { studentsApi } from '@/lib/api/students'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContactType = 'student' | 'father' | 'mother' | 'guardian'

export interface SingleContactData {
  mobile:           string
  email:            string
  alternate_mobile: string
  _id?:             string
  email_verified?:  boolean
  _originalEmail?:  string  
}

export interface ContactInfoData {
  student:  SingleContactData
  father:   SingleContactData | null   // null = not added
  mother:   SingleContactData | null
  guardian: SingleContactData | null
}

export interface ContactInfoErrors {
  student?:  { mobile?: string; email?: string; alternate_mobile?: string }
  father?:   { mobile?: string; email?: string; alternate_mobile?: string }
  mother?:   { mobile?: string; email?: string; alternate_mobile?: string }
  guardian?: { mobile?: string; email?: string; alternate_mobile?: string }
}

/** Exposed via forwardRef so page.tsx can trigger OTP dialog after save */
export interface ContactInfoHandle {
  openOtpDialog: (email: string, onComplete?: () => void) => void
}

interface ContactInfoProps {
  studentId:       string
  data:            ContactInfoData
  errors:          ContactInfoErrors
  onChange:        (type: ContactType, field: keyof SingleContactData, value: string) => void
  onAddContact:    (type: Exclude<ContactType, 'student'>) => void
  onRemoveContact: (type: Exclude<ContactType, 'student'>) => void
  isEditMode?:     boolean
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateSingleContact(
  data: SingleContactData
): { mobile?: string; email?: string; alternate_mobile?: string } {
  const e: { mobile?: string; email?: string; alternate_mobile?: string } = {}

  if (!data.mobile.trim()) {
    e.mobile = 'Mobile number is required'
  } else if (!/^[0-9]{10}$/.test(data.mobile.trim())) {
    e.mobile = 'Enter a valid 10-digit mobile number'
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    e.email = 'Enter a valid email address'
  }

  if (data.alternate_mobile && !/^[0-9]{10}$/.test(data.alternate_mobile.trim())) {
    e.alternate_mobile = 'Alternate mobile must be 10 digits'
  }

  return e
}

export function validateContactInfo(data: ContactInfoData): {
  errors:    ContactInfoErrors
  hasErrors: boolean
} {
  const errors: ContactInfoErrors = {}
  let hasErrors = false
  const types: ContactType[] = ['student', 'father', 'mother', 'guardian']

  for (const type of types) {
    const contact = data[type]
    if (!contact) continue
    const e = validateSingleContact(contact)
    if (Object.keys(e).length > 0) {
      errors[type] = e
      hasErrors = true
    }
  }

  return { errors, hasErrors }
}

/** Default empty contact */
export const EMPTY_CONTACT: SingleContactData = {
  mobile:           '',
  email:            '',
  alternate_mobile: '',
}

/** Default step data */
export const DEFAULT_CONTACT_DATA: ContactInfoData = {
  student:  { ...EMPTY_CONTACT },
  father:   null,
  mother:   null,
  guardian: null,
}

// ─── Card visual config ───────────────────────────────────────────────────────

const CARD_CONFIG: Record<ContactType, {
  label:       string
  iconColor:   string
  borderColor: string
  bgColor:     string
}> = {
  student:  { label: "Student's Contact",  iconColor: 'text-blue-600',  borderColor: 'border-blue-200',  bgColor: 'bg-blue-50/50'  },
  father:   { label: "Father's Contact",   iconColor: 'text-blue-700',  borderColor: 'border-blue-200',  bgColor: 'bg-blue-50/40'  },
  mother:   { label: "Mother's Contact",   iconColor: 'text-pink-600',  borderColor: 'border-pink-200',  bgColor: 'bg-pink-50/40'  },
  guardian: { label: "Guardian's Contact", iconColor: 'text-green-600', borderColor: 'border-green-200', bgColor: 'bg-green-50/40' },
}

// ─── ContactCard sub-component ────────────────────────────────────────────────

function ContactCard({
  type,
  data,
  errors,
  onChange,
  onRemove,
}: {
  type:     ContactType
  data:     SingleContactData
  errors?:  { mobile?: string; email?: string; alternate_mobile?: string }
  onChange: (field: keyof SingleContactData, value: string) => void
  onRemove?: () => void
}) {
  const cfg = CARD_CONFIG[type]

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border ${cfg.borderColor}`}>
            <User className={`h-4 w-4 ${cfg.iconColor}`} />
          </div>
          <span className="font-semibold text-sm sm:text-base">{cfg.label}</span>

          {type === 'student' && (
            <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border border-blue-300">
              Primary
            </Badge>
          )}
          {data.email_verified && (
            <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border border-green-300 flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> Verified
            </Badge>
          )}
        </div>

        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 shrink-0 rounded-full hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Fields card */}
      <Card className={`border ${cfg.borderColor} ${cfg.bgColor}`}>
        <CardContent className="p-3 sm:p-4 space-y-4">

          <div className="grid gap-4 sm:grid-cols-2">
            {/* ✅ Backend: mobile — required, 10 digits */}
            <div className="space-y-2">
              <Label htmlFor={`${type}_mobile`}>
                Mobile Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={`${type}_mobile`}
                  type="tel"
                  placeholder="10-digit number"
                  value={data.mobile}
                  onChange={(e) =>
                    onChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  className={`pl-9 ${errors?.mobile ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
                />
              </div>
              {errors?.mobile && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {errors.mobile}
                </p>
              )}
            </div>

            {/* ✅ Backend: alternate_mobile — optional, 10 digits */}
            <div className="space-y-2">
              <Label htmlFor={`${type}_alt`}>Alternate Mobile</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={`${type}_alt`}
                  type="tel"
                  placeholder="10-digit number"
                  value={data.alternate_mobile}
                  onChange={(e) =>
                    onChange('alternate_mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  className={`pl-9 ${errors?.alternate_mobile ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
                />
              </div>
              {errors?.alternate_mobile && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {errors.alternate_mobile}
                </p>
              )}
            </div>
          </div>

          {/* ✅ Backend: email — optional, OTP sent if provided */}
          <div className="space-y-2">
            <Label htmlFor={`${type}_email`}>
              Email Address
              <span className="text-xs text-muted-foreground ml-2">
                (OTP will be sent for verification if added)
              </span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={`${type}_email`}
                type="email"
                placeholder="email@example.com"
                value={data.email}
                onChange={(e) => onChange('email', e.target.value)}
                className={`pl-9 ${errors?.email ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
              />
            </div>
            {errors?.email && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> {errors.email}
              </p>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component (forwardRef for OTP trigger) ──────────────────────────────

const ContactInfo = forwardRef<ContactInfoHandle, ContactInfoProps>(
  function ContactInfo(
    { studentId, data, errors, onChange, onAddContact, onRemoveContact, isEditMode = false },
    ref
  ) {
    // ── OTP state ──────────────────────────────────────────────────────────────
  const [otpOpen,        setOtpOpen]        = useState(false)
const [otpEmail,       setOtpEmail]       = useState('')
const [onOtpComplete,  setOnOtpComplete]  = useState<(() => void) | null>(null)

    const [otpValue,    setOtpValue]    = useState('')
    const [otpError,    setOtpError]    = useState<string | null>(null)
    const [otpVerified, setOtpVerified] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isResending, setIsResending] = useState(false)
    const [cooldown,    setCooldown]    = useState(0)

    // ── Cooldown timer ─────────────────────────────────────────────────────────
    useEffect(() => {
      if (cooldown <= 0) return
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }, [cooldown])

    // ── Expose openOtpDialog to page.tsx via ref ───────────────────────────────
useImperativeHandle(ref, () => ({
  openOtpDialog(email: string, onComplete?: () => void) {
    setOtpEmail(email)
    setOtpValue('')
    setOtpError(null)
    setOtpVerified(false)
    setOtpOpen(true)
    setCooldown(0)
    setOnOtpComplete(() => onComplete ? () => onComplete() : null)
    console.log('[ContactInfo] OTP dialog opened for email:', email)
  },
}))

    // ── Verify OTP — POST /student-contact-information/contact/verify-otp ──────
    const handleVerifyOtp = async () => {
      if (otpValue.length !== 6) {
        setOtpError('Please enter the 6-digit OTP')
        return
      }
      setIsVerifying(true)
      setOtpError(null)

      console.log('[ContactInfo] Verifying OTP | email:', otpEmail, '| otp:', otpValue)

      try {
        const response = await studentsApi.verifyContactOtp({student_id: studentId, email: otpEmail, otp: otpValue })

        if (!response.success) {
          const msg = response.message || 'Invalid OTP. Please try again.'
          setOtpError(msg)
          console.error('[ContactInfo] OTP verify failed:', { email: otpEmail, response })
          return
        }

    console.log('[ContactInfo] OTP verified for:', otpEmail)
setOtpVerified(true)
// 1.5s baad auto close + navigate
setTimeout(() => {
  setOtpOpen(false)
  onOtpComplete?.()
}, 1500)

      } catch (err) {
        setOtpError('Unable to connect. Please check your connection.')
        console.error('[ContactInfo] OTP verify exception:', err)
      } finally {
        setIsVerifying(false)
      }
    }

    // ── Resend OTP — POST /student-contact-information/contact/resend-otp ──────
    const handleResendOtp = async () => {
      if (cooldown > 0 || isResending) return
      setIsResending(true)
      setOtpError(null)   

      console.log('[ContactInfo] Resending OTP to:', otpEmail)

      try {
        const response = await studentsApi.resendContactOtp({student_id: studentId, email: otpEmail })

        if (!response.success) {
          setOtpError(response.message || 'Failed to resend OTP.')
          console.error('[ContactInfo] Resend OTP failed:', { email: otpEmail, response })
          return
        }

        console.log('[ContactInfo] OTP resent to:', otpEmail)
        setOtpValue('')
        setCooldown(600)

      } catch (err) {
        setOtpError('Unable to resend OTP. Please try again.')
        console.error('[ContactInfo] Resend OTP exception:', err)
      } finally {
        setIsResending(false)
      }
    }

    const addableTypes = (['father', 'mother', 'guardian'] as const).filter(
      (t) => data[t] === null
    )

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
      <div className="space-y-6">

        {/* Student contact — always visible, always primary */}
        <ContactCard
          type="student"
          data={data.student}
          errors={errors.student}
          onChange={(field, value) => onChange('student', field, value)}
        />

        {/* Optional contact cards (father / mother / guardian) */}
        {(['father', 'mother', 'guardian'] as const).map((type) =>
          data[type] !== null ? (
            <ContactCard
              key={type}
              type={type}
              data={data[type]!}
              errors={errors[type]}
              onChange={(field, value) => onChange(type, field, value)}
              onRemove={() => onRemoveContact(type)}
            />
          ) : null
        )}

        {/* Add contact type buttons — only shown for types not yet added */}
        {addableTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {addableTypes.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddContact(type)}
                className="flex items-center gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add {CARD_CONFIG[type].label}
              </Button>
            ))}
          </div>
        )}

        {/* ── OTP Verification Dialog ──────────────────────────────────────── */}
        <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="flex justify-center mb-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  otpVerified ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {otpVerified
                    ? <CheckCircle2 className="h-6 w-6 text-green-600" />
                    : <Mail className="h-6 w-6 text-blue-600" />
                  }
                </div>
              </div>

              <DialogTitle className="text-center">
                {otpVerified ? 'Email Verified!' : 'Verify Email'}
              </DialogTitle>

              <DialogDescription className="text-center text-sm mt-1">
                {otpVerified
                  ? 'Your email has been verified successfully.'
                  : (
                    <>
                      Enter the 6-digit OTP sent to{' '}
                      <span className="font-medium text-foreground break-all">{otpEmail}</span>
                    </>
                  )
                }
              </DialogDescription>
            </DialogHeader>

            {!otpVerified && (
              <div className="space-y-4 py-1">
                {/* OTP input */}
                <div className="space-y-2">
                  <Label htmlFor="contact_otp_input">OTP</Label>
                  <Input
                    id="contact_otp_input"
                    placeholder="• • • • • •"
                    value={otpValue}
                    onChange={(e) => {
                      setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))
                      setOtpError(null)
                    }}
                    maxLength={6}
                    className={`text-center font-mono tracking-[0.4em] text-lg ${
                      otpError ? 'border-red-500 focus-visible:ring-red-400' : ''
                    }`}
                  />
                  {otpError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {otpError}
                    </p>
                  )}
                </div>

                {/* Resend OTP with 60s cooldown */}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isResending}
                    className="text-xs text-muted-foreground h-8"
                  >
{isResending
  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Resending...</>
  : cooldown > 0
  ? `Resend OTP in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`
  : 'Resend OTP'
}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 mt-1">
              {/* OTP is optional — skip always allowed */}
<Button
  type="button"
  variant="outline"
  onClick={() => {
    setOtpOpen(false)
    onOtpComplete?.()
  }}
  className="w-full sm:w-auto"
>
  {otpVerified ? 'Continue' : 'Skip for now'}
</Button>

              {!otpVerified && (
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otpValue.length !== 6}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
                >
                  {isVerifying
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                    : 'Verify OTP'
                  }
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    )
  }
)

export default ContactInfo