'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ChevronLeft,
  Download,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarDays,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { teachersApi, Teacher, TeacherLeave } from '@/lib/api/teachers'

// ─── Constants ───────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  paid: 'Paid Leave',
  unpaid: 'Unpaid Leave',
  earned: 'Earned Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  bereavement: 'Bereavement Leave',
  marriage: 'Marriage Leave',
  study: 'Study Leave',
  work_from_home: 'Work From Home',
  half_day: 'Half Day',
  optional_holiday: 'Optional Holiday',
  restricted_holiday: 'Restricted Holiday',
}

const LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABELS) as TeacherLeave['leave_type'][]

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

const formatDateForInput = (dateStr: string) => {
  // Convert any date string to YYYY-MM-DD for input[type=date]
  return new Date(dateStr).toISOString().split('T')[0]
}

const getDayCount = (from: string, to: string) => {
  const diff = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1)
}

const getTeacherName = (leave: TeacherLeave): string => {
  if (typeof leave.teacher_id === 'object' && leave.teacher_id !== null) {
    return leave.teacher_id.full_name
  }
  return '—'
}

const getTeacherCode = (leave: TeacherLeave): string => {
  if (typeof leave.teacher_id === 'object' && leave.teacher_id !== null) {
    return leave.teacher_id.teacher_code
  }
  return ''
}

const getAdminId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('adminId') ?? ''
  }
  return ''
}

