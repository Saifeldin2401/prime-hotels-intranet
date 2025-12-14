import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  useMessage,
  useSendMessage,
  useMarkMessageAsRead,
  useUpdateMessage
} from '@/hooks/useMessaging'
import { useRealtimeMessaging } from '@/hooks/useRealtimeMessaging'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfiles } from '@/hooks/useUsers'
import {
  ArrowLeft,
  Reply,
  Forward,
  Archive,
  Send,
  Paperclip,
  Clock,
  CheckSquare,
  User,
  Building,
  Wifi,
  WifiOff
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { Message } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800'
}

const messageTypeColors: Record<string, string> = {
  direct: 'bg-blue-100 text-blue-800',
  broadcast: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800'
}

export default function MessageDetail() {
  const { messageId } = useParams<{ messageId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('messages')
  const isRTL = i18n.dir() === 'rtl'
  const [isReplying, setIsReplying] = useState(false)
  const [isForwarding, setIsForwarding] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [forwardRecipient, setForwardRecipient] = useState('')

  const { data: message, isLoading } = useMessage(messageId || '')
  const { data: profiles } = useProfiles()
  const sendMessageMutation = useSendMessage()
  const markAsReadMutation = useMarkMessageAsRead()
  const updateMessageMutation = useUpdateMessage()
  
  // Real-time messaging
  const { isConnected } = useRealtimeMessaging()

  const handleReply = () => {
    if (!replyContent.trim() || !message) return

    sendMessageMutation.mutate({
      recipient_id: message.sender_id,
      subject: `Re: ${message.subject}`,
      content: replyContent,
      message_type: 'direct',
      priority: message.priority,
      parent_message_id: message.id
    }, {
      onSuccess: () => {
        setReplyContent('')
        setIsReplying(false)
      }
    })
  }

  const handleForward = () => {
    if (!forwardRecipient || !message) return

    sendMessageMutation.mutate({
      recipient_id: forwardRecipient,
      subject: `Fwd: ${message.subject}`,
      content: `\n\n--- Forwarded message ---\nFrom: ${message.sender?.full_name}\nDate: ${format(new Date(message.created_at), 'PPP')}\nSubject: ${message.subject}\n\n${message.content}`,
      message_type: 'direct',
      priority: message.priority
    }, {
      onSuccess: () => {
        setForwardRecipient('')
        setIsForwarding(false)
      }
    })
  }

  const handleMarkAsRead = () => {
    if (messageId) {
      markAsReadMutation.mutate(messageId)
    }
  }

  const handleArchive = () => {
    if (messageId) {
      updateMessageMutation.mutate({
        messageId,
        updates: { status: 'archived' }
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('loading')} description={t('fetching_message')} />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('message_not_found')} description={t('message_not_found_desc')} />
        <Button onClick={() => navigate('/messaging')}>
          <ArrowLeft className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
          {t('back_to_messages')}
        </Button>
      </div>
    )
  }

  // Auto-mark as read if user is recipient
  if (message.recipient_id === user?.id && message.status !== 'read') {
    handleMarkAsRead()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={message.subject}
        description={
          <div className="flex items-center gap-4 mt-2">
            <Badge className={priorityColors[message.priority]}>
              {message.priority}
            </Badge>
            <Badge className={messageTypeColors[message.message_type]}>
              {message.message_type}
            </Badge>
            <Badge className={statusColors[message.status]}>
              {message.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {format(new Date(message.created_at), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm" onClick={() => navigate('/messaging')}>
              <ArrowLeft className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
              {t('back')}
            </Button>
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm" onClick={() => setIsReplying(true)}>
              <Reply className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
              {t('reply')}
            </Button>
            <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm" onClick={() => setIsForwarding(true)}>
              <Forward className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
              {t('forward')}
            </Button>
            {message.status !== 'archived' && (
              <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm" onClick={handleArchive}>
                <Archive className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('archive')}
              </Button>
            )}
          </div>
        }
      />

      {/* Message Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{t('from')}:</span>
                  <span>{message.sender?.full_name}</span>
                  <span className="text-sm text-gray-500">({message.sender?.email})</span>
                </div>
              </div>
              {message.recipient && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{t('to')}:</span>
                  <span>{message.recipient.full_name}</span>
                  <span className="text-sm text-gray-500">({message.recipient.email})</span>
                </div>
              )}
              {(message.property || message.department) && (
                <div className="flex items-center gap-4">
                  {message.property && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span className="font-medium">{t('property')}:</span>
                      <span>{message.property.name}</span>
                    </div>
                  )}
                  {message.department && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span className="font-medium">{t('department')}:</span>
                      <span>{message.department.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={cn("text-sm text-gray-500", isRTL ? "text-left" : "text-right")}>
              {message.status === 'read' && message.read_at && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  <span>{t('read')} {formatDistanceToNow(new Date(message.read_at), { addSuffix: true })}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">
              {message.content}
            </div>
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                {t('attachments')} ({message.attachments.length})
              </h4>
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{attachment.file_name}</span>
                      <span className="text-sm text-gray-500">
                        ({(attachment.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm">
                      {t('download')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parent Message (if reply) */}
          {message.parent_message && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-3">{t('in_reply_to')}:</h4>
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="mb-2">
                    <span className="font-medium">{message.parent_message.subject}</span>
                    <span className="text-sm text-gray-500 mx-2">
                      {t('from')} {message.sender?.full_name} • {format(new Date(message.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {/* This would be the parent message content */}
                    {t('parent_message_placeholder')}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Section */}
      {isReplying && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reply_to_message')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reply">{t('your_reply')}</Label>
              <Textarea
                id="reply"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('reply_placeholder')}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setIsReplying(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleReply}
                disabled={sendMessageMutation.isPending || !replyContent.trim()}
              >
                <Send className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('send_reply')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forward Dialog */}
      <Dialog open={isForwarding} onOpenChange={setIsForwarding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('forward_message')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">{t('recipient')}</Label>
              <Select value={forwardRecipient} onValueChange={setForwardRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select_recipient')} />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile: any) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setIsForwarding(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleForward}
                disabled={sendMessageMutation.isPending || !forwardRecipient}
              >
                <Send className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('forward')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thread/Replies */}
      {message.replies && message.replies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('thread')} ({message.replies.length} {t('replies')})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message.replies.map((reply) => (
              <div key={reply.id} className="p-4 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{reply.sender?.full_name || 'Unknown'}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="font-medium text-sm">{reply.subject}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {reply.content || t('no_content')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
