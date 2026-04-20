'use client'

import React, { useState, useEffect, useCallback, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Download,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import type { TeacherAttendance } from '@/lib/api/teachers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short' })
}

function getMonthOptions(): { value: string; label: string }[] {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    })
  }
  return opts
}

function parseDateOnly(dateStr: string): string {
  return dateStr.split('T')[0]
}

function formatDisplayDate(dateStr: string): string {
  const d = parseDateOnly(dateStr)
  try {
   const [y, m, day] = d.split('-').map(Number)
return new Date(y, m - 1, day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

function getYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear()
  return [0, 1, 2, 3].map(i => {
    const y = currentYear - i
    return { value: `${y}-${y + 1}`, label: `${y}-${String(y + 1).slice(2)}` }
  })
}

function parseTimeToDisplay(val: string | null | undefined): string {
  if (!val) return '—'
  const iso = new Date(val)
  if (!isNaN(iso.getTime())) {
    return iso.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  // fallback: "5:32AM" / "10:30PM" format
  const match = String(val).match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
  if (match) {
    let h = parseInt(match[1])
    const m = match[2]
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}`
  }
  return '—'
}

function calcStats(records: TeacherAttendance[]) {
  const present  = records.filter(r => r.status === 'present').length
  const absent   = records.filter(r => r.status === 'absent').length
  const halfDay  = records.filter(r => r.status === 'half_day').length
  const leave    = records.filter(r => r.status === 'leave').length
  const total    = records.length
  const pct      = total > 0 ? parseFloat(((present + halfDay * 0.5) / total * 100).toFixed(1)) : 0
  return { present, absent, halfDay, leave, total, pct }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'present') return (
    <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 gap-1 font-medium">
      <CheckCircle className="h-3 w-3" />Present
    </Badge>
  )
  if (status === 'half_day') return (
    <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 gap-1 font-medium">
      <Clock className="h-3 w-3" />Half Day
    </Badge>
  )
  if (status === 'absent') return (
    <Badge variant="outline" className="border-rose-500 text-rose-700 bg-rose-50 gap-1 font-medium">
      <XCircle className="h-3 w-3" />Absent
    </Badge>
  )
  if (status === 'leave') return (
    <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50 gap-1 font-medium">
      <CalendarIcon className="h-3 w-3" />On Leave
    </Badge>
  )
  return <Badge variant="outline">{status}</Badge>
}

// ─── Stat Mini Card ───────────────────────────────────────────────────────────

function StatBox({
  icon, value, label, iconBg,
}: { icon: React.ReactNode; value: string | number; label: string; iconBg: string }) {
  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="border-t pt-4">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold text-[#1897C6]">{pct}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#1897C6] to-[#67BAC3] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
// ─── CSV Export ─────────────────────────────────────────────────────────────
function exportWeeklyToCSV(rows: TeacherAttendance[]) {
  const headers = ['Date', 'Day', 'Status', 'Check In', 'Check Out', 'Hours']
  const csvRows = [
    headers.join(','),
    ...rows.map(rec => {
      const dateOnly = parseDateOnly(rec.date)
      const checkIn = parseTimeToDisplay(rec.check_in_time)
      const checkOut = parseTimeToDisplay(rec.check_out_time)
  const hours = (() => {
  const inDisplay = parseTimeToDisplay(rec.check_in_time)
  const outDisplay = parseTimeToDisplay(rec.check_out_time)
  if (inDisplay === '—' || outDisplay === '—') return ''
  const [inH, inM] = inDisplay.split(':').map(Number)
  const [outH, outM] = outDisplay.split(':').map(Number)
  const diff = (outH * 60 + outM - (inH * 60 + inM)) / 60
  return diff > 0 ? `${diff.toFixed(1)}h` : ''
})()
      return [
        formatDisplayDate(rec.date),
        getDayName(dateOnly),
        rec.status,
        checkIn,
        checkOut,
        hours,
      ].join(',')
    }),
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `weekly-attendance.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function TeacherAttendanceTabPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: teacherId } = use(params)

  const [attendanceView, setAttendanceView] = useState<'weekly' | 'monthly' | 'yearly'>('weekly')
  const [selectedMonth,  setSelectedMonth]  = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedYear,   setSelectedYear]   = useState(() => {
    const y = new Date().getFullYear()
    return `${y}-${y + 1}`
  })

  const [allAttendance, setAllAttendance] = useState<TeacherAttendance[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  const fetchAttendance = useCallback(async () => {
    if (!teacherId) return
    setLoading(true)
    setError(null)
    try {
      const res = await teachersApi.getAttendanceByTeacher(teacherId)
 if (res.success && Array.isArray(res.result)) {
  setAllAttendance(res.result)
} else {
  setAllAttendance([])
  setError('Unable to load attendance records. Please try again.')
  console.error('[TeacherAttendancePage] getAttendanceByTeacher returned failure:', res.message)
}
    } catch (err: unknown) {
     setError('Unable to load attendance records. Please try again.')
console.error('[TeacherAttendancePage] fetchAttendance error:', err)
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => { fetchAttendance() }, [fetchAttendance])

  // ── Derived: Last 7 days (weekly) ─────────────────────────────────────────
  const weeklyRecords = (() => {
  const now = new Date()
  now.setDate(now.getDate() - 7)
  const cutoffStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return [...allAttendance]
    .filter(r => parseDateOnly(r.date) >= cutoffStr)
    .sort((a, b) => parseDateOnly(a.date).localeCompare(parseDateOnly(b.date)))
})()

  // ── Derived: Selected month ────────────────────────────────────────────────
 const monthlyRecords = allAttendance.filter(r => parseDateOnly(r.date).startsWith(selectedMonth))
  const monthlyStats   = calcStats(monthlyRecords)

  // ── Derived: Selected academic year ───────────────────────────────────────
  const yearlyRecords = (() => {
    const [startY] = selectedYear.split('-').map(Number)
 return allAttendance.filter(r => {
  const dateOnly = parseDateOnly(r.date)
const [yearNum, monthNum] = dateOnly.split('-').map(Number)
return (yearNum === startY && monthNum >= 4) || (yearNum === startY + 1 && monthNum <= 3)
    })
  })()
  const yearlyStats = calcStats(yearlyRecords)

  const monthOptions = getMonthOptions()
  const yearOptions  = getYearOptions()

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="border-2 animate-pulse">
          <CardContent className="p-4">
            <div className="h-8 bg-muted rounded w-64" />
          </CardContent>
        </Card>
        <Card className="border-2 animate-pulse">
          <CardContent className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchAttendance}
            className="h-7 gap-1 text-rose-600 hover:bg-rose-100">
            <RefreshCw className="h-3.5 w-3.5" />Retry
          </Button>
        </div>
      )}

      {/* ── View Toggle ─────────────────────────────────────────────────────── */}
      <Card className="border-2">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-semibold">Individual Attendance Overview</h3>
            <div className="flex gap-2">
              {(['weekly', 'monthly', 'yearly'] as const).map(view => (
                <Button
                  key={view}
                  variant={attendanceView === view ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceView(view)}
                  className={attendanceView === view ? 'bg-[#1897C6] hover:bg-[#1897C6]/90 text-white' : ''}
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── WEEKLY VIEW ─────────────────────────────────────────────────────── */}
      {attendanceView === 'weekly' && (
        <Card className="border-2">
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Weekly Attendance</CardTitle>
            <Button
  size="sm"
  variant="outline"
  onClick={() => exportWeeklyToCSV(weeklyRecords)}
  disabled={weeklyRecords.length === 0}
>
  <Download className="h-3.5 w-3.5 mr-1.5" />Export
</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {weeklyRecords.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No attendance records found for the last 7 days
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-xs sm:text-sm font-semibold">Date</th>
                      <th className="text-left p-3 text-xs sm:text-sm font-semibold">Day</th>
                      <th className="text-left p-3 text-xs sm:text-sm font-semibold">Status</th>
                      <th className="text-left p-3 text-xs sm:text-sm font-semibold">Check In</th>
                      <th className="text-left p-3 text-xs sm:text-sm font-semibold">Check Out</th>
                      <th className="text-left p-3 text-xs sm:text-sm font-semibold">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyRecords.map((rec, idx) => {
                      // Calculate hours if both check-in and check-out exist
const hours = (() => {
  const inDisplay = parseTimeToDisplay(rec.check_in_time)
  const outDisplay = parseTimeToDisplay(rec.check_out_time)
  if (inDisplay === '—' || outDisplay === '—') return null
  const [inH, inM] = inDisplay.split(':').map(Number)
  const [outH, outM] = outDisplay.split(':').map(Number)
  const diff = (outH * 60 + outM - (inH * 60 + inM)) / 60
  return diff > 0 ? diff.toFixed(1) : null
})()
                      return (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
<td className="p-3 text-xs sm:text-sm">{formatDisplayDate(rec.date)}</td>
<td className="p-3 text-xs sm:text-sm font-medium">{getDayName(parseDateOnly(rec.date))}</td>
                          <td className="p-3"><StatusBadge status={rec.status} /></td>
<td className="p-3 text-xs sm:text-sm">{parseTimeToDisplay(rec.check_in_time)}</td>
<td className="p-3 text-xs sm:text-sm">{parseTimeToDisplay(rec.check_out_time)}</td>
                          <td className="p-3 text-xs sm:text-sm font-semibold text-[#1897C6]">
                            {hours ? `${hours}h` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── MONTHLY VIEW ────────────────────────────────────────────────────── */}
      {attendanceView === 'monthly' && (
        <div className="space-y-4">
          <Card className="border-2">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base">Monthly Attendance Summary</CardTitle>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px] border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatBox
                  icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                  iconBg="bg-green-100"
                  value={monthlyStats.present}
                  label="Present Days"
                />
                <StatBox
                  icon={<XCircle className="h-6 w-6 text-red-600" />}
                  iconBg="bg-red-100"
                  value={monthlyStats.absent}
                  label="Absent Days"
                />
                <StatBox
                  icon={<Clock className="h-6 w-6 text-yellow-600" />}
                  iconBg="bg-yellow-100"
                  value={monthlyStats.halfDay}
                  label="Half Days"
                />
                <StatBox
                  icon={<TrendingUp className="h-6 w-6 text-[#1897C6]" />}
                  iconBg="bg-[#1897C6]/10"
                  value={`${monthlyStats.pct}%`}
                  label="Attendance Rate"
                />
              </div>

              {monthlyStats.total > 0 ? (
                <ProgressBar pct={monthlyStats.pct} label="Monthly Performance" />
              ) : (
                <div className="border-t pt-4 text-sm text-center text-muted-foreground">
                  No records for this month
                </div>
              )}

              {monthlyStats.total > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {monthlyStats.present} out of {monthlyStats.total} recorded days
                </p>
              )}
            </CardContent>
          </Card>

          {/* Monthly detail table */}
          {monthlyRecords.length > 0 && (
            <Card className="border-2">
              <CardHeader className="pb-3 bg-muted/30">
                <CardTitle className="text-base">Daily Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 text-xs sm:text-sm font-semibold">Date</th>
                        <th className="text-left p-3 text-xs sm:text-sm font-semibold">Day</th>
                        <th className="text-left p-3 text-xs sm:text-sm font-semibold">Status</th>
                        <th className="text-left p-3 text-xs sm:text-sm font-semibold">Check In</th>
                        <th className="text-left p-3 text-xs sm:text-sm font-semibold">Check Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...monthlyRecords]
                      .sort((a, b) => parseDateOnly(a.date).localeCompare(parseDateOnly(b.date)))
                        .map((rec, idx) => (
                          <tr key={idx} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
<td className="p-3 text-xs sm:text-sm">{formatDisplayDate(rec.date)}</td>
<td className="p-3 text-xs sm:text-sm font-medium">{getDayName(parseDateOnly(rec.date))}</td>
                            <td className="p-3"><StatusBadge status={rec.status} /></td>
<td className="p-3 text-xs sm:text-sm">{parseTimeToDisplay(rec.check_in_time)}</td>
<td className="p-3 text-xs sm:text-sm">{parseTimeToDisplay(rec.check_out_time)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── YEARLY VIEW ─────────────────────────────────────────────────────── */}
      {attendanceView === 'yearly' && (
        <div className="space-y-4">
          <Card className="border-2">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base">Yearly Attendance Summary</CardTitle>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[160px] border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatBox
                  icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                  iconBg="bg-green-100"
                  value={yearlyStats.present}
                  label="Present Days"
                />
                <StatBox
                  icon={<XCircle className="h-6 w-6 text-red-600" />}
                  iconBg="bg-red-100"
                  value={yearlyStats.absent}
                  label="Absent Days"
                />
                <StatBox
                  icon={<Clock className="h-6 w-6 text-yellow-600" />}
                  iconBg="bg-yellow-100"
                  value={yearlyStats.halfDay}
                  label="Half Days"
                />
                <StatBox
                  icon={<TrendingUp className="h-6 w-6 text-[#1897C6]" />}
                  iconBg="bg-[#1897C6]/10"
                  value={`${yearlyStats.pct}%`}
                  label="Attendance Rate"
                />
              </div>

              {yearlyStats.total > 0 ? (
                <ProgressBar pct={yearlyStats.pct} label="Annual Performance" />
              ) : (
                <div className="border-t pt-4 text-sm text-center text-muted-foreground">
                  No records for Academic Year {selectedYear}
                </div>
              )}

              {yearlyStats.total > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {yearlyStats.present} out of {yearlyStats.total} recorded days in Academic Year {selectedYear}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}