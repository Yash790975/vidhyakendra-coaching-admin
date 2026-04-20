'use client'

import React from "react"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  UserPlus,
  UserCheck,
  UserX,
  BookOpen,
  FileText,
  Calendar
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { adminApi } from '@/lib/api/admin'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

const teachersSubNav = [
  { name: 'Onboarding', href: '/dashboard/teachers/onboarding', icon: UserPlus },
  { name: 'Active Teachers', href: '/dashboard/teachers/active', icon: UserCheck },
  { name: 'Inactive Teachers', href: '/dashboard/teachers/inactive', icon: UserX },
  { name: 'Attendance', href: '/dashboard/teachers/attendance', icon: Calendar },
  { name: 'Leave', href: '/dashboard/teachers/leave', icon: FileText },

]

const studentsSubNav = [
  { name: 'Onboarding', href: '/dashboard/students/onboarding', icon: UserPlus },
  { name: 'All Students', href: '/dashboard/students/all', icon: Users },
     { name: 'Inactive Students', href: '/dashboard/students/inactive', icon: UserX },
  { name: 'Class Wise', href: '/dashboard/students/class', icon: Users },

  { name: 'Attendance', href: '/dashboard/students/attendance', icon: Calendar },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [teachersOpen, setTeachersOpen] = useState(false)
  const [studentsOpen, setStudentsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // User & Institute info from localStorage
  const [adminName, setAdminName] = useState('Admin')
  const [adminEmail, setAdminEmail] = useState('')
  const [instituteName, setInstituteName] = useState('Institute')
  const [instituteCode, setInstituteCode] = useState('')
  const [instituteLogo, setInstituteLogo] = useState<string | null>(null)
  const [initials, setInitials] = useState('AD')

useEffect(() => {
    setMounted(true)
    setTeachersOpen(true)
    setStudentsOpen(true)

    const name = localStorage.getItem('adminName') || 'Admin'
    const email = localStorage.getItem('adminEmail') || ''
    const instName = localStorage.getItem('instituteName') || 'Institute'
    const instCode = localStorage.getItem('instituteCode') || ''
    const logo = localStorage.getItem('instituteLogo')
    if (logo) setInstituteLogo(logo)

    setAdminName(name)
    setAdminEmail(email)
    setInstituteName(instName)
    setInstituteCode(instCode)

    // Generate initials from name
    const parts = name.trim().split(' ')
    const ini = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase()
    setInitials(ini)
  }, [])

  useEffect(() => {
    const syncFromStorage = () => {
      const name = localStorage.getItem('adminName') || 'Admin'
      const email = localStorage.getItem('adminEmail') || ''
      const instName = localStorage.getItem('instituteName') || 'Institute'
      const instCode = localStorage.getItem('instituteCode') || ''
      const logo = localStorage.getItem('instituteLogo')

      setAdminName(name)
      setAdminEmail(email)
      setInstituteName(instName)
      setInstituteCode(instCode)
      if (logo) setInstituteLogo(logo)

      const parts = name.trim().split(' ')
      const ini = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase()
      setInitials(ini)
    }

    window.addEventListener('admin-profile-updated', syncFromStorage)
    return () => window.removeEventListener('admin-profile-updated', syncFromStorage)
  }, [])

  useEffect(() => {
    const handleProfileUpdate = () => {
      const name = localStorage.getItem('adminName') || 'Admin'
      const email = localStorage.getItem('adminEmail') || ''
      const instName = localStorage.getItem('instituteName') || 'Institute'
      const instCode = localStorage.getItem('instituteCode') || ''
      const logo = localStorage.getItem('instituteLogo')

      setAdminName(name)
      setAdminEmail(email)
      setInstituteName(instName)
      setInstituteCode(instCode)
      if (logo) setInstituteLogo(logo)

      const parts = name.trim().split(' ')
      const ini = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase()
      setInitials(ini)
    }

    window.addEventListener('admin-profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('admin-profile-updated', handleProfileUpdate)
  }, [])

  const handleLogout = () => {
    adminApi.logout()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-card shadow-sm transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-border">
            {/* <img
              src="/vidhyakendra-logo.png"
              alt="VidhyaKendra"
              className="h-12 w-auto object-contain"
            /> */}

            <img
  src={instituteLogo || '/vidhyakendra-logo.png'}
  alt={instituteName}
  className="h-12 w-auto object-contain max-w-[160px]"
  onError={(e) => { e.currentTarget.src = '/vidhyakendra-logo.png' }}
/>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden rounded-lg p-2 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Institute Info */}
          <div className="border-b border-border bg-gradient-to-br from-[#1897C6]/5 to-[#F1AF37]/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white shadow-md">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{instituteName}</p>
                {instituteCode && (
                  <p className="text-xs text-muted-foreground truncate">Code: {instituteCode}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white shadow-md'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* Teachers Accordion */}
            {mounted && (
              <Collapsible open={teachersOpen} onOpenChange={setTeachersOpen}>
                <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-all">
                  <GraduationCap className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">Teachers</span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      teachersOpen ? 'rotate-90' : ''
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 pl-4">
                  {teachersSubNav.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all ${
                          isActive
                            ? 'bg-[#F1AF37]/10 text-[#F1AF37] font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Students Accordion */}
            {mounted && (
              <Collapsible open={studentsOpen} onOpenChange={setStudentsOpen}>
                <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-all">
                  <Users className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">Students</span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                      studentsOpen ? 'rotate-90' : ''
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 pl-4">
                  {studentsSubNav.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all ${
                          isActive
                            ? 'bg-[#1897C6]/10 text-[#1897C6] font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            <Link
              href="/dashboard/classes"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                pathname === '/dashboard/classes'
                  ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white shadow-md'
                  : 'text-foreground hover:bg-muted'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              <span>Classes</span>
            </Link>

            <Link
              href="/dashboard/exams"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                pathname === '/dashboard/exams'
                  ? 'bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white shadow-md'
                  : 'text-foreground hover:bg-muted'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span>Exams</span>
            </Link>

            <Link
              href="/dashboard/notices"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                pathname === '/dashboard/notices'
                  ? 'bg-gradient-to-r from-[#D87331] to-[#D88931] text-white shadow-md'
                  : 'text-foreground hover:bg-muted'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Bell className="h-5 w-5 shrink-0" />
              <span>Notices</span>
            </Link>

            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                pathname === '/dashboard/settings'
                  ? 'bg-muted text-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span>Institute Profile</span>
            </Link>
          </nav>

          {/* User Menu */}
         <div className="border-t border-border p-4">
            {mounted && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-muted transition-colors">
                  <Avatar className="h-10 w-10 shrink-0 border-2 border-border">
                    {/* <AvatarImage src="/placeholder.svg" /> */}
                    <AvatarFallback className="bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{adminName}</p>
                    <p className="text-xs text-muted-foreground truncate">{adminEmail}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* <img
              src="/vidhyakendra-logo.png"
              alt="VidhyaKendra"
              className="h-8 w-auto object-contain"
            /> */}
            <img
  src={instituteLogo || '/vidhyakendra-logo.png'}
  alt={instituteName}
  className="h-8 w-auto object-contain max-w-[120px]"
  onError={(e) => { e.currentTarget.src = '/vidhyakendra-logo.png' }}
/>
          </div>
          <Avatar className="h-8 w-8 border-2 border-border">
            {/* <AvatarImage src="/placeholder.svg" /> */}
            <AvatarFallback className="bg-gradient-to-br from-[#F1AF37] to-[#D88931] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}