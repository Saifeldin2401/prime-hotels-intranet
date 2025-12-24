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
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Image,
  Video,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  Award,
  AlertCircle,
  CheckCircle,
  ThumbsUp,
  Laugh,
  Star
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

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

  const getTypeIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'sop_update':
        return <Icons.FileText className="h-5 w-5 text-blue-500" />
      case 'training':
        return <Icons.GraduationCap className="h-5 w-5 text-green-500" />
      case 'announcement':
        return <Icons.Megaphone className="h-5 w-5 text-orange-500" />
      case 'task':
        return <Icons.CheckSquare className="h-5 w-5 text-purple-500" />
      case 'achievement':
      case 'recognition':
        return <Icons.Trophy className="h-5 w-5 text-yellow-500" />
      case 'hr_reminder':
        return <Icons.Bell className="h-5 w-5 text-red-500" />
      case 'birthday':
        return <Icons.Heart className="h-5 w-5 text-pink-500" />
      default:
        return <Icons.FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeColor = (type: FeedItem['type']) => {
    switch (type) {
      case 'sop_update':
        return 'border-blue-200 bg-blue-50'
      case 'training':
        return 'border-green-200 bg-green-50'
      case 'announcement':
        return 'border-orange-200 bg-orange-50'
      case 'task':
        return 'border-purple-200 bg-purple-50'
      case 'achievement':
      case 'recognition':
        return 'border-yellow-200 bg-yellow-50'
      case 'hr_reminder':
        return 'border-red-200 bg-red-50'
      case 'birthday':
        return 'border-pink-200 bg-pink-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityColor = (priority?: FeedItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return ''
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
      {feedItems.map((item) => (
        <Card key={item.id} className={`social-feed-card ${getTypeColor(item.type)}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="social-feed-avatar">
                  <AvatarImage src={item.author.avatar} />
                  <AvatarFallback>
                    {item.author.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{item.author.name}</h4>
                    {item.department && (
                      <Badge variant="secondary" className="text-xs">
                        {item.department}
                      </Badge>
                    )}
                    {item.priority && (
                      <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{item.author.department}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(item.timestamp)} {t('social.ago')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getTypeIcon(item.type)}
                <Button variant="ghost" size="sm">
                  <Icons.MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
              </div>

              {item.attachments && item.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                      <Icons.FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{attachment}</span>
                    </div>
                  ))}
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {item.actionButton && (
                <Button
                  onClick={item.actionButton.onClick}
                  className="w-full sm:w-auto"
                >
                  {item.actionButton.text}
                </Button>
              )}

              <Separator />

              {/* Reactions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {Object.entries(item.reactions).map(([reaction, count]) => (
                      <button
                        key={reaction}
                        onClick={() => onReact(item.id, reaction)}
                        className={`social-reaction-btn ${item.reactions[reaction] > 0 ? 'active' : ''}`}
                      >
                        {reaction === 'like' && <Icons.ThumbsUp className="h-4 w-4" />}
                        {reaction === 'love' && <Icons.Heart className="h-4 w-4" />}
                        {reaction === 'clap' && <Icons.Hand className="h-4 w-4" />}
                        {reaction === 'wow' && <Icons.Eye className="h-4 w-4" />}
                        <span className="text-sm">{count}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className="social-reaction-btn"
                  >
                    <Icons.MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{item.comments.length}</span>
                  </button>

                  <button
                    onClick={() => {
                      onShare(item.id)
                      toast.success(t('messages.link_copied', 'Link copied to clipboard'))
                    }}
                    className="social-reaction-btn"
                  >
                    <Icons.Share2 className="h-4 w-4" />
                    <span className="text-sm">{t('social.share')}</span>
                  </button>
                </div>

                <button className="social-reaction-btn">
                  <Icons.Bookmark className="h-4 w-4" />
                  <span className="text-sm">{t('social.save')}</span>
                </button>
              </div>

              {/* Comments Section */}
              {showComments[item.id] && (
                <div className="space-y-4">
                  <Separator />

                  {/* Existing Comments */}
                  {item.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author.avatar} />
                        <AvatarFallback>
                          {comment.author.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">{comment.author.name}</span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(comment.timestamp)} {t('social.ago')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>

                        {/* Comment Reactions */}
                        {Object.keys(comment.reactions).length > 0 && (
                          <div className="flex items-center space-x-2 mt-1">
                            {Object.entries(comment.reactions).map(([reaction, count]) => (
                              <button
                                key={reaction}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                {reaction} {count}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Comment */}
                  <div className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder={t('social.write_comment')}
                        value={newComment[item.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="min-h-[60px]"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleCommentSubmit(item.id)}
                          disabled={!newComment[item.id]?.trim()}
                        >
                          {t('social.post_comment')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))
      }
    </div >
  )
}
