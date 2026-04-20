import { useState, useCallback, useRef } from 'react'
import { studentFeeApi, feeReceiptApi, feeTermApi } from '@/lib/api/fee'
import type { StudentFee, FeeReceipt, FeeTerm } from '@/lib/api/fee'

export function useFees(studentId: string) {
  const fetchedRef = useRef(false)

  const [fees,         setFees]         = useState<StudentFee[]>([])
  const [feeReceipts,  setFeeReceipts]  = useState<FeeReceipt[]>([])
  const [feeTermsMap,  setFeeTermsMap]  = useState<Record<string, string>>({})
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [loading,      setLoading]      = useState(false)

  const fetchFees = useCallback(async (force = false) => {
    if (!studentId || (fetchedRef.current && !force)) return
    setLoading(true)
    try {
      // ── Student Fees ────────────────────────────────────────────────────────
      const feesRes = await studentFeeApi.getByStudent(studentId)
      if (feesRes.success && feesRes.result) {
        const allFees: StudentFee[] = feesRes.result

        setFees(allFees)

        // Auto-select the latest academic year only on first load.
        // On subsequent refreshes (force=true) we preserve the user's selection.
        if (!fetchedRef.current) {
          const years = [...new Set(allFees.map(f => f.academic_year))].sort().reverse()
          if (years.length > 0) setSelectedYear(years[0])
        }

        // Build term-name fallback map (used when term_id is NOT populated).
        // This is a best-effort fetch — failures are silently swallowed per year.
        const instituteId =
          typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''

        if (instituteId && allFees.length > 0) {
          const uniqueYears = [...new Set(allFees.map(f => f.academic_year))]
          const termMap: Record<string, string> = {}

          await Promise.allSettled(
            uniqueYears.map(async year => {
              try {
                const termsRes = await feeTermApi.getByInstituteAndYear(instituteId, year)
                if (termsRes.success && termsRes.result) {
                  ;(termsRes.result as FeeTerm[]).forEach(t => {
                    termMap[t._id] = t.name
                  })
                }
              } catch (e) {
                console.error(`[useFees] Failed to fetch terms for year ${year}:`, e)
              }
            }),
          )

          setFeeTermsMap(termMap)
        }
      } else {
        console.error('[useFees] Failed to fetch student fees:', feesRes.message)
        setFees([])
      }

      // ── Fee Receipts ────────────────────────────────────────────────────────
      const receiptsRes = await feeReceiptApi.getByStudent(studentId)
      if (receiptsRes.success && receiptsRes.result) {
        setFeeReceipts(receiptsRes.result as FeeReceipt[])
      } else {
        console.error('[useFees] Failed to fetch receipts:', receiptsRes.message)
        setFeeReceipts([])
      }
    } catch (err) {
      console.error('[useFees] Unexpected error in fetchFees:', err)
    } finally {
      fetchedRef.current = true
      setLoading(false)
    }
  }, [studentId])

  /** Refreshes all fee data without resetting the user's year selection. */
  const refreshFees = useCallback(async () => {
    await fetchFees(true)
  }, [fetchFees])

  return {
    fees,
    feeReceipts,
    feeTermsMap,
    selectedYear,
    setSelectedYear,
    loading,
    fetchFees,
    refreshFees,
  }
}























// 'use client'

// import { useState, useCallback, useRef } from 'react'
// import { studentFeeApi, feeReceiptApi, feeTermApi, StudentFee, FeeReceipt, FeeTerm } from '@/lib/api/fee'

// export function useFees(studentId: string) {
//   const fetchedRef = useRef(false)

//   const [fees,         setFees]         = useState<StudentFee[]>([])
//   const [feeReceipts,  setFeeReceipts]  = useState<FeeReceipt[]>([])
//   const [feeTermsMap,  setFeeTermsMap]  = useState<Record<string, string>>({})
//   const [selectedYear, setSelectedYear] = useState<string>('')
//   const [loading,      setLoading]      = useState(false)

//   const fetchFees = useCallback(async (force = false) => {
//     if (!studentId || (fetchedRef.current && !force)) return
//     setLoading(true)
//     try {
//       const feesRes = await studentFeeApi.getByStudent(studentId)
//       if (feesRes.success && feesRes.result) {
//         const allFees = feesRes.result as StudentFee[]
//         setFees(allFees)
//         const years = [...new Set(allFees.map(f => f.academic_year))].sort().reverse()
//         if (years.length > 0) setSelectedYear(years[0])

//         const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
//         if (instituteId && allFees.length > 0) {
//           const uniqueYears = [...new Set(allFees.map(f => f.academic_year))]
//           const termMap: Record<string, string> = {}
//           await Promise.allSettled(uniqueYears.map(async (year) => {
//             try {
//               const termsRes = await feeTermApi.getByInstituteAndYear(instituteId, year)
//               if (termsRes.success && termsRes.result)
//                 (termsRes.result as FeeTerm[]).forEach(t => { termMap[t._id] = t.name })
//             } catch (e) { console.error(`[StudentDetail] terms fetch for ${year}:`, e) }
//           }))
//           setFeeTermsMap(termMap)
//         }
//       } else {
//         console.error('[StudentDetail] Failed to fetch fees:', feesRes.message)
//       }

//       const receiptsRes = await feeReceiptApi.getByStudent(studentId)
//       if (receiptsRes.success && receiptsRes.result) setFeeReceipts(receiptsRes.result as FeeReceipt[])
//       else console.error('[StudentDetail] Failed to fetch receipts:', receiptsRes.message)
//     } catch (err) {
//       console.error('[StudentDetail] fetchFees error:', err)
//     } finally {
//       fetchedRef.current = true
//       setLoading(false)
//     }
//   }, [studentId])

//   // Clean refresh — used after payment or structure update
//   const refreshFees = useCallback(async () => {
//     setFees([])
//     setFeeReceipts([])
//     await fetchFees(true)
//   }, [fetchFees])

//   return { fees, feeReceipts, feeTermsMap, selectedYear, setSelectedYear, loading, fetchFees, refreshFees }
// }