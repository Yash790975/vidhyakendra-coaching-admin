import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import type { StudentFee } from '@/lib/api/fee'
import { IMAGE_BASE_URL } from '@/lib/api/config'

export function buildFileUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
  return `${base}${path}`
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function capitalize(s?: string | null): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return dateStr }
}

export function formatCurrency(amount?: number | null): string {
  if (amount == null) return '₹0'
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export function getTermLabel(term_id: string | null | undefined, feeTermsMap: Record<string, string>): string {
  if (!term_id) return 'Term'
  return feeTermsMap[term_id] ?? 'Term'
}

export function percentageToGrade(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

export function percentageToGpa(pct: number): number {
  if (pct >= 90) return 5
  if (pct >= 80) return 4
  if (pct >= 70) return 3
  if (pct >= 60) return 2
  if (pct >= 50) return 1
  return 0
}

export function getStatusBadge(status: StudentFee['status']) {
  const map: Record<string, { label: string; className: string }> = {
    paid:    { label: 'Paid',    className: 'bg-green-600 text-white' },
    partial: { label: 'Partial', className: 'bg-yellow-500 text-white' },
    pending: { label: 'Pending', className: 'bg-blue-500 text-white' },
    overdue: { label: 'Overdue', className: 'bg-red-600 text-white' },
  }
  const s = map[status] ?? { label: status, className: 'bg-gray-400 text-white' }
  return <Badge className={s.className}>{s.label}</Badge>
}

export function getAttendanceStatusIcon(status: string) {
  switch (status) {
    case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'absent':  return <XCircle className="h-4 w-4 text-red-600" />
    case 'leave':   return <AlertCircle className="h-4 w-4 text-sky-600" />
    default:        return <Clock className="h-4 w-4 text-orange-600" />
  }
}

export function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </CardContent>
    </Card>
  )
}

export function InfoItem({
  label, value, icon: Icon,
}: {
  label: string
  value?: string | null
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {Icon && <Icon className="h-4 w-4 text-[#1897C6] shrink-0" />}
        <p className="text-sm font-medium break-all">
          {value?.trim() ? value : <span className="text-muted-foreground italic">Not provided</span>}
        </p>
      </div>
    </div>
  )
}