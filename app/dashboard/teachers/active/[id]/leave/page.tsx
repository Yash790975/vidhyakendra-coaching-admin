'use client'

import React, { useState, useEffect, useCallback, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  FileText,
  CalendarDays,
  Loader2,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import type { TeacherLeave } from '@/lib/api/teachers'

// ─── Types ─────────────────────────────────────────────────────────────────────

type LeaveStatus = 'pending' | 'approved' | 'rejected'
type LeaveAction = 'approve' | 'reject'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function calcDays(from: string, to: string): number {
  try {
    const diff = new Date(to).getTime() - new Date(from).getTime()
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1)
  } catch {
    return 1
  }
}

function getLeaveTypeConfig(type: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    casual:            { label: 'Casual',            className: 'bg-blue-50 text-blue-700 border-blue-200' },
    sick:              { label: 'Sick',              className: 'bg-orange-50 text-orange-700 border-orange-200' },
    paid:              { label: 'Paid',              className: 'bg-green-50 text-green-700 border-green-200' },
    unpaid:            { label: 'Unpaid',            className: 'bg-gray-50 text-gray-700 border-gray-200' },
    earned:            { label: 'Earned',            className: 'bg-teal-50 text-teal-700 border-teal-200' },
    maternity:         { label: 'Maternity',         className: 'bg-pink-50 text-pink-700 border-pink-200' },
    paternity:         { label: 'Paternity',         className: 'bg-purple-50 text-purple-700 border-purple-200' },
    bereavement:       { label: 'Bereavement',       className: 'bg-slate-50 text-slate-700 border-slate-200' },
    marriage:          { label: 'Marriage',          className: 'bg-rose-50 text-rose-700 border-rose-200' },
    study:             { label: 'Study',             className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    work_from_home:    { label: 'Work From Home',    className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    half_day:          { label: 'Half Day',          className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    optional_holiday:  { label: 'Optional Holiday',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
    restricted_holiday:{ label: 'Restricted Holiday',className: 'bg-lime-50 text-lime-700 border-lime-200' },
  }
  return map[type] ?? { label: type, className: 'bg-gray-50 text-gray-700 border-gray-200' }
}

function getStatusConfig(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  }
  return map[status] ?? map.pending
}

// ─── Error Banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRetry}
          className="h-7 gap-1 text-rose-600 hover:bg-rose-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  )
}

// ─── Leave Card ────────────────────────────────────────────────────────────────

interface LeaveCardProps {
  leave: TeacherLeave
  onAction: (leave: TeacherLeave, action: LeaveAction) => void
  actionLoading: string | null // leave _id currently being processed
}

function LeaveCard({ leave, onAction, actionLoading }: LeaveCardProps) {
  const typeConfig   = getLeaveTypeConfig(leave.leave_type)
  const statusConfig = getStatusConfig(leave.status ?? 'pending')
  const days         = calcDays(leave.from_date, leave.to_date)
  const isPending    = leave.status === 'pending'
  const isApproved   = leave.status === 'approved'
  const isRejected   = leave.status === 'rejected'
  const isProcessing = actionLoading === leave._id

  return (
    <Card className="border-2 hover:border-[#1897C6]/30 transition-all">
      <CardContent className="p-4 space-y-3">

        {/* Header row — type badge + status badge + days count */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${typeConfig.className} border text-xs`}>
              {typeConfig.label} Leave
            </Badge>
            <Badge className={`${statusConfig.className} border text-xs`}>
              {statusConfig.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {days} {days === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">
            {formatDate(leave.from_date)}
            {leave.from_date !== leave.to_date && ` — ${formatDate(leave.to_date)}`}
          </span>
        </div>

        {/* Reason */}
        {leave.reason && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</p>
            <p className="text-xs sm:text-sm">{leave.reason}</p>
          </div>
        )}

        {/* Approved footer */}
        {isApproved && (leave.approved_by || leave.approved_at) && (
          <div className="pt-2 border-t border-emerald-200 bg-emerald-50/50 -mx-4 -mb-4 p-4 rounded-b-lg space-y-1">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-700">
                  Approved{leave.approved_at ? ` on ${formatDate(leave.approved_at)}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rejected footer */}
        {isRejected && (leave.rejection_reason || leave.approved_at) && (
          <div className="pt-2 border-t border-rose-200 bg-rose-50/50 -mx-4 -mb-4 p-4 rounded-b-lg space-y-1">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-rose-700">
                  Rejected{leave.approved_at ? ` on ${formatDate(leave.approved_at)}` : ''}
                </p>
                {leave.rejection_reason && (
                  <p className="text-xs text-rose-600 mt-0.5">
                    <span className="font-semibold">Reason:</span> {leave.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending actions */}
        {isPending && (
          <div className="pt-3 border-t flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              disabled={isProcessing}
              onClick={() => onAction(leave, 'approve')}
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 h-9"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span className="text-xs sm:text-sm">Approve</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isProcessing}
              onClick={() => onAction(leave, 'reject')}
              className="flex-1 gap-2 border-rose-400 text-rose-600 hover:bg-rose-100 hover:border-rose-500 hover:text-rose-700 h-9"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="text-xs sm:text-sm">Reject</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function LeaveSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border-2 p-4 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TeacherLeavePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: teacherId } = use(params)

  // ── State ────────────────────────────────────────────────────────────────────
  const [leaves,         setLeaves]         = useState<TeacherLeave[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [actionLoading,  setActionLoading]  = useState<string | null>(null) // leave _id being processed
  const [actionError,    setActionError]    = useState<string | null>(null)

  // Dialog state
  const [dialogOpen,     setDialogOpen]     = useState(false)
  const [selectedLeave,  setSelectedLeave]  = useState<TeacherLeave | null>(null)
  const [leaveAction,    setLeaveAction]    = useState<LeaveAction>('approve')
  const [rejectionText,  setRejectionText]  = useState('')
  const [submitting,     setSubmitting]     = useState(false)

  // Filter tab
  const [filterStatus, setFilterStatus] = useState<'all' | LeaveStatus>('all')

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchLeaves = useCallback(async () => {
    if (!teacherId) return
    setLoading(true)
    setError(null)
    try {
      const res = await teachersApi.getLeavesByTeacher(teacherId)
      if (!res.success) {
        setError('Failed to load leave requests. Please try again.')
        console.error('[TeacherLeavePage] getLeavesByTeacher failed:', res.message)
        return
      }
      // Sort: pending first, then by created_at desc
      const sorted = (res.result ?? []).sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (b.status === 'pending' && a.status !== 'pending') return 1
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
      setLeaves(sorted)
      console.log('[TeacherLeavePage] Leaves loaded:', sorted.length)
    } catch (err: unknown) {
      setError('Unable to connect to the server. Please check your connection.')
      console.error('[TeacherLeavePage] fetchLeaves error:', err)
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  // ── Action dialog ─────────────────────────────────────────────────────────────
  const openActionDialog = (leave: TeacherLeave, action: LeaveAction) => {
    setSelectedLeave(leave)
    setLeaveAction(action)
    setRejectionText('')
    setActionError(null)
    setDialogOpen(true)
  }

  const handleSubmitAction = async () => {
    if (!selectedLeave?._id) return

    // Validation: rejection reason required
    if (leaveAction === 'reject' && !rejectionText.trim()) {
      setActionError('Rejection reason is required.')
      return
    }

    // Get adminId from localStorage
    const adminId = typeof window !== 'undefined'
      ? (localStorage.getItem('adminId') ?? '')
      : ''

    if (!adminId) {
      setActionError('Admin session not found. Please log in again.')
      console.error('[TeacherLeavePage] adminId not found in localStorage')
      return
    }

    setSubmitting(true)
    setActionError(null)
    setActionLoading(selectedLeave._id)

    try {
      let res
      if (leaveAction === 'approve') {
        // POST body: { approved_by: <adminId> }
        res = await teachersApi.approveLeave(selectedLeave._id, adminId)
      } else {
        // POST body: { approved_by: <adminId>, rejection_reason: <text> }
        res = await teachersApi.rejectLeave(selectedLeave._id, adminId, rejectionText.trim())
      }

      if (!res.success) {
        setActionError(
          leaveAction === 'approve'
            ? 'Failed to approve leave. Please try again.'
            : 'Failed to reject leave. Please try again.'
        )
        console.error('[TeacherLeavePage] leave action failed:', res.message)
        return
      }

      // Update local state with updated leave
      setLeaves((prev) =>
        prev.map((l) => (l._id === selectedLeave._id ? (res.result as TeacherLeave) : l))
      )

      console.log('[TeacherLeavePage] Leave', leaveAction === 'approve' ? 'approved' : 'rejected', ':', selectedLeave._id)
      setDialogOpen(false)
      setSelectedLeave(null)
      setRejectionText('')

    } catch (err: unknown) {
      setActionError(
        leaveAction === 'approve'
          ? 'An unexpected error occurred while approving. Please try again.'
          : 'An unexpected error occurred while rejecting. Please try again.'
      )
      console.error('[TeacherLeavePage] handleSubmitAction error:', err)
    } finally {
      setSubmitting(false)
      setActionLoading(null)
    }
  }

  // ── Derived counts ────────────────────────────────────────────────────────────
  const pendingCount  = leaves.filter((l) => l.status === 'pending').length
  const approvedCount = leaves.filter((l) => l.status === 'approved').length
  const rejectedCount = leaves.filter((l) => l.status === 'rejected').length

  const filteredLeaves = filterStatus === 'all'
    ? leaves
    : leaves.filter((l) => l.status === filterStatus)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Top-level error */}
      {error && <ErrorBanner message={error} onRetry={fetchLeaves} />}

      {/* Header Card */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-[#1897C6]" />
              <div>
                <CardTitle className="text-base sm:text-lg">Leave Requests</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review and manage teacher leave applications
                </p>
              </div>
            </div>

            {/* Summary badges */}
            {!loading && leaves.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700">{pendingCount} Pending</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">{approvedCount} Approved</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5">
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-700">{rejectedCount} Rejected</span>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6 space-y-4">

          {/* Filter tabs */}
          {!loading && leaves.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
                const count = status === 'all' ? leaves.length
                  : status === 'pending' ? pendingCount
                  : status === 'approved' ? approvedCount
                  : rejectedCount
                const isActive = filterStatus === status
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`
                      inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                      border transition-all
                      ${isActive
                        ? 'bg-[#1897C6] text-white border-[#1897C6] shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:border-[#1897C6]/50 hover:text-foreground'
                      }
                    `}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    <span className={`
                      rounded-full px-1.5 py-0.5 text-xs font-bold
                      ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}
                    `}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <LeaveSkeleton />
          ) : filteredLeaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-base font-semibold">
                  {filterStatus === 'all' ? 'No leave requests' : `No ${filterStatus} requests`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filterStatus === 'all'
                    ? 'This teacher has not submitted any leave requests yet.'
                    : `No ${filterStatus} leave requests found.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeaves.map((leave) => (
                <LeaveCard
                  key={leave._id}
                  leave={leave}
                  onAction={openActionDialog}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Action Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!submitting) {
          setDialogOpen(open)
          if (!open) {
            setActionError(null)
            setRejectionText('')
          }
        }
      }}>
        <DialogContent className="max-w-full sm:max-w-md mx-3 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {leaveAction === 'approve'
                ? <><CheckCircle className="h-5 w-5 text-emerald-600" /> Approve Leave Request</>
                : <><XCircle className="h-5 w-5 text-rose-600" /> Reject Leave Request</>
              }
            </DialogTitle>
            {selectedLeave && (
              <DialogDescription>
                {getLeaveTypeConfig(selectedLeave.leave_type).label} Leave ·{' '}
                {formatDate(selectedLeave.from_date)}
                {selectedLeave.from_date !== selectedLeave.to_date
                  ? ` — ${formatDate(selectedLeave.to_date)}`
                  : ''}
                {' '}({calcDays(selectedLeave.from_date, selectedLeave.to_date)} day
                {calcDays(selectedLeave.from_date, selectedLeave.to_date) !== 1 ? 's' : ''})
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">

            {/* Reason preview */}
            {selectedLeave?.reason && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Teacher's Reason
                </p>
                <p className="text-sm">{selectedLeave.reason}</p>
              </div>
            )}

            {/* Rejection reason input */}
            {leaveAction === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="rejection_reason">
                  Rejection Reason <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="rejection_reason"
                  placeholder="Explain the reason for rejection..."
                  value={rejectionText}
                  onChange={(e) => {
                    setRejectionText(e.target.value)
                    if (actionError) setActionError(null)
                  }}
                  rows={4}
                  className={actionError && !rejectionText.trim() ? 'border-rose-400' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be visible to the teacher.
                </p>
              </div>
            )}

            {/* Action-level error */}
            {actionError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={submitting || (leaveAction === 'reject' && !rejectionText.trim())}
              className={
                leaveAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {leaveAction === 'approve' ? 'Approving...' : 'Rejecting...'}
                </>
              ) : (
                leaveAction === 'approve' ? 'Approve Leave' : 'Reject Leave'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}