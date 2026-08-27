import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PriorityBadge } from '@/components/messaging/PriorityBadge'
import { QuickReplyChips } from '@/components/messaging/QuickReplyChips'
import { useAuth } from '@/hooks/useAuth'
import {
  useMarkMessageAsRead,
  useMessage,
  useSendMessage,
  useUpdateMessage
} from '@/hooks/useMessaging'
import { useRealtimeMessaging } from '@/hooks/useRealtimeMessaging'
import { useProfiles } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Archive,
  ArrowLeft,
  Building,
  CheckCheck,
  CheckSquare,
  Clock,
  Forward,
  MessageSquare,
  Reply,
  Send,
  User
} from 'lucide-react'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  read: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  archived: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
}

const messageTypeColors: Record<string, string> = {
  direct: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  broadcast: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  system: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
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
  
  // Real-time messaging connection
  const { isConnected: _isConnected } = useRealtimeMessaging()

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

  const handleArchive = () => {
    if (messageId) {
      updateMessageMutation.mutate({
        messageId,
        updates: { status: 'archived' }
      })
    }
  }

  useEffect(() => {
    if (!message) return
    if (!user?.id) return
    if (!messageId) return

    if (message.recipient_id === user.id && message.status !== 'read') {
      markAsReadMutation.mutate(messageId)
    }
  }, [message, user?.id, messageId, markAsReadMutation])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('loading', 'Loading messages...')} description={t('fetching_message', 'Fetching message details...')} />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!message) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('message_not_found', 'Message Not Found')} description={t('message_not_found_desc', 'The message does not exist or has been removed.')} />
        <Button onClick={() => navigate('/messaging')} className="rounded-xl">
          <ArrowLeft className={cn('w-4 h-4', isRTL ? 'ms-2' : 'me-2')} />
          {t('back_to_messages', 'Back to Messages')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 pb-10">
      <PageHeader
        title={message.subject || 'Message Thread'}
        description={
          <div className="flex flex-wrap items-center gap-2.5 mt-2">
            <PriorityBadge priority={message.priority} />
            <Badge className={messageTypeColors[message.message_type] || 'bg-slate-100 text-slate-800'}>
              {message.message_type}
            </Badge>
            <Badge className={statusColors[message.status] || 'bg-slate-100 text-slate-800'}>
              {message.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), 'PPP · p')}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/messaging')}>
              <ArrowLeft className={cn('w-4 h-4', isRTL ? 'ms-1.5' : 'me-1.5')} />
              {t('back', 'Back')}
            </Button>
            <Button size="sm" className="rounded-xl bg-gradient-to-r from-hotel-navy to-indigo-800 text-white shadow-xs" onClick={() => setIsReplying(true)}>
              <Reply className={cn('w-4 h-4', isRTL ? 'ms-1.5' : 'me-1.5')} />
              {t('reply', 'Reply')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setIsForwarding(true)}>
              <Forward className={cn('w-4 h-4', isRTL ? 'ms-1.5' : 'me-1.5')} />
              {t('forward', 'Forward')}
            </Button>
            {message.status !== 'archived' && (
              <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={handleArchive}>
                <Archive className={cn('w-4 h-4', isRTL ? 'ms-1.5' : 'me-1.5')} />
                {t('archive', 'Archive')}
              </Button>
            )}
          </div>
        }
      />

      {/* Message Content Card */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-md overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t('from', 'From')}:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{message.sender?.full_name}</span>
                {message.sender?.email && (
                  <span className="text-xs text-muted-foreground">({message.sender.email})</span>
                )}
              </div>

              {message.recipient && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t('to', 'To')}:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{message.recipient.full_name}</span>
                  {message.recipient.email && (
                    <span className="text-xs text-muted-foreground">({message.recipient.email})</span>
                  )}
                </div>
              )}

              {(message.property || message.department) && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                  {message.property && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building className="w-3.5 h-3.5" />
                      <span>{message.property.name}</span>
                    </div>
                  )}
                  {message.department && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Building className="w-3.5 h-3.5" />
                      <span>{message.department.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={cn('text-xs text-muted-foreground space-y-1', isRTL ? 'sm:text-start' : 'sm:text-end')}>
              {message.status === 'read' && message.read_at && (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{t('read', 'Read')} {formatDistanceToNow(new Date(message.read_at), { addSuffix: true })}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="prose max-w-none text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap font-sans text-base">
            {message.content}
          </div>

          {/* Parent Message (if reply) */}
          {message.parent_message && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{t('in_reply_to', 'In reply to')}:</h4>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {message.parent_message.subject}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {t('parent_message_placeholder', 'Original message thread details.')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Section */}
      {isReplying && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-md p-6 bg-white dark:bg-slate-950 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Reply className="w-4 h-4 text-blue-600" />
              {t('reply_to_message', 'Reply to Message')}
            </CardTitle>
          </div>

          <QuickReplyChips
            lastMessageContent={message.content || ''}
            senderName={message.sender?.full_name || ''}
            onSelectReply={(text) => setReplyContent(prev => prev ? `${prev} ${text}` : text)}
            disabled={sendMessageMutation.isPending}
          />

          <div className="space-y-2">
            <Label htmlFor="reply" className="text-xs font-semibold">{t('your_reply', 'Your Response')}</Label>
            <Textarea
              id="reply"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t('reply_placeholder', 'Type your response or use AI Smart Draft...')}
              rows={5}
              className="rounded-xl resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsReplying(false)}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-hotel-navy to-indigo-800 text-white shadow-xs"
              onClick={handleReply}
              disabled={sendMessageMutation.isPending || !replyContent.trim()}
            >
              <Send className={cn('w-4 h-4', isRTL ? 'ms-1.5' : 'me-1.5')} />
              {t('send_reply', 'Send Reply')}
            </Button>
          </div>
        </Card>
      )}

      {/* Forward Dialog */}
      <Dialog open={isForwarding} onOpenChange={setIsForwarding}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Forward className="w-5 h-5 text-hotel-gold" />
              {t('forward_message', 'Forward Message')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="recipient" className="text-xs font-semibold">{t('recipient', 'Forward to Staff Member')}</Label>
              <Select value={forwardRecipient} onValueChange={setForwardRecipient}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder={t('select_recipient', 'Select colleague')} />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsForwarding(false)}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-hotel-navy to-indigo-800 text-white shadow-xs"
                onClick={handleForward}
                disabled={sendMessageMutation.isPending || !forwardRecipient}
              >
                <Send className={cn('w-4 h-4', isRTL ? 'ms-1.5' : 'me-1.5')} />
                {t('forward', 'Forward')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
