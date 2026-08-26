import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AVAILABLE_COURSE_AI_MODELS } from '@/lib/gemini'

interface StudioStageAISettingsProps {
  preferredModel: string
  onChangePreferredModel: (model: string) => void
  targetLanguage: 'English' | 'Arabic' | 'Bilingual'
  onChangeTargetLanguage: (lang: 'English' | 'Arabic' | 'Bilingual') => void
}

export function StudioStageAISettings({
  preferredModel,
  onChangePreferredModel,
  targetLanguage,
  onChangeTargetLanguage,
}: StudioStageAISettingsProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [creativityLevel, setCreativityLevel] = useState<number>(3)
  const [strictForbesCompliance, setStrictForbesCompliance] = useState<boolean>(true)
  const [saudiLaborAwareness, setSaudiLaborAwareness] = useState<boolean>(true)

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. AI Model Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>{t('builder.aiModelOrchestration', 'AI Engine & Model Architecture')}</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('builder.aiModelDesc', 'Select the underlying LLM powering curriculum synthesis and scenario generation.')}
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
            {preferredModel === 'auto' ? 'Auto Intelligent Router' : preferredModel}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AVAILABLE_COURSE_AI_MODELS.map((m) => {
            const isSelected = preferredModel === m.id

            return (
              <Card
                key={m.id}
                onClick={() => onChangePreferredModel(m.id)}
                className={cn(
                  'cursor-pointer transition-all duration-200 border text-start group hover:shadow-sm',
                  isSelected
                    ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-sm'
                    : 'bg-card hover:border-purple-300'
                )}
              >
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                          isSelected ? 'bg-purple-600 text-white' : 'bg-muted text-foreground'
                        )}
                      >
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{m.name}</span>
                    </div>
                    {m.badge && (
                      <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 h-4">
                        {m.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {m.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 2. Generation Strictness & KSA Localization Safeguards */}
      <div className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm space-y-4 shadow-sm">
        <div className="space-y-1 border-b pb-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('builder.localizationCompliance', 'Hospitality Compliance & KSA Safeguards')}</span>
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {t('builder.complianceDesc', 'Guarantees operational fidelity, 5-star Saudi cultural hospitality, and labor compliance.')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Forbes 5-Star Service Standards</p>
              <p className="text-[10px] text-muted-foreground">Enforces proactive etiquette, warm hospitality, and flawless service flow.</p>
            </div>
            <Switch checked={strictForbesCompliance} onCheckedChange={setStrictForbesCompliance} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">KSA Labor & Cultural Alignment</p>
              <p className="text-[10px] text-muted-foreground">Contextualizes work-week, prayer times, and Saudi tourism standards.</p>
            </div>
            <Switch checked={saudiLaborAwareness} onCheckedChange={setSaudiLaborAwareness} />
          </div>
        </div>
      </div>

      {/* 3. Progressive Disclosure: Advanced Temperature & Generation Tuning */}
      <div className="border rounded-xl bg-muted/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>{t('builder.advancedAI', 'Advanced Prompt Strictness & Creativity Tuning')}</span>
            <Badge variant="outline" className="text-[9px]">Optional</Badge>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 pt-1 border-t space-y-4 text-xs">
            <div className="space-y-2 p-3 rounded-lg border bg-card">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span>{t('builder.creativityLevel', 'Pedagogical Strictness vs Creative Scenarios')}</span>
                <span className="font-mono text-purple-600 font-bold">
                  {creativityLevel === 1 ? 'Strict Procedural' : creativityLevel === 3 ? 'Balanced Standard' : 'Highly Creative Scenarios'}
                </span>
              </div>
              <Slider
                value={[creativityLevel]}
                onValueChange={([val]) => setCreativityLevel(val)}
                min={1}
                max={5}
                step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Strict Fact-Only</span>
                <span className="text-purple-600 font-bold">Balanced Forbes Quality</span>
                <span>Rich Novel Dilemmas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
