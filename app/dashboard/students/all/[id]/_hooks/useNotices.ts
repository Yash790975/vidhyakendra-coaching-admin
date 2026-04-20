'use client'

import { useState, useCallback, useRef } from 'react'
import { noticesApi, Notice } from '@/lib/api/notices'

export function useNotices(studentId: string) {
  const fetchedRef = useRef(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotices = useCallback(async () => {
    if (!studentId || fetchedRef.current) return
    setLoading(true)
    try {
      const instituteId = typeof window !== 'undefined' ? (localStorage.getItem('instituteId') ?? '') : ''
      if (!instituteId) return
      const res = await noticesApi.getForStudent(studentId, instituteId)
      if (res.success && res.result)
        setNotices(res.result.filter((n: Notice) => n.status === 'published'))
    } catch (err) {
      console.error('[StudentDetail] fetchNotices error:', err)
    } finally {
      fetchedRef.current = true
      setLoading(false)
    }
  }, [studentId])

  return { notices, loading, fetchNotices }
}