const exportToCSV = (leaves: TeacherLeave[]) => {
  const headers = [
    'S.No', 'Teacher Name', 'Teacher Code', 'Leave Type',
    'From Date', 'To Date', 'Days', 'Reason', 'Status', 'Rejection Reason'
  ]
  const rows = leaves.map((l, i) => [
    i + 1,
    `"${getTeacherName(l)}"`,
    getTeacherCode(l),
    LEAVE_TYPE_LABELS[l.leave_type] ?? l.leave_type,
    formatDate(l.from_date),
    formatDate(l.to_date),
    getDayCount(l.from_date, l.to_date),
    `"${l.reason ?? ''}"`,
    l.status ?? 'pending',
    `"${l.rejection_reason ?? ''}"`,
  ].join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `teacher-leaves-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  startIndex: number
  endIndex: number
  onPageChange: (p: number) => void
  onItemsPerPageChange: (n: number) => void
}

const PaginationBar = ({
  currentPage, totalPages, itemsPerPage, totalItems,
  startIndex, endIndex, onPageChange, onItemsPerPageChange
}: PaginationBarProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Rows:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(v) => { onItemsPerPageChange(Number(v)); onPageChange(1) }}
            >
              <SelectTrigger className="w-[65px] h-8 border-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 10, 20, 50].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs sm:text-sm font-medium">
            {totalItems === 0 ? '0' : `${startIndex + 1}–${Math.min(endIndex, totalItems)}`} of {totalItems}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-8 w-8 p-0 border-2">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-8 w-8 p-0 border-2">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pn: number
              if (totalPages <= 3) pn = i + 1
              else if (currentPage <= 2) pn = i + 1
              else if (currentPage >= totalPages - 1) pn = totalPages - 2 + i
              else pn = currentPage - 1 + i
              return (
                <Button
                  key={pn}
                  variant={currentPage === pn ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pn)}
                  className={`h-8 w-8 p-0 border-2 ${currentPage === pn ? 'bg-[#1897C6] border-[#1897C6] text-white' : ''}`}
                >
                  {pn}
                </Button>
              )
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 p-0 border-2">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="h-8 w-8 p-0 border-2">
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)

// ─── Feedback Modal ───────────────────────────────────────────────────────────

interface FeedbackModalProps {
  open: boolean
  type: 'error' | 'success' | 'info'
  title: string
  message: string
  onClose: () => void
}

const FeedbackModal = ({ open, type, title, message, onClose }: FeedbackModalProps) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className={
          type === 'error' ? 'text-red-600' :
          type === 'success' ? 'text-green-600' : 'text-blue-600'
        }>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          onClick={onClose}
          variant={type === 'error' ? 'destructive' : 'default'}
          className={type === 'success' ? 'bg-[#1897C6] hover:bg-[#1897C6]/90' : ''}
        >
          OK
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status?: string }) => {
  if (status === 'approved') return (
    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
      <CheckCircle2 className="h-3 w-3" /> Approved
    </Badge>
  )
  if (status === 'rejected') return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
      <XCircle className="h-3 w-3" /> Rejected
    </Badge>
  )
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherLeavePage() {
  const [leaves, setLeaves] = useState<TeacherLeave[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(7)

  // Feedback modal
  const [modal, setModal] = useState<{
    open: boolean; type: 'error' | 'success' | 'info'; title: string; message: string
  }>({ open: false, type: 'info', title: '', message: '' })

  const showModal = (type: 'error' | 'success' | 'info', title: string, message: string) =>
    setModal({ open: true, type, title, message })

  // ── Apply Leave form ────────────────────────────────────────────────────
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyForm, setApplyForm] = useState({
    teacher_id: '',
    leave_type: '' as TeacherLeave['leave_type'] | '',
    from_date: '',
    to_date: '',
    reason: '',
  })
  const [applyLoading, setApplyLoading] = useState(false)

  // ── View modal ──────────────────────────────────────────────────────────
  const [viewLeave, setViewLeave] = useState<TeacherLeave | null>(null)

  // ── Edit modal ──────────────────────────────────────────────────────────
  const [editLeave, setEditLeave] = useState<TeacherLeave | null>(null)
  const [editForm, setEditForm] = useState({
    leave_type: '' as TeacherLeave['leave_type'] | '',
    to_date: '',
    reason: '',
  })
  const [editLoading, setEditLoading] = useState(false)

  // ── Delete confirm modal ────────────────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean; leaveId: string; loading: boolean
  }>({ open: false, leaveId: '', loading: false })

  // ── Reject modal ────────────────────────────────────────────────────────
  const [rejectModal, setRejectModal] = useState<{
    open: boolean; leaveId: string; rejectionReason: string; loading: boolean
  }>({ open: false, leaveId: '', rejectionReason: '', loading: false })

  // Action loading (per row)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  // ── Load all leaves ─────────────────────────────────────────────────────
  const loadLeaves = useCallback(async () => {
    setLoading(true)
    try {
      let res
      if (statusFilter === 'all') {
        res = await teachersApi.getAllLeaves()
      } else {
        res = await teachersApi.getLeavesByStatus(statusFilter)
      }
      const list: TeacherLeave[] = Array.isArray(res.result) ? res.result : []
      setLeaves(list)
    } catch (err: any) {
      console.error('[Leave] Failed to load leaves:', err)
      showModal('error', 'Failed to Load Leaves', err?.message ?? 'Could not fetch leave records.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadLeaves()
  }, [loadLeaves])

  useEffect(() => { setCurrentPage(1) }, [statusFilter])

  // ── Load teachers ────────────────────────────────────────────────────────
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const res = await teachersApi.getAll({ status: 'active' })
        const list: Teacher[] = Array.isArray(res.result) ? res.result : []
        setTeachers(list)
      } catch (err) {
        console.error('[Leave] Failed to load teachers:', err)
      }
    }
    loadTeachers()
  }, [])

  // ── Apply leave ─────────────────────────────────────────────────────────
  const handleApplyLeave = async () => {
    if (!applyForm.teacher_id) return showModal('info', 'Missing Field', 'Please select a teacher.')
    if (!applyForm.leave_type) return showModal('info', 'Missing Field', 'Please select leave type.')
    if (!applyForm.from_date) return showModal('info', 'Missing Field', 'Please select from date.')
    if (!applyForm.to_date) return showModal('info', 'Missing Field', 'Please select to date.')
    if (new Date(applyForm.to_date) < new Date(applyForm.from_date)) {
      return showModal('info', 'Invalid Dates', 'To date must be on or after from date.')
    }

    setApplyLoading(true)
    try {
      await teachersApi.createLeave({
        teacher_id: applyForm.teacher_id,
        leave_type: applyForm.leave_type as TeacherLeave['leave_type'],
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        reason: applyForm.reason || undefined,
      })
      showModal('success', 'Leave Applied', 'Leave request has been submitted successfully.')
      setApplyOpen(false)
      setApplyForm({ teacher_id: '', leave_type: '', from_date: '', to_date: '', reason: '' })
      loadLeaves()
    } catch (err: any) {
      console.error('[Leave] Failed to apply leave:', err)
      showModal('error', 'Failed to Apply Leave', err?.message ?? 'Could not submit leave request.')
    } finally {
      setApplyLoading(false)
    }
  }

  // ── Open edit modal ─────────────────────────────────────────────────────
  const openEditModal = (leave: TeacherLeave) => {
    setEditLeave(leave)
    setEditForm({
      leave_type: leave.leave_type,
      to_date: formatDateForInput(leave.to_date),
      reason: leave.reason ?? '',
    })
  }

  // ── Save edit ───────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!editLeave?._id) return
    if (!editForm.leave_type) return showModal('info', 'Missing Field', 'Please select leave type.')
    if (!editForm.to_date) return showModal('info', 'Missing Field', 'Please select to date.')

    // to_date must be >= from_date
    const fromDate = new Date(editLeave.from_date)
    const toDate = new Date(editForm.to_date)
    if (toDate < fromDate) {
      return showModal('info', 'Invalid Date', 'To date must be on or after from date.')
    }

    setEditLoading(true)
    try {
      await teachersApi.updateLeave(editLeave._id, {
        leave_type: editForm.leave_type as TeacherLeave['leave_type'],
        to_date: editForm.to_date,
        reason: editForm.reason || undefined,
      })
      showModal('success', 'Leave Updated', 'Leave request has been updated successfully.')
      setEditLeave(null)
      loadLeaves()
    } catch (err: any) {
      console.error('[Leave] Failed to edit leave:', err)
      showModal('error', 'Update Failed', err?.message ?? 'Could not update leave request.')
    } finally {
      setEditLoading(false)
    }
  }

  // ── Delete leave ────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteModal.leaveId) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await teachersApi.deleteLeave(deleteModal.leaveId)
      showModal('success', 'Leave Deleted', 'Leave request has been deleted.')
      setDeleteModal({ open: false, leaveId: '', loading: false })
      loadLeaves()
    } catch (err: any) {
      console.error('[Leave] Failed to delete:', err)
      showModal('error', 'Delete Failed', err?.message ?? 'Could not delete leave request.')
      setDeleteModal(prev => ({ ...prev, loading: false }))
    }
  }

  // ── Approve leave ───────────────────────────────────────────────────────
  const handleApprove = async (leaveId: string) => {
    const adminId = getAdminId()
    if (!adminId) {
      return showModal('error', 'Admin ID Missing', 'Could not find admin ID. Please re-login.')
    }
    setActionLoading(prev => ({ ...prev, [leaveId]: true }))
    try {
      await teachersApi.approveLeave(leaveId, adminId)
      showModal('success', 'Leave Approved', 'Leave has been approved successfully.')
      loadLeaves()
    } catch (err: any) {
      console.error('[Leave] Failed to approve:', err)
      showModal('error', 'Approve Failed', err?.message ?? 'Could not approve leave.')
    } finally {
      setActionLoading(prev => ({ ...prev, [leaveId]: false }))
    }
  }

  // ── Reject leave ────────────────────────────────────────────────────────
  const handleRejectConfirm = async () => {
    if (!rejectModal.rejectionReason.trim()) {
      return showModal('info', 'Reason Required', 'Please enter a rejection reason.')
    }
    const adminId = getAdminId()
    if (!adminId) {
      return showModal('error', 'Admin ID Missing', 'Could not find admin ID. Please re-login.')
    }
    setRejectModal(prev => ({ ...prev, loading: true }))
    try {
      await teachersApi.rejectLeave(rejectModal.leaveId, adminId, rejectModal.rejectionReason)
      showModal('success', 'Leave Rejected', 'Leave has been rejected.')
      setRejectModal({ open: false, leaveId: '', rejectionReason: '', loading: false })
      loadLeaves()
    } catch (err: any) {
      console.error('[Leave] Failed to reject:', err)
      showModal('error', 'Reject Failed', err?.message ?? 'Could not reject leave.')
      setRejectModal(prev => ({ ...prev, loading: false }))
    }
  }

  // ── Paginated data ──────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(leaves.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLeaves = leaves.slice(startIndex, endIndex)

  // ── Summary counts (always from full list) ──────────────────────────────
  const pendingCount = leaves.filter(l => l.status === 'pending').length
  const approvedCount = leaves.filter(l => l.status === 'approved').length
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">

        {/* Feedback Modal */}
        <FeedbackModal
          open={modal.open}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={() => setModal(prev => ({ ...prev, open: false }))}
        />

        {/* ── View Modal ──────────────────────────────────────────────────── */}
        <Dialog open={!!viewLeave} onOpenChange={() => setViewLeave(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#1897C6]">Leave Details</DialogTitle>
              <DialogDescription>Full details for this leave request.</DialogDescription>
            </DialogHeader>
            {viewLeave && (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#1897C6] text-white text-sm font-semibold">
                      {getInitials(getTeacherName(viewLeave))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{getTeacherName(viewLeave)}</p>
                    <p className="text-xs text-muted-foreground">{getTeacherCode(viewLeave)}</p>
                  </div>
                  <div className="ml-auto">
                    <StatusBadge status={viewLeave.status} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Leave Type</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      {LEAVE_TYPE_LABELS[viewLeave.leave_type] ?? viewLeave.leave_type}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Duration</p>
                    <p className="text-sm font-semibold text-[#1897C6]">
                      {getDayCount(viewLeave.from_date, viewLeave.to_date)} day(s)
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">From Date</p>
                    <p className="text-sm font-medium">{formatDate(viewLeave.from_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">To Date</p>
                    <p className="text-sm font-medium">{formatDate(viewLeave.to_date)}</p>
                  </div>
                </div>
                {viewLeave.reason && (
                  <div className="space-y-1 pt-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Reason</p>
                    <p className="text-sm text-foreground bg-muted/40 rounded-md px-3 py-2">{viewLeave.reason}</p>
                  </div>
                )}
                {viewLeave.rejection_reason && (
                  <div className="space-y-1 pt-1">
                    <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Rejection Reason</p>
                    <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2 border border-red-200">
                      {viewLeave.rejection_reason}
                    </p>
                  </div>
                )}
                {viewLeave.created_at && (
                  <div className="space-y-1 pt-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Applied On</p>
                    <p className="text-sm text-muted-foreground">{formatDate(viewLeave.created_at)}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewLeave(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Modal ──────────────────────────────────────────────────── */}
        <Dialog open={!!editLeave} onOpenChange={() => { if (!editLoading) setEditLeave(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Leave Request</DialogTitle>
              <DialogDescription>
                Update leave type, to date, or reason for {editLeave ? getTeacherName(editLeave) : ''}.
              </DialogDescription>
            </DialogHeader>
            {editLeave && (
              <div className="space-y-4 py-2">
                {/* From date is read-only */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-muted-foreground">From Date (cannot be changed)</Label>
                  <Input
                    type="date"
                    value={formatDateForInput(editLeave.from_date)}
                    disabled
                    className="border-2 bg-muted/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">To Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={editForm.to_date}
                    min={formatDateForInput(editLeave.from_date)}
                    onChange={(e) => setEditForm(prev => ({ ...prev, to_date: e.target.value }))}
                    className="border-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Leave Type <span className="text-red-500">*</span></Label>
                  <Select
                    value={editForm.leave_type}
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, leave_type: v as TeacherLeave['leave_type'] }))}
                  >
                    <SelectTrigger className="border-2">
                      <SelectValue placeholder="Select leave type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map(lt => (
                        <SelectItem key={lt} value={lt}>{LEAVE_TYPE_LABELS[lt]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Reason (optional)</Label>
                  <Textarea
                    placeholder="Enter reason for leave..."
                    value={editForm.reason}
                    onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="min-h-[70px] border-2"
                  />
                </div>
                {editForm.to_date && (
                  <p className="text-xs text-muted-foreground">
                    Updated duration: <span className="font-semibold text-[#1897C6]">
                      {getDayCount(editLeave.from_date, editForm.to_date)} day(s)
                    </span>
                  </p>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditLeave(null)} disabled={editLoading}>
                Cancel
              </Button>
              <Button
                className="bg-[#1897C6] hover:bg-[#1897C6]/90"
                onClick={handleEditSave}
                disabled={editLoading}
              >
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
        <Dialog
          open={deleteModal.open}
          onOpenChange={(o) => !o && !deleteModal.loading && setDeleteModal({ open: false, leaveId: '', loading: false })}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Leave Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this leave request? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, leaveId: '', loading: false })}
                disabled={deleteModal.loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteModal.loading}
              >
                {deleteModal.loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Reject Modal ────────────────────────────────────────────────── */}
        <Dialog
          open={rejectModal.open}
          onOpenChange={(o) => !o && setRejectModal(prev => ({ ...prev, open: false }))}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">Reject Leave</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this leave request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label className="text-sm font-medium">Rejection Reason <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectModal.rejectionReason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, rejectionReason: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectModal({ open: false, leaveId: '', rejectionReason: '', loading: false })}
                disabled={rejectModal.loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={rejectModal.loading}
              >
                {rejectModal.loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reject Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Apply Leave Modal ───────────────────────────────────────────── */}
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Apply Leave for Teacher</DialogTitle>
              <DialogDescription>
                Fill in the details to submit a leave request on behalf of a teacher.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Teacher <span className="text-red-500">*</span></Label>
                <Select
                  value={applyForm.teacher_id}
                  onValueChange={(v) => setApplyForm(prev => ({ ...prev, teacher_id: v }))}
                >
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Select teacher..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.full_name} {t.teacher_code ? `(${t.teacher_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Leave Type <span className="text-red-500">*</span></Label>
                <Select
                  value={applyForm.leave_type}
                  onValueChange={(v) => setApplyForm(prev => ({ ...prev, leave_type: v as TeacherLeave['leave_type'] }))}
                >
                  <SelectTrigger className="border-2">
                    <SelectValue placeholder="Select leave type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map(lt => (
                      <SelectItem key={lt} value={lt}>{LEAVE_TYPE_LABELS[lt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">From Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={applyForm.from_date}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, from_date: e.target.value }))}
                    className="border-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">To Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={applyForm.to_date}
                    min={applyForm.from_date}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, to_date: e.target.value }))}
                    className="border-2"
                  />
                </div>
              </div>

              {applyForm.from_date && applyForm.to_date && (
                <p className="text-xs text-muted-foreground">
                  Duration: <span className="font-semibold text-[#1897C6]">
                    {getDayCount(applyForm.from_date, applyForm.to_date)} day(s)
                  </span>
                </p>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Reason (optional)</Label>
                <Textarea
                  placeholder="Enter reason for leave..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="min-h-[70px] border-2"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={applyLoading}>
                Cancel
              </Button>
              <Button
                className="bg-[#1897C6] hover:bg-[#1897C6]/90"
                onClick={handleApplyLeave}
                disabled={applyLoading}
              >
                {applyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link href="/dashboard/teachers/active">
            <Button variant="ghost" size="sm" className="mb-3 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Teachers
            </Button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
                <CalendarDays className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Leave Management</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Review and manage teacher leave requests</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="hidden sm:flex border-2"
                onClick={() => exportToCSV(leaves)}
                disabled={leaves.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                className="bg-[#1897C6] hover:bg-[#1897C6]/90"
                onClick={() => setApplyOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Apply Leave
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Requests', count: leaves.length, color: 'text-[#1897C6]', icon: FileText },
            { label: 'Pending', count: pendingCount, color: 'text-yellow-600', icon: Clock },
            { label: 'Approved', count: approvedCount, color: 'text-green-600', icon: CheckCircle2 },
            { label: 'Rejected', count: rejectedCount, color: 'text-red-600', icon: XCircle },
          ].map(({ label, count, color, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex rounded-lg border p-1 bg-muted/30">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(s => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className={`${statusFilter === s ? 'bg-[#1897C6] text-white' : ''} text-xs sm:text-sm capitalize`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                {s === 'pending' && pendingCount > 0 && (
                  <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-yellow-500 text-white">
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="sm:hidden border-2"
            onClick={() => exportToCSV(leaves)}
            disabled={leaves.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>

        {/* Leave Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1897C6]" />
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Leave Requests</CardTitle>
                  <Badge variant="secondary">{leaves.length} records</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">S.No</th>
                        <th className="text-left p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teacher</th>
                        <th className="text-left p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leave Type</th>
                        <th className="text-center p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</th>
                        <th className="text-left p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</th>
                        <th className="text-center p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="text-center p-3 sm:p-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLeaves.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm">No leave requests found</p>
                          </td>
                        </tr>
                      ) : paginatedLeaves.map((leave, index) => (
                        <tr key={leave._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-3 sm:p-4">
                            <span className="text-sm text-muted-foreground">{startIndex + index + 1}</span>
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-[#1897C6] text-white text-xs font-semibold">
                                  {getInitials(getTeacherName(leave))}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm leading-tight">{getTeacherName(leave)}</p>
                                <p className="text-xs text-muted-foreground">{getTeacherCode(leave)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs whitespace-nowrap">
                              {LEAVE_TYPE_LABELS[leave.leave_type] ?? leave.leave_type}
                            </Badge>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-muted-foreground">{formatDate(leave.from_date)}</span>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-xs text-muted-foreground">{formatDate(leave.to_date)}</span>
                              <span className="text-xs font-semibold text-[#1897C6] mt-0.5">
                                {getDayCount(leave.from_date, leave.to_date)} day(s)
                              </span>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 max-w-[160px]">
                            {/* Only show reason in table, NOT rejection_reason */}
                            <p className="text-sm text-muted-foreground truncate">
                              {leave.reason ?? '—'}
                            </p>
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <StatusBadge status={leave.status} />
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View button — always visible */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 border-2 text-[#1897C6] hover:bg-blue-50"
                                title="View Details"
                                onClick={() => setViewLeave(leave)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {leave.status === 'pending' && (
                                <>
                                  {/* Edit button — only for pending */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0 border-2 text-amber-600 hover:bg-amber-50"
                                    title="Edit Leave"
                                    onClick={() => openEditModal(leave)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>

                                  {/* Approve */}
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2.5"
                                    onClick={() => handleApprove(leave._id!)}
                                    disabled={actionLoading[leave._id!]}
                                  >
                                    {actionLoading[leave._id!]
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <><CheckCircle2 className="h-3 w-3 mr-1" />Approve</>
                                    }
                                  </Button>

                                  {/* Reject */}
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs h-7 px-2.5"
                                    onClick={() => setRejectModal({ open: true, leaveId: leave._id!, rejectionReason: '', loading: false })}
                                    disabled={actionLoading[leave._id!]}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />Reject
                                  </Button>
                                </>
                              )}

                              {/* Delete button — always visible */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 border-2 text-red-600 hover:bg-red-50"
                                title="Delete Leave"
                                onClick={() => setDeleteModal({ open: true, leaveId: leave._id!, loading: false })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination — only when > 7 records */}
            {leaves.length > 7 && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={leaves.length}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}