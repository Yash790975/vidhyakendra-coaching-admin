'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Eye, 
  Edit2, 
  Archive,
  Users, 
  CheckCircle, 
  TrendingUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Download,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  ClipboardCheck,
  GraduationCap
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from 'next/link'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { teachersApi } from '@/lib/api/teachers'
import { AlertCircle as AlertCircleIcon } from 'lucide-react'

const mockTeachers = [
  {
    id: '1',
    teacher_code: 'TCH001',
    employee_code: 'EMP2024001',
    full_name: 'Dr. Rajesh Kumar Singh',
    email: 'rajesh.kumar@vidyakendra.com',
    mobile: '+91 98765 43210',
    designation: 'Senior Teacher',
    department: 'Science',
    subjects: ['Physics', 'Mathematics'],
    classes_assigned: ['10-A', '10-B', '11-Science'],
    qualification: 'PhD Physics, M.Sc',
    experience_years: 15,
    joining_date: '2020-04-15',
    attendance_percentage: 96.5,
    performance_rating: 4.8,
    photo_url: '',
    status: 'active',
    salary: 85000,
    class_teacher_of: '10-A'
  },
  {
    id: '2',
    teacher_code: 'TCH002',
    employee_code: 'EMP2024002',
    full_name: 'Mrs. Priya Sharma',
    email: 'priya.sharma@vidyakendra.com',
    mobile: '+91 98765 43211',
    designation: 'Teacher',
    department: 'Languages',
    subjects: ['English', 'Hindi'],
    classes_assigned: ['8-A', '9-B', '10-A'],
    qualification: 'M.A English, B.Ed',
    experience_years: 8,
    joining_date: '2021-06-01',
    attendance_percentage: 98.2,
    performance_rating: 4.9,
    photo_url: '',
    status: 'active',
    salary: 65000,
    class_teacher_of: '9-B'
  },
  {
    id: '3',
    teacher_code: 'TCH003',
    employee_code: 'EMP2024003',
    full_name: 'Mr. Amit Patel',
    email: 'amit.patel@vidyakendra.com',
    mobile: '+91 98765 43212',
    designation: 'Senior Teacher',
    department: 'Science',
    subjects: ['Chemistry', 'Biology'],
    classes_assigned: ['11-Science', '12-Science'],
    qualification: 'M.Sc Chemistry, B.Ed',
    experience_years: 12,
    joining_date: '2019-08-20',
    attendance_percentage: 94.8,
    performance_rating: 4.7,
    photo_url: '',
    status: 'active',
    salary: 78000,
    class_teacher_of: '11-Science'
  },
]

const mockOnboardingTeachers = [
  {
    id: 'ob1',
    full_name: 'Ms. Sneha Gupta',
    email: 'sneha.gupta@vidyakendra.com',
    mobile: '+91 98765 43213',
    designation: 'Teacher',
    department: 'Mathematics',
    applied_date: '2024-01-15',
    document_status: 'pending_verification',
    interview_status: 'scheduled',
    interview_date: '2024-02-20'
  },
  {
    id: 'ob2',
    full_name: 'Mr. Vikram Reddy',
    email: 'vikram.reddy@vidyakendra.com',
    mobile: '+91 98765 43214',
    designation: 'Senior Teacher',
    department: 'Computer Science',
    applied_date: '2024-01-18',
    document_status: 'verified',
    interview_status: 'completed',
    interview_date: '2024-02-18'
  },
]

const mockInactiveTeachers = [
  {
    id: 'in1',
    teacher_code: 'TCH015',
    full_name: 'Mr. Rahul Mehta',
    email: 'rahul.mehta@vidyakendra.com',
    mobile: '+91 98765 43215',
    designation: 'Teacher',
    department: 'Social Studies',
    inactive_since: '2024-01-10',
    reason: 'Medical Leave',
    status: 'inactive'
  },
]

const mockAttendanceData = [
  {
    date: '2024-02-19',
    teacher_id: '1',
    teacher_code: 'TCH001',
    full_name: 'Dr. Rajesh Kumar Singh',
    department: 'Science',
    check_in: '08:45 AM',
    check_out: '04:30 PM',
    status: 'present',
    working_hours: '7.75'
  },
  {
    date: '2024-02-19',
    teacher_id: '2',
    teacher_code: 'TCH002',
    full_name: 'Mrs. Priya Sharma',
    department: 'Languages',
    check_in: '08:50 AM',
    check_out: '04:25 PM',
    status: 'present',
    working_hours: '7.58'
  },
  {
    date: '2024-02-19',
    teacher_id: '3',
    teacher_code: 'TCH003',
    full_name: 'Mr. Amit Patel',
    department: 'Science',
    check_in: '09:15 AM',
    check_out: '04:20 PM',
    status: 'late',
    working_hours: '7.08'
  },
]

