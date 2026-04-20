'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react'
import { studentsApi, StudentIdentityDocument, StudentAcademicDocument } from '@/lib/api/students'
import { IMAGE_BASE_URL } from '@/lib/api/config'
// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentsInfoProps {
  studentId:               string
  studentName:             string
  isEditMode:              boolean
  onUploadedNamesChange?:  (names: string[]) => void
}

// ─── Doc config ───────────────────────────────────────────────────────────────

type DocEntry =
  | { kind: 'identity'; type: StudentIdentityDocument['document_type']; label: string; required: boolean }
  | { kind: 'academic'; type: StudentAcademicDocument['document_type']; label: string; required: boolean }

const DOC_LIST: DocEntry[] = [
  { kind: 'identity', type: 'student_photo',         label: 'Student Photo',         required: true  },
  { kind: 'identity', type: 'birth_certificate',     label: 'Birth Certificate',     required: true  },
  { kind: 'identity', type: 'aadhaar_card',          label: 'Aadhaar Card',          required: false },
  { kind: 'identity', type: 'pan_card',              label: 'PAN Card',              required: false },
  { kind: 'identity', type: 'passport',              label: 'Passport',              required: false },
  { kind: 'academic', type: 'transfer_certificate',  label: 'Transfer Certificate',  required: false },
  { kind: 'academic', type: 'leaving_certificate',   label: 'Leaving Certificate',   required: false },
  { kind: 'academic', type: 'marksheet',             label: 'Previous Marksheet',    required: false },
  { kind: 'academic', type: 'migration_certificate', label: 'Migration Certificate', required: false },
  { kind: 'academic', type: 'bonafide_certificate',  label: 'Bonafide Certificate',  required: false },
  { kind: 'academic', type: 'character_certificate', label: 'Character Certificate', required: false },
]

// ─── Uploaded doc state ───────────────────────────────────────────────────────

type UploadedDoc = {
  _id:      string
  file_url: string
  kind:     'identity' | 'academic'
  type:     string
}

// ─── Helper: build full preview URL ──────────────────────────────────────────

function buildFullUrl(fileUrl: string): string {
  if (!fileUrl) return ''
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl
  const base = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL
  const cleanPath = fileUrl.replace(/^\/+/, '')
  return `${base}/${cleanPath}`
}


function ImagePreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-medium text-muted-foreground">Document Preview</p>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none px-2"
          >✕</button>
        </div>
        <div className="flex items-center justify-center bg-muted/20 min-h-[300px] max-h-[75vh] overflow-auto p-4">
          {isImage ? (
            <img
              src={url}
              alt="Document preview"
              className="max-w-full max-h-[65vh] object-contain rounded-lg shadow"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : (
            <iframe
              src={url}
              className="w-full h-[65vh] rounded border-0"
              title="Document preview"
            />
          )}
          <p className="hidden text-sm text-muted-foreground">
            Unable to load preview.{' '}
            <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              Open in new tab
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentsInfo({
  studentId,
  studentName,
  isEditMode,
  onUploadedNamesChange,
}: DocumentsInfoProps) {

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({})
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [isFetching,   setIsFetching]   = useState(false)
  const [apiError,     setApiError]     = useState<string | null>(null)
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Notify parent whenever uploaded docs change (for Review section)
  useEffect(() => {
    const names = Object.keys(uploadedDocs).map((key) => {
      const entry = DOC_LIST.find(d => `${d.kind}:${d.type}` === key)
      return entry?.label ?? key
    })
    onUploadedNamesChange?.(names)
  }, [uploadedDocs, onUploadedNamesChange])
  const pendingEntry = useRef<DocEntry | null>(null)

  // ── Fetch existing docs on mount ──────────────────────────────────────────

  useEffect(() => {
    if (!studentId) return

    const fetchExistingDocs = async () => {
      setIsFetching(true)
      setApiError(null)
      console.log('[DocumentsInfo] Fetching existing documents for student:', studentId)

      try {
        // Fetch identity documents
        const identityRes = await studentsApi.getIdentityDocumentsByStudent(studentId)
        if (!identityRes.success) {
          console.error('[DocumentsInfo] Failed to fetch identity documents:', identityRes)
        } else if (identityRes.result && identityRes.result.length > 0) {
          const newDocs: Record<string, UploadedDoc> = {}
          for (const doc of identityRes.result) {
            if (doc._id && doc.file_url && doc.document_type) {
              const key = `identity:${doc.document_type}`
              newDocs[key] = {
                _id:      doc._id,
                file_url: doc.file_url,
                kind:     'identity',
                type:     doc.document_type,
              }
            }
          }
          setUploadedDocs((prev) => ({ ...prev, ...newDocs }))
          console.log('[DocumentsInfo] Identity docs loaded:', newDocs)
        }

        // Fetch academic documents
        const academicRes = await studentsApi.getAcademicDocumentsByStudent(studentId)
        if (!academicRes.success) {
          console.error('[DocumentsInfo] Failed to fetch academic documents:', academicRes)
        } else if (academicRes.result && academicRes.result.length > 0) {
          const newDocs: Record<string, UploadedDoc> = {}
          for (const doc of academicRes.result) {
            if (doc._id && doc.file_url && doc.document_type) {
              const key = `academic:${doc.document_type}`
              newDocs[key] = {
                _id:      doc._id,
                file_url: doc.file_url,
                kind:     'academic',
                type:     doc.document_type,
              }
            }
          }
          setUploadedDocs((prev) => ({ ...prev, ...newDocs }))
          console.log('[DocumentsInfo] Academic docs loaded:', newDocs)
        }

      } catch (err) {
        console.error('[DocumentsInfo] Unexpected error fetching documents:', err)
        setApiError('Could not load existing documents. Please refresh and try again.')
      } finally {
        setIsFetching(false)
      }
    }

    fetchExistingDocs()
  }, [studentId])

  // ── Open file picker ──────────────────────────────────────────────────────

  function handleUploadClick(entry: DocEntry) {
    pendingEntry.current = entry
    fileInputRef.current!.value = ''
    fileInputRef.current!.click()
  }

  // ── File selected → upload ────────────────────────────────────────────────
  // NOTE: window.open from file chooser onChange is blocked by browsers.
  // Upload completes → state updates → user clicks "Document uploaded" link → new tab opens.

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file  = e.target.files?.[0]
    const entry = pendingEntry.current
    if (!file || !entry || !studentId) return

    const key = `${entry.kind}:${entry.type}`
    setUploadingKey(key)
    setApiError(null)

    try {
      let resultFileUrl: string | null = null
      let resultId: string | null = null

      if (entry.kind === 'identity') {
        const existing = uploadedDocs[key]

        if (existing) {
          const res = await studentsApi.updateIdentityDocument(existing._id, { file })
          if (!res.success) {
            console.error('[DocumentsInfo] Identity doc update failed:', { id: existing._id, res })
            setApiError(res.message || 'Upload failed. Please try again.')
            return
          }
          resultFileUrl = res.result?.file_url ?? existing.file_url
          resultId      = existing._id
          console.log('[DocumentsInfo] Identity doc updated:', entry.type, res.result)
        } else {
          const res = await studentsApi.createIdentityDocument({
            student_id:    studentId,
            document_type: entry.type as StudentIdentityDocument['document_type'],
            student_name:  studentName,
            file,
          })
          if (!res.success || !res.result) {
            console.error('[DocumentsInfo] Identity doc create failed:', { entry, res })
            setApiError(res.message || 'Upload failed. Please try again.')
            return
          }
          resultFileUrl = res.result.file_url ?? null
          resultId      = res.result._id ?? null
          console.log('[DocumentsInfo] Identity doc created:', entry.type, res.result)
        }

      } else {
        const existing = uploadedDocs[key]

        if (existing) {
          const res = await studentsApi.updateAcademicDocument(existing._id, { file })
          if (!res.success) {
            console.error('[DocumentsInfo] Academic doc update failed:', { id: existing._id, res })
            setApiError(res.message || 'Upload failed. Please try again.')
            return
          }
          resultFileUrl = res.result?.file_url ?? existing.file_url
          resultId      = existing._id
          console.log('[DocumentsInfo] Academic doc updated:', entry.type, res.result)
        } else {
          const res = await studentsApi.createAcademicDocument({
            student_id:    studentId,
            document_type: entry.type as StudentAcademicDocument['document_type'],
            student_name:  studentName,
            file,
          })
          if (!res.success || !res.result) {
            console.error('[DocumentsInfo] Academic doc create failed:', { entry, res })
            setApiError(res.message || 'Upload failed. Please try again.')
            return
          }
          resultFileUrl = res.result.file_url ?? null
          resultId      = res.result._id ?? null
          console.log('[DocumentsInfo] Academic doc created:', entry.type, res.result)
        }
      }

      if (resultFileUrl && resultId) {
        setUploadedDocs((prev) => ({
          ...prev,
          [key]: {
            _id:      resultId!,
            file_url: resultFileUrl!,
            kind:     entry.kind,
            type:     entry.type,
          },
        }))
        console.log('[DocumentsInfo] Upload success. Click link to preview:', buildFullUrl(resultFileUrl))
      } else {
        console.error('[DocumentsInfo] No file_url or _id in response:', { entry, resultFileUrl, resultId })
        setApiError('Upload succeeded but preview is unavailable. Please refresh.')
      }

    } catch (err) {
      console.error('[DocumentsInfo] Unexpected upload error:', err)
      setApiError('Unable to connect to the server. Please check your connection.')
    } finally {
      setUploadingKey(null)
    }
  }, [studentId, studentName, uploadedDocs])

  // ── Click on uploaded doc link → open in new tab ──────────────────────────

  function handlePreviewClick(fileUrl: string) {
    const fullUrl = buildFullUrl(fileUrl)
    if (fullUrl) {
      console.log('[DocumentsInfo] Preview clicked, opening modal:', fullUrl)
      setPreviewUrl(fullUrl)
    } else {
      console.error('[DocumentsInfo] Cannot preview — empty URL:', fileUrl)
      setApiError('Preview unavailable for this document.')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

 return (
    <div className="space-y-4">

      {/* Preview Modal */}
      {previewUrl && (
        <ImagePreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Fetching indicator */}
      {isFetching && (
        <div className="flex items-center gap-2 rounded-md bg-blue-50 border border-blue-200 p-3">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
          <p className="text-sm text-blue-700">Loading existing documents...</p>
        </div>
      )}

      {/* Error banner */}
      {apiError && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{apiError}</p>
          <button
            onClick={() => setApiError(null)}
            className="ml-auto shrink-0 text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Info hint */}
      <p className="text-xs text-muted-foreground">
        Click <strong>Upload</strong> to upload or replace a document.
        After upload, the file will open automatically in a new tab for preview.
        Click the link below any card to re-open it later.
      </p>

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {DOC_LIST.map((entry) => {
          const key      = `${entry.kind}:${entry.type}`
          const uploaded = uploadedDocs[key]
          const loading  = uploadingKey === key

          return (
            <Card
              key={key}
              className={`border-2 transition-colors ${
                uploaded ? 'border-green-200 bg-green-50/40' : 'border-border'
              }`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-3">

                  {/* Label row */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">
                      {entry.label}
                      {entry.required && (
                        <span className="text-red-500 ml-1" aria-label="required">*</span>
                      )}
                    </p>
                    {uploaded && !loading && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </div>

                  {/* Upload button */}
                  <Button
                    variant="outline"
                    className="w-full h-9 text-sm"
                    size="sm"
                    disabled={loading || isFetching}
                    onClick={() => handleUploadClick(entry)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploaded ? 'Re-upload' : 'Upload'}
                      </>
                    )}
                  </Button>

                  {/* Uploaded — clickable link to open in new tab */}
                  {uploaded && !loading && (
                    <button
                      type="button"
                      onClick={() => handlePreviewClick(uploaded.file_url)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors w-full text-left"
                      title="Click to open in new tab"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">Document uploaded — click to preview</span>
                    </button>
                  )}

                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

    </div>
  )
}


