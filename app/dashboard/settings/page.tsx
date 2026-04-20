'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  UserPlus,
  Trash2,
  Eye,
  CheckCircle,
  Users,
  Loader2,
  Pencil,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Globe,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pagination } from '@/components/pagination'
import {
  settingsApi,
  getPlanName,
  type InstituteSettingsData,
  type InstituteAdmin,
  type CreateAdminPayload,
  type UpdateAdminPayload,
} from '@/lib/api/settings'

// ─── Inline alert component (replaces alert() / confirm()) ───────────────────
function InlineAlert({
  message,
  type = 'error',
}: {
  message: string
  type?: 'error' | 'success'
}) {
  if (!message) return null
  return (
    <div
      className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
        type === 'error'
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-green-50 text-green-700 border border-green-200'
      }`}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ─── Payment status badge colors ──────────────────────────────────────────────
// Backend enum: 'success' | 'failed' | 'refunded'
function paymentStatusStyle(status?: string) {
  switch (status) {
    case 'success':  return 'border-green-600 text-green-600 bg-green-50'
    case 'failed':   return 'border-red-600 text-red-600 bg-red-50'
    case 'refunded': return 'border-yellow-600 text-yellow-600 bg-yellow-50'
    default:         return 'border-gray-400 text-gray-500'
  }
}

// ─── Institute status badge colors ────────────────────────────────────────────
// Backend enum: 'pending_activation' | 'trial' | 'active' | 'suspended' | 'blocked' | 'expired' | 'archived'
function instituteStatusStyle(status?: string) {
  switch (status) {
    case 'active':  return 'border-green-600 text-green-600 bg-green-50'
    case 'trial':   return 'border-blue-500 text-blue-600 bg-blue-50'
    case 'suspended':
    case 'blocked': return 'border-red-600 text-red-600 bg-red-50'
    case 'expired':
    case 'archived': return 'border-gray-400 text-gray-500 bg-gray-50'
    default:        return 'border-yellow-600 text-yellow-600 bg-yellow-50'
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('institute')
  const [addAdminOpen, setAddAdminOpen]   = useState(false)
  const [viewAdminOpen, setViewAdminOpen] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<InstituteAdmin | null>(null)
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null)

  // ── Edit admin state ─────────────────────────────────────────────────────
  const [editAdminOpen, setEditAdminOpen]   = useState(false)
  const [editingAdmin, setEditingAdmin]     = useState<InstituteAdmin | null>(null)
  const [updatingAdmin, setUpdatingAdmin]   = useState(false)
  const [editError, setEditError]           = useState('')
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    mobile: '',
    status: 'active' as 'active' | 'blocked' | 'disabled',
  })

  // ── Loading / error state ────────────────────────────────────────────────
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState('')
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [addingAdmin, setAddingAdmin]   = useState(false)
  const [addError, setAddError]         = useState('')
  const [deleteError, setDeleteError]   = useState('')

  // ── Institute data ───────────────────────────────────────────────────────
  const [instituteData, setInstituteData] = useState<InstituteSettingsData>({
    logo_url: null,
    master: null,
    basic_info: null,
    details: null,
    subscription: null,
  })

  // ── Admins ───────────────────────────────────────────────────────────────
  const [admins, setAdmins] = useState<InstituteAdmin[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 5

  // ── Fetch on mount ───────────────────────────────────────────────────────
  const fetchInstituteData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError('')
      const data = await settingsApi.getInstituteData()
      setInstituteData(data)
    } catch (err) {
      console.error('[Settings] Failed to fetch institute data:', err)
      setLoadError('Failed to load institute information. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAdmins = useCallback(async () => {
    try {
      setAdminsLoading(true)
      setDeleteError('')
      const res = await settingsApi.getAdminsByInstitute()
      if (res.success && res.result) {
        const data = res.result
        if (Array.isArray(data)) {
          setAdmins(data)
        } else if (data && typeof data === 'object') {
          // Guard: if backend returns single object instead of array
          setAdmins([data as InstituteAdmin])
        } else {
          setAdmins([])
        }
      } else {
        setAdmins([])
        console.warn('[Settings] getAdminsByInstitute returned no result:', res.message)
      }
    } catch (err) {
      console.error('[Settings] Failed to fetch admins:', err)
      setAdmins([])
    } finally {
      setAdminsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInstituteData()
    fetchAdmins()
  }, [fetchInstituteData, fetchAdmins])

  // ── New admin form state ─────────────────────────────────────────────────
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', mobile: '' })

  const handleAddAdmin = async () => {
    setAddError('')

    // Client-side validation
    if (!newAdmin.name.trim()) {
      setAddError('Full name is required.')
      return
    }
    if (!newAdmin.email.trim()) {
      setAddError('Email address is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdmin.email)) {
      setAddError('Please enter a valid email address.')
      return
    }
    // Backend validates: exactly 10 digits
    if (!/^[0-9]{10}$/.test(newAdmin.mobile)) {
      setAddError('Mobile number must be exactly 10 digits.')
      return
    }

    try {
      setAddingAdmin(true)
      const instituteId = localStorage.getItem('instituteId') || ''
      if (!instituteId) {
        setAddError('Institute session not found. Please log in again.')
        return
      }

      // Only schema-valid fields sent — no password, role, or permissions
      const payload: CreateAdminPayload = {
        institute_id: instituteId,
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        mobile: newAdmin.mobile.trim(),
        status: 'active',
      }

      const res = await settingsApi.createAdmin(payload)
      if (res.success) {
        console.info('[Settings] Admin created successfully')
        await fetchAdmins()
        setNewAdmin({ name: '', email: '', mobile: '' })
        setAddAdminOpen(false)
      } else {
        console.warn('[Settings] createAdmin failed:', res.message)
        setAddError(res.message || 'Failed to add admin. Please try again.')
      }
    } catch (err) {
      console.error('[Settings] Error adding admin:', err)
      setAddError('An unexpected error occurred. Please try again.')
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleDeleteAdmin = async (id: string) => {
    setDeleteError('')
    try {
      const res = await settingsApi.deleteAdmin(id)
      if (res.success) {
        console.info('[Settings] Admin deleted:', id)
        await fetchAdmins()
      } else {
        console.warn('[Settings] deleteAdmin failed:', res.message)
        setDeleteError(res.message || 'Failed to delete admin. Please try again.')
      }
    } catch (err) {
      console.error('[Settings] Error deleting admin:', err)
      setDeleteError('An unexpected error occurred while deleting. Please try again.')
    } finally {
      setDeleteAdminId(null)
    }
  }

  const handleViewAdmin = (admin: InstituteAdmin) => {
    setSelectedAdmin(admin)
    setViewAdminOpen(true)
  }

  // ── Edit handlers ────────────────────────────────────────────────────────
  const handleEditAdmin = (admin: InstituteAdmin) => {
    setEditingAdmin(admin)
    setEditError('')
    setEditForm({
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      status: admin.status,
    })
    setEditAdminOpen(true)
  }

  const handleUpdateAdmin = async () => {
    setEditError('')
    if (!editingAdmin) return

    if (!editForm.name.trim()) {
      setEditError('Full name is required.')
      return
    }
    if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      setEditError('Please enter a valid email address.')
      return
    }
    if (!/^[0-9]{10}$/.test(editForm.mobile)) {
      setEditError('Mobile number must be exactly 10 digits.')
      return
    }

    try {
      setUpdatingAdmin(true)
      const payload: UpdateAdminPayload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        mobile: editForm.mobile.trim(),
        status: editForm.status,
      }
      const res = await settingsApi.updateAdmin(editingAdmin._id, payload)
      if (res.success) {
        console.info('[Settings] Admin updated:', editingAdmin._id)
        const loggedInAdminId = typeof window !== 'undefined'
          ? localStorage.getItem('adminId') : null
        if (loggedInAdminId && editingAdmin._id === loggedInAdminId) {
          localStorage.setItem('adminName', editForm.name.trim())
          localStorage.setItem('adminEmail', editForm.email.trim())
          window.dispatchEvent(new Event('admin-profile-updated'))
        }

        await fetchAdmins()
        setEditAdminOpen(false)
        setEditingAdmin(null)
      } else {
        console.warn('[Settings] updateAdmin failed:', res.message)
        setEditError(res.message || 'Failed to update admin. Please try again.')
      }
    } catch (err) {
      console.error('[Settings] Error updating admin:', err)
      setEditError('An unexpected error occurred. Please try again.')
    } finally {
      setUpdatingAdmin(false)
    }
  }

  // ── Destructure for convenience ──────────────────────────────────────────
  const { master, basic_info, details, subscription } = instituteData

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading institute profile...</span>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-base font-medium text-foreground">Failed to load profile</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button onClick={fetchInstituteData} variant="outline">Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Institute Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your institute profile and admin accounts
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger value="institute" className="text-sm py-2.5">
              <Building2 className="h-4 w-4 mr-2" />
              Institute Details
            </TabsTrigger>
            <TabsTrigger value="admins" className="text-sm py-2.5">
              <Users className="h-4 w-4 mr-2" />
              Admin Management
            </TabsTrigger>
          </TabsList>

          {/* ── Institute Details Tab ──────────────────────────────────────── */}
          <TabsContent value="institute" className="space-y-6">

            {/* Basic Information */}
            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                    <CardDescription>Your institute's primary details</CardDescription>
                  </div>
                  {/* status — from institutes_master */}
                  <Badge
                    variant="outline"
                    className={instituteStatusStyle(master?.status)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {(master?.status ?? '—').replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* institute_name — institutes_master */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Institute Name
                    </div>
                    <p className="text-base font-semibold">{master?.institute_name ?? '—'}</p>
                  </div>

                  {/* institute_code — institutes_master */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      Institute Code
                    </div>
                    <p className="text-base font-mono font-semibold text-[#1897C6]">
                      {master?.institute_code ?? '—'}
                    </p>
                  </div>

                  {/* owner_name, designation — institute_basic_information */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <User className="h-4 w-4" />
                      Owner / Principal
                    </div>
                    <p className="text-base font-semibold">{basic_info?.owner_name ?? '—'}</p>
                    {basic_info?.designation && (
                      <p className="text-sm text-muted-foreground">{basic_info.designation}</p>
                    )}
                  </div>

                  {/* email, email_verified — institute_basic_information */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </div>
                    {/* Responsive wrap for long email addresses */}
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base break-all">{basic_info?.email ?? '—'}</p>
                      {basic_info?.email_verified && (
                        <Badge variant="outline" className="border-green-600 text-green-600 bg-green-50 shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* mobile, mobile_verified — institute_basic_information */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Primary Mobile
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base">{basic_info?.mobile ?? '—'}</p>
                      {basic_info?.mobile_verified && (
                        <Badge variant="outline" className="border-green-600 text-green-600 bg-green-50 shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* institute_type — institutes_master */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Institute Type
                    </div>
                    <p className="text-base font-semibold capitalize">
                      {master?.institute_type ?? '—'}
                    </p>
                  </div>

                  {/* createdAt — institutes_master (used as "Registered On") */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Registered On
                    </div>
                    <p className="text-base">
                      {master?.createdAt
                        ? new Date(master.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>

                  {/* address — institute_basic_information */}
                  {basic_info?.address && (
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Address
                      </div>
                      <p className="text-base">{basic_info.address}</p>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>

            {/* Academic Details */}
            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg">Academic Details</CardTitle>
                <CardDescription>Educational specifications</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* school_board — only for school or both institute types */}
                  {(master?.institute_type === 'school' || master?.institute_type === 'both') && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        School Board
                      </div>
                      {details?.school_board ? (
                        <Badge variant="outline" className="border-[#1897C6] text-[#1897C6] font-semibold">
                          {details.school_board}
                        </Badge>
                      ) : (
                        <p className="text-base text-muted-foreground">Not specified</p>
                      )}
                    </div>
                  )}

                  {/* school_type — only for school or both institute types */}
                  {(master?.institute_type === 'school' || master?.institute_type === 'both') && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        School Type
                      </div>
                      <p className="text-base font-semibold capitalize">
                        {details?.school_type ?? '—'}
                      </p>
                    </div>
                  )}

                  {/* medium — institute_details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      Medium of Instruction
                    </div>
                    <p className="text-base font-semibold capitalize">
                      {details?.medium ?? '—'}
                    </p>
                  </div>

                  {/* approx_students_range — institute_details */}
                  {/* Backend enum: '1-100' | '101-250' | '251-500' | '500-1000' | '1000+' */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Student Range
                    </div>
                    <p className="text-base font-semibold">
                      {details?.approx_students_range
                        ? `${details.approx_students_range} students`
                        : '—'}
                    </p>
                  </div>

                  {/* classes_offered — institute_details */}
                  {Array.isArray(details?.classes_offered) && details.classes_offered.length > 0 && (
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        Classes Offered
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {details.classes_offered.map((cls) => (
                          <Badge key={cls} variant="outline" className="border-2">
                            {cls}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* courses_offered — institute_details */}
                  {Array.isArray(details?.courses_offered) && details.courses_offered.length > 0 && (
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        Courses Offered
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {details.courses_offered.map((course) => (
                          <Badge key={course} variant="outline" className="border-[#1897C6] text-[#1897C6]">
                            {course}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>

            {/* Subscription Details */}
            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg">Subscription Details</CardTitle>
                <CardDescription>Your current subscription plan and status</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!subscription ? (
                  <p className="text-sm text-muted-foreground">No subscription found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/*
                      Plan name — derived from subscription_plan_variant_id.applicable_for
                      Guards against unpopulated ObjectId (string) — getPlanName handles both
                    */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Plan</div>
                      <Badge className="bg-[#1897C6] text-white">
                        {getPlanName(subscription.subscription_plan_variant_id)}
                      </Badge>
                    </div>

                    {/* subscription_start_date — institute_subscription_transactions */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Start Date</div>
                      <p className="text-base font-semibold">
                        {subscription.subscription_start_date
                          ? new Date(subscription.subscription_start_date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>

                    {/* subscription_end_date — institute_subscription_transactions */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">End Date</div>
                      <p className="text-base font-semibold">
                        {subscription.subscription_end_date
                          ? new Date(subscription.subscription_end_date).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>

                    {/* is_active — institute_subscription_transactions */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Status</div>
                      <Badge
                        variant="outline"
                        className={subscription.is_active
                          ? 'border-green-600 text-green-600 bg-green-50'
                          : 'border-red-600 text-red-600 bg-red-50'}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {subscription.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </div>

                    {/* amount — institute_subscription_transactions (Decimal128 → Number via toJSON) */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Amount Paid</div>
                      <p className="text-base font-semibold">
                        {subscription.amount != null
                          ? `₹${subscription.amount.toLocaleString('en-IN')}`
                          : '—'}
                      </p>
                    </div>

                    {/* payment_status — backend enum: 'success' | 'failed' | 'refunded' */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Payment Status</div>
                      <Badge variant="outline" className={paymentStatusStyle(subscription.payment_status)}>
                        {subscription.payment_status?.toUpperCase() ?? '—'}
                      </Badge>
                    </div>

                    {/* paid_at — institute_subscription_transactions */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Paid On</div>
                      <p className="text-base font-semibold">
                        {subscription.paid_at
                          ? new Date(subscription.paid_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>

                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Admin Management Tab ───────────────────────────────────────── */}
          <TabsContent value="admins" className="space-y-6">
            <Card className="border-2">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Admin Accounts</CardTitle>
                    <CardDescription>Manage administrators who can access the system</CardDescription>
                  </div>
                  <Button
                    onClick={() => { setAddError(''); setAddAdminOpen(true) }}
                    className="bg-[#1897C6] hover:bg-[#1897C6]/90"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">

                {/* Delete error shown above list */}
                {deleteError && (
                  <div className="mb-4">
                    <InlineAlert message={deleteError} type="error" />
                  </div>
                )}

                {adminsLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading admins...</span>
                  </div>
                ) : admins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Users className="h-10 w-10 opacity-30" />
                    <p className="text-sm">No admins found for this institute.</p>
                    <p className="text-xs">Click "Add Admin" to create one.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {admins.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((admin) => (
                      <Card key={admin._id} className="border-2 hover:border-[#1897C6] transition-all">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1897C6] text-white font-bold text-lg">
                                {admin.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* name — institute_admins */}
                                  <h3 className="font-semibold text-base">{admin.name}</h3>
                                  {/* status — institute_admins */}
                                  <Badge
                                    variant="outline"
                                    className={admin.status === 'active'
                                      ? 'border-green-600 text-green-600 bg-green-50'
                                      : 'border-red-600 text-red-600 bg-red-50'}
                                  >
                                    {admin.status}
                                  </Badge>
                                </div>
                                <div className="mt-2 space-y-1">
                                  {/* email — institute_admins */}
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{admin.email}</span>
                                  </div>
                                  {/* mobile — institute_admins */}
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 shrink-0" />
                                    {admin.mobile}
                                  </div>
                                  {/* last_login_at — institute_admins */}
                                  {admin.last_login_at && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                                      Last login: {new Date(admin.last_login_at).toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Button variant="outline" size="sm" onClick={() => handleViewAdmin(admin)}>
                                <Eye className="h-4 w-4 mr-1.5" />
                                View
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditAdmin(admin)}>
                                <Pencil className="h-4 w-4 mr-1.5" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteAdminId(admin._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {!adminsLoading && Math.ceil(admins.length / PAGE_SIZE) > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(admins.length / PAGE_SIZE)}
                    onPageChange={setCurrentPage}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
        <AlertDialog
          open={!!deleteAdminId}
          onOpenChange={(open) => { if (!open) setDeleteAdminId(null) }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this admin? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteAdminId && handleDeleteAdmin(deleteAdminId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Add Admin Dialog ──────────────────────────────────────────────── */}
        {/* Only schema-valid fields: name, email, mobile
            Removed: password (auto-generated by backend), role, permissions (not in schema) */}
        <Dialog
          open={addAdminOpen}
          onOpenChange={(open) => { if (!open) { setAddError(''); setAddAdminOpen(false) } }}
        >
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>
                Create a new admin account. A password will be automatically generated and sent to their email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">

              {addError && <InlineAlert message={addError} type="error" />}

              {/* name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                />
              </div>

              {/* email — responsive wrap added */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="w-full">
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* mobile — 10 digits, matches backend validation */}
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  placeholder="10-digit mobile number"
                  value={newAdmin.mobile}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
                  }
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Must be exactly 10 digits</p>
              </div>

            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setAddError(''); setAddAdminOpen(false) }}
                disabled={addingAdmin}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAdmin}
                className="bg-[#1897C6] hover:bg-[#1897C6]/90"
                disabled={addingAdmin}
              >
                {addingAdmin
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                  : 'Add Admin'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── View Admin Dialog ─────────────────────────────────────────────── */}
        <Dialog open={viewAdminOpen} onOpenChange={setViewAdminOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Admin Details</DialogTitle>
              <DialogDescription>Admin account information</DialogDescription>
            </DialogHeader>
            {selectedAdmin && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* name — institute_admins */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">{selectedAdmin.name}</p>
                  </div>

                  {/* status — institute_admins */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant="outline"
                      className={selectedAdmin.status === 'active'
                        ? 'border-green-600 text-green-600 bg-green-50'
                        : 'border-red-600 text-red-600 bg-red-50'}
                    >
                      {selectedAdmin.status}
                    </Badge>
                  </div>

                  {/* email — institute_admins */}
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold break-all">{selectedAdmin.email}</p>
                  </div>

                  {/* mobile — institute_admins */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Mobile</p>
                    <p className="font-semibold">{selectedAdmin.mobile}</p>
                  </div>

                  {/* is_first_login — institute_admins */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">First Login Pending</p>
                    <Badge
                      variant="outline"
                      className={selectedAdmin.is_first_login
                        ? 'border-yellow-600 text-yellow-600 bg-yellow-50'
                        : 'border-green-600 text-green-600 bg-green-50'}
                    >
                      {selectedAdmin.is_first_login ? 'Yes' : 'No'}
                    </Badge>
                  </div>

                  {/* last_login_at — institute_admins */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Login</p>
                    <p className="font-semibold">
                      {selectedAdmin.last_login_at
                        ? new Date(selectedAdmin.last_login_at).toLocaleString('en-IN')
                        : 'Never'}
                    </p>
                  </div>

                  {/* created_at — institute_admins (custom timestamp field) */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Created On</p>
                    <p className="font-semibold">
                      {selectedAdmin.created_at
                        ? new Date(selectedAdmin.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>

                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewAdminOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Admin Dialog ─────────────────────────────────────────────── */}
        <Dialog
          open={editAdminOpen}
          onOpenChange={(open) => { if (!open) { setEditError(''); setEditAdminOpen(false) } }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
              <DialogDescription>Update admin account details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">

              {editError && <InlineAlert message={editError} type="error" />}

              {/* name */}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter full name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              {/* email — wrapped for responsiveness */}
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address *</Label>
                <div className="w-full">
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* mobile */}
              <div className="space-y-2">
                <Label htmlFor="edit-mobile">Mobile Number *</Label>
                <Input
                  id="edit-mobile"
                  placeholder="10-digit mobile number"
                  value={editForm.mobile}
                  onChange={(e) =>
                    setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
                  }
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Must be exactly 10 digits</p>
              </div>

              {/* status — backend enum: 'active' | 'blocked' | 'disabled' */}
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, status: value as 'active' | 'blocked' | 'disabled' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setEditError(''); setEditAdminOpen(false) }}
                disabled={updatingAdmin}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateAdmin}
                className="bg-[#1897C6] hover:bg-[#1897C6]/90"
                disabled={updatingAdmin}
              >
                {updatingAdmin
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>
                  : 'Update Admin'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}