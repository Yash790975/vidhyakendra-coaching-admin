'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  User,
  Phone,
  FileText,
  GraduationCap,
  Briefcase,
  CreditCard,
  CheckCircle2,
  Home,
  PartyPopper,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Section Components ───────────────────────────────────────────────────────
import PersonalInfoSection,      { type PersonalInfoFormData }      from './components/PersonalInfoSection'
import ContactInfoSection,       { type ContactInfoFormData }       from './components/Contactinfosection'
import AddressSection,           { type AddressFormData }           from './components/Addresssection'
import IdentityDocumentsSection, { type IdentityDocumentsFormData } from './components/IdentityDocumentsSection'
import QualificationSection,     { type QualificationFormData }     from './components/QualificationSection'
import ExperienceSection,        { type ExperienceFormData }        from './components/ExperienceSection'
import BankDetailsSection,       { type BankDetailsFormData }       from './components/BankDetailsSection'
import { teachersApi } from '@/lib/api/teachers'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionId =
  | 'personal'
  | 'contact'
  | 'address'
  | 'documents'
  | 'qualification'
  | 'experience'
  | 'bank'

const sections: {
  id: SectionId
  label: string
  icon: React.ElementType
  required: boolean
}[] = [
  { id: 'personal',      label: 'Personal Information', icon: User,          required: true  },
  { id: 'contact',       label: 'Contact Information',  icon: Phone,         required: true  },
  { id: 'address',       label: 'Address Details',      icon: Home,          required: true  },
  { id: 'documents',     label: 'Identity Documents',   icon: FileText,      required: true  },
  { id: 'qualification', label: 'Qualifications',       icon: GraduationCap, required: true  },
  { id: 'experience',    label: 'Experience',           icon: Briefcase,     required: false },
  { id: 'bank',          label: 'Bank Details',         icon: CreditCard,    required: true  },
]

// ─── Success Modal ────────────────────────────────────────────────────────────

function SuccessModal({ visible, isEditMode }: { visible: boolean; isEditMode?: boolean }) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={cn(
          'relative z-10 flex flex-col items-center gap-5 rounded-2xl bg-white px-10 py-10 shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-300'
        )}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#1897C6] to-[#67BAC3] shadow-lg">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Update Successful!' : 'Onboarding Complete!'}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isEditMode
              ? 'Teacher details have been updated successfully.'
              : 'Teacher has been successfully added.'}
          </p>
        </div>
        <PartyPopper className="h-6 w-6 text-[#F1AF37]" />
        <p className="text-xs text-muted-foreground">Redirecting to onboarding list…</p>
      </div>
    </div>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

// export default function AddTeacherPage() {
export default function AddTeacherClient() {
    
 const router = useRouter()
const searchParams = useSearchParams()
const editTeacherId = searchParams.get('edit') ?? ''
const isEditMode = !!editTeacherId
const [teacherFullName, setTeacherFullName] = useState<string>('')
const [currentStep, setCurrentStep]             = useState<number>(1)
const [completedSections, setCompletedSections] = useState<SectionId[]>([])
const [showSuccessModal, setShowSuccessModal]   = useState(false)
const [teacherId, setTeacherId]                 = useState<string>(editTeacherId)

  const [savedPersonalData,      setSavedPersonalData]      = useState<PersonalInfoFormData | null>(null)
  const [savedContactData,       setSavedContactData]       = useState<ContactInfoFormData | null>(null)
  const [savedAddressData,       setSavedAddressData]       = useState<AddressFormData | null>(null)
  const [savedDocumentsData,     setSavedDocumentsData]     = useState<IdentityDocumentsFormData | null>(null)
  const [savedQualificationData, setSavedQualificationData] = useState<QualificationFormData | null>(null)
  const [savedExperienceData,    setSavedExperienceData]    = useState<ExperienceFormData | null>(null)
  const [savedBankData,          setSavedBankData]          = useState<BankDetailsFormData | null>(null)

  // Suppress unused-variable warnings while keeping state setters available
  void savedContactData
  void savedAddressData
  void savedDocumentsData
  void savedQualificationData
  void savedExperienceData
  void savedBankData

  const totalSteps = sections.length
  const activeSection = sections[currentStep - 1]

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const markCompleted = (sectionId: SectionId) => {
    setCompletedSections(prev =>
      prev.includes(sectionId) ? prev : [...prev, sectionId]
    )
  }

  const getSectionStatus = (sectionId: SectionId, index: number) => {
    if (completedSections.includes(sectionId)) return 'completed'
    if (index + 1 === currentStep) return 'active'
    return 'pending'
  }

  const getProgressPercentage = () => {
    const totalRequired = sections.filter(s => s.required).length
    const completedRequired = completedSections.filter(id =>
      sections.find(s => s.id === id)?.required
    ).length
    return (completedRequired / totalRequired) * 100
  }

  // Navigate backwards without submitting
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1)
  }

  // ─── Section success callbacks ─────────────────────────────────────────────

  const handlePersonalInfoSuccess = (newTeacherId: string, formData: PersonalInfoFormData) => {
    setTeacherId(newTeacherId)
    setSavedPersonalData(formData)
      setTeacherFullName(formData.full_name ?? '')  // ← ADD
    markCompleted('personal')
    setCurrentStep(2)
  }

  const handleContactInfoSuccess = (formData: ContactInfoFormData) => {
    setSavedContactData(formData)
    markCompleted('contact')
    setCurrentStep(3)
  }

  const handleAddressSuccess = (formData: AddressFormData) => {
    setSavedAddressData(formData)
    markCompleted('address')
    setCurrentStep(4)
  }

  const handleDocumentsSuccess = (formData: IdentityDocumentsFormData) => {
    setSavedDocumentsData(formData)
    markCompleted('documents')
    setCurrentStep(5)
  }

  const handleQualificationSuccess = (formData: QualificationFormData) => {
    setSavedQualificationData(formData)
    markCompleted('qualification')
    setCurrentStep(6)
  }

  const handleExperienceSuccess = (formData: ExperienceFormData) => {
    setSavedExperienceData(formData)
    markCompleted('experience')
    setCurrentStep(7)
  }

