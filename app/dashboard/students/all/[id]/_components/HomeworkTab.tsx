'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Calendar,
  User,
  FileText,
  Loader2,
  RefreshCcw,
  BookOpen,
  Paperclip,
  Star,
  MessageSquare,
  ClipboardCheck,
  Filter,
  Hash,
  Eye,
  Pencil,
  Trash2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useHomework,
  type HomeworkWithSubmission,
  type ComputedStatus,
  type PopulatedSubject,
  type PopulatedTeacher,
} from '../_hooks/useHomework'
import { studentsApi } from '@/lib/api/students'
import { buildFileUrl, formatDate, capitalize, formatDateTime } from '../_utils/helpers'


// ─── Helpers ──────────────────────────────────────────────────────────────────


function resolveSubjectName(subjectId: unknown): string {
  if (!subjectId) return '—'
  if (typeof subjectId === 'object' && subjectId !== null) {
    const s = subjectId as Partial<PopulatedSubject>
    return s.subject_name ?? '—'
  }
  return '—'
}

function resolveTeacherName(assignedBy: unknown): string {
  if (!assignedBy) return '—'
  if (typeof assignedBy === 'object' && assignedBy !== null) {
    const t = assignedBy as Partial<PopulatedTeacher>
    return t.full_name ?? '—'
  }
  return '—'
}

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ComputedStatus }) {
  const map: Record<ComputedStatus, { label: string; className: string }> = {
    pending:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-300' },
    graded:    { label: 'Graded',    className: 'bg-green-100 text-green-700 border-green-300' },
    overdue:   { label: 'Overdue',   className: 'bg-red-100 text-red-700 border-red-300' },
  }
  const { label, className } = map[status]
  return <Badge className={`${className} border text-xs font-medium`}>{label}</Badge>
}

function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null
  const map: Record<string, string> = {
    low:    'bg-blue-50 text-blue-600 border-blue-200',
    medium: 'bg-orange-50 text-orange-600 border-orange-200',
    high:   'bg-red-50 text-red-600 border-red-200',
  }
  const cls = map[priority] ?? 'bg-gray-50 text-gray-600 border-gray-200'
  return (
    <Badge className={`${cls} border text-xs`}>{capitalize(priority)} Priority</Badge>
  )
}

// ─── View Modal ───────────────────────────────────────────────────────────────

interface ViewModalProps {
  open: boolean
  hw: HomeworkWithSubmission | null
  onClose: () => void
}

