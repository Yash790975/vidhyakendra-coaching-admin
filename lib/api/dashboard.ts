
export const dashboardApi = {}
















// import { apiClient, ApiResponse } from './client'

// // Change these endpoints to match your API routes
// const ENDPOINTS = {
//   stats: '/dashboard/stats',
//   recentActivities: '/dashboard/activities',
//   notifications: '/dashboard/notifications',
//   announcements: '/dashboard/announcements',
// }

// // Dashboard Types
// export interface DashboardStats {
//   totalStudents: number
//   totalTeachers: number
//   totalClasses: number
//   activeClasses: number
//   pendingAdmissions: number
//   presentToday: number
//   absentToday: number
//   upcomingExams: number
//   studentGrowth: number
//   teacherGrowth: number
//   attendanceRate: number
// }

// export interface Activity {
//   _id: string
//   type: 'admission' | 'teacher_join' | 'exam' | 'attendance' | 'announcement'
//   title: string
//   description: string
//   timestamp: string
//   user?: {
//     name: string
//     role: string
//   }
// }

// export interface Notification {
//   _id: string
//   title: string
//   message: string
//   type: 'info' | 'warning' | 'success' | 'error'
//   read: boolean
//   createdAt: string
// }

// export interface Announcement {
//   _id: string
//   title: string
//   content: string
//   priority: 'low' | 'medium' | 'high'
//   targetAudience: string[]
//   publishedBy: string
//   publishedAt: string
//   expiresAt?: string
// }

// // Dashboard API Service
// export const dashboardApi = {
//   // Get dashboard statistics
//   getStats: (): Promise<ApiResponse<DashboardStats>> => {
//     return apiClient.get(ENDPOINTS.stats)
//   },

//   // Get recent activities
//   getActivities: (params?: {
//     limit?: number
//     type?: string
//   }): Promise<ApiResponse<Activity[]>> => {
//     return apiClient.get(ENDPOINTS.recentActivities, params as any)
//   },

//   // Get notifications
//   getNotifications: (params?: {
//     limit?: number
//     unreadOnly?: boolean
//   }): Promise<ApiResponse<Notification[]>> => {
//     return apiClient.get(ENDPOINTS.notifications, params as any)
//   },

//   // Mark notification as read
//   markNotificationRead: (id: string): Promise<ApiResponse<void>> => {
//     return apiClient.patch(`${ENDPOINTS.notifications}/${id}`, { read: true })
//   },

//   // Get announcements
//   getAnnouncements: (params?: {
//     limit?: number
//     active?: boolean
//   }): Promise<ApiResponse<Announcement[]>> => {
//     return apiClient.get(ENDPOINTS.announcements, params as any)
//   },

//   // Create announcement
//   createAnnouncement: (data: Partial<Announcement>): Promise<ApiResponse<Announcement>> => {
//     return apiClient.post(ENDPOINTS.announcements, data)
//   },          // ✅ pehle yahan band karo

//   // Get plan info
//   getPlanInfo: (): Promise<ApiResponse<any>> => {
//     return apiClient.get('/dashboard/plan')
//   },
// }
