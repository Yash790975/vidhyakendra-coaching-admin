'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  CheckCircle, XCircle, AlertCircle, Loader2,
  IdCard, Save, UserCheck, Calendar,
} from 'lucide-react'
import { teachersApi, type Teacher } from '@/lib/api/teachers'
import { classesApi } from '@/lib/api/classes'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  key: string
  label: string
  required: boolean
  checked: boolean
  loading: boolean
}

interface ActivationTabProps {
  teacherId: string
  teacher: Teacher
  onNotify?: (n: { type: 'success' | 'error'; message: string }) => void
  onActivated?: () => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivationTab({
  teacherId,
  teacher,
  onNotify,
  onActivated,
}: ActivationTabProps) {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [joiningDate, setJoiningDate] = useState(
    teacher.joining_date ? teacher.joining_date.slice(0, 10) : ''
  )
  const [employmentType, setEmploymentType] = useState<'full_time' | 'part_time' | 'contract' | 'visiting'>(
    teacher.employment_type || 'full_time'
  )

  // ── Checklist state ────────────────────────────────────────────────────────
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { key: 'joining_date', label: 'Joining date set',            required: true,  checked: !!teacher.joining_date, loading: false },
    { key: 'salary',       label: 'Salary structure configured', required: true,  checked: false,                  loading: true  },
    { key: 'class_alloc',  label: 'Class allocation assigned',   required: false, checked: false,                  loading: true  },
  ])

  // ── Dialog / action state ──────────────────────────────────────────────────
  const [activateOpen, setActivateOpen] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // ── Backend checklist checks ───────────────────────────────────────────────
  const runBackendChecks = useCallback(async () => {
    // Salary check
    setChecklist(prev => prev.map(item =>
      item.key === 'salary' ? { ...item, loading: true } : item
    ))
    try {
      const salaryRes = await teachersApi.getActiveSalaryStructureByTeacher(teacherId)
      const salaryOk = !!(salaryRes.success && salaryRes.result)
      setChecklist(prev => prev.map(item =>
        item.key === 'salary' ? { ...item, checked: salaryOk, loading: false } : item
      ))
    } catch {
      setChecklist(prev => prev.map(item =>
        item.key === 'salary' ? { ...item, checked: false, loading: false } : item
      ))
    }

    // Class allocation check
    setChecklist(prev => prev.map(item =>
      item.key === 'class_alloc' ? { ...item, loading: true } : item
    ))
    try {
      const allocRes = await classesApi.getTeacherAssignmentsByTeacher(teacherId)
      const allocOk = !!(allocRes.success && Array.isArray(allocRes.result) && allocRes.result.length > 0)
      setChecklist(prev => prev.map(item =>
        item.key === 'class_alloc' ? { ...item, checked: allocOk, loading: false } : item
      ))
    } catch {
      setChecklist(prev => prev.map(item =>
        item.key === 'class_alloc' ? { ...item, checked: false, loading: false } : item
      ))
    }
  }, [teacherId])

  useEffect(() => {
    runBackendChecks()
  }, [runBackendChecks])

  // ── Sync joining date into checklist live ──────────────────────────────────
  useEffect(() => {
    setChecklist(prev => prev.map(item =>
      item.key === 'joining_date' ? { ...item, checked: !!joiningDate } : item
    ))
  }, [joiningDate])

  // ── Save as Draft ──────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!joiningDate) {
      onNotify?.({ type: 'error', message: 'Joining date is required to save draft.' })
      return
    }
    setIsSavingDraft(true)
    try {
      const res = await teachersApi.update(teacherId, {
        joining_date: joiningDate,
        employment_type: employmentType,
      })
      if (res.success) {
        console.log('[Activation] Draft saved:', { joiningDate, employmentType })
        onNotify?.({ type: 'success', message: 'Draft saved successfully.' })
      } else {
        console.error('[Activation] Draft save failed:', res.message)
        onNotify?.({ type: 'error', message: res.message || 'Failed to save draft. Please try again.' })
      }
    } catch (err: any) {
      console.error('[Activation] Draft save error:', err)
      onNotify?.({ type: 'error', message: 'Something went wrong. Please refresh and try again.' })
    } finally {
      setIsSavingDraft(false)
    }
  }

  // ── Activate ───────────────────────────────────────────────────────────────
  const handleActivate = async () => {
    setIsActivating(true)
    try {
      const res = await teachersApi.update(teacherId, {
        joining_date: joiningDate,
        employment_type: employmentType,
        status: 'active',
      })
      if (res.success) {
        console.log('[Activation] Teacher activated:', teacherId)
        setActivateOpen(false)
        onNotify?.({ type: 'success', message: `${teacher.full_name} has been successfully activated.` })
        onActivated?.()
      } else {
        console.error('[Activation] Activation failed:', res.message)
        setActivateOpen(false)
        onNotify?.({ type: 'error', message: res.message || 'Activation failed. Please try again.' })
      }
    } catch (err: any) {
      console.error('[Activation] Activation error:', err)
      setActivateOpen(false)
      onNotify?.({ type: 'error', message: 'Something went wrong. Please refresh and try again.' })
    } finally {
      setIsActivating(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const isActive   = teacher.status === 'active'
  const isArchived = teacher.status === 'archived'

  const requiredChecks  = checklist.filter(c => c.required)
  const allRequiredDone = requiredChecks.every(c => c.checked)
  const anyLoading      = checklist.some(c => c.loading)

  const canActivate = allRequiredDone && !anyLoading && !isActive && !isArchived

  // ─── Already Active / Archived state ──────────────────────────────────────
  if (isActive || isArchived) {
    return (
      <Card className="border-2 mt-4">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed ${
            isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
          }`}>
            {isActive
              ? <CheckCircle className="h-8 w-8 text-emerald-500" />
              : <XCircle className="h-8 w-8 text-orange-500" />
            }
          </div>
          <div className="text-center">
            <p className="font-semibold text-base">
              {isActive ? 'Teacher is Active' : 'Application Rejected'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isActive
                ? 'This teacher has been successfully activated.'
                : 'This application has been rejected.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Main Activation Form ──────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6 mt-4">

      {/* ── Form Card ── */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-emerald-900">Teacher Activation</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Final step to activate teacher account</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">

          {/* Teacher Code — read only, auto-generated by backend */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Teacher Code</Label>
            <div className="flex items-center gap-2 h-11 px-3 rounded-md border bg-muted text-sm text-muted-foreground">
              <IdCard className="h-4 w-4 shrink-0" />
              {teacher.teacher_code ?? 'Auto-generated on activation'}
            </div>
            <p className="text-xs text-muted-foreground">Automatically assigned by the system</p>
          </div>

          {/* Joining Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Joining Date <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          {/* Employment Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Employment Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={employmentType}
              onValueChange={val => setEmploymentType(val as 'full_time' | 'part_time' | 'contract' | 'visiting')}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="visiting">Visiting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pre-Activation Checklist */}
          <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">Pre-Activation Checklist</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={runBackendChecks}
                disabled={anyLoading}
                className="h-7 text-xs text-blue-600 hover:bg-blue-100"
              >
                {anyLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            <div className="space-y-2">
              {checklist.map(item => (
                <div key={item.key} className="flex items-center gap-2 text-sm">
                  {item.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                  ) : item.checked ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : item.required ? (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className={item.checked ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                  {!item.required && (
                    <span className="text-xs text-muted-foreground/60">(optional)</span>
                  )}
                </div>
              ))}
            </div>

            {!allRequiredDone && !anyLoading && (
              <p className="text-xs text-blue-700 mt-1">
                Complete all required steps before activating.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !joiningDate}
            >
              {isSavingDraft
                ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                : <><Save className="h-4 w-4" />Save as Draft</>
              }
            </Button>
            <Button
              onClick={() => setActivateOpen(true)}
              disabled={!canActivate}
              className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md h-11 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Activate Teacher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Activate Confirmation Dialog ── */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Activate Teacher Account?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  This action will activate <strong>{teacher.full_name}</strong> as a teacher in the system.
                </p>
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p><strong>Name:</strong> {teacher.full_name}</p>
                  <p><strong>Teacher Code:</strong> {teacher.teacher_code ?? 'Will be auto-assigned on activation'}</p>
                  <p><strong>Joining Date:</strong> {joiningDate}</p>
                  <p><strong>Employment:</strong> {employmentType.replace('_', ' ')}</p>
                  <p><strong>Type:</strong> {teacher.teacher_type}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Teacher status will be set to Active and they will be able to use the system.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivateOpen(false)}
              disabled={isActivating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 gap-2"
            >
              {isActivating
                ? <><Loader2 className="h-4 w-4 animate-spin" />Activating...</>
                : 'Confirm Activation'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}