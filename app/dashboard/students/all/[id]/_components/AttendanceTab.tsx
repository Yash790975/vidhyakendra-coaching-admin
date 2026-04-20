'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle, CalendarDays, CheckCircle, ChevronDown, ChevronUp,
  ClipboardList, Loader2, TrendingUp, XCircle,
} from 'lucide-react'
import type { StudentAttendance, StudentAcademicMapping } from '@/lib/api/students'
import type { ClassMaster, CoachingBatch } from '@/lib/api/classes'
import { capitalize, formatDate, getAttendanceStatusIcon } from '../_utils/helpers'

interface AttendanceTabProps {
  attendance: StudentAttendance[]
  loading: boolean
  mapping: StudentAcademicMapping | null
  classInfo: ClassMaster | null
  batchInfo: CoachingBatch | null
}

export function AttendanceTab({ attendance, loading, mapping, classInfo, batchInfo }: AttendanceTabProps) {
  const [attendanceView, setAttendanceView] = useState<'weekly' | 'monthly' | 'yearly'>('yearly')
  const [expandedMonths, setExpandedMonths] = useState<string[]>([])

  // Derived
  const presentDays      = attendance.filter(a => a.status === 'present').length
  const absentDays       = attendance.filter(a => a.status === 'absent').length
  const leaveDays        = attendance.filter(a => a.status === 'leave').length
  const totalDays        = attendance.length
  const overallRate      = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
  const academicYearLabel = mapping?.academic_year ?? '—'

  const attendanceByWeek = attendance.reduce<Record<string, StudentAttendance[]>>((acc, a) => {
    const date = new Date(a.date)
    const startOfWeek = new Date(date); startOfWeek.setDate(date.getDate() - date.getDay())
    const endOfWeek   = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6)
    const weekKey = `${startOfWeek.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${endOfWeek.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
    if (!acc[weekKey]) acc[weekKey] = []
    acc[weekKey].push(a)
    return acc
  }, {})

  const weekKeys  = Object.keys(attendanceByWeek).sort((a, b) => new Date(attendanceByWeek[b][0].date).getTime() - new Date(attendanceByWeek[a][0].date).getTime())

  const attendanceByMonth = attendance.reduce<Record<string, StudentAttendance[]>>((acc, a) => {
    const month = new Date(a.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(a)
    return acc
  }, {})

  const monthKeys = Object.keys(attendanceByMonth).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const classLabel = classInfo
    ? `${classInfo.class_name}${batchInfo ? ` - ${batchInfo.batch_name}` : ''}`
    : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Attendance Records</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {academicYearLabel !== '—' && <Badge className="bg-[#1897C6]">{academicYearLabel}</Badge>}
            <span className="text-sm text-muted-foreground">Track attendance with detailed insights</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" />
          <span className="ml-2 text-sm text-muted-foreground">Loading attendance...</span>
        </div>
      ) : attendance.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No attendance records found for this student.</p></CardContent></Card>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="border-2 border-blue-200 sm:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Overall Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{overallRate}%</p>
                <Progress value={overallRate} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{presentDays} of {totalDays} days</p>
              </CardContent>
            </Card>
            {[
              { icon: CheckCircle, bg: 'bg-green-50 border-green-200', iconBg: 'bg-green-500', value: presentDays, label: 'Present', color: 'text-green-600' },
              { icon: XCircle,     bg: 'bg-red-50 border-red-200',     iconBg: 'bg-red-500',   value: absentDays,  label: 'Absent',  color: 'text-red-600' },
              { icon: AlertCircle, bg: 'bg-sky-50 border-sky-200',     iconBg: 'bg-sky-500',   value: leaveDays,   label: 'Leave',   color: 'text-sky-600' },
              { icon: CalendarDays,bg: 'bg-purple-50 border-purple-200', iconBg: 'bg-purple-500', value: totalDays, label: 'Total Days', color: 'text-purple-600' },
            ].map(({ icon: Icon, bg, iconBg, value, label, color }) => (
              <Card key={label} className={`border-2 ${bg}`}>
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 mx-auto rounded-full ${iconBg} flex items-center justify-center text-white mb-2`}><Icon className="h-5 w-5" /></div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            {(['weekly', 'monthly', 'yearly'] as const).map(view => (
              <Button key={view} variant={attendanceView === view ? 'default' : 'outline'} size="sm" onClick={() => setAttendanceView(view)}
                className={attendanceView === view ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3]' : ''}>
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Button>
            ))}
          </div>

          {/* YEARLY */}
          {attendanceView === 'yearly' && (
            <>
              <Card className="bg-gradient-to-br from-[#1897C6]/10 to-[#67BAC3]/10 border-2 border-[#1897C6]/20">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold flex flex-wrap items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-[#1897C6]" />
                        Academic Year {academicYearLabel}
                        <Badge className="bg-[#1897C6]">Current Year</Badge>
                      </h3>
                      {classInfo && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{classLabel} • {totalDays} School Days</p>}
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-4xl font-bold text-[#1897C6]">{overallRate}%</p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-center sm:justify-end"><TrendingUp className="h-4 w-4 text-green-600" /> Overall Rate</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { label: 'Total Days', value: totalDays,   bg: '',                                       color: '' },
                      { label: 'Present',    value: presentDays, bg: 'bg-green-50 border-2 border-green-200', color: 'text-green-600' },
                      { label: 'Absent',     value: absentDays,  bg: 'bg-red-50 border-2 border-red-200',     color: 'text-red-600' },
                      { label: 'Leave',      value: leaveDays,   bg: 'bg-sky-50 border-2 border-sky-200',     color: 'text-sky-600' },
                    ].map(item => (
                      <Card key={item.label} className={item.bg}><CardContent className="p-2 sm:p-3 text-center"><p className={`text-xl sm:text-2xl font-bold ${item.color}`}>{item.value}</p><p className="text-xs text-muted-foreground mt-1">{item.label}</p></CardContent></Card>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Attendance Progress</p><p className="text-sm font-bold">{presentDays}/{totalDays} days</p></div>
                    <Progress value={overallRate} className="h-3" />
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Card className={`border-2 ${overallRate >= 75 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${overallRate >= 75 ? 'bg-green-600' : 'bg-red-600'}`}><CheckCircle className="h-5 w-5 text-white" /></div>
                      <div>
                        <p className={`font-semibold text-sm sm:text-base ${overallRate >= 75 ? 'text-green-900' : 'text-red-900'}`}>Attendance Rate</p>
                        <p className={`text-xs sm:text-sm mt-1 ${overallRate >= 75 ? 'text-green-700' : 'text-red-700'}`}>
                          {overallRate >= 90 ? 'Excellent attendance record! Keep it up.' : overallRate >= 75 ? 'Good attendance. Aim for 90%+ for best results.' : 'Attendance below 75%. Immediate improvement needed.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0"><TrendingUp className="h-5 w-5 text-white" /></div>
                      <div>
                        <p className="font-semibold text-blue-900 text-sm sm:text-base">Improvement Areas</p>
                        <p className="text-xs sm:text-sm text-blue-700 mt-1">
                          {absentDays === 0 ? 'Perfect record — no absences!' : absentDays <= 3 ? `Only ${absentDays} absence${absentDays > 1 ? 's' : ''}. Maintain this pattern.` : `${absentDays} absences recorded. Try to reduce unplanned absences.`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* WEEKLY */}
          {attendanceView === 'weekly' && (
            <div className="space-y-3">
              {weekKeys.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No weekly data available.</CardContent></Card>
              ) : weekKeys.map(week => {
                const records  = attendanceByWeek[week]
                const wPresent = records.filter(r => r.status === 'present').length
                const wAbsent  = records.filter(r => r.status === 'absent').length
                const wLeave   = records.filter(r => r.status === 'leave').length
                const wTotal   = records.length
                const wRate    = wTotal > 0 ? Math.round((wPresent / wTotal) * 100) : 0
                const isExp    = expandedMonths.includes(week)
                return (
                  <Card key={week} className="border-2">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div><p className="font-bold text-base sm:text-lg">{week}</p><p className="text-xs text-muted-foreground">{wTotal} school day{wTotal !== 1 ? 's' : ''}</p></div>
                        <p className="text-2xl sm:text-3xl font-bold text-[#1897C6]">{wRate}%</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {[['green', wPresent, 'Present'], ['red', wAbsent, 'Absent'], ['sky', wLeave, 'Leave']].map(([c, v, l]) => (
                          <div key={l as string} className={`text-center p-2 bg-${c}-50 rounded-lg border border-${c}-200`}><p className={`text-lg font-bold text-${c}-600`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <Button variant="ghost" size="sm" className="w-full gap-2 text-[#1897C6]"
                          onClick={() => setExpandedMonths(prev => isExp ? prev.filter(w => w !== week) : [...prev, week])}>
                          {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {isExp ? 'Hide Daily Records' : 'View Daily Records'}
                        </Button>
                      </div>
                      {isExp && (
                        <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(rec => (
                            <div key={rec._id ?? rec.date} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-2">{getAttendanceStatusIcon(rec.status)}<span className="text-sm font-medium">{formatDate(rec.date)}</span></div>
                              <Badge className={rec.status === 'present' ? 'bg-green-600' : rec.status === 'absent' ? 'bg-red-600' : 'bg-sky-600'}>{capitalize(rec.status)}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* MONTHLY */}
          {attendanceView === 'monthly' && (
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-[#1897C6]" />
                    <CardTitle className="text-base sm:text-lg">Monthly Attendance Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {monthKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">No monthly data available.</p>
                  ) : monthKeys.map(month => {
                    const records  = attendanceByMonth[month]
                    const mPresent = records.filter(r => r.status === 'present').length
                    const mAbsent  = records.filter(r => r.status === 'absent').length
                    const mLeave   = records.filter(r => r.status === 'leave').length
                    const mTotal   = records.length
                    const mRate    = mTotal > 0 ? Math.round((mPresent / mTotal) * 100) : 0
                    const isExp    = expandedMonths.includes(month)
                    return (
                      <Card key={month} className="border-2">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-bold text-base sm:text-lg">{month}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">{classLabel}</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-2xl sm:text-3xl font-bold text-[#1897C6]">{mRate}%</p>
                              <p className="text-xs text-muted-foreground">{mPresent}/{mTotal} days</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
                            {[['green', mPresent, 'Present'], ['red', mAbsent, 'Absent'], ['sky', mLeave, 'Leave']].map(([c, v, l]) => (
                              <div key={l as string} className={`text-center p-2 bg-${c}-50 rounded-lg border border-${c}-200`}><p className={`text-lg sm:text-xl font-bold text-${c}-600`}>{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <Button variant="ghost" size="sm" className="w-full gap-2 text-[#1897C6]"
                              onClick={() => setExpandedMonths(prev => isExp ? prev.filter(m => m !== month) : [...prev, month])}>
                              {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {isExp ? 'Hide Daily Records' : 'View Daily Records'}
                            </Button>
                          </div>
                          {isExp && (
                            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-2">
                              {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(rec => (
                                <div key={rec._id ?? rec.date} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2">{getAttendanceStatusIcon(rec.status)}<span className="text-sm font-medium">{formatDate(rec.date)}</span></div>
                                  <Badge className={rec.status === 'present' ? 'bg-green-600' : rec.status === 'absent' ? 'bg-red-600' : 'bg-sky-600'}>{capitalize(rec.status)}</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}