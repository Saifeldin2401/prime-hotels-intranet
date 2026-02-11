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
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Send,
  Plus,
  Wifi,
  WifiOff,
  MessageSquare,
  ArrowLeft,
  Hash,
  Bell,
  Search
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { PullToRefresh } from '@/components/mobile'
import { useQueryClient } from '@tanstack/react-query'

function getInitials(name?: string | null, email?: string | null) {
  return (name || email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('')
}

function formatMessageDate(dateStr: string, t: (key: string) => string) {
  const date = new Date(dateStr)
  if (isToday(date)) return t('today')
  if (isYesterday(date)) return t('yesterday')
  return format(date, 'MMM d')
}

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
  const [showSidebar, setShowSidebar] = useState(true)

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
      setShowSidebar(false)
      return
    }

    const created = await createConversationMutation.mutateAsync({ otherUserId })
    if (created?.id) {
      setActiveConversationId(created.id)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setShowSidebar(false)
    }
  }

  const selectConversation = (convId: string) => {
    setActiveChannel(null)
    setActiveConversationId(convId)
    setShowSidebar(false)
  }

  const selectChannel = (channel: 'broadcast' | 'system') => {
    setActiveChannel(channel)
    setActiveConversationId(null)
    setShowSidebar(false)
  }

  const hasActiveChat = activeConversation || activeChannel
  const currentMessages = activeChannel ? channelMessages : threadMessages
  const isLoadingMessages = activeChannel ? channelLoading : threadLoading

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: any[] }[] = []
    let currentLabel = ''
    currentMessages.forEach((m: any) => {
      const label = m.created_at ? formatMessageDate(m.created_at, t) : ''
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, messages: [m] })
      } else {
        groups[groups.length - 1]?.messages.push(m)
      }
    })
    return groups
  }, [currentMessages, t])

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="h-[calc(100vh-8rem)] grid grid-cols-1 md:grid-cols-[360px_1fr] gap-0 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-md">

        {/* === SIDEBAR === */}
        <div className={cn(
          'border-e border-gray-200 bg-gray-50 min-h-0 flex flex-col',
          // Mobile: show/hide sidebar
          showSidebar ? 'flex' : 'hidden md:flex'
        )}>
          {/* Header with gradient */}
          <div className="p-4 border-b border-border/60 bg-gray-50">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base text-foreground">{t('title')}</h2>
                  {isConnected ? (
                    <Badge variant="outline" className="gap-1 text-[10px] h-5 border-emerald-300 text-emerald-600 bg-emerald-50">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      {t('live')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px] h-5 text-muted-foreground">
                      <WifiOff className="w-2.5 h-2.5" />
                      {t('offline')}
                    </Badge>
                  )}
                </div>
                {stats && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('unread_count', { count: stats.unreadMessages })}
                  </div>
                )}
              </div>
              <Button
                size="icon"
                className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border-0 shadow-none"
                onClick={() => setIsNewChatOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 relative">
              <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_conversations')}
                className={cn("h-10 bg-white border-gray-200 rounded-lg", isRTL ? "pr-9" : "pl-9")}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2">
              {/* Channel buttons */}
              <div className="space-y-0.5 mb-3">
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition-all',
                    activeChannel === 'broadcast'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                      : 'hover:bg-gray-100 text-gray-900'
                  )}
                  onClick={() => selectChannel('broadcast')}
                >
                  <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                    <Hash className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t('broadcast')}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t('broadcast_desc')}</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition-all',
                    activeChannel === 'system'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                      : 'hover:bg-gray-100 text-gray-900'
                  )}
                  onClick={() => selectChannel('system')}
                >
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{t('system')}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t('system_desc')}</div>
                  </div>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('direct')}</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>

              {/* Conversations */}
              {filteredConversations.length === 0 && !conversationsLoading ? (
                <div className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('no_conversations')}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{t('no_conversations_desc')}</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredConversations.map((c: any) => {
                    const participants = (c.participants || []) as any[]
                    const other = user?.id ? (participants.find((p) => p.id !== user.id) || participants[0]) : participants[0]
                    const isActive = c.id === activeConversationId && !activeChannel
                    const initials = getInitials(other?.full_name, other?.email)

                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition-all group',
                          isActive
                            ? 'bg-indigo-50 text-gray-900 shadow-sm ring-1 ring-indigo-200'
                            : 'hover:bg-gray-100'
                        )}
                        onClick={() => selectConversation(c.id)}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 ring-2 ring-background">
                            <AvatarImage src={other?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-medium">{initials || 'U'}</AvatarFallback>
                          </Avatar>
                          {/* Online indicator placeholder */}
                          <div className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background hidden" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {other?.full_name || other?.email || t('conversations')}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {other?.job_title || ''}{other?.property_name ? ` • ${other.property_name}` : ''}
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {c.last_message_at ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true }) : ''}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
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

        {/* === CHAT AREA === */}
        <div className={cn(
          'flex flex-col bg-white min-h-0',
          !showSidebar ? 'flex' : 'hidden md:flex'
        )}>
          {/* Chat header */}
          <div className="border-b border-border/60 px-4 py-3 flex items-center justify-between gap-3 bg-gray-50">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile back button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden shrink-0"
                onClick={() => setShowSidebar(true)}
              >
                <ArrowLeft className={cn("h-4 w-4", isRTL && "rotate-180")} />
              </Button>

              {activeChannel ? (
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                  activeChannel === 'broadcast'
                    ? 'bg-violet-100 text-violet-600'
                    : 'bg-slate-100 text-slate-600'
                )}>
                  {activeChannel === 'broadcast' ? <Hash className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </div>
              ) : otherParticipant ? (
                <Avatar className="h-10 w-10 ring-2 ring-background shrink-0">
                  <AvatarImage src={otherParticipant?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-medium">
                    {getInitials(otherParticipant?.full_name, otherParticipant?.email)}
                  </AvatarFallback>
                </Avatar>
              ) : null}
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate text-gray-900">
                  {activeChannel
                    ? (activeChannel === 'broadcast' ? t('broadcast') : t('system'))
                    : (otherParticipant?.full_name || otherParticipant?.email || t('select_conversation'))
                  }
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {activeChannel
                    ? (activeChannel === 'broadcast' ? t('broadcast_desc') : t('system_desc'))
                    : otherParticipant
                      ? `${otherParticipant?.job_title || ''}${otherParticipant?.property_name ? ` • ${otherParticipant.property_name}` : ''}`
                      : t('select_conversation_desc')
                  }
                </div>
              </div>
            </div>
            {activeConversation?.messages?.[0]?.id && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => navigate(`/messaging/${activeConversation.messages[0].id}`)}
                disabled={!!activeChannel}
              >
                {t('view_details')}
              </Button>
            )}
          </div>

          {/* Messages area */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              {!hasActiveChat ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                    <MessageSquare className="h-7 w-7 text-indigo-500" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{t('select_conversation')}</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px]">{t('select_conversation_desc')}</p>
                </div>
              ) : isLoadingMessages ? (
                <div className="h-full flex items-center justify-center py-20 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    {t('loading')}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      {/* Date separator */}
                      {group.label && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-[11px] font-medium text-gray-400 bg-white px-2 rounded-full">{group.label}</span>
                          <div className="flex-1 h-px bg-border/50" />
                        </div>
                      )}
                      {group.messages.map((m: any) => {
                        const isMine = user?.id && m.sender_id === user.id

                        return (
                          <div key={m.id} className={cn('flex mb-2', isMine ? 'justify-end' : 'justify-start')}>
                            {/* Other user avatar */}
                            {!isMine && (
                              <Avatar className="h-7 w-7 mt-1 me-2 shrink-0">
                                <AvatarImage src={m.sender?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-muted">
                                  {getInitials(m.sender?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={cn(
                              'max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm',
                              isMine
                                ? 'bg-indigo-600 text-white rounded-ee-md'
                                : 'bg-gray-100 text-gray-900 rounded-es-md border border-gray-200'
                            )}>
                              {!isMine && (
                                <div className={cn(
                                  'text-[11px] font-medium mb-0.5',
                                  isMine ? 'text-white/70' : 'text-indigo-600'
                                )}>
                                  {m.sender?.full_name || t('system')}
                                </div>
                              )}
                              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                              <div className={cn(
                                'text-[10px] mt-1 flex items-center gap-1',
                                isMine ? 'justify-end text-indigo-200' : 'text-gray-400'
                              )}>
                                {m.created_at ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true }) : ''}
                                {isMine && (
                                  <span className="ms-1">
                                    {m.status === 'read' ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="border-t border-gray-200 p-3 shrink-0 bg-gray-50">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('type_message')}
                className="min-h-[44px] max-h-[160px] bg-white border-gray-200 rounded-xl resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={(!activeChannel && !otherParticipant?.id) || sendMessageMutation.isPending}
              />
              <Button
                className="h-11 rounded-xl px-4 shrink-0"
                onClick={handleSend}
                disabled={!draft.trim() || ((!activeChannel && !otherParticipant?.id) || sendMessageMutation.isPending)}
              >
                <Send className={cn('w-4 h-4', isRTL ? 'rotate-180' : '')} />
              </Button>
            </div>
            {activeConversation?.messages?.[0]?.id && activeConversation?.messages?.[0]?.recipient_id === user?.id && activeConversation?.messages?.[0]?.status !== 'read' && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => markAsReadMutation.mutate(activeConversation.messages[0].id)}
                  disabled={markAsReadMutation.isPending}
                >
                  {t('mark_read')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('new_chat')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t('search_people')}
                className={cn("h-10", isRTL ? "pr-9" : "pl-9")}
              />
            </div>
            <ScrollArea className="h-[360px]">
              <div className="space-y-0.5">
                {filteredProfiles.map((p: any) => {
                  const initials = getInitials(p?.full_name, p?.email)

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-start transition-colors"
                      onClick={() => openNewChatWith(p.id)}
                      disabled={createConversationMutation.isPending}
                    >
                      <Avatar className="h-9 w-9 ring-2 ring-background">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">{initials || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{p.full_name || p.email}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.job_title || ''}{p.property_name ? ` • ${p.property_name}` : ''}</div>
                      </div>
                    </button>
                  )
                })}
                {filteredProfiles.length === 0 && (
                  <div className="p-6 text-center">
                    <Search className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('no_results')}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  )
}
