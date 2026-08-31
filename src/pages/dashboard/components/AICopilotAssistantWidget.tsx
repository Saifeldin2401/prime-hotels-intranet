import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  Search, 
  Send, 
  Brain, 
  BookOpen, 
  HelpCircle, 
  Bot, 
  ArrowRight,
  Zap,
  CheckCircle2,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { aiService } from '@/lib/gemini'
import { useTenant } from '@/contexts/TenantContext'

export const AICopilotAssistantWidget: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'knowledge', 'common'])
  const navigate = useNavigate()
  const { currentOrganization } = useTenant()
  const isRTL = i18n.language === 'ar' || document.documentElement.dir === 'rtl'

  const [query, setQuery] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [responseSnippet, setResponseSnippet] = useState<string | null>(null)

  const quickPrompts = [
    {
      label: isRTL ? 'معايير استقبال الـ VIP' : 'VIP Arrival Protocol',
      query: 'What is the standard VIP arrival procedure?',
      icon: BookOpen,
    },
    {
      label: isRTL ? 'إجراءات النظافة وسلامة الغذاء' : 'Food Safety & HACCP',
      query: 'What are the critical HACCP hygiene checkpoints?',
      icon: FileText,
    },
    {
      label: isRTL ? 'توليد اختبار سريع (5 أسئلة)' : 'Generate Quick Quiz',
      action: () => navigate('/assessments/generate'),
      icon: HelpCircle,
    },
  ]

  const handleAskAI = async (customQuery?: string) => {
    const textToAsk = customQuery || query
    if (!textToAsk.trim()) return

    setIsAsking(true)
    setResponseSnippet(null)

    try {
      const prompt = `As an expert hospitality training AI copilot for ${currentOrganization?.name || 'our hotel organization'}, provide a concise, high-impact operational answer (max 3 sentences) to this question:\n\n"${textToAsk}"\n\nProvide the answer in ${isRTL ? 'Arabic' : 'English'}.`
      const answer = await aiService.improveContent(prompt, 'professional', isRTL ? 'Arabic' : 'English')
      if (answer) {
        setResponseSnippet(answer.replace(/^<[^>]+>|<[^>]+>$/g, '').trim())
      }
    } catch {
      setResponseSnippet(
        isRTL
          ? 'تفضل بزيارة مركز المعرفة للبحث التفصيلي في أدلة التشغيل القياسية المعتمدة.'
          : 'Please visit the Knowledge Base to review the complete standard operating procedures.'
      )
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] via-card/80 to-card/40 p-6 shadow-sm backdrop-blur-xl transition-all">
      {/* Ambient Glow */}
      <div className="pointer-events-none absolute -top-16 -end-16 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {isRTL ? 'مساعد الذكاء الاصطناعي الفندقي' : 'AI Hospitality Copilot'}
              </h3>
              <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0">
                GPT-4o / Gemini
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'إجابات فورية من معايير التشغيل وسياسات الفندق' : 'Instant operational answers grounded in SOPs'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Question Input */}
      <div className="mt-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAskAI()
          }}
          className="relative flex items-center"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isRTL
                ? 'اسأل عن أي معيار تشغيلي أو إجراء فندقي...'
                : 'Ask anything about hotel SOPs, guest standards...'
            }
            className="h-11 ps-4 pe-11 text-xs rounded-2xl border-border/60 bg-background/80 backdrop-blur-md focus-visible:ring-amber-500/30"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isAsking || !query.trim()}
            className="absolute end-1 h-9 w-9 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition-transform active:scale-95"
          >
            {isAsking ? (
              <Zap className="h-4 w-4 animate-spin" />
            ) : (
              <Send className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            )}
          </Button>
        </form>

        {/* AI Answer Snippet */}
        {responseSnippet && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-xs leading-relaxed text-foreground space-y-2"
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-600">
              <Bot className="h-4 w-4" />
              <span>{isRTL ? 'ملخص الإجابة الذكية:' : 'AI Operational Answer:'}</span>
            </div>
            <p className="text-muted-foreground">{responseSnippet}</p>
            <div className="pt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/knowledge/search?q=${encodeURIComponent(query)}`)}
                className="h-7 text-[11px] font-semibold text-amber-600 hover:text-amber-500 px-2"
              >
                <span>{isRTL ? 'عرض المقالات الكاملة ذات الصلة' : 'View related SOP articles'}</span>
                <ArrowRight className={`ms-1 h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Quick Launch Chips */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {isRTL ? 'عمليات شائعة:' : 'Quick Prompts & Actions:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((chip, idx) => {
              const Icon = chip.icon
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (chip.action) {
                      chip.action()
                    } else if (chip.query) {
                      setQuery(chip.query)
                      handleAskAI(chip.query)
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/50 px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-amber-500/40 hover:bg-amber-500/[0.05] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Icon className="h-3.5 w-3.5 text-amber-500" />
                  <span>{chip.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
export default AICopilotAssistantWidget
