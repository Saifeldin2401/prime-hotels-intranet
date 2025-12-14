import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pin, Loader2 } from 'lucide-react'
import type { Announcement } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { PullToRefresh } from '@/components/mobile'

type PriorityValue = Announcement['priority']

export default function AnnouncementFeed() {
  const { profile, primaryRole } = useAuth()
  const queryClient = useQueryClient()
  const { t } = useTranslation('announcements')

  const priorityOptions: { value: PriorityValue; label: string }[] = [
    { value: 'normal', label: t('priority.normal') },
    { value: 'important', label: t('priority.important') },
    { value: 'critical', label: t('priority.critical') },
  ]

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Announcement[]
    },
  })

  const { data: readIds } = useQuery({
    queryKey: ['announcement-reads', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return [] as string[]
      const { data, error } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', profile.id)

      if (error) throw error
      return (data || []).map((r) => r.announcement_id as string)
    },
  })

  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<PriorityValue>('normal')
  const [pinned, setPinned] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const resetForm = () => {
    setEditingAnnouncement(null)
    setTitle('')
    setContent('')
    setPriority('normal')
    setPinned(false)
    setScheduledAt('')
    setExpiresAt('')
  }

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !content.trim()) throw new Error('Title and content are required')

      const payload = {
        title: title.trim(),
        content: content.trim(),
        priority,
        pinned,
        scheduled_at: scheduledAt || null,
        expires_at: expiresAt || null,
      }

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingAnnouncement.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!profile?.id) return
      const { error } = await supabase
        .from('announcement_reads')
        .upsert(
          { user_id: profile.id, announcement_id: announcementId },
          { onConflict: 'user_id,announcement_id' },
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-reads', profile?.id] })
    },
  })

  const startCreate = () => {
    resetForm()
  }

  const startEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setTitle(announcement.title)
    setContent(announcement.content)
    setPriority(announcement.priority)
    setPinned(announcement.pinned)
    setScheduledAt(announcement.scheduled_at || '')
    setExpiresAt(announcement.expires_at || '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (upsertMutation.isPending) return
    upsertMutation.mutate()
  }

  const handleMarkAsRead = (announcementId: string) => {
    if (readIds?.includes(announcementId)) return
    markAsReadMutation.mutate(announcementId)
  }

  const isAdmin = primaryRole && ['regional_admin', 'regional_hr'].includes(primaryRole)

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['announcements'] })
    await queryClient.invalidateQueries({ queryKey: ['announcement-reads', profile?.id] })
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            isAdmin && (
              <Button onClick={startCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t('create')}
              </Button>
            )
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
                  </div>
                ) : announcements && announcements.length > 0 ? (
                  <div className="space-y-4">
                    {announcements.map((announcement) => {
                      const isRead = readIds?.includes(announcement.id)
                      const priorityColor = {
                        normal: '',
                        important: 'border-yellow-400 bg-yellow-50',
                        critical: 'border-red-400 bg-red-50',
                      }[announcement.priority]
                      return (
                        <div
                          key={announcement.id}
                          className={`p-4 border rounded-lg hover:bg-accent ${priorityColor}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {announcement.pinned && <Pin className="w-4 h-4" />}
                              <h3 className="font-semibold">{announcement.title}</h3>
                            </div>
                            <PriorityBadge priority={announcement.priority} />
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>{new Date(announcement.created_at).toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                              {!isRead && (
                                <Button
                                  size="sm"
                                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                                  onClick={() => handleMarkAsRead(announcement.id)}
                                  disabled={markAsReadMutation.isPending}
                                >
                                  {t('actions.markRead')}
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                                  onClick={() => startEdit(announcement)}
                                >
                                  {t('actions.edit')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    {t('noAnnouncements')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {isAdmin && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>{editingAnnouncement ? t('edit') : t('create')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('form.title')}</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">{t('form.content')}</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('form.priority')}</Label>
                    <Select value={priority} onValueChange={(v: PriorityValue) => setPriority(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pinned"
                      checked={pinned}
                      onChange={(e) => setPinned(e.target.checked)}
                    />
                    <Label htmlFor="pinned">{t('form.pinned')}</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">{t('form.schedule')}</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">{t('form.expires')}</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingAnnouncement && (
                      <Button
                        type="button"
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                        onClick={resetForm}
                        disabled={upsertMutation.isPending}
                      >
                        {t('form.cancel')}
                      </Button>
                    )}
                    <Button type="submit" disabled={upsertMutation.isPending}>
                      {upsertMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {upsertMutation.isPending
                        ? t('form.saving')
                        : editingAnnouncement
                          ? t('update')
                          : t('create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}

