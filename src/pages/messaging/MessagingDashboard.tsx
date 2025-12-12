import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  useMessages,
  useConversations,
  useNotifications,
  useSendMessage,
  useMarkMessageAsRead,
  useMessagingStats
} from '@/hooks/useMessaging'
import { useProfiles } from '@/hooks/useUsers'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MessageSquare,
  Send,
  Bell,
  Users,
  Mail,
  AlertTriangle,
  Plus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Message } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

const messageTypeColors: Record<string, string> = {
  direct: 'bg-blue-100 text-blue-800',
  broadcast: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800'
}

export default function MessagingDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('messages')
  const isRTL = i18n.dir() === 'rtl'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Message['status'] | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<Message['message_type'] | 'all'>('all')
  const [isComposeOpen, setIsComposeOpen] = useState(false)

  const { data: messages, isLoading: messagesLoading } = useMessages({
    status: statusFilter === 'all' ? undefined : statusFilter,
    message_type: typeFilter === 'all' ? undefined : typeFilter
  })
  const { data: conversations, isLoading: conversationsLoading } = useConversations()
  const { data: notifications, isLoading: notificationsLoading } = useNotifications()
  const { data: stats } = useMessagingStats()
  const { data: profiles } = useProfiles()

  const sendMessageMutation = useSendMessage()
  const markAsReadMutation = useMarkMessageAsRead()

  const [newMessage, setNewMessage] = useState({
    recipient_id: '',
    subject: '',
    content: '',
    message_type: 'direct' as Message['message_type'],
    priority: 'medium' as Message['priority']
  })

  const handleSendMessage = () => {
    if (!newMessage.subject || !newMessage.content) return

    sendMessageMutation.mutate(newMessage, {
      onSuccess: () => {
        setNewMessage({
          recipient_id: '',
          subject: '',
          content: '',
          message_type: 'direct',
          priority: 'medium'
        })
        setIsComposeOpen(false)
      }
    })
  }

  const handleMarkAsRead = (messageId: string) => {
    markAsReadMutation.mutate(messageId)
  }

  const filteredMessages = messages?.filter(message =>
    message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const MessageCard = ({ message }: { message: Message }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{message.subject}</h4>
              <Badge className={priorityColors[message.priority]}>
                {t(`priority_${message.priority}`)}
              </Badge>
              <Badge className={messageTypeColors[message.message_type]}>
                {t(message.message_type)}
              </Badge>
              {message.status !== 'read' && (
                <Badge className="bg-blue-100 text-blue-800 border border-blue-600 rounded-md text-blue-700">
                  {t('unread')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {message.content}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{t('from')}: {message.sender?.full_name}</span>
              {message.recipient && (
                <span>{t('to')}: {message.recipient.full_name}</span>
              )}
              <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="bg-hotel-navy text-white hover:bg-hotel-navy-light border border-hotel-navy rounded-md transition-colors"
              size="sm"
              onClick={() => navigate(`/messaging/${message.id}`)}
            >
              {t('view')}
            </Button>
            {message.status !== 'read' && message.recipient_id === user?.id && (
              <Button
                className="bg-hotel-gold text-white hover:bg-hotel-gold-dark border border-hotel-gold rounded-md transition-colors"
                size="sm"
                onClick={() => handleMarkAsRead(message.id)}
                disabled={markAsReadMutation.isPending}
              >
                {t('mark_read')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('compose_message')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('compose_message')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipient">{t('recipient')}</Label>
                  <Select value={newMessage.recipient_id} onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}>
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
                <div>
                  <Label htmlFor="subject">{t('subject')}</Label>
                  <Input
                    id="subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder={t('subject_placeholder')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">{t('type')}</Label>
                    <Select value={newMessage.message_type} onValueChange={(value: Message['message_type']) => setNewMessage({ ...newMessage, message_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">{t('direct_message')}</SelectItem>
                        <SelectItem value="broadcast">{t('broadcast')}</SelectItem>
                        <SelectItem value="system">{t('system')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">{t('priority')}</Label>
                    <Select value={newMessage.priority} onValueChange={(value: Message['priority']) => setNewMessage({ ...newMessage, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('priority_low')}</SelectItem>
                        <SelectItem value="medium">{t('priority_medium')}</SelectItem>
                        <SelectItem value="high">{t('priority_high')}</SelectItem>
                        <SelectItem value="urgent">{t('priority_urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="content">{t('message')}</Label>
                  <Textarea
                    id="content"
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    placeholder={t('message_placeholder')}
                    rows={6}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" onClick={() => setIsComposeOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending || !newMessage.subject || !newMessage.content}
                  >
                    <Send className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                    {t('send_message')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">{t('total_messages')}</p>
                  <p className="text-2xl font-bold">{stats.totalMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">{t('sent')}</p>
                  <p className="text-2xl font-bold">{stats.sentMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">{t('received')}</p>
                  <p className="text-2xl font-bold">{stats.receivedMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">{t('unread')}</p>
                  <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">{t('messages')}</TabsTrigger>
          <TabsTrigger value="conversations">{t('conversations')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('notifications')}</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('search_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder={t('status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_status')}</SelectItem>
                    <SelectItem value="sent">{t('status_sent')}</SelectItem>
                    <SelectItem value="delivered">{t('status_delivered')}</SelectItem>
                    <SelectItem value="read">{t('status_read')}</SelectItem>
                    <SelectItem value="archived">{t('status_archived')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder={t('type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all_types')}</SelectItem>
                    <SelectItem value="direct">{t('direct')}</SelectItem>
                    <SelectItem value="broadcast">{t('broadcast')}</SelectItem>
                    <SelectItem value="system">{t('system')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
            {filteredMessages.length === 0 && !messagesLoading && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_messages')}</h3>
                  <p className="text-gray-600">{t('no_messages_desc')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <div className="space-y-4">
            {conversations?.map((conversation) => (
              <Card key={conversation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium mb-1">
                        {conversation.participants?.map(p => p.full_name).join(', ')}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {conversation.last_message_preview}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors" size="sm">
                      {t('view_conversation')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {conversations?.length === 0 && !conversationsLoading && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_conversations')}</h3>
                  <p className="text-gray-600">{t('start_conversation')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="space-y-4">
            {notifications?.map((notification) => (
              <Card key={notification.id} className={`cursor-pointer hover:shadow-md transition-shadow ${!notification.is_read ? 'bg-blue-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium mb-1">{notification.title}</h4>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Badge className="bg-blue-100 text-blue-800 border border-blue-600 rounded-md text-blue-700">
                        {t('new')}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {notifications?.length === 0 && !notificationsLoading && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_notifications')}</h3>
                  <p className="text-gray-600">{t('all_caught_up')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
