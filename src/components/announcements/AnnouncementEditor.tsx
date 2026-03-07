import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Image,
  Video,
  FileText,
  Target,
  Users,
  Save,
  X,
  Trash2,
  Building,
  MapPin
} from 'lucide-react'
import { toast } from 'sonner'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { announcementSchema } from '@/lib/validationSchemas'
import { LoadingButton } from '@/components/loading'
import { useTranslation } from "react-i18next";

interface AnnouncementEditorProps {
  initialData?: any
  onClose?: () => void
  onSave?: (announcement: any) => void
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

export function AnnouncementEditor({ initialData, onClose, onSave }: AnnouncementEditorProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    category: initialData?.category || 'general',
    priority: initialData?.priority || 'normal',
    is_scheduled: initialData?.is_scheduled || false,
    scheduled_at: initialData?.scheduled_at || '',
    expires_at: initialData?.expires_at || '',
    send_push_notification: initialData?.send_push_notification || true,
    send_email: initialData?.send_email || false,
    requires_acknowledgment: initialData?.requires_acknowledgment || false,
    is_pinned: initialData?.is_pinned || false,
    allow_comments: initialData?.allow_comments || true
  })

  const [targetAudience, setTargetAudience] = useState<TargetAudience>(
    initialData?.target_audience || { type: 'all', values: [] }
  )

  const [attachments, setAttachments] = useState<MediaAttachment[]>(
    initialData?.attachments || []
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
      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.property?.name ? `${d.name} (${d.property.name})` : d.name
      }))
    }
  })

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id,name')
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
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('announcements')
        .insert({
          ...data,
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
                .eq('role', role)
              if (roleUsers) {
                targetUserIds.push(...roleUsers.map(u => u.user_id))
              }
            }
            break

          case 'department':
            for (const deptId of values) {
              const { data: deptUsers } = await supabase
                .from('user_departments')
                .select('user_id')
                .eq('department_id', deptId)
              if (deptUsers) {
                targetUserIds.push(...deptUsers.map(u => u.user_id))
              }
            }
            break

          case 'property':
            for (const propId of values) {
              const { data: propUsers } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', propId)
              if (propUsers) {
                targetUserIds.push(...propUsers.map(u => u.user_id))
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
          const { createBulkNotifications } = await import('@/lib/notificationService')
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
    mutationFn: async (data: any) => {
      // Extract send_push_notification and send_email from data before passing to update
      const { send_push_notification, send_email, ...updateData } = data;

      const { data: result, error } = await supabase
        .from('announcements')
        .update({
          ...updateData,

        })
        .eq('id', initialData.id)
        .select()
        .single()

      if (error) throw error

      // Send notifications to target audience if toggle is checked
      if (send_push_notification) {
        const targetUserIds: string[] = []
        const audience = updateData.target_audience
        const announcementTitle = updateData.title || 'Updated Announcement'

        if (audience && audience.type !== 'all') {
          const values = audience.values || []
          switch (audience.type) {
            case 'role':
              for (const role of values) {
                const { data: roleUsers } = await supabase
                  .from('user_roles')
                  .select('user_id')
                  .eq('role', role)
                if (roleUsers) targetUserIds.push(...roleUsers.map(u => u.user_id))
              }
              break
            case 'department':
              for (const deptId of values) {
                const { data: deptUsers } = await supabase
                  .from('user_departments')
                  .select('user_id')
                  .eq('department_id', deptId)
                if (deptUsers) targetUserIds.push(...deptUsers.map(u => u.user_id))
              }
              break
            case 'property':
              for (const propId of values) {
                const { data: propUsers } = await supabase
                  .from('user_properties')
                  .select('user_id')
                  .eq('property_id', propId)
                if (propUsers) targetUserIds.push(...propUsers.map(u => u.user_id))
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
            const { createBulkNotifications } = await import('@/lib/notificationService')
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
        .from('attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath)

      return {
        id: crypto.randomUUID(),
        type: file.type.startsWith('image/') ? 'image' :
          file.type.startsWith('video/') ? 'video' : 'document',
        url: publicUrl,
        name: file.name,
        size: file.size
      }
    })

    try {
      const newAttachments = await Promise.all(uploadPromises)
      setAttachments([...attachments, ...newAttachments as MediaAttachment[]])
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

      if (initialData?.id) {
        updateAnnouncementMutation.mutate(announcementData)
      } else {
        createAnnouncementMutation.mutate(announcementData)
      }
    } catch (e: any) {
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
          <span>{initialData?.id ? 'Edit Announcement' : 'Create Announcement'}</span>
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
                    onClick={() => setTargetAudience({ type: value as any, values: [] })}
                    className="h-12"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </Button>
                ))}
              </div>

              {targetAudience.type !== 'all' && (
                <div className="space-y-2">
                  <Label>Select {targetAudience.type === 'role' ? 'Roles' : targetAudience.type === 'department' ? 'Departments' : 'Properties'}</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {getAudienceOptions().map((option: any) => (
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
            loadingText={initialData?.id ? 'Updating...' : 'Creating...'}
          >
            <Save className="h-4 w-4 mr-2" />
            {initialData?.id ? 'Update' : 'Create'} Announcement
          </LoadingButton>
        </div>
      </CardContent>
    </Card>
  )
}
