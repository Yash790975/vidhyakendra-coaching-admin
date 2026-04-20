'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertCircle, CalendarDays, CheckCircle, ChevronDown, ChevronUp,
  Clock, DollarSign, Download, Edit, Eye, FileText, Loader2, Plus, Trash2, TrendingUp,
} from 'lucide-react'
import type { StudentFee, FeeReceipt, FeeHead, FeeSnapshotItem, StudentFeeStatus } from '@/lib/api/fee'
import {
  studentFeeApi, feeStructureApi, feeReceiptApi, feeTermApi,
  extractId, resolveTermLabel, calcTotalFromHeads,
} from '@/lib/api/fee'
import type { Notice } from '@/lib/api/notices'
import { classesApi } from '@/lib/api/classes'
import { teachersApi } from '@/lib/api/teachers'
import type { ClassMaster, CoachingBatch } from '@/lib/api/classes'
import type { Teacher } from '@/lib/api/teachers'
import { capitalize, formatCurrency, formatDate, getStatusBadge } from '../_utils/helpers'
import { buildFileUrl } from '../_utils/helpers'
import { Pagination } from '@/components/pagination'

// ─── Props ────────────────────────────────────────────────────────────────────

interface FeesTabProps {
  fees: StudentFee[]
  feeReceipts: FeeReceipt[]
  feeTermsMap: Record<string, string>
  selectedYear: string
  setSelectedYear: (year: string) => void
  loadingFees: boolean
  loadingNotices: boolean
  notices: Notice[]
  studentId: string
  refreshFees: () => Promise<void>
  classId?: string
  sectionId?: string | null
  batchId?: string | null
}
type PaymentMethod = 'cash' | 'card' | 'online' | 'cheque' | 'upi'

// ─── Component ────────────────────────────────────────────────────────────────

export function FeesTab({
  fees, feeReceipts, feeTermsMap, selectedYear, setSelectedYear,
  loadingFees, loadingNotices, notices, studentId, refreshFees, 
  classId: propClassId, sectionId: propSectionId, batchId: propBatchId,
}: FeesTabProps) {
  const [feeTab, setFeeTab] = useState<'pending' | 'paid' | 'structure' | 'history'>('pending')
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)

  // ── Edit Structure state ────────────────────────────────────────────────────
  const [showEditStructureDialog, setShowEditStructureDialog] = useState(false)
  const [editingStructure, setEditingStructure] = useState<{
    studentFeeId: string
    structureId: string
    fee_heads: FeeHead[]
  } | null>(null)
  const [isSavingStructure, setIsSavingStructure] = useState(false)
  const [structureError, setStructureError] = useState<string | null>(null)

  // ── Add Payment state ───────────────────────────────────────────────────────
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    student_fee_id: '',
    term_id: '',
    amount_paid: '',
    payment_method: 'cash' as PaymentMethod,
    payment_date: new Date().toISOString().split('T')[0],
    transaction_id: '',
    collected_by: '',
    remarks: '',
  })
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // ── Delete state ────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'receipt' | 'studentFee'
    id: string
    label: string
  } | null>(null)
  const [isDeletingRecord, setIsDeletingRecord] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Notice dialog state ─────────────────────────────────────────────────────
  const [showNoticeDialog, setShowNoticeDialog] = useState(false)
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null)

  const [classes,  setClasses]  = useState<ClassMaster[]>([])
  const [batches,  setBatches]  = useState<CoachingBatch[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [loadingClasses,  setLoadingClasses]  = useState(false)
  const [loadingBatches,  setLoadingBatches]  = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)

  // ── Create Fee dialog state ─────────────────────────────────────────────────
  const [showCreateFeeDialog, setShowCreateFeeDialog] = useState(false)
  const [createFeeStep, setCreateFeeStep] = useState<1 | 2 | 3>(1)
  const [isSavingFee, setIsSavingFee] = useState(false)
  const [createFeeError, setCreateFeeError] = useState<string | null>(null)

  const emptyFeeHead = (): FeeHead => ({ name: '', amount: 0, frequency: 'monthly', mandatory: true })

  const [createFeeForm, setCreateFeeForm] = useState<{
    academic_year: string
    fee_heads: FeeHead[]
    term_name: string
    term_order: string
    start_date: string
    due_date: string
    late_fee_amount: string
  }>({
    academic_year: '',
    fee_heads: [emptyFeeHead()],
    term_name: '',
    term_order: '',
    start_date: '',
    due_date: '',
    late_fee_amount: '',
  })

  // ── Pagination state ────────────────────────────────────────────────────────
  const [pendingPage, setPendingPage] = useState(1)
  const [paidPage, setPaidPage]       = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const PAGE_SIZE = 5

  // ── Derived values ──────────────────────────────────────────────────────────
  const feesForYear   = selectedYear === '' ? fees : fees.filter(f => f.academic_year === selectedYear)
  const pendingFees   = feesForYear.filter(f => ['pending', 'overdue', 'partial'].includes(f.status))
  const paidFees      = feesForYear.filter(f => ['paid', 'partial'].includes(f.status))
  const totalAmount   = feesForYear.reduce((s, f) => s + Number(f.total_amount), 0)
  const totalPaid     = feesForYear.reduce((s, f) => s + Number(f.paid_amount),  0)
  const totalDue      = feesForYear.reduce((s, f) => s + Number(f.due_amount),   0)
  const paymentPct    = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
  const feeYears      = [...new Set(fees.map(f => f.academic_year))].sort().reverse()

  const yearReceipts     = feeReceipts.filter(r => feesForYear.some(f => receiptMatchesFee(r, f._id)))
  const sortedReceipts   = [...yearReceipts].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const paginatedPending = pendingFees.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE)
  const paginatedPaid    = paidFees.slice((paidPage - 1) * PAGE_SIZE, paidPage * PAGE_SIZE)
  const paginatedHistory = sortedReceipts.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE)
  const structureFee     = feesForYear[0] ?? null

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function receiptMatchesFee(receipt: FeeReceipt, feeId: string): boolean {
    return extractId(receipt.student_fee_id as string | { _id: string }) === feeId
  }

  function termLabel(termId: StudentFee['term_id']): string {
    return resolveTermLabel(
      termId as string | { _id: string; name: string; term_order: number | null } | null,
      feeTermsMap,
    )
  }

  // ── Edit Structure handler ──────────────────────────────────────────────────

  // function openEditStructure() {
  //   if (!structureFee) return

  //   const structureId = extractId(structureFee.fee_structure_id as string | { _id: string })
  //   if (!structureId) {
  //     setStructureError('Fee structure ID not found. Please reload and try again.')
  //     setShowEditStructureDialog(true)
  //     return
  //   }

  //   setEditingStructure({
  //     studentFeeId: structureFee._id,
  //     structureId,
  //     fee_heads: structureFee.fee_snapshot.map(item => ({
  //       name: item.name,
  //       amount: item.amount,
  //       frequency: (item.frequency ?? 'annual') as FeeHead['frequency'],
  //       mandatory: true,
  //     })),
  //   })
  //   setStructureError(null)
  //   setShowEditStructureDialog(true)
  // }


