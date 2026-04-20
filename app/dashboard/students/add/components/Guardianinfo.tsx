'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, X, AlertCircle, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GuardianRelation =
  | 'father'
  | 'mother'
  | 'guardian'
  | 'grandfather'
  | 'grandmother'
  | 'brother'
  | 'sister'
  | 'other'

export interface SingleGuardianData {
  _id?: string
  localKey: string
  name: string
  relation: GuardianRelation | ''
  mobile: string
  email: string
  occupation: string
  annual_income: string
  is_primary: boolean
}

export interface GuardianInfoData {
  guardians: SingleGuardianData[]
}

export interface SingleGuardianErrors {
  name?: string
  relation?: string
  mobile?: string
  email?: string
}

export interface GuardianInfoErrors {
  [localKey: string]: SingleGuardianErrors | string | undefined
  _form?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const RELATION_OPTIONS: { value: GuardianRelation; label: string }[] = [
  { value: 'father',      label: 'Father'      },
  { value: 'mother',      label: 'Mother'      },
  { value: 'guardian',    label: 'Guardian'    },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'brother',     label: 'Brother'     },
  { value: 'sister',      label: 'Sister'      },
  { value: 'other',       label: 'Other'       },
]

export const DEFAULT_GUARDIAN_DATA: GuardianInfoData = {
  guardians: [],
}

