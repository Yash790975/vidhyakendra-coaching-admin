  "use client"

  import * as React from "react"
  import Link from "next/link"
  import { usePathname } from "next/navigation"
  import {
    LayoutDashboard,
    Building2,
    Users,
    GraduationCap,
    Bell,
    Settings,
    BookOpen,
    Calendar,
    FileText,
    BarChart3,
    CreditCard,
    ChevronDown,
    LogOut,
    User,
  } from "lucide-react"

  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
  } from "@/components/ui/sidebar"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

  // Menu items for Super Admin
  const superAdminMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      url: "/admin",
    },
    {
      title: "Institutes",
      icon: Building2,
      url: "/admin/institutes",
      items: [
        { title: "All Institutes", url: "/admin/institutes" },
        { title: "Pending Applications", url: "/admin/institutes/applications" },
        { title: "Subscriptions", url: "/admin/institutes/subscriptions" },
      ],
    },
    {
      title: "Subscription Plans",
      icon: CreditCard,
      url: "/admin/subscription-plans",
    },
    {
      title: "System Settings",
      icon: Settings,
      url: "/admin/settings",
    },
    {
      title: "Reports",
      icon: BarChart3,
      url: "/admin/reports",
    },
  ]

  // Menu items for Institute Admin
  const instituteAdminMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      url: "/dashboard",
    },
    {
      title: "Students",
      icon: Users,
      url: "/dashboard/students",
      items: [
        { title: "All Students", url: "/dashboard/students" },
        { title: "Add Student", url: "/dashboard/students/add" },
        { title: "Student Attendance", url: "/dashboard/students/attendance" },
      ],
    },
    {
      title: "Teachers",
      icon: GraduationCap,
      url: "/dashboard/teachers",
      items: [
        { title: "All Teachers", url: "/dashboard/teachers" },
        { title: "Add Teacher", url: "/dashboard/teachers/add" },
        { title: "Teacher Attendance", url: "/dashboard/teachers/attendance" },
      ],
    },
    {
      title: "Classes & Courses",
      icon: BookOpen,
      url: "/dashboard/classes",
    },
    {
      title: "Attendance",
      icon: Calendar,
      url: "/dashboard/attendance",
    },
    {
      title: "Notices",
      icon: Bell,
      url: "/dashboard/notices",
    },
    {
      title: "Exams & Results",
      icon: FileText,
      url: "/dashboard/exams",
    },
    {
      title: "Fee Management",
      icon: CreditCard,
      url: "/dashboard/fees",
    },
    {
      title: "Reports",
      icon: BarChart3,
      url: "/dashboard/reports",
    },
    {
      title: "Setting",
      icon: Settings,
      url: "/dashboard/settings",
    },
  ]

  interface AdminSidebarProps {
    role?: "super_admin" | "institute_admin"
    instituteName?: string
    userName?: string
    userEmail?: string
  }

  export function AdminSidebar({
    role = "super_admin",
    instituteName = "VidhyaKendra",
    userName = "Admin User",
    userEmail = "admin@vidhyakendra.com",
  }: AdminSidebarProps) {
    const pathname = usePathname()
    const menuItems = role === "super_admin" ? superAdminMenuItems : instituteAdminMenuItems

    return (
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-4">
            <img
              src="/vidhyakendra-logo.png"
              alt="VidhyaKendra Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          {role === "institute_admin" && (
            <div className="px-4 pb-3">
              <p className="text-sm font-semibold text-sidebar-foreground">{instituteName}</p>
              <p className="text-xs text-muted-foreground">Institute Admin Panel</p>
            </div>
          )}
          {role === "super_admin" && (
            <div className="px-4 pb-3">
              <p className="text-xs font-medium text-muted-foreground">Super Admin Panel</p>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  if (item.items) {
                    return (
                      <Collapsible key={item.title} asChild defaultOpen={pathname.startsWith(item.url)}>
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                              <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                    <Link href={subItem.url}>{subItem.title}</Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-auto py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg" alt={userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-medium">{userName}</span>
                      <span className="text-xs text-muted-foreground">{userEmail}</span>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    )
  }
