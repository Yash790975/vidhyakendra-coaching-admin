'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Users,
  User,
  FileText,
  Bell,
  Pin,
  PinOff,
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { noticesApi, Notice } from '@/lib/api/notices'
import { IMAGE_BASE_URL } from '@/lib/api/config'

// ─── Helpers ────────────────────────────────────────────────────────────────

const getCategoryConfig = (category: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    urgent:   { label: 'Urgent',   className: 'bg-red-50 text-red-700 border-red-300' },
    academic: { label: 'Academic', className: 'bg-blue-50 text-blue-700 border-blue-300' },
    events:   { label: 'Events',   className: 'bg-purple-50 text-purple-700 border-purple-300' },
    news:     { label: 'News',     className: 'bg-green-50 text-green-700 border-green-300' },
  }
  return configs[category] || { label: category, className: 'bg-gray-50 text-gray-700 border-gray-300' }
}

const getAudienceLabel = (audience: Notice['audience']) => {
  if (audience.type === 'all')              return 'All'
  if (audience.type === 'teachers')         return 'Teachers'
  if (audience.type === 'students')         return 'Students'
  if (audience.type === 'specific-classes') return `${audience.classIds?.length || 0} Classes`
  if (audience.type === 'specific-users')   return 'Specific Users'
  return audience.type
}

/** Read auth info from localStorage (set by admin.ts login flow) */
const getAuthInfo = () => {
  if (typeof window === 'undefined') return { instituteId: '', adminId: '' }
  return {
    instituteId: localStorage.getItem('instituteId') || '',
    adminId:     localStorage.getItem('adminId')     || '',
  }
}

/** Build absolute file URL using IMAGE_BASE_URL from config */
const getFileUrl = (docUrl: string | null | undefined): string | null => {
  if (!docUrl) return null
  if (docUrl.startsWith('http')) return docUrl
  return `${IMAGE_BASE_URL}${docUrl}`
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
}

