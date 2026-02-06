import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  useConversations,
  useCreateConversation,
  useSendMessage,
  useMarkMessageAsRead,
  useMessagingStats,
  useConversationMessages,
  useChannelMessages
} from '@/hooks/useMessaging'
import { useRealtimeMessaging } from '@/hooks/useRealtimeMessaging'
import { useProfiles } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Send,
  Plus,
  Wifi,
  WifiOff
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { PullToRefresh } from '@/components/mobile'
import { useQueryClient } from '@tanstack/react-query'

export default function MessagingDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('messages')
  const isRTL = i18n.dir() === 'rtl'
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState<'broadcast' | 'system' | null>(null)
  const [draft, setDraft] = useState('')
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  // Real-time messaging
  const { isConnected } = useRealtimeMessaging()

  const { data: conversations, isLoading: conversationsLoading } = useConversations()
  const { data: stats } = useMessagingStats()

  const sendMessageMutation = useSendMessage()
  const createConversationMutation = useCreateConversation()
  const markAsReadMutation = useMarkMessageAsRead()

  const { data: allProfiles = [] } = useProfiles()

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['messages'] })
    await queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
    await queryClient.invalidateQueries({ queryKey: ['conversations'] })
  }

  useEffect(() => {
    if (activeChannel) return
    if (!activeConversationId && conversations && conversations.length > 0) {
      setActiveConversationId(conversations[0].id)
    }
  }, [activeConversationId, conversations, activeChannel])

  const activeConversation = useMemo(() => {
    return (conversations || []).find((c: any) => c.id === activeConversationId) || null
  }, [conversations, activeConversationId])

  const otherParticipant = useMemo(() => {
    const participants = (activeConversation?.participants || []) as any[]
    if (!user?.id) return participants[0] || null
    return participants.find((p) => p.id !== user.id) || participants[0] || null
  }, [activeConversation, user?.id])

  const { data: threadMessages = [], isLoading: threadLoading } = useConversationMessages({
    conversationId: activeConversation?.id || null,
    participantIds: activeConversation?.participant_ids,
    limit: 100,
  })

  const { data: channelMessages = [], isLoading: channelLoading } = useChannelMessages({
    channel: activeChannel || 'broadcast',
    limit: 200,
  })

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return conversations || []
    return (conversations || []).filter((c: any) => {
      const participantsText = (c.participants || [])
        .map((p: any) => `${p.full_name || ''} ${p.email || ''} ${p.job_title || ''} ${p.property_name || ''}`)
        .join(' ')
        .toLowerCase()
      const preview = (c.last_message_preview || '').toLowerCase()
      return participantsText.includes(q) || preview.includes(q)
    })
  }, [conversations, searchTerm])

  const filteredProfiles = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    const base = (allProfiles as any[]).filter((p) => p?.id && p.id !== user?.id)
    if (!q) return base.slice(0, 30)
    return base
      .filter((p) => `${p.full_name || ''} ${p.email || ''} ${p.job_title || ''}`.toLowerCase().includes(q))
      .slice(0, 30)
  }, [allProfiles, user?.id, userSearch])

  const handleSend = () => {
    if (!draft.trim()) return

    if (activeChannel) {
      sendMessageMutation.mutate({
        recipient_id: '',
        subject: '',
        content: draft,
        message_type: activeChannel,
        priority: 'medium'
      }, {
        onSuccess: () => {
          setDraft('')
          queryClient.invalidateQueries({ queryKey: ['channel-messages'] })
          queryClient.invalidateQueries({ queryKey: ['messages'] })
          queryClient.invalidateQueries({ queryKey: ['messaging-stats'] })
        }
      })
      return
    }

    if (!otherParticipant?.id) return

    sendMessageMutation.mutate({
      recipient_id: otherParticipant.id,
      subject: '',
      content: draft,
      message_type: 'direct',
      priority: 'medium'
    }, {
      onSuccess: () => {
        setDraft('')
        queryClient.invalidateQueries({ queryKey: ['conversation-messages'] })
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    })
  }

  const openNewChatWith = async (otherUserId: string) => {
    setIsNewChatOpen(false)
    setUserSearch('')
    setActiveChannel(null)

    const existing = (conversations || []).find((c: any) => {
      const ids: string[] = Array.isArray(c.participant_ids) ? c.participant_ids : []
      return ids.length === 2 && ids.includes(otherUserId) && ids.includes(user?.id)
    })

    if (existing?.id) {
      setActiveConversationId(existing.id)
      return
    }

    const created = await createConversationMutation.mutateAsync({ otherUserId })
    if (created?.id) {
      setActiveConversationId(created.id)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="h-[calc(100vh-8rem)] grid grid-cols-1 md:grid-cols-[340px_1fr] gap-0 border rounded-lg overflow-hidden bg-white">
        <div className="border-r bg-gray-50 min-h-0">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm truncate">Messaging</h2>
                  {isConnected ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <Wifi className="w-3 h-3" />
                      <span className="text-[11px]">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-500">
                      <WifiOff className="w-3 h-3" />
                      <span className="text-[11px]">Offline</span>
                    </div>
                  )}
                </div>
                {stats && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {stats.unreadMessages} unread
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsNewChatOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="h-10"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-8rem-120px)]">
            <div className="p-2">
              <div className="space-y-1 mb-2">
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-white transition-colors',
                    activeChannel === 'broadcast' ? 'bg-white shadow-sm border' : 'border border-transparent'
                  )}
                  onClick={() => {
                    setActiveChannel('broadcast')
                    setActiveConversationId(null)
                  }}
                >
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-semibold">
                    #
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">Broadcast</div>
                    <div className="text-[11px] text-muted-foreground truncate">Company-wide messages</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-white transition-colors',
                    activeChannel === 'system' ? 'bg-white shadow-sm border' : 'border border-transparent'
                  )}
                  onClick={() => {
                    setActiveChannel('system')
                    setActiveConversationId(null)
                  }}
                >
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-xs font-semibold">
                    !
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">System</div>
                    <div className="text-[11px] text-muted-foreground truncate">System notifications</div>
                  </div>
                </button>
              </div>

              {filteredConversations.length === 0 && !conversationsLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No conversations
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((c: any) => {
                    const participants = (c.participants || []) as any[]
                    const other = user?.id ? (participants.find((p) => p.id !== user.id) || participants[0]) : participants[0]
                    const isActive = c.id === activeConversationId

                    const initials = (other?.full_name || other?.email || 'U')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s: string) => s[0]?.toUpperCase())
                      .join('')

                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-white transition-colors',
                          isActive ? 'bg-white shadow-sm border' : 'border border-transparent'
                        )}
                        onClick={() => {
                          setActiveChannel(null)
                          setActiveConversationId(c.id)
                        }}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={other?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{initials || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {other?.full_name || other?.email || 'Conversation'}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {other?.job_title || ''}{other?.property_name ? ` • ${other.property_name}` : ''}
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {c.last_message_at ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true }) : ''}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {c.last_message_preview || ''}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex flex-col bg-white min-h-0">
          <div className="border-b p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {activeChannel ? (
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold',
                  activeChannel === 'broadcast' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                )}>
                  {activeChannel === 'broadcast' ? '#' : '!'}
                </div>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {(otherParticipant?.full_name || otherParticipant?.email || 'U')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s: string) => s[0]?.toUpperCase())
                      .join('')}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">
                  {activeChannel ? (activeChannel === 'broadcast' ? 'Broadcast' : 'System') : (otherParticipant?.full_name || otherParticipant?.email || 'Select a conversation')}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {activeChannel ? (activeChannel === 'broadcast' ? 'Company-wide messages' : 'System messages') : `${otherParticipant?.job_title || ''}${otherParticipant?.property_name ? ` • ${otherParticipant.property_name}` : ''}`}
                </div>
              </div>
            </div>
            {activeConversation?.messages?.[0]?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/messaging/${activeConversation.messages[0].id}`)}
                disabled={!!activeChannel}
              >
                View details
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 p-4">
            {activeChannel ? (
              channelLoading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <div className="space-y-3">
                  {channelMessages.map((m: any) => {
                    const isMine = user?.id && m.sender_id === user.id
                    const bubbleClass = isMine
                      ? 'bg-hotel-navy text-white'
                      : 'bg-gray-100 text-gray-900'

                    return (
                      <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div className={cn('max-w-[80%] rounded-2xl px-3 py-2', bubbleClass)}>
                          {!isMine && (
                            <div className="text-[11px] opacity-70 mb-1">
                              {m.sender?.full_name || 'Unknown'}
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                          <div className={cn('text-[10px] mt-1 opacity-70', isMine ? 'text-right' : 'text-left')}>
                            {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true }) : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : !activeConversation ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a conversation
              </div>
            ) : threadLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="space-y-3">
                {threadMessages.map((m: any) => {
                  const isMine = user?.id && m.sender_id === user.id
                  const bubbleClass = isMine
                    ? 'bg-hotel-navy text-white'
                    : 'bg-gray-100 text-gray-900'

                  return (
                    <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] rounded-2xl px-3 py-2', bubbleClass)}>
                        {!isMine && (
                          <div className="text-[11px] opacity-70 mb-1">
                            {m.sender?.full_name || 'Unknown'}
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                        <div className={cn('text-[10px] mt-1 opacity-70', isMine ? 'text-right' : 'text-left')}>
                          {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true }) : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-3 shrink-0">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message..."
                className="min-h-[44px] max-h-[160px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={(!activeChannel && !otherParticipant?.id) || sendMessageMutation.isPending}
              />
              <Button
                className="h-11"
                onClick={handleSend}
                disabled={!draft.trim() || ((!activeChannel && !otherParticipant?.id) || sendMessageMutation.isPending)}
              >
                <Send className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                Send
              </Button>
            </div>
            {activeConversation?.messages?.[0]?.id && activeConversation?.messages?.[0]?.recipient_id === user?.id && activeConversation?.messages?.[0]?.status !== 'read' && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsReadMutation.mutate(activeConversation.messages[0].id)}
                  disabled={markAsReadMutation.isPending}
                >
                  Mark latest as read
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search people"
            />
            <ScrollArea className="h-[360px]">
              <div className="space-y-1">
                {filteredProfiles.map((p: any) => {
                  const initials = (p?.full_name || p?.email || 'U')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s: string) => s[0]?.toUpperCase())
                    .join('')

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-left"
                      onClick={() => openNewChatWith(p.id)}
                      disabled={createConversationMutation.isPending}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{p.full_name || p.email}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.job_title || ''}</div>
                      </div>
                    </button>
                  )
                })}
                {filteredProfiles.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No results</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  )
}