export function makeEmptyGuardian(overrides?: Partial<SingleGuardianData>): SingleGuardianData {
  return {
    localKey:      crypto.randomUUID(),
    name:          '',
    relation:      '',
    mobile:        '',
    email:         '',
    occupation:    '',
    annual_income: '',
    is_primary:    false,
    ...overrides,
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateGuardianInfo(data: GuardianInfoData): {
  errors: GuardianInfoErrors
  hasErrors: boolean
} {
  const errors: GuardianInfoErrors = {}

  if (data.guardians.length === 0) {
    errors._form = 'Please add at least one guardian.'
    return { errors, hasErrors: true }
  }

  const primaryCount = data.guardians.filter((g) => g.is_primary).length
  if (primaryCount === 0) {
    errors._form = 'Please set one guardian as primary.'
  }

  for (const g of data.guardians) {
    const gErrors: SingleGuardianErrors = {}

    if (!g.name.trim())   gErrors.name     = 'Name is required'
    if (!g.relation)      gErrors.relation = 'Relation is required'
    if (!g.mobile.trim()) {
      gErrors.mobile = 'Mobile number is required'
    } else if (!/^[0-9]{10}$/.test(g.mobile.trim())) {
      gErrors.mobile = 'Mobile must be exactly 10 digits'
    }
    if (g.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email.trim())) {
      gErrors.email = 'Enter a valid email address'
    }

    if (Object.keys(gErrors).length > 0) {
      errors[g.localKey] = gErrors
    }
  }

  return { errors, hasErrors: Object.keys(errors).length > 0 }
}

// ─── Card color per relation ──────────────────────────────────────────────────

function getCardStyle(relation: GuardianRelation | ''): {
  bg: string
  iconBg: string
  iconColor: string
} {
  switch (relation) {
    case 'father':
      return { bg: 'bg-blue-50/50',  iconBg: 'bg-blue-100',  iconColor: 'text-blue-700' }
    case 'mother':
      return { bg: 'bg-pink-50/50',  iconBg: 'bg-pink-100',  iconColor: 'text-pink-700' }
    default:
      return { bg: 'bg-green-50/50', iconBg: 'bg-green-100', iconColor: 'text-green-700' }
  }
}

function getRelationLabel(relation: GuardianRelation | ''): string {
  return RELATION_OPTIONS.find((r) => r.value === relation)?.label ?? 'Guardian'
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GuardianInfoProps {
  data: GuardianInfoData
  errors: GuardianInfoErrors
  onAdd: (relation: GuardianRelation) => void   // ← accepts relation from dropdown
  onRemove: (localKey: string) => void
  onChange: (localKey: string, field: keyof SingleGuardianData, value: string | boolean) => void
  onSetPrimary: (localKey: string) => void
  isEditMode?: boolean
}

export default function GuardianInfo({
  data,
  errors,
  onAdd,
  onRemove,
  onChange,
  onSetPrimary,
  isEditMode,
}: GuardianInfoProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Relations already added (grey them out in dropdown)
  const addedRelations = data.guardians.map((g) => g.relation)

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Header + Add button ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Guardian Information</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Add and manage guardian details
          </p>
        </div>

        {/* Dropdown */}
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="w-full sm:w-auto gap-2 border-2 font-medium"
          >
            + Add Guardian
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-popover shadow-md overflow-hidden">
              {RELATION_OPTIONS.map((opt) => {
                const alreadyAdded = addedRelations.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                      alreadyAdded
                        ? 'text-muted-foreground bg-muted/40 cursor-not-allowed'
                        : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!alreadyAdded) {
                        onAdd(opt.value)
                        setDropdownOpen(false)
                      }
                    }}
                    disabled={alreadyAdded}
                  >
                    <span>{opt.label}</span>
                    {alreadyAdded && (
                      <span className="text-xs text-muted-foreground shrink-0">Added</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Top-level form error ─────────────────────────────────────────── */}
      {errors._form && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{errors._form}</p>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {data.guardians.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-muted py-10 text-center">
          <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No guardians added yet. Click "+ Add Guardian" to get started.
          </p>
        </div>
      )}

      {/* ── Guardian Cards ───────────────────────────────────────────────── */}
      {data.guardians.map((guardian) => {
        const style   = getCardStyle(guardian.relation)
        const gErrors = (errors[guardian.localKey] as SingleGuardianErrors | undefined) ?? {}
        const label   = getRelationLabel(guardian.relation)

        return (
          <div key={guardian.localKey}>

            {/* ── Card header row ── */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-full hover:bg-red-100 hover:text-red-600"
                  onClick={() => onRemove(guardian.localKey)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
                  <User className={`h-4 w-4 ${style.iconColor}`} />
                </div>
                <h3 className="font-semibold text-sm sm:text-base truncate">
                  {label}'s Information
                </h3>
              </div>
              <div className="shrink-0">
                {guardian.is_primary ? (
                  <Badge className="bg-[#1897C6] text-white text-xs px-3 py-1">Primary</Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-[#1897C6] text-[#1897C6] hover:bg-[#1897C6]/10"
                    onClick={() => onSetPrimary(guardian.localKey)}
                  >
                    Set Primary
                  </Button>
                )}
              </div>
            </div>

            {/* ── Card body ── */}
            <Card className={`border ${style.bg}`}>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="space-y-3 sm:space-y-4">

                  {/* Row 1: Name + Occupation */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${guardian.localKey}_name`}>
                        {label}'s Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`${guardian.localKey}_name`}
                        placeholder={`Enter ${label.toLowerCase()}'s name`}
                        value={guardian.name}
                        onChange={(e) => onChange(guardian.localKey, 'name', e.target.value)}
                        className={gErrors.name ? 'border-red-500' : ''}
                      />
                      {gErrors.name && (
                        <p className="text-xs text-red-500">{gErrors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${guardian.localKey}_occupation`}>Occupation</Label>
                      <Input
                        id={`${guardian.localKey}_occupation`}
                        placeholder="Enter occupation"
                        value={guardian.occupation}
                        onChange={(e) => onChange(guardian.localKey, 'occupation', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 2: Mobile + Email */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${guardian.localKey}_mobile`}>
                        Mobile Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`${guardian.localKey}_mobile`}
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={guardian.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                          onChange(guardian.localKey, 'mobile', val)
                        }}
                        maxLength={10}
                        className={gErrors.mobile ? 'border-red-500' : ''}
                      />
                      {gErrors.mobile && (
                        <p className="text-xs text-red-500">{gErrors.mobile}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${guardian.localKey}_email`}>Email</Label>
                      <Input
                        id={`${guardian.localKey}_email`}
                        type="email"
                        placeholder={`${label.toLowerCase()}@email.com`}
                        value={guardian.email}
                        onChange={(e) => onChange(guardian.localKey, 'email', e.target.value)}
                        className={gErrors.email ? 'border-red-500' : ''}
                      />
                      {gErrors.email && (
                        <p className="text-xs text-red-500">{gErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Annual Income + Relation */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${guardian.localKey}_annual_income`}>Annual Income (₹)</Label>
                      <Input
                        id={`${guardian.localKey}_annual_income`}
                        type="number"
                        placeholder="Enter annual income"
                        value={guardian.annual_income}
                        onChange={(e) => onChange(guardian.localKey, 'annual_income', e.target.value)}
                        min={0}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${guardian.localKey}_relation`}>
                        Relation <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={guardian.relation}
                        onValueChange={(val) =>
                          onChange(guardian.localKey, 'relation', val as GuardianRelation)
                        }
                      >
                        <SelectTrigger
                          id={`${guardian.localKey}_relation`}
                          className={gErrors.relation ? 'border-red-500' : ''}
                        >
                          <SelectValue placeholder="Select relation" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {gErrors.relation && (
                        <p className="text-xs text-red-500">{gErrors.relation}</p>
                      )}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

          </div>
        )
      })}

    </div>
  )
}