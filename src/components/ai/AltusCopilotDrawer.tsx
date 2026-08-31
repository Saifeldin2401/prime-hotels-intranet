import { AIAvatar } from '@/components/ai/AIAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  type ArticleSource,
  buildGroundedContext,
  extractCitations,
  searchHotelKnowledge,
  useAIChat,
  fetchPersonalExecutiveContext,
  type PersonalExecutiveContext,
} from '@/lib/ai'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  Heart,
  Languages,
  Layers,
  Lightbulb,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  PenTool,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Volume2,
  VolumeX,
  Wand2,
  Wrench,
  X,
} from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface AltusCopilotDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type CopilotMode = 'assistant' | 'concierge' | 'writer' | 'ideas'

export function AltusCopilotDrawer({ isOpen, onClose }: AltusCopilotDrawerProps) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar' || i18n.dir() === 'rtl'
  const { profile } = useAuth()
  
  const [inputVal, setInputVal] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [useRAG, setUseRAG] = useState(true)
  const [activeMode, setActiveMode] = useState<CopilotMode>('assistant')
  const [isSearchingKnowledge, setIsSearchingKnowledge] = useState(false)
  const [activeSources, setActiveSources] = useState<ArticleSource[]>([])
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [reactions, setReactions] = useState<Record<string, string>>({})
  const [personalContext, setPersonalContext] = useState<PersonalExecutiveContext | null>(null)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  const firstName = useMemo(() => {
    if (!profile?.full_name) return isArabic ? 'زميلي العزيز' : 'Colleague'
    return profile.full_name.split(' ')[0]
  }, [profile?.full_name, isArabic])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return isArabic ? 'صباح الخير' : 'Good morning'
    if (hour >= 12 && hour < 17) return isArabic ? 'مساء الخير' : 'Good afternoon'
    if (hour >= 17 && hour < 22) return isArabic ? 'مساء الخير' : 'Good evening'
    return isArabic ? 'طابت ليلتك' : 'Good evening'
  }, [isArabic])

  const {
    messages,
    streamedText,
    isStreaming,
    error,
    sendMessage,
    clearChat,
  } = useAIChat({
    property: profile?.property?.name || 'Altus Luxury Hotel',
    department: profile?.departments?.[0]?.name || profile?.department_id || 'Operations',
    role: profile?.role || 'Staff',
    isArabic,
  })

  // Preload personal live DB context when opened
  useEffect(() => {
    if (isOpen && profile?.id) {
      setIsLoadingContext(true)
      fetchPersonalExecutiveContext(profile.id, profile)
        .then((ctx) => setPersonalContext(ctx))
        .catch((e) => console.warn('Failed to preload personal context:', e))
        .finally(() => setIsLoadingContext(false))
    }
  }, [isOpen, profile])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamedText, isStreaming, isSearchingKnowledge, isMinimized])

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen, isMinimized])

  // Stop audio speech when closing
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setSpeakingMsgId(null)
    }
  }, [isOpen])

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Setup Web Speech Recognition for voice dictation
  const toggleSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error(isArabic ? 'المتصفح لا يدعم الإملاء الصوتي المباشر' : 'Speech recognition is not supported in this browser')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = isArabic ? 'ar-SA' : 'en-US'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onstart = () => {
        setIsRecording(true)
        toast.info(isArabic ? '🎙️ تحدث الآن، جاري الاستماع...' : '🎙️ Listening... speak now')
      }

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript.trim()) {
          setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }

      recognition.onerror = () => {
        setIsRecording(false)
        toast.error(isArabic ? 'تعذر التعرف على الصوت' : 'Speech recognition error')
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.warn('Speech recognition start failed:', err)
      setIsRecording(false)
    }
  }, [isArabic, isRecording])

  // Text-to-Speech playback
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Audio playback is not supported on this device')
      return
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingMsgId(null)
      return
    }

    window.speechSynthesis.cancel()
    setSpeakingMsgId(msgId)

    const cleanText = text.replace(/[*_#>`~]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = isArabic ? 'ar-SA' : 'en-US'
    utterance.rate = 1.0

    utterance.onend = () => setSpeakingMsgId(null)
    utterance.onerror = () => setSpeakingMsgId(null)

    window.speechSynthesis.speak(utterance)
  }

  const handleSend = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault()
    const q = (promptOverride || inputVal).trim()
    if (!q || isStreaming) return
    if (!promptOverride) setInputVal('')

    let modeInstruction = ''
    switch (activeMode) {
      case 'assistant':
        modeInstruction = `You are ${firstName}'s dedicated personal 5-star executive AI assistant and chief of staff at Altus Advisory. Speak with warm courtesy, proactivity, and efficiency.`
        break
      case 'concierge':
        modeInstruction = 'Act as an ultra-luxury 5-star Hotel Concierge & Guest Relations Specialist following Forbes Travel Guide benchmarks.'
        break
      case 'writer':
        modeInstruction = 'Act as an Executive Hospitality Communications Scribe drafting elegant circulars, VIP letters, and executive memos.'
        break
      case 'ideas':
        modeInstruction = 'Act as a Creative Guest Experience Designer proposing surprise & delight moments, luxury amenity ideas, and VIP touches.'
        break
    }

    // Refresh personal live DB context
    setIsSearchingKnowledge(true)
    let personalContextBlock = personalContext?.rawContextBlock || ''
    try {
      if (profile?.id) {
        const freshCtx = await fetchPersonalExecutiveContext(profile.id, profile)
        setPersonalContext(freshCtx)
        personalContextBlock = freshCtx.rawContextBlock
      }
    } catch (dbErr) {
      console.warn('Personal DB context refresh warning:', dbErr)
    }

    let groundedSOPContext = ''
    if (useRAG) {
      try {
        const foundSources = await searchHotelKnowledge(q, {
          propertyId: profile?.property?.id,
          departmentId: profile?.department_id,
          limit: 3,
        })

        if (foundSources.length > 0) {
          setActiveSources(foundSources)
          groundedSOPContext = buildGroundedContext(q, foundSources)
        } else {
          setActiveSources([])
        }
      } catch (ragErr) {
        console.warn('RAG search preflight failed:', ragErr)
      }
    }
    setIsSearchingKnowledge(false)

    const finalSystemPrompt = [
      modeInstruction,
      personalContextBlock,
      groundedSOPContext,
    ].filter(Boolean).join('\n\n')

    await sendMessage(q, {
      systemPrompt: finalSystemPrompt,
    })
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMsgId(id)
    toast.success(isArabic ? 'تم نسخ النص إلى الحافظة ✨' : 'Copied to clipboard ✨')
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  const handleReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => ({ ...prev, [msgId]: prev[msgId] === emoji ? '' : emoji }))
  }

  // Personal Assistant Action Starters
  const personalStarters = [
    {
      badge: isArabic ? 'مهامي اليوم' : 'My Day',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      title: isArabic ? 'ملخص مهامي اليومية' : 'My Daily Task Briefing',
      desc: isArabic ? 'استعراض المهام المسندة لي ومواعيدها وأولوياتها' : 'List my assigned pending tasks with priorities and deadlines',
      prompt: isArabic
        ? 'لخص لي مهامي المعلقة اليوم ورتبها حسب الأولوية والموعد النهائي.'
        : 'Summarize my pending tasks for today and list them in order of priority and deadline.',
    },
    {
      badge: isArabic ? 'التدريب' : 'Learning',
      icon: <BookOpen className="w-4 h-4 text-blue-500" />,
      title: isArabic ? 'متابعة دوراتي التدريبية' : 'My Training Progress',
      desc: isArabic ? 'فحص الدورات المطلوبة مني في الأكاديمية ونسبة الإنجاز' : 'Check assigned courses, progress, and upcoming deadlines',
      prompt: isArabic
        ? 'ما هي الدورات التدريبية المسندة لي في منصة التعلم ونسبة إنجازي فيها؟'
        : 'What training courses are assigned to me, and what is my progress and due date?',
    },
    {
      badge: isArabic ? 'التعاميم' : 'Announcements',
      icon: <Bell className="w-4 h-4 text-amber-500" />,
      title: isArabic ? 'آخر تعاميم المنشأة' : 'Latest Property Notices',
      desc: isArabic ? 'أحدث الإعلانات والتعاميم المعتمدة لفندقي' : 'Summarize the latest circulars and announcements for my property',
      prompt: isArabic
        ? 'ما هي أحدث التعاميم والإعلانات المنشورة لفندقي هذا الأسبوع؟'
        : 'What are the latest announcements and corporate circulars for my hotel property?',
    },
    {
      badge: isArabic ? 'الضيافة' : 'Forbes 5-Star',
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      title: isArabic ? 'بروتوكول خدمة VIP' : 'VIP Forbes Protocol',
      desc: isArabic ? 'معيار استقبال وضيافة كبار الشخصيات' : 'Standard Forbes benchmarks for VIP arrival & luxury service',
      prompt: isArabic
        ? 'ما هو المعيار التشغيلي المعتمد لاستقبال وضيافة كبار الشخصيات (VIP) في فنادق ألتوس؟'
        : 'What is our standard operational protocol and benchmark for VIP guest arrival and luggage handling at Altus Hotels?',
    },
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {/* Minimized Floating Capsule */}
      {isMinimized ? (
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          className="fixed bottom-6 end-6 z-[9999]"
        >
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-3 px-3.5 py-2 rounded-full bg-gradient-to-r from-hotel-navy via-slate-900 to-indigo-950 text-white font-semibold text-xs shadow-2xl border border-amber-400/40 hover:scale-105 hover:shadow-indigo-500/30 transition-all cursor-pointer group"
          >
            <AIAvatar size="sm" showStatus={false} />
            <span className="tracking-wide">{firstName}&apos;s Assistant</span>
            <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] px-1.5 py-0">
              {messages.length}
            </Badge>
          </button>
        </motion.div>
      ) : (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-end sm:items-end justify-end p-3 sm:p-6">
          {/* Subtle Ambient Dimmer for Maximize Mode */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto cursor-pointer"
            />
          )}

          {/* Floating Personal Assistant HUD Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 28 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 28 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            dir={isArabic ? 'rtl' : 'ltr'}
            className={cn(
              'pointer-events-auto relative flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300',
              isExpanded
                ? 'w-full sm:w-[760px] h-[85vh] max-h-[840px] mx-auto my-auto sm:my-0'
                : 'w-full sm:w-[440px] h-[630px] max-h-[calc(100vh-6rem)]'
            )}
          >
            {/* Top Animated Ambient Lighting Bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-amber-400" />

            {/* === PERSONAL ASSISTANT HEADER === */}
            <div className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-b from-slate-50/90 to-white/70 dark:from-slate-900/90 dark:to-slate-900/60 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Modern Personal AI Avatar */}
                <AIAvatar size="lg" isThinking={isStreaming || isSearchingKnowledge} />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight truncate">
                      {greeting}, {firstName}
                    </h3>
                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shrink-0">
                      Personal AI
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {profile?.job_title ? `${profile.job_title} · ` : ''}{profile?.property?.name || 'Altus Advisory'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl text-muted-foreground hover:text-slate-900 dark:hover:text-white"
                  onClick={() => {
                    clearChat()
                    setActiveSources([])
                    toast.info(isArabic ? 'تم بدء جلسة جديدة' : 'New session started')
                  }}
                  title={isArabic ? 'جلسة جديدة' : 'New Session'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl text-muted-foreground hover:text-slate-900 dark:hover:text-white hidden sm:inline-flex"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Restore' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl text-muted-foreground hover:text-slate-900 dark:hover:text-white"
                  onClick={() => setIsMinimized(true)}
                  title={isArabic ? 'تصغير' : 'Minimize'}
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={onClose}
                  title={isArabic ? 'إغلاق (Esc)' : 'Close (Esc)'}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* === EXECUTIVE DAILY BRIEFING SNAPSHOT BAR === */}
            <div className="px-3 py-2 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none shrink-0 text-[11px]">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => handleSend(undefined, isArabic ? 'لخص لي مهامي المعلقة اليوم.' : 'Summarize my pending tasks for today.')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:border-emerald-400 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{isArabic ? 'المهام' : 'Tasks'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend(undefined, isArabic ? 'ما هي الدورات التدريبية المسندة لي في منصة التعلم؟' : 'What training courses are assigned to me?')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:border-blue-400 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  <span>{isArabic ? 'التدريب' : 'Courses'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSend(undefined, isArabic ? 'ما هي أحدث التعاميم والإعلانات المنشورة لفندقي؟' : 'What are the latest announcements for my hotel property?')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:border-amber-400 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <Bell className="w-3 h-3 text-amber-500" />
                  <span>{isArabic ? 'التعاميم' : 'Notices'}</span>
                </button>
              </div>

              {/* RAG SOP Toggle */}
              <div className="flex items-center gap-1 ms-1 shrink-0">
                <span className="text-[10px] font-semibold text-slate-500">SOPs</span>
                <Switch
                  checked={useRAG}
                  onCheckedChange={setUseRAG}
                  className="scale-75 data-[state=checked]:bg-indigo-600"
                  title={isArabic ? 'مطابقة معايير الفندق (SOPs)' : 'Ground in Altus SOPs'}
                />
              </div>
            </div>

            {/* === MESSAGES STREAM & HISTORY === */}
            <ScrollArea className="flex-1 p-3.5 sm:p-4 bg-slate-50/40 dark:bg-slate-950/40">
              <div className="space-y-4">
                {/* Welcome Interactive Canvas if empty */}
                {messages.length === 0 && !isStreaming && (
                  <div className="space-y-3 pt-2">
                    <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-amber-50/60 dark:from-slate-800/80 dark:via-indigo-950/30 dark:to-slate-800/60 border border-blue-100/80 dark:border-slate-800 text-center space-y-2 shadow-xs">
                      <div className="flex justify-center">
                        <AIAvatar size="xl" showStatus={false} />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {isArabic ? `مرحباً ${firstName}، كيف يمكنني مساعدتك؟` : `Hi ${firstName}, how can I help you today?`}
                      </h4>
                      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                        {isArabic
                          ? 'أنا مساعدك الشخصي لإدارة مهامك، متابعة التدريب، والإجابة عن السياسات التشغيلية.'
                          : 'I am your personal AI assistant ready to help with your assigned tasks, training courses, and hotel SOPs.'}
                      </p>
                    </div>

                    {/* Personal Starter Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {personalStarters.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(undefined, item.prompt)}
                          disabled={isStreaming || isSearchingKnowledge}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400/80 dark:hover:border-indigo-500/80 text-start transition-all group shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between gap-1.5"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 group-hover:scale-110 transition-transform">
                              {item.icon}
                            </div>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-slate-500 border-slate-200 dark:border-slate-700">
                              {item.badge}
                            </Badge>
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isUser = msg.role === 'user'
                  const citations = !isUser ? extractCitations(msg.content, activeSources) : []
                  const isSpeaking = speakingMsgId === msg.id

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-2.5 text-xs leading-relaxed group animate-in fade-in slide-in-from-bottom-2',
                        isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {!isUser && (
                        <AIAvatar size="sm" showStatus={false} className="mt-0.5" />
                      )}

                      <div className="max-w-[85%] space-y-1.5">
                        <div
                          className={cn(
                            'p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed relative text-xs shadow-xs',
                            isUser
                              ? 'bg-gradient-to-br from-hotel-navy via-slate-900 to-indigo-950 text-white rounded-ee-xs'
                              : 'bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-es-xs'
                          )}
                        >
                          {msg.content}
                        </div>

                        {/* Citations */}
                        {citations.length > 0 && (
                          <div className="p-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 space-y-1">
                            <div className="flex items-center gap-1 font-semibold text-[10px] text-indigo-700 dark:text-indigo-300">
                              <BookOpen className="w-3 h-3" />
                              <span>{isArabic ? 'المراجع التشغيلية المعتمدة:' : 'Verified Altus SOPs:'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {citations.map((src) => (
                                <Link
                                  key={src.id}
                                  to={src.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-[10px] font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 transition-colors"
                                >
                                  <span>{src.title}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interactive Message Toolbar */}
                        {!isUser && (
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                            <div className="flex items-center gap-2">
                              {/* Copy Button */}
                              <button
                                type="button"
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                {copiedMsgId === msg.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedMsgId === msg.id ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ' : 'Copy')}</span>
                              </button>

                              {/* Speak / Read Aloud Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleSpeak(msg.id, msg.content)}
                                className={cn(
                                  'flex items-center gap-1 hover:text-indigo-600 transition-colors',
                                  isSpeaking && 'text-indigo-600 font-bold animate-pulse'
                                )}
                              >
                                {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                <span>{isSpeaking ? (isArabic ? 'إيقاف' : 'Stop') : (isArabic ? 'استماع' : 'Listen')}</span>
                              </button>
                            </div>

                            {/* Fun Emojis Reactions */}
                            <div className="flex items-center gap-1">
                              {[
                                { emoji: '👍', icon: <ThumbsUp className="w-3 h-3" /> },
                                { emoji: '🔥', icon: <Flame className="w-3 h-3 text-amber-500" /> },
                                { emoji: '💡', icon: <Lightbulb className="w-3 h-3 text-yellow-500" /> },
                                { emoji: '❤️', icon: <Heart className="w-3 h-3 text-rose-500" /> },
                              ].map((r) => (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => handleReaction(msg.id, r.emoji)}
                                  className={cn(
                                    'h-5 w-5 rounded-md flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs',
                                    reactions[msg.id] === r.emoji && 'bg-slate-200 dark:bg-slate-700 scale-125'
                                  )}
                                >
                                  {reactions[msg.id] === r.emoji ? r.emoji : r.icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold shadow-2xs">
                          {firstName ? firstName[0].toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* RAG Knowledge Search Animation */}
                {isSearchingKnowledge && (
                  <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 p-2.5 animate-pulse bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900 shadow-2xs">
                    <Layers className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>{isArabic ? 'جارٍ التحقق من قاعدة البيانات والمعايير التشغيلية...' : 'Accessing personal DB records & hotel SOPs...'}</span>
                  </div>
                )}

                {/* Streaming Token Animation */}
                {isStreaming && streamedText && (
                  <div className="flex gap-2.5 text-xs leading-relaxed justify-start">
                    <AIAvatar size="sm" isThinking={true} showStatus={false} className="mt-0.5" />
                    <div className="p-3.5 rounded-2xl max-w-[85%] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-es-xs whitespace-pre-wrap leading-relaxed shadow-xs">
                      {streamedText}
                      <span className="inline-block w-1.5 h-3.5 ms-1 bg-amber-500 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Loading state before first token */}
                {isStreaming && !streamedText && !isSearchingKnowledge && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>{isArabic ? 'المساعد الشخصي يحلل طلبك...' : 'Your personal assistant is preparing an answer...'}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-2xl">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* === COMPOSER BOX WITH VOICE DICTATION === */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
              <form onSubmit={handleSend} className="space-y-2">
                <div className="relative flex items-end gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                  
                  {/* Mic Button for Voice Dictation */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleSpeechRecognition}
                    className={cn(
                      'h-8 w-8 rounded-xl shrink-0 transition-colors',
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse shadow-md hover:bg-red-600'
                        : 'text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                    )}
                    title={isArabic ? 'تسجيل صوتي' : 'Voice Input'}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>

                  <Textarea
                    ref={textareaRef}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={
                      isArabic
                        ? `اسأل مساعدك الشخصي، أو اطلب تلخيص مهامك...`
                        : `Ask your personal assistant, check tasks, or speak...`
                    }
                    rows={1}
                    disabled={isStreaming || isSearchingKnowledge}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    className="min-h-[38px] max-h-[120px] border-0 bg-transparent shadow-none focus-visible:ring-0 p-1.5 resize-none text-xs leading-relaxed"
                  />

                  {/* Send Button */}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputVal.trim() || isStreaming || isSearchingKnowledge}
                    className="h-8 w-8 rounded-xl bg-gradient-to-r from-hotel-navy to-indigo-800 hover:from-hotel-navy/90 hover:to-indigo-900 text-white shadow-xs shrink-0 flex items-center justify-center p-0"
                  >
                    {isStreaming || isSearchingKnowledge ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className={cn('w-3.5 h-3.5', isArabic && 'rotate-180')} />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    {isArabic ? 'مشفر ومطابق لـ PDPL' : 'Encrypted & PDPL Compliant'}
                  </span>
                  <span className="hidden sm:inline">
                    {isArabic ? 'Enter للإرسال · Shift+Enter لسطر جديد' : 'Enter to send · Shift+Enter for new line'}
                  </span>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
