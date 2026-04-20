'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowRight, Home, MapPin, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddressFormData {


  current_address: string   
  current_city: string    
  current_state: string    
  current_pincode: string  

  permanent_address: string 
  permanent_city: string  
  permanent_state: string 
  permanent_pincode: string 

  // ── STATIC field — NOT in teacher_addresses backend schema ────────────────
  // Only used as a UI helper to auto-copy current address to permanent.
  // Never sent to backend.
  same_as_current: boolean  // STATIC — UI only, copy helper checkbox
}

interface FieldErrors {
  current_address?: string
  current_city?: string
  current_state?: string
  current_pincode?: string
  permanent_address?: string
  permanent_city?: string
  permanent_state?: string
  permanent_pincode?: string
}

interface AlertModal {
  open: boolean
  title: string
  message: string
}

interface AddressSectionProps {
  teacherId: string
  onSuccess: (formData: AddressFormData) => void
  onPrevious?: () => void
  showPrevious?: boolean
  isEditMode?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddressSection({
  teacherId,
  onSuccess,
  onPrevious,
  showPrevious = false,
  isEditMode = false,
}: AddressSectionProps) {

  const [formData, setFormData] = useState<AddressFormData>({
    current_address: '',
    current_city: '',
    current_state: '',
    current_pincode: '',
    permanent_address: '',
    permanent_city: '',
    permanent_state: '',
    permanent_pincode: '',
    same_as_current: false, 
  })

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoadingData, setIsLoadingData] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Track existing address _ids for edit mode (needed for PUT /teacher-addresses/:id)
  const [currentAddressId, setCurrentAddressId] = useState<string | null>(null)
  const [permanentAddressId, setPermanentAddressId] = useState<string | null>(null)

  const [alertModal, setAlertModal] = useState<AlertModal>({
    open: false,
    title: '',
    message: '',
  })

  useEffect(() => {
    if (!isEditMode || !teacherId) return

    const fetchAddresses = async () => {
      setIsLoadingData(true)
      try {
        const res = await teachersApi.getAddressesByTeacher(teacherId)
        if (res.success && res.result && res.result.length > 0) {
          const addresses = res.result

          const current = addresses.find(a => a.address_type === 'current')
          const permanent = addresses.find(a => a.address_type === 'permanent')

          if (current) {
            setCurrentAddressId(current._id ?? null)
            setFormData(prev => ({
              ...prev,
              current_address: current.address ?? '',
              current_city: current.city ?? '',
              current_state: current.state ?? '',
              current_pincode: current.pincode ?? '',
            }))
          }

          if (permanent) {
            setPermanentAddressId(permanent._id ?? null)
            setFormData(prev => ({
              ...prev,
              permanent_address: permanent.address ?? '',
              permanent_city: permanent.city ?? '',
              permanent_state: permanent.state ?? '',
              permanent_pincode: permanent.pincode ?? '',
            }))
          }
        }
} catch (err) {
  console.error('[AddressSection] Failed to load addresses:', err)
  showAlert('Could Not Load', 'Failed to load existing address data. You can re-enter the details below.')
} finally {
        setIsLoadingData(false)
      }
    }

    fetchAddresses()
  }, [isEditMode, teacherId])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showAlert = (title: string, message: string) => {
    setAlertModal({ open: true, title, message })
  }

  const handleChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error on change
    if (typeof value === 'string' && fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
  }