const handleBankSuccess = (formData: BankDetailsFormData) => {
  setSavedBankData(formData)
  markCompleted('bank')
  setShowSuccessModal(true)
  setTimeout(() => {
    router.push('/dashboard/teachers/onboarding')
  }, 2200)
}

useEffect(() => {
  if (!isEditMode || !editTeacherId) return

  teachersApi.getById(editTeacherId).then(res => {
    if (res.success && res.result?.full_name) {
      setTeacherFullName(res.result.full_name)
      markCompleted('personal') 
    }
  }).catch(() => {})

  // Contact check
  teachersApi.getContactByTeacher(editTeacherId).then(res => {
    if (res.success && res.result) markCompleted('contact')
  }).catch(() => {})

  // Address check
  teachersApi.getAddressesByTeacher(editTeacherId).then(res => {
    if (res.success && Array.isArray(res.result) && res.result.length > 0) markCompleted('address')
  }).catch(() => {})

  // Documents check
  teachersApi.getIdentityDocumentsByTeacher(editTeacherId).then(res => {
    if (res.success && Array.isArray(res.result) && res.result.length > 0) markCompleted('documents')
  }).catch(() => {})

  // Qualifications check
  teachersApi.getQualificationsByTeacher(editTeacherId).then(res => {
    if (res.success && Array.isArray(res.result) && res.result.length > 0) markCompleted('qualification')
  }).catch(() => {})

  // Experience check
  teachersApi.getExperienceByTeacher(editTeacherId).then(res => {
    if (res.success && Array.isArray(res.result) && res.result.length > 0) markCompleted('experience')
  }).catch(() => {})

  // Bank check
  teachersApi.getBankDetailsByTeacher(editTeacherId).then(res => {
    if (res.success && Array.isArray(res.result) && res.result.length > 0) markCompleted('bank')
  }).catch(() => {})

}, [isEditMode, editTeacherId])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
     <SuccessModal visible={showSuccessModal} isEditMode={isEditMode} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

        {/* ── Top Navigation Bar ── */}
        <div className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard/teachers/onboarding">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                </Link>
                <Separator orientation="vertical" className="h-6" />
                <div>
                <h2 className="text-base font-semibold">
                  {isEditMode ? 'Edit Teacher' : 'Add New Teacher'}
                </h2>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {isEditMode ? 'Update information' : 'Complete all sections'}
                </p>
              </div>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-sm text-muted-foreground">Progress:</span>
                <div className="w-32">
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>
                <span className="text-sm font-semibold">{Math.round(getProgressPercentage())}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row">

            {/* ── Sidebar Navigation — Desktop ── */}
            <aside className="hidden lg:block lg:w-72 shrink-0">
              <Card className="sticky top-24 border-2 shadow-md">
                <CardHeader className="bg-gradient-to-br from-[#1897C6]/5 to-[#67BAC3]/5 pb-4">
                  <CardTitle className="text-base">Sections</CardTitle>
                  <CardDescription className="text-xs">
                    {completedSections.length} of {sections.filter(s => s.required).length} completed
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    {sections.map((section, index) => {
                      const status = getSectionStatus(section.id, index)
                      const Icon = section.icon
const isClickable = isEditMode
  ? completedSections.includes(section.id)  
  : index === 0 ||
    completedSections.includes(section.id) ||
    (!!teacherId && completedSections.includes(sections[index - 1]?.id)) 

                      return (
                        <button
                          key={section.id}
                          onClick={() => isClickable && setCurrentStep(index + 1)}
                          disabled={!isClickable}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-lg p-3 text-left transition-all',
                            status === 'active'    && 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white shadow-md',
                            status === 'pending'   && isClickable  && 'hover:bg-muted',
                            status === 'pending'   && !isClickable && 'cursor-not-allowed opacity-50',
                            status === 'completed' && 'bg-green-50 hover:bg-green-100'
                          )}
                        >
                          <div className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all',
                            status === 'active'    && 'bg-white/20',
                            status === 'pending'   && 'bg-muted',
                            status === 'completed' && 'bg-green-200'
                          )}>
                            {status === 'completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Icon className={cn(
                                'h-5 w-5',
                                status === 'active'  && 'text-white',
                                status === 'pending' && 'text-muted-foreground'
                              )} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                'truncate text-sm font-medium',
                                status === 'active'    && 'text-white',
                                status === 'pending'   && 'text-foreground',
                                status === 'completed' && 'text-green-700'
                              )}>
                                {section.label}
                              </p>
                              {section.required && status === 'pending' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              )}
                            </div>
                            <p className={cn(
                              'mt-0.5 text-xs',
                              status === 'active'    && 'text-white/80',
                              status === 'pending'   && 'text-muted-foreground',
                              status === 'completed' && 'text-green-600'
                            )}>
                              Step {index + 1}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* ── Main Content ── */}
            <main className="min-w-0 flex-1">
              <Card className="border-2 shadow-md">

                {/* Card Header */}
                <CardHeader className="border-b bg-gradient-to-r from-[#1897C6]/10 to-[#67BAC3]/10">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white shadow-lg">
                      {React.createElement(activeSection.icon, { className: 'h-6 w-6' })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl sm:text-2xl">
                        {activeSection.label}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {activeSection.required
                          ? 'All fields marked with * are required'
                          : 'Optional section — Fill if applicable'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {/* ── Form Content ── */}
                <CardContent className="p-6">

                  {currentStep === 1 && (
<PersonalInfoSection
  onSuccess={handlePersonalInfoSuccess}
  onPrevious={handlePrevious}
  showPrevious={currentStep > 1}
  isEditMode={isEditMode}
  teacherId={editTeacherId}
/>
                  )}

                  {currentStep === 2 && (
<ContactInfoSection
  teacherId={teacherId}
  onSuccess={handleContactInfoSuccess}
  onPrevious={handlePrevious}
  showPrevious={true}
  isEditMode={isEditMode}
/>
                  )}

                  {currentStep === 3 && (
                 <AddressSection
  teacherId={teacherId}
  onSuccess={handleAddressSuccess}
  onPrevious={handlePrevious}
  showPrevious={true}
  isEditMode={isEditMode}
/>
                  )}

                  {currentStep === 4 && (
                  <IdentityDocumentsSection
  teacherId={teacherId}
  teacherName={teacherFullName}
  onSuccess={handleDocumentsSuccess}
  onPrevious={handlePrevious}
  showPrevious={true}
  isEditMode={isEditMode}
/>
                  )}

                 {currentStep === 5 && (
  <QualificationSection
    teacherId={teacherId}
   teacherName={teacherFullName}
    onSuccess={handleQualificationSuccess}
    onPrevious={handlePrevious}
    showPrevious={true}
    isEditMode={isEditMode}
  />
)}

{currentStep === 6 && (
  <ExperienceSection
    teacherId={teacherId}
    onSuccess={handleExperienceSuccess}
    onPrevious={handlePrevious}
    showPrevious={true}
    isEditMode={isEditMode}
  />
)}

{currentStep === 7 && (
  <BankDetailsSection
    teacherId={teacherId}
    onSuccess={handleBankSuccess}
    onPrevious={handlePrevious}
    showPrevious={true}
    isEditMode={isEditMode}
  />
)}
                </CardContent>

            
             

              </Card>
            </main>

          </div>
        </div>
      </div>
    </>
  )
}





