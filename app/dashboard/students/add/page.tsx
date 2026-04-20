'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  Phone,
  MapPin,
  FileText,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PartyPopper,
} from 'lucide-react'

// ─── Step Components ──────────────────────────────────────────────────────────
import dynamic from 'next/dynamic'
import type {
  PersonalInfoData,
  PersonalInfoErrors,
} from './components/PersonalInfo'

const PersonalInfo = dynamic(() => import('./components/PersonalInfo'), { ssr: false })
import ContactInfo, {
  ContactInfoData,
  ContactInfoErrors,
  ContactInfoHandle,
  ContactType,
  SingleContactData,
  DEFAULT_CONTACT_DATA,
  EMPTY_CONTACT,
  validateContactInfo,
} from './components/Contactinfo'
import AddressInfo, {
  AddressInfoData,
  AddressInfoErrors,
  DEFAULT_ADDRESS_DATA,
  EMPTY_ADDRESS,
  SingleAddressData,
  validateAddressInfo,
} from './components/Address'
import GuardianInfo, {
  GuardianInfoData,
  GuardianInfoErrors,
  GuardianRelation,
  SingleGuardianData,
  DEFAULT_GUARDIAN_DATA,
  makeEmptyGuardian,
  validateGuardianInfo,
} from './components/Guardianinfo'
import AcademicInfo, { AcademicInfoHandle, AcademicSummary } from './components/Academic'
import DocumentsInfo from './components/Documents'

// ─── API ──────────────────────────────────────────────────────────────────────
import { studentsApi } from '@/lib/api/students'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey =
  | 'personal'
  | 'contact'
  | 'address'
  | 'guardian'
  | 'academic'
  | 'documents'
  | 'review'

interface Section {
  key: SectionKey
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const SECTIONS: Section[] = [
  { key: 'personal',  label: 'Personal Info', icon: User          },
  { key: 'contact',   label: 'Contact',        icon: Phone         },
  { key: 'address',   label: 'Address',        icon: MapPin        },
  { key: 'guardian',  label: 'Guardian',       icon: User          },
  { key: 'academic',  label: 'Academic',       icon: GraduationCap },
  { key: 'documents', label: 'Documents',      icon: FileText      },
  { key: 'review',    label: 'Review',         icon: CheckCircle2  },
]

// ─── Validation ───────────────────────────────────────────────────────────────

function validatePersonalInfo(data: PersonalInfoData): PersonalInfoErrors {
  const errors: PersonalInfoErrors = {}
  if (!data.full_name.trim())  errors.full_name     = 'Full name is required'
  if (!data.gender)            errors.gender        = 'Please select a gender'
  if (!data.date_of_birth)     errors.date_of_birth = 'Date of birth is required'
  return errors
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInstituteInfo(): { institute_id: string; student_type: 'school' | 'coaching' } | null {
  if (typeof window === 'undefined') return null
  const institute_id = localStorage.getItem('instituteId')
  const rawType      = localStorage.getItem('instituteType')
  if (!institute_id || !rawType) {
    console.error('[AddStudentPage] Missing instituteId or instituteType in localStorage')
    return null
  }
  const student_type: 'school' | 'coaching' = rawType === 'coaching' ? 'coaching' : 'school'
  return { institute_id, student_type }
}

function capitalize(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_PERSONAL_DATA: PersonalInfoData = {
  student_code:     '',
  full_name:        '',
  gender:           '',
  date_of_birth:    '',
  blood_group:      '',
  religion:         '',
  caste:            '',
  category:         '',
  nationality:      'Indian',
}

const DEFAULT_ACADEMIC_SUMMARY: AcademicSummary = {
  className:          '',
  sectionName:        '',
  batchName:          '',
  rollNumber:         '',
  academicYear:       '',
  joinedAt:           '',
  mappingType:        'coaching',
  prevAcademicYear:   '',
  prevSchoolName:     '',
  prevBoard:          '',
  prevClassCompleted: '',
  prevRemarks:        '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddStudentPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const editStudentId = searchParams?.get('edit') ?? null
  const isEditMode    = !!editStudentId

  // ── Navigation state ────────────────────────────────────────────────────────
  const [activeSection,  setActiveSection]  = useState<SectionKey>('personal')
  const [completedSteps, setCompletedSteps] = useState<Set<SectionKey>>(new Set())

  // ── API state ───────────────────────────────────────────────────────────────
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(editStudentId)
  const [isSubmitting,     setIsSubmitting]     = useState(false)
  const [isFetching,       setIsFetching]       = useState(false)
  const [apiError,         setApiError]         = useState<string | null>(null)

  // ── Success Modal ────────────────────────────────────────────────────────────
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage,   setSuccessMessage]   = useState('')

  // ── Personal Info state ──────────────────────────────────────────────────────
  const [personalData,   setPersonalData]   = useState<PersonalInfoData>(DEFAULT_PERSONAL_DATA)
  const [personalErrors, setPersonalErrors] = useState<PersonalInfoErrors>({})

  // ── Contact Info state ───────────────────────────────────────────────────────
  const [contactData,   setContactData]   = useState<ContactInfoData>(DEFAULT_CONTACT_DATA)
  const [contactErrors, setContactErrors] = useState<ContactInfoErrors>({})
  const contactInfoRef = useRef<ContactInfoHandle>(null)

  // ── Address Info state ───────────────────────────────────────────────────────
  const [addressData,   setAddressData]   = useState<AddressInfoData>(DEFAULT_ADDRESS_DATA)
  const [addressErrors, setAddressErrors] = useState<AddressInfoErrors>({})

  // ── Guardian Info state ──────────────────────────────────────────────────────
  const [guardianData,   setGuardianData]   = useState<GuardianInfoData>(DEFAULT_GUARDIAN_DATA)
  const [guardianErrors, setGuardianErrors] = useState<GuardianInfoErrors>({})

  // ── Academic summary (lifted from AcademicInfo for Review) ──────────────────
  const [academicSummary, setAcademicSummary] = useState<AcademicSummary>(DEFAULT_ACADEMIC_SUMMARY)
  const academicInfoRef = useRef<AcademicInfoHandle>(null)

  // ── Documents uploaded list (lifted from DocumentsInfo for Review) ───────────
  // We read uploadedDocs from DocumentsInfo via a callback
  const [uploadedDocNames, setUploadedDocNames] = useState<string[]>([])
  const [deletedGuardianIds, setDeletedGuardianIds] = useState<string[]>([])


  // ── EDIT MODE: Fetch existing student ────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !editStudentId) return
    const fetchStudent = async () => {
      setIsFetching(true)
      setApiError(null)
      console.log('[AddStudentPage] Edit mode — fetching student ID:', editStudentId)
      try {
        const response = await studentsApi.getById(editStudentId)
        if (!response.success || !response.result) {
          setApiError(response.message || 'Could not load student data. Please try again.')
          return
        }
        const student = response.result
        console.log('[AddStudentPage] Student fetched for edit:', student)
setPersonalData((prev) => ({
  ...prev,
  student_code:  student.student_code ?? '',
  full_name:     student.full_name ?? '',
  gender:        student.gender ?? '',
  date_of_birth: student.date_of_birth
    ? new Date(student.date_of_birth).toISOString().split('T')[0]
    : '',
  blood_group:   student.blood_group  ?? '',
  religion:      student.religion     ?? '',
  caste:         student.caste        ?? '',
  category:      student.category     ?? '',
  nationality:   student.nationality  ?? '',
}))
        setCompletedSteps(new Set(['personal']))
      } catch (err) {
        setApiError('Unable to connect to the server. Please check your connection.')
        console.error('[AddStudentPage] Unexpected error fetching student:', err)
      } finally {
        setIsFetching(false)
      }
    }
    fetchStudent()
  }, [editStudentId, isEditMode])

