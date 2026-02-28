import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Icons } from '@/components/icons'
import type { User } from '@/lib/rbac'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface FeedItem {
  id: string
  type: 'sop_update' | 'training' | 'announcement' | 'task' | 'achievement' | 'hr_reminder' | 'recognition' | 'birthday'
  author: User
  title: string
  content: string
  timestamp: Date
  attachments?: string[]
  tags?: string[]
  reactions: Record<string, number>
  comments: Comment[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  department?: string
  actionButton?: {
    text: string
    onClick: () => void
  }
}

export interface Comment {
  id: string
  author: User
  content: string
  timestamp: Date
  reactions: Record<string, number>
}

interface SocialFeedProps {
  user: User
  feedItems: FeedItem[]
  onReact: (itemId: string, reaction: string) => void
  onComment: (itemId: string, content: string) => void
  onShare: (itemId: string) => void
}

export function SocialFeed({ user, feedItems, onReact, onComment, onShare }: SocialFeedProps) {
  const { t } = useTranslation('common')
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})

  const reactionTypes = ['like', 'love', 'clap', 'wow'] as const

  const getTypeIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'sop_update': return <Icons.FileText className="h-5 w-5 text-blue-500" />
      case 'training': return <Icons.GraduationCap className="h-5 w-5 text-emerald-500" />
      case 'announcement': return <Icons.Megaphone className="h-5 w-5 text-orange-500" />
      case 'task': return <Icons.CheckSquare className="h-5 w-5 text-indigo-500" />
      case 'achievement':
      case 'recognition': return <Icons.Trophy className="h-5 w-5 text-amber-500" />
      case 'hr_reminder': return <Icons.Bell className="h-5 w-5 text-rose-500" />
      case 'birthday': return <Icons.Heart className="h-5 w-5 text-pink-500" />
      default: return <Icons.FileText className="h-5 w-5 text-slate-500" />
    }
  }

  const getTypeStyle = (type: FeedItem['type']) => {
    switch (type) {
      case 'sop_update': return 'bg-blue-500'
      case 'training': return 'bg-emerald-500'
      case 'announcement': return 'bg-orange-500'
      case 'task': return 'bg-indigo-500'
      case 'achievement':
      case 'recognition': return 'bg-amber-500'
      case 'hr_reminder': return 'bg-rose-500'
      case 'birthday': return 'bg-pink-500'
      default: return 'bg-slate-500'
    }
  }

  const getPriorityColor = (priority?: FeedItem['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'low': return 'bg-blue-50 text-blue-700 border-blue-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  const handleCommentSubmit = (itemId: string) => {
    const comment = newComment[itemId]
    if (comment && comment.trim()) {
      onComment(itemId, comment)
      setNewComment(prev => ({ ...prev, [itemId]: '' }))
      toast.success(t('messages.comment_posted', 'Comment posted'))
    }
  }

  return (
    <div className="space-y-6">
      {feedItems.map((item) => {
        const typeStyleClass = getTypeStyle(item.type)

        return (
          <Card key={item.id} className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            {/* Top Accent Line */}
            <div className={cn("absolute top-0 left-0 right-0 h-1 opacity-80", typeStyleClass)} />

            <CardHeader className="pb-3 pt-6 px-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-slate-100">
                    <AvatarImage src={item.author.avatar} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                      {item.author.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 text-sm leading-none">
                      <h4 className="font-extrabold text-slate-900 text-base">{item.author.name}</h4>
                      {item.department && (
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider uppercase text-slate-500 border-slate-200 bg-slate-50 px-2 h-5">
                          {item.department}
                        </Badge>
                      )}
                      {item.priority && (
                        <Badge variant="outline" className={cn("text-[10px] font-bold tracking-wider uppercase px-2 h-5", getPriorityColor(item.priority))}>
                          {item.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mt-2">
                      <span>{item.author.department}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{formatDistanceToNow(item.timestamp)} {t('social.ago')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                    {getTypeIcon(item.type)}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
                    <Icons.MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-2 leading-tight">{item.title}</h3>
                  <p className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed text-[15px]">{item.content}</p>
                </div>

                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {item.attachments.map((attachment) => (
                      <div key={`${item.id}-attachment-${attachment}`} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                        <Icons.FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold text-slate-600">{attachment}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((tag) => (
                      <Badge key={`${item.id}-tag-${tag}`} variant="secondary" className="text-xs bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium border-0 px-2.5 py-0.5">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {item.actionButton && (
                  <div className="pt-2">
                    <Button
                      onClick={item.actionButton.onClick}
                      className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-xl px-6"
                    >
                      {item.actionButton.text}
                    </Button>
                  </div>
                )}

                <Separator className="bg-slate-100 my-4" />

                {/* Reactions & Actions bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      {reactionTypes.map((reaction) => {
                        const count = item.reactions[reaction] || 0
                        const isActive = count > 0

                        return (
                          <button
                            key={reaction}
                            onClick={() => onReact(item.id, reaction)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all select-none hover:bg-white hover:shadow-sm",
                              isActive ? "text-blue-600 bg-white shadow-sm" : "text-slate-500"
                            )}
                          >
                            {reaction === 'like' && <Icons.ThumbsUp className={cn("h-4 w-4", isActive && "fill-current")} />}
                            {reaction === 'love' && <Icons.Heart className={cn("h-4 w-4", isActive && "fill-current text-rose-500", !isActive && "group-hover:text-rose-500")} />}
                            {reaction === 'clap' && <Icons.Hand className={cn("h-4 w-4", isActive && "fill-current text-amber-500", !isActive && "group-hover:text-amber-500")} />}
                            {reaction === 'wow' && <Icons.Eye className={cn("h-4 w-4", isActive && "text-purple-500", !isActive && "group-hover:text-purple-500")} />}
                            {count > 0 && <span>{count}</span>}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setShowComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                        showComments[item.id] ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <Icons.MessageCircle className="h-4 w-4" />
                      <span>{item.comments.length} Comments</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onShare(item.id)
                        toast.success(t('messages.link_copied', 'Link copied to clipboard'))
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
                    >
                      <Icons.Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    <button className="flex items-center justify-center h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all">
                      <Icons.Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                <div className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  showComments[item.id] ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
                )}>
                  <div className="overflow-hidden space-y-4">

                    {/* Existing Comments */}
                    {item.comments.length > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
                        {item.comments.map((comment, index) => (
                          <div key={comment.id}>
                            {index > 0 && <Separator className="mb-4 bg-slate-200" />}
                            <div className="flex gap-3">
                              <Avatar className="h-8 w-8 ring-1 ring-slate-200">
                                <AvatarImage src={comment.author.avatar} />
                                <AvatarFallback className="bg-white text-slate-600 font-bold text-xs">
                                  {comment.author.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="bg-white rounded-2xl rounded-tl-none p-3.5 shadow-sm border border-slate-100">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-[13px] text-slate-800">{comment.author.name}</span>
                                    <span className="text-[11px] font-semibold text-slate-400">
                                      {formatDistanceToNow(comment.timestamp)} {t('social.ago')}
                                    </span>
                                  </div>
                                  <p className="text-[13px] font-medium text-slate-600 leading-relaxed">{comment.content}</p>
                                </div>

                                {/* Comment Reactions */}
                                <div className="flex items-center gap-3 mt-2 px-2">
                                  <button className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors">Like</button>
                                  <button className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">Reply</button>
                                  {Object.keys(comment.reactions).length > 0 && (
                                    <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm ml-auto">
                                      <Icons.ThumbsUp className="h-3 w-3 text-blue-500 fill-current" />
                                      <span className="text-[10px] font-bold text-slate-600">{Object.values(comment.reactions).reduce((a, b) => a + b, 0)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Input */}
                    <div className="flex gap-3 pt-2">
                      <Avatar className="h-10 w-10 ring-1 ring-slate-200 shadow-sm">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-white text-slate-600 font-bold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder="Write a comment..."
                          value={newComment[item.id] || ''}
                          onChange={(e) => setNewComment(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="min-h-[50px] resize-none pr-24 rounded-xl border-slate-200 focus-visible:ring-blue-500 shadow-sm bg-slate-50 focus:bg-white transition-colors"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCommentSubmit(item.id);
                            }
                          }}
                        />
                        <div className="absolute right-2 bottom-2">
                          <Button
                            size="sm"
                            className="h-8 shadow-sm font-bold tracking-wide rounded-lg"
                            onClick={() => handleCommentSubmit(item.id)}
                            disabled={!newComment[item.id]?.trim()}
                          >
                            Post
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
