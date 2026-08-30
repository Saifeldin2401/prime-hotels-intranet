import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles,
  Send,
  User,
  Bot,
  Flame,
  Award,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import {
  ROLEPLAY_SCENARIOS,
  roleplayEngine,
  type RoleplayScenario,
  type RoleplayMessage,
  type RoleplayTurnEvaluation,
} from '@/lib/ai/roleplayEngine'
import { cn } from '@/lib/utils'

interface GuestRoleplaySimulatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuestRoleplaySimulatorModal({
  open,
  onOpenChange,
}: GuestRoleplaySimulatorModalProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario>(
    ROLEPLAY_SCENARIOS[0]
  )
  const [messages, setMessages] = useState<RoleplayMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [latestEvaluation, setLatestEvaluation] = useState<RoleplayTurnEvaluation | null>(null)
  const [isResolved, setIsResolved] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize scenario conversation
  useEffect(() => {
    if (open) {
      setMessages([
        {
          sender: 'guest',
          text: isRTL
            ? selectedScenario.initialGuestDialogueAr
            : selectedScenario.initialGuestDialogue,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperament: selectedScenario.guestTemperament,
        },
      ])
      setLatestEvaluation(null)
      setIsResolved(false)
      setInputValue('')
    }
  }, [selectedScenario, open, isRTL])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isEvaluating])

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputValue).trim()
    if (!textToSend || isEvaluating) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newHistory: RoleplayMessage[] = [
      ...messages,
      { sender: 'trainee', text: textToSend, timestamp: now },
    ]

    setMessages(newHistory)
    setInputValue('')
    setIsEvaluating(true)

    try {
      // 1. Evaluate trainee turn
      const evalResult = await roleplayEngine.evaluateTraineeTurn(
        selectedScenario,
        messages,
        textToSend,
        isRTL ? 'ar' : 'en'
      )
      setLatestEvaluation(evalResult)

      if (evalResult.isResolved) {
        setIsResolved(true)
      }

      // 2. Generate guest response if not fully resolved
      if (!evalResult.isResolved) {
        const guestTurn = await roleplayEngine.generateGuestTurn(
          selectedScenario,
          newHistory,
          isRTL ? 'ar' : 'en'
        )

        setMessages((prev) => [
          ...prev,
          {
            sender: 'guest',
            text: guestTurn.guestReply,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            temperament: guestTurn.nextTemperament,
          },
        ])
      }
    } finally {
      setIsEvaluating(false)
    }
  }

  const restartSimulation = () => {
    setMessages([
      {
        sender: 'guest',
        text: isRTL
          ? selectedScenario.initialGuestDialogueAr
          : selectedScenario.initialGuestDialogue,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperament: selectedScenario.guestTemperament,
      },
    ])
    setLatestEvaluation(null)
    setIsResolved(false)
    setInputValue('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{t('roleplay.title', '5-Star Hospitality Guest Roleplay Simulator')}</span>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200">
                    Live five-star Standard AI
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t('roleplay.subtitle', 'Practice handling high-stakes luxury guest dilemmas with real-time feedback and empathy scoring.')}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={restartSimulation} className="text-xs h-8 gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('roleplay.restart', 'Restart')}</span>
              </Button>
            </div>
          </div>

          {/* Scenario Selector Chips */}
          <div className="flex items-center gap-2 pt-3 overflow-x-auto pb-1">
            {ROLEPLAY_SCENARIOS.map((sc) => (
              <Button
                key={sc.id}
                size="sm"
                variant={selectedScenario.id === sc.id ? 'default' : 'outline'}
                onClick={() => setSelectedScenario(sc)}
                className={cn(
                  'text-xs h-7 shrink-0 rounded-full',
                  selectedScenario.id === sc.id
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                )}
              >
                {isRTL ? sc.titleAr : sc.title}
              </Button>
            ))}
          </div>
        </DialogHeader>

        {/* Main Grid: Chat & Persona Left, Rubric Radar Right */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          {/* Left Column: Chat and Interaction (2 Cols) */}
          <div className="md:col-span-2 flex flex-col border-e border-slate-100 dark:border-slate-800 h-[520px]">
            {/* Guest Persona Card Banner */}
            <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedScenario.guestName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">
                    {isRTL ? selectedScenario.guestProfileAr : selectedScenario.guestProfile}
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-semibold flex items-center gap-1',
                  isResolved
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                )}
              >
                {isResolved ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Resolved</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3 h-3 text-rose-500" />
                    <span>{selectedScenario.guestTemperament}</span>
                  </>
                )}
              </Badge>
            </div>

            {/* Messages Scroll Area */}
            <ScrollArea className="flex-1 p-4 space-y-3">
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex gap-2.5 max-w-[85%]',
                      m.sender === 'trainee'
                        ? 'ms-auto flex-row-reverse text-right'
                        : 'me-auto text-left'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                        m.sender === 'trainee'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {m.sender === 'trainee' ? 'You' : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={cn(
                        'rounded-2xl p-3 text-xs leading-relaxed',
                        m.sender === 'trainee'
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                      )}
                    >
                      <p>{m.text}</p>
                      <span
                        className={cn(
                          'text-[9px] block mt-1 opacity-70',
                          m.sender === 'trainee' ? 'text-blue-100' : 'text-slate-400'
                        )}
                      >
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isEvaluating && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>{t('roleplay.evaluating', 'Guest is reacting & AI Coach is grading...')}</span>
                  </div>
                )}

                {isResolved && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center space-y-1.5 my-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      🎉 {t('roleplay.dilemmaResolved', 'Guest Dilemma Successfully Resolved!')}
                    </h5>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {t('roleplay.resolvedDesc', 'You achieved 5-star standard de-escalation with high empathy and decisive hospitality recovery.')}
                    </p>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input & Quick Chips */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              {latestEvaluation?.suggestedAlternativeResponse && !isResolved && (
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-600 dark:text-slate-400">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="shrink-0 font-semibold">{t('roleplay.coachingChip', '5-Star Phrasing')}:</span>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        isRTL
                          ? latestEvaluation.suggestedAlternativeResponseAr
                          : latestEvaluation.suggestedAlternativeResponse
                      )
                    }
                    className="underline text-amber-600 hover:text-amber-700 truncate max-w-xs text-left"
                  >
                    "{isRTL ? latestEvaluation.suggestedAlternativeResponseAr : latestEvaluation.suggestedAlternativeResponse}"
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={
                    isRTL
                      ? 'اكتب ردك الاحترافي هنا...'
                      : 'Type your professional 5-star response...'
                  }
                  disabled={isEvaluating || isResolved}
                  className="text-xs h-9 bg-white dark:bg-slate-950"
                />
                <Button
                  size="sm"
                  onClick={() => handleSendMessage()}
                  disabled={isEvaluating || isResolved || !inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: 5-Star Rubric Metrics & Live Feedback */}
          <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 space-y-4 overflow-y-auto h-[520px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('roleplay.rubricTitle', '5-Star Rubric Assessment')}</span>
              </h4>
              {latestEvaluation && (
                <Badge variant="outline" className="text-xs font-bold bg-white text-slate-800">
                  {latestEvaluation.overallScore}/100
                </Badge>
              )}
            </div>

            {latestEvaluation ? (
              <div className="space-y-3.5">
                {/* Metric Bars */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span>❤️ {t('roleplay.empathy', 'Empathy & Validation')}</span>
                      <span className="font-bold">{latestEvaluation.empathyScore}%</span>
                    </div>
                    <Progress value={latestEvaluation.empathyScore} className="h-1.5 [&>div]:bg-rose-500" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span>⚡ {t('roleplay.resolution', 'Problem Resolution')}</span>
                      <span className="font-bold">{latestEvaluation.problemResolutionScore}%</span>
                    </div>
                    <Progress value={latestEvaluation.problemResolutionScore} className="h-1.5 [&>div]:bg-blue-500" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span>⭐ {t('roleplay.serviceStandards', 'Five-Star Service Standards')}</span>
                      <span className="font-bold">{latestEvaluation.serviceStandardScore}%</span>
                    </div>
                    <Progress value={latestEvaluation.serviceStandardScore} className="h-1.5 [&>div]:bg-amber-500" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span>🌴 {t('roleplay.karam', 'Saudi Karam & Etiquette')}</span>
                      <span className="font-bold">{latestEvaluation.saudiKaramScore}%</span>
                    </div>
                    <Progress value={latestEvaluation.saudiKaramScore} className="h-1.5 [&>div]:bg-emerald-500" />
                  </div>
                </div>

                {/* Coach Feedback Note */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 space-y-1.5 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('roleplay.coachInsight', 'AI Coach Feedback')}:</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isRTL ? latestEvaluation.feedbackAr : latestEvaluation.feedback}
                  </p>
                </div>

                {/* Actionable Tips */}
                {latestEvaluation.coachingTips?.length > 0 && (
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      {t('roleplay.keyImprovements', 'Recommended Refinements')}:
                    </span>
                    <ul className="list-disc list-inside space-y-1">
                      {latestEvaluation.coachingTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 space-y-2 text-muted-foreground">
                <Bot className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs">
                  {t('roleplay.noEvaluationYet', 'Type your response to the guest to see live five-star rubric scoring.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