const CONFIRM_DIALOG_CLOSED: ConfirmDialogState = {
  open: false,
  title: '',
  description: '',
  onConfirm: () => {},
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NoticesPage() {
  const router = useRouter()

  const [searchQuery,      setSearchQuery]      = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus,   setSelectedStatus]   = useState<'published' | 'draft' | 'archived' | 'expired'>('published')
  const [viewNotice,       setViewNotice]        = useState<Notice | null>(null)
  const [currentPage,      setCurrentPage]       = useState(1)
  const itemsPerPage = 10

  // API state
  const [notices,       setNotices]       = useState<Notice[]>([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [actionError,   setActionError]   = useState<string | null>(null)

  // Confirmation dialog (replaces all browser confirm() / alert() calls)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(CONFIRM_DIALOG_CLOSED)

  const { instituteId } = getAuthInfo()

  // ─── Fetch Notices ─────────────────────────────────────────────────────────

  const fetchNotices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      let response

      if (selectedStatus === 'expired') {
        response = await noticesApi.getExpired({
          instituteId: instituteId || undefined,
          category:    selectedCategory !== 'all' ? selectedCategory : undefined,
        })
      } else {
        response = await noticesApi.getAll({
          instituteId: instituteId || undefined,
          status:      selectedStatus,
          category:    selectedCategory !== 'all' ? selectedCategory : undefined,
        })
      }

      if (response.success && response.result) {
        setNotices(response.result as Notice[])
      } else {
        console.error('[Notices] fetchNotices failed:', response.message)
        setError(response.message || 'Failed to load notices. Please try again.')
        setNotices([])
      }
    } catch (err) {
      console.error('[Notices] fetchNotices network error:', err)
      setError('Network error. Please check your connection and try again.')
      setNotices([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedStatus, selectedCategory, instituteId])

  useEffect(() => {
    fetchNotices()
    setCurrentPage(1)
  }, [fetchNotices])

  // ─── Stats counts (fetched separately) ────────────────────────────────────

  const [counts, setCounts] = useState({ published: 0, draft: 0, archived: 0, expired: 0, pinned: 0 })

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [pubRes, draftRes, archRes, expRes] = await Promise.all([
          noticesApi.getAll({ instituteId: instituteId || undefined, status: 'published' }),
          noticesApi.getAll({ instituteId: instituteId || undefined, status: 'draft' }),
          noticesApi.getAll({ instituteId: instituteId || undefined, status: 'archived' }),
          noticesApi.getExpired({ instituteId: instituteId || undefined }),
        ])

        const pub   = (pubRes.result   as Notice[] | undefined) || []
        const draft = (draftRes.result as Notice[] | undefined) || []
        const arch  = (archRes.result  as Notice[] | undefined) || []
        const exp   = (expRes.result   as Notice[] | undefined) || []

        setCounts({
          published: pub.length,
          draft:     draft.length,
          archived:  arch.length,
          expired:   exp.length,
          pinned:    [...pub, ...draft].filter(n => n.isPinned).length,
        })
      } catch (err) {
        // Silent fail for counts — not critical for page function
        console.error('[Notices] fetchCounts error:', err)
      }
    }
    fetchCounts()
  }, [instituteId])

  // ─── Actions ──────────────────────────────────────────────────────────────

  const showActionError = (msg: string) => {
    setActionError(msg)
    // Auto-clear after 5 seconds
    setTimeout(() => setActionError(null), 5000)
  }

  const handleDelete = (id: string) => {
    setConfirmDialog({
      open:         true,
      title:        'Delete Notice',
      description:  'Are you sure you want to delete this notice? This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm:    async () => {
        setConfirmDialog(CONFIRM_DIALOG_CLOSED)
        setActionLoading(id + '-delete')
        try {
          const res = await noticesApi.delete(id)
          if (res.success) {
            setNotices(prev => prev.filter(n => n._id !== id))
            setCounts(prev => ({ ...prev, published: Math.max(0, prev.published - 1) }))
          } else {
            console.error('[Notices] handleDelete failed:', res.message)
            showActionError(res.message || 'Failed to delete notice. Please try again.')
          }
        } catch (err) {
          console.error('[Notices] handleDelete error:', err)
          showActionError('Network error. Failed to delete notice.')
        } finally {
          setActionLoading(null)
        }
      },
    })
  }

  const handleArchive = async (id: string) => {
    setActionLoading(id + '-archive')
    try {
      const res = await noticesApi.archive(id)
      if (res.success) {
        setNotices(prev => prev.filter(n => n._id !== id))
      } else {
        console.error('[Notices] handleArchive failed:', res.message)
        showActionError(res.message || 'Failed to archive notice. Please try again.')
      }
    } catch (err) {
      console.error('[Notices] handleArchive error:', err)
      showActionError('Network error. Failed to archive notice.')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePublish = async (id: string) => {
    setActionLoading(id + '-publish')
    try {
      const res = await noticesApi.publish(id)
      if (res.success) {
        setNotices(prev => prev.filter(n => n._id !== id))
      } else {
        console.error('[Notices] handlePublish failed:', res.message)
        showActionError(res.message || 'Failed to publish notice. Please try again.')
      }
    } catch (err) {
      console.error('[Notices] handlePublish error:', err)
      showActionError('Network error. Failed to publish notice.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTogglePin = async (notice: Notice) => {
    setActionLoading(notice._id + '-pin')
    try {
      const res = await noticesApi.update(notice._id, { isPinned: !notice.isPinned })
      if (res.success && res.result) {
        setNotices(prev => prev.map(n => n._id === notice._id ? (res.result as Notice) : n))
      } else {
        console.error('[Notices] handleTogglePin failed:', res.message)
        showActionError(res.message || 'Failed to update pin status. Please try again.')
      }
    } catch (err) {
      console.error('[Notices] handleTogglePin error:', err)
      showActionError('Network error. Failed to update pin status.')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Filtered + Paginated ─────────────────────────────────────────────────

  const filteredNotices = notices
    .filter(n => {
      if (!searchQuery) return true
      return (
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    })

  const totalPages       = Math.ceil(filteredNotices.length / itemsPerPage)
  const paginatedNotices = filteredNotices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getCreatedByName = (notice: Notice) => {
    if (typeof notice.createdBy === 'object' && notice.createdBy !== null) {
      return (notice.createdBy as Record<string, unknown>).name as string || notice.createdByRole
    }
    return notice.createdByRole
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1897C6] to-[#67BAC3] bg-clip-text text-transparent">
            Notices &amp; Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage institute notices, events, and announcements
          </p>
        </div>
        <Link href="/dashboard/notices/create">
          <Button className="w-full sm:w-auto gap-2 bg-gradient-to-r from-[#1897C6] to-[#67BAC3] hover:from-[#1897C6]/90 hover:to-[#67BAC3]/90">
            <Plus className="h-4 w-4" />
            <span>Create Notice</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white">
                <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{counts.published}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{counts.draft}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
                <Pin className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{counts.pinned}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Pinned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                <Archive className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{counts.archived}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Archived</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-2">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <Tabs
              value={selectedStatus}
              onValueChange={(v) => setSelectedStatus(v as typeof selectedStatus)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="published" className="text-xs sm:text-sm">
                  Published ({counts.published})
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs sm:text-sm">
                  Drafts ({counts.draft})
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-xs sm:text-sm">
                  Archived ({counts.archived})
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-xs sm:text-sm">
                  Expired ({counts.expired})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search notices by title or content..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className={selectedCategory === 'all' ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3]' : ''}
                >
                  All
                </Button>
                {['urgent', 'academic', 'events', 'news'].map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className={
                      selectedCategory === cat
                        ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] whitespace-nowrap'
                        : 'whitespace-nowrap'
                    }
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fetch error */}
      {error && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Action error (inline, replaces browser alert) */}
      {actionError && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-2 text-orange-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {actionError}
          </CardContent>
        </Card>
      )}

      {/* Notices Table — Desktop */}
      <Card className="border-2 hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 hover:from-[#1897C6]/5 hover:to-[#67BAC3]/5">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Audience</TableHead>
                <TableHead className="font-semibold">Publish Date</TableHead>
                <TableHead className="font-semibold">Expiry Date</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedNotices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No notices found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedNotices.map((notice) => {
                  const categoryConfig = getCategoryConfig(notice.category)
                  const isActioning    = actionLoading?.startsWith(notice._id)

                  return (
                    <TableRow
                      key={notice._id}
                      className="hover:bg-gradient-to-r hover:from-[#1897C6]/5 hover:to-transparent"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-start gap-2">
                          {notice.isPinned && (
                            <Pin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{notice.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{notice.content}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`${categoryConfig.className} text-xs w-fit`}>
                          {categoryConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{getAudienceLabel(notice.audience)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {notice.publishDate ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span suppressHydrationWarning>
                              {new Date(notice.publishDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {notice.expiryDate ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span suppressHydrationWarning>
                              {new Date(notice.expiryDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#1897C6]/10 hover:text-[#1897C6]"
                            onClick={() => setViewNotice(notice)}
                            disabled={!!isActioning}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Link href={`/dashboard/notices/create?edit=${notice._id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-[#F1AF37]/10 hover:text-[#F1AF37]"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={!!isActioning}
                              >
                                {isActioning
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <MoreVertical className="h-4 w-4" />
                                }
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {notice.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handlePublish(notice._id)}>
                                  <Bell className="mr-2 h-4 w-4" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleTogglePin(notice)}>
                                {notice.isPinned ? (
                                  <><PinOff className="mr-2 h-4 w-4" /> Unpin</>
                                ) : (
                                  <><Pin className="mr-2 h-4 w-4" /> Pin</>
                                )}
                              </DropdownMenuItem>
                              {notice.docUrl && (
                                <DropdownMenuItem
                                  onClick={() => window.open(getFileUrl(notice.docUrl) || '', '_blank')}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Download Attachment
                                </DropdownMenuItem>
                              )}
                              {notice.status !== 'archived' && (
                                <DropdownMenuItem onClick={() => handleArchive(notice._id)}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(notice._id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notices Cards — Mobile */}
      <div className="space-y-3 md:hidden">
        {isLoading ? (
          <Card className="border-2">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </CardContent>
          </Card>
        ) : paginatedNotices.length === 0 ? (
          <Card className="border-2">
            <CardContent className="p-8 text-center text-muted-foreground">
              No notices found
            </CardContent>
          </Card>
        ) : (
          paginatedNotices.map((notice) => {
            const categoryConfig = getCategoryConfig(notice.category)
            const isActioning    = actionLoading?.startsWith(notice._id)

            return (
              <Card key={notice._id} className="border-2">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {notice.isPinned && (
                          <Pin className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <h3 className="font-semibold text-sm line-clamp-1">{notice.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          disabled={!!isActioning}
                        >
                          {isActioning
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <MoreVertical className="h-4 w-4" />
                          }
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewNotice(notice)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/notices/create?edit=${notice._id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {notice.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handlePublish(notice._id)}>
                            <Bell className="mr-2 h-4 w-4" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleTogglePin(notice)}>
                          {notice.isPinned ? (
                            <><PinOff className="mr-2 h-4 w-4" /> Unpin</>
                          ) : (
                            <><Pin className="mr-2 h-4 w-4" /> Pin</>
                          )}
                        </DropdownMenuItem>
                        {notice.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => handleArchive(notice._id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(notice._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${categoryConfig.className} text-xs`}>
                      {categoryConfig.label}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{getAudienceLabel(notice.audience)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {notice.publishDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span suppressHydrationWarning>
                          {new Date(notice.publishDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {notice.expiryDate && (
                      <div className="flex items-center gap-1">
                        <span>→</span>
                        <span suppressHydrationWarning>
                          {new Date(notice.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredNotices.length)} of{' '}
                {filteredNotices.length} notices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Confirmation Dialog (replaces browser confirm) ─── */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog(CONFIRM_DIALOG_CLOSED)}
      >
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(CONFIRM_DIALOG_CLOSED)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDialog.onConfirm}
            >
              {confirmDialog.confirmLabel || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Notice Dialog ─── */}
<Dialog open={!!viewNotice} onOpenChange={() => setViewNotice(null)}>
  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          {viewNotice && (
            <>
              <DialogHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DialogTitle className="text-xl sm:text-2xl font-bold">
                        {viewNotice.title}
                      </DialogTitle>
                      {viewNotice.isPinned && (
                        <Pin className="h-5 w-5 text-red-500 fill-red-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{getCreatedByName(viewNotice)}</span>
                      </div>
                      <span>•</span>
                      {viewNotice.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span suppressHydrationWarning>
                            {new Date(viewNotice.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <span>•</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {viewNotice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={`${getCategoryConfig(viewNotice.category).className} text-xs sm:text-sm px-2.5 py-1`}
                  >
                    {getCategoryConfig(viewNotice.category).label}
                  </Badge>
                  <Badge variant="outline" className="text-xs sm:text-sm px-2.5 py-1">
                    <Users className="h-3 w-3 mr-1" />
                    {getAudienceLabel(viewNotice.audience)}
                  </Badge>
                </div>

                {/* Content */}
                <Card className="border-2">
                  <CardHeader className="bg-gradient-to-r from-[#1897C6]/5 to-[#67BAC3]/5 pb-3">
                    <CardTitle className="text-base">Notice Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Summary</Label>
                        <p className="text-sm leading-relaxed">{viewNotice.content}</p>
                      </div>
                      {viewNotice.fullDescription && (
                        <div className="pt-4 border-t">
                          <Label className="text-xs text-muted-foreground mb-1 block">Full Description</Label>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {viewNotice.fullDescription}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Schedule */}
                <Card className="border-2">
                  <CardHeader className="bg-gradient-to-r from-[#F1AF37]/5 to-[#D88931]/5 pb-3">
                    <CardTitle className="text-base">Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Publish Date</Label>
                          <p className="font-semibold text-sm" suppressHydrationWarning>
                            {viewNotice.publishDate
                              ? new Date(viewNotice.publishDate).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })
                              : 'Not set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                          <p className="font-semibold text-sm" suppressHydrationWarning>
                            {viewNotice.expiryDate
                              ? new Date(viewNotice.expiryDate).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })
                              : 'No expiry'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Attachment */}
                {viewNotice.docUrl && (
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <Button
                        className="w-full gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                        onClick={() => window.open(getFileUrl(viewNotice.docUrl) || '', '_blank')}
                      >
                        <FileText className="h-4 w-4" />
                        Download Attachment
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setViewNotice(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-[#1897C6] to-[#67BAC3]"
                  onClick={() => {
                    setViewNotice(null)
                    router.push(`/dashboard/notices/create?edit=${viewNotice._id}`)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Notice
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}