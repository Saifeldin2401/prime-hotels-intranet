import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DOCUMENT_VISIBILITY_OPTIONS } from '@/lib/constants'
import type { DocumentVisibility, DocumentStatus } from '@/lib/constants'
import { documentSchema } from '@/lib/validationSchemas'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { useToast } from '@/components/ui/use-toast'
import { LoadingButton } from '@/components/loading'
import { scanFile } from '@/hooks/useVirusScan'
import { useTranslation } from "react-i18next";

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUploadDialog({ open, onOpenChange }: DocumentUploadDialogProps) {
  const { profile, properties, departments } = useAuth()
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
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const fileUrl = urlData.publicUrl

      // Create document record
      const documentData: any = {
        title,
        description: description || null,
        file_url: fileUrl,
        storage_bucket: 'documents',
        storage_path: filePath,
        visibility,
        status: 'DRAFT' as DocumentStatus,
        requires_acknowledgment: requiresAcknowledgment,
        created_by: profile.id,
        current_version: 1,
        file_size: file.size,
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
        storage_bucket: 'documents',
        storage_path: filePath,
        change_summary: 'Initial version',
        created_by: profile.id,
      })

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
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
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
            <Label htmlFor="title">{t('common:title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
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
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
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
              disabled={!file || !title}
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

