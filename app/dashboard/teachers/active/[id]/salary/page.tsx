'use client'

import React, { useState, useEffect, useCallback, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DollarSign, FileText, Plus, Eye, Edit2, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertCircle, RefreshCw, Loader2, IndianRupee,
} from 'lucide-react'
import { teachersApi } from '@/lib/api/teachers'
import type { TeacherSalaryStructure, TeacherSalaryTransaction } from '@/lib/api/teachers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n?: number | null): string =>
  n != null ? n.toLocaleString('en-IN') : '0'

const fmtDate = (d?: string | null): string => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN') } catch { return d }
}

const fmtMonth = (m?: string | null): string => {
  if (!m) return '—'
  const [y, mo] = m.split('-')
  if (!y || !mo) return m
  try {
    return new Date(Number(y), Number(mo) - 1, 1)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  } catch { return m }
}

const calcGross = (s: TeacherSalaryStructure): number =>
  (s.basic_salary ?? 0) + (s.hra ?? 0) + (s.da ?? 0) +
  (s.conveyance_allowance ?? 0) + (s.medical_allowance ?? 0) +
  (s.incentive_amount ?? 0) + (s.bonus_amount ?? 0)

const calcAllowances = (s: TeacherSalaryStructure): number =>
  (s.hra ?? 0) + (s.da ?? 0) + (s.conveyance_allowance ?? 0) + (s.medical_allowance ?? 0)

const calcDeductions = (s: TeacherSalaryStructure): number => {
  const g = calcGross(s)
  let d = 0
  if (s.pf_applicable  && s.pf_percentage)  d += g * (s.pf_percentage  / 100)
  if (s.tds_applicable && s.tds_percentage) d += g * (s.tds_percentage / 100)
  s.other_deductions?.forEach(od => { d += od.amount })
  return d
}

const calcNet = (s: TeacherSalaryStructure): number =>
  Math.max(0, calcGross(s) - calcDeductions(s))

const todayISO = () => new Date().toISOString().split('T')[0]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry}
          className="h-7 gap-1 text-rose-600 hover:bg-rose-100">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  )
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}

