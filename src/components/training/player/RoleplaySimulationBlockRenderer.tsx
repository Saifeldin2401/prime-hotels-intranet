import React, { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { TrainingContentBlock } from '@/lib/types/training'
import {
  HOTEL_ROLEPLAY_SCENARIOS,
  roleplayEngine,
  type RoleplayScenario,
  type RoleplayMessage,
  type RoleplayTurnEvaluation,
  type GuestTemperament,
} from '@/lib/ai/roleplayEngine'
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Flame,
  HeartHandshake,
  Lightbulb,
  Loader2,
  MessageSquare,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface RoleplaySimulationBlockRendererProps {
  block: TrainingContentBlock
  moduleId: string
  onBlockComplete?: (blockId: string, score: number) => void
  isRTL?: boolean
}

export function RoleplaySimulationBlockRenderer({
  block,
  moduleId,
  onBlockComplete,
  isRTL = false,
}: RoleplaySimulationBlockRendererProps) {
  const { t, i18n } = useTranslation('training')
  const { toast } = useToast()
  const isArabic = isRTL || i18n.language === 'ar'

  // Extract scenario config from content_data
  const contentData = (block.content_data as Record<string, unknown>) || {}
  const targetScenarioId = (contentData.scenario_id as string) || ''
  const requiredPassingScore = Number(contentData.passing_score ?? contentData.passingScore ?? 80)
  const maxTurns = Number(contentData.max_turns ?? contentData.maxTurns ?? 5)

  // Resolve matching scenario or fallback to default
  const selectedScenario: RoleplayScenario =
    HOTEL_ROLEPLAY_SCENARIOS.find((s) => s.id === targetScenarioId) ||
    HOTEL_ROLEPLAY_SCENARIOS[0]

  // State
  const [messages, setMessages] = useState<RoleplayMessage[]>([
    {
      sender: 'guest',
      text: isArabic ? selectedScenario.initialGuestDialogueAr : selectedScenario.initialGuestDialogue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temperament: selectedScenario.guestTemperament,
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [latestEvaluation, setLatestEvaluation] = useState<RoleplayTurnEvaluation | null>(null)
  const [cumulativeScores, setCumulativeScores] = useState<number[]>([])
  const [guestTemperament, setGuestTemperament] = useState<GuestTemperament>(selectedScenario.guestTemperament)
  const [isCompleted, setIsCompleted] = useState(false)
  const [passed, setPassed] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, latestEvaluation])

  // Average score
  const averageScore = cumulativeScores.length > 0
    ? Math.round(cumulativeScores.reduce((a, b) => a + b, 0) / cumulativeScores.length)
    : 0

  const traineeTurnCount = messages.filter((m) => m.sender === 'trainee').length

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim()
    if (!textToSend || isEvaluating || isCompleted) return

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: RoleplayMessage = {
      sender: 'trainee',
      text: textToSend,
      timestamp: nowStr,
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    if (!customText) setInputText('')
    setIsEvaluating(true)

    try {
      // 1. Evaluate Trainee Response with Multi-Provider AI
      const evaluation = await roleplayEngine.evaluateTraineeTurn({
        scenario: selectedScenario,
        conversationHistory: updatedMessages,
        latestTraineeResponse: textToSend,
        language: isArabic ? 'ar' : 'en',
      })

      setLatestEvaluation(evaluation)
      const newScores = [...cumulativeScores, evaluation.overallScore]
      setCumulativeScores(newScores)

      const currentAvg = Math.round(newScores.reduce((a, b) => a + b, 0) / newScores.length)
      const newTurnCount = traineeTurnCount + 1

      // 2. Adjust Guest Temperament
      let nextTemperament: GuestTemperament = guestTemperament
      if (evaluation.overallScore >= 85) {
        nextTemperament = 'CALM'
      } else if (evaluation.overallScore < 50) {
        nextTemperament = 'DISTRESSED'
      }
      setGuestTemperament(nextTemperament)

      // 3. Check if completed or generate next guest turn
      if (newTurnCount >= maxTurns || (evaluation.overallScore >= 90 && newTurnCount >= 3)) {
        setIsCompleted(true)
        const hasPassed = currentAvg >= requiredPassingScore
        setPassed(hasPassed)

        if (hasPassed) {
          toast({
            title: isArabic ? '🎉 تم اجتياز محاكاة خدمة النزيل بنجاح!' : '🎉 Simulation Passed Successfully!',
            description: isArabic
              ? `أحرزت متوسط تقييم ${currentAvg}% (المطلوب: ${requiredPassingScore}%).`
              : `You achieved an average score of ${currentAvg}% (Passing: ${requiredPassingScore}%).`,
          })
          onBlockComplete?.(block.id, currentAvg)
        } else {
          toast({
            title: isArabic ? '⚠️ لم يتم اجتياز المحاكاة' : '⚠️ Passing Score Not Met',
            description: isArabic
              ? `متوسط درجتك هو ${currentAvg}%. يمكنك إعادة المحاولة للوصول إلى ${requiredPassingScore}%.`
              : `Your average score is ${currentAvg}%. Try again to reach ${requiredPassingScore}%.`,
            variant: 'destructive',
          })
        }
      } else {
        // Generate AI guest next reply
        const guestResponse = await roleplayEngine.generateGuestNextTurn({
          scenario: selectedScenario,
          conversationHistory: updatedMessages,
          latestTraineeResponse: textToSend,
          currentTemperament: nextTemperament,
          language: isArabic ? 'ar' : 'en',
        })

        setMessages((prev) => [
          ...prev,
          {
            sender: 'guest',
            text: guestResponse.guestReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temperament: guestResponse.newTemperament,
          },
        ])
        setGuestTemperament(guestResponse.newTemperament)
      }
    } catch (err) {
      console.error('Roleplay turn evaluation failure:', err)
      toast({
        title: isArabic ? 'خطأ في معالجة المحاكاة' : 'Simulation Error',
        description: isArabic
          ? 'حدث خطأ في محرك الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.'
          : 'AI evaluator encountered an issue. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleResetSimulation = () => {
    setMessages([
      {
        sender: 'guest',
        text: isArabic ? selectedScenario.initialGuestDialogueAr : selectedScenario.initialGuestDialogue,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperament: selectedScenario.guestTemperament,
      },
    ])
    setLatestEvaluation(null)
    setCumulativeScores([])
    setGuestTemperament(selectedScenario.guestTemperament)
    setIsCompleted(false)
    setPassed(false)
    setInputText('')
  }

  // Quick Phrasing Helpers
  const quickPhrases = isArabic
    ? [
        'يسعدني ويشرفني خدمتك فوراً',
        'أعتذر بشدة عن أي إزعاج، وسأتولى الأمر بنفسي',
        'حرصاً على راحتك، سأقوم بالتنسيق مع الإدارة فوراً',
      ]
    : [
        'It is entirely my pleasure to resolve this for you right away.',
        'I sincerely apologize for the inconvenience and will personally handle this.',
        'Allow me to coordinate directly with our management to ensure your satisfaction.',
      ]

  return (
    <Card className="border-amber-200/80 dark:border-amber-800/60 shadow-md bg-gradient-to-b from-amber-50/20 via-background to-background overflow-hidden my-6">
      {/* Header Bar */}
      <CardHeader className="pb-3 border-b bg-amber-500/5 dark:bg-amber-950/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {t('roleplay.badge', 'AI Guest Roleplay')}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {selectedScenario.department.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-medium text-muted-foreground">
                Passing: {requiredPassingScore}%
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              {isArabic ? selectedScenario.titleAr : selectedScenario.title}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {cumulativeScores.length > 0 && (
              <div className="text-end">
                <span className="text-[10px] text-muted-foreground block">Current Score</span>
                <span className={cn(
                  'text-sm font-black',
                  averageScore >= requiredPassingScore ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {averageScore}%
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSimulation}
              className="h-8 text-xs gap-1"
              title="Restart Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('roleplay.restart', 'Restart')}</span>
            </Button>
          </div>
        </div>

        {/* Scenario Objective Box */}
        <p className="text-xs text-muted-foreground bg-background/80 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 mt-2">
          <strong>{t('roleplay.briefing', 'Guest Context')}: </strong>
          {isArabic ? selectedScenario.scenarioContextAr : selectedScenario.scenarioContext}
        </p>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Guest Profile & Temperament Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center font-bold text-amber-700 dark:text-amber-300">
              {selectedScenario.guestName.charAt(0)}
            </div>
            <div>
              <span className="font-bold text-foreground">{selectedScenario.guestName}</span>
              <span className="text-muted-foreground text-[11px] block">
                {isArabic ? selectedScenario.guestProfileAr : selectedScenario.guestProfile}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Guest Temperament:</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-bold uppercase',
                guestTemperament === 'CALM' && 'text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30',
                guestTemperament === 'FRUSTRATED' && 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30',
                (guestTemperament === 'DISTRESSED' || guestTemperament === 'DEMANDING_VIP') && 'text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/30'
              )}
            >
              {guestTemperament}
            </Badge>
          </div>
        </div>

        {/* Chat Thread */}
        <ScrollArea className="h-72 rounded-xl border bg-card p-4">
          <div className="space-y-3.5">
            {messages.map((msg, idx) => {
              const isGuest = msg.sender === 'guest'
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex flex-col',
                    isGuest ? 'items-start' : 'items-end'
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isGuest ? (
                      <>
                        <User className="w-3 h-3 text-amber-600" />
                        <span className="text-[10px] font-bold text-muted-foreground">{selectedScenario.guestName}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold text-primary">You (Trainee)</span>
                      </>
                    )}
                    <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      'p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-xs',
                      isGuest
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 text-foreground border border-amber-200/60 dark:border-amber-800/40 rounded-tl-xs'
                        : 'bg-primary text-primary-foreground rounded-tr-xs'
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              )
            })}

            {isEvaluating && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>{isArabic ? 'الذكاء الاصطناعي يحلل استجابتك وفق معايير فوربس والضيافة السعودية...' : 'AI evaluating response against Forbes 5-Star & Saudi Karam rubrics...'}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Live Turn Feedback & Coaching Insights */}
        {latestEvaluation && (
          <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Turn Assessment: {latestEvaluation.overallScore}/100
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">Empathy: <strong>{latestEvaluation.empathyScore}%</strong></span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Saudi Karam: <strong>{latestEvaluation.saudiKaramScore}%</strong></span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Resolution: <strong>{latestEvaluation.problemResolutionScore}%</strong></span>
              </div>
            </div>

            <p className="text-xs text-foreground">
              {isArabic ? latestEvaluation.feedbackAr : latestEvaluation.feedback}
            </p>

            {latestEvaluation.suggestedAlternativeResponse && (
              <div className="text-[11px] p-2 rounded bg-background/80 border text-muted-foreground flex items-start gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Forbes 5-Star Phrasing Tip: </strong>
                  <span>{isArabic ? latestEvaluation.suggestedAlternativeResponseAr : latestEvaluation.suggestedAlternativeResponse}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion Result Banner */}
        {isCompleted && (
          <div className={cn(
            'p-4 rounded-xl border text-center space-y-2',
            passed
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          )}>
            <div className="flex items-center justify-center gap-2">
              {passed ? (
                <>
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold">{t('roleplay.passedTitle', 'Simulation Completed & Passed!')}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                  <span className="text-sm font-bold">{t('roleplay.failedTitle', 'Passing Score Not Met')}</span>
                </>
              )}
            </div>
            <p className="text-xs">
              Final Average Score: <strong>{averageScore}%</strong> (Passing Requirement: {requiredPassingScore}%)
            </p>
          </div>
        )}

        {/* Input Bar & Suggested Phrases */}
        {!isCompleted && (
          <div className="space-y-2">
            {/* Quick action phrasing chips */}
            <div className="flex flex-wrap gap-1.5">
              {quickPhrases.map((phrase, pIdx) => (
                <Button
                  key={pIdx}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputText(phrase)}
                  className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground border-dashed"
                >
                  "{phrase.slice(0, 35)}..."
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSendMessage()
                  }
                }}
                placeholder={
                  isArabic
                    ? 'اكتب ردك للنزيل واضغط Enter...'
                    : 'Type your response to the guest and press Enter...'
                }
                disabled={isEvaluating}
                className="text-xs"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isEvaluating}
                className="gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                {isEvaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{t('send', 'Send')}</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
