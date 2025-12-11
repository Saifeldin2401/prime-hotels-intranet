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

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUploadDialog({ open, onOpenChange }: DocumentUploadDialogProps) {
  const { profile, properties, departments } = useAuth()
  const queryClient = useQueryClient()
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
        visibility,
        status: 'DRAFT' as DocumentStatus,
        requires_acknowledgment: requiresAcknowledgment,
        created_by: profile.id,
        current_version: 1,
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

      return document
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error) => {
      console.error('Upload error:', error)
      alert('Failed to upload document: ' + error.message)
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
    if (!file) {
      alert('Please select a file')
      return
    }
    uploadMutation.mutate()
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
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
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
              <Label htmlFor="department">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger id="department" disabled={uploading}>
                  <SelectValue placeholder="Select department" />
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
            <Button type="submit" disabled={uploading || !file || !title}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

