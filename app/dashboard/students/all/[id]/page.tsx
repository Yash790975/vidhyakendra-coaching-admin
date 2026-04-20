'use client'

import { useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, User, GraduationCap, DollarSign, ClipboardList, Edit, Printer, AlertCircle, BookOpen } from 'lucide-react'

import { useStudentCore }  from './_hooks/useStudentCore'
import { useAcademics }    from './_hooks/useAcademics'
import { useFees }         from './_hooks/useFees'
import { useAttendance }   from './_hooks/useAttendance'
import { useNotices }      from './_hooks/useNotices'

import { StudentProfileCard } from './_components/StudentProfileCard'
import { AcademicsTab }       from './_components/AcademicsTab'
import { FeesTab }            from './_components/FeesTab'
import { AttendanceTab }      from './_components/AttendanceTab'
import { OverviewTab }        from './_components/OverviewTab'
import { HomeworkTab } from './_components/HomeworkTab'
import { SkeletonCard }       from './_utils/helpers'

export default function StudentDetailPage() {
  const router    = useRouter()
  const params    = useParams()
  const studentId = params.id as string
  const printRef  = useRef<HTMLDivElement>(null)

    const {
    student, contacts, addresses, guardians, mapping,
    classInfo, batchInfo, identityDocs, academicDocs,
    loading: loadingStudent, error, classLabel,
  } = useStudentCore(studentId)

const {
  exams, enrichedExams, subjectsMap,
  academicYear, setAcademicYear, academicYears,
  classId: academicsClassId,
  batchId: academicsBatchId,
  yearClassMap,
  loading: loadingAcademics, error: academicsError, fetchAcademics
} = useAcademics(studentId)

  const {
    fees, feeReceipts, feeTermsMap,
    selectedYear, setSelectedYear,
    loading: loadingFees, fetchFees, refreshFees,
  } = useFees(studentId)

  const { attendance, loading: loadingAttendance, fetchAttendance } = useAttendance(studentId)
  const { notices,    loading: loadingNotices,    fetchNotices }    = useNotices(studentId)

  const handlePrint    = () => window.print()
  const handleDownload = () => window.print()

  if (loadingStudent) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
        <Card className="max-w-md w-full border-red-200 bg-red-50">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <p className="font-semibold text-red-900">{error ?? 'Student not found'}</p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background print:bg-white" ref={printRef}>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 print:p-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 print:hidden">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight truncate">Student Profile</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Complete academic and administrative overview</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push(`/dashboard/students/add?edit=${studentId}`)}>
              <Edit className="h-4 w-4" /><span className="hidden sm:inline">Edit Student</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /><span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <StudentProfileCard
          student={student} identityDocs={identityDocs}
          mapping={mapping} classLabel={classLabel} contacts={contacts}
        />

        {/* Main Tabs */}
        <Tabs
          defaultValue="overview"
          className="space-y-4"
          onValueChange={(val) => {
            if (val === 'academics')  fetchAcademics()
            if (val === 'fees')       { fetchFees(); fetchNotices() }
            if (val === 'attendance') fetchAttendance()
          }}
        >
         <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid print:hidden">
            <TabsTrigger value="academics"  className="gap-1 sm:gap-2"><GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">Academics</span></TabsTrigger>
            <TabsTrigger value="fees"       className="gap-1 sm:gap-2"><DollarSign className="h-4 w-4" /><span className="hidden sm:inline">Fees</span></TabsTrigger>
            <TabsTrigger value="homework" className="gap-1 sm:gap-2">
  <BookOpen className="h-4 w-4" />
  <span className="hidden sm:inline">Homework</span>
</TabsTrigger>

            <TabsTrigger value="attendance" className="gap-1 sm:gap-2"><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Attendance</span></TabsTrigger>
            <TabsTrigger value="overview"   className="gap-1 sm:gap-2"><User className="h-4 w-4" /><span className="hidden sm:inline">Overview</span></TabsTrigger>
          </TabsList>

          <TabsContent value="academics" className="space-y-4">
       <AcademicsTab
  enrichedExams={enrichedExams} exams={exams}
  academicYear={academicYear} setAcademicYear={setAcademicYear} academicYears={academicYears}
  loading={loadingAcademics} classLabel={classLabel} subjectsMap={subjectsMap}
  handlePrint={handlePrint} handleDownload={handleDownload}
  error={academicsError}
  onRetry={() => fetchAcademics(true)}
  studentId={studentId}
  classId={academicsClassId}
  batchId={academicsBatchId}
  yearClassMap={yearClassMap}
  onDataChanged={() => fetchAcademics(true)}
/>
          
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <FeesTab
              fees={fees} feeReceipts={feeReceipts} feeTermsMap={feeTermsMap}
              selectedYear={selectedYear} setSelectedYear={setSelectedYear}
              loadingFees={loadingFees} loadingNotices={loadingNotices}
              notices={notices} studentId={studentId} refreshFees={refreshFees}
            />
          </TabsContent>

          <TabsContent value="homework" className="space-y-4">
  <HomeworkTab
    studentId={studentId}
    classId={mapping?.class_id ?? null}
    batchId={mapping?.batch_id ?? null}
    adminId={typeof window !== 'undefined' ? localStorage.getItem('adminId') || '' : ''}
  />
</TabsContent>

          <TabsContent value="attendance" className="space-y-4">
       <AttendanceTab
              attendance={attendance} loading={loadingAttendance}
              mapping={mapping} classInfo={classInfo} batchInfo={batchInfo}
            />
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
  <OverviewTab
              student={student} contacts={contacts} addresses={addresses} guardians={guardians}
              mapping={mapping} classInfo={classInfo} batchInfo={batchInfo}
              classLabel={classLabel} identityDocs={identityDocs} academicDocs={academicDocs}
              adminId={typeof window !== 'undefined' ? localStorage.getItem('adminId') ?? undefined : undefined}
            />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
