import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
    ArrowLeft, Pin, Loader2, CheckCircle, Calendar, User,
    MessageCircle, Users, AlertTriangle, Send, ThumbsUp, BarChart2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { Announcement } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

export default function AnnouncementDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { profile } = useAuth()
    const queryClient = useQueryClient()
    const { t, i18n } = useTranslation('announcements')
    const [newComment, setNewComment] = useState('')

    // Fetch announcement details
    const { data: announcement, isLoading, error } = useQuery({
        queryKey: ['announcement', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    created_by_profile:profiles!announcements_created_by_fkey(id, full_name, avatar_url)
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data as Announcement & {
                created_by_profile?: { id: string; full_name: string; avatar_url?: string }
                requires_acknowledgment?: boolean
                allow_comments?: boolean
                category?: string
            }
        }
    })

    // Check if already read
    const { data: isRead } = useQuery({
        queryKey: ['announcement-read', id, profile?.id],
        enabled: !!id && !!profile?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcement_reads')
                .select('id')
                .eq('announcement_id', id)
                .eq('user_id', profile!.id)
                .maybeSingle()

            if (error) throw error
            return !!data
        }
    })

    // Check if already acknowledged
    const { data: hasAcknowledged } = useQuery({
        queryKey: ['announcement-acknowledged', id, profile?.id],
        enabled: !!id && !!profile?.id && !!announcement?.requires_acknowledgment,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcement_acknowledgments')
                .select('id')
                .eq('announcement_id', id)
                .eq('user_id', profile!.id)
                .maybeSingle()

            if (error) throw error
            return !!data
        }
    })

    // Fetch acknowledgments list
    const { data: acknowledgments = [] } = useQuery({
        queryKey: ['announcement-acknowledgments', id],
        enabled: !!id && !!announcement?.requires_acknowledgment,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcement_acknowledgments')
                .select(`
                    id,
                    acknowledged_at,
                    user:profiles!announcement_acknowledgments_user_id_fkey(id, full_name, avatar_url)
                `)
                .eq('announcement_id', id)
                .order('acknowledged_at', { ascending: false })

            if (error) throw error
            return data || []
        }
    })

    // Fetch comments
    const { data: comments = [] } = useQuery({
        queryKey: ['announcement-comments', id],
        enabled: !!id && !!announcement?.allow_comments,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcement_comments')
                .select(`
                    id,
                    content,
                    created_at,
                    user:profiles!announcement_comments_user_id_fkey(id, full_name, avatar_url)
                `)
                .eq('announcement_id', id)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data || []
        }
    })

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async () => {
            if (!profile?.id || !id) return

            const { error: readError } = await supabase
                .from('announcement_reads')
                .upsert(
                    { user_id: profile.id, announcement_id: id },
                    { onConflict: 'user_id,announcement_id' }
                )

            if (readError) throw readError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcement-read', id] })
            queryClient.invalidateQueries({ queryKey: ['announcement-reads'] })
            toast.success(t('toast.marked_read', 'Marked as read!'))
        }
    })

    // Acknowledge mutation
    const acknowledgeMutation = useMutation({
        mutationFn: async () => {
            if (!profile?.id || !id) return

            const { error } = await supabase
                .from('announcement_acknowledgments')
                .upsert(
                    { user_id: profile.id, announcement_id: id },
                    { onConflict: 'announcement_id,user_id' }
                )

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcement-acknowledged', id] })
            queryClient.invalidateQueries({ queryKey: ['announcement-acknowledgments', id] })
            toast.success(t('toast.acknowledged', 'Announcement acknowledged!'))
        }
    })

    // Add comment mutation
    const addCommentMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!profile?.id || !id) return

            const { error } = await supabase
                .from('announcement_comments')
                .insert({ user_id: profile.id, announcement_id: id, content })

            if (error) throw error
        },
        onSuccess: () => {
            setNewComment('')
            queryClient.invalidateQueries({ queryKey: ['announcement-comments', id] })
            toast.success(t('toast.comment_added', 'Comment added!'))
        }
    })

    // Auto-mark as read when viewing
    useEffect(() => {
        if (announcement && profile?.id && isRead === false) {
            markAsReadMutation.mutate()
        }
    }, [announcement, profile?.id, isRead])

    const isRTL = i18n.dir() === 'rtl'

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-hotel-gold" />
            </div>
        )
    }

    if (error || !announcement) {
        return (
            <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                <PageHeader
                    title={t('detail.not_found', 'Announcement Not Found')}
                    actions={
                        <Button variant="outline" onClick={() => navigate('/announcements')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t('actions.back', 'Back')}
                        </Button>
                    }
                />
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                        {t('detail.not_found_message', 'This announcement may have been deleted or you don\'t have access to it.')}
                    </CardContent>
                </Card>
            </div>
        )
    }

    const priorityStyles = {
        normal: '',
        important: 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
        critical: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20',
    }

    // Check if current user can view analytics (creator or manager roles)
    const canViewAnalytics = profile?.id === announcement.created_by ||
        ['regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head'].some(
            role => ((profile as any)?.roles || []).includes(role)
        )

    return (
        <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <PageHeader
                title={announcement.title}
                actions={
                    <div className="flex items-center gap-2">
                        {canViewAnalytics && (
                            <Button variant="outline" onClick={() => navigate(`/announcements/${id}/analytics`)}>
                                <BarChart2 className="w-4 h-4 mr-2" />
                                View Analytics
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => navigate('/announcements')}>
                            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                            {t('actions.back', 'Back')}
                        </Button>
                    </div>
                }
            />

            {/* Main Content Card */}
            <Card className={priorityStyles[announcement.priority] || ''}>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            {announcement.pinned && (
                                <Badge variant="secondary" className="bg-hotel-gold/20 text-hotel-gold border-hotel-gold/30">
                                    <Pin className="w-3 h-3 mr-1" />
                                    {t('status.pinned', 'Pinned')}
                                </Badge>
                            )}
                            <CardTitle className="text-2xl">{announcement.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {isRead && (
                                <Badge variant="outline" className="text-green-600 border-green-600/30">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {t('status.read', 'Read')}
                                </Badge>
                            )}
                            <PriorityBadge priority={announcement.priority} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Priority Alert for Critical */}
                    {announcement.priority === 'critical' && (
                        <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-medium">Critical Announcement - Please Read Carefully</span>
                        </div>
                    )}

                    {/* Content */}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap text-base leading-relaxed">{announcement.content}</p>
                    </div>

                    {/* Attachments */}
                    {announcement.attachments && Array.isArray(announcement.attachments) && announcement.attachments.length > 0 && (
                        <div className="pt-4 border-t">
                            <h4 className="font-medium mb-3">{t('detail.attachments', 'Attachments')}</h4>
                            <div className="flex flex-wrap gap-2">
                                {announcement.attachments.map((attachment: any, index: number) => (
                                    <a
                                        key={index}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors flex items-center gap-2"
                                    >
                                        📎 {attachment.name || `Attachment ${index + 1}`}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="pt-4 border-t flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(announcement.created_at).toLocaleString()}</span>
                        </div>
                        {announcement.created_by_profile && (
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={announcement.created_by_profile.avatar_url} />
                                    <AvatarFallback>
                                        <User className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <span>{announcement.created_by_profile.full_name}</span>
                            </div>
                        )}
                        {announcement.category && (
                            <Badge variant="outline">
                                {announcement.category}
                            </Badge>
                        )}
                    </div>

                    {/* Acknowledgment Section */}
                    {announcement.requires_acknowledgment && (
                        <div className="pt-4 border-t">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <ThumbsUp className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-amber-800 dark:text-amber-200">
                                            {t('detail.acknowledgment_required', 'Acknowledgment Required')}
                                        </h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                            {t('detail.acknowledgment_prompt', 'Please acknowledge that you have read this announcement.')}
                                        </p>
                                        {!hasAcknowledged ? (
                                            <Button
                                                onClick={() => acknowledgeMutation.mutate()}
                                                disabled={acknowledgeMutation.isPending}
                                                className="mt-3"
                                                size="sm"
                                            >
                                                {acknowledgeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                <ThumbsUp className="w-4 h-4 mr-2" />
                                                {t('detail.acknowledge_button', 'I Acknowledge')}
                                            </Button>
                                        ) : (
                                            <Badge variant="default" className="mt-3 bg-green-600">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                {t('detail.acknowledged', 'Acknowledged')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Acknowledgments List */}
                            {acknowledgments.length > 0 && (
                                <div className="mt-4">
                                    <button
                                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                                        onClick={() => { }}
                                    >
                                        <Users className="w-4 h-4" />
                                        {t('detail.acknowledgments_count', { count: acknowledgments.length })} ({acknowledgments.length})
                                    </button>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {acknowledgments.slice(0, 10).map((ack: any) => (
                                            <div key={ack.id} className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1 text-xs">
                                                <Avatar className="h-4 w-4">
                                                    <AvatarImage src={ack.user?.avatar_url} />
                                                    <AvatarFallback className="text-[8px]">
                                                        {ack.user?.full_name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span>{ack.user?.full_name}</span>
                                            </div>
                                        ))}
                                        {acknowledgments.length > 10 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{acknowledgments.length - 10} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mark as Read (if not auto-read) */}
                    {!isRead && !announcement.requires_acknowledgment && (
                        <div className="pt-4 border-t">
                            <Button
                                onClick={() => markAsReadMutation.mutate()}
                                disabled={markAsReadMutation.isPending}
                            >
                                {markAsReadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t('actions.markRead', 'Mark as Read')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Comments Section */}
            {announcement.allow_comments && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            {t('detail.comments', 'Comments')} ({comments.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Add Comment */}
                        <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback>
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                                <Textarea
                                    placeholder={t('detail.add_comment', 'Add a comment...')}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    rows={2}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => addCommentMutation.mutate(newComment)}
                                    disabled={!newComment.trim() || addCommentMutation.isPending}
                                >
                                    {addCommentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <Send className="w-4 h-4 mr-2" />
                                    {t('detail.post_comment', 'Post')}
                                </Button>
                            </div>
                        </div>

                        {/* Comments List */}
                        {comments.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">
                                {t('detail.no_comments', 'No comments yet. Be the first to comment!')}
                            </p>
                        ) : (
                            <div className="space-y-4 pt-4 border-t">
                                {comments.map((comment: any) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.user?.avatar_url} />
                                            <AvatarFallback>
                                                {comment.user?.full_name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{comment.user?.full_name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-1">{comment.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