  // ── EDIT MODE: Fetch contacts ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !editStudentId) return
    const fetchContacts = async () => {
      console.log('[AddStudentPage] Edit mode — fetching contacts for student:', editStudentId)
      try {
        const response = await studentsApi.getAllContactsByStudent(editStudentId)
        if (!response.success || !response.result) {
          console.error('[AddStudentPage] Failed to fetch contacts for edit:', response)
          return
        }
        const newContactData: ContactInfoData = { ...DEFAULT_CONTACT_DATA }
        for (const c of response.result) {
          const type = (c.contact_type ?? 'student') as ContactType
const filled: SingleContactData = {
  mobile:           c.mobile ?? '',
  email:            c.email ?? '',
  alternate_mobile: c.alternate_mobile ?? '',
  _id:              c._id,
  email_verified:   c.email_verified ?? false,
  _originalEmail:   c.email ?? '',
}
          if (type === 'student') newContactData.student = filled
          else                    newContactData[type]   = filled
        }
        setContactData(newContactData)
        setCompletedSteps((prev) => new Set([...prev, 'contact']))
      } catch (err) {
        console.error('[AddStudentPage] Unexpected error fetching contacts:', err)
      }
    }
    fetchContacts()
  }, [editStudentId, isEditMode])

  // ── EDIT MODE: Fetch addresses ───────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !editStudentId) return
    const fetchAddresses = async () => {
      console.log('[AddStudentPage] Edit mode — fetching addresses for student:', editStudentId)
      try {
        const response = await studentsApi.getAddressesByStudent(editStudentId)
        if (!response.success || !response.result) {
          console.error('[AddStudentPage] Failed to fetch addresses for edit:', response)
          return
        }
        const newAddressData: AddressInfoData = { ...DEFAULT_ADDRESS_DATA }
        for (const addr of response.result) {
          const filled: SingleAddressData = {
            _id:     addr._id,
            address: addr.address ?? '',
            city:    addr.city ?? '',
            state:   addr.state ?? '',
            pincode: addr.pincode ?? '',
          }
          if (addr.address_type === 'current')   newAddressData.current   = filled
          if (addr.address_type === 'permanent') newAddressData.permanent = filled
        }
        newAddressData.same_as_current = !response.result.some(a => a.address_type === 'permanent')
        setAddressData(newAddressData)
        setCompletedSteps((prev) => new Set([...prev, 'address']))
      } catch (err) {
        console.error('[AddStudentPage] Unexpected error fetching addresses:', err)
      }
    }
    fetchAddresses()
  }, [editStudentId, isEditMode])

  // ── EDIT MODE: Fetch guardians ───────────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !editStudentId) return
    const fetchGuardians = async () => {
      console.log('[AddStudentPage] Edit mode — fetching guardians for student:', editStudentId)
      try {
        const response = await studentsApi.getGuardiansByStudent(editStudentId)
        if (!response.success || !response.result) {
          console.error('[AddStudentPage] Failed to fetch guardians for edit:', response)
          return
        }
const loaded: SingleGuardianData[] = response.result.map((g) => ({
          localKey:      g._id ?? crypto.randomUUID(),
          _id:           g._id,
          name:          g.name ?? '',
          relation:      g.relation ?? '',
          mobile:        g.mobile ?? '',
          email:         g.email ?? '',
          occupation:    g.occupation ?? '',
          annual_income: g.annual_income != null ? String(g.annual_income) : '',
          is_primary:    g.is_primary ?? false,
        }))
        setGuardianData({ guardians: loaded })
        setCompletedSteps((prev) => new Set([...prev, 'guardian']))
      } catch (err) {
        console.error('[AddStudentPage] Unexpected error fetching guardians:', err)
      }
    }
    fetchGuardians()
  }, [editStudentId, isEditMode])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const currentIndex = SECTIONS.findIndex((s) => s.key === activeSection)
  const progress     = ((currentIndex + 1) / SECTIONS.length) * 100

  // ── Step 1: Save Personal Info ────────────────────────────────────────────────
