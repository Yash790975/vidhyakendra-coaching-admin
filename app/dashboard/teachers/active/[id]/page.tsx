'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'


export default function ActiveTeacherRootPage({
  params,
}: {
  params: Promise<{ id: string }>   
}) {
  const { id } = use(params)       
  const router = useRouter()

  useEffect(() => {
    if (id && id !== 'undefined') {
      router.replace(`/dashboard/teachers/active/${id}/overview`)
    } else {
      console.error('[ActiveTeacherRootPage] Invalid teacher id:', id)
      router.replace('/dashboard/teachers/active')
    }
  }, [id, router])

  return null
}
