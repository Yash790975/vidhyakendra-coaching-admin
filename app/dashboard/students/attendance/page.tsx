    'use client'

    import { useEffect, useState, useCallback } from 'react'
    import { studentsApi, StudentAttendance, StudentAcademicMapping } from '@/lib/api/students'
    import { teachersApi } from '@/lib/api/teachers'
    import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'  
    import { ENDPOINTS } from '@/lib/api/config'
    import { apiClient } from '@/lib/api/client'
    import { Button } from '@/components/ui/button'
    import { Download } from 'lucide-react'

    // ─── Types ────────────────────────────────────────────────────────────────────

    interface StudentRow {
    student_id: string
    student_code: string
    full_name: string
    gender: string
    status: 'present' | 'absent' | 'leave' | null
    existingAttendanceId?: string
    }

    type AttendanceStatus = 'present' | 'absent' | 'leave'

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    const todayStr = formatDate(new Date())

    const statusColors: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    absent: 'bg-red-100 text-red-700 border-red-300',
    leave: 'bg-amber-100 text-amber-700 border-amber-300',
    }

    const statusBtnActive: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-500 text-white border-emerald-500 shadow-sm',
    absent: 'bg-red-500 text-white border-red-500 shadow-sm',
    leave: 'bg-amber-400 text-white border-amber-400 shadow-sm',
    }

    const statusBtnIdle =
    'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'

    // ─── Component ────────────────────────────────────────────────────────────────

    export default function StudentAttendancePage() {
 
   const [instituteId, setInstituteId] = useState('')
  const instituteType = 'coaching' as const

    // ── filter state ──
    const [classes, setClasses] = useState<ClassMaster[]>([])
    const [batches, setBatches] = useState<CoachingBatch[]>([])
    const [teachers, setTeachers] = useState<any[]>([])

    const [selectedClassId, setSelectedClassId] = useState('')
    const [selectedBatchId, setSelectedBatchId] = useState('')
    const [selectedDate, setSelectedDate] = useState(todayStr)
    const [selectedTeacherId, setSelectedTeacherId] = useState('')

    // ── student attendance rows ──
    const [students, setStudents] = useState<StudentRow[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [loadingClasses, setLoadingClasses] = useState(false)
    const [saving, setSaving] = useState(false)

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    const [existingLoaded, setExistingLoaded] = useState(false)
    //pagination

    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(7)
    const [itemsInput, setItemsInput] = useState('7')

    // ── Init from localStorage ──
    useEffect(() => {
        if (typeof window === 'undefined') return
        const id = localStorage.getItem('instituteId') || ''
        setInstituteId(id)
    }, [])

    // ── Toast auto-dismiss ──
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(t)
    }, [toast])

    // ── Fetch classes ──
    useEffect(() => {
        if (!instituteId) return
        setLoadingClasses(true)
        classesApi
        .getAll({ instituteId, status: 'active' })
        .then((res) => {
            if (res.success && res.result) setClasses(res.result)
        })
        .catch((err) => console.error('[Attendance] fetch classes error:', err))
        .finally(() => setLoadingClasses(false))
    }, [instituteId])