const savePersonalInfo = useCallback(async (): Promise<boolean> => {
    const errors = validatePersonalInfo(personalData)
    if (Object.keys(errors).length > 0) {
      setPersonalErrors(errors)
      return false
    }
    setPersonalErrors({})
    setApiError(null)
    setIsSubmitting(true)
    try {
      if (createdStudentId && !isEditMode) {
        console.log('[PersonalInfo] Student already created, updating instead. ID:', createdStudentId)
        const updatePayload = {
          full_name:     personalData.full_name,
          gender:        personalData.gender as 'male' | 'female' | 'other',
          date_of_birth: personalData.date_of_birth,
          ...(personalData.blood_group  ? { blood_group:  personalData.blood_group  } : {}),
          ...(personalData.religion     ? { religion:     personalData.religion     } : { religion:     null }),
          ...(personalData.caste        ? { caste:        personalData.caste        } : { caste:        null }),
          ...(personalData.category     ? { category:     personalData.category     } : { category:     null }),
          ...(personalData.nationality  ? { nationality:  personalData.nationality  } : { nationality:  null }),
        }
        const response = await studentsApi.update(createdStudentId, updatePayload)
     if (!response.success || !response.result) {
          console.error('[PersonalInfo] Update failed:', response.message)
          setApiError('Failed to update student information. Please try again.')
          return false
        }
        return true
      }

      if (isEditMode && editStudentId) {
const updatePayload = {
  full_name:     personalData.full_name,
  gender:        personalData.gender as 'male' | 'female' | 'other',
  date_of_birth: personalData.date_of_birth,
  ...(personalData.blood_group  ? { blood_group:  personalData.blood_group  } : {}),
  ...(personalData.religion     ? { religion:     personalData.religion     } : { religion:     null }),
  ...(personalData.caste        ? { caste:        personalData.caste        } : { caste:        null }),
  ...(personalData.category     ? { category:     personalData.category     } : { category:     null }),
  ...(personalData.nationality  ? { nationality:  personalData.nationality  } : { nationality:  null }),
}
        console.log('[PersonalInfo] Updating student:', editStudentId, updatePayload)
        const response = await studentsApi.update(editStudentId, updatePayload)
     if (!response.success || !response.result) {
          console.error('[PersonalInfo] Update failed:', response.message)
          setApiError('Failed to update student information. Please try again.')
          return false
        }
        return true
      } else {
        const instituteInfo = getInstituteInfo()
        if (!instituteInfo) { setApiError('Session expired. Please log in again.'); return false }
const createPayload = {
  institute_id:  instituteInfo.institute_id,
  student_type:  instituteInfo.student_type as 'coaching',
  full_name:     personalData.full_name,
  gender:        personalData.gender as 'male' | 'female' | 'other',
  date_of_birth: personalData.date_of_birth,
  ...(personalData.blood_group  ? { blood_group:  personalData.blood_group  } : {}),
  ...(personalData.religion     ? { religion:     personalData.religion     } : {}),
  ...(personalData.caste        ? { caste:        personalData.caste        } : {}),
  ...(personalData.category     ? { category:     personalData.category     } : {}),
  ...(personalData.nationality  ? { nationality:  personalData.nationality  } : {}),
}
        console.log('[PersonalInfo] Creating student:', createPayload)
const response = await studentsApi.create(createPayload)
if (!response.success || !response.result) {
  console.error('[PersonalInfo] Create failed:', response.message)

  const isDuplicate =
    response.message?.toLowerCase().includes('duplicate key') ||
    response.message?.toLowerCase().includes('e11000') ||
    response.message?.toLowerCase().includes('dup key') ||
    response.message?.toLowerCase().includes('already exists')

  if (isDuplicate) {
    setApiError(
    'Student may already be saved. Please check the Students list and use Edit to continue.'
    )
    return false
  }

  setApiError('Failed to save personal information. Please try again.')
  return false
}
setCreatedStudentId(response.result._id)
console.log('[PersonalInfo] Student created. ID:', response.result._id)
return true
      }
    } catch (err) {
      setApiError('Unable to connect to the server. Please check your internet connection.')
      console.error('[PersonalInfo] Unexpected API exception:', err)
      return false
    } finally {
      setIsSubmitting(false)
    }
}, [personalData, isEditMode, editStudentId, createdStudentId])

  // ── Step 2: Save Contact Info ─────────────────────────────────────────────────
  const saveContactInfo = useCallback(async (): Promise<{ success: boolean; hasEmail: boolean }> => {
    if (!createdStudentId) {
      setApiError('Student record not found. Please complete Step 1 first.')
      return { success: false, hasEmail: false }
    }
    const { errors, hasErrors } = validateContactInfo(contactData)
    if (hasErrors) { setContactErrors(errors); return { success: false, hasEmail: false } }
    setContactErrors({})
    setApiError(null)
    setIsSubmitting(true)
    try {
      const types: ContactType[] = ['student', 'father', 'mother', 'guardian']
      let firstEmail: string | null = null
      for (const type of types) {
        const contact = contactData[type]
        if (!contact) continue
        const payload = {
          student_id:   createdStudentId,
          contact_type: type,
          mobile:       contact.mobile.trim(),
          ...(contact.email?.trim()            ? { email:            contact.email.trim() }            : {}),
          ...(contact.alternate_mobile?.trim() ? { alternate_mobile: contact.alternate_mobile.trim() } : {}),
          is_primary: type === 'student',
        }
        if (isEditMode && contact._id) {
          const { student_id, ...updatePayload } = payload
          const response = await studentsApi.updateContact(contact._id, updatePayload)
          if (!response.success) {
            console.error(`[ContactInfo] Update ${type} contact failed:`, response.message)
            setApiError(`Failed to update ${capitalize(type)} contact details. Please try again.`)
            return { success: false, hasEmail: false }
          }
        } else {
          const response = await studentsApi.createContact(payload)
          if (!response.success || !response.result) {
            console.error(`[ContactInfo] Create ${type} contact failed:`, response.message)
            setApiError(`Failed to save ${type} contact details. Please try again.`)
            return { success: false, hasEmail: false }
          }
          setContactData((prev) => ({
            ...prev,
            [type]: { ...prev[type]!, _id: response.result!._id },
          }))
        }
        if (!firstEmail && contact.email?.trim()) {
          if (!isEditMode) {
            firstEmail = contact.email.trim()
            console.log('[ContactInfo] Create mode — OTP will open for:', contact.email.trim())
          } else {
            const emailChanged = contact.email.trim() !== (contact._originalEmail ?? '').trim()
            if (emailChanged) {
              firstEmail = contact.email.trim()
              console.log('[ContactInfo] Edit mode — email changed, resend OTP for:', contact.email.trim())
            } else {
              console.log('[ContactInfo] Edit mode — email unchanged, skipping OTP for:', contact.email.trim())
            }
          }
        }
      }

      if (firstEmail) {
        if (isEditMode) {
          try {
            console.log('[ContactInfo] Edit mode — calling resend OTP API for:', firstEmail)
            const resendRes = await studentsApi.resendContactOtp({ email: firstEmail })
            if (!resendRes.success) {
              console.warn('[ContactInfo] Resend OTP API failed (non-fatal), dialog still opening:', resendRes.message)
            } else {
              console.log('[ContactInfo] Resend OTP API success — OTP sent to:', firstEmail)
            }
          } catch (resendErr) {
            console.warn('[ContactInfo] Resend OTP exception (non-fatal):', resendErr)
          }
        }

        contactInfoRef.current?.openOtpDialog(firstEmail, () => {
          setCompletedSteps((prev) => new Set([...prev, 'contact']))
          setActiveSection('address')
          console.log('[ContactInfo] OTP dialog closed — moving to address step')
        })
      }

      return { success: true, hasEmail: !!firstEmail }
    } catch (err) {
      setApiError('Unable to connect to the server. Please check your internet connection.')
      console.error('[ContactInfo] Unexpected API exception:', err)
      return { success: false, hasEmail: false }
    } finally {
      setIsSubmitting(false)
    }
  }, [contactData, createdStudentId, isEditMode])

  // ── Step 3: Save Address Info ─────────────────────────────────────────────────
  const saveAddressInfo = useCallback(async (): Promise<boolean> => {
    if (!createdStudentId) {
      setApiError('Student record not found. Please complete Step 1 first.')
      return false
    }
    const { errors, hasErrors } = validateAddressInfo(addressData)
    if (hasErrors) { setAddressErrors(errors); return false }
    setAddressErrors({})
    setApiError(null)
    setIsSubmitting(true)
    try {
const toSave: Array<{ type: 'current' | 'permanent'; data: SingleAddressData }> = [
  { type: 'current', data: addressData.current },
]

if (!addressData.same_as_current && addressData.permanent) {
  toSave.push({ type: 'permanent', data: addressData.permanent })
}

if (addressData.same_as_current && addressData.permanent?._id) {
  try {
    const deleteRes = await studentsApi.deleteAddress(addressData.permanent._id)
    if (!deleteRes.success) {
      console.warn('[AddressInfo] Could not delete old permanent address (non-fatal):', deleteRes.message)
    } else {
      console.log('[AddressInfo] Old permanent address deleted successfully')
      setAddressData((prev) => ({ ...prev, permanent: null }))
    }
  } catch (err) {
    console.warn('[AddressInfo] Delete permanent address exception (non-fatal):', err)
  }
}

      for (const { type, data } of toSave) {
        if (isEditMode && data._id) {
          const updatePayload = { address: data.address.trim(), city: data.city.trim(), state: data.state.trim(), pincode: data.pincode.trim() }
          const response = await studentsApi.updateAddress(data._id, updatePayload)
          if (!response.success) {
            console.error(`[AddressInfo] Update ${type} address failed:`, response.message)
            setApiError(`Failed to update ${type} address. Please check the details and try again.`)
            return false
          }
        } else {
          const createPayload = { student_id: createdStudentId, address_type: type, address: data.address.trim(), city: data.city.trim(), state: data.state.trim(), pincode: data.pincode.trim() }
          const response = await studentsApi.createAddress(createPayload)
          if (!response.success || !response.result) {
            console.error(`[AddressInfo] Create ${type} address failed:`, response.message)
            setApiError(`Failed to save ${type} address. Please check the details and try again.`)
            return false
          }
          setAddressData((prev) => ({ ...prev, [type]: { ...(prev[type] ?? EMPTY_ADDRESS), _id: response.result!._id } }))
        }
      }
      return true
    } catch (err) {
      setApiError('Unable to connect to the server. Please check your internet connection.')
      console.error('[AddressInfo] Unexpected API exception:', err)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [addressData, createdStudentId, isEditMode])

  // ── Step 4: Save Guardian Info ─────────────────────────────────────────────────

const saveGuardianInfo = useCallback(async (): Promise<boolean> => {
  if (!createdStudentId) {
    setApiError('Student record not found. Please complete Step 1 first.')
    return false
  }
  const { errors, hasErrors } = validateGuardianInfo(guardianData)
  if (hasErrors) { setGuardianErrors(errors); return false }
  setGuardianErrors({})
  setApiError(null)
  setIsSubmitting(true)
  try {
    // ✅ Delete removed guardians (edit mode only)
    if (isEditMode && deletedGuardianIds.length > 0) {
      for (const id of deletedGuardianIds) {
        try {
          await studentsApi.deleteGuardian(id)
          console.log('[GuardianInfo] Deleted guardian:', id)
        } catch (err) {
          console.warn('[GuardianInfo] Delete guardian failed (non-fatal):', id, err)
        }
      }
      setDeletedGuardianIds([])
    }

    // ✅ Save each guardian
    for (const g of guardianData.guardians) {
      const payload = {
        student_id:    createdStudentId,
        name:          g.name.trim(),
         relation:      g.relation as GuardianRelation,
        mobile:        g.mobile.trim(),
        email:         g.email?.trim()       || null,
        occupation:    g.occupation?.trim()  || null,
        annual_income: g.annual_income       ? Number(g.annual_income) : null,
        is_primary:    g.is_primary ?? false,
      }

      if (isEditMode && g._id) {
        const { student_id, ...updatePayload } = payload
        const response = await studentsApi.updateGuardian(g._id, updatePayload)
        if (!response.success) {
          setApiError(response.message || `Failed to update ${g.relation}'s information. Please try again.`)
          return false
        }
      } else {
        const response = await studentsApi.createGuardian(payload)
        if (!response.success || !response.result) {
          setApiError(response.message || `Failed to save ${g.relation}'s information. Please try again.`)
          return false
        }
        // ✅ _id save for future edits
        setGuardianData((prev) => ({
          guardians: prev.guardians.map((existing) =>
            existing.localKey === g.localKey
              ? { ...existing, _id: response.result!._id }
              : existing
          ),
        }))
      }
    }
    return true
  } catch (err) {
    setApiError('Unable to connect to the server. Please check your internet connection.')
    console.error('[GuardianInfo] Unexpected API exception:', err)
    return false
  } finally {
    setIsSubmitting(false)
  }
}, [guardianData, createdStudentId, isEditMode, deletedGuardianIds])

  // ── Navigation handlers ───────────────────────────────────────────────────────
  const handleNext = async () => {
    setApiError(null)

    if (activeSection === 'personal') {
      const success = await savePersonalInfo()
      if (!success) return
      setCompletedSteps((prev) => new Set([...prev, 'personal']))

} else if (activeSection === 'contact') {
  const result = await saveContactInfo()
  if (!result.success) return
  setCompletedSteps((prev) => new Set([...prev, 'contact']))
  if (result.hasEmail) return 

} else if (activeSection === 'address') {
  const success = await saveAddressInfo()
  if (!success) return
  setCompletedSteps((prev) => new Set([...prev, 'address']))

} else if (activeSection === 'guardian') {
  const success = await saveGuardianInfo()
  if (!success) return
  setCompletedSteps((prev) => new Set([...prev, 'guardian']))

} else if (activeSection === 'academic') {
      if (!createdStudentId) {
        setApiError('Student record not found. Please complete Step 1 first.')
        return
      }
      const success = await academicInfoRef.current?.save()
      if (!success) return
      setCompletedSteps((prev) => new Set([...prev, 'academic']))

    } else if (activeSection === 'documents') {
      setCompletedSteps((prev) => new Set([...prev, 'documents']))

    } else {
      setCompletedSteps((prev) => new Set([...prev, activeSection]))
    }

    if (currentIndex < SECTIONS.length - 1) {
      setActiveSection(SECTIONS[currentIndex + 1].key)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setActiveSection(SECTIONS[currentIndex - 1].key)
      setApiError(null)
    }
  }

  const handleSectionClick = (key: SectionKey) => {
    if (completedSteps.has(key) || key === activeSection) {
      setActiveSection(key)
      setApiError(null)
    }
  }

  const handleFinalSubmit = async () => {
    console.log('[AddStudentPage] Final submit. Student ID:', createdStudentId)
    setSuccessMessage(
      isEditMode
        ? 'Student information has been updated successfully.'
        : 'New student has been added successfully.'
    )
    setShowSuccessModal(true)
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    router.push('/dashboard/students/all')
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
              {isEditMode ? 'Edit Student' : 'Add New Student'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {isEditMode ? 'Update student information below' : 'Complete all sections to onboard a new student'}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard/students/all')} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
        </div>

        {/* ── Fetch loading ─────────────────────────────────────────────────── */}
        {isFetching && (
          <Card className="mb-4 border border-blue-200 bg-blue-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-700">Loading student data...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Progress Bar ──────────────────────────────────────────────────── */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium">
                  Step {currentIndex + 1} of {SECTIONS.length} — {SECTIONS[currentIndex].label}
                </span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5 sm:h-2" />
            </div>
          </CardContent>
        </Card>

        {/* ── Section Navigation Tabs ───────────────────────────────────────── */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {SECTIONS.map((section) => {
                const Icon        = section.icon
                const isActive    = activeSection === section.key
                const isCompleted = completedSteps.has(section.key)
                const isClickable = isCompleted || isActive
                return (
                  <button
                    key={section.key}
                    onClick={() => handleSectionClick(section.key)}
                    disabled={!isClickable}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg whitespace-nowrap transition-all snap-start flex-shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white'
                        : isCompleted
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                        : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm font-medium">{section.label}</span>
                    {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── API Error Banner ──────────────────────────────────────────────── */}
        {apiError && (
          <Card className="mb-4 border border-red-200 bg-red-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Form Content ──────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">

{activeSection === 'personal' && (
              <PersonalInfo
                key="personal-info-form"
                data={personalData}
                errors={personalErrors}
                onChange={(field, value) => setPersonalData((prev) => ({ ...prev, [field]: value }))}
                isEditMode={isEditMode}
              />
            )}

            {activeSection === 'contact' && (
              <ContactInfo
                ref={contactInfoRef}
                studentId={createdStudentId ?? ''}
                data={contactData}
                errors={contactErrors}
                onChange={(type, field, value) =>
                  setContactData((prev) => ({ ...prev, [type]: { ...prev[type]!, [field]: value } }))
                }
                onAddContact={(type) => setContactData((prev) => ({ ...prev, [type]: { ...EMPTY_CONTACT } }))}
                onRemoveContact={(type) => setContactData((prev) => ({ ...prev, [type]: null }))}
                isEditMode={isEditMode}
              />
            )}

            {activeSection === 'address' && (
              <AddressInfo
                data={addressData}
                errors={addressErrors}
                onChange={(type, field, value) =>
                  setAddressData((prev) => ({ ...prev, [type]: { ...(prev[type] ?? EMPTY_ADDRESS), [field]: value } }))
                }
                onSameAsCurrentChange={(checked) => {
                  setAddressData((prev) => ({
                    ...prev,
                    same_as_current: checked,
                    permanent: !checked && !prev.permanent ? { ...EMPTY_ADDRESS } : prev.permanent,
                  }))
                }}
                isEditMode={isEditMode}
              />
            )}

            {activeSection === 'guardian' && (
              <GuardianInfo
                data={guardianData}
                errors={guardianErrors}
onAdd={(relation) =>
  setGuardianData((prev) => ({
    guardians: [
      ...prev.guardians,
      makeEmptyGuardian({
        relation,
        is_primary: prev.guardians.length === 0,
      }),
    ],
  }))
}
onRemove={(localKey) =>
  setGuardianData((prev) => {
    const removedGuardian = prev.guardians.find((g) => g.localKey === localKey)
    
    
    if (removedGuardian?._id) {
      setDeletedGuardianIds((ids) => [...ids, removedGuardian._id!])
    }
    
    const filtered = prev.guardians.filter((g) => g.localKey !== localKey)
    const removedWasPrimary = removedGuardian?.is_primary
    if (removedWasPrimary && filtered.length > 0) filtered[0] = { ...filtered[0], is_primary: true }
    return { guardians: filtered }
  })
}
                
                onChange={(localKey, field, value) =>
                  setGuardianData((prev) => ({
                    guardians: prev.guardians.map((g) => g.localKey === localKey ? { ...g, [field]: value } : g),
                  }))
                }
                onSetPrimary={(localKey) =>
                  setGuardianData((prev) => ({
                    guardians: prev.guardians.map((g) => ({ ...g, is_primary: g.localKey === localKey })),
                  }))
                }
                isEditMode={isEditMode}
              />
            )}

            {activeSection === 'academic' && (
              <AcademicInfo
                ref={academicInfoRef}
                studentId={createdStudentId ?? ''}
                studentName={personalData.full_name}
                isEditMode={isEditMode}
                onSaveSuccess={() => setCompletedSteps((prev) => new Set([...prev, 'academic']))}
                onDataChange={setAcademicSummary}
              />
            )}

            {activeSection === 'documents' && (
              <DocumentsInfo
                studentId={createdStudentId ?? ''}
                studentName={personalData.full_name}
                isEditMode={isEditMode}
                onUploadedNamesChange={setUploadedDocNames}
              />
            )}

            {activeSection === 'review' && (
              <ReviewSection
                personalData={personalData}
                contactData={contactData}
                addressData={addressData}
                guardianData={guardianData}
                academicSummary={academicSummary}
                uploadedDocNames={uploadedDocNames}
                studentId={createdStudentId}
                isEditMode={isEditMode}
              />
            )}

          </CardContent>
        </Card>

        {/* ── Navigation Buttons ────────────────────────────────────────────── */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0 || isSubmitting || isFetching}
            className="sm:flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

{activeSection === 'review' ? (
  <Button
    onClick={handleFinalSubmit}
    disabled={isSubmitting || isFetching}
    className="sm:flex-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
  >
    <Save className="h-4 w-4 mr-2" />
    {isEditMode ? 'Update Student' : 'Finish & Save'}
  </Button>
) : (
  <Button
    onClick={handleNext}
    disabled={isSubmitting || isFetching}
    className="sm:flex-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
  >
    {isSubmitting ? (
      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isEditMode ? 'Updating...' : 'Saving...'}</>
    ) : isEditMode ? (
      <><Save className="h-4 w-4 mr-2" />Update & Next<ArrowRight className="h-4 w-4 ml-2" /></>
    ) : (
      <><Save className="h-4 w-4 mr-2" />Save & Next<ArrowRight className="h-4 w-4 ml-2" /></>
    )}
  </Button>
)}
        </div>

      </div>

      {/* ── Success Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <PartyPopper className="h-7 w-7 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg">
              {isEditMode ? 'Student Updated!' : 'Student Added Successfully!'}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-1">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          {/* {createdStudentId && (
            <div className="rounded-md bg-muted px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Student ID</p>
              <p className="font-mono text-sm font-medium mt-0.5">{createdStudentId}</p>
            </div>
          )} */}
          <DialogFooter className="sm:justify-center gap-2 mt-2">
            <Button onClick={handleSuccessModalClose} className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] w-full sm:w-auto">
              Go to Students List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between px-4 py-2.5 gap-4">
      <span className="text-muted-foreground text-sm shrink-0 w-40">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value?.trim()
          ? value
          : <span className="text-muted-foreground italic font-normal">Not provided</span>
        }
      </span>
    </div>
  )
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-sm px-1">{title}</h3>
      <div className="rounded-lg border divide-y">{children}</div>
    </div>
  )
}

function ReviewSection({
  personalData,
  contactData,
  addressData,
  guardianData,
  academicSummary,
  uploadedDocNames,
  studentId,
  isEditMode,
}: {
  personalData:     PersonalInfoData
  contactData:      ContactInfoData
  addressData:      AddressInfoData
  guardianData:     GuardianInfoData
  academicSummary:  AcademicSummary
  uploadedDocNames: string[]
  studentId:        string | null
  isEditMode:       boolean
}) {
  const primaryGuardian = guardianData.guardians.find(g => g.is_primary) ?? guardianData.guardians[0]

  return (
    <div className="space-y-5">

      {/* ── Ready banner ────────────────────────────────────────────────── */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">
                {isEditMode ? 'Ready to Update' : 'Ready to Submit'}
              </p>
              <p className="text-sm text-green-700 mt-1">
                Please review all information before {isEditMode ? 'updating' : 'submitting'}.
                You can go back to any section to make changes.
              </p>
              {/* {studentId && (
                <p className="text-xs font-mono text-green-600 mt-1">Student ID: {studentId}</p>
              )} */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Personal Info ────────────────────────────────────────────────── */}
      <ReviewBlock title="Personal Information">
        <ReviewRow label="Full Name"        value={personalData.full_name} />
        <ReviewRow label="Gender"           value={capitalize(personalData.gender)} />
        <ReviewRow label="Date of Birth"    value={personalData.date_of_birth} />
        <ReviewRow label="Blood Group"      value={personalData.blood_group} />
        <ReviewRow label="Nationality"      value={personalData.nationality} />
        <ReviewRow label="Religion"         value={personalData.religion} />
        <ReviewRow label="Caste / Category" value={[personalData.caste, personalData.category].filter(Boolean).join(' / ')} />
      </ReviewBlock>

      <Separator />

      {/* ── Contact Info ─────────────────────────────────────────────────── */}
      <ReviewBlock title="Contact Information">
        {(['student', 'father', 'mother', 'guardian'] as const).map((type) => {
          const c = contactData[type]
          if (!c?.mobile) return null
          return (
            <React.Fragment key={type}>
              <ReviewRow label={`${capitalize(type)} Mobile`}     value={c.mobile} />
              {c.email            && <ReviewRow label={`${capitalize(type)} Email`}     value={c.email} />}
              {c.alternate_mobile && <ReviewRow label={`${capitalize(type)} Alt. Mobile`} value={c.alternate_mobile} />}
            </React.Fragment>
          )
        })}
      </ReviewBlock>

      <Separator />

      {/* ── Address ──────────────────────────────────────────────────────── */}
      <ReviewBlock title="Address">
        <ReviewRow label="Current Address" value={addressData.current.address} />
        <ReviewRow label="City"            value={addressData.current.city} />
        <ReviewRow label="State"           value={addressData.current.state} />
        <ReviewRow label="Pincode"         value={addressData.current.pincode} mono />
        {!addressData.same_as_current && addressData.permanent && (
          <>
            <ReviewRow label="Permanent Address" value={addressData.permanent.address} />
            <ReviewRow label="Permanent City"    value={addressData.permanent.city} />
            <ReviewRow label="Permanent State"   value={addressData.permanent.state} />
            <ReviewRow label="Permanent Pincode" value={addressData.permanent.pincode} mono />
          </>
        )}
        {addressData.same_as_current && (
          <div className="px-4 py-2.5 text-sm text-muted-foreground italic">
            Permanent address same as current address
          </div>
        )}
      </ReviewBlock>

      <Separator />

      {/* ── Guardian Info ─────────────────────────────────────────────────── */}
      <ReviewBlock title="Guardian Information">
        {guardianData.guardians.length === 0
          ? <div className="px-4 py-2.5 text-sm text-muted-foreground italic">No guardians added</div>
          : guardianData.guardians.map((g, i) => (
            <React.Fragment key={g.localKey}>
              <ReviewRow label={`Guardian ${i + 1} Name`}     value={`${g.name}${g.is_primary ? ' (Primary)' : ''}`} />
              <ReviewRow label="Relation"                      value={capitalize(g.relation)} />
              <ReviewRow label="Mobile"                        value={g.mobile} />
{g.email         && <ReviewRow label="Email"         value={g.email} />}
              {g.occupation    && <ReviewRow label="Occupation"    value={g.occupation} />}
              {g.annual_income && <ReviewRow label="Annual Income" value={`₹${Number(g.annual_income).toLocaleString('en-IN')}`} />}
            </React.Fragment>
          ))
        }
      </ReviewBlock>

      <Separator />

      {/* ── Academic Info ─────────────────────────────────────────────────── */}
      <ReviewBlock title="Academic Details">
        <ReviewRow label="Class"         value={academicSummary.className} />
        {academicSummary.mappingType === 'school'
          ? <ReviewRow label="Section"   value={academicSummary.sectionName} />
          : <ReviewRow label="Batch"     value={academicSummary.batchName} />
        }
        <ReviewRow label="Roll Number"   value={academicSummary.rollNumber} />
        <ReviewRow label="Academic Year" value={academicSummary.academicYear} />
        <ReviewRow label="Joining Date"  value={academicSummary.joinedAt} />
      </ReviewBlock>

      {/* ── Previous Academic Details (only if filled) ──────────────────── */}
      {(academicSummary.prevSchoolName || academicSummary.prevAcademicYear || academicSummary.prevBoard || academicSummary.prevClassCompleted) && (
        <>
          <Separator />
          <ReviewBlock title="Previous Academic Details">
            <ReviewRow label="Previous Year"    value={academicSummary.prevAcademicYear} />
            <ReviewRow label="Class Completed"  value={academicSummary.prevClassCompleted} />
            <ReviewRow label="Previous School"  value={academicSummary.prevSchoolName} />
            <ReviewRow label="Previous Board"   value={academicSummary.prevBoard} />
            {academicSummary.prevRemarks && <ReviewRow label="Remarks" value={academicSummary.prevRemarks} />}
          </ReviewBlock>
        </>
      )}

      <Separator />

      {/* ── Documents ────────────────────────────────────────────────────── */}
      <ReviewBlock title="Documents Uploaded">
        {uploadedDocNames.length === 0
          ? <div className="px-4 py-2.5 text-sm text-muted-foreground italic">No documents uploaded yet</div>
          : uploadedDocNames.map((name) => (
            <div key={name} className="flex items-center gap-2 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm">{name}</span>
            </div>
          ))
        }
      </ReviewBlock>

    </div>
  )
}
