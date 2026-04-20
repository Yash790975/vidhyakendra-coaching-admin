'use client'

import { useState, useCallback, useRef } from 'react'
import { studentsApi, StudentAttendance } from '@/lib/api/students'

export function useAttendance(studentId: string) {
  const fetchedRef = useRef(false)
  const [attendance, setAttendance] = useState<StudentAttendance[]>([])
  const [loading,    setLoading]    = useState(false)

  const fetchAttendance = useCallback(async () => {
    if (!studentId || fetchedRef.current) return
    setLoading(true)
    try {
      const res = await studentsApi.getAttendanceByStudent(studentId)
      if (res.success && res.result) setAttendance(res.result)
    } catch (err) {
      console.error('Failed to fetch attendance records:', err)
    } finally {
      fetchedRef.current = true
      setLoading(false)
    }
  }, [studentId])

  return { attendance, loading, fetchAttendance }
}