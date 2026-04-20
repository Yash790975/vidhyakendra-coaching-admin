'use client'


import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalInfoData {
  // ✅ Backend fields
  student_code:  string  
  full_name:     string   
  gender:        string   
  date_of_birth: string   
  blood_group:   string   
  religion:      string   
  caste:         string   
  category:      string   
  nationality:   string   

}

export interface PersonalInfoErrors {
  full_name?:     string
  gender?:        string
  date_of_birth?: string
}

interface PersonalInfoProps {
  data:       PersonalInfoData
  errors:     PersonalInfoErrors
  onChange:   (field: keyof PersonalInfoData, value: string) => void
  isEditMode?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other']

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalInfo({
  data,
  errors,
  onChange,
  isEditMode = false,
}: PersonalInfoProps) {
  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ── Admission Fields (UI Only) ───────────────────────────────────── */}
   

      {/* ── Full Name ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="full_name">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="full_name"
          placeholder="Enter student's full name"
          value={data.full_name}
          onChange={(e) => onChange('full_name', e.target.value)}
          className={errors.full_name ? 'border-red-500 focus-visible:ring-red-400' : ''}
        />
        {errors.full_name && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.full_name}
          </p>
        )}
      </div>

      {/* ── DOB & Gender ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">

        <div className="space-y-2">
          <Label htmlFor="date_of_birth">
            Date of Birth <span className="text-red-500">*</span>
          </Label>
          <Input
            id="date_of_birth"
            type="date"
            value={data.date_of_birth}
            onChange={(e) => onChange('date_of_birth', e.target.value)}
            className={errors.date_of_birth ? 'border-red-500 focus-visible:ring-red-400' : ''}
          />
          {errors.date_of_birth && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.date_of_birth}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">
            Gender <span className="text-red-500">*</span>
          </Label>
          <Select
            value={data.gender}
            onValueChange={(value) => onChange('gender', value)}
          >
            <SelectTrigger
              id="gender"
              className={errors.gender ? 'border-red-500 focus-visible:ring-red-400' : ''}
            >
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.gender}
            </p>
          )}
        </div>
      </div>

      {/* ── Blood Group & Nationality ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* ✅ Backend field */}
        <div className="space-y-2">
          <Label htmlFor="blood_group">Blood Group</Label>
          <Select
            value={data.blood_group}
            onValueChange={(value) => onChange('blood_group', value)}
          >
            <SelectTrigger id="blood_group">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_GROUPS.map((bg) => (
                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ✅ Backend field */}
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            placeholder="e.g. Indian"
            value={data.nationality}
            onChange={(e) => onChange('nationality', e.target.value)}
          />
        </div>
      </div>

      {/* ── Religion, Caste, Category ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">

        {/* ✅ Backend field */}
        <div className="space-y-2">
          <Label htmlFor="religion">Religion</Label>
          <Input
            id="religion"
            placeholder="e.g. Hindu"
            value={data.religion}
            onChange={(e) => onChange('religion', e.target.value)}
          />
        </div>

        {/* ✅ Backend field */}
        <div className="space-y-2">
          <Label htmlFor="caste">Caste</Label>
          <Input
            id="caste"
            placeholder="Enter caste"
            value={data.caste}
            onChange={(e) => onChange('caste', e.target.value)}
          />
        </div>

        {/* ✅ Backend field */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={data.category}
            onValueChange={(value) => onChange('category', value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}


