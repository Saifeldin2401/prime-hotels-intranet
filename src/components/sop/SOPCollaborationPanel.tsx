import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  ThumbsUp, 
  Reply, 
  Send, 
  Users, 
  Clock,
  Edit3,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface Comment {
  id: string
  content: string
  user_id: string
  user_name: string
  user_avatar?: string
  created_at: string
  updated_at?: string
  replies?: Comment[]
  likes: number
  is_liked_by_user?: boolean
  resolved?: boolean
  resolved_by?: string
  resolved_at?: string
}

interface SOPCollaborationPanelProps {
  sopId: string
  className?: string
}

export function SOPCollaborationPanel({ sopId, className }: SOPCollaborationPanelProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const { data: comments, isLoading } = useQuery({
    queryKey: ['sop-comments', sopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_comments')
        .select(`
          *,
          user:user_id(id, full_name, avatar_url),
          replies:sop_comments_replies(id, content, user_id, user_name, user_avatar, created_at, updated_at),
          likes:sop_comment_likes(user_id)
        `)
        .eq('sop_id', sopId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Comment[]
    }
  })

  const { data: activeUsers } = useQuery({
    queryKey: ['sop-active-users', sopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_viewers')
        .select(`
          user_id,
          user:user_id(id, full_name, avatar_url),
          last_seen_at
        `)
        .eq('sop_id', sopId)
        .gte('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .limit(5)

      if (error) throw error
      return data
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { data, error } = await supabase
        .from('sop_comments')
        .insert({
          sop_id: sopId,
          content,
          user_id: user?.id,
          parent_id: parentId,
          user_name: user?.user_metadata?.full_name || 'Unknown User',
          user_avatar: user?.user_metadata?.avatar_url
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-comments', sopId] })
      setNewComment('')
      setReplyingTo(null)
      setReplyText('')
    }
  })

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('sop_comment_likes')
        .upsert({
          comment_id: commentId,
          user_id: user?.id
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-comments', sopId] })
    }
  })

  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('sop_comments')
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-comments', sopId] })
    }
  })

  const handleSubmitComment = () => {
    if (!newComment.trim()) return
    addCommentMutation.mutate({ content: newComment })
  }

  const handleSubmitReply = (parentId: string) => {
    if (!replyText.trim()) return
    addCommentMutation.mutate({ content: replyText, parentId })
  }

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={cn("space-y-2", isReply && "ml-8 mt-2")}>
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user_avatar} />
          <AvatarFallback>{comment.user_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.user_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.resolved && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            comment.resolved ? "bg-muted/50" : "bg-muted"
          )}>
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => likeCommentMutation.mutate(comment.id)}
              disabled={likeCommentMutation.isPending}
              className="h-8 px-2"
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              {comment.likes || 0}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(comment.id)}
              className="h-8 px-2"
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>
            {!comment.resolved && !isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resolveCommentMutation.mutate(comment.id)}
                className="h-8 px-2"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            )}
          </div>
          
          {replyingTo === comment.id && (
            <div className="space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyText.trim() || addCommentMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Collaboration & Discussion
          </div>
          {activeUsers && activeUsers.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {activeUsers.length} viewing
              </span>
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((activeUser) => (
                  <Avatar key={activeUser.user_id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={activeUser.user?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {activeUser.user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activeUsers.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs">+{activeUsers.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment or suggestion..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>

        <Separator />

        {/* Comments List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading comments...
            </div>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Start the discussion!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
