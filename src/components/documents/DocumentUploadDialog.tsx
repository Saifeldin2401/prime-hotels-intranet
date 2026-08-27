import { LoadingButton } from '@/components/loading'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useDepartments } from '@/hooks/useDepartments'
import { scanFile } from '@/hooks/useVirusScan'
import type { DocumentStatus, DocumentVisibility } from '@/lib/constants'
import { DOCUMENT_VISIBILITY_OPTIONS } from '@/lib/constants'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { supabase } from '@/lib/supabase'
import { documentSchema } from '@/lib/validationSchemas'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from "react-i18next"
import { Sparkles, Wand2 } from 'lucide-react'
import { generateSmartDocumentMetadata, generateSmartMetadataHeuristic } from '@/lib/ai/smartMetadataService'

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Kicks off AI auto-tagging for a freshly created document.
 *
 * Intentionally fire-and-forget: the edge function reads the document server
 * side and writes ai_tags / ai_category / ai_summary / ai_processed_at. If it
 * is slow, unavailable, or errors, the upload is still complete and correct,
 * so failures are logged and swallowed rather than propagated.
 */
function requestAiTagging(documentId: string): void {
  void supabase.functions
    .invoke('ai-document-tagger', { body: { documentId } })
    .then(({ error }) => {
      if (error) {
        console.warn('AI document tagging failed (non-blocking):', error.message)
      }
    })
    .catch((error: unknown) => {
      console.warn('AI document tagging failed (non-blocking):', error)
    })
}

