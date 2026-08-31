import { Button } from '@/components/ui/button'
import { altusAI } from '@/lib/ai'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Hotel,
  Loader2,
  Sparkles,
  Wrench,
  AlertTriangle,
  Sparkle
} from 'lucide-react'
import * as React from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface QuickReplyChipsProps {
  lastMessageContent?: string
  senderName?: string
  onSelectReply: (replyText: string) => void
  className?: string
  disabled?: boolean
}

export function QuickReplyChips({
  lastMessageContent = '',
  senderName = '',
  onSelectReply,
  className,
  disabled = false
}: QuickReplyChipsProps) {
  const { t, i18n } = useTranslation('messages')
  const isArabic = i18n.language === 'ar'
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)

  const quickOptions = [
    {
      id: 'ack',
      label: t('quick_ack', isArabic ? 'تم الاستلام والتأكيد' : 'Acknowledged & Confirmed'),
      text: isArabic 
        ? 'تم الاستلام والتأكيد، جاري المتابعة الفورية.' 
        : 'Acknowledged and confirmed. Taking immediate action on this.',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    },
    {
      id: 'fo',
      label: t('quick_fo', isArabic ? 'جاري المتابعة مع الاستقبال' : 'Dispatched to Front Desk'),
      text: isArabic 
        ? 'تم تحويل الموضوع لفريق الاستقبال للمتابعة والتنفيذ.' 
        : 'This has been coordinated with the Front Desk team for execution.',
      icon: <Hotel className="w-3.5 h-3.5 text-blue-600" />
    },
    {
      id: 'hk',
      label: t('quick_hk', isArabic ? 'تم التحويل للتدبير المنزلي' : 'Handed over to Housekeeping'),
      text: isArabic 
        ? 'تم إبلاغ مشرف التدبير المنزلي لمتابعة طلب الغرفة حالاً.' 
        : 'Housekeeping supervisor has been notified to attend to this room immediately.',
      icon: <Sparkle className="w-3.5 h-3.5 text-purple-600" />
    },
    {
      id: 'eng',
      label: t('quick_eng', isArabic ? 'تم إبلاغ قسم الصيانة' : 'Assigned to Engineering'),
      text: isArabic 
        ? 'تم فتح تذكرة صيانة وإرسال الفني المختص للموقع.' 
        : 'Maintenance work order logged and engineering technician dispatched.',
      icon: <Wrench className="w-3.5 h-3.5 text-amber-600" />
    },
    {
      id: 'duty',
      label: t('quick_duty', isArabic ? 'تم الرفع للمدير المناوب' : 'Escalated to Duty Manager'),
      text: isArabic 
        ? 'تم إحاطة المدير المناوب لمتابعة الإجراء واتخاذ اللازم.' 
        : 'Duty Manager has been briefed for necessary executive oversight.',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
    }
  ]

  const handleGenerateAiSmartDraft = async () => {
    if (!lastMessageContent.trim()) {
      onSelectReply(isArabic ? 'شكراً لتواصلك، كيف يمكنني مساعدتك؟' : 'Thank you for reaching out, how may I assist you today?')
      return
    }

    setIsGeneratingAi(true)
    try {
      const prompt = `You are an executive hospitality messaging assistant for PRIME Hotels & Resorts in Saudi Arabia.
Write a concise, polished, Forbes 5-star hotel operational reply to the message below.

CRITICAL INSTRUCTIONS:
- TARGET LANGUAGE: Respond strictly in ${isArabic ? 'Arabic' : 'English'}.
- TONE: Courteous, professional, efficient, action-oriented.
- LENGTH: 1 to 2 sentences maximum.
- Do not include greetings placeholders like [Your Name] or quotes.

INCOMING MESSAGE FROM ${senderName || 'Colleague'}:
"${lastMessageContent}"

SMART DRAFT REPLY:`

      const res = await altusAI.executePrompt(prompt, {
        task: 'generation',
        temperature: 0.2,
        maxTokens: 120
      })

      if (res.data && res.data.trim()) {
        const cleaned = res.data.trim().replace(/^["']|["']$/g, '')
        onSelectReply(cleaned)
        toast.success(isArabic ? 'تم توليد الرد الذكي بنجاح' : 'AI Smart reply generated')
      } else {
        onSelectReply(isArabic ? 'تم استلام الرسالة وجاري اتخاذ اللازم فوراً.' : 'Received and noted. Proceeding with immediate action.')
      }
    } catch (e) {
      console.warn('AI Smart Draft failed:', e)
      onSelectReply(isArabic ? 'تم الاستلام والتأكيد، شكراً لك.' : 'Acknowledged with thanks.')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-1.5 overflow-x-auto py-1.5 px-1 scrollbar-none', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isGeneratingAi}
        onClick={handleGenerateAiSmartDraft}
        className="h-7 text-xs px-2.5 rounded-full border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 shrink-0 gap-1 font-medium shadow-2xs"
      >
        {isGeneratingAi ? (
          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
        ) : (
          <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500/20" />
        )}
        {t('ai_smart_draft', 'AI Smart Draft')}
      </Button>

      {quickOptions.map((opt) => (
        <Button
          key={opt.id}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onSelectReply(opt.text)}
          className="h-7 text-xs px-2.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0 gap-1.5 font-normal border border-slate-200/60 dark:border-slate-700/60 transition-all"
        >
          {opt.icon}
          <span>{opt.label}</span>
        </Button>
      ))}
    </div>
  )
}
