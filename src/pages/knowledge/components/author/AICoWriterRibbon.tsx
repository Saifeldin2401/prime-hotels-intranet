import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckSquare, HelpCircle, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AICoWriterRibbonProps {
  aiLanguage: string
  onAiLanguageChange: (lang: string) => void
  isGenerating: boolean
  hasContent: boolean
  onGenerate: (action: 'outline' | 'expand' | 'improve' | 'checklist' | 'faqs') => void
}

export function AICoWriterRibbon({
  aiLanguage,
  onAiLanguageChange,
  isGenerating,
  hasContent,
  onGenerate,
}: AICoWriterRibbonProps) {
  const { t } = useTranslation(['knowledge', 'common'])

  return (
    <div className="bg-gradient-to-r from-hotel-navy/5 via-hotel-gold/10 to-hotel-navy/5 dark:from-slate-900 dark:via-hotel-gold/10 dark:to-slate-900 border border-hotel-gold/25 rounded-xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-hotel-gold/20 flex items-center justify-center text-hotel-gold shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-foreground">
          AI Co-Writer:
        </span>
        <Select value={aiLanguage} onValueChange={onAiLanguageChange}>
          <SelectTrigger className="w-[110px] h-7 text-xs bg-background font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Arabic">العربية</SelectItem>
            <SelectItem value="English and Arabic">Bilingual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onGenerate('outline')}
          disabled={isGenerating}
          className="h-7 text-xs bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-semibold transition-colors"
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin me-1 text-amber-600" />
          ) : (
            <Wand2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 me-1" />
          )}
          <span>{t('editor.outline', 'Outline')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onGenerate('expand')}
          disabled={isGenerating || !hasContent}
          className="h-7 text-xs bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800 font-semibold transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 me-1" />
          <span>{t('editor.expand', 'Expand')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onGenerate('improve')}
          disabled={isGenerating || !hasContent}
          className="h-7 text-xs bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-semibold transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 me-1" />
          <span>{t('editor.improve', 'Polish')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onGenerate('checklist')}
          disabled={isGenerating}
          className="h-7 text-xs bg-orange-50/80 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800 font-semibold transition-colors"
        >
          <CheckSquare className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 me-1" />
          <span>AI Checklist</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onGenerate('faqs')}
          disabled={isGenerating}
          className="h-7 text-xs bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800 font-semibold transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 me-1" />
          <span>AI FAQs</span>
        </Button>
      </div>
    </div>
  )
}

export default AICoWriterRibbon
