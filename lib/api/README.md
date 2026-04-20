# API Integration Guide

Complete API integration with fetch for all CRUD operations. Just update the URLs in each service file to match your backend.

## Quick Start

### 1. Set your API URL

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 2. Update Endpoints

Each API service has an `ENDPOINTS` object. Update these to match your backend routes:

**Example: lib/api/teachers.ts**
```typescript
const ENDPOINTS = {
  base: '/teachers',              // Change to your route
  active: '/teachers/active',      // Change to your route
  byId: (id) => `/teachers/${id}`, // Change to your route
}
```

### 3. Use in Components

```typescript
import { teachersApi } from '@/lib/api'

// Get all teachers
const response = await teachersApi.getAll({ page: 1, limit: 10 })
if (response.success) {
  console.log(response.data)
}

// Create teacher
const newTeacher = await teachersApi.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
})
```

## Available APIs

### Teachers API (`teachersApi`)
- `getAll(params)` - Get all teachers with pagination
- `getActive(params)` - Get active teachers
- `getInactive(params)` - Get inactive teachers
- `getOnboarding(params)` - Get onboarding teachers
- `getById(id)` - Get teacher by ID
- `create(data)` - Create new teacher
- `update(id, data)` - Update teacher
- `delete(id)` - Delete teacher
- `approve(id)` - Approve onboarding teacher
- `reject(id, reason)` - Reject onboarding teacher
- `markAttendance(data)` - Mark attendance
- `getAttendance(params)` - Get attendance records

### Students API (`studentsApi`)
- `getAll(params)` - Get all students
- `getAdmitted(params)` - Get admitted students
- `getPending(params)` - Get pending students
- `getRejected(params)` - Get rejected students
- `getById(id)` - Get student by ID
- `create(data)` - Create new student
- `update(id, data)` - Update student
- `delete(id)` - Delete student
- `admit(id)` - Admit pending student
- `reject(id, reason)` - Reject pending student
- `promote(data)` - Promote students to next class

### Classes API (`classesApi`)
- `getAll(params)` - Get all classes
- `getById(id)` - Get class by ID
- `create(data)` - Create new class
- `update(id, data)` - Update class
- `delete(id)` - Delete class
- `getStudents(classId)` - Get students in class
- `getTeachers(classId)` - Get teachers for class
- `getTimetable(classId)` - Get timetable
- `updateTimetable(classId, data)` - Update timetable

### Exams API (`examsApi`)
- `getAll(params)` - Get all exams
- `getById(id)` - Get exam by ID
- `create(data)` - Create new exam
- `update(id, data)` - Update exam
- `delete(id)` - Delete exam
- `getSchedule(params)` - Get exam schedule
- `getResults(examId, params)` - Get exam results
- `getStudentResult(examId, studentId)` - Get student result
- `addResult(examId, data)` - Add exam result
- `updateResult(examId, studentId, data)` - Update exam result

### Admin API (`adminApi`)
- `login(credentials)` - Login admin
- `logout()` - Logout admin
- `refresh()` - Refresh token
- `getProfile()` - Get current admin profile
- `getAll(params)` - Get all admins
- `getById(id)` - Get admin by ID
- `create(data)` - Create new admin
- `update(id, data)` - Update admin
- `delete(id)` - Delete admin
- `changePassword(data)` - Change password

### Settings API (`settingsApi`)
- `institute.get()` - Get institute settings
- `institute.update(data)` - Update institute settings
- `academic.get()` - Get academic settings
- `academic.update(data)` - Update academic settings
- `general.get()` - Get general settings
- `general.update(data)` - Update general settings
- `notifications.get()` - Get notification settings
- `notifications.update(data)` - Update notification settings

### Dashboard API (`dashboardApi`)
- `getStats()` - Get dashboard statistics
- `getActivities(params)` - Get recent activities
- `getNotifications(params)` - Get notifications
- `markNotificationRead(id)` - Mark notification as read
- `getAnnouncements(params)` - Get announcements
- `createAnnouncement(data)` - Create announcement

## Usage Examples

### Fetching Data
```typescript
import { teachersApi } from '@/lib/api'

const fetchTeachers = async () => {
  const response = await teachersApi.getAll({
    page: 1,
    limit: 10,
    status: 'active',
    search: 'john'
  })

  if (response.success) {
    console.log('Teachers:', response.data)
  } else {
    console.error('Error:', response.error)
  }
}
```

### Creating Data
```typescript
import { studentsApi } from '@/lib/api'

const createStudent = async () => {
  const response = await studentsApi.create({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    class: '10',
    section: 'A'
  })

  if (response.success) {
    console.log('Created:', response.data)
  }
}
```

### Updating Data
```typescript
import { classesApi } from '@/lib/api'

const updateClass = async (id: string) => {
  const response = await classesApi.update(id, {
    capacity: 40,
    classTeacher: 'teacher-id'
  })

  if (response.success) {
    console.log('Updated:', response.data)
  }
}
```

### Deleting Data
```typescript
import { examsApi } from '@/lib/api'

const deleteExam = async (id: string) => {
  const response = await examsApi.delete(id)

  if (response.success) {
    console.log('Deleted successfully')
  }
}
```

### Authentication
```typescript
import { adminApi } from '@/lib/api'

// Login
const login = async () => {
  const response = await adminApi.login({
    username: 'admin',
    password: 'password'
  })

  if (response.success) {
    console.log('Logged in:', response.data)
    // Token is automatically stored and used for subsequent requests
  }
}

// Logout
const logout = async () => {
  await adminApi.logout()
  // Token is automatically cleared
}
```

### Using in React Components
```typescript
'use client'

import { useState, useEffect } from 'react'
import { teachersApi, Teacher } from '@/lib/api'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    setLoading(true)
    const response = await teachersApi.getAll({ page: 1, limit: 10 })
    
    if (response.success) {
      setTeachers(response.data?.data || [])
    }
    setLoading(false)
  }

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        teachers.map(teacher => (
          <div key={teacher._id}>{teacher.firstName}</div>
        ))
      )}
    </div>
  )
}
```

## Error Handling

All API calls return a standardized response:
```typescript
{
  success: boolean
  data?: any
  error?: string
  message?: string
}
```

Always check `success` before accessing data:
```typescript
const response = await teachersApi.getAll()

if (response.success) {
  // Use response.data
} else {
  // Handle response.error
}
```

## File Structure

```
lib/api/
├── client.ts       # Generic API client
├── teachers.ts     # Teachers API
├── students.ts     # Students API
├── classes.ts      # Classes API
├── exams.ts        # Exams API
├── admin.ts        # Admin & Auth API
├── settings.ts     # Settings API
├── dashboard.ts    # Dashboard API
├── config.ts       # Configuration
├── index.ts        # Exports
└── README.md       # This file
```

## Customization

To customize for your backend:

1. Update `API_CONFIG.BASE_URL` in `config.ts`
2. Update `ENDPOINTS` in each service file
3. Modify types to match your backend schema
4. Add custom headers or authentication logic in `client.ts`
