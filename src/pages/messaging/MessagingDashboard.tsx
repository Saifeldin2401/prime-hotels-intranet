import { PullToRefresh } from '@/components/mobile'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ConversationItem, type ConversationParticipant } from '@/components/messaging/ConversationItem'
import { PriorityBadge, type MessagePriority } from '@/components/messaging/PriorityBadge'
import { QuickReplyChips } from '@/components/messaging/QuickReplyChips'
import { useAuth } from '@/hooks/useAuth'
import {
  useChannelMessages,
  useConversationMessages,
  useConversations,
  useCreateConversation,
  useMarkMessageAsRead,
  useMessagingStats,
  useSendMessage
} from '@/hooks/useMessaging'
import { useRealtimeMessaging } from '@/hooks/useRealtimeMessaging'
import { useProfiles } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Filter,
  Hash,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Send,
  Sparkles,
  UserCheck,
  Wifi,
  WifiOff
} from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

function getInitials(name?: string | null, email?: string | null) {
  return (name || email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('')
}

function formatMessageDate(dateStr: string, t: (key: string, fallback?: string) => string) {
  const date = new Date(dateStr)
  if (isToday(date)) return t('today', 'Today')
  if (isYesterday(date)) return t('yesterday', 'Yesterday')
  return format(date, 'MMM d, yyyy')
}

export default function MessagingDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, i18n } = useTranslation('messages')
  const isRTL = i18n.dir() === 'rtl'
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'broadcasts' | 'urgent'>('all')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState<'broadcast' | 'system' | null>(null)
  const [draft, setDraft] = useState('')
  const [priority, setPriority] = useState<MessagePriority>('medium')
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [showSidebar, setShowSidebar] = useState(true)
  
  const processedStartChatRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const startChatWith = searchParams.get('startChatWith')

  // Real-time connection hook
  const { isConnected } = useRealtimeMessaging()

  const { data: conversations, isLoading: conversationsLoading } = useConversations()
  const { data: stats } = useMessagingStats()

  const sendMessageMutation = useSendMessage()
  const createConversationMutation = useCreateConversation()
  const markAsReadMutation = useMarkMessageAsRead()

  const { data: allProfiles = [] } = useProfiles({ limit: 200 })

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['messages'] }),
      queryClient.invalidateQueries({ queryKey: ['messaging-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      queryClient.invalidateQueries({ queryKey: ['channel-messages'] }),
    ])
  }

  const effectiveConversationId = useMemo(() => {
    if (activeChannel) return null
    if (activeConversationId) return activeConversationId
    return conversations?.[0]?.id || null
  }, [activeChannel, activeConversationId, conversations])

  const activeConversation = useMemo(() => {
    if (!effectiveConversationId) return null
    return (conversations || []).find((c) => c.id === effectiveConversationId) || null
  }, [conversations, effectiveConversationId])

  const otherParticipant = useMemo((): ConversationParticipant | null => {
    const participants = activeConversation?.participants || []
    if (!user?.id) return participants[0] || null
    return (participants.find((p) => p.id !== user.id) || participants[0] || null) as ConversationParticipant | null
  }, [activeConversation, user])

  const { data: threadMessages = [], isLoading: threadLoading } = useConversationMessages({
    conversationId: activeConversation?.id || null,
    participantIds: activeConversation?.participant_ids,
    limit: 100,
  })

  const { data: channelMessages = [], isLoading: channelLoading } = useChannelMessages({
    channel: activeChannel || 'broadcast',
    limit: 200,
  })

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages, channelMessages])

  // Filter conversations by search and tabs
  const filteredConversations = useMemo(() => {
    let list = conversations || []

    // Tab filtering
    if (activeTab === 'urgent') {
      list = list.filter(c => (c.last_message as any)?.priority === 'urgent' || (c.last_message as any)?.priority === 'high')
    }

    const q = searchTerm.trim().toLowerCase()
    if (!q) return list

    return list.filter((c) => {
      const participantsText = (c.participants || [])
        .map((p) => `${p.full_name || ''} ${p.email || ''} ${p.job_title || ''} ${p.property_name || ''}`)
        .join(' ')
        .toLowerCase()
      const preview = (c.last_message_preview || '').toLowerCase()
      return participantsText.includes(q) || preview.includes(q)
    })
  }, [conversations, searchTerm, activeTab])

  // Filter profiles for new chat dialog
  const filteredProfiles = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    let list = allProfiles.filter((p) => p?.id && p.id !== user?.id)

    if (deptFilter !== 'all') {
      list = list.filter((p) => (p as any).department?.name === deptFilter || (p as any).department_name === deptFilter)
    }

    if (!q) return list.slice(0, 40)
    return list
      .filter((p) => `${p.full_name || ''} ${p.email || ''} ${p.job_title || ''}`.toLowerCase().includes(q))
      .slice(0, 40)
  }, [allProfiles, user?.id, userSearch, deptFilter])

  // Extract unique departments for filter
  const departmentsList = useMemo(() => {
    const set = new Set<string>()
    allProfiles.forEach(p => {
      const dName = (p as any).department?.name || (p as any).department_name
      if (dName) set.add(dName)
    })
    return Array.from(set)
  }, [allProfiles])

  const handleSend = () => {
    if (!draft.trim()) return

    if (activeChannel) {
      sendMessageMutation.mutate({
        recipient_id: '',
        subject: '',
        content: draft,
        message_type: activeChannel,
        priority: priority
      }, {
        onSuccess: () => {
          setDraft('')
          setPriority('medium')
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
      priority: priority
    }, {
      onSuccess: () => {
        setDraft('')
        setPriority('medium')
        queryClient.invalidateQueries({ queryKey: ['conversation-messages'] })
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    })
  }

  const openNewChatWith = useCallback(async (otherUserId: string) => {
    setIsNewChatOpen(false)
    setUserSearch('')
    setActiveChannel(null)

    const existing = (conversations || []).find((c) => {
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
  }, [conversations, createConversationMutation, queryClient, user?.id])

  useEffect(() => {
    if (!startChatWith || !user?.id) return
    if (startChatWith === user.id) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('startChatWith')
      setSearchParams(nextParams, { replace: true })
      return
    }

    if (processedStartChatRef.current === startChatWith) return
    processedStartChatRef.current = startChatWith

    void openNewChatWith(startChatWith).finally(() => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('startChatWith')
      setSearchParams(nextParams, { replace: true })
    })
  }, [startChatWith, user?.id, openNewChatWith, searchParams, setSearchParams])

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

  const lastReceivedMessage = useMemo(() => {
    if (!currentMessages.length) return null
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].sender_id !== user?.id) {
        return currentMessages[i]
      }
    }
    return null
  }, [currentMessages, user?.id])

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: any[] }[] = []
    let currentLabel = ''
    currentMessages.forEach((m) => {
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
    <PullToRefresh onRefresh={handleRefresh} className="h-full w-full">
      <div className="w-full h-[calc(100vh-6.5rem)] px-3 sm:px-6 py-1 max-w-[1600px] mx-auto flex flex-col">
        <div className="flex-1 flex flex-col md:flex-row border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-md min-h-0">

          {/* === SIDEBAR === */}
          <div className={cn(
            'w-full md:w-[290px] lg:w-[330px] shrink-0 border-e border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 min-h-0 flex flex-col',
            showSidebar ? 'flex' : 'hidden md:flex'
          )}>
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="min-w-0 flex items-center gap-2">
                <h2 className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                  <MessageSquare className="w-4 h-4 text-hotel-gold shrink-0" />
                  <span>{t('title', 'Messaging')}</span>
                </h2>
                {isConnected ? (
                  <Badge variant="outline" className="gap-1 text-[9px] h-4.5 px-1.5 border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 shrink-0">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    {t('live', 'Live')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-[9px] h-4.5 px-1.5 text-muted-foreground shrink-0">
                    <WifiOff className="w-2.5 h-2.5" />
                    {t('offline', 'Offline')}
                  </Badge>
                )}
              </div>

              <Button
                size="sm"
                className="h-8 px-2.5 rounded-xl bg-gradient-to-r from-hotel-navy to-indigo-800 hover:from-hotel-navy/90 hover:to-indigo-900 text-white shadow-xs gap-1 font-semibold text-xs shrink-0"
                onClick={() => setIsNewChatOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('new_chat', 'New Chat')}</span>
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className={cn('absolute top-2.5 h-3.5 w-3.5 text-muted-foreground', isRTL ? 'end-3' : 'start-3')} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_conversations', 'Search messages & staff...')}
                className={cn('h-8.5 bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl text-xs shadow-2xs', isRTL ? 'pe-8' : 'ps-8')}
              />
            </div>

            {/* Smooth Pill Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
              {[
                { id: 'all', label: t('tab_all', 'All') },
                { id: 'direct', label: t('tab_direct', 'Direct') },
                { id: 'broadcasts', label: t('tab_broadcasts', 'Broadcast') },
                { id: 'urgent', label: t('tab_urgent', 'Urgent') }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap shrink-0 border',
                    activeTab === tab.id
                      ? tab.id === 'urgent'
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : 'bg-hotel-navy text-white border-hotel-navy shadow-2xs'
                      : tab.id === 'urgent'
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {/* Broadcast & System Channels */}
              {(activeTab === 'all' || activeTab === 'broadcasts') && (
                <div className="space-y-1 mb-2">
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start transition-all border',
                      activeChannel === 'broadcast'
                        ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 shadow-xs'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border-transparent text-slate-800 dark:text-slate-200'
                    )}
                    onClick={() => selectChannel('broadcast')}
                  >
                    <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300 shrink-0 shadow-2xs">
                      <Radio className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{t('broadcast', 'Company Broadcast')}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-300 text-purple-700 dark:text-purple-300">
                          Group
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{t('broadcast_desc', 'Company-wide notices')}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start transition-all border',
                      activeChannel === 'system'
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/50 border-transparent text-slate-800 dark:text-slate-200'
                    )}
                    onClick={() => selectChannel('system')}
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0 shadow-2xs">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{t('system', 'System Dispatches')}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-300 text-blue-700 dark:text-blue-300">
                          Alerts
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{t('system_desc', 'Automated system notifications')}</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Direct Conversations Section */}
              {activeTab !== 'broadcasts' && (
                <>
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('conversations', 'Direct Messages')}</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </div>

                  {filteredConversations.length === 0 && !conversationsLoading ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('no_conversations', 'No conversations yet')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('no_conversations_desc', 'Start a conversation with colleagues.')}</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredConversations.map((c) => {
                        const participants = c.participants || []
                        const other = user?.id ? (participants.find((p) => p.id !== user.id) || participants[0]) : participants[0]
                        const isActive = c.id === effectiveConversationId && !activeChannel

                        return (
                          <ConversationItem
                            key={c.id}
                            id={c.id}
                            isActive={isActive}
                            otherParticipant={other as any}
                            lastMessagePreview={c.last_message_preview}
                            lastMessageAt={c.last_message_at}
                            lastMessagePriority={(c.last_message as any)?.priority}
                            unreadCount={c.unread_count || 0}
                            isOnline={true}
                            onClick={() => selectConversation(c.id)}
                          />
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* === CHAT AREA === */}
        <div className={cn(
          'flex flex-col bg-white dark:bg-slate-950 min-h-0',
          !showSidebar ? 'flex' : 'hidden md:flex'
        )}>
          {/* Chat Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden shrink-0 rounded-lg"
                onClick={() => setShowSidebar(true)}
              >
                <ArrowLeft className={cn('h-4 w-4', isRTL && 'rotate-180')} />
              </Button>

              {activeChannel ? (
                <div className={cn(
                  'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ring-2 ring-background',
                  activeChannel === 'broadcast'
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                )}>
                  {activeChannel === 'broadcast' ? <Radio className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                </div>
              ) : otherParticipant ? (
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11 ring-2 ring-background shadow-xs">
                    <AvatarImage src={otherParticipant?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-hotel-navy to-indigo-700 text-white font-semibold">
                      {getInitials(otherParticipant?.full_name, otherParticipant?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-2xs" />
                </div>
              ) : null}

              <div className="min-w-0">
                {activeChannel ? (
                  <div className="font-bold text-base truncate text-slate-900 dark:text-slate-100">
                    {activeChannel === 'broadcast' ? t('broadcast', 'Company Broadcast') : t('system', 'System Dispatches')}
                  </div>
                ) : otherParticipant?.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${otherParticipant.id}`)}
                      className="font-bold text-base truncate text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-start"
                    >
                      {otherParticipant?.full_name || otherParticipant?.email || t('select_conversation')}
                    </button>
                    {otherParticipant?.department_name && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        {otherParticipant.department_name}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="font-bold text-base truncate text-slate-900 dark:text-slate-100">{t('select_conversation')}</div>
                )}
                <div className="text-xs text-muted-foreground truncate">
                  {activeChannel
                    ? (activeChannel === 'broadcast' ? t('broadcast_desc') : t('system_desc'))
                    : otherParticipant
                      ? `${otherParticipant?.job_title || 'Staff Member'}${otherParticipant?.property_name ? ` • ${otherParticipant.property_name}` : ''}`
                      : t('select_conversation_desc')
                  }
                </div>
              </div>
            </div>

            {activeConversation?.messages?.[0]?.id && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                onClick={() => navigate(`/messaging/${activeConversation.messages[0].id}`)}
                disabled={!!activeChannel}
              >
                {t('view_details', 'Thread Details')}
              </Button>
            )}
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-0 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="p-4 sm:p-6">
              {!hasActiveChat ? (
                <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-20 w-20 rounded-3xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mb-4 shadow-sm border border-blue-100 dark:border-blue-900">
                    <MessageSquare className="h-9 w-9 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">{t('select_conversation', 'Select a conversation')}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">{t('select_conversation_desc', 'Choose a chat from the sidebar or click New Chat to message hotel staff.')}</p>
                </div>
              ) : isLoadingMessages ? (
                <div className="h-full flex items-center justify-center py-24 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <span>{t('loading', 'Loading messages...')}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedMessages.map((group, gi) => (
                    <div key={gi} className="space-y-3">
                      {/* Date Separator */}
                      {group.label && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                          <span className="text-[11px] font-medium text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-0.5 rounded-full shadow-2xs">
                            {group.label}
                          </span>
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        </div>
                      )}

                      {group.messages.map((m) => {
                        const isMine = user?.id && m.sender_id === user.id
                        const isUrgent = m.priority === 'urgent'
                        const isHigh = m.priority === 'high'

                        return (
                          <div key={m.id} className={cn('flex items-end gap-2 mb-3', isMine ? 'justify-end' : 'justify-start')}>
                            {!isMine && (
                              <Avatar className="h-8 w-8 mb-1 shrink-0 ring-1 ring-background shadow-2xs">
                                <AvatarImage src={m.sender?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px] bg-slate-200 dark:bg-slate-800 font-semibold">
                                  {getInitials(m.sender?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div className={cn(
                              'max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs relative transition-all',
                              isMine
                                ? 'bg-gradient-to-br from-hotel-navy via-slate-900 to-indigo-950 text-white rounded-ee-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-es-xs border border-slate-200/80 dark:border-slate-800',
                              isUrgent && 'ring-2 ring-red-500 shadow-red-500/10',
                              isHigh && 'ring-2 ring-amber-500 shadow-amber-500/10'
                            )}>
                              {/* Header inside bubble */}
                              <div className="flex items-center justify-between gap-2 mb-1">
                                {!isMine && (
                                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {m.sender?.full_name || t('system', 'System')}
                                  </span>
                                )}
                                {(isUrgent || isHigh) && (
                                  <PriorityBadge priority={m.priority} showIcon={true} className="text-[9px] px-1.5 py-0" />
                                )}
                              </div>

                              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>

                              {/* Time & Read Receipts */}
                              <div className={cn(
                                'text-[10px] mt-1.5 flex items-center gap-1.5',
                                isMine ? 'justify-end text-slate-300' : 'text-slate-400'
                              )}>
                                <span>{m.created_at ? format(new Date(m.created_at), 'p') : ''}</span>
                                {isMine && (
                                  <span>
                                    {m.status === 'read' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-slate-300 inline" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Hospitality Reply Chips */}
          {hasActiveChat && (
            <div className="border-t border-slate-200/70 dark:border-slate-800/70 px-4 py-1.5 bg-slate-50/60 dark:bg-slate-900/40">
              <QuickReplyChips
                lastMessageContent={lastReceivedMessage?.content || ''}
                senderName={otherParticipant?.full_name || ''}
                onSelectReply={(text) => setDraft(prev => prev ? `${prev} ${text}` : text)}
                disabled={sendMessageMutation.isPending}
              />
            </div>
          )}

          {/* Composer Box */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-white dark:bg-slate-900">
            <div className="flex items-end gap-2.5">
              <div className="flex-1 relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all p-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('type_message', 'Type your message...')}
                  className="min-h-[44px] max-h-[140px] border-0 bg-transparent shadow-none focus-visible:ring-0 p-1 resize-none text-sm leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  disabled={(!activeChannel && !otherParticipant?.id) || sendMessageMutation.isPending}
                />

                {/* Priority Selector Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Select value={priority} onValueChange={(val) => setPriority(val as MessagePriority)}>
                      <SelectTrigger className="h-6 text-[11px] px-2 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('priority_low', 'Low')}</SelectItem>
                        <SelectItem value="medium">{t('priority_medium', 'Normal')}</SelectItem>
                        <SelectItem value="high">{t('priority_high', 'High Priority')}</SelectItem>
                        <SelectItem value="urgent" className="text-red-600 font-semibold">{t('priority_urgent', '🚨 Urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {t('press_enter_hint', 'Enter to send, Shift+Enter for new line')}
                  </span>
                </div>
              </div>

              <Button
                className="h-12 w-12 rounded-2xl bg-gradient-to-r from-hotel-navy to-indigo-800 hover:from-hotel-navy/90 hover:to-indigo-900 text-white shadow-md shrink-0 flex items-center justify-center"
                onClick={handleSend}
                disabled={!draft.trim() || ((!activeChannel && !otherParticipant?.id) || sendMessageMutation.isPending)}
              >
                <Send className={cn('w-5 h-5', isRTL && 'rotate-180')} />
              </Button>
            </div>

            {(() => {
              const lastMsg = activeConversation?.messages?.[0] as { id: string; recipient_id?: string | null; status?: string } | undefined
              if (lastMsg?.id && lastMsg.recipient_id === user?.id && lastMsg.status !== 'read') {
                return (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline h-7"
                      onClick={() => markAsReadMutation.mutate(lastMsg.id)}
                      disabled={markAsReadMutation.isPending}
                    >
                      <CheckCheck className="w-3.5 h-3.5 me-1" />
                      {t('mark_read', 'Mark as Read')}
                    </Button>
                  </div>
                )
              }
              return null
            })()}
          </div>
        </div>
      </div>
    </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-hotel-gold" />
              {t('new_chat', 'Start New Conversation')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Search & Department Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
              <div className="relative">
                <Search className={cn('absolute top-2.5 h-4 w-4 text-muted-foreground', isRTL ? 'end-3' : 'start-3')} />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t('search_people', 'Search staff by name...')}
                  className={cn('h-10 rounded-xl', isRTL ? 'pe-9' : 'ps-9')}
                />
              </div>

              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder={t('filter_by_dept', 'Department')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_departments', 'All Depts')}</SelectItem>
                  {departmentsList.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff List */}
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-1">
                {filteredProfiles.map((p) => {
                  const initials = getInitials(p?.full_name, p?.email)

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-start transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                      onClick={() => openNewChatWith(p.id)}
                      disabled={createConversationMutation.isPending}
                    >
                      <Avatar className="h-10 w-10 ring-1 ring-background shrink-0">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-hotel-navy to-indigo-700 text-white font-semibold">
                          {initials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{p.full_name || p.email}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.job_title || 'Staff Member'}
                          {'department' in p && (p as any).department?.name ? ` • ${(p as any).department.name}` : ''}
                        </div>
                      </div>
                    </button>
                  )
                })}
                {filteredProfiles.length === 0 && (
                  <div className="p-8 text-center">
                    <Search className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('no_results', 'No staff found')}</p>
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
