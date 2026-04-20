import { apiClient, ApiResponse } from './client'
import { ENDPOINTS } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeeFrequency = 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual'
export type FeeStatus = 'active' | 'inactive'
export type StudentFeeStatus = 'pending' | 'partial' | 'paid' | 'overdue'
export type PaymentMethod = 'cash' | 'card' | 'online' | 'cheque' | 'upi'

// ─── Populated sub-types (backend .populate() responses) ─────────────────────

/** Populated institute_id shape from FeeStructure / FeeTerm responses */
export interface PopulatedInstitute {
  _id: string 
  institute_code: string
  institute_name: string
}

/** Populated class_id shape */
export interface PopulatedClass {
  _id: string
  class_name: string
}

/** Populated section_id shape */
export interface PopulatedSection {
  _id: string
  section_name: string
}

/** Populated term_id shape inside StudentFee */
export interface PopulatedTerm {
  _id: string
  term_order: number | null
  name: string
  due_date: string
}

/** Populated fee_structure_id shape inside StudentFee */
export interface PopulatedFeeStructureRef {
  _id: string
  academic_year: string
}

/** Populated student_id shape inside StudentFee / FeeReceipt */
export interface PopulatedStudent {
  _id: string
  student_code: string
  full_name: string
}

/** Populated student_fee_id shape inside FeeReceipt */
export interface PopulatedStudentFeeRef {
  _id: string
  academic_year: string
  total_amount: number
  status: string
}

/** Populated term_id shape inside FeeReceipt */
export interface PopulatedTermRef {
  _id: string
  term_order: number | null
  name: string
}

/** Populated collected_by shape inside FeeReceipt */
export interface PopulatedTeacherRef {
  _id: string
  full_name: string
}

// ─── Fee Structure Types ──────────────────────────────────────────────────────

export interface FeeHead {
  name: string
  amount: number
  frequency: FeeFrequency
  mandatory?: boolean
}

export interface FeeStructure {
  _id: string
  institute_id: string | PopulatedInstitute
  academic_year: string | null
  class_id: string | PopulatedClass
  section_id: string | PopulatedSection | null
  batch_id: string | PopulatedBatch | null
  fee_heads: FeeHead[]
  total_annual_amount: number | null
  status: FeeStatus
  created_at: string
  updated_at: string
}

export interface CreateFeeStructurePayload {
  institute_id: string
  academic_year: string
  class_id: string
  section_id?: string | null
  batch_id?: string | null
  fee_heads: FeeHead[]
  status?: FeeStatus
}

export interface UpdateFeeStructurePayload {
  fee_heads?: FeeHead[]
  status?: FeeStatus
  academic_year?: string
}

// ─── Fee Term Types ───────────────────────────────────────────────────────────

export interface FeeTerm {
  _id: string
  // populated in GET responses
  institute_id: string | PopulatedInstitute
  academic_year: string
  term_order: number | null
  name: string
  start_date: string
  due_date: string
  late_fee_amount: number | null
  status: FeeStatus
  created_at: string
  updated_at: string
}

export interface CreateFeeTermPayload {
  institute_id: string
  academic_year: string
  term_order?: number | null
  name: string
  start_date: string
  due_date: string
  late_fee_amount?: number | null
  status?: FeeStatus
}

export interface UpdateFeeTermPayload {
  name?: string
  start_date?: string
  due_date?: string
  late_fee_amount?: number | null
  status?: FeeStatus
  term_order?: number | null
}

// ─── Student Fee Types ────────────────────────────────────────────────────────

export interface FeeSnapshotItem {
  name: string
  amount: number
  frequency?: string
}

export interface PopulatedBatch {
  _id: string
  batch_name: string
  start_time?: string | null
  end_time?: string | null
}

export interface StudentFee {
  _id: string
  institute_id: string
  student_id: string | PopulatedStudent
  class_id: string | PopulatedClass
  section_id: string | PopulatedSection | null
  batch_id: string | PopulatedBatch | null
  academic_year: string
  /**
   * Backend populates: { _id, term_order, name, due_date }
   * Never rely on this being a plain string — always use extractId() to get the _id.
   */
  term_id: string | PopulatedTerm
  /**
   * Backend populates: { _id, academic_year }
   * Never rely on this being a plain string — always use extractId() to get the _id.
   */
  fee_structure_id: string | PopulatedFeeStructureRef
  fee_snapshot: FeeSnapshotItem[]
  total_amount: number
  paid_amount: number
  due_amount: number
  late_fee_applied: number | null
  due_date: string | null
  status: StudentFeeStatus
  is_late_fee_applied: boolean
  created_at: string
  updated_at: string
}

