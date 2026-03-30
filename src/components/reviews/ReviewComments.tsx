import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Send, MessageCircle, Clock, AtSign, Paperclip, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

interface Comment {
  id: string
  review_id: string
  user_id: string
  user_name: string
  user_role?: string
  content: string
  created_at: string
  mentions?: string[]
  attachments?: string[]
}

interface ReviewCommentsProps {
  reviewId: string
  className?: string
}

export function ReviewComments({ reviewId, className }: ReviewCommentsProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')
  const [showMentions, setShowMentions] = useState(false)

  // Fetch comments from backend
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['guest-review-comments', reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_review_comments')
        .select(`
          id,
          review_id,
          user_id,
          content,
          mentions,
          attachments,
          created_at,
          profiles:user_id (full_name, job_title)
        `)
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        review_id: item.review_id,
        user_id: item.user_id,
        user_name: item.profiles?.full_name || 'Unknown',
        user_role: item.profiles?.job_title || 'Staff',
        content: item.content,
        created_at: item.created_at,
        mentions: item.mentions || [],
        attachments: item.attachments || [],
      })) as Comment[]
    },
    enabled: !!reviewId,
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const mentions = content.match(/@(\w+)/g)?.map((m) => m.slice(1)) || []
      
      const { data, error } = await supabase
        .from('guest_review_comments')
        .insert({
          review_id: reviewId,
          user_id: user?.id,
          content: content.trim(),
          mentions,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['guest-review-comments', reviewId] })
      // Also log activity
      try {
        await supabase.rpc('log_review_activity', {
          p_review_id: reviewId,
          p_action: 'commented',
          p_details: { user_id: user?.id },
        })
      } catch {
        // Ignore RPC errors
      }
      setNewComment('')
    },
    onError: (error) => {
      toast({
        title: 'Failed to post comment',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('guest_review_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-review-comments', reviewId] })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete comment',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    addCommentMutation.mutate(newComment)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
    if (e.key === '@') {
      setShowMentions(true)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Internal Discussion
        </h3>
        <Badge variant="secondary" className="text-xs">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </Badge>
      </div>

      {/* Comments List */}
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">Be the first to add a comment</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {comment.user_name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.user_name}</span>
                      {comment.user_role && (
                        <span className="text-[10px] text-muted-foreground">
                          {comment.user_role}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {(user?.id === comment.user_id || profile?.job_title?.includes('Manager')) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-sm leading-relaxed">
                      {renderCommentContent(comment.content)}
                    </div>
                    
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {comment.attachments.map((attachment) => (
                          <Badge key={attachment} variant="outline" className="text-[10px]">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {attachment}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Comment */}
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... Use @ to mention someone, Ctrl+Enter to post"
            className="min-h-[80px] text-sm resize-none pr-12"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setShowMentions(!showMentions)}
            >
              <AtSign className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {newComment.length > 0 && `${newComment.length} characters`}
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="h-8"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>

      {/* Mention Dropdown (simplified) */}
      {showMentions && (
        <div className="absolute z-50 bg-popover border rounded-md shadow-lg p-2 max-h-[150px] overflow-auto">
          <p className="text-xs text-muted-foreground mb-2">Type @username to mention</p>
          <div className="space-y-1">
            {['maintenance-team', 'front-desk', 'housekeeping', 'gm', 'sales'].map((user) => (
              <button
                key={user}
                onClick={() => {
                  setNewComment((prev) => prev + `@${user} `)
                  setShowMentions(false)
                }}
                className="w-full text-left px-2 py-1 text-xs hover:bg-muted rounded"
              >
                @{user}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to render comment content with highlighted mentions
function renderCommentContent(content: string) {
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-primary font-medium bg-primary/10 px-1 rounded">
          {part}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}
