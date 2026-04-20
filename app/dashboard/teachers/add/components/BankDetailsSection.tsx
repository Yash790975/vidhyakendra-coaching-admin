'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  CreditCard,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Save,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { teachersApi, type TeacherBankDetails } from '@/lib/api/teachers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BankDetailsFormData {
  account_holder_name: string
  bank_name: string
  branch_name: string       
  account_type: string     
  account_number: string
  ifsc_code: string
  upi_id: string
}

interface BankDetailsSectionProps {
  teacherId: string
  onSuccess: (formData: BankDetailsFormData) => void
  onPrevious?: () => void
  showPrevious?: boolean
  isEditMode?: boolean
}

// ─── Field-level error map ────────────────────────────────────────────────────

interface FieldErrors {
  account_holder_name?: string
  bank_name?: string
  account_number?: string
  confirm_account_number?: string
  ifsc_code?: string
  upi_id?: string
}

// ─── IFSC regex (matches backend Joi pattern) ─────────────────────────────────
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

// ─── Component ────────────────────────────────────────────────────────────────

export default function BankDetailsSection({
  teacherId,
  onSuccess,
  onPrevious,
  showPrevious = false,
  isEditMode = false,
}: BankDetailsSectionProps) {


  // ── form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<BankDetailsFormData>({
    account_holder_name: '',
    bank_name: '',
    branch_name: '',       // add
    account_type: 'savings', // add
    account_number: '',
    ifsc_code: '',
    upi_id: '',
  })

  // frontend-only field (not sent to backend)
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')

  // ── UI state ────────────────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({})
  const [apiError, setApiError]         = useState<string>('')
  const [isLoading, setIsLoading]       = useState(false)
  const [isFetching, setIsFetching]     = useState(false)
  const [existingBankId, setExistingBankId] = useState<string>('')

  // ── Fetch existing bank details in edit mode ────────────────────────────────
  useEffect(() => {
    if (!teacherId) return

    const fetchBankDetails = async () => {
      setIsFetching(true)
      try {
        const response = await teachersApi.getBankDetailsByTeacher(teacherId)

        // response.result is an array (from GET all bank details response shape)
        const list = (response as any)?.result ?? response
        if (Array.isArray(list) && list.length > 0) {
          const primary: TeacherBankDetails =
            list.find((b: TeacherBankDetails) => b.is_primary) ?? list[0]

          setExistingBankId(primary._id ?? '')
setForm({
            account_holder_name: primary.account_holder_name ?? '',
            bank_name:           primary.bank_name           ?? '',
            branch_name:         primary.branch_name         ?? '',   
            account_type:        primary.account_type        ?? 'savings', 
            account_number:      primary.account_number      ?? '',
            ifsc_code:           primary.ifsc_code           ?? '',
            upi_id:              primary.upi_id              ?? '',
          })
          setConfirmAccountNumber(primary.account_number ?? '')
        }
      } catch (err: any) {
        // No existing record is fine — not an error for the user
        console.error('[BankDetailsSection] fetch error:', err)
      } finally {
        setIsFetching(false)
      }
    }

    fetchBankDetails()
  }, [teacherId])

  // ── Field change handler ───────────────────────────────────────────────────
  const handleChange = (field: keyof BankDetailsFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear field error on change
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
    setApiError('')
  }

  // ── Client-side validation ─────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: FieldErrors = {}

    if (!form.account_holder_name.trim())
      errors.account_holder_name = 'Account holder name is required'

    if (!form.account_number.trim())
      errors.account_number = 'Account number is required'

    if (!confirmAccountNumber.trim())
      errors.confirm_account_number = 'Please confirm your account number'
    else if (form.account_number !== confirmAccountNumber)
      errors.confirm_account_number = 'Account numbers do not match'

    if (!form.ifsc_code.trim())
      errors.ifsc_code = 'IFSC code is required'
    else if (!IFSC_REGEX.test(form.ifsc_code))
      errors.ifsc_code = 'Invalid IFSC code format (e.g. HDFC0001234)'

    if (form.upi_id && !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(form.upi_id))
      errors.upi_id = 'Invalid UPI ID format (e.g. name@upi)'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return

    setIsLoading(true)
    setApiError('')