function PaidBadge({ status }: { status: string }) {
  if (status === 'paid')
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 capitalize text-xs">{status}</Badge>
  if (status === 'pending')
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 capitalize text-xs">{status}</Badge>
  return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 capitalize text-xs">{status}</Badge>
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function TeacherSalaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: teacherId } = use(params)

  // ── Salary Structure ───────────────────────────────────────────────────────
  const [structure,        setStructure]        = useState<TeacherSalaryStructure | null>(null)
  const [structureLoading, setStructureLoading] = useState(true)
  const [structureError,   setStructureError]   = useState<string | null>(null)

  // ── Transactions ───────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<TeacherSalaryTransaction[]>([])
  const [txLoading,    setTxLoading]    = useState(true)
  const [txError,      setTxError]      = useState<string | null>(null)

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page,      setPage]      = useState(1)
  const perPage                   = 5
  const totalPages                = Math.max(1, Math.ceil(transactions.length / perPage))
  const idxFirst                  = (page - 1) * perPage
  const idxLast                   = idxFirst + perPage
  const currentRows               = transactions.slice(idxFirst, idxLast)

  // ── Add Salary Structure dialog ────────────────────────────────────────────
  const [addDialog,  setAddDialog]  = useState(false)
  const [addSaving,  setAddSaving]  = useState(false)
  const [addError,   setAddError]   = useState<string | null>(null)
  const [addForm,    setAddForm]    = useState({
    salary_type:          'fixed_monthly',
    effective_from:       '',
    basic_salary:         '',
    hra:                  '',
    da:                   '',
    conveyance_allowance: '',
    medical_allowance:    '',
    pf_applicable:        true,
    tds_applicable:       true,
  })

  // ── Add Transaction dialog ─────────────────────────────────────────────────
  const [addTxDialog,  setAddTxDialog]  = useState(false)
  const [addTxSaving,  setAddTxSaving]  = useState(false)
  const [addTxError,   setAddTxError]   = useState<string | null>(null)
  const [addTxForm,    setAddTxForm]    = useState({
    amount:        '',
    payment_month: '',
    payment_date:  todayISO(),
    payment_mode:  'bank_transfer' as 'bank_transfer' | 'upi' | 'cash',
    status:        'pending' as 'pending' | 'paid' | 'failed',
    reference_id:  '',
  })

  // ── View dialog ────────────────────────────────────────────────────────────
  const [viewTx, setViewTx] = useState<TeacherSalaryTransaction | null>(null)

  // ── Edit dialog ────────────────────────────────────────────────────────────
  const [editTx,     setEditTx]     = useState<TeacherSalaryTransaction | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState<string | null>(null)
  const [editForm,   setEditForm]   = useState({
    amount:        '',
    payment_month: '',
    payment_date:  '',
    payment_mode:  'bank_transfer' as 'bank_transfer' | 'upi' | 'cash',
    status:        'pending' as 'pending' | 'paid' | 'failed',
    reference_id:  '',
  })

  // ── Delete dialog ──────────────────────────────────────────────────────────
  const [deleteTx,    setDeleteTx]    = useState<TeacherSalaryTransaction | null>(null)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const gross      = structure ? calcGross(structure)      : 0
  const net        = structure ? calcNet(structure)        : 0
  const allowances = structure ? calcAllowances(structure) : 0
  const deductions = structure ? calcDeductions(structure) : 0

  // ── Fetch structure ────────────────────────────────────────────────────────
  const fetchStructure = useCallback(async () => {
    setStructureLoading(true)
    setStructureError(null)
    try {
      const res = await teachersApi.getActiveSalaryStructureByTeacher(teacherId)
      if (res.success && res.result) {
        setStructure(res.result as TeacherSalaryStructure)
      } else {
        setStructure(null)
      }
    } catch (err: unknown) {
      const e = err as { status?: number; statusCode?: number }
      if (e?.status === 404 || e?.statusCode === 404) {
        setStructure(null)
      } else {
        setStructureError('Unable to load salary structure. Please try again.')
        console.error('[SalaryPage] fetchStructure error:', err)
      }
    } finally {
      setStructureLoading(false)
    }
  }, [teacherId])

  // ── Fetch transactions ─────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    setTxError(null)
    try {
      const res = await teachersApi.getSalaryTransactionsByTeacher(teacherId)
      if (res.success && res.result) {
        const sorted = [...(res.result as TeacherSalaryTransaction[])].sort((a, b) =>
          (b.payment_month ?? '').localeCompare(a.payment_month ?? ''))
        setTransactions(sorted)
      } else {
        setTransactions([])
      }
    } catch (err: unknown) {
      setTxError('Unable to load salary history. Please try again.')
      console.error('[SalaryPage] fetchTransactions error:', err)
    } finally {
      setTxLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    fetchStructure()
    fetchTransactions()
  }, [fetchStructure, fetchTransactions])

  // ── Add Salary Structure ───────────────────────────────────────────────────
  const handleAddSalary = async () => {
    if (!addForm.basic_salary || Number(addForm.basic_salary) <= 0) {
      setAddError('Please enter a valid Basic Salary.')
      return
    }
    if (!addForm.effective_from) {
      setAddError('Please select Effective From date.')
      return
    }
    setAddSaving(true)
    setAddError(null)
    try {
      const res = await teachersApi.createSalaryStructure({
        teacher_id:           teacherId,
        salary_type:          addForm.salary_type as TeacherSalaryStructure['salary_type'],
        pay_frequency:        'monthly',
        effective_from:       addForm.effective_from,
        basic_salary:         Number(addForm.basic_salary),
        hra:                  addForm.hra                  ? Number(addForm.hra)                  : 0,
        da:                   addForm.da                   ? Number(addForm.da)                   : 0,
        conveyance_allowance: addForm.conveyance_allowance ? Number(addForm.conveyance_allowance) : 0,
        medical_allowance:    addForm.medical_allowance    ? Number(addForm.medical_allowance)    : 0,
        pf_applicable:        addForm.pf_applicable,
        tds_applicable:       addForm.tds_applicable,
      })
      if (res.success) {
        console.log('[SalaryPage] Salary structure created:', res.result)
        setAddDialog(false)
        setAddForm({
          salary_type: 'fixed_monthly', effective_from: '',
          basic_salary: '', hra: '', da: '', conveyance_allowance: '',
          medical_allowance: '', pf_applicable: true, tds_applicable: true,
        })
        await fetchStructure()
      } else {
        setAddError('Failed to add salary structure. Please try again.')
        console.error('[SalaryPage] createSalaryStructure failed:', res.message)
      }
    } catch (err: unknown) {
      setAddError('An unexpected error occurred. Please try again.')
      console.error('[SalaryPage] createSalaryStructure error:', err)
    } finally {
      setAddSaving(false)
    }
  }

  // ── Add Transaction ────────────────────────────────────────────────────────
  const handleAddTransaction = async () => {
    if (!addTxForm.amount || Number(addTxForm.amount) <= 0) {
      setAddTxError('Please enter a valid amount.')
      return
    }
    if (!addTxForm.payment_month) {
      setAddTxError('Please select a payment month.')
      return
    }
    setAddTxSaving(true)
    setAddTxError(null)
    try {
      const res = await teachersApi.createSalaryTransaction({
        teacher_id:    teacherId,
        amount:        Number(addTxForm.amount),
        payment_month: addTxForm.payment_month,
        payment_date:  addTxForm.payment_date  || undefined,
        payment_mode:  addTxForm.payment_mode,
        status:        addTxForm.status,
        reference_id:  addTxForm.reference_id.trim() || undefined,
      })
      if (res.success) {
        console.log('[SalaryPage] Transaction created:', res.result)
        setAddTxDialog(false)
        setAddTxForm({
          amount: '', payment_month: '', payment_date: todayISO(),
          payment_mode: 'bank_transfer', status: 'pending', reference_id: '',
        })
        await fetchTransactions()
      } else {
        setAddTxError('Failed to add payment record. Please try again.')
        console.error('[SalaryPage] createSalaryTransaction failed:', res.message)
      }
    } catch (err: unknown) {
      setAddTxError('An unexpected error occurred. Please try again.')
      console.error('[SalaryPage] createSalaryTransaction error:', err)
    } finally {
      setAddTxSaving(false)
    }
  }

  // ── Open Edit ──────────────────────────────────────────────────────────────
  const openEdit = (tx: TeacherSalaryTransaction) => {
    setEditTx(tx)
    setEditForm({
      amount:        String(tx.amount ?? ''),
      payment_month: tx.payment_month ?? '',
      payment_date:  tx.payment_date  ?? todayISO(),
      payment_mode:  (tx.payment_mode as 'bank_transfer' | 'upi' | 'cash') ?? 'bank_transfer',
      status:        (tx.status as 'pending' | 'paid' | 'failed') ?? 'pending',
      reference_id:  tx.reference_id ?? '',
    })
    setEditError(null)
  }

  // ── Update transaction ─────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editTx?._id) return
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      setEditError('Please enter a valid amount.')
      return
    }
    if (!editForm.payment_month) {
      setEditError('Please select a payment month.')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await teachersApi.updateSalaryTransaction(editTx._id, {
        amount:        Number(editForm.amount),
        payment_month: editForm.payment_month,
        payment_date:  editForm.payment_date  || undefined,
        payment_mode:  editForm.payment_mode,
        status:        editForm.status,
        reference_id:  editForm.reference_id.trim() || undefined,
      })
      if (res.success) {
        console.log('[SalaryPage] Transaction updated:', res.result)
        setEditTx(null)
        await fetchTransactions()
      } else {
        setEditError('Failed to update payment record. Please try again.')
        console.error('[SalaryPage] updateSalaryTransaction failed:', res.message)
      }
    } catch (err: unknown) {
      setEditError('An unexpected error occurred. Please try again.')
      console.error('[SalaryPage] updateSalaryTransaction error:', err)
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTx?._id) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await teachersApi.deleteSalaryTransaction(deleteTx._id)
      if (res.success) {
        console.log('[SalaryPage] Transaction deleted:', deleteTx._id)
        setDeleteTx(null)
        setDeleteError(null)
        if (currentRows.length === 1 && page > 1) setPage(p => p - 1)
        await fetchTransactions()
      } else {
        setDeleteError('Failed to delete payment record. Please try again.')
        console.error('[SalaryPage] deleteSalaryTransaction failed:', res.message)
      }
    } catch (err: unknown) {
      setDeleteError('An unexpected error occurred. Please try again.')
      console.error('[SalaryPage] deleteSalaryTransaction error:', err)
    } finally {
      setDeleting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ═══════════════════════════════════════════════════════
           CURRENT SALARY STRUCTURE
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-green-500/5 to-green-600/5 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base sm:text-lg">Current Salary Structure</CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setAddError(null); setAddDialog(true) }}
              className="w-full sm:w-auto gap-2 h-9 border-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">Add Structure</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {structureLoading ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading salary structure...</span>
            </div>
          ) : structureError ? (
            <ErrorBanner message={structureError} onRetry={fetchStructure} />
          ) : structure ? (
            <div className="space-y-4">
              {/* 2×2 grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Basic Salary</p>
                  <p className="text-xl font-bold">₹{fmt(structure.basic_salary)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">HRA</p>
                  <p className="text-xl font-bold">₹{fmt(structure.hra)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Gross Salary</p>
                  <p className="text-xl font-bold text-green-600">₹{fmt(gross)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Net Salary</p>
                  <p className="text-xl font-bold text-[#1897C6]">₹{fmt(net)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
                <span>
                  Effective from:{' '}
                  <span className="text-foreground">{fmtDate(structure.effective_from)}</span>
                  {structure.effective_to && (
                    <> – <span className="text-foreground">{fmtDate(structure.effective_to)}</span></>
                  )}
                </span>
                <Badge variant="outline" className="text-xs font-normal capitalize">
                  {structure.status ?? 'active'}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">No active salary structure found.</p>
              <p className="text-xs text-muted-foreground">
                Click "Add Structure" to create one.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
           SALARY PAYMENT HISTORY
      ═══════════════════════════════════════════════════════ */}
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[#1897C6]" />
              <CardTitle className="text-base sm:text-lg">Salary Payment History</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => { setAddTxError(null); setAddTxDialog(true) }}
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:opacity-90 h-9 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs sm:text-sm">Add Payment</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {txError && (
            <div className="p-4 sm:p-0 sm:pb-4">
              <ErrorBanner message={txError} onRetry={fetchTransactions} />
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 hover:from-[#1897C6]/5 hover:to-[#67BAC3]/5 border-b-2">
                  <TableHead className="font-semibold text-sm">Month</TableHead>
                  <TableHead className="font-semibold text-sm hidden sm:table-cell">Basic</TableHead>
                  <TableHead className="font-semibold text-sm hidden md:table-cell">Gross</TableHead>
                  <TableHead className="font-semibold text-sm">Net Paid</TableHead>
                  <TableHead className="font-semibold text-sm hidden lg:table-cell">Status</TableHead>
                  <TableHead className="font-semibold text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                      <TableCell className="hidden md:table-cell"><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><div className="h-5 w-14 bg-muted rounded" /></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : currentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                      No salary history available
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRows.map(tx => (
                    <TableRow key={tx._id}
                      className="hover:bg-gradient-to-r hover:from-[#1897C6]/5 hover:to-transparent transition-all border-b">
                      <TableCell className="py-4">
                        <div>
                          <p className="font-medium text-sm">{fmtMonth(tx.payment_month)}</p>
                          <p className="text-xs text-muted-foreground lg:hidden capitalize">{tx.status}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 hidden sm:table-cell">
                        <p className="text-sm">₹{fmt(structure?.basic_salary)}</p>
                      </TableCell>
                      <TableCell className="py-4 hidden md:table-cell">
                        <p className="text-sm">₹{fmt(gross)}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-sm font-bold text-[#1897C6]">₹{fmt(tx.amount)}</p>
                      </TableCell>
                      <TableCell className="py-4 hidden lg:table-cell">
                        <PaidBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => setViewTx(tx)}
                            className="text-muted-foreground hover:text-[#1897C6] transition-colors" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(tx)}
                            className="text-muted-foreground hover:text-[#F1AF37] transition-colors" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setDeleteTx(tx); setDeleteError(null) }}
                            className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!txLoading && transactions.length > perPage && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border-t">
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing {idxFirst + 1}–{Math.min(idxLast, transactions.length)} of {transactions.length}
              </p>
              <div className="flex items-center justify-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1} className="h-8 w-8 p-0 border-2">
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 p-0 border-2">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pn: number
                  if (totalPages <= 3)             pn = i + 1
                  else if (page <= 2)              pn = i + 1
                  else if (page >= totalPages - 1) pn = totalPages - 2 + i
                  else                             pn = page - 1 + i
                  return (
                    <Button key={pn} size="sm" onClick={() => setPage(pn)}
                      variant={page === pn ? 'default' : 'outline'}
                      className={`h-8 w-8 p-0 border-2 ${page === pn ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white border-transparent' : ''}`}>
                      {pn}
                    </Button>
                  )
                })}
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 p-0 border-2">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="h-8 w-8 p-0 border-2">
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
           ADD SALARY STRUCTURE DIALOG
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={addDialog} onOpenChange={v => { if (!addSaving) { setAddDialog(v); if (!v) setAddError(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Salary Structure</DialogTitle>
            <DialogDescription>Create a new salary structure for this teacher</DialogDescription>
          </DialogHeader>

          {addError && <InlineError message={addError} />}

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2">
                <Label htmlFor="salary_type">Salary Type</Label>
                <Select value={addForm.salary_type} onValueChange={v => setAddForm(f => ({ ...f, salary_type: v }))}>
                  <SelectTrigger id="salary_type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_monthly">Fixed Monthly</SelectItem>
                    <SelectItem value="per_lecture">Per Lecture</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_from">Effective From <span className="text-rose-500">*</span></Label>
                <Input id="effective_from" type="date" value={addForm.effective_from}
                  onChange={e => setAddForm(f => ({ ...f, effective_from: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="basic_salary">Basic Salary (₹) <span className="text-rose-500">*</span></Label>
                <Input id="basic_salary" type="number" min="0" placeholder="50000" value={addForm.basic_salary}
                  onChange={e => setAddForm(f => ({ ...f, basic_salary: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hra">HRA (₹)</Label>
                <Input id="hra" type="number" min="0" placeholder="15000" value={addForm.hra}
                  onChange={e => setAddForm(f => ({ ...f, hra: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="da">DA (₹)</Label>
                <Input id="da" type="number" min="0" placeholder="5000" value={addForm.da}
                  onChange={e => setAddForm(f => ({ ...f, da: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conveyance_allowance">Conveyance Allowance (₹)</Label>
                <Input id="conveyance_allowance" type="number" min="0" placeholder="3000" value={addForm.conveyance_allowance}
                  onChange={e => setAddForm(f => ({ ...f, conveyance_allowance: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_allowance">Medical Allowance (₹)</Label>
                <Input id="medical_allowance" type="number" min="0" placeholder="2000" value={addForm.medical_allowance}
                  onChange={e => setAddForm(f => ({ ...f, medical_allowance: e.target.value }))} />
              </div>

            </div>

            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox id="pf_applicable" checked={addForm.pf_applicable}
                  onCheckedChange={c => setAddForm(f => ({ ...f, pf_applicable: c as boolean }))} />
                <Label htmlFor="pf_applicable" className="text-sm cursor-pointer">PF Applicable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="tds_applicable" checked={addForm.tds_applicable}
                  onCheckedChange={c => setAddForm(f => ({ ...f, tds_applicable: c as boolean }))} />
                <Label htmlFor="tds_applicable" className="text-sm cursor-pointer">TDS Applicable</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialog(false); setAddError(null) }} disabled={addSaving}>Cancel</Button>
            <Button onClick={handleAddSalary} disabled={addSaving}
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:opacity-90 text-white gap-2">
              {addSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Add Salary Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
           ADD PAYMENT RECORD DIALOG
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={addTxDialog} onOpenChange={v => { if (!addTxSaving) { setAddTxDialog(v); if (!v) setAddTxError(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Salary Payment</DialogTitle>
            <DialogDescription>Record a new salary payment for this teacher</DialogDescription>
          </DialogHeader>

          {addTxError && <InlineError message={addTxError} />}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (₹) <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" min="0" placeholder="0.00"
                  value={addTxForm.amount}
                  onChange={e => setAddTxForm(f => ({ ...f, amount: e.target.value }))}
                  className="pl-10 h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Month <span className="text-rose-500">*</span></Label>
              <Input type="month" value={addTxForm.payment_month}
                onChange={e => setAddTxForm(f => ({ ...f, payment_month: e.target.value }))}
                className="h-10" />
            </div>

            <div className="space-y-2">
              <Label>Payment Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input type="date" value={addTxForm.payment_date}
                onChange={e => setAddTxForm(f => ({ ...f, payment_date: e.target.value }))}
                className="h-10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={addTxForm.payment_mode}
                  onValueChange={v => setAddTxForm(f => ({ ...f, payment_mode: v as typeof f.payment_mode }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={addTxForm.status}
                  onValueChange={v => setAddTxForm(f => ({ ...f, status: v as typeof f.status }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input placeholder="UTR / Transaction ID"
                value={addTxForm.reference_id}
                onChange={e => setAddTxForm(f => ({ ...f, reference_id: e.target.value }))}
                className="h-10" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddTxDialog(false); setAddTxError(null) }} disabled={addTxSaving}>Cancel</Button>
            <Button onClick={handleAddTransaction} disabled={addTxSaving}
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:opacity-90 text-white gap-2">
              {addTxSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
           VIEW SALARY DIALOG
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!viewTx} onOpenChange={v => { if (!v) setViewTx(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salary Details</DialogTitle>
            <DialogDescription>{viewTx ? fmtMonth(viewTx.payment_month) : ''}</DialogDescription>
          </DialogHeader>
          {viewTx && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Basic Salary:</span>
                <span className="text-sm font-medium">₹{fmt(structure?.basic_salary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Allowances:</span>
                <span className="text-sm font-medium">₹{fmt(allowances)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gross Salary:</span>
                <span className="text-sm font-medium">₹{fmt(gross)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Deductions:</span>
                <span className="text-sm font-medium text-red-600">-₹{fmt(deductions)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Net Salary Paid:</span>
                <span className="text-lg font-bold text-[#1897C6]">₹{fmt(viewTx.amount)}</span>
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="font-medium">{fmtDate(viewTx.payment_date)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <span className="font-medium capitalize">{viewTx.payment_mode?.replace(/_/g, ' ') ?? '—'}</span>
                </div>
                {viewTx.reference_id && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Reference ID:</span>
                    <span className="font-medium">{viewTx.reference_id}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Status:</span>
                  <PaidBadge status={viewTx.status} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTx(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
           EDIT SALARY DIALOG
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!editTx} onOpenChange={v => { if (!editSaving && !v) { setEditTx(null); setEditError(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Salary Payment</DialogTitle>
            <DialogDescription>{editTx ? fmtMonth(editTx.payment_month) : ''}</DialogDescription>
          </DialogHeader>

          {editError && <InlineError message={editError} />}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (₹) <span className="text-rose-500">*</span></Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" min="0" placeholder="0.00"
                  value={editForm.amount}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                  className="pl-10 h-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Month <span className="text-rose-500">*</span></Label>
              <Input type="month" value={editForm.payment_month}
                onChange={e => setEditForm(f => ({ ...f, payment_month: e.target.value }))}
                className="h-10" />
            </div>

            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input type="date" value={editForm.payment_date}
                onChange={e => setEditForm(f => ({ ...f, payment_date: e.target.value }))}
                className="h-10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={editForm.payment_mode}
                  onValueChange={v => setEditForm(f => ({ ...f, payment_mode: v as typeof f.payment_mode }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status}
                  onValueChange={v => setEditForm(f => ({ ...f, status: v as typeof f.status }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference ID <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input placeholder="UTR / Transaction ID"
                value={editForm.reference_id}
                onChange={e => setEditForm(f => ({ ...f, reference_id: e.target.value }))}
                className="h-10" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditTx(null); setEditError(null) }} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={editSaving}
              className="bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:opacity-90 text-white gap-2">
              {editSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
           DELETE CONFIRM DIALOG
      ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!deleteTx} onOpenChange={v => { if (!deleting && !v) { setDeleteTx(null); setDeleteError(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Delete Payment Record?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the salary payment for{' '}
              <strong>{deleteTx ? fmtMonth(deleteTx.payment_month) : ''}</strong>.{' '}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && <InlineError message={deleteError} />}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteTx(null); setDeleteError(null) }} disabled={deleting}>
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white gap-2">
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</> : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
