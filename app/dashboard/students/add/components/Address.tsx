'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SingleAddressData {
  _id?: string
  address: string
  city: string
  state: string
  pincode: string
}

export interface AddressInfoData {
  current: SingleAddressData
  permanent: SingleAddressData | null   // null = same as current
  same_as_current: boolean
}

export interface AddressInfoErrors {
  current?: {
    address?: string
    city?: string
    state?: string
    pincode?: string
  }
  permanent?: {
    address?: string
    city?: string
    state?: string
    pincode?: string
  }
}

// ─── Default / Empty helpers ──────────────────────────────────────────────────

export const EMPTY_ADDRESS: SingleAddressData = {
  address: '',
  city: '',
  state: '',
  pincode: '',
}

export const DEFAULT_ADDRESS_DATA: AddressInfoData = {
  current: { ...EMPTY_ADDRESS },
  permanent: null,
  same_as_current: false,
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateAddressInfo(data: AddressInfoData): {
  errors: AddressInfoErrors
  hasErrors: boolean
} {
  const errors: AddressInfoErrors = {}

  // Validate current address
  const currentErrors: AddressInfoErrors['current'] = {}
  if (!data.current.address.trim()) currentErrors.address = 'Address is required'
  if (!data.current.city.trim())    currentErrors.city    = 'City is required'
  if (!data.current.state.trim())   currentErrors.state   = 'State is required'
  if (!data.current.pincode.trim()) {
    currentErrors.pincode = 'Pincode is required'
  } else if (!/^[0-9]{6}$/.test(data.current.pincode.trim())) {
    currentErrors.pincode = 'Pincode must be exactly 6 digits'
  }
  if (Object.keys(currentErrors).length > 0) errors.current = currentErrors

  // Validate permanent address only when not same_as_current
  if (!data.same_as_current && data.permanent) {
    const permErrors: AddressInfoErrors['permanent'] = {}
    if (!data.permanent.address.trim()) permErrors.address = 'Address is required'
    if (!data.permanent.city.trim())    permErrors.city    = 'City is required'
    if (!data.permanent.state.trim())   permErrors.state   = 'State is required'
    if (!data.permanent.pincode.trim()) {
      permErrors.pincode = 'Pincode is required'
    } else if (!/^[0-9]{6}$/.test(data.permanent.pincode.trim())) {
      permErrors.pincode = 'Pincode must be exactly 6 digits'
    }
    if (Object.keys(permErrors).length > 0) errors.permanent = permErrors
  }

  return { errors, hasErrors: Object.keys(errors).length > 0 }
}

// ─── AddressBlock sub-component ───────────────────────────────────────────────

interface AddressBlockProps {
  title: string
  data: SingleAddressData
  errors?: AddressInfoErrors['current']
  prefix: string
  onChange: (field: keyof SingleAddressData, value: string) => void
  disabled?: boolean
}

function AddressBlock({ title, data, errors, prefix, onChange, disabled }: AddressBlockProps) {
  return (
    <div>
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}_address`}>
            Address <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id={`${prefix}_address`}
            placeholder={`Enter ${title.toLowerCase()}`}
            value={data.address}
            onChange={(e) => onChange('address', e.target.value)}
            rows={3}
            disabled={disabled}
            className={errors?.address ? 'border-red-500' : ''}
          />
          {errors?.address && (
            <p className="text-xs text-red-500">{errors.address}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}_city`}>
              City <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}_city`}
              placeholder="Enter city"
              value={data.city}
              onChange={(e) => onChange('city', e.target.value)}
              disabled={disabled}
              className={errors?.city ? 'border-red-500' : ''}
            />
            {errors?.city && (
              <p className="text-xs text-red-500">{errors.city}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}_state`}>
              State <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}_state`}
              placeholder="Enter state"
              value={data.state}
              onChange={(e) => onChange('state', e.target.value)}
              disabled={disabled}
              className={errors?.state ? 'border-red-500' : ''}
            />
            {errors?.state && (
              <p className="text-xs text-red-500">{errors.state}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}_pincode`}>
              Pincode <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}_pincode`}
              placeholder="XXXXXX"
              value={data.pincode}
              onChange={(e) => {
                // Allow only digits
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                onChange('pincode', val)
              }}
              disabled={disabled}
              maxLength={6}
              className={errors?.pincode ? 'border-red-500' : ''}
            />
            {errors?.pincode && (
              <p className="text-xs text-red-500">{errors.pincode}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AddressInfoProps {
  data: AddressInfoData
  errors: AddressInfoErrors
  onChange: (
    type: 'current' | 'permanent',
    field: keyof SingleAddressData,
    value: string
  ) => void
  onSameAsCurrentChange: (checked: boolean) => void
  isEditMode?: boolean
}

export default function AddressInfo({
  data,
  errors,
  onChange,
  onSameAsCurrentChange,
  isEditMode,
}: AddressInfoProps) {
  return (
    <div className="space-y-6">
      {/* Current Address */}
      <AddressBlock
        title="Current Address"
        data={data.current}
        errors={errors.current}
        prefix="current"
        onChange={(field, value) => onChange('current', field, value)}
      />

      {/* Same as current checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="same_as_current"
          checked={data.same_as_current}
          onCheckedChange={(checked) => onSameAsCurrentChange(!!checked)}
        />
        <Label htmlFor="same_as_current" className="text-sm font-normal cursor-pointer">
          Permanent address same as current address
        </Label>
      </div>

      {/* Permanent Address — hidden when same_as_current */}
      {!data.same_as_current && (
        <AddressBlock
          title="Permanent Address"
          data={data.permanent ?? EMPTY_ADDRESS}
          errors={errors.permanent}
          prefix="permanent"
          onChange={(field, value) => onChange('permanent', field, value)}
        />
      )}
    </div>
  )
}