export interface GenerateStudentFeePayload {
  institute_id: string
  student_id: string
  class_id: string
  section_id?: string | null
  batch_id?: string | null
  academic_year: string
  term_id: string
  fee_structure_id: string
}

export interface CreateStudentFeePayload {
  institute_id: string
  student_id: string
  class_id: string
  section_id?: string | null
  batch_id?: string | null
  academic_year: string
  term_id: string
  fee_structure_id: string
  fee_snapshot: FeeSnapshotItem[]
  total_amount: number
  paid_amount?: number
  due_amount: number
  due_date?: string
  status?: StudentFeeStatus
  is_late_fee_applied?: boolean
}

export interface UpdateStudentFeePayload {
  status?: StudentFeeStatus
  paid_amount?: number
  due_amount?: number
  total_amount?: number
  due_date?: string
  is_late_fee_applied?: boolean
  fee_snapshot?: FeeSnapshotItem[]
}

export interface ApplyLateFeePayload {
  late_fee_amount: number
}

// ─── Fee Receipt Types ────────────────────────────────────────────────────────

export interface FeeReceipt {
  _id: string
  institute_id: string
  // may be populated: { _id, student_code, full_name }
  student_id: string | PopulatedStudent
  /**
   * Backend populates: { _id, academic_year, total_amount, status }
   * Always use extractId() to compare against StudentFee._id.
   */
  student_fee_id: string | PopulatedStudentFeeRef
  /**
   * Backend populates: { _id, term_order, name }
   * Use extractId() for ID, or access .name directly when populated.
   */
  term_id: string | PopulatedTermRef | null
  receipt_number: string
  amount_paid: number
  payment_method: PaymentMethod
  transaction_id: string | null
  payment_date: string
  // may be populated: { _id, full_name }
  collected_by: string | PopulatedTeacherRef | null
  remarks: string | null
  created_at: string
}

export interface CreateFeeReceiptPayload {
  institute_id: string
  student_id: string
  student_fee_id: string
  term_id?: string | null
  amount_paid: number
  payment_method: PaymentMethod
  transaction_id?: string | null
  payment_date: string
  collected_by?: string | null
  remarks?: string | null
}

// ─── Shared ID/Name helpers ───────────────────────────────────────────────────

/**
 * Safely extract a plain ObjectId string from a field that may be
 * a raw string or a populated object (with ._id).
 */
export function extractId(
  val: string | { _id: string } | null | undefined,
): string {
  if (!val) return ''
  if (typeof val === 'object' && '_id' in val) return val._id
  return val as string
}

/**
 * Resolve a human-readable term label.
 * If term_id is populated, use its .name directly (no map lookup needed).
 * If it is a plain string, fall back to feeTermsMap.
 */
export function resolveTermLabel(
  termId: string | PopulatedTerm | PopulatedTermRef | null | undefined,
  feeTermsMap: Record<string, string>,
): string {
  if (!termId) return 'N/A'
  if (typeof termId === 'object') return termId.name || 'N/A'
  return feeTermsMap[termId] ?? 'N/A'
}

export function calcTotalFromHeads(heads: FeeHead[]): number {
  return heads.reduce((sum, h) => sum + Number(h.amount), 0)
}
// ═══════════════════════════════════════════════════════════════════════════════
// FEE STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════

