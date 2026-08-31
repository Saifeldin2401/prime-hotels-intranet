import { LoadingButton } from '@/components/loading'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/lib/constants'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { supabase } from '@/lib/supabase'
import { announcementSchema } from '@/lib/validationSchemas'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Building,
    FileText,
    Image,
    MapPin,
    Save,
    Target,
    Trash2,
    Users,
    Video,
    X
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from "react-i18next"
import { toast } from 'sonner'

import type { Database, Json } from '@/types/database.generated'

interface AnnouncementEditorProps {
  initialData?: {
    id?: string
    title?: string
    content?: string
    category?: string | null
    priority?: string | null
    is_scheduled?: boolean
    scheduled_at?: string | null
    expires_at?: string | null
    send_push_notification?: boolean
    send_email?: boolean
    requires_acknowledgment?: boolean
    is_pinned?: boolean
    allow_comments?: boolean
    target_audience?: unknown
    attachments?: unknown
  }
  onClose?: () => void
  onSave?: (announcement: Record<string, unknown>) => void
}

interface TargetAudience {
  type: 'all' | 'role' | 'department' | 'property' | 'individual'
  values: string[]
}

interface MediaAttachment {
  id: string
  type: 'image' | 'video' | 'document'
  url: string
  name: string
  size?: number
}

interface AnnouncementFormState {
  title: string
  content: string
  category: string
  priority: string
  is_scheduled: boolean
  scheduled_at: string
  expires_at: string
  send_push_notification: boolean
  send_email: boolean
  requires_acknowledgment: boolean
  is_pinned: boolean
  allow_comments: boolean
}

interface AnnouncementSubmitData {
  title: string
  content: string
  category: string
  priority: string
  pinned: boolean
  scheduled_at: string | null
  expires_at: string | null
  send_push_notification: boolean
  send_email: boolean
  requires_acknowledgment: boolean
  allow_comments: boolean
  target_audience: TargetAudience
  attachments: MediaAttachment[]
}

interface DepartmentWithPropertyRow {
  id: string
  name: string
  property: { name: string | null } | Array<{ name: string | null }> | null
}

const DEFAULT_TARGET_AUDIENCE: TargetAudience = { type: 'all', values: [] }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback

const isTargetAudience = (value: unknown): value is TargetAudience => {
  if (!isRecord(value) || !Array.isArray(value.values)) {
    return false
  }

  return ['all', 'role', 'department', 'property', 'individual'].includes(asString(value.type))
    && value.values.every((entry) => typeof entry === 'string')
}

const isMediaAttachment = (value: unknown): value is MediaAttachment => {
  if (!isRecord(value)) {
    return false
  }

  return ['image', 'video', 'document'].includes(asString(value.type))
    && typeof value.id === 'string'
    && typeof value.url === 'string'
    && typeof value.name === 'string'
    && (value.size === undefined || typeof value.size === 'number')
}

const parseTargetAudience = (value: unknown): TargetAudience =>
  isTargetAudience(value) ? value : DEFAULT_TARGET_AUDIENCE

const parseAttachments = (value: unknown): MediaAttachment[] =>
  Array.isArray(value) ? value.filter(isMediaAttachment) : []

const getAttachmentType = (mimeType: string): MediaAttachment['type'] => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}

const buildInitialFormState = (initialData?: AnnouncementEditorProps['initialData']): AnnouncementFormState => ({
  title: asString(initialData?.title),
  content: asString(initialData?.content),
  category: asString(initialData?.category, 'general'),
  priority: asString(initialData?.priority, 'normal'),
  is_scheduled: asBoolean(initialData?.is_scheduled),
  scheduled_at: asString(initialData?.scheduled_at),
  expires_at: asString(initialData?.expires_at),
  send_push_notification: asBoolean(initialData?.send_push_notification, true),
  send_email: asBoolean(initialData?.send_email),
  requires_acknowledgment: asBoolean(initialData?.requires_acknowledgment),
  is_pinned: asBoolean(initialData?.is_pinned),
  allow_comments: asBoolean(initialData?.allow_comments, true),
})