async function openEditStructure() {
  if (!structureFee) return

  const structureId = extractId(structureFee.fee_structure_id as string | { _id: string })
  if (!structureId) {
    setStructureError('Fee structure ID not found. Please reload and try again.')
    setShowEditStructureDialog(true)
    return
  }

  setStructureError(null)
  setShowEditStructureDialog(true)
  setIsSavingStructure(true) // reuse loading state while fetching

  try {
    const res = await feeStructureApi.getById(structureId)
    if (!res.success || !res.result) {
      setStructureError(res.message ?? 'Failed to load fee structure.')
      setIsSavingStructure(false)
      return
    }

    setEditingStructure({
      studentFeeId: structureFee._id,
      structureId,
      fee_heads: res.result.fee_heads.map(head => ({
        name: head.name,
        amount: head.amount,
        frequency: head.frequency,
        mandatory: head.mandatory ?? true,
      })),
    })
  } catch (err) {
    console.error('[openEditStructure] error:', err)
    setStructureError('Failed to load fee structure. Please try again.')
  } finally {
    setIsSavingStructure(false)
  }
}


  /**
   * Save updated fee structure.
   * 1. Calls feeStructureApi.update() with new fee_heads — backend pre-save hook
   *    recomputes total_annual_amount automatically.
   * 2. Calls studentFeeApi.update() to sync the student's own record (totals, status).
   */
  // async function handleSaveStructure() {
  //   if (!editingStructure) return
  //   if (!editingStructure.studentFeeId || !editingStructure.structureId) {
  //     setStructureError('Fee record IDs are missing. Please reload and try again.')
  //     return
  //   }

  //   const newTotal  = calcTotalFromHeads(editingStructure.fee_heads)
  //   const parentFee = feesForYear.find(f => f._id === editingStructure.studentFeeId)
  //   if (!parentFee) {
  //     setStructureError('Fee record not found. Please reload.')
  //     return
  //   }

  //   const newDue = Math.max(0, newTotal - Number(parentFee.paid_amount))
  //   const newStatus: StudentFeeStatus =
  //     newDue === 0
  //       ? 'paid'
  //       : Number(parentFee.paid_amount) > 0
  //         ? 'partial'
  //         : parentFee.status === 'overdue'
  //           ? 'overdue'
  //           : 'pending'

  //   const newSnapshot: FeeSnapshotItem[] = editingStructure.fee_heads.map(h => ({
  //     name: h.name,
  //     amount: h.amount,
  //     frequency: h.frequency,
  //   }))

  //   setIsSavingStructure(true)
  //   setStructureError(null)
  //   try {
  //     // 1. Update the fee structure template (fee_heads only; backend pre-save hook
  //     //    recalculates total_annual_amount automatically)
  //     const structureRes = await feeStructureApi.update(editingStructure.structureId, {
  //       fee_heads: editingStructure.fee_heads,
  //     })
  //     if (!structureRes.success) {
  //       setStructureError(structureRes.message ?? 'Failed to update fee structure.')
  //       return
  //     }

  //     // 2. Sync student fee record — update snapshot, totals and status
  //     const studentRes = await studentFeeApi.update(editingStructure.studentFeeId, {
  //       fee_snapshot: newSnapshot,
  //       total_amount: newTotal,
  //       due_amount:   newDue,
  //       paid_amount:  Number(parentFee.paid_amount),
  //       status:       newStatus,
  //     })
  //     if (!studentRes.success) {
  //       setStructureError(studentRes.message ?? 'Failed to update student fee record.')
  //       return
  //     }

  //     setShowEditStructureDialog(false)
  //     await refreshFees()
  //   } catch (err) {
  //     console.error('[FeeStructure] Unexpected error:', err)
  //     setStructureError('An unexpected error occurred. Please try again.')
  //   } finally {
  //     setIsSavingStructure(false)
  //   }
  // }

  // ── Add Payment handler ─────────────────────────────────────────────────────
  async function handleSaveStructure() {
  if (!editingStructure) return
  if (!editingStructure.studentFeeId || !editingStructure.structureId) {
    setStructureError('Fee record IDs are missing. Please reload and try again.')
    return
  }

  setIsSavingStructure(true)
  setStructureError(null)

  try {
    // 1. Update the fee structure template
    const structureRes = await feeStructureApi.update(editingStructure.structureId, {
      fee_heads: editingStructure.fee_heads,
    })
    if (!structureRes.success) {
      setStructureError(structureRes.message ?? 'Failed to update fee structure.')
      return
    }

    // Frequency multiplier logic (mirrors backend shouldIncludeFeeHead)
    const shouldInclude = (frequency: string, termOrder: number): boolean => {
      switch (frequency) {
        case 'one_time':
        case 'annual':
          return termOrder === 1
        case 'monthly':
          return true
        case 'quarterly':
          return termOrder % 3 === 1
        case 'half_yearly':
          return termOrder % 6 === 1
        default:
          return true
      }
    }

    // 2. Update EACH student fee record with correct snapshot for its term
    const updatePromises = feesForYear.map(async (fee) => {
      // Get term_order for this fee's term
      const termObj = fee.term_id
      const termOrder: number =
        typeof termObj === 'object' && 'term_order' in termObj
          ? (termObj.term_order ?? 1)
          : 1

      // Filter fee heads applicable for this term
      const applicableHeads = editingStructure.fee_heads.filter(h =>
        shouldInclude(h.frequency, termOrder)
      )

      const newSnapshot = applicableHeads.map(h => ({
        name: h.name,
        amount: h.amount,
        frequency: h.frequency,
      }))

      const newTotal = applicableHeads.reduce((s, h) => s + Number(h.amount), 0)
      const newDue = Math.max(0, newTotal - Number(fee.paid_amount))
      const newStatus: StudentFeeStatus =
        newDue === 0
          ? 'paid'
          : Number(fee.paid_amount) > 0
            ? 'partial'
            : fee.status === 'overdue'
              ? 'overdue'
              : 'pending'

      return studentFeeApi.update(fee._id, {
        fee_snapshot: newSnapshot,
        total_amount: newTotal,
        due_amount: newDue,
        paid_amount: Number(fee.paid_amount),
        status: newStatus,
      })
    })

    const results = await Promise.all(updatePromises)
    const failed = results.find(r => !r.success)
    if (failed) {
      setStructureError(failed.message ?? 'Failed to update one or more student fee records.')
      return
    }

    setShowEditStructureDialog(false)
    await refreshFees()
  } catch (err) {
    console.error('[FeeStructure] Unexpected error:', err)
    setStructureError('An unexpected error occurred. Please try again.')
  } finally {
    setIsSavingStructure(false)
  }
}


  function openAddPayment() {
    fetchClassesAndTeachers()
    const unpaidFees = feesForYear.filter(
      f => ['pending', 'overdue'].includes(f.status) ||
           (f.status === 'partial' && Number(f.due_amount) > 0)
    )
    const firstPending = unpaidFees[0] ?? null
    const termId = firstPending
      ? extractId(firstPending.term_id as string | { _id: string })
      : ''
    setPaymentForm({
      student_fee_id: firstPending?._id ?? '',
      term_id: termId,
      amount_paid: firstPending ? String(firstPending.due_amount) : '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      transaction_id: '',
      collected_by: '',
      remarks: '',
    })
    setPaymentError(null)
    setShowAddPaymentDialog(true)
  }

  function handleFeeTermSelect(feeId: string) {
    if (!feeId) {
      setPaymentForm(prev => ({ ...prev, student_fee_id: '', term_id: '', amount_paid: '' }))
      return
    }
    const sel = fees.find(f => f._id === feeId)
    if (!sel) {
      setPaymentForm(prev => ({ ...prev, student_fee_id: feeId, term_id: '', amount_paid: '' }))
      return
    }
    const termId = extractId(sel.term_id as string | { _id: string })
    setPaymentForm(prev => ({
      ...prev,
      student_fee_id: feeId,
      term_id: termId,
      amount_paid: String(sel.due_amount),
    }))
  }

  async function handleSavePayment() {
    const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
    if (!instituteId) { setPaymentError('Session data missing. Please refresh and try again.'); return }
    if (!paymentForm.student_fee_id) { setPaymentError('Please select a fee term.'); return }
    if (!paymentForm.amount_paid || Number(paymentForm.amount_paid) <= 0) { setPaymentError('Please enter a valid amount.'); return }
    if (!paymentForm.payment_date) { setPaymentError('Please select a payment date.'); return }

    const selectedFee = fees.find(f => f._id === paymentForm.student_fee_id)
    if (selectedFee && Number(paymentForm.amount_paid) > Number(selectedFee.due_amount)) {
      setPaymentError(`Amount cannot exceed due amount of ${formatCurrency(selectedFee.due_amount)}.`)
      return
    }
    if (selectedFee?.status === 'paid' && Number(selectedFee.due_amount) === 0) {
      setPaymentError('This fee term is already fully paid.')
      return
    }

    setIsSavingPayment(true)
    setPaymentError(null)
    try {
      const res = await feeReceiptApi.create({
        institute_id:   instituteId,
        student_id:     studentId,
        student_fee_id: paymentForm.student_fee_id,
        term_id:        paymentForm.term_id || null,
        amount_paid:    Number(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        payment_date:   paymentForm.payment_date,
        ...(paymentForm.transaction_id ? { transaction_id: paymentForm.transaction_id } : {}),
        ...(paymentForm.collected_by   ? { collected_by:   paymentForm.collected_by }   : {}),
        ...(paymentForm.remarks        ? { remarks:        paymentForm.remarks }         : {}),
      })
      if (res.success) {
        setShowAddPaymentDialog(false)
        setPaymentForm({
          student_fee_id: '', term_id: '', amount_paid: '',
          payment_method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          transaction_id: '', collected_by: '', remarks: '',
        })
        await refreshFees()
      } else {
        setPaymentError(res.message ?? 'Failed to record payment.')
      }
    } catch (err) {
      console.error('[AddPayment] Unexpected error:', err)
      setPaymentError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSavingPayment(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setIsDeletingRecord(true)
    setDeleteError(null)
    try {
      const res =
        deleteTarget.type === 'receipt'
          ? await feeReceiptApi.delete(deleteTarget.id)
          : await studentFeeApi.delete(deleteTarget.id)
      if (res.success) {
        setDeleteTarget(null)
        await refreshFees()
      } else {
        setDeleteError((res as { message?: string }).message ?? 'Delete failed. Please try again.')
      }
    } catch (err) {
      console.error('[Delete] Unexpected error:', err)
      setDeleteError('An unexpected error occurred. Please try again.')
    } finally {
      setIsDeletingRecord(false)
    }
  }

  // ── Create Fee helpers ──────────────────────────────────────────────────────

  async function fetchClassesAndTeachers() {
    const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
    if (!instituteId) return

    setLoadingClasses(true)
    try {
      const res = await classesApi.getAll({ instituteId, status: 'active' })
      if (res.success && res.result) setClasses(res.result as ClassMaster[])
    } catch (e) { console.error('[FeesTab] fetchClasses error:', e) }
    finally { setLoadingClasses(false) }

    setLoadingTeachers(true)
    try {
      const res = await teachersApi.getAll({ institute_id: instituteId, status: 'active' })
      if (res.success && res.result) setTeachers(res.result as Teacher[])
    } catch (e) { console.error('[FeesTab] fetchTeachers error:', e) }
    finally { setLoadingTeachers(false) }
  }

  async function fetchBatchesForClass(classId: string) {
    if (!classId) { setBatches([]); return }
    setLoadingBatches(true)
    try {
      const res = await classesApi.getBatchesByClass(classId)
      if (res.success && res.result) setBatches(res.result as CoachingBatch[])
      else setBatches([])
    } catch (e) { console.error('[FeesTab] fetchBatches error:', e); setBatches([]) }
    finally { setLoadingBatches(false) }
  }

  function openCreateFeeDialog() {
    const ref = fees[0]
    const seedClassId = ref
      ? (typeof ref.class_id === 'object' ? (ref.class_id as { _id: string })._id : ref.class_id)
      : (propClassId ?? '')
    const seedBatchId = ref
      ? extractId(ref.batch_id as string | { _id: string } | null)
      : (propBatchId ?? '')

    setSelectedClassId(seedClassId ?? '')
    setSelectedBatchId(seedBatchId ?? '')
    setCreateFeeForm({
      academic_year: ref?.academic_year ?? '',
      fee_heads: [emptyFeeHead()],
      term_name: '',
      term_order: '',
      start_date: '',
      due_date: '',
      late_fee_amount: '',
    })
    setCreateFeeStep(1)
    setCreateFeeError(null)
    fetchClassesAndTeachers()
    if (seedClassId) fetchBatchesForClass(seedClassId)
    setShowCreateFeeDialog(true)
  }

  function updateFeeHead(index: number, field: keyof FeeHead, value: string | number | boolean) {
    setCreateFeeForm(prev => {
      const heads = [...prev.fee_heads]
      heads[index] = { ...heads[index], [field]: value }
      return { ...prev, fee_heads: heads }
    })
  }

  function addFeeHead() {
    setCreateFeeForm(prev => ({ ...prev, fee_heads: [...prev.fee_heads, emptyFeeHead()] }))
  }

  function removeFeeHead(index: number) {
    setCreateFeeForm(prev => ({ ...prev, fee_heads: prev.fee_heads.filter((_, i) => i !== index) }))
  }

  function validateCreateStep1(): string | null {
    if (!createFeeForm.academic_year.trim()) return 'Academic year is required (e.g., 2025-26).'
    if (!selectedClassId) return 'Please select a class.'
    if (createFeeForm.fee_heads.length === 0) return 'At least one fee component is required.'
    for (const h of createFeeForm.fee_heads) {
      if (!h.name.trim()) return 'Each fee component must have a name.'
      if (!h.amount || Number(h.amount) <= 0) return `Amount for "${h.name || 'a component'}" must be greater than 0.`
    }
    return null
  }

  function validateCreateStep2(): string | null {
    if (!createFeeForm.term_name.trim()) return 'Term name is required (e.g., April).'
    if (!createFeeForm.start_date) return 'Start date is required.'
    if (!createFeeForm.due_date) return 'Due date is required.'
    if (new Date(createFeeForm.due_date) < new Date(createFeeForm.start_date))
      return 'Due date cannot be before the start date.'
    return null
  }

  /**
   * Main create-fee flow:
   *  A. Create (or reuse) Fee Structure
   *  B. Create (or reuse) Fee Term — if a term with the same name already exists
   *     for this institute + academic year, silently reuse it instead of erroring.
   *  C. Generate Student Fee record
   */
  async function handleConfirmCreateFee() {
    const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
    if (!instituteId) { setCreateFeeError('Session data missing. Please refresh and try again.'); return }

    const classId   = selectedClassId || (fees[0] ? (typeof fees[0].class_id === 'object' ? (fees[0].class_id as { _id: string })._id : fees[0].class_id) : propClassId) || ''
    const sectionId = propSectionId ?? null
    const batchId   = selectedBatchId || (fees[0] ? extractId(fees[0].batch_id as string | { _id: string } | null) : propBatchId) || null

    if (!classId) { setCreateFeeError('Please select a class.'); return }

    setIsSavingFee(true)
    setCreateFeeError(null)
    try {
      // ── Step A: Create or reuse Fee Structure ──────────────────────────────
      let feeStructureId: string

      const structureRes = await feeStructureApi.create({
        institute_id:  instituteId,
        academic_year: createFeeForm.academic_year.trim(),
        class_id:      classId,
        section_id:    sectionId || null,
        batch_id:      batchId   || null,
        fee_heads:     createFeeForm.fee_heads.map(h => ({
          name:      h.name.trim(),
          amount:    Number(h.amount),
          frequency: h.frequency,
          mandatory: h.mandatory,
        })),
        status: 'active',
      })

      if (!structureRes.success || !structureRes.result) {
        // On conflict (409 / "already exists") — attempt to reuse existing structure
        const isConflict =
          (structureRes as any).statusCode === 409 ||
          structureRes.message?.toLowerCase().includes('already exists')

        if (isConflict) {
          const existingRes = await feeStructureApi.getAll()
          const existing = existingRes.result?.find(s =>
            s.status === 'active' &&
            s.academic_year === createFeeForm.academic_year.trim() &&
            (batchId
              ? extractId(s.batch_id as string | { _id: string } | null) === batchId
              : (typeof s.class_id === 'object' ? (s.class_id as any)._id : s.class_id) === classId)
          )
          if (!existing) {
            setCreateFeeError(structureRes.message ?? 'Could not create or find the fee structure.')
            setIsSavingFee(false)
            return
          }
          feeStructureId = existing._id
        } else {
          setCreateFeeError(structureRes.message ?? 'Could not create the fee structure. Please try again.')
          setIsSavingFee(false)
          return
        }
      } else {
        feeStructureId = structureRes.result._id
      }

      // ── Step B: Create or reuse Fee Term ──────────────────────────────────
      // If a term with the same name already exists for this institute + year,
      // silently reuse it — no error shown to the user.
      let termId: string

      const termRes = await feeTermApi.create({
        institute_id:    instituteId,
        academic_year:   createFeeForm.academic_year.trim(),
        name:            createFeeForm.term_name.trim(),
        start_date:      createFeeForm.start_date,
        due_date:        createFeeForm.due_date,
        ...(createFeeForm.term_order      ? { term_order:      Number(createFeeForm.term_order) }      : {}),
        ...(createFeeForm.late_fee_amount ? { late_fee_amount: Number(createFeeForm.late_fee_amount) } : {}),
        status: 'active',
      })

      if (!termRes.success || !termRes.result) {
        // Check whether this is a "term already exists" conflict
        const isDuplicateTerm =
          (termRes as any).statusCode === 409 ||
          termRes.message?.toLowerCase().includes('already exists')

        if (isDuplicateTerm) {
          // Fetch existing terms for this institute + year and find the matching one
          const existingTermsRes = await feeTermApi.getByInstituteAndYear(
            instituteId,
            createFeeForm.academic_year.trim()
          )
          const existingTerm = existingTermsRes.result?.find(
            t => t.name.trim().toLowerCase() === createFeeForm.term_name.trim().toLowerCase()
          )
          if (!existingTerm) {
            // Can't find the term — surface the original error
            setCreateFeeError(termRes.message ?? 'Could not create or find the fee term. Please try again.')
            setIsSavingFee(false)
            return
          }
          // Silently reuse the existing term
          termId = existingTerm._id
        } else {
          setCreateFeeError(termRes.message ?? 'Could not create the fee term. Please try again.')
          setIsSavingFee(false)
          return
        }
      } else {
        termId = termRes.result._id
      }

      // ── Step C: Generate Student Fee record ────────────────────────────────
      const generateRes = await studentFeeApi.generate({
        institute_id:     instituteId,
        student_id:       studentId,
        class_id:         classId,
        section_id:       sectionId || null,
        batch_id:         batchId   || null,
        academic_year:    createFeeForm.academic_year.trim(),
        term_id:          termId,
        fee_structure_id: feeStructureId,
      })

      if (!generateRes.success) {
        setCreateFeeError(generateRes.message ?? 'Could not generate the student fee record. Please try again.')
        setIsSavingFee(false)
        return
      }

      setShowCreateFeeDialog(false)
      await refreshFees()
    } catch {
      setCreateFeeError('Something went wrong. Please check your connection and try again.')
    } finally {
      setIsSavingFee(false)
    }
  }

  // ── Download receipt ────────────────────────────────────────────────────────
  function downloadReceipt(receipt: FeeReceipt, parentFee?: StudentFee) {
    const instituteName =
      typeof window !== 'undefined' ? (localStorage.getItem('instituteName') ?? 'Institute') : 'Institute'
    const tName = parentFee ? termLabel(parentFee.term_id) : 'Fee Payment'
    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Receipt ${receipt.receipt_number}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:13px;color:#222;background:#fff}
        .page{max-width:600px;margin:0 auto;padding:32px 28px}
        .header{text-align:center;border-bottom:2px solid #1897C6;padding-bottom:16px;margin-bottom:20px}
        .header h1{font-size:20px;color:#1897C6}
        .header p{font-size:12px;color:#555;margin-top:4px}
        .badge{display:inline-block;background:#e0f7fa;color:#1897C6;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;margin-top:6px}
        .section{margin-bottom:16px}
        .section-title{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}
        .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #eee}
        .row:last-child{border-bottom:none}
        .label{color:#555}.value{font-weight:600;color:#222}
        .amount-box{background:linear-gradient(135deg,#1897C6,#67BAC3);color:white;border-radius:10px;padding:16px 20px;text-align:center;margin:20px 0}
        .amount-box .amt{font-size:28px;font-weight:700}
        .amount-box .lbl{font-size:12px;opacity:.85;margin-top:2px}
        .footer{text-align:center;font-size:11px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:12px}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>
      <div class="page">
        <div class="header"><h1>${instituteName}</h1><p>Fee Payment Receipt</p><span class="badge">PAID</span></div>
        <div class="section">
          <div class="section-title">Receipt Details</div>
          <div class="row"><span class="label">Receipt No.</span><span class="value">${receipt.receipt_number}</span></div>
          <div class="row"><span class="label">Payment Date</span><span class="value">${new Date(receipt.payment_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span></div>
          <div class="row"><span class="label">Payment Method</span><span class="value">${receipt.payment_method.toUpperCase()}</span></div>
          ${receipt.transaction_id?`<div class="row"><span class="label">Transaction ID</span><span class="value">${receipt.transaction_id}</span></div>`:''}
        </div>
        <div class="section">
          <div class="section-title">Fee Details</div>
          <div class="row"><span class="label">Term</span><span class="value">${tName}</span></div>
          ${parentFee?`<div class="row"><span class="label">Academic Year</span><span class="value">${parentFee.academic_year}</span></div>`:''}
          ${parentFee?`<div class="row"><span class="label">Total Fee</span><span class="value">₹${Number(parentFee.total_amount).toLocaleString('en-IN')}</span></div>`:''}
        </div>
        <div class="amount-box"><div class="amt">₹${Number(receipt.amount_paid).toLocaleString('en-IN')}</div><div class="lbl">Amount Paid</div></div>
        ${receipt.remarks?`<div class="section"><div class="section-title">Remarks</div><p style="color:#555;font-size:12px">${receipt.remarks}</p></div>`:''}
        <div class="footer"><p>This is a computer-generated receipt and does not require a signature.</p><p style="margin-top:4px">Generated on ${new Date().toLocaleString('en-IN')}</p></div>
      </div></body></html>`
    const win = window.open('', '_blank', 'width=650,height=800')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      

      {/* ── Notices ────────────────────────────────────────────────────────── */}
      {loadingNotices ? (
        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading notices...
        </div>
      ) : notices.length > 0 && (
        <div className="space-y-2">
          {notices.map(notice => (
            <Card key={notice._id} className="border border-orange-200 bg-orange-50/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-orange-900 break-words">{notice.title}</p>
                        {notice.isPinned && <Badge className="bg-orange-500 text-white text-xs shrink-0">Pinned</Badge>}
                        {notice.category && (
                          <Badge variant="outline" className="text-xs shrink-0 capitalize border-orange-300 text-orange-700">
                            {notice.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-orange-800 mt-1 line-clamp-2 break-words">{notice.content}</p>
                      {notice.publishDate && (
                        <p className="text-xs text-orange-600/70 mt-1.5">
                          Last updated: {formatDate(notice.publishDate)}
                          {notice.expiryDate && ` • Expires: ${formatDate(notice.expiryDate)}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 shrink-0 text-blue-500 hover:text-orange-700 hover:bg-orange-100"
                    onClick={() => { setActiveNotice(notice); setShowNoticeDialog(true) }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Fee Management</h2>
          {selectedYear && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="bg-[#1897C6]">{selectedYear}</Badge>
              <span className="text-sm text-muted-foreground">Complete financial overview and payment history</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={openCreateFeeDialog}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Create Fee</span>
          </Button>
          {fees.length > 0 && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={openEditStructure}>
                <Edit className="h-4 w-4" /><span className="hidden sm:inline">Edit Structure</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={openAddPayment}>
                <DollarSign className="h-4 w-4" /><span className="hidden sm:inline">Add Payment</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Loading / Empty ─────────────────────────────────────────────────── */}
      {loadingFees ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" />
          <span className="ml-2 text-sm text-muted-foreground">Loading fee records...</span>
        </div>
      ) : fees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-base">No fee records found</p>
              <p className="text-sm text-muted-foreground mt-1">
                This student has no fee records yet. Create a fee structure and term to get started.
              </p>
            </div>
            <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-2" onClick={openCreateFeeDialog}>
              <Plus className="h-4 w-4" /> Create Fee Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Year Selector ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays className="h-5 w-5 text-[#1897C6]" />
                <Label className="text-sm font-medium">Academic Year:</Label>
                <Badge
                  variant={selectedYear === '' ? 'default' : 'outline'}
                  className={`cursor-pointer ${selectedYear === '' ? 'bg-[#1897C6]' : ''}`}
                  onClick={() => { setSelectedYear(''); setPendingPage(1); setPaidPage(1); setHistoryPage(1) }}
                >All Years</Badge>
                {feeYears.map(year => (
                  <Badge
                    key={year}
                    variant={year === selectedYear ? 'default' : 'outline'}
                    className={`cursor-pointer ${year === selectedYear ? 'bg-[#1897C6]' : ''}`}
                    onClick={() => { setSelectedYear(year); setPendingPage(1); setPaidPage(1); setHistoryPage(1) }}
                  >{year}</Badge>
                ))}
              </div>
            </CardHeader>
          </Card>

          {/* ── Summary Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { border: 'border-2', icon: FileText, iconBg: 'bg-gray-100', iconColor: 'text-gray-600', label: 'Total Fee Amount', value: formatCurrency(totalAmount), sub: 'Academic year fees', valueColor: '' },
              { border: 'border-2 border-green-200 bg-green-50', icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-600', label: 'Amount Paid', value: formatCurrency(totalPaid), sub: `${paidFees.length} successful payment${paidFees.length !== 1 ? 's' : ''}`, valueColor: 'text-green-600' },
              { border: 'border-2 border-red-200 bg-red-50', icon: AlertCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600', label: 'Amount Due', value: formatCurrency(totalDue), sub: `${pendingFees.length} pending payment${pendingFees.length !== 1 ? 's' : ''}`, valueColor: 'text-red-600' },
              { border: 'border-2 border-blue-200 bg-blue-50', icon: TrendingUp, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', label: 'Payment Progress', value: `${paymentPct}%`, sub: null, valueColor: 'text-blue-600', progress: true },
            ].map(({ border, icon: Icon, iconBg, iconColor, label, value, sub, valueColor, progress }) => (
              <Card key={label} className={border}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
                  {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                  {progress && <Progress value={paymentPct} className="h-2 mt-2" />}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Overdue Alert ──────────────────────────────────────────────── */}
          {feesForYear.some(f => f.status === 'overdue') && (
            <Card className="border-2 border-red-300 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">⚠️ Attention: Overdue Payments</p>
                    <p className="text-sm text-red-800 mt-1">
                      You have {feesForYear.filter(f => f.status === 'overdue').length} overdue payment
                      {feesForYear.filter(f => f.status === 'overdue').length !== 1 ? 's' : ''}.
                      Please settle immediately to avoid additional late fees.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {feesForYear.filter(f => f.status === 'overdue').map(f => (
                        <div key={f._id} className="inline-flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-red-200">
                          <span className="text-xs text-muted-foreground">{termLabel(f.term_id)}</span>
                          <span className="font-bold text-red-600 text-sm">{formatCurrency(f.due_amount)}</span>
                          {f.is_late_fee_applied && f.late_fee_applied && (
                            <Badge variant="destructive" className="text-xs">+{formatCurrency(f.late_fee_applied)} Late Fee</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Fee Sub-tabs ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="border-b pb-3">
              <div className="flex gap-2 flex-wrap">
                {(['pending', 'paid', 'structure', 'history'] as const).map(tab => (
                  <Button
                    key={tab}
                    variant={feeTab === tab ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFeeTab(tab)}
                    className={feeTab === tab ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3]' : ''}
                  >
                    {tab === 'pending'   && <Clock       className="h-4 w-4 mr-1.5" />}
                    {tab === 'paid'      && <CheckCircle className="h-4 w-4 mr-1.5" />}
                    {tab === 'structure' && <FileText    className="h-4 w-4 mr-1.5" />}
                    {tab === 'history'   && <Clock       className="h-4 w-4 mr-1.5" />}
                    {capitalize(tab)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-4">

              {/* PENDING TAB */}
              {feeTab === 'pending' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-2">Pending, partial, and overdue term fees</p>
                  {pendingFees.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">All fees are paid{selectedYear ? ` for ${selectedYear}` : ''}!</p>
                    </div>
                  ) : paginatedPending.map(fee => (
                    <Card key={fee._id} className={`border-2 ${fee.status === 'overdue' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fee.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                              <FileText className={`h-5 w-5 ${fee.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`} />
                            </div>
                            <div>
                              <p className="font-semibold">{termLabel(fee.term_id)}</p>
                              <p className="text-sm text-muted-foreground">{fee.academic_year}</p>
                              <div className="mt-2">{getStatusBadge(fee.status)}</div>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="bg-white rounded-lg px-3 py-1.5 border">
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="font-bold">{formatCurrency(fee.total_amount)}</p>
                            </div>
                            <div className="bg-white rounded-lg px-3 py-1.5 border border-red-200">
                              <p className="text-xs text-muted-foreground">Due</p>
                              <p className={`font-bold ${fee.status === 'overdue' ? 'text-red-600' : 'text-yellow-700'}`}>{formatCurrency(fee.due_amount)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-end">
                          <Button
                            variant="ghost" size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs"
                            onClick={() => setDeleteTarget({ type: 'studentFee', id: fee._id, label: `${termLabel(fee.term_id)} (${fee.academic_year})` })}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Fee Record
                          </Button>
                        </div>
                        {fee.due_date && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            Due Date: <span className="font-medium">{formatDate(fee.due_date)}</span>
                            {fee.is_late_fee_applied && fee.late_fee_applied && (
                              <Badge variant="destructive" className="ml-2 text-xs">+{formatCurrency(fee.late_fee_applied)} Late Fee</Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {pendingFees.length > PAGE_SIZE && (
                    <Pagination currentPage={pendingPage} totalPages={Math.ceil(pendingFees.length / PAGE_SIZE)} onPageChange={setPendingPage} />
                  )}
                </div>
              )}

              {/* PAID TAB */}
              {feeTab === 'paid' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Paid and partially paid terms</p>
                    <p className="text-sm text-muted-foreground">{paidFees.length} term{paidFees.length !== 1 ? 's' : ''}</p>
                  </div>
                  {paidFees.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No paid terms found{selectedYear ? ` for ${selectedYear}` : ''}.</p>
                    </div>
                  ) : paginatedPaid.map(fee => {
                    const termReceipts = feeReceipts.filter(r => receiptMatchesFee(r, fee._id))
                    const isExpanded   = expandedReceipt === fee._id
                    return (
                      <Card key={fee._id} className="border-2 border-green-200 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold">{termLabel(fee.term_id)}</p>
                                <p className="text-sm text-muted-foreground">{fee.academic_year}</p>
                                <div className="mt-1">{getStatusBadge(fee.status)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right space-y-1">
                                <div className="bg-white rounded-lg px-3 py-1.5 border">
                                  <p className="text-xs text-muted-foreground">Paid</p>
                                  <p className="font-bold text-green-600">{formatCurrency(fee.paid_amount)}</p>
                                </div>
                                {Number(fee.due_amount) > 0 && (
                                  <div className="bg-white rounded-lg px-3 py-1.5 border">
                                    <p className="text-xs text-muted-foreground">Remaining</p>
                                    <p className="font-bold text-yellow-600">{formatCurrency(fee.due_amount)}</p>
                                  </div>
                                )}
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setExpandedReceipt(isExpanded ? null : fee._id)}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              {fee.fee_snapshot?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">FEE BREAKDOWN</p>
                                  <div className="space-y-1">
                                    {fee.fee_snapshot.map((item, i) => (
                                      <div key={i} className="flex justify-between text-sm p-2 bg-white rounded-lg border border-green-100">
                                        <span className="text-muted-foreground">{item.name}</span>
                                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {termReceipts.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">PAYMENT RECEIPTS</p>
                                  <div className="space-y-2">
                                    {termReceipts.map(receipt => (
                                      <div key={receipt._id} className="p-3 bg-white rounded-lg border border-green-200 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-sm font-bold text-green-600">{formatCurrency(receipt.amount_paid)}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(receipt.payment_date)} • {capitalize(receipt.payment_method)}</p>
                                          </div>
                                          <Badge className="bg-green-600 text-white text-xs">Paid</Badge>
                                        </div>
                                        {receipt.receipt_number && (
                                          <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                                            <p className="text-xs text-muted-foreground">Receipt No.</p>
                                            <p className="text-xs font-mono font-semibold">{receipt.receipt_number}</p>
                                          </div>
                                        )}
                                        {receipt.transaction_id && (
                                          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                                            <p className="text-xs text-muted-foreground">Transaction ID</p>
                                            <p className="text-xs font-mono font-semibold">{receipt.transaction_id}</p>
                                          </div>
                                        )}
                                        {receipt.collected_by && (
                                          <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                                            <p className="text-xs text-muted-foreground">Collected By</p>
                                            <p className="text-xs font-semibold">
                                              {typeof receipt.collected_by === 'object' && 'full_name' in receipt.collected_by
                                                ? receipt.collected_by.full_name : String(receipt.collected_by)}
                                            </p>
                                          </div>
                                        )}
                                        {receipt.remarks && <p className="text-xs text-muted-foreground">Remarks: {receipt.remarks}</p>}
                                        <div className="flex justify-end pt-1">
                                          <Button
                                            variant="ghost" size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs h-7"
                                            onClick={() => setDeleteTarget({ type: 'receipt', id: receipt._id, label: `Receipt ${receipt.receipt_number ?? ''} — ${formatCurrency(receipt.amount_paid)}` })}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" /> Delete Receipt
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                  {paidFees.length > PAGE_SIZE && (
                    <Pagination currentPage={paidPage} totalPages={Math.ceil(paidFees.length / PAGE_SIZE)} onPageChange={setPaidPage} />
                  )}
                </div>
              )}

              {/* STRUCTURE TAB */}
              {feeTab === 'structure' && (
                <div className="space-y-3">
                  {!structureFee ? (
                    <div className="text-center py-8">
                      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No fee structure available{selectedYear ? ` for ${selectedYear}` : ''}.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Fee components{selectedYear ? ` for ${selectedYear}` : ''}</p>
                        <Badge variant="outline">{structureFee.fee_snapshot?.length ?? 0} items</Badge>
                      </div>
                      {feesForYear.map(fee => fee.fee_snapshot?.length > 0 && (
                        <Card key={fee._id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-semibold">{termLabel(fee.term_id)}</p>
                              {getStatusBadge(fee.status)}
                            </div>
                            <div className="space-y-2">
                              {fee.fee_snapshot.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                  <div>
                                    <p className="text-sm font-medium">{item.name}</p>
                                    {item.frequency && (
                                      <p className="text-xs text-muted-foreground capitalize">{item.frequency.replace('_', ' ')}</p>
                                    )}
                                  </div>
                                  <p className="font-bold">{formatCurrency(item.amount)}</p>
                                </div>
                              ))}
                            </div>
                            <Separator className="my-3" />
                            <div className="flex justify-between">
                              <p className="font-bold">Term Total</p>
                              <p className="font-bold text-[#1897C6]">{formatCurrency(fee.total_amount)}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#1897C6]/10 to-[#67BAC3]/10 rounded-lg border-2 border-[#1897C6]/30">
                        <p className="font-bold text-lg">Total Annual Fee</p>
                        <p className="text-2xl font-bold text-[#1897C6]">{formatCurrency(totalAmount)}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* HISTORY TAB */}
              {feeTab === 'history' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">All payment transactions{selectedYear ? ` for ${selectedYear}` : ''}</p>
                    <p className="text-sm text-muted-foreground">{yearReceipts.length} transaction{yearReceipts.length !== 1 ? 's' : ''}</p>
                  </div>
                  {yearReceipts.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No payment history found{selectedYear ? ` for ${selectedYear}` : ''}.</p>
                    </div>
                  ) : paginatedHistory.map(receipt => {
                    const parentFee = feesForYear.find(f => receiptMatchesFee(receipt, f._id))
                    return (
                      <Card key={receipt._id} className="border-2 border-green-200 bg-green-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold">{parentFee ? termLabel(parentFee.term_id) : 'Payment'}</p>
                                <p className="text-sm text-muted-foreground">{formatDate(receipt.payment_date)} • {capitalize(receipt.payment_method)}</p>
                                {receipt.receipt_number && <p className="text-xs text-muted-foreground mt-0.5 font-mono">Receipt: {receipt.receipt_number}</p>}
                                {receipt.transaction_id && <p className="text-xs text-muted-foreground mt-0.5">Txn: {receipt.transaction_id}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-600">{formatCurrency(receipt.amount_paid)}</p>
                              <Badge className="bg-green-600 mt-1">Paid</Badge>
                            </div>
                          </div>
                          {(receipt.collected_by || receipt.remarks) && (
                            <div className="mt-3 pt-3 border-t space-y-1">
                              {receipt.collected_by && (
                                <p className="text-xs text-muted-foreground">
                                  Collected By:{' '}
                                  <span className="font-semibold text-foreground">
                                    {typeof receipt.collected_by === 'object' && 'full_name' in receipt.collected_by
                                      ? receipt.collected_by.full_name : String(receipt.collected_by)}
                                  </span>
                                </p>
                              )}
                              {receipt.remarks && <p className="text-xs text-muted-foreground">Remarks: {receipt.remarks}</p>}
                            </div>
                          )}
                          <div className="mt-2 pt-2 border-t flex justify-end">
                            <Button
                              variant="ghost" size="sm"
                              className="text-[#1897C6] hover:text-[#1276a0] hover:bg-blue-50 gap-1.5 text-xs h-7"
                              onClick={() => downloadReceipt(receipt, parentFee)}
                            >
                              <Download className="h-3.5 w-3.5" /> Download
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs h-7"
                              onClick={() => setDeleteTarget({ type: 'receipt', id: receipt._id, label: `Receipt ${receipt.receipt_number ?? ''} — ${formatCurrency(receipt.amount_paid)}` })}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete Receipt
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  {yearReceipts.length > PAGE_SIZE && (
                    <Pagination currentPage={historyPage} totalPages={Math.ceil(yearReceipts.length / PAGE_SIZE)} onPageChange={setHistoryPage} />
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Edit Fee Structure Dialog                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showEditStructureDialog} onOpenChange={setShowEditStructureDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto w-full max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-[#1897C6]" /> Edit Fee Structure
            </DialogTitle>
            <DialogDescription>
              Update fee components. Changes will update the template and recalculate this student's due amount.
            </DialogDescription>
          </DialogHeader>

          {editingStructure && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-1">
              {editingStructure.fee_heads.map((head, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3 relative">
                  {editingStructure.fee_heads.length > 1 && (
                    <button
                      type="button"
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
                      onClick={() =>
                        setEditingStructure(prev => prev
                          ? { ...prev, fee_heads: prev.fee_heads.filter((_, i) => i !== idx) }
                          : prev)
                      }
                      title="Remove component"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Component Name *</Label>
                    <Input
                      value={head.name}
                      placeholder="e.g., Tuition Fee"
                      className="mt-1"
                      onChange={e =>
                        setEditingStructure(prev => {
                          if (!prev) return prev
                          const heads = [...prev.fee_heads]
                          heads[idx] = { ...heads[idx], name: e.target.value }
                          return { ...prev, fee_heads: heads }
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount (₹) *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={head.amount}
                        className="mt-1"
                        onChange={e =>
                          setEditingStructure(prev => {
                            if (!prev) return prev
                            const heads = [...prev.fee_heads]
                            heads[idx] = { ...heads[idx], amount: Number(e.target.value) }
                            return { ...prev, fee_heads: heads }
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frequency *</Label>
                      <select
                        value={head.frequency}
                        className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        onChange={e =>
                          setEditingStructure(prev => {
                            if (!prev) return prev
                            const heads = [...prev.fee_heads]
                            heads[idx] = { ...heads[idx], frequency: e.target.value as FeeHead['frequency'] }
                            return { ...prev, fee_heads: heads }
                          })
                        }
                      >
                        <option value="one_time">One Time</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="half_yearly">Half Yearly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={head.mandatory ?? true}
                      onChange={e =>
                        setEditingStructure(prev => {
                          if (!prev) return prev
                          const heads = [...prev.fee_heads]
                          heads[idx] = { ...heads[idx], mandatory: e.target.checked }
                          return { ...prev, fee_heads: heads }
                        })
                      }
                      className="rounded border-input"
                    />
                    <span className="text-xs text-muted-foreground">Mandatory</span>
                  </label>
                </div>
              ))}

              <Button
                type="button" variant="outline" size="sm" className="w-full gap-1.5"
                onClick={() =>
                  setEditingStructure(prev => prev
                    ? { ...prev, fee_heads: [...prev.fee_heads, { name: '', amount: 0, frequency: 'monthly', mandatory: true }] }
                    : prev)
                }
              >
                <Plus className="h-4 w-4" /> Add Fee Component
              </Button>

              {/* Live totals */}
              {/* <div className="p-4 border-2 border-[#1897C6]/30 rounded-lg bg-[#1897C6]/5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Term Total</span>
                  <span className="font-bold text-[#1897C6]">
                    {formatCurrency(editingStructure.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(feesForYear.find(f => f._id === editingStructure.studentFeeId)?.paid_amount ?? 0)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">New Due Amount</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(Math.max(0,
                      editingStructure.fee_heads.reduce((s, h) => s + Number(h.amount), 0) -
                      Number(feesForYear.find(f => f._id === editingStructure.studentFeeId)?.paid_amount ?? 0)
                    ))}
                  </span>
                </div>
              </div> */}

              {/* Live totals - show based on term_order=1 (all heads apply) */}
              <div className="p-4 border-2 border-[#1897C6]/30 rounded-lg bg-[#1897C6]/5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">First Term Total (all components)</span>
                  <span className="font-bold text-[#1897C6]">
                    {formatCurrency(editingStructure.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly-only Terms</span>
                  <span className="font-bold text-[#1897C6]">
                    {formatCurrency(
                      editingStructure.fee_heads
                        .filter(h => h.frequency === 'monthly')
                        .reduce((s, h) => s + Number(h.amount), 0)
                    )}
                  </span>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  ⚙️ Each term will be updated based on its frequency rules automatically.
                </p>
              </div>

              {structureError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {structureError}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" onClick={() => setShowEditStructureDialog(false)} disabled={isSavingStructure}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
              disabled={isSavingStructure || !editingStructure || editingStructure.fee_heads.length === 0}
              onClick={handleSaveStructure}
            >
              {isSavingStructure
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                : <><Edit className="h-4 w-4 mr-2" />Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Add Payment Dialog                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-5 w-5 text-[#1897C6]" /> Add Payment
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Record a new fee payment for this student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-1 sm:pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Fee Term *</Label>
                <select
                  value={paymentForm.student_fee_id}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  onChange={e => handleFeeTermSelect(e.target.value)}
                >
                  <option value="">Select term</option>
                  {fees
                    .filter(f => ['pending', 'overdue'].includes(f.status) || (f.status === 'partial' && Number(f.due_amount) > 0))
                    .map(fee => (
                      <option key={fee._id} value={fee._id}>
                        {termLabel(fee.term_id)} — {fee.academic_year} (Due: {formatCurrency(fee.due_amount)})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label>Amount Paid (₹) *</Label>
                <Input
                  type="number" placeholder="Enter amount" value={paymentForm.amount_paid}
                  className="mt-1" min="1"
                  max={paymentForm.student_fee_id ? String(fees.find(f => f._id === paymentForm.student_fee_id)?.due_amount ?? '') : undefined}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <select
                  value={paymentForm.payment_method}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  onChange={e => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <Label>Payment Date *</Label>
                <Input type="date" value={paymentForm.payment_date} className="mt-1"
                  onChange={e => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Transaction ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input placeholder="UPI / Cheque / Reference number" value={paymentForm.transaction_id} className="mt-1"
                  onChange={e => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Collected By <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <select
                  value={paymentForm.collected_by} disabled={loadingTeachers}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  onChange={e => setPaymentForm(prev => ({ ...prev, collected_by: e.target.value }))}
                >
                  <option value="">{loadingTeachers ? 'Loading teachers...' : 'Select teacher'}</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Remarks <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Input placeholder="Any notes about this payment" value={paymentForm.remarks} className="mt-1"
                  onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))} />
              </div>
            </div>
            {paymentError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 shrink-0" /> {paymentError}
              </p>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowAddPaymentDialog(false)} disabled={isSavingPayment}>Cancel</Button>
            <Button
              className="w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
              disabled={isSavingPayment || !paymentForm.student_fee_id || !paymentForm.amount_paid || Number(paymentForm.amount_paid) <= 0 || !paymentForm.payment_date}
              onClick={handleSavePayment}
            >
              {isSavingPayment ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Notice Detail Dialog                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showNoticeDialog} onOpenChange={setShowNoticeDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg mx-auto w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" /> {activeNotice?.title}
            </DialogTitle>
            {activeNotice?.publishDate && (
              <DialogDescription>
                Published: {formatDate(activeNotice.publishDate)}
                {activeNotice.expiryDate && ` • Expires: ${formatDate(activeNotice.expiryDate)}`}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            <p className="text-sm leading-relaxed break-words">{activeNotice?.content}</p>
            {activeNotice?.fullDescription && (
              <><Separator /><p className="text-sm leading-relaxed text-muted-foreground break-words">{activeNotice.fullDescription}</p></>
            )}
            {activeNotice?.docUrl && (() => {
              const fullUrl = buildFileUrl(activeNotice.docUrl) ?? ''
              const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(activeNotice.docUrl)
              return (
                <div className="space-y-2">
                  {isImage && (
                    <div className="rounded-lg overflow-hidden border border-orange-200 max-h-60">
                      <img src={fullUrl} alt="Notice attachment" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#1897C6] hover:underline break-all">
                    <Download className="h-4 w-4 shrink-0" />
                    {isImage ? 'Open Full Image' : 'View Attached Document'}
                  </a>
                </div>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoticeDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Confirm Delete Dialog                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open && !isDeletingRecord) { setDeleteTarget(null); setDeleteError(null) } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Confirm Delete
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground">Are you sure you want to delete:</p>
            <p className="text-sm font-semibold break-words">{deleteTarget?.label}</p>
            {deleteTarget?.type === 'studentFee' && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                ⚠️ Deleting a fee record will also remove all its associated receipts and cannot be recovered.
              </p>
            )}
            {deleteError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 shrink-0" /> {deleteError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={isDeletingRecord}>Cancel</Button>
            <Button variant="destructive" disabled={isDeletingRecord} onClick={handleConfirmDelete}>
              {isDeletingRecord ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" />Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Create Fee Dialog                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showCreateFeeDialog} onOpenChange={open => { if (!open && !isSavingFee) { setShowCreateFeeDialog(false); setCreateFeeError(null) } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto w-full max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#1897C6]" />
              Create Fee Record
              <span className="ml-auto text-xs font-normal text-muted-foreground">Step {createFeeStep} of 3</span>
            </DialogTitle>
            <DialogDescription>
              {createFeeStep === 1 && 'Define the fee components for this student.'}
              {createFeeStep === 2 && 'Set the term period and due date.'}
              {createFeeStep === 3 && 'Review and confirm the fee details.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-1">
            {([1, 2, 3] as const).map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= createFeeStep ? 'bg-[#1897C6]' : 'bg-muted'}`} />
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">

            {/* STEP 1 */}
            {createFeeStep === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Academic Year *</Label>
                    <Input placeholder="e.g., 2025-26" value={createFeeForm.academic_year} className="mt-1"
                      onChange={e => setCreateFeeForm(p => ({ ...p, academic_year: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Class *</Label>
                    <select
                      value={selectedClassId} disabled={loadingClasses}
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60"
                      onChange={e => { setSelectedClassId(e.target.value); setSelectedBatchId(''); fetchBatchesForClass(e.target.value) }}
                    >
                      <option value="">{loadingClasses ? 'Loading...' : 'Select class'}</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.class_name}</option>)}
                    </select>
                  </div>
                </div>
                {selectedClassId && (
                  <div>
                    <Label>Batch <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <select
                      value={selectedBatchId} disabled={loadingBatches}
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60"
                      onChange={e => setSelectedBatchId(e.target.value)}
                    >
                      <option value="">{loadingBatches ? 'Loading...' : 'No batch (class-level)'}</option>
                      {batches.map(b => <option key={b._id} value={b._id ?? ''}>{b.batch_name}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Fee Components *</Label>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addFeeHead}>
                      <Plus className="h-3 w-3" /> Add Component
                    </Button>
                  </div>
                  {createFeeForm.fee_heads.map((head, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-2 relative">
                      {createFeeForm.fee_heads.length > 1 && (
                        <button type="button" className="absolute top-2 right-2 text-red-400 hover:text-red-600" onClick={() => removeFeeHead(idx)} title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">Component Name *</Label>
                        <Input placeholder="e.g., Tuition Fee" value={head.name} className="mt-1" onChange={e => updateFeeHead(idx, 'name', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Amount (₹) *</Label>
                          <Input type="number" min="1" placeholder="0" value={head.amount || ''} className="mt-1" onChange={e => updateFeeHead(idx, 'amount', Number(e.target.value))} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Frequency *</Label>
                          <select value={head.frequency} className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" onChange={e => updateFeeHead(idx, 'frequency', e.target.value)}>
                            <option value="one_time">One Time</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="half_yearly">Half Yearly</option>
                            <option value="annual">Annual</option>
                          </select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={head.mandatory} onChange={e => updateFeeHead(idx, 'mandatory', e.target.checked)} className="rounded border-input" />
                        <span className="text-xs text-muted-foreground">Mandatory</span>
                      </label>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 rounded-lg bg-muted/30 text-sm">
                    <span className="text-muted-foreground">Term Total</span>
                    <span className="font-bold text-[#1897C6]">{formatCurrency(createFeeForm.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}</span>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {createFeeStep === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Term Name *</Label>
                    <Input placeholder="e.g., April" value={createFeeForm.term_name} className="mt-1" onChange={e => setCreateFeeForm(p => ({ ...p, term_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Term Order <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input type="number" min="1" placeholder="e.g., 1" value={createFeeForm.term_order} className="mt-1" onChange={e => setCreateFeeForm(p => ({ ...p, term_order: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" value={createFeeForm.start_date} className="mt-1" onChange={e => setCreateFeeForm(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Due Date *</Label>
                    <Input type="date" value={createFeeForm.due_date} className="mt-1" onChange={e => setCreateFeeForm(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Late Fee Amount (₹) <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="number" min="0" placeholder="e.g., 200" value={createFeeForm.late_fee_amount} className="mt-1" onChange={e => setCreateFeeForm(p => ({ ...p, late_fee_amount: e.target.value }))} />
                </div>
                {/* Helpful note about term reuse */}
                <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-2">
                  💡 If a fee term with this name already exists for the selected academic year, it will be reused automatically.
                </p>
              </>
            )}

            {/* STEP 3 */}
            {createFeeStep === 3 && (
              <div className="space-y-3">
                <div className="p-3 border rounded-lg space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Structure</p>
                  <p className="text-sm">Academic Year: <span className="font-medium">{createFeeForm.academic_year}</span></p>
                  <p className="text-sm">Class: <span className="font-medium">{classes.find(c => c._id === selectedClassId)?.class_name ?? selectedClassId}</span></p>
                  {selectedBatchId && <p className="text-sm">Batch: <span className="font-medium">{batches.find(b => b._id === selectedBatchId)?.batch_name ?? selectedBatchId}</span></p>}
                  {createFeeForm.fee_heads.map((h, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-t">
                      <span>{h.name} <span className="text-muted-foreground text-xs capitalize">({h.frequency.replace('_', ' ')})</span></span>
                      <span className="font-medium">{formatCurrency(h.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-1 border-t font-bold">
                    <span>Term Total</span>
                    <span className="text-[#1897C6]">{formatCurrency(createFeeForm.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}</span>
                  </div>
                </div>
                <div className="p-3 border rounded-lg space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Term</p>
                  <p className="text-sm">Name: <span className="font-medium">{createFeeForm.term_name}</span></p>
                  <p className="text-sm">Period: <span className="font-medium">{formatDate(createFeeForm.start_date)} → {formatDate(createFeeForm.due_date)}</span></p>
                  {createFeeForm.late_fee_amount && <p className="text-sm">Late Fee: <span className="font-medium">{formatCurrency(Number(createFeeForm.late_fee_amount))}</span></p>}
                </div>
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
                  This will create a fee structure, a fee term (or reuse an existing one with the same name), and generate a fee record for this student.
                </p>
              </div>
            )}

            {createFeeError && (
              <p className="text-sm text-red-600 flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {createFeeError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline" disabled={isSavingFee}
              onClick={() => {
                if (createFeeStep === 1) { setShowCreateFeeDialog(false); setCreateFeeError(null) }
                else setCreateFeeStep(s => (s - 1) as 1 | 2 | 3)
              }}
            >
              {createFeeStep === 1 ? 'Cancel' : '← Back'}
            </Button>
            {createFeeStep < 3 && (
              <Button
                className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
                onClick={() => {
                  setCreateFeeError(null)
                  const err = createFeeStep === 1 ? validateCreateStep1() : validateCreateStep2()
                  if (err) { setCreateFeeError(err); return }
                  setCreateFeeStep(s => (s + 1) as 2 | 3)
                }}
              >
                Next →
              </Button>
            )}
            {createFeeStep === 3 && (
              <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" disabled={isSavingFee} onClick={handleConfirmCreateFee}>
                {isSavingFee ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Confirm & Create'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}




































































// 'use client'

// import { useState } from 'react'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input'
// import { Progress } from '@/components/ui/progress'
// import { Separator } from '@/components/ui/separator'
// import {
//   Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
// } from '@/components/ui/dialog'
// import {
//   AlertCircle, CalendarDays, CheckCircle, ChevronDown, ChevronUp,
//   Clock, DollarSign, Download, Edit, Eye, FileText, Loader2, Plus, Trash2, TrendingUp,
// } from 'lucide-react'
// import type { StudentFee, FeeReceipt, FeeHead, FeeSnapshotItem, StudentFeeStatus } from '@/lib/api/fee'
// import {
//   studentFeeApi, feeStructureApi, feeReceiptApi, feeTermApi,
//   extractId, resolveTermLabel, calcTotalFromHeads,
// } from '@/lib/api/fee'
// import type { Notice } from '@/lib/api/notices'
// import { classesApi } from '@/lib/api/classes'
// import { teachersApi } from '@/lib/api/teachers'
// import type { ClassMaster, CoachingBatch } from '@/lib/api/classes'
// import type { Teacher } from '@/lib/api/teachers'
// import { capitalize, formatCurrency, formatDate, getStatusBadge } from '../_utils/helpers'
// import { buildFileUrl } from '../_utils/helpers'
// import { Pagination } from '@/components/pagination'

// // ─── Props ────────────────────────────────────────────────────────────────────

// interface FeesTabProps {
//   fees: StudentFee[]
//   feeReceipts: FeeReceipt[]
//   feeTermsMap: Record<string, string>
//   selectedYear: string
//   setSelectedYear: (year: string) => void
//   loadingFees: boolean
//   loadingNotices: boolean
//   notices: Notice[]
//   studentId: string
//   refreshFees: () => Promise<void>
//   classId?: string
//   sectionId?: string | null
//   batchId?: string | null
// }

// type PaymentMethod = 'cash' | 'card' | 'online' | 'cheque' | 'upi'

// // ─── Component ────────────────────────────────────────────────────────────────

// export function FeesTab({
//   fees, feeReceipts, feeTermsMap, selectedYear, setSelectedYear,
//   loadingFees, loadingNotices, notices, studentId, refreshFees,
//   classId: propClassId, sectionId: propSectionId, batchId: propBatchId,
// }: FeesTabProps) {
//   const [feeTab, setFeeTab] = useState<'pending' | 'paid' | 'structure' | 'history'>('pending')
//   const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)

//   // ── Edit Structure state ─────────────────────────────────────────────────
//   const [showEditStructureDialog, setShowEditStructureDialog] = useState(false)
//   const [editingStructure, setEditingStructure] = useState<{
//     studentFeeId: string   // StudentFee._id  — to update the student's fee record
//     structureId: string    // FeeStructure._id — to update the template via PUT API
//     fee_heads: FeeHead[]
//   } | null>(null)
//   const [isSavingStructure, setIsSavingStructure] = useState(false)
//   const [structureError, setStructureError]       = useState<string | null>(null)

//   // ── Add Payment state ────────────────────────────────────────────────────
//   const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
//   const [paymentForm, setPaymentForm] = useState({
//     student_fee_id: '',
//     term_id: '',
//     amount_paid: '',
//     payment_method: 'cash' as PaymentMethod,
//     payment_date: new Date().toISOString().split('T')[0],
//     transaction_id: '',
//     collected_by: '',
//     remarks: '',
//   })
//   const [isSavingPayment, setIsSavingPayment] = useState(false)
//   const [paymentError, setPaymentError]       = useState<string | null>(null)

//   // ── Delete state ─────────────────────────────────────────────────────────
//   const [deleteTarget, setDeleteTarget] = useState<{
//     type: 'receipt' | 'studentFee'
//     id: string
//     label: string
//   } | null>(null)
//   const [isDeletingRecord, setIsDeletingRecord] = useState(false)
//   const [deleteError, setDeleteError]           = useState<string | null>(null)

//   // ── Notice dialog ────────────────────────────────────────────────────────
//   const [showNoticeDialog, setShowNoticeDialog] = useState(false)
//   const [activeNotice, setActiveNotice]         = useState<Notice | null>(null)

//   // ── Dropdown data ────────────────────────────────────────────────────────
//   const [classes,  setClasses]  = useState<ClassMaster[]>([])
//   const [batches,  setBatches]  = useState<CoachingBatch[]>([])
//   const [teachers, setTeachers] = useState<Teacher[]>([])
//   const [selectedClassId, setSelectedClassId] = useState<string>('')
//   const [selectedBatchId, setSelectedBatchId] = useState<string>('')
//   const [loadingClasses,  setLoadingClasses]  = useState(false)
//   const [loadingBatches,  setLoadingBatches]  = useState(false)
//   const [loadingTeachers, setLoadingTeachers] = useState(false)

//   // ── Create Fee dialog ────────────────────────────────────────────────────
//   const [showCreateFeeDialog, setShowCreateFeeDialog] = useState(false)
//   const [createFeeStep, setCreateFeeStep] = useState<1 | 2 | 3>(1)
//   const [isSavingFee, setIsSavingFee]     = useState(false)
//   const [createFeeError, setCreateFeeError] = useState<string | null>(null)

//   const emptyFeeHead = (): FeeHead => ({ name: '', amount: 0, frequency: 'monthly', mandatory: true })

//   const [createFeeForm, setCreateFeeForm] = useState<{
//     academic_year: string
//     fee_heads: FeeHead[]
//     term_name: string
//     term_order: string
//     start_date: string
//     due_date: string
//     late_fee_amount: string
//   }>({
//     academic_year: '',
//     fee_heads: [emptyFeeHead()],
//     term_name: '',
//     term_order: '',
//     start_date: '',
//     due_date: '',
//     late_fee_amount: '',
//   })

//   // ── Pagination ───────────────────────────────────────────────────────────
//   const [pendingPage, setPendingPage] = useState(1)
//   const [paidPage, setPaidPage]       = useState(1)
//   const [historyPage, setHistoryPage] = useState(1)
//   const PAGE_SIZE = 5

//   // ── Derived values ───────────────────────────────────────────────────────

//   const feesForYear    = selectedYear === '' ? fees : fees.filter(f => f.academic_year === selectedYear)
//   const pendingFees    = feesForYear.filter(f => ['pending', 'overdue', 'partial'].includes(f.status))
//   const paidFees       = feesForYear.filter(f => ['paid', 'partial'].includes(f.status))

//   const totalAmount    = feesForYear.reduce((s, f) => s + Number(f.total_amount), 0)
//   const totalPaid      = feesForYear.reduce((s, f) => s + Number(f.paid_amount),  0)
//   const totalDue       = feesForYear.reduce((s, f) => s + Number(f.due_amount),   0)
//   const paymentPct     = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
//   const feeYears       = [...new Set(fees.map(f => f.academic_year))].sort().reverse()

//   const yearReceipts     = feeReceipts.filter(r => feesForYear.some(f => receiptMatchesFee(r, f._id)))
//   const sortedReceipts   = [...yearReceipts].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
//   const paginatedPending = pendingFees.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE)
//   const paginatedPaid    = paidFees.slice((paidPage - 1) * PAGE_SIZE, paidPage * PAGE_SIZE)
//   const paginatedHistory = sortedReceipts.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE)

//   // structureFee is used to seed the Edit Structure dialog
//   const structureFee = feesForYear[0] ?? null

//   // ── Helpers ──────────────────────────────────────────────────────────────

//   function receiptMatchesFee(receipt: FeeReceipt, feeId: string): boolean {
//     return extractId(receipt.student_fee_id as string | { _id: string }) === feeId
//   }

//   function termLabel(termId: StudentFee['term_id']): string {
//     return resolveTermLabel(
//       termId as string | { _id: string; name: string; term_order: number | null } | null,
//       feeTermsMap,
//     )
//   }

//   // ── Open Edit Structure ───────────────────────────────────────────────────
//   // Seeds the dialog from the student's existing fee_snapshot and resolves
//   // the FeeStructure._id from fee_structure_id (may be populated object or string).

//   function openEditStructure() {
//     if (!structureFee) return

//     const structureId = extractId(structureFee.fee_structure_id as string | { _id: string })
//     if (!structureId) {
//       setStructureError('Fee structure ID not found on this record. Please reload and try again.')
//       setShowEditStructureDialog(true)
//       return
//     }

//     setEditingStructure({
//       studentFeeId: structureFee._id,
//       structureId,
//       fee_heads: structureFee.fee_snapshot.map(item => ({
//         name:      item.name,
//         amount:    item.amount,
//         frequency: (item.frequency ?? 'annual') as FeeHead['frequency'],
//         mandatory: true,
//       })),
//     })
//     setStructureError(null)
//     setShowEditStructureDialog(true)
//   }

//   // ── Save Edit Structure ───────────────────────────────────────────────────
//   // Two API calls:
//   //   1. PUT /fee-structures/:id  — updates the fee template (fee_heads)
//   //   2. PUT /student-fees/:id    — updates the student's own record (totals, status)

//   async function handleSaveStructure() {
//     if (!editingStructure) return

//     if (!editingStructure.structureId) {
//       setStructureError('Fee structure ID is missing. Please reload and try again.')
//       return
//     }
//     if (!editingStructure.studentFeeId) {
//       setStructureError('Student fee record ID is missing. Please reload and try again.')
//       return
//     }
//     if (editingStructure.fee_heads.length === 0) {
//       setStructureError('At least one fee component is required.')
//       return
//     }
//     for (const h of editingStructure.fee_heads) {
//       if (!h.name.trim()) { setStructureError('Each fee component must have a name.'); return }
//       if (Number(h.amount) <= 0) { setStructureError(`Amount for "${h.name}" must be greater than 0.`); return }
//     }

//     const parentFee = feesForYear.find(f => f._id === editingStructure.studentFeeId)
//     if (!parentFee) {
//       setStructureError('Fee record not found in current view. Please reload.')
//       return
//     }

//     // Recalculate totals locally (mirrors backend pre-save hook logic)
//     const newTotal = calcTotalFromHeads(editingStructure.fee_heads)
//     const alreadyPaid = Number(parentFee.paid_amount)
//     const newDue = Math.max(0, newTotal - alreadyPaid)
//     const newStatus: StudentFeeStatus =
//       newDue === 0
//         ? 'paid'
//         : alreadyPaid > 0
//           ? 'partial'
//           : parentFee.status === 'overdue'
//             ? 'overdue'
//             : 'pending'

//     setIsSavingStructure(true)
//     setStructureError(null)

//     try {
//       // ── Step 1: Update the FeeStructure template via PUT API ──────────────
//       // Backend's pre-save hook will auto-recompute total_annual_amount.
//       const structureRes = await feeStructureApi.update(editingStructure.structureId, {
//         fee_heads: editingStructure.fee_heads,
//       })

//       if (!structureRes.success) {
//         setStructureError(
//           structureRes.message ?? 'Failed to update the fee structure template. Please try again.'
//         )
//         return
//       }

//       // ── Step 2: Update the student's own fee record (totals + status) ─────
//       const newSnapshot: FeeSnapshotItem[] = editingStructure.fee_heads.map(h => ({
//         name:      h.name,
//         amount:    h.amount,
//         frequency: h.frequency,
//       }))

//       const studentFeeRes = await studentFeeApi.update(editingStructure.studentFeeId, {
//         fee_snapshot: newSnapshot,
//         total_amount: newTotal,
//         due_amount:   newDue,
//         paid_amount:  alreadyPaid,
//         status:       newStatus,
//       })

//       if (!studentFeeRes.success) {
//         // Structure was updated successfully, but the student record update failed.
//         // Surface a clear error so the admin knows which half succeeded.
//         setStructureError(
//           `Fee template saved, but updating this student's record failed: ${studentFeeRes.message ?? 'Unknown error.'} Please refresh and verify.`
//         )
//         return
//       }

//       setShowEditStructureDialog(false)
//       await refreshFees()
//     } catch (err: any) {
//       console.error('[FeeStructure] handleSaveStructure error:', err)
//       setStructureError(
//         err?.response?.data?.message ||
//         err?.message ||
//         'An unexpected error occurred. Please check your connection and try again.'
//       )
//     } finally {
//       setIsSavingStructure(false)
//     }
//   }

//   // ── Open Add Payment ──────────────────────────────────────────────────────

//   function openAddPayment() {
//     fetchClassesAndTeachers()
//     const unpaidFees = feesForYear.filter(
//       f => ['pending', 'overdue'].includes(f.status) ||
//            (f.status === 'partial' && Number(f.due_amount) > 0)
//     )
//     const firstPending = unpaidFees[0] ?? null
//     const termId = firstPending
//       ? extractId(firstPending.term_id as string | { _id: string })
//       : ''

//     setPaymentForm({
//       student_fee_id: firstPending?._id ?? '',
//       term_id:        termId,
//       amount_paid:    firstPending ? String(firstPending.due_amount) : '',
//       payment_method: 'cash',
//       payment_date:   new Date().toISOString().split('T')[0],
//       transaction_id: '',
//       collected_by:   '',
//       remarks:        '',
//     })
//     setPaymentError(null)
//     setShowAddPaymentDialog(true)
//   }

//   function handleFeeTermSelect(feeId: string) {
//     if (!feeId) {
//       setPaymentForm(prev => ({ ...prev, student_fee_id: '', term_id: '', amount_paid: '' }))
//       return
//     }
//     const sel = fees.find(f => f._id === feeId)
//     if (!sel) {
//       setPaymentForm(prev => ({ ...prev, student_fee_id: feeId, term_id: '', amount_paid: '' }))
//       return
//     }
//     const termId = extractId(sel.term_id as string | { _id: string })
//     setPaymentForm(prev => ({
//       ...prev,
//       student_fee_id: feeId,
//       term_id:        termId,
//       amount_paid:    String(sel.due_amount),
//     }))
//   }

//   // ── Save Payment ──────────────────────────────────────────────────────────

//   async function handleSavePayment() {
//     const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//     if (!instituteId) { setPaymentError('Session data missing. Please refresh and try again.'); return }
//     if (!paymentForm.student_fee_id) { setPaymentError('Please select a fee term.'); return }
//     if (!paymentForm.amount_paid || Number(paymentForm.amount_paid) <= 0) {
//       setPaymentError('Please enter a valid amount.'); return
//     }
//     if (!paymentForm.payment_date) { setPaymentError('Please select a payment date.'); return }

//     const selectedFee = fees.find(f => f._id === paymentForm.student_fee_id)
//     if (selectedFee && Number(paymentForm.amount_paid) > Number(selectedFee.due_amount)) {
//       setPaymentError(`Amount cannot exceed due amount of ${formatCurrency(selectedFee.due_amount)}.`)
//       return
//     }
//     if (selectedFee?.status === 'paid' && Number(selectedFee.due_amount) === 0) {
//       setPaymentError('This fee term is already fully paid.'); return
//     }

//     setIsSavingPayment(true)
//     setPaymentError(null)
//     try {
//       const res = await feeReceiptApi.create({
//         institute_id:   instituteId,
//         student_id:     studentId,
//         student_fee_id: paymentForm.student_fee_id,
//         term_id:        paymentForm.term_id || null,
//         amount_paid:    Number(paymentForm.amount_paid),
//         payment_method: paymentForm.payment_method,
//         payment_date:   paymentForm.payment_date,
//         ...(paymentForm.transaction_id ? { transaction_id: paymentForm.transaction_id } : {}),
//         ...(paymentForm.collected_by   ? { collected_by:   paymentForm.collected_by   } : {}),
//         ...(paymentForm.remarks        ? { remarks:         paymentForm.remarks        } : {}),
//       })
//       if (res.success) {
//         setShowAddPaymentDialog(false)
//         setPaymentForm({
//           student_fee_id: '', term_id: '', amount_paid: '',
//           payment_method: 'cash',
//           payment_date:   new Date().toISOString().split('T')[0],
//           transaction_id: '', collected_by: '', remarks: '',
//         })
//         await refreshFees()
//       } else {
//         setPaymentError(res.message ?? 'Failed to record payment.')
//       }
//     } catch (err) {
//       console.error('[AddPayment] Unexpected error:', err)
//       setPaymentError('An unexpected error occurred. Please try again.')
//     } finally {
//       setIsSavingPayment(false)
//     }
//   }

//   // ── Confirm Delete ────────────────────────────────────────────────────────

//   async function handleConfirmDelete() {
//     if (!deleteTarget) return
//     setIsDeletingRecord(true)
//     setDeleteError(null)
//     try {
//       const res =
//         deleteTarget.type === 'receipt'
//           ? await feeReceiptApi.delete(deleteTarget.id)
//           : await studentFeeApi.delete(deleteTarget.id)

//       if (res.success) {
//         setDeleteTarget(null)
//         await refreshFees()
//       } else {
//         setDeleteError((res as { message?: string }).message ?? 'Delete failed. Please try again.')
//       }
//     } catch (err) {
//       console.error('[Delete] Unexpected error:', err)
//       setDeleteError('An unexpected error occurred. Please try again.')
//     } finally {
//       setIsDeletingRecord(false)
//     }
//   }

//   // ── Fetch Classes + Teachers ──────────────────────────────────────────────

//   async function fetchClassesAndTeachers() {
//     const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//     if (!instituteId) return

//     setLoadingClasses(true)
//     try {
//       const res = await classesApi.getAll({ instituteId, status: 'active' })
//       if (res.success && res.result) setClasses(res.result as ClassMaster[])
//     } catch (e) { console.error('[FeesTab] fetchClasses error:', e) }
//     finally { setLoadingClasses(false) }

//     setLoadingTeachers(true)
//     try {
//       const res = await teachersApi.getAll({ institute_id: instituteId, status: 'active' })
//       if (res.success && res.result) setTeachers(res.result as Teacher[])
//     } catch (e) { console.error('[FeesTab] fetchTeachers error:', e) }
//     finally { setLoadingTeachers(false) }
//   }

//   async function fetchBatchesForClass(classId: string) {
//     if (!classId) { setBatches([]); return }
//     setLoadingBatches(true)
//     try {
//       const res = await classesApi.getBatchesByClass(classId)
//       if (res.success && res.result) setBatches(res.result as CoachingBatch[])
//       else setBatches([])
//     } catch (e) { console.error('[FeesTab] fetchBatches error:', e); setBatches([]) }
//     finally { setLoadingBatches(false) }
//   }

//   // ── Open Create Fee ───────────────────────────────────────────────────────

//   function openCreateFeeDialog() {
//     const ref = fees[0]
//     const seedClassId = ref
//       ? (typeof ref.class_id === 'object' ? (ref.class_id as { _id: string })._id : ref.class_id)
//       : (propClassId ?? '')
//     const seedBatchId = ref
//       ? extractId(ref.batch_id as string | { _id: string } | null)
//       : (propBatchId ?? '')

//     setSelectedClassId(seedClassId ?? '')
//     setSelectedBatchId(seedBatchId ?? '')
//     setCreateFeeForm({
//       academic_year: ref?.academic_year ?? '',
//       fee_heads:     [emptyFeeHead()],
//       term_name:     '',
//       term_order:    '',
//       start_date:    '',
//       due_date:      '',
//       late_fee_amount: '',
//     })
//     setCreateFeeStep(1)
//     setCreateFeeError(null)
//     fetchClassesAndTeachers()
//     if (seedClassId) fetchBatchesForClass(seedClassId)
//     setShowCreateFeeDialog(true)
//   }

//   function updateFeeHead(index: number, field: keyof FeeHead, value: string | number | boolean) {
//     setCreateFeeForm(prev => {
//       const heads = [...prev.fee_heads]
//       heads[index] = { ...heads[index], [field]: value }
//       return { ...prev, fee_heads: heads }
//     })
//   }

//   function addFeeHead() {
//     setCreateFeeForm(prev => ({ ...prev, fee_heads: [...prev.fee_heads, emptyFeeHead()] }))
//   }

//   function removeFeeHead(index: number) {
//     setCreateFeeForm(prev => ({
//       ...prev,
//       fee_heads: prev.fee_heads.filter((_, i) => i !== index),
//     }))
//   }

//   function validateCreateStep1(): string | null {
//     if (!createFeeForm.academic_year.trim()) return 'Academic year is required (e.g., 2025-26).'
//     if (!selectedClassId) return 'Please select a class.'
//     if (createFeeForm.fee_heads.length === 0) return 'At least one fee component is required.'
//     for (const h of createFeeForm.fee_heads) {
//       if (!h.name.trim()) return 'Each fee component must have a name.'
//       if (!h.amount || Number(h.amount) <= 0) return `Amount for "${h.name || 'a component'}" must be greater than 0.`
//     }
//     return null
//   }

//   function validateCreateStep2(): string | null {
//     if (!createFeeForm.term_name.trim()) return 'Term name is required (e.g., April).'
//     if (!createFeeForm.start_date) return 'Start date is required.'
//     if (!createFeeForm.due_date)   return 'Due date is required.'
//     if (new Date(createFeeForm.due_date) < new Date(createFeeForm.start_date))
//       return 'Due date cannot be before the start date.'
//     return null
//   }

//   async function handleConfirmCreateFee() {
//     const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//     if (!instituteId) { setCreateFeeError('Session data missing. Please refresh and try again.'); return }

//     const classId   = selectedClassId || (fees[0] ? (typeof fees[0].class_id === 'object' ? (fees[0].class_id as { _id: string })._id : fees[0].class_id) : propClassId) || ''
//     const sectionId = propSectionId ?? null
//     const batchId   = selectedBatchId || (fees[0] ? extractId(fees[0].batch_id as string | { _id: string } | null) : propBatchId) || null

//     if (!classId) { setCreateFeeError('Please select a class.'); return }

//     setIsSavingFee(true)
//     setCreateFeeError(null)
//     try {
//       let feeStructureId: string
//       const structureRes = await feeStructureApi.create({
//         institute_id:  instituteId,
//         academic_year: createFeeForm.academic_year.trim(),
//         class_id:      classId,
//         section_id:    sectionId || null,
//         batch_id:      batchId   || null,
//         fee_heads:     createFeeForm.fee_heads.map(h => ({
//           name: h.name.trim(), amount: Number(h.amount),
//           frequency: h.frequency, mandatory: h.mandatory,
//         })),
//         status: 'active',
//       })

//       if (!structureRes.success || !structureRes.result) {
//         if ((structureRes as { statusCode?: number }).statusCode === 409 || structureRes.message?.includes('already exists')) {
//           const existingStructures = await feeStructureApi.getAll()
//           const existing = existingStructures.result?.find(s =>
//             s.status === 'active' &&
//             s.academic_year === createFeeForm.academic_year.trim() &&
//             (batchId
//               ? (typeof s.batch_id === 'object' ? s.batch_id?._id : s.batch_id) === batchId
//               : (typeof s.class_id === 'object' ? s.class_id?._id : s.class_id) === classId)
//           )
//           if (!existing) {
//             setCreateFeeError(structureRes.message ?? 'Could not create or find the fee structure.')
//             setIsSavingFee(false); return
//           }
//           feeStructureId = existing._id
//         } else {
//           setCreateFeeError(structureRes.message ?? 'Could not create the fee structure. Please try again.')
//           setIsSavingFee(false); return
//         }
//       } else {
//         feeStructureId = structureRes.result._id
//       }

//       const termRes = await feeTermApi.create({
//         institute_id:  instituteId,
//         academic_year: createFeeForm.academic_year.trim(),
//         name:          createFeeForm.term_name.trim(),
//         start_date:    createFeeForm.start_date,
//         due_date:      createFeeForm.due_date,
//         ...(createFeeForm.term_order     ? { term_order:      Number(createFeeForm.term_order)     } : {}),
//         ...(createFeeForm.late_fee_amount ? { late_fee_amount: Number(createFeeForm.late_fee_amount) } : {}),
//         status: 'active',
//       })
//       if (!termRes.success || !termRes.result) {
//         setCreateFeeError(termRes.message ?? 'Could not create the fee term. Please try again.')
//         setIsSavingFee(false); return
//       }

//       const generateRes = await studentFeeApi.generate({
//         institute_id:     instituteId,
//         student_id:       studentId,
//         class_id:         classId,
//         section_id:       sectionId || null,
//         batch_id:         batchId   || null,
//         academic_year:    createFeeForm.academic_year.trim(),
//         term_id:          termRes.result._id,
//         fee_structure_id: feeStructureId,
//       })
//       if (!generateRes.success) {
//         setCreateFeeError(generateRes.message ?? 'Could not generate the student fee record. Please try again.')
//         setIsSavingFee(false); return
//       }

//       setShowCreateFeeDialog(false)
//       await refreshFees()
//     } catch {
//       setCreateFeeError('Something went wrong. Please check your connection and try again.')
//     } finally {
//       setIsSavingFee(false)
//     }
//   }

//   // ── Download receipt ─────────────────────────────────────────────────────

//   function downloadReceipt(receipt: FeeReceipt, parentFee?: StudentFee) {
//     const instituteName = typeof window !== 'undefined' ? (localStorage.getItem('instituteName') ?? 'Institute') : 'Institute'
//     const termName = parentFee ? termLabel(parentFee.term_id) : 'Fee Payment'
//     const html = `
//       <!DOCTYPE html><html><head><meta charset="UTF-8"/>
//       <title>Receipt ${receipt.receipt_number}</title>
//       <style>
//         *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#222}
//         .page{max-width:600px;margin:0 auto;padding:32px 28px}
//         .header{text-align:center;border-bottom:2px solid #1897C6;padding-bottom:16px;margin-bottom:20px}
//         .header h1{font-size:20px;color:#1897C6}.header p{font-size:12px;color:#555;margin-top:4px}
//         .badge{display:inline-block;background:#e0f7fa;color:#1897C6;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;margin-top:6px}
//         .section{margin-bottom:16px}
//         .section-title{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}
//         .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted #eee}
//         .row:last-child{border-bottom:none}.label{color:#555}.value{font-weight:600;color:#222}
//         .amount-box{background:linear-gradient(135deg,#1897C6,#67BAC3);color:white;border-radius:10px;padding:16px 20px;text-align:center;margin:20px 0}
//         .amount-box .amt{font-size:28px;font-weight:700}.amount-box .lbl{font-size:12px;opacity:.85;margin-top:2px}
//         .footer{text-align:center;font-size:11px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:12px}
//         @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
//       </style></head><body><div class="page">
//       <div class="header"><h1>${instituteName}</h1><p>Fee Payment Receipt</p><span class="badge">PAID</span></div>
//       <div class="section"><div class="section-title">Receipt Details</div>
//         <div class="row"><span class="label">Receipt No.</span><span class="value">${receipt.receipt_number}</span></div>
//         <div class="row"><span class="label">Payment Date</span><span class="value">${new Date(receipt.payment_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span></div>
//         <div class="row"><span class="label">Payment Method</span><span class="value">${receipt.payment_method.toUpperCase()}</span></div>
//         ${receipt.transaction_id ? `<div class="row"><span class="label">Transaction ID</span><span class="value">${receipt.transaction_id}</span></div>` : ''}
//       </div>
//       <div class="section"><div class="section-title">Fee Details</div>
//         <div class="row"><span class="label">Term</span><span class="value">${termName}</span></div>
//         ${parentFee ? `<div class="row"><span class="label">Academic Year</span><span class="value">${parentFee.academic_year}</span></div>` : ''}
//         ${parentFee ? `<div class="row"><span class="label">Total Fee</span><span class="value">₹${Number(parentFee.total_amount).toLocaleString('en-IN')}</span></div>` : ''}
//       </div>
//       <div class="amount-box"><div class="amt">₹${Number(receipt.amount_paid).toLocaleString('en-IN')}</div><div class="lbl">Amount Paid</div></div>
//       ${receipt.remarks ? `<div class="section"><div class="section-title">Remarks</div><p style="color:#555;font-size:12px">${receipt.remarks}</p></div>` : ''}
//       <div class="footer"><p>This is a computer-generated receipt and does not require a signature.</p><p style="margin-top:4px">Generated on ${new Date().toLocaleString('en-IN')}</p></div>
//       </div></body></html>`
//     const win = window.open('', '_blank', 'width=650,height=800')
//     if (!win) return
//     win.document.write(html); win.document.close(); win.focus()
//     setTimeout(() => { win.print(); win.close() }, 500)
//   }

//   // ── Render ────────────────────────────────────────────────────────────────

//   return (
//     <div className="space-y-4">

//       {/* ── Header ── */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div>
//           <h2 className="text-xl sm:text-2xl font-bold">Fee Management</h2>
//           {selectedYear && (
//             <div className="flex items-center gap-2 mt-1 flex-wrap">
//               <Badge className="bg-[#1897C6]">{selectedYear}</Badge>
//               <span className="text-sm text-muted-foreground">Complete financial overview and payment history</span>
//             </div>
//           )}
//         </div>
//         <div className="flex gap-2">
//           <Button variant="outline" size="sm" className="gap-2" onClick={openCreateFeeDialog}>
//             <Plus className="h-4 w-4" /><span className="hidden sm:inline">Create Fee</span>
//           </Button>
//           {fees.length > 0 && (
//             <>
//               <Button variant="outline" size="sm" className="gap-2" onClick={openEditStructure}>
//                 <Edit className="h-4 w-4" /><span className="hidden sm:inline">Edit Structure</span>
//               </Button>
//               <Button variant="outline" size="sm" className="gap-2" onClick={openAddPayment}>
//                 <DollarSign className="h-4 w-4" /><span className="hidden sm:inline">Add Payment</span>
//               </Button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* ── Notices ── */}
//       {loadingNotices ? (
//         <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
//           <Loader2 className="h-4 w-4 animate-spin" /> Loading notices...
//         </div>
//       ) : notices.length > 0 && (
//         <div className="space-y-2">
//           {notices.map(notice => (
//             <Card key={notice._id} className="border border-orange-200 bg-orange-50/60">
//               <CardContent className="p-4">
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="flex items-start gap-3 min-w-0">
//                     <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
//                     <div className="min-w-0">
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <p className="font-semibold text-orange-900 break-words">{notice.title}</p>
//                         {notice.isPinned && <Badge className="bg-orange-500 text-white text-xs shrink-0">Pinned</Badge>}
//                         {notice.category && (
//                           <Badge variant="outline" className="text-xs shrink-0 capitalize border-orange-300 text-orange-700">
//                             {notice.category}
//                           </Badge>
//                         )}
//                       </div>
//                       <p className="text-sm text-orange-800 mt-1 line-clamp-2 break-words">{notice.content}</p>
//                       {notice.publishDate && (
//                         <p className="text-xs text-orange-600/70 mt-1.5">
//                           Last updated: {formatDate(notice.publishDate)}
//                           {notice.expiryDate && ` • Expires: ${formatDate(notice.expiryDate)}`}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                   <Button
//                     variant="ghost" size="icon"
//                     className="h-8 w-8 shrink-0 text-blue-500 hover:text-orange-700 hover:bg-orange-100"
//                     onClick={() => { setActiveNotice(notice); setShowNoticeDialog(true) }}
//                   >
//                     <Eye className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       )}

//       {/* ── Loading / Empty ── */}
//       {loadingFees ? (
//         <div className="flex items-center justify-center py-12">
//           <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" />
//           <span className="ml-2 text-sm text-muted-foreground">Loading fee records...</span>
//         </div>
//       ) : fees.length === 0 ? (
//         <Card>
//           <CardContent className="p-8 text-center space-y-4">
//             <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
//               <DollarSign className="h-8 w-8 text-muted-foreground" />
//             </div>
//             <div>
//               <p className="font-semibold text-base">No fee records found</p>
//               <p className="text-sm text-muted-foreground mt-1">
//                 This student has no fee records yet. Create a fee structure and term to get started.
//               </p>
//             </div>
//             <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-2" onClick={openCreateFeeDialog}>
//               <Plus className="h-4 w-4" /> Create Fee Record
//             </Button>
//           </CardContent>
//         </Card>
//       ) : (
//         <>
//           {/* ── Year Selector ── */}
//           <Card>
//             <CardHeader className="pb-3">
//               <div className="flex items-center gap-2 flex-wrap">
//                 <CalendarDays className="h-5 w-5 text-[#1897C6]" />
//                 <Label className="text-sm font-medium">Academic Year:</Label>
//                 <Badge
//                   variant={selectedYear === '' ? 'default' : 'outline'}
//                   className={`cursor-pointer ${selectedYear === '' ? 'bg-[#1897C6]' : ''}`}
//                   onClick={() => { setSelectedYear(''); setPendingPage(1); setPaidPage(1); setHistoryPage(1) }}
//                 >All Years</Badge>
//                 {feeYears.map(year => (
//                   <Badge
//                     key={year}
//                     variant={year === selectedYear ? 'default' : 'outline'}
//                     className={`cursor-pointer ${year === selectedYear ? 'bg-[#1897C6]' : ''}`}
//                     onClick={() => { setSelectedYear(year); setPendingPage(1); setPaidPage(1); setHistoryPage(1) }}
//                   >{year}</Badge>
//                 ))}
//               </div>
//             </CardHeader>
//           </Card>

//           {/* ── Summary Cards ── */}
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//             {[
//               { border: 'border-2', icon: FileText, iconBg: 'bg-gray-100', iconColor: 'text-gray-600', label: 'Total Fee Amount', value: formatCurrency(totalAmount), sub: 'Academic year fees', valueColor: '' },
//               { border: 'border-2 border-green-200 bg-green-50', icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-600', label: 'Amount Paid', value: formatCurrency(totalPaid), sub: `${paidFees.length} successful payment${paidFees.length !== 1 ? 's' : ''}`, valueColor: 'text-green-600' },
//               { border: 'border-2 border-red-200 bg-red-50', icon: AlertCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600', label: 'Amount Due', value: formatCurrency(totalDue), sub: `${pendingFees.length} pending payment${pendingFees.length !== 1 ? 's' : ''}`, valueColor: 'text-red-600' },
//               { border: 'border-2 border-blue-200 bg-blue-50', icon: TrendingUp, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', label: 'Payment Progress', value: `${paymentPct}%`, sub: null, valueColor: 'text-blue-600', progress: true },
//             ].map(({ border, icon: Icon, iconBg, iconColor, label, value, sub, valueColor, progress }) => (
//               <Card key={label} className={border}>
//                 <CardContent className="p-4">
//                   <div className="flex items-center gap-2 mb-2">
//                     <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
//                       <Icon className={`h-4 w-4 ${iconColor}`} />
//                     </div>
//                     <p className="text-xs text-muted-foreground">{label}</p>
//                   </div>
//                   <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
//                   {sub    && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
//                   {progress && <Progress value={paymentPct} className="h-2 mt-2" />}
//                 </CardContent>
//               </Card>
//             ))}
//           </div>

//           {/* ── Overdue Alert ── */}
//           {feesForYear.some(f => f.status === 'overdue') && (
//             <Card className="border-2 border-red-300 bg-red-50">
//               <CardContent className="p-4">
//                 <div className="flex items-start gap-3">
//                   <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
//                   <div>
//                     <p className="font-semibold text-red-900">⚠️ Attention: Overdue Payments</p>
//                     <p className="text-sm text-red-800 mt-1">
//                       You have {feesForYear.filter(f => f.status === 'overdue').length} overdue payment
//                       {feesForYear.filter(f => f.status === 'overdue').length !== 1 ? 's' : ''}.
//                       Please settle immediately to avoid additional late fees.
//                     </p>
//                     <div className="mt-2 flex flex-wrap gap-2">
//                       {feesForYear.filter(f => f.status === 'overdue').map(f => (
//                         <div key={f._id} className="inline-flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-red-200">
//                           <span className="text-xs text-muted-foreground">{termLabel(f.term_id)}</span>
//                           <span className="font-bold text-red-600 text-sm">{formatCurrency(f.due_amount)}</span>
//                           {f.is_late_fee_applied && f.late_fee_applied && (
//                             <Badge variant="destructive" className="text-xs">+{formatCurrency(f.late_fee_applied)} Late Fee</Badge>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           )}

//           {/* ── Fee Sub-tabs ── */}
//           <Card>
//             <CardHeader className="border-b pb-3">
//               <div className="flex gap-2 flex-wrap">
//                 {(['pending', 'paid', 'structure', 'history'] as const).map(tab => (
//                   <Button
//                     key={tab}
//                     variant={feeTab === tab ? 'default' : 'ghost'}
//                     size="sm"
//                     onClick={() => setFeeTab(tab)}
//                     className={feeTab === tab ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3]' : ''}
//                   >
//                     {tab === 'pending'   && <Clock       className="h-4 w-4 mr-1.5" />}
//                     {tab === 'paid'      && <CheckCircle className="h-4 w-4 mr-1.5" />}
//                     {tab === 'structure' && <FileText    className="h-4 w-4 mr-1.5" />}
//                     {tab === 'history'   && <Clock       className="h-4 w-4 mr-1.5" />}
//                     {capitalize(tab)}
//                   </Button>
//                 ))}
//               </div>
//             </CardHeader>
//             <CardContent className="p-4">

//               {/* PENDING TAB */}
//               {feeTab === 'pending' && (
//                 <div className="space-y-3">
//                   <p className="text-sm text-muted-foreground mb-2">Pending, partial, and overdue term fees</p>
//                   {pendingFees.length === 0 ? (
//                     <div className="text-center py-8">
//                       <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
//                       <p className="text-muted-foreground">All fees are paid{selectedYear ? ` for ${selectedYear}` : ''}!</p>
//                     </div>
//                   ) : paginatedPending.map(fee => (
//                     <Card key={fee._id} className={`border-2 ${fee.status === 'overdue' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
//                       <CardContent className="p-4">
//                         <div className="flex items-start justify-between gap-4">
//                           <div className="flex items-start gap-3">
//                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fee.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'}`}>
//                               <FileText className={`h-5 w-5 ${fee.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`} />
//                             </div>
//                             <div>
//                               <p className="font-semibold">{termLabel(fee.term_id)}</p>
//                               <p className="text-sm text-muted-foreground">{fee.academic_year}</p>
//                               <div className="mt-2">{getStatusBadge(fee.status)}</div>
//                             </div>
//                           </div>
//                           <div className="text-right space-y-1">
//                             <div className="bg-white rounded-lg px-3 py-1.5 border">
//                               <p className="text-xs text-muted-foreground">Total</p>
//                               <p className="font-bold">{formatCurrency(fee.total_amount)}</p>
//                             </div>
//                             <div className="bg-white rounded-lg px-3 py-1.5 border border-red-200">
//                               <p className="text-xs text-muted-foreground">Due</p>
//                               <p className={`font-bold ${fee.status === 'overdue' ? 'text-red-600' : 'text-yellow-700'}`}>
//                                 {formatCurrency(fee.due_amount)}
//                               </p>
//                             </div>
//                           </div>
//                         </div>
//                         <div className="mt-3 pt-3 border-t flex justify-end">
//                           <Button
//                             variant="ghost" size="sm"
//                             className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs"
//                             onClick={() => setDeleteTarget({ type: 'studentFee', id: fee._id, label: `${termLabel(fee.term_id)} (${fee.academic_year})` })}
//                           >
//                             <Trash2 className="h-3.5 w-3.5" /> Delete Fee Record
//                           </Button>
//                         </div>
//                         {fee.due_date && (
//                           <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
//                             <Clock className="h-4 w-4 shrink-0" />
//                             Due Date: <span className="font-medium">{formatDate(fee.due_date)}</span>
//                             {fee.is_late_fee_applied && fee.late_fee_applied && (
//                               <Badge variant="destructive" className="ml-2 text-xs">+{formatCurrency(fee.late_fee_applied)} Late Fee</Badge>
//                             )}
//                           </div>
//                         )}
//                       </CardContent>
//                     </Card>
//                   ))}
//                   {pendingFees.length > PAGE_SIZE && (
//                     <Pagination currentPage={pendingPage} totalPages={Math.ceil(pendingFees.length / PAGE_SIZE)} onPageChange={setPendingPage} />
//                   )}
//                 </div>
//               )}

//               {/* PAID TAB */}
//               {feeTab === 'paid' && (
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <p className="text-sm text-muted-foreground">Paid and partially paid terms</p>
//                     <p className="text-sm text-muted-foreground">{paidFees.length} term{paidFees.length !== 1 ? 's' : ''}</p>
//                   </div>
//                   {paidFees.length === 0 ? (
//                     <div className="text-center py-8">
//                       <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
//                       <p className="text-muted-foreground">No paid terms found{selectedYear ? ` for ${selectedYear}` : ''}.</p>
//                     </div>
//                   ) : paginatedPaid.map(fee => {
//                     const termReceipts = feeReceipts.filter(r => receiptMatchesFee(r, fee._id))
//                     const isExpanded   = expandedReceipt === fee._id
//                     return (
//                       <Card key={fee._id} className="border-2 border-green-200 bg-green-50">
//                         <CardContent className="p-4">
//                           <div className="flex items-center justify-between gap-3">
//                             <div className="flex items-center gap-3">
//                               <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
//                                 <CheckCircle className="h-5 w-5 text-green-600" />
//                               </div>
//                               <div>
//                                 <p className="font-semibold">{termLabel(fee.term_id)}</p>
//                                 <p className="text-sm text-muted-foreground">{fee.academic_year}</p>
//                                 <div className="mt-1">{getStatusBadge(fee.status)}</div>
//                               </div>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <div className="text-right space-y-1">
//                                 <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                   <p className="text-xs text-muted-foreground">Paid</p>
//                                   <p className="font-bold text-green-600">{formatCurrency(fee.paid_amount)}</p>
//                                 </div>
//                                 {Number(fee.due_amount) > 0 && (
//                                   <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                     <p className="text-xs text-muted-foreground">Remaining</p>
//                                     <p className="font-bold text-yellow-600">{formatCurrency(fee.due_amount)}</p>
//                                   </div>
//                                 )}
//                               </div>
//                               <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
//                                 onClick={() => setExpandedReceipt(isExpanded ? null : fee._id)}>
//                                 {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
//                               </Button>
//                             </div>
//                           </div>

//                           {isExpanded && (
//                             <div className="mt-3 pt-3 border-t space-y-3">
//                               {fee.fee_snapshot?.length > 0 && (
//                                 <div>
//                                   <p className="text-xs font-semibold text-muted-foreground mb-2">FEE BREAKDOWN</p>
//                                   <div className="space-y-1">
//                                     {fee.fee_snapshot.map((item, i) => (
//                                       <div key={i} className="flex justify-between text-sm p-2 bg-white rounded-lg border border-green-100">
//                                         <span className="text-muted-foreground">{item.name}</span>
//                                         <span className="font-medium">{formatCurrency(item.amount)}</span>
//                                       </div>
//                                     ))}
//                                   </div>
//                                 </div>
//                               )}
//                               {termReceipts.length > 0 && (
//                                 <div>
//                                   <p className="text-xs font-semibold text-muted-foreground mb-2">PAYMENT RECEIPTS</p>
//                                   <div className="space-y-2">
//                                     {termReceipts.map(receipt => (
//                                       <div key={receipt._id} className="p-3 bg-white rounded-lg border border-green-200 space-y-2">
//                                         <div className="flex items-center justify-between">
//                                           <div>
//                                             <p className="text-sm font-bold text-green-600">{formatCurrency(receipt.amount_paid)}</p>
//                                             <p className="text-xs text-muted-foreground">
//                                               {formatDate(receipt.payment_date)} • {capitalize(receipt.payment_method)}
//                                             </p>
//                                           </div>
//                                           <Badge className="bg-green-600 text-white text-xs">Paid</Badge>
//                                         </div>
//                                         {receipt.receipt_number && (
//                                           <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
//                                             <p className="text-xs text-muted-foreground">Receipt No.</p>
//                                             <p className="text-xs font-mono font-semibold">{receipt.receipt_number}</p>
//                                           </div>
//                                         )}
//                                         {receipt.transaction_id && (
//                                           <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
//                                             <p className="text-xs text-muted-foreground">Transaction ID</p>
//                                             <p className="text-xs font-mono font-semibold">{receipt.transaction_id}</p>
//                                           </div>
//                                         )}
//                                         {receipt.collected_by && (
//                                           <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
//                                             <p className="text-xs text-muted-foreground">Collected By</p>
//                                             <p className="text-xs font-semibold">
//                                               {typeof receipt.collected_by === 'object' && 'full_name' in receipt.collected_by
//                                                 ? receipt.collected_by.full_name
//                                                 : String(receipt.collected_by)}
//                                             </p>
//                                           </div>
//                                         )}
//                                         {receipt.remarks && (
//                                           <p className="text-xs text-muted-foreground">Remarks: {receipt.remarks}</p>
//                                         )}
//                                         <div className="flex justify-end pt-1">
//                                           <Button variant="ghost" size="sm"
//                                             className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs h-7"
//                                             onClick={() => setDeleteTarget({ type: 'receipt', id: receipt._id, label: `Receipt ${receipt.receipt_number ?? ''} — ${formatCurrency(receipt.amount_paid)}` })}>
//                                             <Trash2 className="h-3.5 w-3.5" /> Delete Receipt
//                                           </Button>
//                                         </div>
//                                       </div>
//                                     ))}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           )}
//                         </CardContent>
//                       </Card>
//                     )
//                   })}
//                   {paidFees.length > PAGE_SIZE && (
//                     <Pagination currentPage={paidPage} totalPages={Math.ceil(paidFees.length / PAGE_SIZE)} onPageChange={setPaidPage} />
//                   )}
//                 </div>
//               )}

//               {/* STRUCTURE TAB */}
//               {feeTab === 'structure' && (
//                 <div className="space-y-3">
//                   {!structureFee ? (
//                     <div className="text-center py-8">
//                       <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
//                       <p className="text-muted-foreground">No fee structure available{selectedYear ? ` for ${selectedYear}` : ''}.</p>
//                     </div>
//                   ) : (
//                     <>
//                       <div className="flex items-center justify-between mb-2">
//                         <p className="text-sm font-medium">Fee components{selectedYear ? ` for ${selectedYear}` : ''}</p>
//                         <Badge variant="outline">{structureFee.fee_snapshot?.length ?? 0} items</Badge>
//                       </div>
//                       {feesForYear.map(fee => fee.fee_snapshot?.length > 0 && (
//                         <Card key={fee._id}>
//                           <CardContent className="p-4">
//                             <div className="flex items-center justify-between mb-3">
//                               <p className="font-semibold">{termLabel(fee.term_id)}</p>
//                               {getStatusBadge(fee.status)}
//                             </div>
//                             <div className="space-y-2">
//                               {fee.fee_snapshot.map((item, i) => (
//                                 <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
//                                   <div>
//                                     <p className="text-sm font-medium">{item.name}</p>
//                                     {item.frequency && (
//                                       <p className="text-xs text-muted-foreground capitalize">{item.frequency.replace('_', ' ')}</p>
//                                     )}
//                                   </div>
//                                   <p className="font-bold">{formatCurrency(item.amount)}</p>
//                                 </div>
//                               ))}
//                             </div>
//                             <Separator className="my-3" />
//                             <div className="flex justify-between">
//                               <p className="font-bold">Term Total</p>
//                               <p className="font-bold text-[#1897C6]">{formatCurrency(fee.total_amount)}</p>
//                             </div>
//                           </CardContent>
//                         </Card>
//                       ))}
//                       <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#1897C6]/10 to-[#67BAC3]/10 rounded-lg border-2 border-[#1897C6]/30">
//                         <p className="font-bold text-lg">Total Annual Fee</p>
//                         <p className="text-2xl font-bold text-[#1897C6]">{formatCurrency(totalAmount)}</p>
//                       </div>
//                     </>
//                   )}
//                 </div>
//               )}

//               {/* HISTORY TAB */}
//               {feeTab === 'history' && (
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <p className="text-sm text-muted-foreground">All payment transactions{selectedYear ? ` for ${selectedYear}` : ''}</p>
//                     <p className="text-sm text-muted-foreground">{yearReceipts.length} transaction{yearReceipts.length !== 1 ? 's' : ''}</p>
//                   </div>
//                   {yearReceipts.length === 0 ? (
//                     <div className="text-center py-8">
//                       <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
//                       <p className="text-muted-foreground">No payment history found{selectedYear ? ` for ${selectedYear}` : ''}.</p>
//                     </div>
//                   ) : paginatedHistory.map(receipt => {
//                     const parentFee = feesForYear.find(f => receiptMatchesFee(receipt, f._id))
//                     return (
//                       <Card key={receipt._id} className="border-2 border-green-200 bg-green-50">
//                         <CardContent className="p-4">
//                           <div className="flex items-center justify-between gap-3">
//                             <div className="flex items-center gap-3">
//                               <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
//                                 <CheckCircle className="h-5 w-5 text-green-600" />
//                               </div>
//                               <div>
//                                 <p className="font-semibold">{parentFee ? termLabel(parentFee.term_id) : 'Payment'}</p>
//                                 <p className="text-sm text-muted-foreground">
//                                   {formatDate(receipt.payment_date)} • {capitalize(receipt.payment_method)}
//                                 </p>
//                                 {receipt.receipt_number && (
//                                   <p className="text-xs text-muted-foreground mt-0.5 font-mono">Receipt: {receipt.receipt_number}</p>
//                                 )}
//                                 {receipt.transaction_id && (
//                                   <p className="text-xs text-muted-foreground mt-0.5">Txn: {receipt.transaction_id}</p>
//                                 )}
//                               </div>
//                             </div>
//                             <div className="text-right">
//                               <p className="text-xl font-bold text-green-600">{formatCurrency(receipt.amount_paid)}</p>
//                               <Badge className="bg-green-600 mt-1">Paid</Badge>
//                             </div>
//                           </div>
//                           {(receipt.collected_by || receipt.remarks) && (
//                             <div className="mt-3 pt-3 border-t space-y-1">
//                               {receipt.collected_by && (
//                                 <p className="text-xs text-muted-foreground">
//                                   Collected By:{' '}
//                                   <span className="font-semibold text-foreground">
//                                     {typeof receipt.collected_by === 'object' && 'full_name' in receipt.collected_by
//                                       ? receipt.collected_by.full_name
//                                       : String(receipt.collected_by)}
//                                   </span>
//                                 </p>
//                               )}
//                               {receipt.remarks && <p className="text-xs text-muted-foreground">Remarks: {receipt.remarks}</p>}
//                             </div>
//                           )}
//                           <div className="mt-2 pt-2 border-t flex justify-end gap-1">
//                             <Button variant="ghost" size="sm"
//                               className="text-[#1897C6] hover:text-[#1276a0] hover:bg-blue-50 gap-1.5 text-xs h-7"
//                               onClick={() => downloadReceipt(receipt, parentFee)}>
//                               <Download className="h-3.5 w-3.5" /> Download
//                             </Button>
//                             <Button variant="ghost" size="sm"
//                               className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs h-7"
//                               onClick={() => setDeleteTarget({ type: 'receipt', id: receipt._id, label: `Receipt ${receipt.receipt_number ?? ''} — ${formatCurrency(receipt.amount_paid)}` })}>
//                               <Trash2 className="h-3.5 w-3.5" /> Delete Receipt
//                             </Button>
//                           </div>
//                         </CardContent>
//                       </Card>
//                     )
//                   })}
//                   {yearReceipts.length > PAGE_SIZE && (
//                     <Pagination currentPage={historyPage} totalPages={Math.ceil(yearReceipts.length / PAGE_SIZE)} onPageChange={setHistoryPage} />
//                   )}
//                 </div>
//               )}

//             </CardContent>
//           </Card>
//         </>
//       )}

//       {/* ══════════════════════════════════════════════════════════════════════
//            EDIT FEE STRUCTURE DIALOG
//            Calls PUT /fee-structures/:id  (template update)
//            Then  PUT /student-fees/:id    (student record update)
//       ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={showEditStructureDialog} onOpenChange={setShowEditStructureDialog}>
//         <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto w-full max-h-[90vh] flex flex-col">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <Edit className="h-5 w-5 text-[#1897C6]" /> Edit Fee Structure
//             </DialogTitle>
//             <DialogDescription>
//               Update fee components. Changes will be saved to the fee structure template and
//               this student's fee record will be recalculated.
//             </DialogDescription>
//           </DialogHeader>

//           {editingStructure && (
//             <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-1">
//               {editingStructure.fee_heads.map((head, idx) => (
//                 <div key={idx} className="p-4 border rounded-lg space-y-3 relative">
//                   {editingStructure.fee_heads.length > 1 && (
//                     <button
//                       type="button"
//                       className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
//                       onClick={() =>
//                         setEditingStructure(prev => prev
//                           ? { ...prev, fee_heads: prev.fee_heads.filter((_, i) => i !== idx) }
//                           : prev)
//                       }
//                       title="Remove component"
//                     >
//                       <Trash2 className="h-4 w-4" />
//                     </button>
//                   )}
//                   <div>
//                     <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
//                       Fee Component Name *
//                     </Label>
//                     <Input
//                       value={head.name}
//                       placeholder="e.g., Tuition Fee"
//                       className="mt-1"
//                       onChange={e =>
//                         setEditingStructure(prev => {
//                           if (!prev) return prev
//                           const heads = [...prev.fee_heads]
//                           heads[idx] = { ...heads[idx], name: e.target.value }
//                           return { ...prev, fee_heads: heads }
//                         })
//                       }
//                     />
//                   </div>
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount (₹) *</Label>
//                       <Input
//                         type="number" min="0"
//                         value={head.amount}
//                         className="mt-1"
//                         onChange={e =>
//                           setEditingStructure(prev => {
//                             if (!prev) return prev
//                             const heads = [...prev.fee_heads]
//                             heads[idx] = { ...heads[idx], amount: Number(e.target.value) }
//                             return { ...prev, fee_heads: heads }
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frequency *</Label>
//                       <select
//                         value={head.frequency}
//                         className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//                         onChange={e =>
//                           setEditingStructure(prev => {
//                             if (!prev) return prev
//                             const heads = [...prev.fee_heads]
//                             heads[idx] = { ...heads[idx], frequency: e.target.value as FeeHead['frequency'] }
//                             return { ...prev, fee_heads: heads }
//                           })
//                         }
//                       >
//                         <option value="one_time">One Time</option>
//                         <option value="monthly">Monthly</option>
//                         <option value="quarterly">Quarterly</option>
//                         <option value="half_yearly">Half Yearly</option>
//                         <option value="annual">Annual</option>
//                       </select>
//                     </div>
//                   </div>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={head.mandatory ?? true}
//                       onChange={e =>
//                         setEditingStructure(prev => {
//                           if (!prev) return prev
//                           const heads = [...prev.fee_heads]
//                           heads[idx] = { ...heads[idx], mandatory: e.target.checked }
//                           return { ...prev, fee_heads: heads }
//                         })
//                       }
//                       className="rounded border-input"
//                     />
//                     <span className="text-xs text-muted-foreground">Mandatory</span>
//                   </label>
//                 </div>
//               ))}

//               <Button
//                 type="button" variant="outline" size="sm" className="w-full gap-1.5"
//                 onClick={() =>
//                   setEditingStructure(prev => prev
//                     ? { ...prev, fee_heads: [...prev.fee_heads, { name: '', amount: 0, frequency: 'monthly', mandatory: true }] }
//                     : prev)
//                 }
//               >
//                 <Plus className="h-4 w-4" /> Add Fee Component
//               </Button>

//               {/* Live preview */}
//               <div className="p-4 border-2 border-[#1897C6]/30 rounded-lg bg-[#1897C6]/5 space-y-2">
//                 <div className="flex justify-between text-sm">
//                   <span className="text-muted-foreground">New Term Total</span>
//                   <span className="font-bold text-[#1897C6]">
//                     {formatCurrency(editingStructure.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}
//                   </span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span className="text-muted-foreground">Already Paid</span>
//                   <span className="font-medium text-green-600">
//                     {formatCurrency(feesForYear.find(f => f._id === editingStructure.studentFeeId)?.paid_amount ?? 0)}
//                   </span>
//                 </div>
//                 <Separator />
//                 <div className="flex justify-between">
//                   <span className="font-semibold">New Due Amount</span>
//                   <span className="font-bold text-red-600">
//                     {formatCurrency(Math.max(0,
//                       editingStructure.fee_heads.reduce((s, h) => s + Number(h.amount), 0) -
//                       Number(feesForYear.find(f => f._id === editingStructure.studentFeeId)?.paid_amount ?? 0)
//                     ))}
//                   </span>
//                 </div>
//               </div>

//               {structureError && (
//                 <p className="text-sm text-red-600 flex items-center gap-1">
//                   <AlertCircle className="h-4 w-4 shrink-0" /> {structureError}
//                 </p>
//               )}
//             </div>
//           )}

//           <DialogFooter className="pt-2 gap-2">
//             <Button variant="outline" onClick={() => setShowEditStructureDialog(false)} disabled={isSavingStructure}>
//               Cancel
//             </Button>
//             <Button
//               className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//               disabled={isSavingStructure || !editingStructure || editingStructure.fee_heads.length === 0}
//               onClick={handleSaveStructure}
//             >
//               {isSavingStructure
//                 ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
//                 : <><Edit className="h-4 w-4 mr-2" />Save Changes</>}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* ══════════════════════════════════════════════════════════════════════
//            ADD PAYMENT DIALOG
//       ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
//         <DialogContent className="w-[95vw] sm:w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto max-h-[90vh] flex flex-col p-4 sm:p-6">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
//               <DollarSign className="h-5 w-5 text-[#1897C6]" /> Add Payment
//             </DialogTitle>
//             <DialogDescription className="text-xs sm:text-sm">
//               Record a new fee payment for this student.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-4 overflow-y-auto pr-1 sm:pr-2">
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div className="sm:col-span-2">
//                 <Label>Fee Term *</Label>
//                 <select
//                   value={paymentForm.student_fee_id}
//                   className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//                   onChange={e => handleFeeTermSelect(e.target.value)}
//                 >
//                   <option value="">Select term</option>
//                   {fees
//                     .filter(f => ['pending', 'overdue'].includes(f.status) || (f.status === 'partial' && Number(f.due_amount) > 0))
//                     .map(fee => (
//                       <option key={fee._id} value={fee._id}>
//                         {termLabel(fee.term_id)} — {fee.academic_year} (Due: {formatCurrency(fee.due_amount)})
//                       </option>
//                     ))}
//                 </select>
//               </div>
//               <div>
//                 <Label>Amount Paid (₹) *</Label>
//                 <Input type="number" placeholder="Enter amount" value={paymentForm.amount_paid} className="mt-1" min="1"
//                   max={paymentForm.student_fee_id ? String(fees.find(f => f._id === paymentForm.student_fee_id)?.due_amount ?? '') : undefined}
//                   onChange={e => setPaymentForm(prev => ({ ...prev, amount_paid: e.target.value }))} />
//               </div>
//               <div>
//                 <Label>Payment Method *</Label>
//                 <select value={paymentForm.payment_method}
//                   className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//                   onChange={e => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}>
//                   <option value="cash">Cash</option>
//                   <option value="upi">UPI</option>
//                   <option value="card">Card</option>
//                   <option value="online">Online</option>
//                   <option value="cheque">Cheque</option>
//                 </select>
//               </div>
//               <div>
//                 <Label>Payment Date *</Label>
//                 <Input type="date" value={paymentForm.payment_date} className="mt-1"
//                   onChange={e => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))} />
//               </div>
//               <div>
//                 <Label className="text-sm">Transaction ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
//                 <Input placeholder="UPI / Cheque / Reference number" value={paymentForm.transaction_id} className="mt-1"
//                   onChange={e => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))} />
//               </div>
//               <div className="sm:col-span-2">
//                 <Label>Collected By <span className="text-xs text-muted-foreground">(optional)</span></Label>
//                 <select value={paymentForm.collected_by} disabled={loadingTeachers}
//                   className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//                   onChange={e => setPaymentForm(prev => ({ ...prev, collected_by: e.target.value }))}>
//                   <option value="">{loadingTeachers ? 'Loading teachers...' : 'Select teacher'}</option>
//                   {teachers.map(t => <option key={t._id} value={t._id}>{t.full_name}</option>)}
//                 </select>
//               </div>
//               <div className="sm:col-span-2">
//                 <Label>Remarks <span className="text-xs text-muted-foreground">(optional)</span></Label>
//                 <Input placeholder="Any notes about this payment" value={paymentForm.remarks} className="mt-1"
//                   onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))} />
//               </div>
//             </div>
//             {paymentError && (
//               <p className="text-sm text-red-600 flex items-center gap-1">
//                 <AlertCircle className="h-4 w-4 shrink-0" /> {paymentError}
//               </p>
//             )}
//           </div>

//           <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
//             <Button variant="outline" className="w-full sm:w-auto"
//               onClick={() => setShowAddPaymentDialog(false)} disabled={isSavingPayment}>
//               Cancel
//             </Button>
//             <Button
//               className="w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//               disabled={isSavingPayment || !paymentForm.student_fee_id || !paymentForm.amount_paid || Number(paymentForm.amount_paid) <= 0 || !paymentForm.payment_date}
//               onClick={handleSavePayment}
//             >
//               {isSavingPayment ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Record Payment'}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* ══════════════════════════════════════════════════════════════════════
//            NOTICE DETAIL DIALOG
//       ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={showNoticeDialog} onOpenChange={setShowNoticeDialog}>
//         <DialogContent className="max-w-[95vw] sm:max-w-lg mx-auto w-full">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <AlertCircle className="h-5 w-5 text-orange-500" />{activeNotice?.title}
//             </DialogTitle>
//             {activeNotice?.publishDate && (
//               <DialogDescription>
//                 Published: {formatDate(activeNotice.publishDate)}
//                 {activeNotice.expiryDate && ` • Expires: ${formatDate(activeNotice.expiryDate)}`}
//               </DialogDescription>
//             )}
//           </DialogHeader>
//           <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
//             <p className="text-sm leading-relaxed break-words">{activeNotice?.content}</p>
//             {activeNotice?.fullDescription && (
//               <><Separator /><p className="text-sm leading-relaxed text-muted-foreground break-words">{activeNotice.fullDescription}</p></>
//             )}
//             {activeNotice?.docUrl && (() => {
//               const fullUrl = buildFileUrl(activeNotice.docUrl) ?? ''
//               const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(activeNotice.docUrl)
//               return (
//                 <div className="space-y-2">
//                   {isImage && (
//                     <div className="rounded-lg overflow-hidden border border-orange-200 max-h-60">
//                       <img src={fullUrl} alt="Notice attachment" className="w-full h-full object-contain" />
//                     </div>
//                   )}
//                   <a href={fullUrl} target="_blank" rel="noopener noreferrer"
//                     className="inline-flex items-center gap-2 text-sm text-[#1897C6] hover:underline break-all">
//                     <Download className="h-4 w-4 shrink-0" />
//                     {isImage ? 'Open Full Image' : 'View Attached Document'}
//                   </a>
//                 </div>
//               )
//             })()}
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setShowNoticeDialog(false)}>Close</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* ══════════════════════════════════════════════════════════════════════
//            CONFIRM DELETE DIALOG
//       ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open && !isDeletingRecord) { setDeleteTarget(null); setDeleteError(null) } }}>
//         <DialogContent className="max-w-[95vw] sm:max-w-sm mx-auto">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-red-600">
//               <Trash2 className="h-5 w-5" /> Confirm Delete
//             </DialogTitle>
//             <DialogDescription>This action cannot be undone.</DialogDescription>
//           </DialogHeader>
//           <div className="py-2 space-y-2">
//             <p className="text-sm text-muted-foreground">Are you sure you want to delete:</p>
//             <p className="text-sm font-semibold break-words">{deleteTarget?.label}</p>
//             {deleteTarget?.type === 'studentFee' && (
//               <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
//                 ⚠️ Deleting a fee record will also remove all its associated receipts and cannot be recovered.
//               </p>
//             )}
//             {deleteError && (
//               <p className="text-sm text-red-600 flex items-center gap-1">
//                 <AlertCircle className="h-4 w-4 shrink-0" /> {deleteError}
//               </p>
//             )}
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={isDeletingRecord}>
//               Cancel
//             </Button>
//             <Button variant="destructive" disabled={isDeletingRecord} onClick={handleConfirmDelete}>
//               {isDeletingRecord ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" />Delete</>}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* ══════════════════════════════════════════════════════════════════════
//            CREATE FEE DIALOG
//       ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={showCreateFeeDialog} onOpenChange={open => { if (!open && !isSavingFee) { setShowCreateFeeDialog(false); setCreateFeeError(null) } }}>
//         <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto w-full max-h-[90vh] flex flex-col">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <Plus className="h-5 w-5 text-[#1897C6]" />
//               Create Fee Record
//               <span className="ml-auto text-xs font-normal text-muted-foreground">Step {createFeeStep} of 3</span>
//             </DialogTitle>
//             <DialogDescription>
//               {createFeeStep === 1 && 'Define the fee components for this student.'}
//               {createFeeStep === 2 && 'Set the term period and due date.'}
//               {createFeeStep === 3 && 'Review and confirm the fee details.'}
//             </DialogDescription>
//           </DialogHeader>

//           <div className="flex gap-1.5 mb-1">
//             {([1, 2, 3] as const).map(s => (
//               <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= createFeeStep ? 'bg-[#1897C6]' : 'bg-muted'}`} />
//             ))}
//           </div>

//           <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
//             {createFeeStep === 1 && (
//               <>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                   <div>
//                     <Label>Academic Year *</Label>
//                     <Input placeholder="e.g., 2025-26" value={createFeeForm.academic_year} className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, academic_year: e.target.value }))} />
//                   </div>
//                   <div>
//                     <Label>Class *</Label>
//                     <select value={selectedClassId} disabled={loadingClasses}
//                       className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60"
//                       onChange={e => { setSelectedClassId(e.target.value); setSelectedBatchId(''); fetchBatchesForClass(e.target.value) }}>
//                       <option value="">{loadingClasses ? 'Loading...' : 'Select class'}</option>
//                       {classes.map(c => <option key={c._id} value={c._id}>{c.class_name}</option>)}
//                     </select>
//                   </div>
//                 </div>
//                 {selectedClassId && (
//                   <div>
//                     <Label>Batch <span className="text-muted-foreground text-xs">(optional)</span></Label>
//                     <select value={selectedBatchId} disabled={loadingBatches}
//                       className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60"
//                       onChange={e => setSelectedBatchId(e.target.value)}>
//                       <option value="">{loadingBatches ? 'Loading...' : 'No batch (class-level)'}</option>
//                       {batches.map(b => <option key={b._id} value={b._id ?? ''}>{b.batch_name}</option>)}
//                     </select>
//                   </div>
//                 )}
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between">
//                     <Label>Fee Components *</Label>
//                     <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addFeeHead}>
//                       <Plus className="h-3 w-3" /> Add Component
//                     </Button>
//                   </div>
//                   {createFeeForm.fee_heads.map((head, idx) => (
//                     <div key={idx} className="p-3 border rounded-lg space-y-2 relative">
//                       {createFeeForm.fee_heads.length > 1 && (
//                         <button type="button" className="absolute top-2 right-2 text-red-400 hover:text-red-600"
//                           onClick={() => removeFeeHead(idx)} title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
//                       )}
//                       <div>
//                         <Label className="text-xs text-muted-foreground">Component Name *</Label>
//                         <Input placeholder="e.g., Tuition Fee" value={head.name} className="mt-1"
//                           onChange={e => updateFeeHead(idx, 'name', e.target.value)} />
//                       </div>
//                       <div className="grid grid-cols-2 gap-2">
//                         <div>
//                           <Label className="text-xs text-muted-foreground">Amount (₹) *</Label>
//                           <Input type="number" min="1" placeholder="0" value={head.amount || ''} className="mt-1"
//                             onChange={e => updateFeeHead(idx, 'amount', Number(e.target.value))} />
//                         </div>
//                         <div>
//                           <Label className="text-xs text-muted-foreground">Frequency *</Label>
//                           <select value={head.frequency}
//                             className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//                             onChange={e => updateFeeHead(idx, 'frequency', e.target.value)}>
//                             <option value="one_time">One Time</option>
//                             <option value="monthly">Monthly</option>
//                             <option value="quarterly">Quarterly</option>
//                             <option value="half_yearly">Half Yearly</option>
//                             <option value="annual">Annual</option>
//                           </select>
//                         </div>
//                       </div>
//                       <label className="flex items-center gap-2 cursor-pointer">
//                         <input type="checkbox" checked={head.mandatory}
//                           onChange={e => updateFeeHead(idx, 'mandatory', e.target.checked)} className="rounded border-input" />
//                         <span className="text-xs text-muted-foreground">Mandatory</span>
//                       </label>
//                     </div>
//                   ))}
//                   <div className="flex justify-between p-3 rounded-lg bg-muted/30 text-sm">
//                     <span className="text-muted-foreground">Term Total</span>
//                     <span className="font-bold text-[#1897C6]">
//                       {formatCurrency(createFeeForm.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}
//                     </span>
//                   </div>
//                 </div>
//               </>
//             )}

//             {createFeeStep === 2 && (
//               <>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <Label>Term Name *</Label>
//                     <Input placeholder="e.g., April" value={createFeeForm.term_name} className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, term_name: e.target.value }))} />
//                   </div>
//                   <div>
//                     <Label>Term Order <span className="text-muted-foreground text-xs">(optional)</span></Label>
//                     <Input type="number" min="1" placeholder="e.g., 1" value={createFeeForm.term_order} className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, term_order: e.target.value }))} />
//                   </div>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <Label>Start Date *</Label>
//                     <Input type="date" value={createFeeForm.start_date} className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, start_date: e.target.value }))} />
//                   </div>
//                   <div>
//                     <Label>Due Date *</Label>
//                     <Input type="date" value={createFeeForm.due_date} className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, due_date: e.target.value }))} />
//                   </div>
//                 </div>
//                 <div>
//                   <Label>Late Fee Amount (₹) <span className="text-muted-foreground text-xs">(optional)</span></Label>
//                   <Input type="number" min="0" placeholder="e.g., 200" value={createFeeForm.late_fee_amount} className="mt-1"
//                     onChange={e => setCreateFeeForm(p => ({ ...p, late_fee_amount: e.target.value }))} />
//                 </div>
//               </>
//             )}

//             {createFeeStep === 3 && (
//               <div className="space-y-3">
//                 <div className="p-3 border rounded-lg space-y-1">
//                   <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Structure</p>
//                   <p className="text-sm">Academic Year: <span className="font-medium">{createFeeForm.academic_year}</span></p>
//                   <p className="text-sm">Class: <span className="font-medium">{classes.find(c => c._id === selectedClassId)?.class_name ?? selectedClassId}</span></p>
//                   {selectedBatchId && <p className="text-sm">Batch: <span className="font-medium">{batches.find(b => b._id === selectedBatchId)?.batch_name ?? selectedBatchId}</span></p>}
//                   {createFeeForm.fee_heads.map((h, i) => (
//                     <div key={i} className="flex justify-between text-sm py-1 border-t">
//                       <span>{h.name} <span className="text-muted-foreground text-xs capitalize">({h.frequency.replace('_', ' ')})</span></span>
//                       <span className="font-medium">{formatCurrency(h.amount)}</span>
//                     </div>
//                   ))}
//                   <div className="flex justify-between text-sm pt-1 border-t font-bold">
//                     <span>Term Total</span>
//                     <span className="text-[#1897C6]">{formatCurrency(createFeeForm.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}</span>
//                   </div>
//                 </div>
//                 <div className="p-3 border rounded-lg space-y-1">
//                   <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Term</p>
//                   <p className="text-sm">Name: <span className="font-medium">{createFeeForm.term_name}</span></p>
//                   <p className="text-sm">Period: <span className="font-medium">{formatDate(createFeeForm.start_date)} → {formatDate(createFeeForm.due_date)}</span></p>
//                   {createFeeForm.late_fee_amount && <p className="text-sm">Late Fee: <span className="font-medium">{formatCurrency(Number(createFeeForm.late_fee_amount))}</span></p>}
//                 </div>
//                 <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
//                   This will create a fee structure, a fee term, and generate a fee record for this student.
//                 </p>
//               </div>
//             )}

//             {createFeeError && (
//               <p className="text-sm text-red-600 flex items-start gap-1.5">
//                 <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {createFeeError}
//               </p>
//             )}
//           </div>

//           <DialogFooter className="gap-2">
//             <Button variant="outline" disabled={isSavingFee}
//               onClick={() => {
//                 if (createFeeStep === 1) { setShowCreateFeeDialog(false); setCreateFeeError(null) }
//                 else setCreateFeeStep(s => (s - 1) as 1 | 2 | 3)
//               }}>
//               {createFeeStep === 1 ? 'Cancel' : '← Back'}
//             </Button>
//             {createFeeStep < 3 && (
//               <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//                 onClick={() => {
//                   setCreateFeeError(null)
//                   const err = createFeeStep === 1 ? validateCreateStep1() : validateCreateStep2()
//                   if (err) { setCreateFeeError(err); return }
//                   if (createFeeStep === 1) {
//                     const yearMatch = fees.find(f => f.academic_year === createFeeForm.academic_year.trim())
//                     if (yearMatch) setCreateFeeError(`⚠️ This student already has a fee record for ${createFeeForm.academic_year}. Creating another may fail if the same batch is selected.`)
//                   }
//                   setCreateFeeStep(s => (s + 1) as 2 | 3)
//                 }}>
//                 Next →
//               </Button>
//             )}
//             {createFeeStep === 3 && (
//               <Button className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]" disabled={isSavingFee} onClick={handleConfirmCreateFee}>
//                 {isSavingFee ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Confirm & Create'}
//               </Button>
//             )}
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//     </div>
//   )
// }




























































































// 'use client'

// import { useState } from 'react'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
// import { Label } from '@/components/ui/label'
// import { Input } from '@/components/ui/input' 
// import { Progress } from '@/components/ui/progress'
// import { Separator } from '@/components/ui/separator' 
// import {
//   Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
// } from '@/components/ui/dialog'
// import {
//   AlertCircle, CalendarDays, CheckCircle, ChevronDown, ChevronUp,
//   Clock, DollarSign, Download, Edit, Eye, FileText, Loader2, Plus, Trash2, TrendingUp,
// } from 'lucide-react'
// import type { StudentFee, FeeReceipt, FeeHead, FeeSnapshotItem, StudentFeeStatus } from '@/lib/api/fee'
// import {
//   studentFeeApi, feeStructureApi, feeReceiptApi, feeTermApi,  
//   extractId, resolveTermLabel, calcTotalFromHeads,
// } from '@/lib/api/fee'
// import type { Notice } from '@/lib/api/notices'
// import { classesApi } from '@/lib/api/classes'
// import { teachersApi } from '@/lib/api/teachers'
// import type { ClassMaster, CoachingBatch } from '@/lib/api/classes'
// import type { Teacher } from '@/lib/api/teachers'
// import { capitalize, formatCurrency, formatDate, getStatusBadge } from '../_utils/helpers'
// import { buildFileUrl } from '../_utils/helpers'
// import { Pagination } from '@/components/pagination' 

// // ─── Props ────────────────────────────────────────────────────────────────────

// interface FeesTabProps {
//   fees: StudentFee[]
//   feeReceipts: FeeReceipt[]
//   feeTermsMap: Record<string, string>
//   selectedYear: string
//   setSelectedYear: (year: string) => void
//   loadingFees: boolean
//   loadingNotices: boolean
//   notices: Notice[]
//   studentId: string
//   refreshFees: () => Promise<void>
//   /** Student's current class/section/batch — needed to generate fee records */
//   classId?: string
//   sectionId?: string | null
//   batchId?: string | null
// }
// type PaymentMethod = 'cash' | 'card' | 'online' | 'cheque' | 'upi'

// // ─── Component ────────────────────────────────────────────────────────────────

// export function FeesTab({
//   fees, feeReceipts, feeTermsMap, selectedYear, setSelectedYear,
//   loadingFees, loadingNotices, notices, studentId, refreshFees,
//   classId: propClassId, sectionId: propSectionId, batchId: propBatchId,
// }: FeesTabProps) {
//   const [feeTab, setFeeTab] = useState<'pending' | 'paid' | 'structure' | 'history'>('pending')
//   const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null)

//   // ── Edit Structure state ────────────────────────────────────────────────────
//   const [showEditStructureDialog, setShowEditStructureDialog] = useState(false)
//   // studentFeeId = StudentFee._id (to update the student's own record)
//   // structureId  = FeeStructure._id (to update the template)
//   const [editingStructure, setEditingStructure] = useState<{
//     studentFeeId: string
//     structureId: string
//     fee_heads: FeeHead[]
//   } | null>(null)
//   const [isSavingStructure, setIsSavingStructure] = useState(false)
//   const [structureError, setStructureError] = useState<string | null>(null)

//   // ── Add Payment state ───────────────────────────────────────────────────────
//   const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
//  const [paymentForm, setPaymentForm] = useState({
//     student_fee_id: '',
//     term_id: '',
//     amount_paid: '',
//     payment_method: 'cash' as PaymentMethod,
//     payment_date: new Date().toISOString().split('T')[0],
//     transaction_id: '',
//     collected_by: '',
//     remarks: '',
//   })
//   const [isSavingPayment, setIsSavingPayment] = useState(false)
//   const [paymentError, setPaymentError] = useState<string | null>(null)

//  // ── Delete state ────────────────────────────────────────────────────────────
//   const [deleteTarget, setDeleteTarget] = useState<{
//     type: 'receipt' | 'studentFee'
//     id: string
//     label: string
//   } | null>(null)
//   const [isDeletingRecord, setIsDeletingRecord] = useState(false)
//   const [deleteError, setDeleteError] = useState<string | null>(null)

// // ── Notice dialog state ─────────────────────────────────────────────────────
//   const [showNoticeDialog, setShowNoticeDialog] = useState(false)
//   const [activeNotice, setActiveNotice] = useState<Notice | null>(null)

//   const [classes,  setClasses]  = useState<ClassMaster[]>([])
//   const [batches,  setBatches]  = useState<CoachingBatch[]>([])
//   const [teachers, setTeachers] = useState<Teacher[]>([])
//   const [selectedClassId,  setSelectedClassId]  = useState<string>('')
//   const [selectedBatchId,  setSelectedBatchId]  = useState<string>('')
//   const [loadingClasses,  setLoadingClasses]  = useState(false)
//   const [loadingBatches,  setLoadingBatches]  = useState(false)
//   const [loadingTeachers, setLoadingTeachers] = useState(false)

//   // ── Create Fee dialog state ─────────────────────────────────────────────────
//   const [showCreateFeeDialog, setShowCreateFeeDialog] = useState(false)
//   const [createFeeStep, setCreateFeeStep] = useState<1 | 2 | 3>(1)
//   const [isSavingFee, setIsSavingFee] = useState(false)
//   const [createFeeError, setCreateFeeError] = useState<string | null>(null)

//   const emptyFeeHead = (): FeeHead => ({ name: '', amount: 0, frequency: 'monthly', mandatory: true })

//   const [createFeeForm, setCreateFeeForm] = useState<{
//     academic_year: string
//     fee_heads: FeeHead[]
//     term_name: string
//     term_order: string
//     start_date: string
//     due_date: string
//     late_fee_amount: string
//   }>({
//     academic_year: '',
//     fee_heads: [emptyFeeHead()],
//     term_name: '',
//     term_order: '',
//     start_date: '',
//     due_date: '',
//     late_fee_amount: '',
//   })

// // ── Pagination state ────────────────────────────────────────────────────────
// const [pendingPage, setPendingPage] = useState(1)
// const [paidPage, setPaidPage]       = useState(1)
// const [historyPage, setHistoryPage] = useState(1)
// const PAGE_SIZE = 5

// // ── Derived values ──────────────────────────────────────────────────────────

// const feesForYear = selectedYear === '' ? fees : fees.filter(f => f.academic_year === selectedYear)

// // partial appears in both tabs intentionally: still owes money (pending) + has paid something (paid)
// const pendingFees = feesForYear.filter(f => ['pending', 'overdue', 'partial'].includes(f.status))
// const paidFees    = feesForYear.filter(f => ['paid', 'partial'].includes(f.status))

// const totalAmount = feesForYear.reduce((s, f) => s + Number(f.total_amount), 0)
// const totalPaid   = feesForYear.reduce((s, f) => s + Number(f.paid_amount),  0)
// const totalDue    = feesForYear.reduce((s, f) => s + Number(f.due_amount),   0)
// const paymentPct  = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0
// const feeYears    = [...new Set(fees.map(f => f.academic_year))].sort().reverse()

// const yearReceipts     = feeReceipts.filter(r => feesForYear.some(f => receiptMatchesFee(r, f._id)))
// const sortedReceipts   = [...yearReceipts].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
// const paginatedPending = pendingFees.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE)
// const paginatedPaid    = paidFees.slice((paidPage - 1) * PAGE_SIZE, paidPage * PAGE_SIZE)
// const paginatedHistory = sortedReceipts.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE)

//   // structureFee is always taken from feesForYear[0] — used for Edit Structure dialog seed
//   const structureFee = feesForYear[0] ?? null

//   // ── Helpers ─────────────────────────────────────────────────────────────────

//   /** Compare a receipt's student_fee_id (may be populated object) against a plain StudentFee._id */
//   function receiptMatchesFee(receipt: FeeReceipt, feeId: string): boolean {
//     return extractId(receipt.student_fee_id as string | { _id: string }) === feeId
//   }

//   /** Resolve term label — uses populated .name when available, else falls back to map */
//   function termLabel(termId: StudentFee['term_id']): string {
//     return resolveTermLabel(
//       termId as string | { _id: string; name: string; term_order: number | null } | null,
//       feeTermsMap,
//     )
//   }

//   // ── Handlers ────────────────────────────────────────────────────────────────

//   function openEditStructure() {
//     if (!structureFee) return

//     // fee_structure_id comes from backend as populated object: { _id, academic_year }
//     // extractId() handles both string and object forms safely
//     const structureId = extractId(structureFee.fee_structure_id as string | { _id: string })
//     if (!structureId) {
//       setStructureError('Fee structure ID not found. Please reload and try again.')
//       setShowEditStructureDialog(true)
//       return
//     }

//     // Seed dialog from fee_snapshot (the student's actual charged amounts)
//     setEditingStructure({
//       studentFeeId: structureFee._id,
//       structureId,
//       fee_heads: structureFee.fee_snapshot.map(item => ({
//         name: item.name,
//         amount: item.amount,
//         frequency: (item.frequency ?? 'annual') as FeeHead['frequency'],
//         mandatory: true,
//       })),
//     })
//     setStructureError(null)
//     setShowEditStructureDialog(true)
//   }

//     function openAddPayment() {
//     fetchClassesAndTeachers()
//     // Only pre-select fees that actually need payment
//     const unpaidFees = feesForYear.filter(
//       f => ['pending', 'overdue'].includes(f.status) ||
//            (f.status === 'partial' && Number(f.due_amount) > 0)
//     )
//     const firstPending = unpaidFees[0] ?? null

//     // term_id may be a populated object — always extract to plain string
//     const termId = firstPending
//       ? extractId(firstPending.term_id as string | { _id: string })
//       : ''

//    setPaymentForm({
//       student_fee_id: firstPending?._id ?? '',
//       term_id: termId,
//       amount_paid: firstPending ? String(firstPending.due_amount) : '',
//       payment_method: 'cash',
//       payment_date: new Date().toISOString().split('T')[0],
//       transaction_id: '',
//       collected_by: '',
//       remarks: '',
//     })
//     setPaymentError(null)
//     setShowAddPaymentDialog(true)
//   }

//   function handleFeeTermSelect(feeId: string) {
//     if (!feeId) {
//       setPaymentForm(prev => ({ ...prev, student_fee_id: '', term_id: '', amount_paid: '' }))
//       return
//     }
//     const sel = fees.find(f => f._id === feeId)
//     if (!sel) {
//       setPaymentForm(prev => ({ ...prev, student_fee_id: feeId, term_id: '', amount_paid: '' }))
//       return
//     }
//     // term_id may be populated — always extract plain string
//     const termId = extractId(sel.term_id as string | { _id: string })
//     setPaymentForm(prev => ({
//       ...prev,
//       student_fee_id: feeId,
//       term_id: termId,
//       amount_paid: String(sel.due_amount),
//     }))
//   }

//   async function handleSaveStructure() {
//     if (!editingStructure) return
//     if (!editingStructure.studentFeeId || !editingStructure.structureId) {
//       setStructureError('Fee record IDs are missing. Please reload and try again.')
//       return
//     }

//     // Recalculate totals from edited heads (mirrors backend pre-save hook logic)
//     const newTotal  = calcTotalFromHeads(editingStructure.fee_heads)
//     const parentFee = feesForYear.find(f => f._id === editingStructure.studentFeeId)
//     if (!parentFee) {
//       setStructureError('Fee record not found. Please reload.')
//       return
//     }

//     const newDue = Math.max(0, newTotal - Number(parentFee.paid_amount))
//     const newStatus: StudentFeeStatus =
//       newDue === 0
//         ? 'paid'
//         : Number(parentFee.paid_amount) > 0
//           ? 'partial'
//           : parentFee.status === 'overdue'
//             ? 'overdue'
//             : 'pending'

//     const newSnapshot: FeeSnapshotItem[] = editingStructure.fee_heads.map(h => ({
//       name: h.name,
//       amount: h.amount,
//       frequency: h.frequency,
//     }))

//     setIsSavingStructure(true)
//     setStructureError(null)
//     try {
//       // 1. Update the student's own fee record (fee_snapshot, totals, status)
//       const studentRes = await studentFeeApi.update(editingStructure.studentFeeId, {
//         due_amount:    newDue,
//         status:        newStatus,
//         paid_amount:   Number(parentFee.paid_amount),
//       })
//       if (!studentRes.success) {
//         setStructureError(studentRes.message ?? 'Failed to update student fee record.')
//         return
//       }

//     // 2. Update fee structure template with fee_heads only.
//       // Backend uses .save() which triggers pre-save hook to recompute total_annual_amount automatically.
//       await feeStructureApi.update(editingStructure.structureId, {
//         fee_heads: editingStructure.fee_heads,
//       })
//       // Non-blocking — student record already updated above.

//       setShowEditStructureDialog(false)
//       await refreshFees()
//     } catch (err) {
//       console.error('[FeeStructure] Unexpected error:', err)
//       setStructureError('An unexpected error occurred. Please try again.')
//     } finally {
//       setIsSavingStructure(false)
//     }
//   }

//   async function handleSavePayment() {
//     const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//     if (!instituteId) {
//       setPaymentError('Session data missing. Please refresh and try again.')
//       return
//     }
//     if (!paymentForm.student_fee_id) {
//       setPaymentError('Please select a fee term.')
//       return
//     }
//     if (!paymentForm.amount_paid || Number(paymentForm.amount_paid) <= 0) {
//       setPaymentError('Please enter a valid amount.')
//       return
//     }
//     if (!paymentForm.payment_date) {
//       setPaymentError('Please select a payment date.')
//       return
//     }

//     // Guard: don't allow overpayment
//     const selectedFee = fees.find(f => f._id === paymentForm.student_fee_id)
//     if (selectedFee && Number(paymentForm.amount_paid) > Number(selectedFee.due_amount)) {
//       setPaymentError(`Amount cannot exceed due amount of ${formatCurrency(selectedFee.due_amount)}.`)
//       return
//     }
//     if (selectedFee?.status === 'paid' && Number(selectedFee.due_amount) === 0) {
//       setPaymentError('This fee term is already fully paid.')
//       return
//     }

//     setIsSavingPayment(true)
//     setPaymentError(null)
//     try {
//       const res = await feeReceiptApi.create({
//         institute_id:   instituteId,
//         student_id:     studentId,
//         student_fee_id: paymentForm.student_fee_id,
//         // term_id is already a plain string from extractId() — send null if empty
//         term_id:        paymentForm.term_id || null,
//         amount_paid:    Number(paymentForm.amount_paid),
//         payment_method: paymentForm.payment_method,
//         payment_date:   paymentForm.payment_date,
//          ...(paymentForm.transaction_id ? { transaction_id: paymentForm.transaction_id } : {}),
//         ...(paymentForm.collected_by   ? { collected_by: paymentForm.collected_by }     : {}),
//         ...(paymentForm.remarks        ? { remarks: paymentForm.remarks }             : {}),
//       })
//       if (res.success) {
//         setShowAddPaymentDialog(false)
//         // Reset form
//         setPaymentForm({
//           student_fee_id: '',
//           term_id: '',
//           amount_paid: '',
//           payment_method: 'cash',
//           payment_date: new Date().toISOString().split('T')[0],
//           transaction_id: '',
//           collected_by: '',
//           remarks: '',
//         })
//         await refreshFees()
//       } else {
//         setPaymentError(res.message ?? 'Failed to record payment.')
//       }
//     } catch (err) {
//       console.error('[AddPayment] Unexpected error:', err)
//       setPaymentError('An unexpected error occurred. Please try again.')
//     } finally {
//       setIsSavingPayment(false)
//     }
//   }

//    async function handleConfirmDelete() {
//     if (!deleteTarget) return
//     setIsDeletingRecord(true)
//     setDeleteError(null)
//     try {
//       const res =
//         deleteTarget.type === 'receipt'
//           ? await feeReceiptApi.delete(deleteTarget.id)
//           : await studentFeeApi.delete(deleteTarget.id)

//       if (res.success) {
//         setDeleteTarget(null)
//         await refreshFees()
//       } else {
//         setDeleteError((res as { message?: string }).message ?? 'Delete failed. Please try again.')
//       }
//     } catch (err) {
//       console.error('[Delete] Unexpected error:', err)
//       setDeleteError('An unexpected error occurred. Please try again.')
//     } finally {
//       setIsDeletingRecord(false)
//     }
//   }

//  // ── Create Fee Handler ──────────────────────────────────────────────────────

//  async function fetchClassesAndTeachers() {
//     const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//     if (!instituteId) return
//     setLoadingClasses(true)
//     try {
//       const res = await classesApi.getAll({ instituteId, status: 'active' })
//       if (res.success && res.result) setClasses(res.result as ClassMaster[])
//     } catch (e) { console.error('[FeesTab] fetchClasses error:', e) }
//     finally { setLoadingClasses(false) }

//     setLoadingTeachers(true)
//     try {
//       const instituteId2 = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//       const res = await teachersApi.getAll({ institute_id: instituteId2, status: 'active' })
//       if (res.success && res.result) setTeachers(res.result as Teacher[])
//     } catch (e) { console.error('[FeesTab] fetchTeachers error:', e) }
//     finally { setLoadingTeachers(false) }
//   }

//   async function fetchBatchesForClass(classId: string) {
//     if (!classId) { setBatches([]); return }
//     setLoadingBatches(true)
//     try {
//       const res = await classesApi.getBatchesByClass(classId)
//       if (res.success && res.result) setBatches(res.result as CoachingBatch[])
//       else setBatches([])
//     } catch (e) { console.error('[FeesTab] fetchBatches error:', e); setBatches([]) }
//     finally { setLoadingBatches(false) }
//   }

//  function openCreateFeeDialog() {
//     const ref = fees[0]
//     // Seed class_id from existing fee or props
//     const seedClassId = ref
//       ? (typeof ref.class_id === 'object' ? (ref.class_id as { _id: string })._id : ref.class_id)
//       : (propClassId ?? '')
//     const seedBatchId = ref
//       ? extractId(ref.batch_id as string | { _id: string } | null)
//       : (propBatchId ?? '')

//     setSelectedClassId(seedClassId ?? '')
//     setSelectedBatchId(seedBatchId ?? '')
//     setCreateFeeForm({
//       academic_year: ref?.academic_year ?? '',
//       fee_heads: [emptyFeeHead()],
//       term_name: '',
//       term_order: '',
//       start_date: '',
//       due_date: '',
//       late_fee_amount: '',
//     })
//     setCreateFeeStep(1)
//     setCreateFeeError(null)
//     fetchClassesAndTeachers()
//     if (seedClassId) fetchBatchesForClass(seedClassId)
//     setShowCreateFeeDialog(true)
//   }

//   function updateFeeHead(index: number, field: keyof FeeHead, value: string | number | boolean) {
//     setCreateFeeForm(prev => {
//       const heads = [...prev.fee_heads]
//       heads[index] = { ...heads[index], [field]: value }
//       return { ...prev, fee_heads: heads }
//     })
//   }

//   function addFeeHead() {
//     setCreateFeeForm(prev => ({ ...prev, fee_heads: [...prev.fee_heads, emptyFeeHead()] }))
//   }

//   function removeFeeHead(index: number) {
//     setCreateFeeForm(prev => ({
//       ...prev,
//       fee_heads: prev.fee_heads.filter((_, i) => i !== index),
//     }))
//   }

//    function validateCreateStep1(): string | null {
//     if (!createFeeForm.academic_year.trim()) return 'Academic year is required (e.g., 2025-26).'
//     if (!selectedClassId) return 'Please select a class.'
//     if (createFeeForm.fee_heads.length === 0) return 'At least one fee component is required.'
//     for (const h of createFeeForm.fee_heads) {
//       if (!h.name.trim()) return 'Each fee component must have a name.'
//       if (!h.amount || Number(h.amount) <= 0) return `Amount for "${h.name || 'a component'}" must be greater than 0.`
//     }
//     return null
//   }

//   function validateCreateStep2(): string | null {
//     if (!createFeeForm.term_name.trim()) return 'Term name is required (e.g., April).'
//     if (!createFeeForm.start_date) return 'Start date is required.'
//     if (!createFeeForm.due_date) return 'Due date is required.'
//     if (new Date(createFeeForm.due_date) < new Date(createFeeForm.start_date))
//       return 'Due date cannot be before the start date.'
//     return null
//   }

//   async function handleConfirmCreateFee() {
//     const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//     if (!instituteId) { setCreateFeeError('Session data missing. Please refresh and try again.'); return }

//     const classId   = selectedClassId || (fees[0] ? (typeof fees[0].class_id === 'object' ? (fees[0].class_id as { _id: string })._id : fees[0].class_id) : propClassId) || ''
//     const sectionId = propSectionId ?? null
//     const batchId   = selectedBatchId || (fees[0] ? extractId(fees[0].batch_id as string | { _id: string } | null) : propBatchId) || null

//     if (!classId) {
//       setCreateFeeError('Please select a class.')
//       return
//     }

//     setIsSavingFee(true)
//     setCreateFeeError(null)
//     try {
//       // Step A: Create Fee Structure
// let feeStructureId: string
//       const structureRes = await feeStructureApi.create({
//         institute_id:  instituteId,
//         academic_year: createFeeForm.academic_year.trim(),
//         class_id:      classId,
//         section_id:    sectionId || null,
//         batch_id:      batchId   || null,
//         fee_heads:     createFeeForm.fee_heads.map(h => ({
//           name:      h.name.trim(),
//           amount:    Number(h.amount),
//           frequency: h.frequency,
//           mandatory: h.mandatory,
//         })),
//         status: 'active',
//       })
//       if (!structureRes.success || !structureRes.result) {
//         // If conflict (409), try to fetch the existing active structure and reuse it
//         if ((structureRes as { statusCode?: number }).statusCode === 409 || structureRes.message?.includes('already exists')) {
//           const existingStructures = await feeStructureApi.getAll()
//           const existing = existingStructures.result?.find(s =>
//             s.status === 'active' &&
//             (s.academic_year === createFeeForm.academic_year.trim()) &&
//             (batchId
//               ? (typeof s.batch_id === 'object' ? s.batch_id?._id : s.batch_id) === batchId
//               : (typeof s.class_id === 'object' ? s.class_id?._id : s.class_id) === classId)
//           )
//           if (!existing) {
//             setCreateFeeError(structureRes.message ?? 'Could not create or find the fee structure.')
//             setIsSavingFee(false)
//             return
//           }
//           feeStructureId = existing._id
//         } else {
//           setCreateFeeError(structureRes.message ?? 'Could not create the fee structure. Please try again.')
//           setIsSavingFee(false)
//           return
//         }
//       } else {
//         feeStructureId = structureRes.result._id
//       }

//       // Step B: Create Fee Term
//       const termPayload: Parameters<typeof feeTermApi.create>[0] = {
//         institute_id:    instituteId,
//         academic_year:   createFeeForm.academic_year.trim(),
//         name:            createFeeForm.term_name.trim(),
//         start_date:      createFeeForm.start_date,
//         due_date:        createFeeForm.due_date,
//         ...(createFeeForm.term_order ? { term_order: Number(createFeeForm.term_order) } : {}),
//         ...(createFeeForm.late_fee_amount ? { late_fee_amount: Number(createFeeForm.late_fee_amount) } : {}),
//         status: 'active',
//       }
//       const termRes = await feeTermApi.create(termPayload)
//       if (!termRes.success || !termRes.result) {
//         setCreateFeeError(termRes.message ?? 'Could not create the fee term. Please try again.')
//         setIsSavingFee(false)
//         return
//       }
//       const termId = termRes.result._id

//       // Step C: Generate Student Fee
//       const generateRes = await studentFeeApi.generate({
//         institute_id:     instituteId,
//         student_id:       studentId,
//         class_id:         classId,
//         section_id:       sectionId || null,
//         batch_id:         batchId   || null,
//         academic_year:    createFeeForm.academic_year.trim(),
//         term_id:          termId,
//         fee_structure_id: feeStructureId,
//       })
//       if (!generateRes.success) {
//         setCreateFeeError(generateRes.message ?? 'Could not generate the student fee record. Please try again.')
//         setIsSavingFee(false)
//         return
//       }

//       setShowCreateFeeDialog(false)
//       await refreshFees()
//     } catch {
//       setCreateFeeError('Something went wrong. Please check your connection and try again.')
//     } finally {
//       setIsSavingFee(false)
//     }
//   }
//   //download fee receipt handler
//   function downloadReceipt(receipt: FeeReceipt, parentFee?: StudentFee) {
//     const instituteName =
//       typeof window !== 'undefined' ? (localStorage.getItem('instituteName') ?? 'Institute') : 'Institute'
//     const termName = parentFee ? termLabel(parentFee.term_id) : 'Fee Payment'
//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta charset="UTF-8" />
//         <title>Receipt ${receipt.receipt_number}</title>
//         <style>
//           * { margin: 0; padding: 0; box-sizing: border-box; }
//           body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #fff; }
//           .page { max-width: 600px; margin: 0 auto; padding: 32px 28px; }
//           .header { text-align: center; border-bottom: 2px solid #1897C6; padding-bottom: 16px; margin-bottom: 20px; }
//           .header h1 { font-size: 20px; color: #1897C6; }
//           .header p { font-size: 12px; color: #555; margin-top: 4px; }
//           .badge { display: inline-block; background: #e0f7fa; color: #1897C6; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-top: 6px; }
//           .section { margin-bottom: 16px; }
//           .section-title { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
//           .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #eee; }
//           .row:last-child { border-bottom: none; }
//           .label { color: #555; }
//           .value { font-weight: 600; color: #222; }
//           .amount-box { background: linear-gradient(135deg, #1897C6, #67BAC3); color: white; border-radius: 10px; padding: 16px 20px; text-align: center; margin: 20px 0; }
//           .amount-box .amt { font-size: 28px; font-weight: 700; }
//           .amount-box .lbl { font-size: 12px; opacity: 0.85; margin-top: 2px; }
//           .footer { text-align: center; font-size: 11px; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px; }
//           @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
//         </style>
//       </head>
//       <body>
//         <div class="page">
//           <div class="header">
//             <h1>${instituteName}</h1>
//             <p>Fee Payment Receipt</p>
//             <span class="badge">PAID</span>
//           </div>

//           <div class="section">
//             <div class="section-title">Receipt Details</div>
//             <div class="row"><span class="label">Receipt No.</span><span class="value">${receipt.receipt_number}</span></div>
//             <div class="row"><span class="label">Payment Date</span><span class="value">${new Date(receipt.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
//             <div class="row"><span class="label">Payment Method</span><span class="value">${receipt.payment_method.toUpperCase()}</span></div>
//             ${receipt.transaction_id ? `<div class="row"><span class="label">Transaction ID</span><span class="value">${receipt.transaction_id}</span></div>` : ''}
//           </div>

//           <div class="section">
//             <div class="section-title">Fee Details</div>
//             <div class="row"><span class="label">Term</span><span class="value">${termName}</span></div>
//             ${parentFee ? `<div class="row"><span class="label">Academic Year</span><span class="value">${parentFee.academic_year}</span></div>` : ''}
//             ${parentFee ? `<div class="row"><span class="label">Total Fee</span><span class="value">₹${Number(parentFee.total_amount).toLocaleString('en-IN')}</span></div>` : ''}
//           </div>

//           <div class="amount-box">
//             <div class="amt">₹${Number(receipt.amount_paid).toLocaleString('en-IN')}</div>
//             <div class="lbl">Amount Paid</div>
//           </div>

//           ${receipt.remarks ? `<div class="section"><div class="section-title">Remarks</div><p style="color:#555;font-size:12px;">${receipt.remarks}</p></div>` : ''}

//           <div class="footer">
//             <p>This is a computer-generated receipt and does not require a signature.</p>
//             <p style="margin-top:4px;">Generated on ${new Date().toLocaleString('en-IN')}</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `
//     const win = window.open('', '_blank', 'width=650,height=800')
//     if (!win) return
//     win.document.write(html)
//     win.document.close()
//     win.focus()
//     setTimeout(() => { win.print(); win.close() }, 500)
//   }

//   // ── Render ──────────────────────────────────────────────────────────────────

//   return (
//     <div className="space-y-4">

//       {/* ── Header ─────────────────────────────────────────────────────────── */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//         <div>
//           <h2 className="text-xl sm:text-2xl font-bold">Fee Management</h2>
//           {selectedYear && (
//             <div className="flex items-center gap-2 mt-1 flex-wrap">
//               <Badge className="bg-[#1897C6]">{selectedYear}</Badge>
//               <span className="text-sm text-muted-foreground">Complete financial overview and payment history</span>
//             </div>
//           )}
//         </div>
//  <div className="flex gap-2">
//           <Button variant="outline" size="sm" className="gap-2" onClick={openCreateFeeDialog}>
//             <Plus className="h-4 w-4" /><span className="hidden sm:inline">Create Fee</span>
//           </Button>
//           {fees.length > 0 && (
//             <>
//                <Button variant="outline" size="sm" className="gap-2" onClick={openEditStructure}>
//                 <Edit className="h-4 w-4" /><span className="hidden sm:inline">Edit Structure</span>
//               </Button>
//               <Button variant="outline" size="sm" className="gap-2" onClick={openAddPayment}>
//                 <DollarSign className="h-4 w-4" /><span className="hidden sm:inline">Add Payment</span>
//               </Button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* ── Notices (styled per screenshot: single card with edit icon) ─────── */}
//       {loadingNotices ? (
//         <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
//           <Loader2 className="h-4 w-4 animate-spin" /> Loading notices...
//         </div>
//       ) : notices.length > 0 && (
//         <div className="space-y-2">
//           {notices.map(notice => (
//             <Card key={notice._id} className="border border-orange-200 bg-orange-50/60">
//               <CardContent className="p-4">
//                 <div className="flex items-start justify-between gap-3">
//                   <div className="flex items-start gap-3 min-w-0">
//                     <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
//                     <div className="min-w-0">
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <p className="font-semibold text-orange-900 break-words">{notice.title}</p>
//                         {notice.isPinned && (
//                           <Badge className="bg-orange-500 text-white text-xs shrink-0">Pinned</Badge>
//                         )}
//                         {notice.category && (
//                           <Badge variant="outline" className="text-xs shrink-0 capitalize border-orange-300 text-orange-700">
//                             {notice.category}
//                           </Badge>
//                         )}
//                       </div>
//                       <p className="text-sm text-orange-800 mt-1 line-clamp-2 break-words">
//                         {notice.content}
//                       </p>
//                       {notice.publishDate && (
//                         <p className="text-xs text-orange-600/70 mt-1.5">
//                           Last updated: {formatDate(notice.publishDate)}
//                           {notice.expiryDate && ` • Expires: ${formatDate(notice.expiryDate)}`}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     className="h-8 w-8 shrink-0 text-blue-500 hover:text-orange-700 hover:bg-orange-100"
//                     onClick={() => { setActiveNotice(notice); setShowNoticeDialog(true) }}
//                   >
//                     <Eye className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       )}

//       {/* ── Loading / Empty ─────────────────────────────────────────────────── */}
//       {loadingFees ? (
//         <div className="flex items-center justify-center py-12">
//           <Loader2 className="h-6 w-6 animate-spin text-[#1897C6]" />
//           <span className="ml-2 text-sm text-muted-foreground">Loading fee records...</span>
//         </div>
//  ) : fees.length === 0 ? (
//         <Card>
//           <CardContent className="p-8 text-center space-y-4">
//             <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mx-auto">
//               <DollarSign className="h-8 w-8 text-muted-foreground" />
//             </div>
//             <div>
//               <p className="font-semibold text-base">No fee records found</p>
//               <p className="text-sm text-muted-foreground mt-1">
//                 This student has no fee records yet. Create a fee structure and term to get started.
//               </p>
//             </div>
//             <Button
//               className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] gap-2"
//               onClick={openCreateFeeDialog}
//             >
//               <Plus className="h-4 w-4" /> Create Fee Record
//             </Button>
//           </CardContent>
//         </Card>
//       ) : (
//         <>
//           {/* ── Year Selector ─────────────────────────────────────────────── */}
//           <Card>
//             <CardHeader className="pb-3">
//               <div className="flex items-center gap-2 flex-wrap">
//                 <CalendarDays className="h-5 w-5 text-[#1897C6]" />
//                 <Label className="text-sm font-medium">Academic Year:</Label>
//                 <Badge
//                   variant={selectedYear === '' ? 'default' : 'outline'}
//                   className={`cursor-pointer ${selectedYear === '' ? 'bg-[#1897C6]' : ''}`}
//                   onClick={() => { setSelectedYear(''); setPendingPage(1); setPaidPage(1); setHistoryPage(1) }}
//                 >All Years</Badge>
//                 {feeYears.map(year => (
//                   <Badge
//                     key={year}
//                     variant={year === selectedYear ? 'default' : 'outline'}
//                     className={`cursor-pointer ${year === selectedYear ? 'bg-[#1897C6]' : ''}`}
//                     onClick={() => { setSelectedYear(year); setPendingPage(1); setPaidPage(1); setHistoryPage(1) }}
//                   >{year}</Badge>
//                 ))}
//               </div>
//             </CardHeader>
//           </Card>

//           {/* ── Summary Cards ─────────────────────────────────────────────── */}
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//             {[
//               {
//                 border: 'border-2',
//                 icon: FileText, iconBg: 'bg-gray-100', iconColor: 'text-gray-600',
//                 label: 'Total Fee Amount',
//                 value: formatCurrency(totalAmount),
//                 sub: 'Academic year fees',
//                 valueColor: '',
//               },
//               {
//                 border: 'border-2 border-green-200 bg-green-50',
//                 icon: CheckCircle, iconBg: 'bg-green-100', iconColor: 'text-green-600',
//                 label: 'Amount Paid',
//                 value: formatCurrency(totalPaid),
//                 sub: `${paidFees.length} successful payment${paidFees.length !== 1 ? 's' : ''}`,
//                 valueColor: 'text-green-600',
//               },
//               {
//                 border: 'border-2 border-red-200 bg-red-50',
//                 icon: AlertCircle, iconBg: 'bg-red-100', iconColor: 'text-red-600',
//                 label: 'Amount Due',
//                 value: formatCurrency(totalDue),
//                 sub: `${pendingFees.length} pending payment${pendingFees.length !== 1 ? 's' : ''}`,
//                 valueColor: 'text-red-600',
//               },
//               {
//                 border: 'border-2 border-blue-200 bg-blue-50',
//                 icon: TrendingUp, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
//                 label: 'Payment Progress',
//                 value: `${paymentPct}%`,
//                 sub: null,
//                 valueColor: 'text-blue-600',
//                 progress: true,
//               },
//             ].map(({ border, icon: Icon, iconBg, iconColor, label, value, sub, valueColor, progress }) => (
//               <Card key={label} className={border}>
//                 <CardContent className="p-4">
//                   <div className="flex items-center gap-2 mb-2">
//                     <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
//                       <Icon className={`h-4 w-4 ${iconColor}`} />
//                     </div>
//                     <p className="text-xs text-muted-foreground">{label}</p>
//                   </div>
//                   <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
//                   {sub  && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
//                   {progress && <Progress value={paymentPct} className="h-2 mt-2" />}
//                 </CardContent>
//               </Card>
//             ))}
//           </div>

//           {/* ── Overdue Alert ──────────────────────────────────────────────── */}
//           {feesForYear.some(f => f.status === 'overdue') && (
//             <Card className="border-2 border-red-300 bg-red-50">
//               <CardContent className="p-4">
//                 <div className="flex items-start gap-3">
//                   <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
//                   <div>
//                     <p className="font-semibold text-red-900">
//                       ⚠️ Attention: Overdue Payments
//                     </p>
//                     <p className="text-sm text-red-800 mt-1">
//                       You have {feesForYear.filter(f => f.status === 'overdue').length} overdue payment
//                       {feesForYear.filter(f => f.status === 'overdue').length !== 1 ? 's' : ''}.
//                       Please settle immediately to avoid additional late fees and ensure continuous
//                       access to all school services.
//                     </p>
//                     <div className="mt-2 flex flex-wrap gap-2">
//                       {feesForYear.filter(f => f.status === 'overdue').map(f => (
//                         <div key={f._id} className="inline-flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-red-200">
//                           <span className="text-xs text-muted-foreground">{termLabel(f.term_id)}</span>
//                           <span className="font-bold text-red-600 text-sm">{formatCurrency(f.due_amount)}</span>
//                           {f.is_late_fee_applied && f.late_fee_applied && (
//                             <Badge variant="destructive" className="text-xs">
//                               +{formatCurrency(f.late_fee_applied)} Late Fee
//                             </Badge>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           )}

//           {/* ── Fee Sub-tabs ───────────────────────────────────────────────── */}
//           <Card>
//             <CardHeader className="border-b pb-3">
//               <div className="flex gap-2 flex-wrap">
//                 {(['pending', 'paid', 'structure', 'history'] as const).map(tab => (
//                   <Button
//                     key={tab}
//                     variant={feeTab === tab ? 'default' : 'ghost'}
//                     size="sm"
//                     onClick={() => setFeeTab(tab)}
//                     className={feeTab === tab ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3]' : ''}
//                   >
//                     {tab === 'pending'   && <Clock       className="h-4 w-4 mr-1.5" />}
//                     {tab === 'paid'      && <CheckCircle className="h-4 w-4 mr-1.5" />}
//                     {tab === 'structure' && <FileText    className="h-4 w-4 mr-1.5" />}
//                     {tab === 'history'   && <Clock       className="h-4 w-4 mr-1.5" />}
//                     {capitalize(tab)}
//                   </Button>
//                 ))}
//               </div>
//             </CardHeader>
//             <CardContent className="p-4">

//               {/* PENDING TAB */}
//               {feeTab === 'pending' && (
//                 <div className="space-y-3">
//                   <p className="text-sm text-muted-foreground mb-2">
//                     Pending, partial, and overdue term fees
//                   </p>
//                   {pendingFees.length === 0 ? (
//                     <div className="text-center py-8">
//                       <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
//                       <p className="text-muted-foreground">
//                         All fees are paid{selectedYear ? ` for ${selectedYear}` : ''}!
//                       </p>
//                     </div>
//                   ) : paginatedPending.map(fee => (
//                     <Card
//                       key={fee._id}
//                       className={`border-2 ${fee.status === 'overdue'
//                         ? 'border-red-200 bg-red-50'
//                         : 'border-yellow-200 bg-yellow-50'}`}
//                     >
//                       <CardContent className="p-4">
//                         <div className="flex items-start justify-between gap-4">
//                           <div className="flex items-start gap-3">
//                             <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
//                               ${fee.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'}`}>
//                               <FileText className={`h-5 w-5 ${fee.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'}`} />
//                             </div>
//                             <div>
//                               <p className="font-semibold">{termLabel(fee.term_id)}</p>
//                               <p className="text-sm text-muted-foreground">{fee.academic_year}</p>
//                               <div className="mt-2">{getStatusBadge(fee.status)}</div>
//                             </div>
//                           </div>
//                           <div className="text-right space-y-1">
//                             <div className="bg-white rounded-lg px-3 py-1.5 border">
//                               <p className="text-xs text-muted-foreground">Total</p>
//                               <p className="font-bold">{formatCurrency(fee.total_amount)}</p>
//                             </div>
//                             <div className="bg-white rounded-lg px-3 py-1.5 border border-red-200">
//                               <p className="text-xs text-muted-foreground">Due</p>
//                               <p className={`font-bold ${fee.status === 'overdue' ? 'text-red-600' : 'text-yellow-700'}`}>
//                                 {formatCurrency(fee.due_amount)}
//                               </p>
//                             </div>
//                           </div>
//                         </div>
//                         <div className="mt-3 pt-3 border-t flex justify-end">
//   <Button
//     variant="ghost"
//     size="sm"
//     className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs"
//     onClick={() => setDeleteTarget({
//       type: 'studentFee',
//       id: fee._id,
//       label: `${termLabel(fee.term_id)} (${fee.academic_year})`,
//     })}
//   >
//     <Trash2 className="h-3.5 w-3.5" /> Delete Fee Record
//   </Button>
// </div>
//                         {fee.due_date && (
//                           <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
//                             <Clock className="h-4 w-4 shrink-0" />
//                             Due Date: <span className="font-medium">{formatDate(fee.due_date)}</span>
//                             {fee.is_late_fee_applied && fee.late_fee_applied && (
//                               <Badge variant="destructive" className="ml-2 text-xs">
//                                 +{formatCurrency(fee.late_fee_applied)} Late Fee
//                               </Badge>
//                             )}
//                           </div>
//                         )}
//                       </CardContent>
//                     </Card>
//                   ))}
//                   {pendingFees.length > PAGE_SIZE && (
//                     <Pagination
//                       currentPage={pendingPage}
//                       totalPages={Math.ceil(pendingFees.length / PAGE_SIZE)}
//                       onPageChange={setPendingPage}
//                     />
//                   )}
//                 </div>
//               )}

//               {/* PAID TAB */}
//               {feeTab === 'paid' && (
//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <p className="text-sm text-muted-foreground">Paid and partially paid terms</p>
//                     <p className="text-sm text-muted-foreground">
//                       {paidFees.length} term{paidFees.length !== 1 ? 's' : ''}
//                     </p>
//                   </div>
//                   {paidFees.length === 0 ? (
//                     <div className="text-center py-8">
//                       <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
//                       <p className="text-muted-foreground">
//                         No paid terms found{selectedYear ? ` for ${selectedYear}` : ''}.
//                       </p>
//                     </div>
                  
//                   ) : paginatedPaid.map(fee => {
//                     // extractId handles populated student_fee_id on the receipt
//                     const termReceipts = feeReceipts.filter(r => receiptMatchesFee(r, fee._id))
//                     const isExpanded   = expandedReceipt === fee._id
//                     return (
//                       <Card key={fee._id} className="border-2 border-green-200 bg-green-50">
//                         <CardContent className="p-4">
//                           <div className="flex items-center justify-between gap-3">
//                             <div className="flex items-center gap-3">
//                               <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
//                                 <CheckCircle className="h-5 w-5 text-green-600" />
//                               </div>
//                               <div>
//                                 <p className="font-semibold">{termLabel(fee.term_id)}</p>
//                                 <p className="text-sm text-muted-foreground">{fee.academic_year}</p>
//                                 <div className="mt-1">{getStatusBadge(fee.status)}</div>
//                               </div>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <div className="text-right space-y-1">
//                                 <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                   <p className="text-xs text-muted-foreground">Paid</p>
//                                   <p className="font-bold text-green-600">{formatCurrency(fee.paid_amount)}</p>
//                                 </div>
//                                 {Number(fee.due_amount) > 0 && (
//                                   <div className="bg-white rounded-lg px-3 py-1.5 border">
//                                     <p className="text-xs text-muted-foreground">Remaining</p>
//                                     <p className="font-bold text-yellow-600">{formatCurrency(fee.due_amount)}</p>
//                                   </div>
//                                 )}
//                               </div>
//                               <Button
//                                 variant="ghost" size="icon" className="h-8 w-8 shrink-0"
//                                 onClick={() => setExpandedReceipt(isExpanded ? null : fee._id)}
//                               >
//                                 {isExpanded
//                                   ? <ChevronUp   className="h-4 w-4" />
//                                   : <ChevronDown className="h-4 w-4" />}
//                               </Button>
//                             </div>
//                           </div>

//                           {isExpanded && (
//                             <div className="mt-3 pt-3 border-t space-y-3">
//                               {fee.fee_snapshot?.length > 0 && (
//                                 <div>
//                                   <p className="text-xs font-semibold text-muted-foreground mb-2">FEE BREAKDOWN</p>
//                                   <div className="space-y-1">
//                                     {fee.fee_snapshot.map((item, i) => (
//                                       <div key={i} className="flex justify-between text-sm p-2 bg-white rounded-lg border border-green-100">
//                                         <span className="text-muted-foreground">{item.name}</span>
//                                         <span className="font-medium">{formatCurrency(item.amount)}</span>
//                                       </div>
//                                     ))}
//                                   </div>
//                                 </div>
//                               )}
//                               {termReceipts.length > 0 && (
//                                 <div>
//                                   <p className="text-xs font-semibold text-muted-foreground mb-2">PAYMENT RECEIPTS</p>
//                                   <div className="space-y-2">
//                                     {termReceipts.map(receipt => (
//                                       <div key={receipt._id} className="p-3 bg-white rounded-lg border border-green-200 space-y-2">
//                                         <div className="flex items-center justify-between">
//                                           <div>
//                                             <p className="text-sm font-bold text-green-600">
//                                               {formatCurrency(receipt.amount_paid)}
//                                             </p>
//                                             <p className="text-xs text-muted-foreground">
//                                               {formatDate(receipt.payment_date)} • {capitalize(receipt.payment_method)}
//                                             </p>
//                                           </div>
//                                           <Badge className="bg-green-600 text-white text-xs">Paid</Badge>
//                                         </div>
//                                         {receipt.receipt_number && (
//                                           <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
//                                             <p className="text-xs text-muted-foreground">Receipt No.</p>
//                                             <p className="text-xs font-mono font-semibold">{receipt.receipt_number}</p>
//                                           </div>
//                                         )}
//                                         {receipt.transaction_id && (
//                                           <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
//                                             <p className="text-xs text-muted-foreground">Transaction ID</p>
//                                             <p className="text-xs font-mono font-semibold">{receipt.transaction_id}</p>
//                                           </div>
//                                         )}
//                                     {receipt.collected_by && (
//                                           <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
//                                             <p className="text-xs text-muted-foreground">Collected By</p>
//                                             <p className="text-xs font-semibold">
//                                               {typeof receipt.collected_by === 'object' && 'full_name' in receipt.collected_by
//                                                 ? receipt.collected_by.full_name
//                                                 : String(receipt.collected_by)}
//                                             </p>
//                                           </div>
//                                         )}
//                                         {receipt.remarks && (
//                                           <p className="text-xs text-muted-foreground">Remarks: {receipt.remarks}</p>
//                                         )}
//                                         <div className="flex justify-end pt-1">
//                                           <Button
//                                             variant="ghost"
//                                             size="sm"
//                                             className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs h-7"
//                                             onClick={() => setDeleteTarget({
//                                               type: 'receipt',
//                                               id: receipt._id,
//                                               label: `Receipt ${receipt.receipt_number ?? ''} — ${formatCurrency(receipt.amount_paid)}`,
//                                             })}
//                                           >
//                                             <Trash2 className="h-3.5 w-3.5" /> Delete Receipt
//                                           </Button>
//                                         </div>
//                                       </div>
//                                     ))}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           )}
//                         </CardContent>
//                       </Card>
//                     )
//                   })}
//                 {paidFees.length > PAGE_SIZE && (
//                     <Pagination
//                       currentPage={paidPage}
//                       totalPages={Math.ceil(paidFees.length / PAGE_SIZE)}
//                       onPageChange={setPaidPage}
//                     />
//                   )}
//                 </div>
//               )}

//               {/* STRUCTURE TAB */}
//               {feeTab === 'structure' && (
//                 <div className="space-y-3">
//                   {!structureFee ? (
//                     <div className="text-center py-8">
//                       <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
//                       <p className="text-muted-foreground">
//                         No fee structure available{selectedYear ? ` for ${selectedYear}` : ''}.
//                       </p>
//                     </div>
//                   ) : (
//                     <>
//                       <div className="flex items-center justify-between mb-2">
//                         <p className="text-sm font-medium">
//                           Fee components{selectedYear ? ` for ${selectedYear}` : ''}
//                         </p>
//                         <Badge variant="outline">
//                           {structureFee.fee_snapshot?.length ?? 0} items
//                         </Badge>
//                       </div>
//                       {feesForYear.map(fee => fee.fee_snapshot?.length > 0 && (
//                         <Card key={fee._id}>
//                           <CardContent className="p-4">
//                             <div className="flex items-center justify-between mb-3">
//                               <p className="font-semibold">{termLabel(fee.term_id)}</p>
//                               {getStatusBadge(fee.status)}
//                             </div>
//                             <div className="space-y-2">
//                               {fee.fee_snapshot.map((item, i) => (
//                                 <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
//                                   <div>
//                                     <p className="text-sm font-medium">{item.name}</p>
//                                     {item.frequency && (
//                                       <p className="text-xs text-muted-foreground capitalize">
//                                         {item.frequency.replace('_', ' ')}
//                                       </p>
//                                     )}
//                                   </div>
//                                   <p className="font-bold">{formatCurrency(item.amount)}</p>
//                                 </div>
//                               ))}
//                             </div>
//                             <Separator className="my-3" />
//                             <div className="flex justify-between">
//                               <p className="font-bold">Term Total</p>
//                               <p className="font-bold text-[#1897C6]">{formatCurrency(fee.total_amount)}</p>
//                             </div>
//                           </CardContent>
//                         </Card>
//                       ))}
//                       <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#1897C6]/10 to-[#67BAC3]/10 rounded-lg border-2 border-[#1897C6]/30">
//                         <p className="font-bold text-lg">Total Annual Fee</p>
//                         <p className="text-2xl font-bold text-[#1897C6]">{formatCurrency(totalAmount)}</p>
//                       </div>
//                     </>
//                   )}
//                 </div>
//               )}

//               {/* HISTORY TAB */}
//              {feeTab === 'history' && (() => {
//   return (
//     <div className="space-y-3">
//       <div className="flex items-center justify-between mb-2">
//         <p className="text-sm text-muted-foreground">
//           All payment transactions{selectedYear ? ` for ${selectedYear}` : ''}
//         </p>
//         <p className="text-sm text-muted-foreground">
//           {yearReceipts.length} transaction{yearReceipts.length !== 1 ? 's' : ''}
//         </p>
//       </div>
//       {yearReceipts.length === 0 ? (
//                       <div className="text-center py-8">
//                         <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
//                         <p className="text-muted-foreground">
//                           No payment history found{selectedYear ? ` for ${selectedYear}` : ''}.
//                         </p>
//                       </div>
// ) : paginatedHistory.map(receipt => {
//                           const parentFee = feesForYear.find(f => receiptMatchesFee(receipt, f._id))
//                           return (
//                             <Card key={receipt._id} className="border-2 border-green-200 bg-green-50">
//                               <CardContent className="p-4">
//                                 <div className="flex items-center justify-between gap-3">
//                                   <div className="flex items-center gap-3">
//                                     <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
//                                       <CheckCircle className="h-5 w-5 text-green-600" />
//                                     </div>
//                                     <div>
//                                       <p className="font-semibold">
//                                         {parentFee ? termLabel(parentFee.term_id) : 'Payment'}
//                                       </p>
//                                       <p className="text-sm text-muted-foreground">
//                                         {formatDate(receipt.payment_date)} • {capitalize(receipt.payment_method)}
//                                       </p>
//                                       {receipt.receipt_number && (
//                                         <p className="text-xs text-muted-foreground mt-0.5 font-mono">
//                                           Receipt: {receipt.receipt_number}
//                                         </p>
//                                       )}
//                                       {receipt.transaction_id && (
//                                         <p className="text-xs text-muted-foreground mt-0.5">
//                                           Txn: {receipt.transaction_id}
//                                         </p>
//                                       )}
//                                     </div>
//                                   </div>
//                                   <div className="text-right">
//                                     <p className="text-xl font-bold text-green-600">
//                                       {formatCurrency(receipt.amount_paid)}
//                                     </p>
//                                     <Badge className="bg-green-600 mt-1">Paid</Badge>
//                                   </div>
//                                 </div>
//                             {(receipt.collected_by || receipt.remarks) && (
//                                   <div className="mt-3 pt-3 border-t space-y-1">
//                                     {receipt.collected_by && (
//                                       <p className="text-xs text-muted-foreground">
//                                         Collected By:{' '}
//                                         <span className="font-semibold text-foreground">
//                                           {typeof receipt.collected_by === 'object' && 'full_name' in receipt.collected_by
//                                             ? receipt.collected_by.full_name
//                                             : String(receipt.collected_by)}
//                                         </span>
//                                       </p>
//                                     )}
//                                     {receipt.remarks && (
//                                       <p className="text-xs text-muted-foreground">Remarks: {receipt.remarks}</p>
//                                     )}
//                                   </div>
//                                 )}
//                                 <div className="mt-2 pt-2 border-t flex justify-end">
//                                   <Button
//                                     variant="ghost"
//                                     size="sm"
//                                     className="text-[#1897C6] hover:text-[#1276a0] hover:bg-blue-50 gap-1.5 text-xs h-7"
//                                     onClick={() => downloadReceipt(receipt, parentFee)}
//                                   >
//                                     <Download className="h-3.5 w-3.5" /> Download
//                                   </Button>
//                                   <Button
//                                     variant="ghost"
//                                     size="sm"
//                                     className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs h-7"
//                                     onClick={() => setDeleteTarget({
//                                       type: 'receipt',
//                                       id: receipt._id,
//                                       label: `Receipt ${receipt.receipt_number ?? ''} — ${formatCurrency(receipt.amount_paid)}`,
//                                     })}
//                                   >
//                                     <Trash2 className="h-3.5 w-3.5" /> Delete Receipt
//                                   </Button>
//                                 </div>                              </CardContent>
//                             </Card>
//                           )
//                         })}
//                   {yearReceipts.length > PAGE_SIZE && (
//                     <Pagination
//                       currentPage={historyPage}
//                       totalPages={Math.ceil(yearReceipts.length / PAGE_SIZE)}
//                       onPageChange={setHistoryPage}
//                     />
//                   )}
//                   </div>
//                 )
//               })()}

//             </CardContent>
//           </Card>
//         </>
//       )}

//       {/* ══════════════════════════════════════════════════════════════════════ */}
//       {/* Edit Fee Structure Dialog                                             */}
//       {/* ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={showEditStructureDialog} onOpenChange={setShowEditStructureDialog}>
//         <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto w-full max-h-[90vh] flex flex-col">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <Edit className="h-5 w-5 text-[#1897C6]" /> Edit Fee Structure
//             </DialogTitle>
//             <DialogDescription>
//               Update fee components for this student. Changes will recalculate the due amount.
//             </DialogDescription>
//           </DialogHeader>

//           {editingStructure && (
//             <div className="space-y-3 overflow-y-auto flex-1 pr-1 py-1">
//               {editingStructure.fee_heads.map((head, idx) => (
//                 <div key={idx} className="p-4 border rounded-lg space-y-3 relative">
//                   {editingStructure.fee_heads.length > 1 && (
//                     <button
//                       type="button"
//                       className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
//                       onClick={() =>
//                         setEditingStructure(prev => prev
//                           ? { ...prev, fee_heads: prev.fee_heads.filter((_, i) => i !== idx) }
//                           : prev
//                         )
//                       }
//                       title="Remove component"
//                     >
//                       <Trash2 className="h-4 w-4" />
//                     </button>
//                   )}
//                   <div>
//                     <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Component Name *</Label>
//                     <Input
//                       value={head.name}
//                       placeholder="e.g., Tuition Fee"
//                       className="mt-1"
//                       onChange={e =>
//                         setEditingStructure(prev => {
//                           if (!prev) return prev
//                           const heads = [...prev.fee_heads]
//                           heads[idx] = { ...heads[idx], name: e.target.value }
//                           return { ...prev, fee_heads: heads }
//                         })
//                       }
//                     />
//                   </div>
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount (₹) *</Label>
//                       <Input
//                         type="number"
//                         min="0"
//                         value={head.amount}
//                         className="mt-1"
//                         onChange={e =>
//                           setEditingStructure(prev => {
//                             if (!prev) return prev
//                             const heads = [...prev.fee_heads]
//                             heads[idx] = { ...heads[idx], amount: Number(e.target.value) }
//                             return { ...prev, fee_heads: heads }
//                           })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frequency *</Label>
//                       <select
//                         value={head.frequency}
//                         className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//                         onChange={e =>
//                           setEditingStructure(prev => {
//                             if (!prev) return prev
//                             const heads = [...prev.fee_heads]
//                             heads[idx] = { ...heads[idx], frequency: e.target.value as FeeHead['frequency'] }
//                             return { ...prev, fee_heads: heads }
//                           })
//                         }
//                       >
//                         <option value="one_time">One Time</option>
//                         <option value="monthly">Monthly</option>
//                         <option value="quarterly">Quarterly</option>
//                         <option value="half_yearly">Half Yearly</option>
//                         <option value="annual">Annual</option>
//                       </select>
//                     </div>
//                   </div>
//                   <label className="flex items-center gap-2 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={head.mandatory ?? true}
//                       onChange={e =>
//                         setEditingStructure(prev => {
//                           if (!prev) return prev
//                           const heads = [...prev.fee_heads]
//                           heads[idx] = { ...heads[idx], mandatory: e.target.checked }
//                           return { ...prev, fee_heads: heads }
//                         })
//                       }
//                       className="rounded border-input"
//                     />
//                     <span className="text-xs text-muted-foreground">Mandatory</span>
//                   </label>
//                 </div>
//               ))}

//               <Button
//                 type="button"
//                 variant="outline"
//                 size="sm"
//                 className="w-full gap-1.5"
//                 onClick={() =>
//                   setEditingStructure(prev => prev
//                     ? { ...prev, fee_heads: [...prev.fee_heads, { name: '', amount: 0, frequency: 'monthly', mandatory: true }] }
//                     : prev
//                   )
//                 }
//               >
//                 <Plus className="h-4 w-4" /> Add Fee Component
//               </Button>

//               {/* Live totals */}
//               <div className="p-4 border-2 border-[#1897C6]/30 rounded-lg bg-[#1897C6]/5 space-y-2">
//                 <div className="flex justify-between text-sm">
//                   <span className="text-muted-foreground">New Term Total</span>
//                   <span className="font-bold text-[#1897C6]">
//                     {formatCurrency(editingStructure.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}
//                   </span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span className="text-muted-foreground">Already Paid</span>
//                   <span className="font-medium text-green-600">
//                     {formatCurrency(feesForYear.find(f => f._id === editingStructure.studentFeeId)?.paid_amount ?? 0)}
//                   </span>
//                 </div>
//                 <Separator />
//                 <div className="flex justify-between">
//                   <span className="font-semibold">New Due Amount</span>
//                   <span className="font-bold text-red-600">
//                     {formatCurrency(Math.max(0,
//                       editingStructure.fee_heads.reduce((s, h) => s + Number(h.amount), 0) -
//                       Number(feesForYear.find(f => f._id === editingStructure.studentFeeId)?.paid_amount ?? 0)
//                     ))}
//                   </span>
//                 </div>
//               </div>

//               {structureError && (
//                 <p className="text-sm text-red-600 flex items-center gap-1">
//                   <AlertCircle className="h-4 w-4 shrink-0" /> {structureError}
//                 </p>
//               )}
//             </div>
//           )}

//           <DialogFooter className="pt-2 gap-2">
//             <Button variant="outline" onClick={() => setShowEditStructureDialog(false)} disabled={isSavingStructure}>
//               Cancel
//             </Button>
//             <Button
//               className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//               disabled={isSavingStructure || !editingStructure || editingStructure.fee_heads.length === 0}
//               onClick={handleSaveStructure}
//             >
//               {isSavingStructure
//                 ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
//                 : <><Edit className="h-4 w-4 mr-2" />Save Changes</>}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

   
//       {/* Add Payment Dialog                                                    */}
//       {/* ══════════════════════════════════════════════════════════════════════ */}
    
    
//       <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
//   <DialogContent className="
//     w-[95vw] 
//     sm:w-full 
//     sm:max-w-xl 
//     md:max-w-2xl 
//     lg:max-w-3xl
//     mx-auto 
//     max-h-[90vh] 
//     flex flex-col
//     p-4 sm:p-6
//   ">
    
//     <DialogHeader>
//       <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
//         <DollarSign className="h-5 w-5 text-[#1897C6]" /> 
//         Add Payment
//       </DialogTitle>
//       <DialogDescription className="text-xs sm:text-sm">
//         Record a new fee payment for this student.
//       </DialogDescription>
//     </DialogHeader>

//     {/* Scrollable Content */}
//     <div className="space-y-4 overflow-y-auto pr-1 sm:pr-2">
      
//       {/* Grid Layout for better responsiveness */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
//         {/* Fee Term */}
//         <div className="sm:col-span-2">
//           <Label>Fee Term *</Label>
//           <select
//             value={paymentForm.student_fee_id}
//             className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//             onChange={e => handleFeeTermSelect(e.target.value)}
//           >
//             <option value="">Select term</option>
//             {fees
//               .filter(f =>
//                 ['pending', 'overdue'].includes(f.status) ||
//                 (f.status === 'partial' && Number(f.due_amount) > 0)
//               )
//               .map(fee => (
//                 <option key={fee._id} value={fee._id}>
//                   {termLabel(fee.term_id)} — {fee.academic_year} (Due: {formatCurrency(fee.due_amount)})
//                 </option>
//               ))}
//           </select>
//         </div>

//         {/* Amount */}
//         <div>
//           <Label>Amount Paid (₹) *</Label>
//           <Input
//             type="number"
//             placeholder="Enter amount"
//             value={paymentForm.amount_paid}
//             className="mt-1"
//             min="1"
//             max={
//               paymentForm.student_fee_id
//                 ? String(fees.find(f => f._id === paymentForm.student_fee_id)?.due_amount ?? '')
//                 : undefined
//             }
//             onChange={e =>
//               setPaymentForm(prev => ({ ...prev, amount_paid: e.target.value }))
//             }
//           />
//         </div>

//         {/* Payment Method */}
//         <div>
//           <Label>Payment Method *</Label>
//           <select
//             value={paymentForm.payment_method}
//             className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//             onChange={e =>
//               setPaymentForm(prev => ({
//                 ...prev,
//                 payment_method: e.target.value as PaymentMethod,
//               }))
//             }
//           >
//             <option value="cash">Cash</option>
//             <option value="upi">UPI</option>
//             <option value="card">Card</option>
//             <option value="online">Online</option>
//             <option value="cheque">Cheque</option>
//           </select>
//         </div>

//         {/* Payment Date */}
//         <div>
//           <Label>Payment Date *</Label>
//           <Input
//             type="date"
//             value={paymentForm.payment_date}
//             className="mt-1"
//             onChange={e =>
//               setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))
//             }
//           />
//         </div>

//         {/* Transaction ID */}
//         <div>
//           <Label className="text-sm">
//             Transaction ID <span className="text-xs text-muted-foreground">(optional)</span>
//           </Label>
//           <Input
//             placeholder="UPI / Cheque / Reference number"
//             value={paymentForm.transaction_id}
//             className="mt-1"
//             onChange={e =>
//               setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))
//             }
//           />
//         </div>

//         {/* Collected By */}
//         <div className="sm:col-span-2">
//           <Label>
//             Collected By <span className="text-xs text-muted-foreground">(optional)</span>
//           </Label>
//           <select
//             value={paymentForm.collected_by}
//             disabled={loadingTeachers}
//             className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//             onChange={e =>
//               setPaymentForm(prev => ({ ...prev, collected_by: e.target.value }))
//             }
//           >
//             <option value="">
//               {loadingTeachers ? 'Loading teachers...' : 'Select teacher'}
//             </option>
//             {teachers.map(t => (
//               <option key={t._id} value={t._id}>
//                 {t.full_name}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Remarks */}
//         <div className="sm:col-span-2">
//           <Label>
//             Remarks <span className="text-xs text-muted-foreground">(optional)</span>
//           </Label>
//           <Input
//             placeholder="Any notes about this payment"
//             value={paymentForm.remarks}
//             className="mt-1"
//             onChange={e =>
//               setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))
//             }
//           />
//         </div>
//       </div>

//       {paymentError && (
//         <p className="text-sm text-red-600 flex items-center gap-1">
//           <AlertCircle className="h-4 w-4 shrink-0" /> {paymentError}
//         </p>
//       )}
//     </div>

//     {/* Footer */}
//     <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
//       <Button
//         variant="outline"
//         className="w-full sm:w-auto"
//         onClick={() => setShowAddPaymentDialog(false)}
//         disabled={isSavingPayment}
//       >
//         Cancel
//       </Button>

//       <Button
//         className="w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//         disabled={
//           isSavingPayment ||
//           !paymentForm.student_fee_id ||
//           !paymentForm.amount_paid ||
//           Number(paymentForm.amount_paid) <= 0 ||
//           !paymentForm.payment_date
//         }
//         onClick={handleSavePayment}
//       >
//         {isSavingPayment ? (
//           <>
//             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//             Saving...
//           </>
//         ) : (
//           'Record Payment'
//         )}
//       </Button>
//     </DialogFooter>

//   </DialogContent>
// </Dialog>

//       {/* ══════════════════════════════════════════════════════════════════════ */}
//       {/* Notice Detail Dialog                                                  */}
//       {/* ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={showNoticeDialog} onOpenChange={setShowNoticeDialog}>
//         <DialogContent className="max-w-[95vw] sm:max-w-lg mx-auto w-full">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <AlertCircle className="h-5 w-5 text-orange-500" />
//               {activeNotice?.title}
//             </DialogTitle>
//             {activeNotice?.publishDate && (
//               <DialogDescription>
//                 Published: {formatDate(activeNotice.publishDate)}
//                 {activeNotice.expiryDate && ` • Expires: ${formatDate(activeNotice.expiryDate)}`}
//               </DialogDescription>
//             )}
//           </DialogHeader>

//           <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
//             <p className="text-sm leading-relaxed break-words">{activeNotice?.content}</p>
//             {activeNotice?.fullDescription && (
//               <>
//                 <Separator />
//                 <p className="text-sm leading-relaxed text-muted-foreground break-words">
//                   {activeNotice.fullDescription}
//                 </p>
//               </>
//             )}
//             {activeNotice?.docUrl && (() => {
//               const fullUrl = buildFileUrl(activeNotice.docUrl) ?? ''
//               const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(activeNotice.docUrl)
//               return (
//                 <div className="space-y-2">
//                   {isImage && (
//                     <div className="rounded-lg overflow-hidden border border-orange-200 max-h-60">
//                       <img
//                         src={fullUrl}
//                         alt="Notice attachment"
//                         className="w-full h-full object-contain"
//                       />
//                     </div>
//                   )}
//                   <a
//                     href={fullUrl}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="inline-flex items-center gap-2 text-sm text-[#1897C6] hover:underline break-all"
//                   >
//                     <Download className="h-4 w-4 shrink-0" />
//                     {isImage ? 'Open Full Image' : 'View Attached Document'}
//                   </a>
//                 </div>
//               )
//             })()}
//           </div>

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setShowNoticeDialog(false)}>Close</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//  {/* ══════════════════════════════════════════════════════════════════════ */}
//       {/* Confirm Delete Dialog                                                  */}
//       {/* ══════════════════════════════════════════════════════════════════════ */}
//       <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open && !isDeletingRecord) { setDeleteTarget(null); setDeleteError(null) } }}>
//         <DialogContent className="max-w-[95vw] sm:max-w-sm mx-auto">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2 text-red-600">
//               <Trash2 className="h-5 w-5" /> Confirm Delete
//             </DialogTitle>
//             <DialogDescription>
//               This action cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="py-2 space-y-2">
//             <p className="text-sm text-muted-foreground">
//               Are you sure you want to delete:
//             </p>
//             <p className="text-sm font-semibold break-words">{deleteTarget?.label}</p>
//             {deleteTarget?.type === 'studentFee' && (
//               <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
//                 ⚠️ Deleting a fee record will also remove all its associated receipts and cannot be recovered.
//               </p>
//             )}
//             {deleteError && (
//               <p className="text-sm text-red-600 flex items-center gap-1">
//                 <AlertCircle className="h-4 w-4 shrink-0" /> {deleteError}
//               </p>
//             )}
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
//               disabled={isDeletingRecord}
//             >
//               Cancel
//             </Button>
//             <Button
//               variant="destructive"
//               disabled={isDeletingRecord}
//               onClick={handleConfirmDelete}
//             >
//               {isDeletingRecord
//                 ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
//                 : <><Trash2 className="h-4 w-4 mr-2" />Delete</>}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

// {/* ══════════════════════════════════════════════════════════════════════ */}
//       {/* Create Fee Dialog                                                      */}
//       {/* ══════════════════════════════════════════════════════════════════════ */}
//      <Dialog open={showCreateFeeDialog} onOpenChange={open => { if (!open && !isSavingFee) { setShowCreateFeeDialog(false); setCreateFeeError(null) } }}>
//         <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-auto w-full max-h-[90vh] flex flex-col">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <Plus className="h-5 w-5 text-[#1897C6]" />
//               Create Fee Record
//               <span className="ml-auto text-xs font-normal text-muted-foreground">
//                 Step {createFeeStep} of 3
//               </span>
//             </DialogTitle>
//             <DialogDescription>
//               {createFeeStep === 1 && 'Define the fee components for this student.'}
//               {createFeeStep === 2 && 'Set the term period and due date.'}
//               {createFeeStep === 3 && 'Review and confirm the fee details.'}
//             </DialogDescription>
//           </DialogHeader>

//           {/* Step indicator */}
//           <div className="flex gap-1.5 mb-1">
//             {([1, 2, 3] as const).map(s => (
//               <div
//                 key={s}
//                 className={`h-1.5 flex-1 rounded-full transition-colors ${
//                   s <= createFeeStep ? 'bg-[#1897C6]' : 'bg-muted'
//                 }`}
//               />
//             ))}
//           </div>

//           <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">

//             {/* ── STEP 1: Fee Structure ────────────────────────────────────── */}
//             {createFeeStep === 1 && (
//               <>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                   <div>
//                     <Label>Academic Year *</Label>
//                     <Input
//                       placeholder="e.g., 2025-26"
//                       value={createFeeForm.academic_year}
//                       className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, academic_year: e.target.value }))}
//                     />
//                   </div>
//                   <div>
//                     <Label>Class *</Label>
//                     <select
//                       value={selectedClassId}
//                       disabled={loadingClasses}
//                       className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60"
//                       onChange={e => {
//                         setSelectedClassId(e.target.value)
//                         setSelectedBatchId('')
//                         fetchBatchesForClass(e.target.value)
//                       }}
//                     >
//                       <option value="">{loadingClasses ? 'Loading...' : 'Select class'}</option>
//                       {classes.map(c => (
//                         <option key={c._id} value={c._id}>{c.class_name}</option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//                 {selectedClassId && (
//                   <div>
//                     <Label>Batch <span className="text-muted-foreground text-xs">(optional)</span></Label>
//                     <select
//                       value={selectedBatchId}
//                       disabled={loadingBatches}
//                       className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60"
//                       onChange={e => setSelectedBatchId(e.target.value)}
//                     >
//                       <option value="">{loadingBatches ? 'Loading...' : 'No batch (class-level)'}</option>
//                       {batches.map(b => (
//                         <option key={b._id} value={b._id ?? ''}>{b.batch_name}</option>
//                       ))}
//                     </select>
//                   </div>
//                 )}

//                 <div className="space-y-3">
//                   <div className="flex items-center justify-between">
//                     <Label>Fee Components *</Label>
//                     <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addFeeHead}>
//                       <Plus className="h-3 w-3" /> Add Component
//                     </Button>
//                   </div>

//                   {createFeeForm.fee_heads.map((head, idx) => (
//                     <div key={idx} className="p-3 border rounded-lg space-y-2 relative">
//                       {createFeeForm.fee_heads.length > 1 && (
//                         <button
//                           type="button"
//                           className="absolute top-2 right-2 text-red-400 hover:text-red-600"
//                           onClick={() => removeFeeHead(idx)}
//                           title="Remove"
//                         >
//                           <Trash2 className="h-3.5 w-3.5" />
//                         </button>
//                       )}
//                       <div>
//                         <Label className="text-xs text-muted-foreground">Component Name *</Label>
//                         <Input
//                           placeholder="e.g., Tuition Fee"
//                           value={head.name}
//                           className="mt-1"
//                           onChange={e => updateFeeHead(idx, 'name', e.target.value)}
//                         />
//                       </div>
//                       <div className="grid grid-cols-2 gap-2">
//                         <div>
//                           <Label className="text-xs text-muted-foreground">Amount (₹) *</Label>
//                           <Input
//                             type="number"
//                             min="1"
//                             placeholder="0"
//                             value={head.amount || ''}
//                             className="mt-1"
//                             onChange={e => updateFeeHead(idx, 'amount', Number(e.target.value))}
//                           />
//                         </div>
//                         <div>
//                           <Label className="text-xs text-muted-foreground">Frequency *</Label>
//                           <select
//                             value={head.frequency}
//                             className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
//                             onChange={e => updateFeeHead(idx, 'frequency', e.target.value)}
//                           >
//                             <option value="one_time">One Time</option>
//                             <option value="monthly">Monthly</option>
//                             <option value="quarterly">Quarterly</option>
//                             <option value="half_yearly">Half Yearly</option>
//                             <option value="annual">Annual</option>
//                           </select>
//                         </div>
//                       </div>
//                       <label className="flex items-center gap-2 cursor-pointer">
//                         <input
//                           type="checkbox"
//                           checked={head.mandatory}
//                           onChange={e => updateFeeHead(idx, 'mandatory', e.target.checked)}
//                           className="rounded border-input"
//                         />
//                         <span className="text-xs text-muted-foreground">Mandatory</span>
//                       </label>
//                     </div>
//                   ))}

//                   {/* Live total preview */}
//                   <div className="flex justify-between p-3 rounded-lg bg-muted/30 text-sm">
//                     <span className="text-muted-foreground">Term Total (one-time + frequency amount)</span>
//                     <span className="font-bold text-[#1897C6]">
//                       {formatCurrency(createFeeForm.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}
//                     </span>
//                   </div>
//                 </div>
//               </>
//             )}

//             {/* ── STEP 2: Fee Term ─────────────────────────────────────────── */}
//             {createFeeStep === 2 && (
//               <>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <Label>Term Name *</Label>
//                     <Input
//                       placeholder="e.g., April"
//                       value={createFeeForm.term_name}
//                       className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, term_name: e.target.value }))}
//                     />
//                   </div>
//                   <div>
//                     <Label>
//                       Term Order{' '}
//                       <span className="text-muted-foreground text-xs">(optional)</span>
//                     </Label>
//                     <Input
//                       type="number"
//                       min="1"
//                       placeholder="e.g., 1"
//                       value={createFeeForm.term_order}
//                       className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, term_order: e.target.value }))}
//                     />
//                   </div>
//                 </div>
//                 <div className="grid grid-cols-2 gap-3">
//                   <div>
//                     <Label>Start Date *</Label>
//                     <Input
//                       type="date"
//                       value={createFeeForm.start_date}
//                       className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, start_date: e.target.value }))}
//                     />
//                   </div>
//                   <div>
//                     <Label>Due Date *</Label>
//                     <Input
//                       type="date"
//                       value={createFeeForm.due_date}
//                       className="mt-1"
//                       onChange={e => setCreateFeeForm(p => ({ ...p, due_date: e.target.value }))}
//                     />
//                   </div>
//                 </div>
//                 <div>
//                   <Label>
//                     Late Fee Amount (₹){' '}
//                     <span className="text-muted-foreground text-xs">(optional)</span>
//                   </Label>
//                   <Input
//                     type="number"
//                     min="0"
//                     placeholder="e.g., 200"
//                     value={createFeeForm.late_fee_amount}
//                     className="mt-1"
//                     onChange={e => setCreateFeeForm(p => ({ ...p, late_fee_amount: e.target.value }))}
//                   />
//                 </div>
//               </>
//             )}

//             {/* ── STEP 3: Review ───────────────────────────────────────────── */}
//             {createFeeStep === 3 && (
//               <div className="space-y-3">
//               <div className="p-3 border rounded-lg space-y-1">
//                   <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Structure</p>
//                   <p className="text-sm">Academic Year: <span className="font-medium">{createFeeForm.academic_year}</span></p>
//                   <p className="text-sm">Class: <span className="font-medium">{classes.find(c => c._id === selectedClassId)?.class_name ?? selectedClassId}</span></p>
//                   {selectedBatchId && (
//                     <p className="text-sm">Batch: <span className="font-medium">{batches.find(b => b._id === selectedBatchId)?.batch_name ?? selectedBatchId}</span></p>
//                   )}
//                   {createFeeForm.fee_heads.map((h, i) => (
//                     <div key={i} className="flex justify-between text-sm py-1 border-t">
//                       <span>{h.name} <span className="text-muted-foreground text-xs capitalize">({h.frequency.replace('_', ' ')})</span></span>
//                       <span className="font-medium">{formatCurrency(h.amount)}</span>
//                     </div>
//                   ))}
//                   <div className="flex justify-between text-sm pt-1 border-t font-bold">
//                     <span>Term Total</span>
//                     <span className="text-[#1897C6]">{formatCurrency(createFeeForm.fee_heads.reduce((s, h) => s + Number(h.amount), 0))}</span>
//                   </div>
//                 </div>
//                 <div className="p-3 border rounded-lg space-y-1">
//                   <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Term</p>
//                   <p className="text-sm">Name: <span className="font-medium">{createFeeForm.term_name}</span></p>
//                   <p className="text-sm">Period: <span className="font-medium">{formatDate(createFeeForm.start_date)} → {formatDate(createFeeForm.due_date)}</span></p>
//                   {createFeeForm.late_fee_amount && (
//                     <p className="text-sm">Late Fee: <span className="font-medium">{formatCurrency(Number(createFeeForm.late_fee_amount))}</span></p>
//                   )}
//                 </div>
//                 <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
//                   This will create a fee structure, a fee term, and generate a fee record for this student.
//                 </p>
//               </div>
//             )}

//             {createFeeError && (
//               <p className="text-sm text-red-600 flex items-start gap-1.5">
//                 <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {createFeeError}
//               </p>
//             )}
//           </div>

//           <DialogFooter className="gap-2">
//             <Button
//               variant="outline"
//               disabled={isSavingFee}
//               onClick={() => {
//                 if (createFeeStep === 1) { setShowCreateFeeDialog(false); setCreateFeeError(null) }
//                 else setCreateFeeStep(s => (s - 1) as 1 | 2 | 3)
//               }}
//             >
//               {createFeeStep === 1 ? 'Cancel' : '← Back'}
//             </Button>

//             {createFeeStep < 3 && (
//               <Button
//                 className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//                 onClick={() => {
//                   setCreateFeeError(null)
//                   const err = createFeeStep === 1 ? validateCreateStep1() : validateCreateStep2()
//                   if (err) { setCreateFeeError(err); return }
//                   // Step 1 early-warning: check if student already has a fee for this year
//                   if (createFeeStep === 1) {
//                     const yearMatch = fees.find(f => f.academic_year === createFeeForm.academic_year.trim())
//                     if (yearMatch) {
//                       setCreateFeeError(
//                         `⚠️ This student already has a fee record for ${createFeeForm.academic_year}. Creating another may fail if the same batch is selected. Use "Edit Structure" to modify existing fees.`
//                       )
//                       // Don't block — let them proceed if they want a different term
//                     }
//                   }
//                   setCreateFeeStep(s => (s + 1) as 2 | 3)
//                 }}
//               >
//                 Next →
//               </Button>
//             )}

//             {createFeeStep === 3 && (
//               <Button
//                 className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
//                 disabled={isSavingFee}
//                 onClick={handleConfirmCreateFee}
//               >
//                 {isSavingFee
//                   ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
//                   : 'Confirm & Create'}
//               </Button>
//             )}
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//     </div>
//   )
// }