export const feeStructureApi = {
  create: (payload: CreateFeeStructurePayload): Promise<ApiResponse<FeeStructure>> =>
    apiClient.post<FeeStructure>(ENDPOINTS.FEE_STRUCTURES.BASE, payload),

  getAll: (): Promise<ApiResponse<FeeStructure[]>> =>
    apiClient.get<FeeStructure[]>(ENDPOINTS.FEE_STRUCTURES.BASE),

  getById: (id: string): Promise<ApiResponse<FeeStructure>> =>
    apiClient.get<FeeStructure>(ENDPOINTS.FEE_STRUCTURES.GET_BY_ID(id)),

  getByClass: (classId: string): Promise<ApiResponse<FeeStructure[]>> =>
    apiClient.get<FeeStructure[]>(ENDPOINTS.FEE_STRUCTURES.GET_BY_CLASS(classId)),

  /** id must be a plain ObjectId string — use extractId() before calling */
  update: (id: string, payload: UpdateFeeStructurePayload): Promise<ApiResponse<FeeStructure>> =>
    apiClient.put<FeeStructure>(ENDPOINTS.FEE_STRUCTURES.UPDATE(id), payload),

  delete: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete<null>(ENDPOINTS.FEE_STRUCTURES.DELETE(id)),
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEE TERMS
// ═══════════════════════════════════════════════════════════════════════════════

export const feeTermApi = {
  create: (payload: CreateFeeTermPayload): Promise<ApiResponse<FeeTerm>> =>
    apiClient.post<FeeTerm>(ENDPOINTS.FEE_TERMS.BASE, payload),

  createBulk: (payload: CreateFeeTermPayload[]): Promise<ApiResponse<FeeTerm[]>> =>
    apiClient.post<FeeTerm[]>(ENDPOINTS.FEE_TERMS.BULK, payload),

  getAll: (): Promise<ApiResponse<FeeTerm[]>> =>
    apiClient.get<FeeTerm[]>(ENDPOINTS.FEE_TERMS.BASE),

  getById: (id: string): Promise<ApiResponse<FeeTerm>> =>
    apiClient.get<FeeTerm>(ENDPOINTS.FEE_TERMS.GET_BY_ID(id)),

  getByInstituteAndYear: (instituteId: string, academicYear: string): Promise<ApiResponse<FeeTerm[]>> =>
    apiClient.get<FeeTerm[]>(ENDPOINTS.FEE_TERMS.GET_BY_INSTITUTE_AND_YEAR(instituteId, academicYear)),

  update: (id: string, payload: UpdateFeeTermPayload): Promise<ApiResponse<FeeTerm>> =>
    apiClient.put<FeeTerm>(ENDPOINTS.FEE_TERMS.UPDATE(id), payload),

  delete: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete<null>(ENDPOINTS.FEE_TERMS.DELETE(id)),
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT FEES
// ═══════════════════════════════════════════════════════════════════════════════

export const studentFeeApi = {
  generate: (payload: GenerateStudentFeePayload): Promise<ApiResponse<StudentFee>> =>
    apiClient.post<StudentFee>(ENDPOINTS.STUDENT_FEES.GENERATE, payload),

  create: (payload: CreateStudentFeePayload): Promise<ApiResponse<StudentFee>> =>
    apiClient.post<StudentFee>(ENDPOINTS.STUDENT_FEES.BASE, payload),

  getAll: (): Promise<ApiResponse<StudentFee[]>> =>
    apiClient.get<StudentFee[]>(ENDPOINTS.STUDENT_FEES.BASE),

  getById: (id: string): Promise<ApiResponse<StudentFee>> =>
    apiClient.get<StudentFee>(ENDPOINTS.STUDENT_FEES.GET_BY_ID(id)),

  getByStudent: (studentId: string): Promise<ApiResponse<StudentFee[]>> =>
    apiClient.get<StudentFee[]>(ENDPOINTS.STUDENT_FEES.GET_BY_STUDENT(studentId)),

  getByBatch: (batchId: string): Promise<ApiResponse<StudentFee[]>> =>
    apiClient.get<StudentFee[]>(ENDPOINTS.STUDENT_FEES.GET_BY_BATCH(batchId)),

  update: (id: string, payload: UpdateStudentFeePayload): Promise<ApiResponse<StudentFee>> =>
    apiClient.put<StudentFee>(ENDPOINTS.STUDENT_FEES.UPDATE(id), payload),

  applyLateFee: (id: string, payload: ApplyLateFeePayload): Promise<ApiResponse<StudentFee>> =>
    apiClient.patch<StudentFee>(ENDPOINTS.STUDENT_FEES.APPLY_LATE_FEE(id), payload),

  delete: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete<null>(ENDPOINTS.STUDENT_FEES.DELETE(id)),
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEE RECEIPTS
// ═══════════════════════════════════════════════════════════════════════════════

export const feeReceiptApi = {
  create: (payload: CreateFeeReceiptPayload): Promise<ApiResponse<FeeReceipt>> =>
    apiClient.post<FeeReceipt>(ENDPOINTS.FEE_RECEIPTS.BASE, payload),

  getAll: (): Promise<ApiResponse<FeeReceipt[]>> =>
    apiClient.get<FeeReceipt[]>(ENDPOINTS.FEE_RECEIPTS.BASE),

  getById: (id: string): Promise<ApiResponse<FeeReceipt>> =>
    apiClient.get<FeeReceipt>(ENDPOINTS.FEE_RECEIPTS.GET_BY_ID(id)),

  getByStudent: (studentId: string): Promise<ApiResponse<FeeReceipt[]>> =>
    apiClient.get<FeeReceipt[]>(ENDPOINTS.FEE_RECEIPTS.GET_BY_STUDENT(studentId)),

  getByStudentFee: (studentFeeId: string): Promise<ApiResponse<FeeReceipt[]>> =>
    apiClient.get<FeeReceipt[]>(ENDPOINTS.FEE_RECEIPTS.GET_BY_STUDENT_FEE(studentFeeId)),

  delete: (id: string): Promise<ApiResponse<null>> =>
    apiClient.delete<null>(ENDPOINTS.FEE_RECEIPTS.DELETE(id)),
} 