export function AnnouncementEditor({ initialData, onClose, onSave }: AnnouncementEditorProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<AnnouncementFormState>(buildInitialFormState(initialData))

  const [targetAudience, setTargetAudience] = useState<TargetAudience>(
    parseTargetAudience(initialData?.target_audience)
  )

  const [attachments, setAttachments] = useState<MediaAttachment[]>(
    parseAttachments(initialData?.attachments)
  )

  const [activeTab, setActiveTab] = useState('content')

  const { data: departments } = useQuery({
    queryKey: ['departments-with-property'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, property:properties(name)')
        .order('name')
      if (error) throw error
      // Format with property name for disambiguation
      return (data ?? []).map((d) => {
        const prop = Array.isArray(d.property) ? d.property[0] : (d.property as { name: string | null } | null)
        const propertyName = prop?.name
        return {
          id: d.id,
          name: propertyName ? `${d.name} (${propertyName})` : d.name
        }
      })
    }
  })

  const { data: properties } = useQuery({
    queryKey: ['properties', 'hotels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hotels').select('id,name').eq('is_deleted', false)
      if (error) throw error
      return data
    }
  })

  /* 
  const { data: roles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('id,name')
      if (error) throw error
      return data
    }
  }) 
  */
  const roles = Object.entries(ROLES).map(([id, config]) => ({
    id,
    name: config.label
  }))

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: AnnouncementSubmitData) => {
      const { target_audience, attachments, priority, ...rest } = data
      const { data: result, error } = await supabase
        .from('announcements')
        .insert({
          ...rest,
          priority: priority as Database['public']['Enums']['announcement_priority'],
          target_audience: target_audience as unknown as Json,
          attachments: attachments as unknown as Json,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Send notifications to target audience
      const audience = data.target_audience
      const announcementTitle = data.title || 'New Announcement'
      const targetUserIds: string[] = []

      // Determine target users based on audience type
      if (!audience || audience.type === 'all') {
        // For 'all' users - fetch all active users
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true)

        if (allUsers) {
          targetUserIds.push(...allUsers.map(u => u.id))
        }
      } else {
        const values = audience.values || []

        switch (audience.type) {
          case 'role':
            for (const role of values) {
              const { data: roleUsers } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', role as Database['public']['Enums']['app_role'])
              if (roleUsers) {
                targetUserIds.push(...roleUsers.map(u => u.user_id))
              }
            }
            break

          case 'department':
            for (const deptId of values) {
              const { data: deptUsers } = await supabase
                .from('organization_memberships')
                .select('user_id')
                .eq('department_id', deptId)
                .eq('is_active', true)
              if (deptUsers) {
                targetUserIds.push(...deptUsers.map((u: any) => u.user_id))
              }
            }
            break

          case 'property':
            for (const propId of values) {
              const { data: propUsers } = await supabase
                .from('organization_memberships')
                .select('user_id')
                .eq('hotel_id', propId)
                .eq('is_active', true)
              if (propUsers) {
                targetUserIds.push(...propUsers.map((u: any) => u.user_id))
              }
            }
            break

          case 'individual':
            targetUserIds.push(...values)
            break
        }
      }

      // Remove duplicates and exclude the creator
      const uniqueUserIds = [...new Set(targetUserIds)].filter(id => id !== user?.id)

      // Create notifications for target users
      if (data.send_push_notification && uniqueUserIds.length > 0) {
        try {
          const { createBulkNotifications } = await import('@/services/notificationService')
          await createBulkNotifications({
            userIds: uniqueUserIds,
            type: 'announcement_new',
            title: announcementTitle,
            message: `A new announcement has been posted: "${announcementTitle}"`,
            link: `/announcements/${result.id}`,
            metadata: { announcement_id: result.id, creator_id: user?.id },
            sendEmail: data.send_email
          })
        } catch (err) {
          console.error('Failed to create bulk notifications:', err)
          // We do not throw here to avoid failing the announcement creation if notifications fail
        }
      }

      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement created successfully')
      onSave?.(data)
      onClose?.()
    },
    onError: (error) => {
      const errorDetails = getUserFriendlyError(error)
      toast.error(`Failed to create announcement: ${errorDetails.message}`)
    }
  })

  const updateAnnouncementMutation = useMutation({
    mutationFn: async (data: AnnouncementSubmitData) => {
      // Extract send_push_notification and send_email from data before passing to update
      const { send_push_notification, send_email, target_audience, attachments, priority, ...updateData } = data

      const { data: result, error } = await supabase
        .from('announcements')
        .update({
          ...updateData,
          priority: priority as Database['public']['Enums']['announcement_priority'],
          target_audience: target_audience as unknown as Json,
          attachments: attachments as unknown as Json,
        })
        .eq('id', asString(initialData?.id))
        .select()
        .single()

      if (error) throw error

      // Send notifications to target audience if toggle is checked
      if (send_push_notification) {
        const targetUserIds: string[] = []
        const audience = target_audience
        const announcementTitle = updateData.title || 'Updated Announcement'

        if (audience && audience.type !== 'all') {
          const values = audience.values || []
          switch (audience.type) {
            case 'role':
              for (const role of values) {
                const { data: roleUsers } = await supabase
                  .from('user_roles')
                  .select('user_id')
                  .eq('role', role as Database['public']['Enums']['app_role'])
                if (roleUsers) targetUserIds.push(...roleUsers.map(u => u.user_id))
              }
              break
            case 'department':
              for (const deptId of values) {
                const { data: deptUsers } = await supabase
                  .from('organization_memberships')
                  .select('user_id')
                  .eq('department_id', deptId)
                  .eq('is_active', true)
                if (deptUsers) targetUserIds.push(...deptUsers.map((u: any) => u.user_id))
              }
              break
            case 'property':
              for (const propId of values) {
                const { data: propUsers } = await supabase
                  .from('organization_memberships')
                  .select('user_id')
                  .eq('hotel_id', propId)
                  .eq('is_active', true)
                if (propUsers) targetUserIds.push(...propUsers.map((u: any) => u.user_id))
              }
              break
            case 'individual':
              targetUserIds.push(...values)
              break
          }
        }

      const uniqueUserIds = [...new Set(targetUserIds)].filter(id => id !== user?.id)

        if (uniqueUserIds.length > 0) {
          try {
            const { createBulkNotifications } = await import('@/services/notificationService')
            await createBulkNotifications({
              userIds: uniqueUserIds,
              type: 'announcement_new',
              title: announcementTitle,
              message: `A new announcement has been posted: "${announcementTitle}"`,
              link: `/announcements/${result.id}`,
              metadata: { announcement_id: result.id, creator_id: user?.id },
              sendEmail: send_email
            })
          } catch (err) {
            console.error('Failed to create bulk notifications:', err)
          }
        }
      }

      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement updated successfully')
      onSave?.(data)
      onClose?.()
    },
    onError: (error) => {
      const errorDetails = getUserFriendlyError(error)
      toast.error(`Failed to update announcement: ${errorDetails.message}`)
    }
  })

  const handleFileUpload = async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`
      const filePath = `announcements/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('announcement-attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Store the object PATH, not a URL. The bucket is private, so any URL
      // captured here would either 404 (public URL) or expire (signed URL)
      // long before a reader opens the announcement. Viewers sign it on click.
      return {
        id: crypto.randomUUID(),
        type: getAttachmentType(file.type),
        url: filePath,
        name: file.name,
        size: file.size
      }
    })

    try {
      const newAttachments = await Promise.all(uploadPromises)
      setAttachments([...attachments, ...newAttachments])
      toast.success(`Uploaded ${newAttachments.length} file(s)`)
    } catch (error) {
      const errorDetails = getUserFriendlyError(error)
      toast.error(`Failed to upload files: ${errorDetails.message}`)
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(att => att.id !== id))
  }

  const handleSubmit = () => {
    try {
      // Validate using Zod schema
      const validationData = {
        title: formData.title,
        content: formData.content,
        priority: formData.priority as 'normal' | 'important' | 'critical',
        target_audience: targetAudience.type,
        scheduled_at: formData.is_scheduled && formData.scheduled_at ? new Date(formData.scheduled_at) : undefined,
        expires_at: formData.expires_at ? new Date(formData.expires_at) : undefined
      }

      announcementSchema.parse(validationData)

      const { is_pinned, is_scheduled, ...restFormData } = formData

      const announcementData = {
        ...restFormData,
        pinned: is_pinned,
        target_audience: targetAudience,
        attachments,
        scheduled_at: is_scheduled && formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      }

      if (asString(initialData?.id)) {
        updateAnnouncementMutation.mutate(announcementData)
      } else {
        createAnnouncementMutation.mutate(announcementData)
      }
    } catch (e: unknown) {
      const errorDetails = getUserFriendlyError(e)
      toast.error(`Error submitting form: ${errorDetails.message}`)
    }
  }

  const getAudienceOptions = () => {
    switch (targetAudience.type) {
      case 'role':
        return roles || []
      case 'department':
        return departments || []
      case 'property':
        return properties || []
      default:
        return []
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{asString(initialData?.id) ? 'Edit Announcement' : 'Create Announcement'}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter announcement title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('common:category')}</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="policy">Policy Update</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="holiday">Holiday Notice</SelectItem>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your announcement content here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Image className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload images, videos, or documents
                    </span>
                  </div>
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-2 border rounded">
                      {attachment.type === 'image' && <Image className="h-4 w-4" />}
                      {attachment.type === 'video' && <Video className="h-4 w-4" />}
                      {attachment.type === 'document' && <FileText className="h-4 w-4" />}
                      <span className="flex-1 text-sm">{attachment.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeAttachment(attachment.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <div className="space-y-4">
              <Label>Target Audience</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'all', label: 'All Users', icon: Users },
                  { value: 'role', label: 'By Role', icon: Target },
                  { value: 'department', label: 'By Department', icon: Building },
                  { value: 'property', label: 'By Property', icon: MapPin }
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={targetAudience.type === value ? 'default' : 'outline'}
                    onClick={() => setTargetAudience({ type: value as 'all' | 'role' | 'department' | 'property', values: [] })}
                    className="h-12"
                  >
                    <Icon className="h-4 w-4 me-2" />
                    {label}
                  </Button>
                ))}
              </div>

              {targetAudience.type !== 'all' && (
                <div className="space-y-2">
                  <Label>Select {targetAudience.type === 'role' ? 'Roles' : targetAudience.type === 'department' ? 'Departments' : 'Properties'}</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {getAudienceOptions().map((option: { id: string, name: string }) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={targetAudience.values.includes(option.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTargetAudience({
                                ...targetAudience,
                                values: [...targetAudience.values, option.id]
                              })
                            } else {
                              setTargetAudience({
                                ...targetAudience,
                                values: targetAudience.values.filter(v => v !== option.id)
                              })
                            }
                          }}
                        />
                        <Label htmlFor={option.id} className="text-sm">
                          {option.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_scheduled"
                  checked={formData.is_scheduled}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_scheduled: checked })}
                />
                <Label htmlFor="is_scheduled">Schedule announcement</Label>
              </div>

              {formData.is_scheduled && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Schedule Date & Time</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires At (Optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="send_push_notification"
                  checked={formData.send_push_notification}
                  onCheckedChange={(checked) => setFormData({ ...formData, send_push_notification: checked })}
                />
                <Label htmlFor="send_push_notification">Send push notification</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="send_email"
                  checked={formData.send_email}
                  onCheckedChange={(checked) => setFormData({ ...formData, send_email: checked })}
                />
                <Label htmlFor="send_email">Send email notification</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_acknowledgment"
                  checked={formData.requires_acknowledgment}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_acknowledgment: checked })}
                />
                <Label htmlFor="requires_acknowledgment">Require acknowledgment</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_pinned"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                />
                <Label htmlFor="is_pinned">Pin announcement</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allow_comments"
                  checked={formData.allow_comments}
                  onCheckedChange={(checked) => setFormData({ ...formData, allow_comments: checked })}
                />
                <Label htmlFor="allow_comments">Allow comments</Label>
              </div>

              <div className="space-y-2">
                <Label>{t('common:priority')}</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
            loading={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
            loadingText={asString(initialData?.id) ? 'Updating...' : 'Creating...'}
          >
            <Save className="h-4 w-4 me-2" />
            {asString(initialData?.id) ? 'Update' : 'Create'} Announcement
          </LoadingButton>
        </div>
      </CardContent>
    </Card>
  )
}
