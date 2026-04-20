// app/dashboard/teachers/add/page.tsx
import { Suspense } from 'react'
import AddTeacherClient from './AddTeacherClient'

export default function AddTeacherPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
      <AddTeacherClient />
    </Suspense>
  )
}