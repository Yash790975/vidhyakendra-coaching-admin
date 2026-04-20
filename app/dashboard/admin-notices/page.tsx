'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Search,
  ArrowLeft,
  Bell,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { superAdminNoticesApi } from '@/lib/api/superadmin'
import type { SuperAdminNotice } from '@/lib/api/superadmin'
import { IMAGE_BASE_URL } from '@/lib/api/config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveDocUrl(docUrl: string): string {
  if (!docUrl) return ''
  if (/^https?:\/\//i.test(docUrl)) return docUrl
  // Ensure no double slash
  const base = IMAGE_BASE_URL.replace(/\/$/, '')
  const path = docUrl.startsWith('/') ? docUrl : `/${docUrl}`
  return `${base}${path}`
}

/**
 * Opens attachment: PDFs open in new tab, other files trigger download.
 */
function handleAttachmentOpen(docUrl: string, title: string): void {
  const fullUrl = resolveDocUrl(docUrl)
  if (!fullUrl) return

  const isPdf = /\.pdf(\?.*)?$/i.test(fullUrl)

  if (isPdf) {
    // Open PDF in new tab for inline viewing
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  } else {
    // Trigger download for images and other file types
    const anchor = document.createElement('a')
    anchor.href = fullUrl
    anchor.download = title || 'attachment'
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }
}

const ITEMS_PER_PAGE = 10

// ─── Color Helpers ─────────────────────────────────────────────────────────────

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-600 text-white'
    case 'high':
      return 'bg-orange-500 text-white'
    case 'medium':
      return 'bg-blue-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'academic':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'event':
      return 'border-teal-200 bg-teal-50 text-teal-700'
    case 'announcement':
      return 'border-green-200 bg-green-50 text-green-700'
    case 'news':
      return 'border-purple-200 bg-purple-50 text-purple-700'
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700'
  }
}

function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', options ?? {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function getCreatedByName(createdBy: SuperAdminNotice['createdBy']): string {
  if (typeof createdBy === 'object' && createdBy !== null && 'name' in createdBy) {
    return createdBy.name
  }
  return 'Super Admin'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<SuperAdminNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewNotice, setViewNotice] = useState<SuperAdminNotice | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // ── Fetch published notices ─────────────────────────────────────────────────
  const fetchNotices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await superAdminNoticesApi.getPublished()
      if (!res.success) {
        const msg = res.message || 'Failed to load announcements.'
        console.error('[AdminNoticesPage] API returned failure:', msg)
        setError(msg)
        return
      }
      const data = Array.isArray(res.result) ? res.result : []
      console.log('[AdminNoticesPage] Notices fetched successfully. Count:', data.length)
      setNotices(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      console.error('[AdminNoticesPage] Fetch error:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotices()
  }, [fetchNotices])

  // ── Client-side search filter ───────────────────────────────────────────────
  const filteredNotices = notices.filter(
    (notice) =>
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredNotices.length / ITEMS_PER_PAGE)
  const paginatedNotices = filteredNotices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Announcements</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Important notices from super admin for all institute administrators
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-[#1897C6] mb-4" />
            <p className="text-muted-foreground">Loading announcements...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
            <div>
              <p className="font-semibold text-red-700">Unable to load announcements</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <Button
              variant="outline"
              className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
              onClick={fetchNotices}
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notices List */}
      {!loading && !error && (
        <div className="space-y-3">
          {paginatedNotices.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No announcements match your search.' : 'No announcements available.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedNotices.map((notice) => (
              <Card
                key={notice._id}
                className={`group cursor-pointer border-2 transition-all hover:shadow-lg hover:border-[#1897C6]/50 ${
                  notice.isPinned ? 'border-amber-200 bg-amber-50/30' : ''
                }`}
                onClick={() => setViewNotice(notice)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start gap-2">
                        {notice.isPinned && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 mt-0.5">
                            <Bell className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-base sm:text-lg group-hover:text-[#1897C6] transition-colors leading-snug mb-2">
                            {notice.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {notice.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getCategoryColor(notice.category)}`}>
                          {notice.category}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(notice.priority)}`}>
                          {notice.priority}
                        </Badge>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground ml-auto">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span suppressHydrationWarning>
                              {formatDate(notice.publishDate)}
                            </span>
                          </div>
                          {notice.docUrl && (
                            <Badge variant="secondary" className="text-xs">
                              <Download className="h-3 w-3 mr-1" />
                              Attachment
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredNotices.length)} of{' '}
                {filteredNotices.length} announcements
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Notice Dialog */}
      <Dialog open={!!viewNotice} onOpenChange={() => setViewNotice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewNotice && (
            <>
              <DialogHeader className="border-b pb-4">
                <DialogDescription className="sr-only">
                  Notice details
                </DialogDescription>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DialogTitle className="text-xl sm:text-2xl font-bold">
                        {viewNotice.title}
                      </DialogTitle>
                      {viewNotice.isPinned && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500">
                          <Bell className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm text-muted-foreground">
                      <span>Posted by {getCreatedByName(viewNotice.createdBy)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span suppressHydrationWarning>
                          {formatDate(viewNotice.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={`text-sm ${getCategoryColor(viewNotice.category)}`}>
                    {viewNotice.category}
                  </Badge>
                  <Badge className={`text-sm ${getPriorityColor(viewNotice.priority)}`}>
                    {viewNotice.priority}
                  </Badge>
                </div>

                {/* Content */}
                <Card className="border-2">
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-base">Announcement Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Summary</Label>
                        <p className="text-sm leading-relaxed">{viewNotice.content}</p>
                      </div>
                      {viewNotice.fullDescription && (
                        <div className="pt-4 border-t">
                          <Label className="text-xs text-muted-foreground mb-1 block">Full Details</Label>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {viewNotice.fullDescription}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Expiry Date */}
                {viewNotice.expiryDate && (
                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Valid until:</span>
                        <span className="font-medium" suppressHydrationWarning>
                          {formatDate(viewNotice.expiryDate, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Attachment */}
                {viewNotice.docUrl && (
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <Button
                        className="w-full gap-2 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAttachmentOpen(viewNotice.docUrl!, viewNotice.title)}
                      >
                        <Download className="h-4 w-4" />
                        {/\.pdf(\?.*)?$/i.test(viewNotice.docUrl)
                          ? 'View / Download PDF'
                          : 'Download Attachment'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setViewNotice(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}