export function DocumentUploadDialog({ open, onOpenChange }: DocumentUploadDialogProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { currentProperty, availableProperties } = useProperty()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<DocumentVisibility>('property')
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile)
    if (selectedFile) {
      const smart = generateSmartMetadataHeuristic({
        fileName: selectedFile.name,
      })
      if (!title || title.trim() === '') {
        setTitle(smart.title)
      }
      if (!description || description.trim() === '') {
        setDescription(smart.description)
      }
    }
  }

  const handleSmartAutoFill = async () => {
    if (!title && !file?.name) return
    setIsGenerating(true)
    try {
      const result = await generateSmartDocumentMetadata({
        title: title || file?.name,
        description,
        fileName: file?.name,
      })
      setTitle(result.title)
      setDescription(result.description)
      toast({
        title: 'Metadata Organized',
        description: 'Cleaned title and generated professional executive summary.',
      })
    } catch (err) {
      console.error('Auto-fill error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const propertyOptions = useMemo(() => {
    return availableProperties || []
  }, [availableProperties])

  const departmentsPropertyId = useMemo(() => {
    if (visibility === 'department') {
      const id = currentProperty?.id
      return id && id !== 'all' ? id : undefined
    }
    const id = selectedProperty || currentProperty?.id
    return id && id !== 'all' ? id : undefined
  }, [currentProperty?.id, selectedProperty, visibility])

  const { departments: departmentOptions = [] } = useDepartments(departmentsPropertyId)

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !profile) throw new Error('Missing file or user')

      setUploading(true)

      const scanResult = await scanFile(file, {
        bucket: 'documents',
        context: 'document_upload'
      })

      if (!scanResult.safe) {
        throw new Error(scanResult.message || 'File failed security scan')
      }

      // Upload file to Supabase Storage under the current user's folder
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // The 'documents' bucket is private, so a public URL here would 404.
      // Store the object path; readers sign it via get_secure_document_url /
      // resolveDocumentUrl, which already accept a bare path.
      const fileUrl = filePath

      // Create document record - starts strictly as Draft / Internal (Excluded from AI Knowledge Base)
      const documentData: {
        title: string
        description: string | null
        file_url: string
        visibility: DocumentVisibility
        status: DocumentStatus
        knowledge_base_status: string
        is_active_kb_version: boolean
        requires_acknowledgment: boolean
        created_by: string
        current_version: number
        file_size: number
        file_type: string
        file_extension?: string
        content_type: string
        property_id?: string
        department_id?: string
      } = {
        title,
        description: description || null,
        file_url: fileUrl,
        visibility,
        status: 'DRAFT' as DocumentStatus,
        knowledge_base_status: 'excluded',
        is_active_kb_version: false,
        requires_acknowledgment: requiresAcknowledgment,
        created_by: profile.id,
        current_version: 1,
        file_size: file.size,
        file_type: file.type,
        file_extension: fileExt,
        content_type: 'document', // Mark as file document (not knowledge base article)
      }

      if (visibility === 'property') {
        if (selectedProperty) {
          documentData.property_id = selectedProperty
        } else {
          throw new Error('Please select a property')
        }
      }
      if (visibility === 'department') {
        if (selectedDepartment) {
          documentData.department_id = selectedDepartment
        } else {
          throw new Error('Please select a department')
        }
      }

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (docError) throw docError

      // Create initial version
      await supabase.from('document_versions').insert({
        document_id: document.id,
        version_number: 1,
        file_url: fileUrl,
        change_summary: 'Initial version',
        created_by: profile.id,
      })

      // Fire-and-forget AI auto-tagging. This populates documents.ai_tags /
      // ai_category / ai_summary, which DocumentPicker searches on. It is a
      // pure enhancement: it is deliberately not awaited and never surfaces an
      // error, because a tagging failure must never lose an uploaded file.
      requestAiTagging(document.id)

      return document
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error) => {
      const errorDetails = getUserFriendlyError(error)
      toast({
        title: 'Upload Failed',
        description: errorDetails.message,
        variant: 'destructive'
      })
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const resetForm = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setVisibility('property')
    setSelectedProperty('')
    setSelectedDepartment('')
    setRequiresAcknowledgment(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form data
    try {
      if (!file) {
        throw new Error('Please select a file to upload')
      }

      // Validate using Zod schema
      documentSchema.parse({
        title,
        description: description || undefined,
        file,
        requires_acknowledgment: requiresAcknowledgment,
        visibility,
        property_id: selectedProperty || undefined,
        department_id: selectedDepartment || undefined
      })

      uploadMutation.mutate()
    } catch (error) {
      const errorDetails = getUserFriendlyError(error)
      toast({
        title: 'Validation Error',
        description: errorDetails.message,
        variant: 'destructive'
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a new document to the library. You can set visibility and approval requirements.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Smart AI Auto-Fill Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-hotel-navy/5 border border-purple-200 dark:border-purple-900/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Smart Auto-Organize</p>
                <p className="text-[11px] text-muted-foreground">
                  Auto-formats titles and generates executive descriptions on file drop
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSmartAutoFill}
              disabled={isGenerating || (!title && !file)}
              className="text-xs font-bold gap-1.5 h-7 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
            >
              <Wand2 className="w-3 h-3" />
              {isGenerating ? 'Polishing...' : 'AI Auto-Fill'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              required
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">{t('common:title')}</Label>
              {title && (title.includes('-') || title.includes('_')) && (
                <button
                  type="button"
                  onClick={() => {
                    const smart = generateSmartMetadataHeuristic({ title })
                    setTitle(smart.title)
                  }}
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Wand2 className="w-3 h-3" />
                  Clean filename
                </button>
              )}
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lost and Found & Guest Valuables Policy"
              required
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('common:description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document summary or use AI Auto-Fill..."
              disabled={uploading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as DocumentVisibility)}>
              <SelectTrigger id="visibility" disabled={uploading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_VISIBILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {visibility === 'property' && (
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger id="property" disabled={uploading}>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {propertyOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No properties available
                    </SelectItem>
                  ) : (
                    propertyOptions.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {visibility === 'department' && (
            <div className="space-y-2">
              <Label htmlFor="department">{t('common:department')}</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger id="department" disabled={uploading}>
                  <SelectValue placeholder={t("common:select_department")} />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No departments available
                    </SelectItem>
                  ) : (
                    departmentOptions.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="acknowledgment"
              checked={requiresAcknowledgment}
              onChange={(e) => setRequiresAcknowledgment(e.target.checked)}
              disabled={uploading}
              className="rounded border-gray-300"
            />
            <Label htmlFor="acknowledgment" className="cursor-pointer">
              Requires acknowledgment from users
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              disabled={!file || !title || (visibility === 'department' && !selectedDepartment) || (visibility === 'property' && !selectedProperty)}
              loading={uploading}
              loadingText="Uploading..."
            >
              Upload Document
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

