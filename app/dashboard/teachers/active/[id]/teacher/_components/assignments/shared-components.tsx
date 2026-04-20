'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertCircle, Save, Edit2,
} from 'lucide-react'
import type {
  AssignmentFromAPI, EditAssignmentForm,
} from './types'
import {
  resolveClassName, resolveBatchName, resolveBatchTime, resolveSubjectName,
  formatDate, safeStr, extractId, toDateInput, getRoleLabel,
} from './types'
import type { ClassMaster } from '@/lib/api/classes'
import type { SubjectByClass } from '@/lib/api/subjects'
import { ITEMS_PER_PAGE } from './types'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function SectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border-2 p-4 space-y-3">
          <div className="flex gap-2">
            <div className="h-6 w-24 rounded bg-muted" />
            <div className="h-6 w-20 rounded bg-muted" />
          </div>
          <div className="h-4 w-48 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────────────────────────

export function Pagination({
  currentPage,
  totalPages,
  total,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  total: number
  onPageChange: (p: number) => void
}) {
  if (total <= ITEMS_PER_PAGE) return null
  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const end = Math.min(currentPage * ITEMS_PER_PAGE, total)
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t mt-2">
      <span className="text-xs text-muted-foreground">{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-8 w-8 p-0 disabled:opacity-40">
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 px-2 gap-1 disabled:opacity-40 text-xs">
          <ChevronLeft className="h-3.5 w-3.5" />Prev
        </Button>
        <Button size="sm" className="h-8 w-8 p-0 text-xs bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white pointer-events-none">
          {currentPage}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 px-2 gap-1 disabled:opacity-40 text-xs">
          Next<ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="h-8 w-8 p-0 disabled:opacity-40">
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} className="h-7 gap-1 text-rose-600 hover:bg-rose-100">
          Retry
        </Button>
      )}
    </div>
  )
}

// ─── Edit Assignment Dialog ────────────────────────────────────────────────────
// Used by all three tabs. Only allows editing: section_id, academic_year,
// assigned_from, assigned_to, status — matches what PUT /:id accepts safely.

interface EditDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: AssignmentFromAPI | null
  editForm: EditAssignmentForm
  isEditSaving: boolean
  editError: string | null
  classList: ClassMaster[]
  onFormChange: (form: EditAssignmentForm) => void
  onSave: () => void
}

export function EditAssignmentDialog({
  open, onOpenChange, editTarget, editForm,
  isEditSaving, editError, classList, onFormChange, onSave,
}: EditDialogProps) {
  if (!editTarget) return null
  const roleLabel = getRoleLabel(editTarget.role)
  const className = resolveClassName(editTarget.class_id, classList)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Assignment</DialogTitle>
          <DialogDescription className="text-sm">
            {roleLabel} — {className}
          </DialogDescription>
        </DialogHeader>

        {editError && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{editError}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Batch — shown for batch_incharge and faculty (coaching portal) */}
          {(editTarget.role === 'batch_incharge' || editTarget.role === 'faculty') && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Batch</Label>
              <p className="text-xs text-muted-foreground">
                Batch cannot be changed after assignment. End this assignment and create a new one to change batch.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Academic Year <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. 2024-25"
              value={editForm.academic_year}
              onChange={(e) => onFormChange({ ...editForm, academic_year: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Assigned From</Label>
              <Input
                type="date"
                value={editForm.assigned_from}
                onChange={(e) => onFormChange({ ...editForm, assigned_from: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Assigned To</Label>
              <Input
                type="date"
                value={editForm.assigned_to}
                onChange={(e) => onFormChange({ ...editForm, assigned_to: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Status</Label>
            <Select
              value={editForm.status}
              onValueChange={(v) =>
                onFormChange({ ...editForm, status: v as EditAssignmentForm['status'] })
              }
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9"
            disabled={isEditSaving}
          >
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9 gap-2"
            onClick={onSave}
            disabled={isEditSaving}
          >
            {isEditSaving ? 'Saving...' : <><Save className="h-4 w-4" /> Update</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── View Assignment Dialog ────────────────────────────────────────────────────

interface ViewDialogProps {
  viewTarget: AssignmentFromAPI | null
  onClose: () => void
  onEdit: (a: AssignmentFromAPI) => void
  classList: ClassMaster[]
  subjectsByClassMap: Record<string, SubjectByClass[]>
}

export function ViewAssignmentDialog({
  viewTarget, onClose, onEdit, classList, subjectsByClassMap,
}: ViewDialogProps) {
  if (!viewTarget) return null
  const classIdStr = extractId(viewTarget.class_id)

  return (
    <Dialog open={!!viewTarget} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Assignment Details</DialogTitle>
          <DialogDescription className="text-sm">
            {getRoleLabel(viewTarget.role)} Assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</p>
              <Badge className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-0 text-xs">
                {getRoleLabel(viewTarget.role)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
              <Badge className={
                viewTarget.status === 'active'
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : viewTarget.status === 'archived'
                    ? 'bg-orange-50 text-orange-700 border-orange-300'
                    : 'bg-gray-50 text-gray-700 border-gray-300'
              }>
                {viewTarget.status ?? 'Inactive'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</p>
              <p className="font-medium">{resolveClassName(viewTarget.class_id, classList)}</p>
            </div>
            {viewTarget.batch_id && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Batch</p>
                <p className="font-medium">
                  {resolveBatchName(viewTarget.batch_id)}
                  {resolveBatchTime(viewTarget.batch_id) ? ` (${resolveBatchTime(viewTarget.batch_id)})` : ''}
                </p>
              </div>
            )}
            {viewTarget.subject_id && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</p>
                <Badge className="bg-gradient-to-r from-[#F1AF37] to-[#D88931] text-white border-0 text-xs">
                  {resolveSubjectName(viewTarget.subject_id, subjectsByClassMap, classIdStr)}
                </Badge>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Academic Year</p>
              <p className="font-mono font-medium">{safeStr(viewTarget.academic_year ?? null) || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned From</p>
              <p className="font-medium">{formatDate(viewTarget.assigned_from)}</p>
            </div>
            {viewTarget.assigned_to && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned To</p>
                <p className="font-medium">{formatDate(viewTarget.assigned_to)}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} className="h-9">Close</Button>
          <Button
            className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] h-9 gap-2"
            onClick={() => { onClose(); onEdit(viewTarget) }}
          >
            <Edit2 className="h-4 w-4" />Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── End Assignment Confirmation Dialog ───────────────────────────────────────

interface EndDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  assignment: AssignmentFromAPI | null
  isDeleting: boolean
  error: string | null
  onConfirm: () => void
}

export function EndAssignmentDialog({
  open, onOpenChange, assignment, isDeleting, error, onConfirm,
}: EndDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End Assignment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the{' '}
            <strong>{assignment ? getRoleLabel(assignment.role) : ''}</strong>{' '}
            assignment as inactive with today as the end date. The record will be preserved for audit purposes.
          </AlertDialogDescription>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600"
          >
            {isDeleting ? 'Ending...' : 'Yes, End Assignment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}