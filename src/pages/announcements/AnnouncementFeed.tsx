import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { Plus, Pin, Loader2, Trash2 } from 'lucide-react'
import type { Announcement } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { PullToRefresh } from '@/components/mobile'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AnnouncementEditor } from '@/components/announcements/AnnouncementEditor'
import { DeleteConfirmation } from '@/components/shared/DeleteConfirmation'

export default function AnnouncementFeed() {
  const { user, profile, primaryRole, roles, properties, departments } = useAuth()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('announcements')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [deleteData, setDeleteData] = useState<Announcement | null>(null)

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
    select: (data) => {
      if (!data) return []

      return data.filter(announcement => {
        // Always show if user is the creator
        if (announcement.created_by === user?.id) return true

        // Show if target audience is 'all' or missing
        const audience = announcement.target_audience
        if (!audience || audience.type === 'all') return true

        const values = audience.values || []

        switch (audience.type) {
          case 'role':
            return roles.some(userRole => values.includes(userRole.role))

          case 'department':
            return departments.some(dept => values.includes(dept.id))

          case 'property':
            return properties.some(prop => values.includes(prop.id))

          case 'individual':
            return values.includes(user?.id || '')

          default:
            return true
        }
      })
    }
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setDeleteData(null)
    }
  })

  const handleCreate = () => {
    setEditingAnnouncement(null)
    setIsEditorOpen(true)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setIsEditorOpen(true)
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    setEditingAnnouncement(null)
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

  const isRTL = i18n.dir() === 'rtl'

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            isAdmin && (
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t('create')}
              </Button>
            )
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
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
                      }[announcement.priority] || ''
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
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                                    onClick={() => handleEdit(announcement)}
                                  >
                                    {t('actions.edit')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-md transition-colors"
                                    onClick={() => setDeleteData(announcement)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
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

        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden" aria-describedby="announcement-editor-desc">
            <DialogTitle className="sr-only">{editingAnnouncement ? t('edit') : t('create')}</DialogTitle>
            <DialogDescription id="announcement-editor-desc" className="sr-only">
              Form to create or edit an announcement
            </DialogDescription>
            <AnnouncementEditor
              initialData={editingAnnouncement || undefined}
              onClose={handleEditorClose}
              onSave={handleRefresh}
            />
          </DialogContent>
        </Dialog>

        <DeleteConfirmation
          open={!!deleteData}
          onOpenChange={(open) => !open && setDeleteData(null)}
          onConfirm={() => deleteData && deleteMutation.mutate(deleteData.id)}
          itemName={deleteData?.title || ''}
          itemType={t('announcement')}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </PullToRefresh>
  )
}