// ── Fetch teacher auth list (for marked_by) ──
useEffect(() => {
    if (!instituteId) return
    teachersApi
      .getAllAuth()
      .then((res) => {
        console.log('[Attendance] teacher auth response:', res)
        if (res.success && Array.isArray(res.result)) {
          // Filter by instituteId — teacher_id object mein institute_id hota hai
          const filtered = (res.result as any[]).filter((t) => {
            const instId =
              t.teacher_id?.institute_id?._id ||
              t.teacher_id?.institute_id ||
              null
            if (!instId) return true
            return String(instId) === String(instituteId)
          })
          setTeachers(filtered)
        }
      })
      .catch((err) => console.error('[Attendance] fetch teachers error:', err))
}, [instituteId])

    // ── On class change: fetch sections + batches ──
    useEffect(() => {
         if (!selectedClassId) {
        setBatches([])
        setSelectedBatchId('')
        return
        }
        classesApi.getBatchesByClass(selectedClassId)
          .then((res) => {
            if (res.success && res.result) setBatches(res.result)
          })
          .catch((err) => console.error('[Attendance] fetch batches error:', err))
    }, [selectedClassId, instituteType])

    // ── Fetch students when class/section/batch selected ──
    const fetchStudents = useCallback(async () => {
        if (!selectedClassId) return
        if (instituteType === 'coaching' && !selectedBatchId) return

        setLoadingStudents(true)
        setExistingLoaded(false)
        setStudents([])

        try {
        // Get students mapped to this class (and optionally section/batch)
         // Coaching portal — always fetch by batch
        const batchRes = await studentsApi.getStudentsByBatch(selectedBatchId)
        let mappings: StudentAcademicMapping[] = []
        if (batchRes.success && batchRes.result) {
          mappings = Array.isArray(batchRes.result) ? batchRes.result : [batchRes.result]
        }

        // For each mapping, get student details
        const rows: StudentRow[] = []
        for (const mapping of mappings) {
       const studentId =
  typeof mapping.student_id === 'string'
    ? mapping.student_id
    : (mapping.student_id as any)?._id
if (!studentId) {
  console.warn('[Attendance] Skipping mapping with no student_id:', mapping)
  continue
}
// Duplicate check 
if (rows.some(r => r.student_id === studentId)) continue

            const sRes = await studentsApi.getById(studentId)
            if (sRes.success && sRes.result) {
            rows.push({
                student_id: studentId,
                student_code: sRes.result.student_code,
                full_name: sRes.result.full_name,
                gender: sRes.result.gender,
                status: null,
            })
            }
        }

        console.log('[Attendance] student rows built:', rows.length)
        setStudents(rows)
        setCurrentPage(1)

        // Now fetch existing attendance for this date and class
        await loadExistingAttendance(rows)
        } catch (err: any) {
        console.error('[Attendance] fetchStudents error:', err)
        setToast({ msg: 'Failed to load students', type: 'error' })
        } finally {
        setLoadingStudents(false)
        }
    }, [selectedClassId, selectedBatchId, selectedDate, instituteType])

    const loadExistingAttendance = async (rows: StudentRow[]) => {
        try {
        const res  = await studentsApi.getAttendanceByDate(selectedDate)
        console.log('[Attendance] existing attendance for date:', res)
        if (res.success && res.result) {
            const map = new Map<string, { status: AttendanceStatus; id: string | undefined }>()
            for (const record of res.result) {
            const sid =
                typeof record.student_id === 'string'
                ? record.student_id
                : (record.student_id as any)?._id
            if (sid) map.set(sid, { status: record.status, id: record._id })
            }

            setStudents((prev) =>
            prev.map((s) => {
                const existing = map.get(s.student_id)
                if (existing) {
                return { ...s, status: existing.status, existingAttendanceId: existing.id }
                }
                return s
            })
            )
        }
        setExistingLoaded(true)
        } catch (err) {
        console.error('[Attendance] loadExistingAttendance error:', err)
        setExistingLoaded(true)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [fetchStudents])

    // ── Mark individual student ──
    const markStudent = (studentId: string, status: AttendanceStatus) => {
        setStudents((prev) =>
        prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
        )
    }

    // ── Mark all ──
    const markAll = (status: AttendanceStatus) => {
        setStudents((prev) => prev.map((s) => ({ ...s, status })))
    }

    // ── Save attendance (bulk) ──
    const handleSave = async () => {
        if (!selectedTeacherId) {
        setToast({ msg: 'Please select the teacher (Marked By) before saving', type: 'error' })
        return
        }
        const unmarked = students.filter((s) => s.status === null)
        if (unmarked.length > 0) {
        setToast({ msg: `${unmarked.length} student(s) have no attendance marked`, type: 'error' })
        return
        }

        setSaving(true)
        try {
        // Separate: new vs update
        const toCreate = students.filter((s) => !s.existingAttendanceId && s.status)
        const toUpdate = students.filter((s) => s.existingAttendanceId && s.status)

        console.log('[Attendance] toCreate:', toCreate.length, 'toUpdate:', toUpdate.length)

        // Bulk create
        if (toCreate.length > 0) {
            const payload = {
            attendances: toCreate.map((s) => ({
                student_id: s.student_id,
                class_id: selectedClassId,
                section_id: null,
                batch_id: selectedBatchId || null,
                date: selectedDate,
                status: s.status!,
                marked_by: selectedTeacherId,
            })),            }
            const res = await studentsApi.createBulkAttendance(payload)
            console.log('[Attendance] bulk create response:', res)
            if (!res.success) {
            setToast({ msg: res.message || 'Bulk attendance save failed', type: 'error' })
            return
            }
        }

        // Individual updates
        for (const s of toUpdate) {
            const res = await studentsApi.updateAttendance(s.existingAttendanceId!, {
            status: s.status!,
            marked_by: selectedTeacherId,
            })
            console.log('[Attendance] update response for', s.student_id, res)
        }

        setToast({ msg: 'Attendance saved successfully', type: 'success' })
        // Reload to get fresh IDs
        await loadExistingAttendance(students)
        } catch (err: any) {
        console.error('[Attendance] handleSave error:', err)
        setToast({ msg: err.message || 'Failed to save attendance', type: 'error' })
        } finally {
        setSaving(false)
        }
    }

    // ── CSV Export ──
    const handleExport = () => {
        if (students.length === 0) return

          const selectedClass = classes.find((c) => c._id === selectedClassId)
        const selectedBatch = batches.find((b) => b._id === selectedBatchId)

        const headers = ['Student Code', 'Full Name', 'Gender', 'Date', 'Status', 'Class', 'Batch']
        const rows = students.map((s) => [
          s.student_code,
          s.full_name,
          s.gender,
          selectedDate,
          s.status || 'not marked',
          selectedClass?.class_name ?? '',
          selectedBatch?.batch_name ?? '',
        ])
        const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `attendance_${selectedDate}_${selectedClass?.class_name || 'class'}.csv`
        a.click()
        URL.revokeObjectURL(url)
        console.log('[Attendance] CSV exported')
    }

    // ── Stats ──
    const presentCount = students.filter((s) => s.status === 'present').length
    const absentCount = students.filter((s) => s.status === 'absent').length
    const leaveCount = students.filter((s) => s.status === 'leave').length
    const unmarkedCount = students.filter((s) => s.status === null).length
    const totalCount = students.length
    const attendancePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

    const canFetch = !!selectedClassId && !!selectedBatchId

        const totalPages = Math.max(1, Math.ceil(students.length / itemsPerPage))
    const paginatedStudents = students.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
    )

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
        {/* ── Toast ── */}
        {toast && (
            <div
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
                toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
            >
            {toast.msg}
            </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Student Attendance
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                {instituteType === 'coaching' ? 'Coaching' : 'School'} — Mark bulk attendance class-wise
                </p>
            </div>
            <div className="flex items-center gap-2">
                {students.length > 0 && (
    <Button
    className="bg-[#1897C6] hover:bg-[#1897C6]/90 w-full sm:w-auto"
    onClick={handleExport}
    disabled={students.length === 0}
    >
    <Download className="h-4 w-4 mr-2" />
    Export Report
    </Button>
                )}
            </div>
            </div>

            {/* ── Filters Card ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Filters &amp; Selection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Date */}
                <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Date *</label>
                <input
                    type="date"
                    value={selectedDate}
                    max={todayStr}
                    onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setExistingLoaded(false)
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1897C6] focus:border-transparent"
                />
                </div>

                {/* Class */}
                <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Class *</label>
                <select
                    value={selectedClassId}
                    onChange={(e) => {
                    setSelectedClassId(e.target.value)
                    setSelectedBatchId('')
                    setStudents([])
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1897C6]"
                >
                    <option value="">
                    {loadingClasses ? 'Loading...' : 'Select Class'}
                    </option>
                    {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                        {c.class_name}
                    </option>
                    ))}
                </select>
                </div>

                {/* Batch — only for coaching */}
                {instituteType === 'coaching' && (
                <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-500">Batch *</label>
                    <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    disabled={!selectedClassId || batches.length === 0}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1897C6] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <option value="">Select Batch</option>
                    {batches.map((b) => (
                        <option key={b._id} value={b._id!}>
                        {b.batch_name}
                        </option>
                    ))}
                    </select>
                </div>
                )}

                {/* Teacher (marked_by) */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-gray-500">Marked By (Teacher) *</label>
                <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1897C6]"
                >
                    <option value="">Select Teacher</option>
                {teachers.map((t) => {
                const name = t.teacher_id?.full_name ?? t.email ?? 'Teacher'
                return (
                  <option key={t._id} value={t._id}>
                    {name}
                  </option>
                )
              })}
                </select>
                </div>

                {/* Load Button */}
                <div className="flex items-end">
                <button
                    onClick={fetchStudents}
                    disabled={!canFetch || loadingStudents}
                    className="w-full h-10 px-4 rounded-lg bg-[#1897C6] text-white text-sm font-medium hover:bg-[#1897C6]/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loadingStudents ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Loading...
                    </>
                    ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Load Students
                    </>
                    )}
                </button>
                </div>
            </div>
            </div>

            {/* ── Stats Bar ── */}
            {students.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                { label: 'Present', count: presentCount, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                { label: 'Absent', count: absentCount, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                { label: 'Leave', count: leaveCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                { label: 'Not Marked', count: unmarkedCount, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
                ].map((stat) => (
                <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
                    <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.count}</p>
                    <p className="text-xs text-gray-400 mt-0.5">of {totalCount}</p>
                </div>
                ))}
            </div>
            )}

            {/* ── Attendance Table ── */}
            {students.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Table header + bulk actions */}
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                    Students ({totalCount})
                    </h2>
                    {existingLoaded && (
                    <p className="text-xs text-gray-400 mt-0.5">
                        {students.filter((s) => s.existingAttendanceId).length > 0
                        ? `${students.filter((s) => s.existingAttendanceId).length} existing records loaded`
                        : 'No existing attendance for this date'}
                    </p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 mr-1">Mark All:</span>
                    {(['present', 'absent', 'leave'] as AttendanceStatus[]).map((s) => (
                    <button
                        key={s}
                        onClick={() => markAll(s)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all hover:scale-105 active:scale-95 ${statusColors[s]}`}
                    >
                        All {s}
                    </button>
                    ))}
                </div>
                </div>

                {/* Progress bar */}
                <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${attendancePct}%` }}
                    />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 w-10 text-right">
                    {attendancePct}%
                    </span>
                </div>
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</th>
                        <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
    {paginatedStudents.map((student, idx) => (
    <tr
        key={student.student_id}
                        className="hover:bg-gray-50/60 transition-colors"
                        >
                        <td className="px-5 py-3 text-xs text-gray-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1897C6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {student.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800 text-sm">
                                {student.full_name}
                            </span>
                            </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                            {student.student_code}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 capitalize">
                            {student.gender}
                        </td>
                        <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                            {(['present', 'absent', 'leave'] as AttendanceStatus[]).map((s) => (
                                <button
                                key={s}
                                onClick={() => markStudent(student.student_id, s)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all hover:scale-105 active:scale-95 ${
                                    student.status === s ? statusBtnActive[s] : statusBtnIdle
                                }`}
                                >
                                {s === 'present' ? 'P' : s === 'absent' ? 'A' : 'L'}
                                </button>
                            ))}
                            {student.status === null && (
                                <span className="ml-2 text-xs text-gray-300 italic">not marked</span>
                            )}
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden divide-y divide-gray-100">
                {paginatedStudents.map((student, idx) => (
    <div key={student.student_id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-[#1897C6] flex items-center justify-center text-white text-xs font-bold">
                            {student.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-800">{student.full_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{student.student_code}</p>
                        </div>
                        </div>
                        {student.status && (
                        <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold capitalize ${statusColors[student.status]}`}>
                            {student.status}
                        </span>
                        )}
                    </div>
                    <div className="flex gap-2 pl-10">
                        {(['present', 'absent', 'leave'] as AttendanceStatus[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => markStudent(student.student_id, s)}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all ${
                            student.status === s ? statusBtnActive[s] : statusBtnIdle
                            }`}
                        >
                            {s}
                        </button>
                        ))}
                    </div>
                    </div>
                ))}
                </div>

                {/* Save footer */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                    {unmarkedCount > 0
                    ? `⚠️ ${unmarkedCount} student(s) attendance not yet marked`
                    : '✓ All students attendance marked'}
                </p>
                <button
                    onClick={handleSave}
                    disabled={saving || students.length === 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1897C6] text-white text-sm font-semibold hover:bg-[#1897C6]/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                    {saving ? (
                    <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Saving...
                    </>
                    ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Attendance
                    </>
                    )}
                </button>
                </div>
                {/* Pagination */}
    {students.length > itemsPerPage && (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Rows:</span>
        <input
            type="number"
            min={1}
            value={itemsInput}
            onChange={e => {
            setItemsInput(e.target.value)
            const n = parseInt(e.target.value)
            if (n > 0) { setItemsPerPage(n); setCurrentPage(1) }
            }}
            className="w-16 h-8 text-xs text-center border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1897C6]"
        />
        <span className="text-xs text-gray-500">
            {students.length === 0
            ? '0'
            : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, students.length)}`
            } of {students.length}
        </span>
        </div>
        <div className="flex items-center gap-1">
        <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
        >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
        </button>
        <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50"
        >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
        </button>
        <button className="h-8 w-8 rounded-lg bg-[#1897C6] text-white text-xs font-semibold pointer-events-none">
            {currentPage}
        </button>
        <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50"
        >
            Next
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
        <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
        >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
            </svg>
        </button>
        </div>
    </div>
    )}
            </div>
            )}

            {/* ── Empty state ── */}
            {!loadingStudents && students.length === 0 && selectedClassId && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                </div>
            <p className="text-sm font-medium text-gray-500">No students found</p>
      <p className="text-xs text-gray-400 mt-1">
      No students are mapped to this class / batch
    </p>
            </div>
            )}

            {/* ── Initial empty state ── */}
            {!selectedClassId && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                </div>
    <p className="text-sm font-medium text-gray-600">To mark attendance</p>
    <p className="text-xs text-gray-400 mt-1">Select a class and date, then click Load Students</p>
            </div>
            )}
        </div>
        </div>
    )
    }