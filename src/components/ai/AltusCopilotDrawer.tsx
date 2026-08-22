import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import {
  type ArticleSource,
  buildGroundedContext,
  extractCitations,
  searchHotelKnowledge,
  useAIChat,
} from '@/lib/ai'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Bot,
  ExternalLink,
  FileText,
  Languages,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface AltusCopilotDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function AltusCopilotDrawer({ isOpen, onClose }: AltusCopilotDrawerProps) {
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar' || i18n.dir() === 'rtl'
  const { profile } = useAuth()
  const [inputVal, setInputVal] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [useRAG, setUseRAG] = useState(true)
  const [isSearchingKnowledge, setIsSearchingKnowledge] = useState(false)
  const [activeSources, setActiveSources] = useState<ArticleSource[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  // Auto-scroll when new messages or streamed tokens arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamedText, isStreaming, isSearchingKnowledge])

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const handleSend = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault()
    const q = (promptOverride || inputVal).trim()
    if (!q || isStreaming) return
    if (!promptOverride) setInputVal('')

    let customSystemPrompt: string | undefined

    if (useRAG) {
      setIsSearchingKnowledge(true)
      try {
        const foundSources = await searchHotelKnowledge(q, {
          propertyId: profile?.property?.id,
          departmentId: profile?.department_id,
          limit: 3,
        })

        if (foundSources.length > 0) {
          setActiveSources(foundSources)
          const groundedContext = buildGroundedContext(q, foundSources)
          customSystemPrompt = groundedContext
        } else {
          setActiveSources([])
        }
      } catch (ragErr) {
        console.warn('RAG preflight search failed, continuing without grounding:', ragErr)
      } finally {
        setIsSearchingKnowledge(false)
      }
    }

    await sendMessage(q, {
      systemPrompt: customSystemPrompt,
    })
  }

  const quickPrompts = [
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: isArabic ? 'تلخيص تقرير الوردية' : 'Draft Shift Handover',
      prompt: isArabic
        ? 'قم بصياغة تقرير تسليم وردية احترافي لقسم العمليات والاستقبال يشمل نسبة الإشغال والمهام العالقة.'
        : 'Draft a professional 5-star shift handover report summarizing key occupancy, VIP arrivals, and pending tasks.',
    },
    {
      icon: <BookOpen className="w-3.5 h-3.5" />,
      label: isArabic ? 'معيار خدمة كبار الشخصيات' : 'VIP Forbes Protocol',
      prompt: isArabic
        ? 'ما هو المعيار التشغيلي المعتمد لاستقبال وضيافة كبار الشخصيات (VIP) في فنادق ألتوس؟'
        : 'What is our standard operational protocol and benchmark for VIP guest arrival and luggage handling at Altus Hotels?',
    },
    {
      icon: <Languages className="w-3.5 h-3.5" />,
      label: isArabic ? 'صياغة تعميم إداري' : 'Draft Arabic Circular',
      prompt: isArabic
        ? 'اكتب مسودة تعميم إداري رسمي للموظفين حول الالتزام بمعايير الجودة والزي الموحد في فنادق ألتوس.'
        : 'Draft an official corporate announcement reminding team members of grooming and uniform standards across Altus properties.',
    },
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
        {/* Backdrop for mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto sm:hidden"
        />

        {/* Sliding Drawer Container */}
        <motion.div
          initial={{ x: isArabic ? -400 : 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isArabic ? -400 : 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          dir={isArabic ? 'rtl' : 'ltr'}
          className={cn(
            'pointer-events-auto relative flex flex-col h-full bg-card/95 backdrop-blur-xl border-s border-border shadow-2xl transition-all duration-300',
            isExpanded ? 'w-full md:w-[650px]' : 'w-full sm:w-[440px]'
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight text-foreground">
                    Altus Copilot
                  </h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                    RAG 2.0
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isArabic ? 'المساعد الذكي لعمليات ألتوس' : 'Altus Hospitality Operations Intelligence'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  clearChat()
                  setActiveSources([])
                }}
                title={isArabic ? 'مسح المحادثة' : 'Clear Chat'}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* RAG Knowledge Grounding Status Bar */}
          <div className="px-4 py-1.5 bg-muted/30 border-b border-border/40 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isArabic ? 'الربط بقاعدة المعرفة الفندقية' : 'Ground in Altus SOPs'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={useRAG}
                onCheckedChange={setUseRAG}
                className="scale-75 data-[state=checked]:bg-indigo-600"
              />
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="px-4 py-2 bg-muted/20 border-b border-border/50 flex gap-2 overflow-x-auto no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(undefined, qp.prompt)}
                disabled={isStreaming || isSearchingKnowledge}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-background border border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              >
                {qp.icon}
                <span>{qp.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => {
                const citations = msg.role === 'assistant' ? extractCitations(msg.content, activeSources) : []

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3 text-xs leading-relaxed',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className="max-w-[85%] space-y-2">
                      <div
                        className={cn(
                          'p-3 rounded-2xl whitespace-pre-wrap',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-ee-none shadow-xs'
                            : 'bg-muted/70 text-foreground border border-border/60 rounded-es-none'
                        )}
                      >
                        {msg.content}
                      </div>

                      {/* Source Citation Badges */}
                      {citations.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold text-[10px] text-indigo-700 dark:text-indigo-400">
                            <BookOpen className="w-3 h-3" />
                            <span>{isArabic ? 'المراجع التشغيلية المعتمدة:' : 'Verified Altus SOP Citations:'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {citations.map((src) => (
                              <Link
                                key={src.id}
                                to={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-indigo-200 dark:border-indigo-800 text-[10px] font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                              >
                                <span>{src.title}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* RAG Searching Knowledge indicator */}
              {isSearchingKnowledge && (
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 p-2 animate-pulse">
                  <Layers className="w-4 h-4 animate-spin" />
                  <span>{isArabic ? 'جارٍ البحث في المعايير التشغيلية القياسية (SOPs)...' : 'Searching Altus Standard Operating Procedures (SOPs)...'}</span>
                </div>
              )}

              {/* Streaming token display */}
              {isStreaming && streamedText && (
                <div className="flex gap-3 text-xs leading-relaxed justify-start">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="p-3 rounded-2xl max-w-[85%] bg-muted/70 text-foreground border border-border/60 rounded-es-none whitespace-pre-wrap">
                    {streamedText}
                    <span className="inline-block w-1.5 h-3.5 ms-1 bg-primary animate-pulse" />
                  </div>
                </div>
              )}

              {/* Loading spinner when waiting for first token */}
              {isStreaming && !streamedText && !isSearchingKnowledge && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>{isArabic ? 'جارٍ تحليل المعايير الفندقية وتوليد الإجابة...' : 'Analyzing Altus standards & generating response...'}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Footer Input */}
          <div className="p-4 border-t border-border bg-card">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={
                  isArabic
                    ? 'اسأل Altus Copilot عن أي إجراء قياسي، معيار فوربس، أو طلب تشغيلي...'
                    : 'Ask Altus Copilot about any hotel SOP, VIP standard, or task...'
                }
                disabled={isStreaming || isSearchingKnowledge}
                className="text-xs h-10 bg-background border-border/80 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputVal.trim() || isStreaming || isSearchingKnowledge}
                className="h-10 w-10 shrink-0"
              >
                {isStreaming || isSearchingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                {isArabic ? 'مشفر ومطابق لنظام حماية البيانات الشخصية (PDPL)' : 'Enterprise encrypted & PDPL compliant'}
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-muted rounded border border-border text-[9px]">
                Cmd+K
              </kbd>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
