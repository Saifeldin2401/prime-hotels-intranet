import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Send, 
  Calendar, 
  Clock, 
  Image, 
  Video, 
  FileText, 
  Target, 
  Users, 
  Eye,
  Bell,
  Settings,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id,name')
      if (error) throw error
      return data
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

  const { data: roles } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('id,name')
      if (error) throw error
      return data
    }
  })

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('announcements')
        .insert({
          ...data,
          created_by: user?.id,
          updated_by: user?.id
        })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement created successfully')
      onSave?.(data)
      onClose?.()
    },
    onError: (error) => {
      toast.error('Failed to create announcement')
    }
  })

  const updateAnnouncementMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase
        .from('announcements')
        .update({
          ...data,
          updated_by: user?.id
        })
        .eq('id', initialData.id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Announcement updated successfully')
      onSave?.(data)
      onClose?.()
    },
    onError: (error) => {
      toast.error('Failed to update announcement')
    }
  })

  const handleFileUpload = async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `announcements/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath)

      return {
        id: Math.random().toString(36),
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
      toast.error('Failed to upload files')
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(att => att.id !== id))
  }

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    const announcementData = {
      ...formData,
      target_audience,
      attachments,
      scheduled_at: formData.is_scheduled ? formData.scheduled_at : null,
      expires_at: formData.expires_at || null
    }

    if (initialData?.id) {
      updateAnnouncementMutation.mutate(announcementData)
    } else {
      createAnnouncementMutation.mutate(announcementData)
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
          <TabsList className="grid w-full grid-cols-4">
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
              <Label htmlFor="category">Category</Label>
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
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
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
          <Button
            onClick={handleSubmit}
            disabled={createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {initialData?.id ? 'Update' : 'Create'} Announcement
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