export default function TeachersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [attendanceView, setAttendanceView] = useState('weekly')
  const [attendanceDateRange, setAttendanceDateRange] = useState('today')

  const stats = {
    total: 82,
    active: 78,
    onboarding: 12,
    inactive: 4,
    presentToday: 75,
    avgAttendance: 96.2,
  }

  const filteredTeachers = mockTeachers.filter(teacher => {
    const matchesSearch = teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.mobile.includes(searchQuery) ||
      teacher.teacher_code.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || teacher.department === departmentFilter
    
    return matchesSearch && matchesDepartment
  })

  const filteredOnboarding = mockOnboardingTeachers.filter(teacher => {
    return teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredInactive = mockInactiveTeachers.filter(teacher => {
    return teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredAttendance = mockAttendanceData.filter(record => {
    const matchesSearch = record.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.teacher_code.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter
    
    return matchesSearch && matchesDepartment
  })

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage)
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedOnboarding = filteredOnboarding.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedInactive = filteredInactive.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalAttendancePages = Math.ceil(filteredAttendance.length / itemsPerPage)
  const paginatedAttendance = filteredAttendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#1897C6] to-[#67BAC3] flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Teachers Management</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Manage all teacher-related activities</p>
              </div>
            </div>
            <Link href="/dashboard/teachers/add">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-[#1897C6] to-[#67BAC3] text-white">
                <Users className="h-4 w-4 mr-2" />
                Add New Teacher
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card className="border-2">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#1897C6]" />
                  <Badge className="bg-[#1897C6] text-xs">{stats.total}</Badge>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Teachers</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <Badge className="bg-green-600 text-xs">{stats.active}</Badge>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground mt-1">Active</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <Badge className="bg-blue-600 text-xs">{stats.onboarding}</Badge>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{stats.onboarding}</p>
                <p className="text-xs text-muted-foreground mt-1">Onboarding</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <Badge className="bg-orange-600 text-xs">{stats.inactive}</Badge>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground mt-1">Inactive</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <Badge className="bg-purple-600 text-xs">{stats.presentToday}</Badge>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{stats.presentToday}</p>
                <p className="text-xs text-muted-foreground mt-1">Present Today</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  <Badge className="bg-emerald-600 text-xs">{stats.avgAttendance}%</Badge>
                </div>
                <p className="text-xl sm:text-2xl font-bold">{stats.avgAttendance}%</p>
                <p className="text-xs text-muted-foreground mt-1">Avg Attendance</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4 sm:space-y-6" onValueChange={() => setCurrentPage(1)}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
            <TabsTrigger value="onboarding" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">Onboarding</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">Active Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
              <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">Inactive</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="truncate">Attendance</span>
            </TabsTrigger>
          </TabsList>

          {/* Onboarding Tab */}
          <TabsContent value="onboarding">
            <Card className="border-2">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base sm:text-lg">Onboarding Teachers</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full sm:w-[250px]"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Contact</TableHead>
                        <TableHead className="text-xs sm:text-sm">Department</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Applied Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Document Status</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Interview</TableHead>
                        <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOnboarding.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-xs sm:text-sm">{teacher.full_name}</p>
                              <p className="text-xs text-muted-foreground">{teacher.designation}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-xs">
                              <p>{teacher.email}</p>
                              <p className="text-muted-foreground">{teacher.mobile}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{teacher.department}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">
                            {new Date(teacher.applied_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              teacher.document_status === 'verified' 
                                ? 'bg-green-600 text-xs' 
                                : 'bg-yellow-600 text-xs'
                            }>
                              {teacher.document_status === 'verified' ? 'Verified' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-xs">
                              <Badge className={
                                teacher.interview_status === 'completed' 
                                  ? 'bg-green-600' 
                                  : teacher.interview_status === 'scheduled'
                                  ? 'bg-blue-600'
                                  : 'bg-gray-600'
                              }>
                                {teacher.interview_status}
                              </Badge>
                              {teacher.interview_date && (
                                <p className="text-muted-foreground mt-1">
                                  {new Date(teacher.interview_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/teachers/onboarding/${teacher.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Page {currentPage} of {Math.ceil(filteredOnboarding.length / itemsPerPage) || 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === Math.ceil(filteredOnboarding.length / itemsPerPage)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.ceil(filteredOnboarding.length / itemsPerPage))}
                        disabled={currentPage === Math.ceil(filteredOnboarding.length / itemsPerPage)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Teachers Tab */}
          <TabsContent value="active">
            <Card className="border-2">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base sm:text-lg">Active Teachers</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Languages">Languages</SelectItem>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full sm:w-[250px]"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Teacher</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Contact</TableHead>
                        <TableHead className="text-xs sm:text-sm">Department</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Classes</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden xl:table-cell">Experience</TableHead>
                        <TableHead className="text-xs sm:text-sm">Attendance</TableHead>
                        <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTeachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-xs sm:text-sm">{teacher.full_name}</p>
                              <p className="text-xs text-muted-foreground">{teacher.teacher_code}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-xs">
                              <p>{teacher.email}</p>
                              <p className="text-muted-foreground">{teacher.mobile}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{teacher.department}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {teacher.classes_assigned.slice(0, 2).map((cls, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">{cls}</Badge>
                              ))}
                              {teacher.classes_assigned.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{teacher.classes_assigned.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-xs">
                            {teacher.experience_years} years
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                                  style={{ width: `${teacher.attendance_percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{teacher.attendance_percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Link href={`/dashboard/teachers/active/${teacher.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inactive Teachers Tab */}
          <TabsContent value="inactive">
            <Card className="border-2">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base sm:text-lg">Inactive Teachers</CardTitle>
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search teachers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-full sm:w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Teacher</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Contact</TableHead>
                        <TableHead className="text-xs sm:text-sm">Department</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Inactive Since</TableHead>
                        <TableHead className="text-xs sm:text-sm">Reason</TableHead>
                        <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInactive.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-xs sm:text-sm">{teacher.full_name}</p>
                              <p className="text-xs text-muted-foreground">{teacher.teacher_code}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-xs">
                              <p>{teacher.email}</p>
                              <p className="text-muted-foreground">{teacher.mobile}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{teacher.department}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">
                            {new Date(teacher.inactive_since).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{teacher.reason}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              Reactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Page {currentPage} of {Math.ceil(filteredInactive.length / itemsPerPage) || 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === Math.ceil(filteredInactive.length / itemsPerPage)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.ceil(filteredInactive.length / itemsPerPage))}
                        disabled={currentPage === Math.ceil(filteredInactive.length / itemsPerPage)}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card className="border-2">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base sm:text-lg">Teacher Attendance</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={attendanceDateRange === 'today' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAttendanceDateRange('today')}
                        className="text-xs"
                      >
                        Today
                      </Button>
                      <Button
                        variant={attendanceDateRange === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAttendanceDateRange('week')}
                        className="text-xs"
                      >
                        This Week
                      </Button>
                      <Button
                        variant={attendanceDateRange === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAttendanceDateRange('month')}
                        className="text-xs"
                      >
                        This Month
                      </Button>
                      <Button
                        variant={attendanceDateRange === 'year' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAttendanceDateRange('year')}
                        className="text-xs"
                      >
                        This Year
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Languages">Languages</SelectItem>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Teacher</TableHead>
                        <TableHead className="text-xs sm:text-sm">Department</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Check In</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Check Out</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden xl:table-cell">Working Hours</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAttendance.map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs sm:text-sm">
                            {new Date(record.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-xs sm:text-sm">{record.full_name}</p>
                              <p className="text-xs text-muted-foreground">{record.teacher_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{record.department}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-green-600" />
                              {record.check_in}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-red-600" />
                              {record.check_out}
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-xs font-medium">
                            {record.working_hours} hrs
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              record.status === 'present' 
                                ? 'bg-green-600 text-xs' 
                                : record.status === 'late'
                                ? 'bg-yellow-600 text-xs'
                                : 'bg-red-600 text-xs'
                            }>
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination - Same as Active Teachers */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Page {currentPage} of {totalAttendancePages || 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalAttendancePages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalAttendancePages)}
                        disabled={currentPage === totalAttendancePages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