const payload: TeacherBankDetails = {
      teacher_id:           teacherId,
      account_holder_name:  form.account_holder_name.trim(),
      bank_name:            form.bank_name.trim() || undefined,
      branch_name:          form.branch_name.trim() || undefined,   // add
      account_type:         form.account_type as any || undefined,  // add
      account_number:       form.account_number.trim(),
      ifsc_code:            form.ifsc_code.trim().toUpperCase(),
      upi_id:               form.upi_id.trim() || undefined,
      is_primary:           true,
    }

    try {
      if (isEditMode && existingBankId) {
        await teachersApi.updateBankDetails(existingBankId, payload)
      } else {
        await teachersApi.createBankDetails(payload)
      }

      onSuccess(form)
    } catch (err: any) {
      // User-friendly message in UI; full error in console
      console.error('[BankDetailsSection] submit error:', err)
      const serverMsg: string =
        err?.response?.data?.message ??
        err?.message ??
        'Something went wrong. Please try again.'
      setApiError(serverMsg)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Loading skeleton while fetching existing data ───────────────────────
  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
        <p className="text-sm text-muted-foreground">Loading bank details...</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Section heading ── */}
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-[#1897C6]" />
        <h3 className="text-lg font-semibold">Bank Account Details</h3>
      </div>

      {/* ── API-level error banner ── */}
      {apiError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Failed to save bank details</p>
            <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {/* ── Form grid ── */}
      <div className="grid gap-6 sm:grid-cols-2">

        {/* Account Holder Name */}
        <div className="space-y-2">
          <Label htmlFor="account_holder_name" className="text-sm font-medium">
            Account Holder Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="account_holder_name"
            value={form.account_holder_name}
            onChange={e => handleChange('account_holder_name', e.target.value)}
            placeholder="As per bank records"
            className={cn('h-11', fieldErrors.account_holder_name && 'border-red-400 focus-visible:ring-red-300')}
          />
          {fieldErrors.account_holder_name && (
            <p className="text-xs text-red-500">{fieldErrors.account_holder_name}</p>
          )}
        </div>

        {/* Bank Name (optional in backend) */}
        <div className="space-y-2">
          <Label htmlFor="bank_name" className="text-sm font-medium">
            Bank Name
          </Label>
          <Input
            id="bank_name"
            value={form.bank_name}
            onChange={e => handleChange('bank_name', e.target.value)}
            placeholder="e.g. State Bank of India"
            className="h-11"
          />
        </div>

        {/* Account Number */}
        <div className="space-y-2">
          <Label htmlFor="account_number" className="text-sm font-medium">
            Account Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="account_number"
            value={form.account_number}
            onChange={e => handleChange('account_number', e.target.value)}
            placeholder="Enter account number"
            className={cn('h-11', fieldErrors.account_number && 'border-red-400 focus-visible:ring-red-300')}
          />
          {fieldErrors.account_number && (
            <p className="text-xs text-red-500">{fieldErrors.account_number}</p>
          )}
        </div>

        {/* Confirm Account Number — frontend only, NOT sent to backend */}
        <div className="space-y-2">
          <Label htmlFor="confirm_account_number" className="text-sm font-medium">
            Confirm Account Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="confirm_account_number"
            value={confirmAccountNumber}
            onChange={e => {
              setConfirmAccountNumber(e.target.value)
              if (fieldErrors.confirm_account_number)
                setFieldErrors(prev => ({ ...prev, confirm_account_number: undefined }))
            }}
            placeholder="Re-enter account number"
            className={cn('h-11', fieldErrors.confirm_account_number && 'border-red-400 focus-visible:ring-red-300')}
          />
          {fieldErrors.confirm_account_number && (
            <p className="text-xs text-red-500">{fieldErrors.confirm_account_number}</p>
          )}
          {/* live match indicator */}
          {form.account_number && confirmAccountNumber && !fieldErrors.confirm_account_number && (
            <p className={cn(
              'flex items-center gap-1 text-xs',
              form.account_number === confirmAccountNumber ? 'text-green-600' : 'text-red-500'
            )}>
              {form.account_number === confirmAccountNumber
                ? <><CheckCircle2 className="h-3.5 w-3.5" /> Account numbers match</>
                : <><AlertCircle className="h-3.5 w-3.5" /> Account numbers do not match</>
              }
            </p>
          )}
        </div>

        {/* IFSC Code */}
        <div className="space-y-2">
          <Label htmlFor="ifsc_code" className="text-sm font-medium">
            IFSC Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ifsc_code"
            value={form.ifsc_code}
            onChange={e => handleChange('ifsc_code', e.target.value.toUpperCase())}
            placeholder="e.g. HDFC0001234"
            maxLength={11}
            className={cn('h-11 font-mono tracking-wider', fieldErrors.ifsc_code && 'border-red-400 focus-visible:ring-red-300')}
          />
          {fieldErrors.ifsc_code && (
            <p className="text-xs text-red-500">{fieldErrors.ifsc_code}</p>
          )}
        </div>

        {/* UPI ID — optional */}
        <div className="space-y-2">
          <Label htmlFor="upi_id" className="text-sm font-medium">
            UPI ID
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Optional)</span>
          </Label>
          <Input
            id="upi_id"
            value={form.upi_id}
            onChange={e => handleChange('upi_id', e.target.value)}
            placeholder="yourname@upi"
            className={cn('h-11', fieldErrors.upi_id && 'border-red-400 focus-visible:ring-red-300')}
          />
          {fieldErrors.upi_id && (
            <p className="text-xs text-red-500">{fieldErrors.upi_id}</p>
          )}
        </div>

   <div className="space-y-2">
          <Label htmlFor="branch_name" className="text-sm font-medium">Branch Name</Label>
          <Input
            id="branch_name"
            value={form.branch_name}
            onChange={e => handleChange('branch_name', e.target.value)}
            placeholder="Enter branch name"
            className="h-11"
          />
        </div>

        {/* Account Type — frontend static, NOT sent to backend */}
<div className="space-y-2">
          <Label className="text-sm font-medium">Account Type</Label>
          <Select
            value={form.account_type}
            onValueChange={v => handleChange('account_type', v)}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="salary">Salary</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Info banner ── */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex gap-3 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-900">Important Note</p>
            <p className="text-xs text-blue-800">
              Please ensure all account details are correct. Salary will be credited to this account.
            </p>
          </div>
        </CardContent>
      </Card>

    {/* ── Action Buttons ── */}
      <div className="flex items-center justify-between border-t pt-6">
        {(showPrevious && onPrevious) ? (
          <Button type="button" variant="outline" onClick={onPrevious} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
        ) : (
          <div />
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          
          disabled={isLoading}
          className="gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90 px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditMode ? 'Update Bank Details' : 'Save & Complete'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

    </div>
  )
}