function ViewModal({ open, hw, onClose }: ViewModalProps) {
  if (!hw) return null

  const subjectName = resolveSubjectName(hw.subject_id)
  const teacherName = resolveTeacherName(hw.assigned_by)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-[#1897C6]" />
            Assignment Details
          </DialogTitle>
          <DialogDescription>
            Full details of this homework assignment and submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Assignment Info */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignment</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">{subjectName}</Badge>
                <StatusBadge status={hw.computedStatus} />
                <PriorityBadge priority={hw.priority} />
                {hw.submission?.is_late && (
                  <Badge className="bg-red-50 text-red-600 border-red-200 border text-xs">Late Submission</Badge>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{hw.title}</p>
                {hw.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{hw.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Assigned By</p>
                  <p className="font-medium">{teacherName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(hw.due_date)}</p>
                </div>
                {hw.total_marks != null && (
                  <div>
                    <p className="text-muted-foreground">Total Marks</p>
                    <p className="font-medium">{hw.total_marks}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Assigned Date</p>
                  <p className="font-medium">{formatDate(hw.assigned_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{capitalize(hw.status)}</p>
                </div>
              </div>
              {hw.instructions && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                  <p className="text-xs bg-muted/30 rounded p-2">{hw.instructions}</p>
                </div>
              )}
              {hw.attachment_urls && hw.attachment_urls.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Assignment Files</p>
                  <div className="flex flex-wrap gap-2">
                    {hw.attachment_urls.map((url, i) => {
                      const fileUrl = buildFileUrl(url)
                      return fileUrl ? (
                        <a key={i} href={fileUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#1897C6] hover:underline bg-blue-50 border border-blue-200 rounded px-2 py-1">
                          <FileText className="h-3 w-3" /> File {i + 1}
                        </a>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submission Info */}
          {hw.submission ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-50/60 px-4 py-2 border-b">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submission</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Submitted On</p>
                    <p className="font-medium">{formatDateTime(hw.submission.submission_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submission Status</p>
                    <p className="font-medium">{capitalize(hw.submission.status)}</p>
                  </div>
                </div>
                {hw.submission.submission_text && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Student's Answer</p>
                    <p className="text-xs bg-white border rounded p-2 max-h-28 overflow-y-auto">
                      {hw.submission.submission_text}
                    </p>
                  </div>
                )}
                {hw.submission.attachment_urls && hw.submission.attachment_urls.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Submitted Files</p>
                    <div className="flex flex-wrap gap-2">
                      {hw.submission.attachment_urls.map((url, i) => {
                        const fileUrl = buildFileUrl(url)
                        return fileUrl ? (
                          <a key={i} href={fileUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#1897C6] hover:underline bg-blue-50 border border-blue-200 rounded px-2 py-1">
                            <Paperclip className="h-3 w-3" /> File {i + 1}
                          </a>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
                {hw.computedStatus === 'graded' && hw.submission.marks_obtained != null && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" /> Marks Awarded
                    </span>
                    <span className="text-sm font-bold text-green-700">
                      {hw.submission.marks_obtained}
                      {hw.total_marks != null && (
                        <span className="font-normal text-green-600">/{hw.total_marks}</span>
                      )}
                    </span>
                  </div>
                )}
                {hw.submission.feedback && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Teacher Feedback</p>
                    <p className="text-xs bg-white border rounded p-2">{hw.submission.feedback}</p>
                  </div>
                )}
                {hw.submission.evaluated_at && (
                  <p className="text-xs text-muted-foreground">
                    Evaluated on: <span className="text-foreground">{formatDateTime(hw.submission.evaluated_at)}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">No submission yet for this assignment.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Evaluate Modal ───────────────────────────────────────────────────────────

interface EvaluateModalProps {
  open: boolean
  hw: HomeworkWithSubmission | null
  evaluating: boolean
  evaluateError: string | null
  onClose: () => void
  onSubmit: (submissionId: string, marks: number, feedback: string) => void
  onClearError: () => void
}

function EvaluateModal({
  open, hw, evaluating, evaluateError, onClose, onSubmit, onClearError,
}: EvaluateModalProps) {
  const [marks, setMarks]       = useState('')
  const [feedback, setFeedback] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open && hw?.submission) {
      setMarks(hw.submission.marks_obtained != null ? String(hw.submission.marks_obtained) : '')
      setFeedback(hw.submission.feedback ?? '')
      setValidationError(null)
    }
  }, [open, hw])

  const handleSubmit = () => {
    setValidationError(null)
    onClearError()
    if (!hw?.submission) return
    const marksNum = parseFloat(marks)
    const totalMarks = hw.total_marks
    if (marks.trim() === '' || isNaN(marksNum)) {
      setValidationError('Please enter a valid marks value.')
      return
    }
    if (marksNum < 0) {
      setValidationError('Marks cannot be negative.')
      return
    }
    if (totalMarks != null && marksNum > totalMarks) {
      setValidationError(`Marks cannot exceed total marks (${totalMarks}).`)
      return
    }
    onSubmit(hw.submission._id, marksNum, feedback.trim())
  }

  if (!hw) return null
  const totalMarks = hw.total_marks
  const isAlreadyGraded = hw.computedStatus === 'graded'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !evaluating) onClose() }}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-[#1897C6]" />
            {isAlreadyGraded ? 'Update Evaluation' : 'Evaluate Submission'}
          </DialogTitle>
          <DialogDescription>
            {isAlreadyGraded
              ? 'Update the marks and feedback for this submission.'
              : 'Assign marks and provide feedback for this submission.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm font-semibold line-clamp-2">{hw.title}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {totalMarks != null && (
                <span>Total marks: <strong className="text-foreground">{totalMarks}</strong></span>
              )}
              <span>Due: <strong className="text-foreground">{formatDate(hw.due_date)}</strong></span>
              {hw.submission?.is_late && (
                <Badge className="bg-red-50 text-red-600 border-red-200 border text-xs">Late Submission</Badge>
              )}
            </div>
          </div>

          {hw.submission?.submission_text && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Student's Answer
              </Label>
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm max-h-28 overflow-y-auto">
                {hw.submission.submission_text}
              </div>
            </div>
          )}

          {hw.submission?.attachment_urls && hw.submission.attachment_urls.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" /> Submitted Attachments
              </Label>
              <div className="flex flex-wrap gap-2">
                {hw.submission.attachment_urls.map((url, i) => {
                  const fileUrl = buildFileUrl(url)
                  return fileUrl ? (
                    <a key={i} href={fileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#1897C6] hover:underline bg-blue-50 border border-blue-200 rounded px-2 py-1">
                      <Paperclip className="h-3 w-3" /> Attachment {i + 1}
                    </a>
                  ) : null
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="eval-marks" className="text-sm font-medium flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-[#1897C6]" />
              Marks Obtained
              {totalMarks != null && (
                <span className="text-muted-foreground font-normal">/ {totalMarks}</span>
              )}
              <span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              id="eval-marks"
              type="number"
              min={0}
              max={totalMarks ?? undefined}
              step="0.5"
              placeholder={totalMarks != null ? `Enter marks (0 – ${totalMarks})` : 'Enter marks'}
              value={marks}
              onChange={(e) => { setMarks(e.target.value); setValidationError(null) }}
              disabled={evaluating}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eval-feedback" className="text-sm font-medium flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-[#1897C6]" />
              Feedback
              <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>
            </Label>
            <Textarea
              id="eval-feedback"
              placeholder="Write feedback for the student..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={evaluating}
              rows={3}
              className="resize-none"
            />
          </div>

          {(validationError ?? evaluateError) && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {validationError ?? evaluateError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={evaluating}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={evaluating || marks.trim() === ''}
            className="bg-[#1897C6] hover:bg-[#1480aa] text-white gap-2"
          >
            {evaluating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              : <><ClipboardCheck className="h-4 w-4" />{isAlreadyGraded ? 'Update Evaluation' : 'Submit Evaluation'}</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

interface DeleteModalProps {
  open: boolean
  hw: HomeworkWithSubmission | null
  deleting: boolean
  deleteError: string | null
  onClose: () => void
  onConfirm: () => void
  onClearError: () => void
}

function DeleteModal({ open, hw, deleting, deleteError, onClose, onConfirm, onClearError }: DeleteModalProps) {
  if (!hw) return null
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !deleting) { onClearError(); onClose() } }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-red-500" />
            Delete Submission
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The submission will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium line-clamp-1">{hw.title}</p>
             <p className="text-xs text-muted-foreground mt-0.5">
              Due: {formatDate(hw.due_date)} · This will permanently delete the assignment and all its submissions.
            </p>
          </div>

          {deleteError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{deleteError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onClearError(); onClose() }} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
            className="gap-2"
          >
            {deleting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>
              : <><Trash2 className="h-4 w-4" /> Delete Submission</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  message,
  icon: Icon,
}: {
  message: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14 gap-3">
        <Icon className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      </CardContent>
    </Card>
  )
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

function SummaryStats({ assignments }: { assignments: HomeworkWithSubmission[] }) {
  const stats = [
    { label: 'Total',     value: assignments.length,
      color: 'text-[#1897C6]', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Pending',   value: assignments.filter(h => h.computedStatus === 'pending').length,
      color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    { label: 'Submitted', value: assignments.filter(h => h.computedStatus === 'submitted').length,
      color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Graded',    value: assignments.filter(h => h.computedStatus === 'graded').length,
      color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
    { label: 'Overdue',   value: assignments.filter(h => h.computedStatus === 'overdue').length,
      color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map(({ label, value, color, bg }) => (
        <Card key={label} className={`${bg} border`}>
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | ComputedStatus

interface FilterTabsProps {
  active: FilterTab
  onChange: (t: FilterTab) => void
  counts: Record<FilterTab, number>
}

function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'graded',    label: 'Graded' },
    { key: 'overdue',   label: 'Overdue' },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            active === key
              ? 'bg-[#1897C6] text-white border-[#1897C6] shadow-sm'
              : 'bg-background text-muted-foreground border-border hover:border-[#1897C6] hover:text-[#1897C6]'
          }`}
        >
          {label}
          <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${
            active === key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {counts[key]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Homework Row (List style) ────────────────────────────────────────────────

interface HomeworkRowProps {
  hw: HomeworkWithSubmission
  onView: (hw: HomeworkWithSubmission) => void
  onEvaluate: (hw: HomeworkWithSubmission) => void
  onDelete: (hw: HomeworkWithSubmission) => void
}

function HomeworkRow({ hw, onView, onEvaluate, onDelete }: HomeworkRowProps) {
  const subjectName = resolveSubjectName(hw.subject_id)
  const teacherName = resolveTeacherName(hw.assigned_by)
  const canEvaluate = hw.computedStatus === 'submitted' || hw.computedStatus === 'graded'

  const borderColorMap: Record<ComputedStatus, string> = {
    pending:   'border-l-yellow-400',
    submitted: 'border-l-blue-400',
    graded:    'border-l-green-500',
    overdue:   'border-l-red-400',
  }

  return (
  <div className={`
      group border border-l-4 ${borderColorMap[hw.computedStatus]}
      rounded-lg bg-card px-4 py-3
      hover:shadow-sm
      transition-all duration-150
    `}>
      {/* Row 1: badges + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-xs shrink-0">{subjectName}</Badge>
          <StatusBadge status={hw.computedStatus} />
          <PriorityBadge priority={hw.priority} />
          {hw.submission?.is_late && (
            <Badge className="bg-red-50 text-red-600 border-red-200 border text-xs">Late</Badge>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-[#1897C6] hover:bg-blue-50"
            onClick={() => onView(hw)}
            title="View Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {canEvaluate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-[#1897C6] hover:bg-blue-50"
              onClick={() => onEvaluate(hw)}
              title={hw.computedStatus === 'graded' ? 'Update Marks' : 'Evaluate'}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {hw.submission && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              onClick={() => onDelete(hw)}
              title="Delete Submission"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: title */}
      <p className="font-semibold text-sm mt-1.5 truncate">{hw.title}</p>
      {/* {hw.description && (
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{hw.description}</p>
      )} */}

      {/* Row 3: meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          Assigned: <span className="text-foreground font-medium">{formatDate(hw.assigned_date)}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          Due: <span className="text-foreground font-medium">{formatDate(hw.due_date)}</span>
        </span>
        {hw.total_marks != null && (
          <span className="font-medium text-foreground">
            Marks: {hw.total_marks}
          </span>
        )}
        {hw.computedStatus === 'graded' && hw.submission?.marks_obtained != null && (
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <Award className="h-3 w-3" />
            Scored: {hw.submission.marks_obtained}/{hw.total_marks ?? '—'}
          </span>
        )}
        {hw.submission?.submission_date && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Submitted: <span className="text-foreground font-medium">{formatDate(hw.submission.submission_date)}</span>
          </span>
        )}
        {hw.attachment_urls && hw.attachment_urls.length > 0 && (
          <span className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            {hw.attachment_urls.length} file{hw.attachment_urls.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
// ─── Main HomeworkTab ─────────────────────────────────────────────────────────

interface HomeworkTabProps {
  studentId: string
  classId?: string | null
  batchId?: string | null
  adminId: string
}

export function HomeworkTab({ studentId, classId, batchId, adminId }: HomeworkTabProps) { const {
    assignments,
    loading,
    error,
    evaluating,
    evaluateError,
    deleting,
    deleteError,
    fetchHomework,
    evaluateSubmission,
    clearEvaluateError,
    clearDeleteError,
  } = useHomework(studentId, classId, batchId)

const deleteSubmission = useCallback(async (submissionId: string): Promise<boolean> => {
    try {
      const res = await studentsApi.deleteHomeworkSubmission(submissionId)
      if (!res.success) return false
      await fetchHomework(true)
      return true
    } catch (err) {
      console.error('[deleteSubmission]', err)
      return false
    }
  }, [fetchHomework])

  const [activeFilter, setActiveFilter]     = useState<FilterTab>('all')
  const [viewTarget, setViewTarget]         = useState<HomeworkWithSubmission | null>(null)
  const [evaluateTarget, setEvaluateTarget] = useState<HomeworkWithSubmission | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<HomeworkWithSubmission | null>(null)
  const [currentPage, setCurrentPage]       = useState(1)
  const [itemsPerPage, setItemsPerPage]     = useState(10)
  const [itemsInput, setItemsInput]         = useState('10')

  useEffect(() => {
    fetchHomework()
  }, [fetchHomework])

  const handleView = useCallback((hw: HomeworkWithSubmission) => {
    setViewTarget(hw)
  }, [])

  const handleEvaluate = useCallback((hw: HomeworkWithSubmission) => {
    clearEvaluateError()
    setEvaluateTarget(hw)
  }, [clearEvaluateError])

  const handleDelete = useCallback((hw: HomeworkWithSubmission) => {
    clearDeleteError()
    setDeleteTarget(hw)
  }, [clearDeleteError])

  // reset to page 1 when filter changes
  const handleFilterChange = useCallback((f: FilterTab) => {
    setActiveFilter(f)
    setCurrentPage(1)
  }, [])

  const handleEvaluateSubmit = useCallback(async (
    submissionId: string, marks: number, feedback: string
  ) => {
    const success = await evaluateSubmission(submissionId, {
      marks_obtained: marks,
      feedback: feedback || null,
      evaluated_by: adminId,
    })
    if (success) setEvaluateTarget(null)
  }, [evaluateSubmission, adminId])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget?.submission?._id) return
    const success = await deleteSubmission(deleteTarget.submission._id)
    if (success) setDeleteTarget(null)
  }, [deleteTarget, deleteSubmission])

  const handleEvaluateClose = useCallback(() => {
    if (!evaluating) { setEvaluateTarget(null); clearEvaluateError() }
  }, [evaluating, clearEvaluateError])

  const handleDeleteClose = useCallback(() => {
    if (!deleting) { setDeleteTarget(null); clearDeleteError() }
  }, [deleting, clearDeleteError])

  if (!classId) {
    return (
      <EmptyState
        icon={BookOpen}
        message="No class is mapped to this student. Homework data cannot be loaded."
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" />
        <span className="text-sm text-muted-foreground">Loading homework data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => fetchHomework(true)} className="gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const counts: Record<FilterTab, number> = {
    all:       assignments.length,
    pending:   assignments.filter(h => h.computedStatus === 'pending').length,
    submitted: assignments.filter(h => h.computedStatus === 'submitted').length,
    graded:    assignments.filter(h => h.computedStatus === 'graded').length,
    overdue:   assignments.filter(h => h.computedStatus === 'overdue').length,
  }

  const filtered = activeFilter === 'all'
    ? assignments
    : assignments.filter(h => h.computedStatus === activeFilter)

  const totalPages  = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated   = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const emptyMessages: Record<FilterTab, string> = {
    all:       'No homework assignments found for this student.',
    pending:   'No pending assignments.',
    submitted: 'No submitted assignments yet.',
    graded:    'No graded assignments yet.',
    overdue:   'No overdue assignments.',
  }

  const emptyIcons: Record<FilterTab, React.ComponentType<{ className?: string }>> = {
    all: BookOpen, pending: Clock, submitted: FileText, graded: Award, overdue: CheckCircle2,
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Homework</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View assignments and evaluate student submissions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchHomework(true)}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Summary stats */}
      {assignments.length > 0 && <SummaryStats assignments={assignments} />}

      {/* Filter dropdown */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={activeFilter}
          onValueChange={(v) => handleFilterChange(v as FilterTab)}
        >
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
                 <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="graded">Graded</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState message={emptyMessages[activeFilter]} icon={emptyIcons[activeFilter]} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {paginated.map((hw) => (
              <HomeworkRow
                key={hw._id}
                hw={hw}
                onView={handleView}
                onEvaluate={handleEvaluate}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination — only show when more than itemsPerPage rows */}
          {filtered.length > itemsPerPage && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows:</span>
                  <Input
                    type="number"
                    min={1}
                    value={itemsInput}
                    onChange={e => {
                      setItemsInput(e.target.value)
                      const n = parseInt(e.target.value)
                      if (n > 0) { setItemsPerPage(n); setCurrentPage(1) }
                    }}
                    className="w-[70px] h-9 text-sm text-center"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {filtered.length === 0
                    ? '0'
                    : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filtered.length)}`
                  } of {filtered.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0 bg-transparent disabled:opacity-40">
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-3 gap-1.5 bg-transparent disabled:opacity-40 text-sm">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="default" size="sm"
                  className="h-9 w-9 p-0 font-medium text-sm bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent shadow-sm pointer-events-none">
                  {currentPage}
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 gap-1.5 bg-transparent disabled:opacity-40 text-sm">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0 bg-transparent disabled:opacity-40">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ViewModal
        open={viewTarget !== null}
        hw={viewTarget}
        onClose={() => setViewTarget(null)}
      />
      <EvaluateModal
        open={evaluateTarget !== null}
        hw={evaluateTarget}
        evaluating={evaluating}
        evaluateError={evaluateError}
        onClose={handleEvaluateClose}
        onSubmit={handleEvaluateSubmit}
        onClearError={clearEvaluateError}
      />
      <DeleteModal
        open={deleteTarget !== null}
        hw={deleteTarget}
        deleting={deleting}
        deleteError={deleteError}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        onClearError={clearDeleteError}
      />
    </div>
  )
}