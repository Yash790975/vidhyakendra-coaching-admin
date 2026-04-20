'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Student, StudentContact, StudentAcademicMapping, StudentIdentityDocument } from '@/lib/api/students'
import { buildFileUrl, formatDate, getInitials } from '../_utils/helpers'

interface StudentProfileCardProps {
  student: Student
  identityDocs: StudentIdentityDocument[]
  mapping: StudentAcademicMapping | null
  classLabel: string
  contacts: StudentContact[]
}

export function StudentProfileCard({ student, identityDocs, mapping, classLabel, contacts }: StudentProfileCardProps) {
  const studentContact = contacts.find(c => c.contact_type === 'student')
  const fatherContact  = contacts.find(c => c.contact_type === 'father')
  const motherContact  = contacts.find(c => c.contact_type === 'mother')

  const photoDoc = identityDocs.find(d => d.document_type === 'student_photo' && d.file_url)
  const photoUrl = photoDoc ? buildFileUrl(photoDoc.file_url) : null

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={student.full_name}
              onError={e => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                ;(e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'
              }}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-[#1897C6]/20 shadow-md shrink-0"
            />
          ) : null}
          <Avatar
            className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-[#1897C6]/20"
            style={{ display: photoUrl ? 'none' : undefined }}
          >
            <AvatarFallback className="bg-gradient-to-br from-[#1897C6] to-[#67BAC3] text-white text-xl sm:text-2xl font-bold">
              {getInitials(student.full_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Student Name</p>
              <p className="font-semibold text-sm sm:text-base">{student.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Student ID</p>
              <p className="font-semibold font-mono text-sm sm:text-base">{student.student_code}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Class</p>
              <Badge variant="outline" className="font-semibold text-xs">{classLabel}</Badge>
            </div>
             <div>
              <p className="text-xs text-muted-foreground mb-1">Roll Number</p>
              <p className="font-semibold text-sm sm:text-base">{mapping?.roll_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className={
                student.status === 'active'   ? 'bg-green-100 text-green-700 border border-green-300' :
                student.status === 'inactive' ? 'bg-gray-100 text-gray-600 border border-gray-300' :
                student.status === 'blocked'  ? 'bg-red-100 text-red-700 border border-red-300' :
                'bg-yellow-100 text-yellow-700 border border-yellow-300'
              }>
                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
              </Badge>
            </div>            <div>
              <p className="text-xs text-muted-foreground mb-1">Date of Birth</p>
              <p className="text-sm">{formatDate(student.date_of_birth)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Blood Group</p>
              <p className="text-sm">{student.blood_group ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contact</p>
              <p className="text-sm">{studentContact?.mobile ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <p className="text-sm truncate">
                {studentContact?.email ?? fatherContact?.email ?? motherContact?.email ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}