  const handleSameAsCurrentChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      same_as_current: checked, 
      ...(checked
        ? {
            permanent_address: prev.current_address,
            permanent_city: prev.current_city,
            permanent_state: prev.current_state,
            permanent_pincode: prev.current_pincode,
          }
        : {}),
    }))
    // Clear permanent errors if copying
    if (checked) {
      setFieldErrors(prev => ({
        ...prev,
        permanent_address: '',
        permanent_city: '',
        permanent_state: '',
        permanent_pincode: '',
      }))
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  // Backend createAddressValidation (Joi):
  //   address_type : required, enum ['current', 'permanent']
  //   address      : required
  //   city, state, pincode : optional

  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!formData.current_address.trim()) {
      errors.current_address = 'Current address is required'
    }
    if (!formData.current_city.trim()) {
      errors.current_city = 'City is required'
    }
    if (!formData.current_state.trim()) {
      errors.current_state = 'State is required'
    }
    if (!formData.current_pincode.trim()) {
      errors.current_pincode = 'PIN code is required'
    } else if (!/^\d{6}$/.test(formData.current_pincode.trim())) {
      errors.current_pincode = 'Enter a valid 6-digit PIN code'
    }

    if (!formData.permanent_address.trim()) {
      errors.permanent_address = 'Permanent address is required'
    }
    if (!formData.permanent_city.trim()) {
      errors.permanent_city = 'City is required'
    }
    if (!formData.permanent_state.trim()) {
      errors.permanent_state = 'State is required'
    }
    if (!formData.permanent_pincode.trim()) {
      errors.permanent_pincode = 'PIN code is required'
    } else if (!/^\d{6}$/.test(formData.permanent_pincode.trim())) {
      errors.permanent_pincode = 'Enter a valid 6-digit PIN code'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Map API error status codes to user-friendly messages ──────────────────

  const handleApiError = (response: { statusCode?: number; message?: string }, label: string) => {
    const msg = response.message ?? ''
    if (response.statusCode === 400) {
      showAlert('Invalid Information', msg || `Please check the ${label} address details and try again.`)
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      showAlert('Access Denied', 'You do not have permission to perform this action.')
    } else if (response.statusCode === 404) {
      showAlert('Not Found', `${label} address record was not found. Please refresh and try again.`)
    } else {
      showAlert('Could Not Save', msg || `Failed to save ${label} address. Please try again.`)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  // Strategy:
  //   Create mode: POST two separate records — one current, one permanent
  //   Edit mode:   PUT existing records if _id found, else POST new ones
  //
  // Backend schema per record:
  //   { teacher_id, address_type, address, city, state, pincode }
  //
  // NOTE: same_as_current is NOT sent — it's only a UI helper

  const handleSubmit = async () => {
    if (!validate()) return

    if (!teacherId) {
      showAlert(
        'Personal Info Required',
        'Please save Personal Information first before filling address details.'
      )
      return
    }

    setIsSubmitting(true)

    try {
      // ── Build payloads — ONLY fields from teacher_addresses schema ──────────
      const currentPayload = {
        teacher_id: teacherId,
        address_type: 'current' as const,
        address: formData.current_address.trim(),
        city: formData.current_city.trim(),
        state: formData.current_state.trim(),
        pincode: formData.current_pincode.trim(),
        // same_as_current → NOT sent (UI only, not in backend schema)
      }

      const permanentPayload = {
        teacher_id: teacherId,
        address_type: 'permanent' as const,
        address: formData.permanent_address.trim(),
        city: formData.permanent_city.trim(),
        state: formData.permanent_state.trim(),
        pincode: formData.permanent_pincode.trim(),
        // same_as_current → NOT sent (UI only, not in backend schema)
      }

      console.log('[AddressSection] Current address payload:', currentPayload)
      console.log('[AddressSection] Permanent address payload:', permanentPayload)

      // ── Save current address ───────────────────────────────────────────────
      let currentResponse
      if (isEditMode && currentAddressId) {
        // PUT /teacher-addresses/:id
        currentResponse = await teachersApi.updateAddress(currentAddressId, currentPayload)
      } else {
        // POST /teacher-addresses
        currentResponse = await teachersApi.createAddress(currentPayload)
      }

      console.log('[AddressSection] Current address response:', currentResponse)

      if (!currentResponse.success) {
        handleApiError(currentResponse, 'current')
        return
      }

      // Store new _id if it was a create (for potential future edits in same session)
      if (!isEditMode && currentResponse.result?._id) {
        setCurrentAddressId(currentResponse.result._id)
      }

      // ── Save permanent address ─────────────────────────────────────────────
      let permanentResponse
      if (isEditMode && permanentAddressId) {
        // PUT /teacher-addresses/:id
        permanentResponse = await teachersApi.updateAddress(permanentAddressId, permanentPayload)
      } else {
        // POST /teacher-addresses
        permanentResponse = await teachersApi.createAddress(permanentPayload)
      }

      console.log('[AddressSection] Permanent address response:', permanentResponse)

      if (!permanentResponse.success) {
        handleApiError(permanentResponse, 'permanent')
        return
      }

      if (!isEditMode && permanentResponse.result?._id) {
        setPermanentAddressId(permanentResponse.result._id)
      }

      // ── Both saved successfully → call onSuccess ───────────────────────────
      onSuccess(formData)

    } catch (err: any) {
      console.error('[AddressSection] Unexpected error:', err)
      if (!navigator.onLine) {
        showAlert('No Internet Connection', 'Please check your internet connection and try again.')
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
        <p className="text-sm text-muted-foreground">Loading address information...</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-8">

        {/* ── Section 1: Current Address ────────────────────────────────────── */}
        {/* Backend: address_type = 'current' */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Home className="h-5 w-5 text-[#1897C6]" />
            Current Address
          </h3>

          <div className="grid gap-6">

            {/* address → backend: address (required) */}
            <div className="space-y-2">
              <Label htmlFor="current_address" className="text-sm font-medium">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="current_address"
                value={formData.current_address}
                onChange={e => handleChange('current_address', e.target.value)}
                placeholder="Enter full street address"
                rows={3}
                className={`resize-none ${fieldErrors.current_address ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {fieldErrors.current_address && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.current_address}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-3">

              {/* city → backend: city (optional) */}
              <div className="space-y-2">
                <Label htmlFor="current_city" className="text-sm font-medium">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="current_city"
                  value={formData.current_city}
                  onChange={e => handleChange('current_city', e.target.value)}
                  placeholder="Enter city"
                  className={`h-11 ${fieldErrors.current_city ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.current_city && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.current_city}
                  </p>
                )}
              </div>

              {/* state → backend: state (optional) */}
              <div className="space-y-2">
                <Label htmlFor="current_state" className="text-sm font-medium">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="current_state"
                  value={formData.current_state}
                  onChange={e => handleChange('current_state', e.target.value)}
                  placeholder="Enter state"
                  className={`h-11 ${fieldErrors.current_state ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.current_state && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.current_state}
                  </p>
                )}
              </div>

              {/* pincode → backend: pincode (optional) */}
              <div className="space-y-2">
                <Label htmlFor="current_pincode" className="text-sm font-medium">
                  PIN Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="current_pincode"
                  value={formData.current_pincode}
                  onChange={e =>
                    handleChange('current_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="6-digit PIN"
                  maxLength={6}
                  className={`h-11 ${fieldErrors.current_pincode ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.current_pincode && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.current_pincode}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>

        <Separator />

        {/* ── Section 2: Permanent Address ──────────────────────────────────── */}
        {/* Backend: address_type = 'permanent' */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-5 w-5 text-[#1897C6]" />
              Permanent Address
            </h3>

            {/* same_as_current — STATIC: UI only, not sent to backend */}
            {/* Just a helper to copy current address values into permanent fields */}
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={formData.same_as_current}
                onChange={e => handleSameAsCurrentChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#1897C6]"
              />
              <span className="text-sm text-muted-foreground">Same as current</span>
            </label>
          </div>

          <div className="grid gap-6">

            {/* address → backend: address (required) */}
            <div className="space-y-2">
              <Label htmlFor="permanent_address" className="text-sm font-medium">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="permanent_address"
                value={formData.permanent_address}
                onChange={e => handleChange('permanent_address', e.target.value)}
                placeholder="Enter full street address"
                rows={3}
                disabled={formData.same_as_current}
                className={`resize-none ${formData.same_as_current ? 'cursor-not-allowed opacity-60' : ''} ${fieldErrors.permanent_address ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {fieldErrors.permanent_address && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {fieldErrors.permanent_address}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-3">

              {/* city → backend: city (optional) */}
              <div className="space-y-2">
                <Label htmlFor="permanent_city" className="text-sm font-medium">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="permanent_city"
                  value={formData.permanent_city}
                  onChange={e => handleChange('permanent_city', e.target.value)}
                  placeholder="Enter city"
                  disabled={formData.same_as_current}
                  className={`h-11 ${formData.same_as_current ? 'cursor-not-allowed opacity-60' : ''} ${fieldErrors.permanent_city ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.permanent_city && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.permanent_city}
                  </p>
                )}
              </div>

              {/* state → backend: state (optional) */}
              <div className="space-y-2">
                <Label htmlFor="permanent_state" className="text-sm font-medium">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="permanent_state"
                  value={formData.permanent_state}
                  onChange={e => handleChange('permanent_state', e.target.value)}
                  placeholder="Enter state"
                  disabled={formData.same_as_current}
                  className={`h-11 ${formData.same_as_current ? 'cursor-not-allowed opacity-60' : ''} ${fieldErrors.permanent_state ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.permanent_state && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.permanent_state}
                  </p>
                )}
              </div>

              {/* pincode → backend: pincode (optional) */}
              <div className="space-y-2">
                <Label htmlFor="permanent_pincode" className="text-sm font-medium">
                  PIN Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="permanent_pincode"
                  value={formData.permanent_pincode}
                  onChange={e =>
                    handleChange('permanent_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="6-digit PIN"
                  maxLength={6}
                  disabled={formData.same_as_current}
                  className={`h-11 ${formData.same_as_current ? 'cursor-not-allowed opacity-60' : ''} ${fieldErrors.permanent_pincode ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {fieldErrors.permanent_pincode && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.permanent_pincode}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ── Save & Next Button ────────────────────────────────────────────── */}
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
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

      </div>

      {/* ── Error / Alert Modal (no browser alerts) ──────────────────────────── */}
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