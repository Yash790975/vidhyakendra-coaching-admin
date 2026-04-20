'use client'

import { useState, useEffect } from 'react'
import {
  studentsApi, Student, StudentContact, StudentAddress,
  StudentGuardian, StudentAcademicMapping,
  StudentIdentityDocument, StudentAcademicDocument,
} from '@/lib/api/students'
import { classesApi, type ClassMaster, type CoachingBatch } from '@/lib/api/classes'

export function useStudentCore(studentId: string) {
  const [student,      setStudent]      = useState<Student | null>(null)
  const [contacts,     setContacts]     = useState<StudentContact[]>([])
  const [addresses,    setAddresses]    = useState<StudentAddress[]>([])
  const [guardians,    setGuardians]    = useState<StudentGuardian[]>([])
  const [mapping,      setMapping]      = useState<StudentAcademicMapping | null>(null)
  const [classInfo,    setClassInfo]    = useState<ClassMaster | null>(null)
  // sectionInfo removed — coaching portal uses batches, not sections
  const [batchInfo,    setBatchInfo]    = useState<CoachingBatch | null>(null)
  const [identityDocs, setIdentityDocs] = useState<StudentIdentityDocument[]>([])
  const [academicDocs, setAcademicDocs] = useState<StudentAcademicDocument[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    const fetchCoreData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [studentRes, contactsRes, addressesRes, guardiansRes, mappingRes, identityDocsRes, academicDocsRes] =
          await Promise.allSettled([
            studentsApi.getById(studentId),
            studentsApi.getAllContactsByStudent(studentId),
            studentsApi.getAddressesByStudent(studentId),
            studentsApi.getGuardiansByStudent(studentId),
            studentsApi.getActiveAcademicMappingByStudent(studentId),
            studentsApi.getIdentityDocumentsByStudent(studentId),
            studentsApi.getAcademicDocumentsByStudent(studentId),
          ])

        if (studentRes.status === 'fulfilled' && studentRes.value.success) {
          setStudent(studentRes.value.result!)
        } else {
          setError('Failed to load student profile. Please try again.')
          return
        }

        if (contactsRes.status === 'fulfilled' && contactsRes.value.success)
          setContacts(contactsRes.value.result ?? [])
        if (addressesRes.status === 'fulfilled' && addressesRes.value.success)
          setAddresses(addressesRes.value.result ?? [])
        if (guardiansRes.status === 'fulfilled' && guardiansRes.value.success)
          setGuardians(guardiansRes.value.result ?? [])

        if (mappingRes.status === 'fulfilled' && mappingRes.value.success && mappingRes.value.result) {
          const raw = mappingRes.value.result
          const m = (Array.isArray(raw) ? raw[0] : raw) as StudentAcademicMapping | undefined
          if (m) {
            setMapping(m)
              const classIdStr = typeof m.class_id === 'object' && m.class_id !== null ? (m.class_id as any)._id : m.class_id as string
            const batchIdStr = typeof m.batch_id === 'object' && m.batch_id !== null ? (m.batch_id as any)._id : m.batch_id as string
            if (classIdStr) { try { const r = await classesApi.getById(classIdStr); if (r.success) setClassInfo(r.result!) } catch (e) { console.error('[useStudentCore] class fetch error:', e) } }
            if (batchIdStr) { try { const r = await classesApi.getBatchById(batchIdStr); if (r.success) setBatchInfo(r.result!) } catch (e) { console.error('[useStudentCore] batch fetch error:', e) } }          }
        }

        if (identityDocsRes.status === 'fulfilled' && identityDocsRes.value.success)
          setIdentityDocs((identityDocsRes.value.result as StudentIdentityDocument[]) ?? [])
        if (academicDocsRes.status === 'fulfilled' && academicDocsRes.value.success)
          setAcademicDocs((academicDocsRes.value.result as StudentAcademicDocument[]) ?? [])

      } catch (err) {
        setError('Unable to connect to the server. Please check your connection.')
        console.error('[StudentDetail] fetchCoreData error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCoreData()
  }, [studentId])

  const classLabel = classInfo
    ? `${classInfo.class_name}${batchInfo ? ` - ${batchInfo.batch_name}` : ''}`
    : (() => {        if (!mapping?.class_id) return '—'
        if (typeof mapping.class_id === 'object' && mapping.class_id !== null)
          return (mapping.class_id as any).class_name ?? 'Loading...'
        return 'Loading...'
      })()

   return {
    student, contacts, addresses, guardians, mapping,
    classInfo, batchInfo,
    identityDocs, academicDocs,
    loading, error, classLabel,
  }
}