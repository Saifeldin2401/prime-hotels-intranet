import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { cloudflareProvider } from '@/lib/ai/imageProviders/cloudflareProvider'
import type { ImageDensity, VisualStyle } from '@/types/aiCourseEngine'

interface StudioStageVisualsProps {
  enableAIImages: boolean
  onChangeEnableAIImages: (enable: boolean) => void
  imageModel: string
  onChangeImageModel: (model: string) => void
  imageDensity: ImageDensity
  onChangeImageDensity: (density: ImageDensity) => void
  imageSelectionStrategy: 'auto_intelligent' | 'all_suitable_lessons' | 'high_benefit_only'
  onChangeImageSelectionStrategy: (strat: 'auto_intelligent' | 'all_suitable_lessons' | 'high_benefit_only') => void
  preferredVisualStyle: VisualStyle
  onChangePreferredVisualStyle: (style: VisualStyle) => void
  preferredAspectRatio: '16:9' | '4:3' | '1:1' | '3:2'
  onChangePreferredAspectRatio: (ratio: '16:9' | '4:3' | '1:1' | '3:2') => void
  maxImagesPerLesson: number
  onChangeMaxImagesPerLesson: (count: number) => void
  maxImagesPerCourse: number
  onChangeMaxImagesPerCourse: (count: number) => void
}

export function StudioStageVisuals({
  enableAIImages,
  onChangeEnableAIImages,
  imageModel,
  onChangeImageModel,
  imageDensity,
  onChangeImageDensity,
  imageSelectionStrategy,
  onChangeImageSelectionStrategy,
  preferredVisualStyle,
  onChangePreferredVisualStyle,
  preferredAspectRatio,
  onChangePreferredAspectRatio,
  maxImagesPerLesson,
  onChangeMaxImagesPerLesson,
  maxImagesPerCourse,
  onChangeMaxImagesPerCourse,
}: StudioStageVisualsProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const [showAdvanced, setShowAdvanced] = useState(false)

  const VISUAL_STYLES: Array<{
    id: VisualStyle
    title: string
    title_ar: string
    desc: string
    icon: string
  }> = [
    {
      id: 'educational_illustration',
      title: 'Educational Illustration',
      title_ar: 'رسم توضيحي تعليمي',
      desc: 'Clean, elegant vector style with hospitality palettes.',
      icon: '🎨',
    },
    {
      id: 'professional_corporate',
      title: '5-Star Corporate Luxury',
      title_ar: 'معايير فندقية راقية 5 نجوم',
      desc: 'Refined hotel interiors and uniformed associates.',
      icon: '👔',
    },
    {
      id: 'infographic',
      title: 'Modern Infographic Chart',
      title_ar: 'مخطط إنفوجرافيك تفاعلي',
      desc: 'High-contrast procedure flowcharts and vector icon cards.',
      icon: '📊',
    },
    {
      id: 'technical_diagram',
      title: 'Technical SOP Schematic',
      title_ar: 'رسم تخطيطي للإجراءات',
      desc: 'Crisp operational boxes, workflow lines, and standards.',
      icon: '📐',
    },
    {
      id: 'photorealistic',
      title: 'Photorealistic Studio',
      title_ar: 'تصوير فوتوغرافي فائق الدقة',
      desc: 'Hasselblad 8k photography with ambient warm lighting.',
      icon: '📷',
    },
    {
      id: 'realistic',
      title: 'Documentary Hospitality',
      title_ar: 'توثيقي واقعي',
      desc: 'Natural operational postures and authentic Saudi hospitality.',
      icon: '🏨',
    },
    {
      id: '3d_illustration',
      title: '3D Modern Visual',
      title_ar: 'ثلاثي الأبعاد حديث',
      desc: 'Octane 3D spatial renders with depth-of-field.',
      icon: '🧊',
    },
  ]

  const isFlux = imageModel.includes('flux')

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Main Enable Toggle & Provider Card */}
      <div className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center font-bold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{t('builder.generateAIImages', 'AI Visual Assets & Infographics')}</span>
                <Badge className={cn('text-[9px]', isFlux ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white')}>
                  {isFlux ? '✨ FLUX.1 Ultra-HD' : '⚡ Cloudflare Free Tier'}
                </Badge>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('builder.aiImagesDesc', 'Automatically synthesizes contextual diagrams, infographics, and SOP visuals directly to Supabase storage.')}
              </p>
            </div>
          </div>

          <Switch checked={enableAIImages} onCheckedChange={onChangeEnableAIImages} />
        </div>

        {/* Cloudflare Neurons Usage Meter */}
        {enableAIImages && (() => {
          const usageStats = cloudflareProvider.getUsageStats()
          const estimatedCourseNeurons = isFlux
            ? maxImagesPerCourse * 300
            : imageModel.includes('dreamshaper')
            ? maxImagesPerCourse * 160
            : imageModel.includes('base-1.0')
            ? maxImagesPerCourse * 400
            : 0

          return (
            <div className="p-3.5 rounded-xl border bg-gradient-to-r from-orange-50/70 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-foreground">Cloudflare Workers AI Image Engine</span>
                </div>
                <span className="text-xs font-mono font-semibold text-orange-700 dark:text-orange-400">
                  {usageStats.usedNeurons.toLocaleString()} / {usageStats.totalDailyNeurons.toLocaleString()} Neurons ({usageStats.percentageUsed}% Used)
                </span>
              </div>
              <Progress value={Math.max(2, usageStats.percentageUsed)} className="h-1.5 bg-orange-100 dark:bg-orange-950/40" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-muted-foreground gap-1">
                <span>
                  Forecast for this course ({maxImagesPerCourse} images): <strong className="text-foreground">{estimatedCourseNeurons === 0 ? '0 Neurons ($0.00 / Step Free Tier)' : `~${estimatedCourseNeurons.toLocaleString()} Neurons`}</strong>
                </span>
                <span className={cn('font-semibold', usageStats.isRateLimited ? 'text-rose-600' : 'text-emerald-600')}>
                  {usageStats.isRateLimited ? '● Quota Rate Limited' : '● Status: Healthy (Online)'}
                </span>
              </div>
            </div>
          )
        })()}
      </div>

      {enableAIImages && (
        <>
          {/* 2. Visual Style Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t('builder.preferredStyle', 'Visual Aesthetic & Art Style')}</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {t('builder.preferredStyleDesc', 'Choose the artistic treatment for generated lesson illustrations.')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {VISUAL_STYLES.map((st) => {
                const isSelected = preferredVisualStyle === st.id

                return (
                  <Card
                    key={st.id}
                    onClick={() => onChangePreferredVisualStyle(st.id)}
                    className={cn(
                      'cursor-pointer transition-all duration-150 border text-start group hover:shadow-sm',
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500 shadow-sm'
                        : 'bg-card hover:border-purple-300'
                    )}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{st.icon}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug">
                        {isRTL ? st.title_ar : st.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {st.desc}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* 3. Visual Density & Primary Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm">
            {/* Visual Density */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('builder.imageDensity', 'Image Density Strategy')}</Label>
              <Select value={imageDensity} onValueChange={(v: any) => onChangeImageDensity(v)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal (Only key SOP procedures)</SelectItem>
                  <SelectItem value="balanced">Balanced (Materially improves learning • Recommended)</SelectItem>
                  <SelectItem value="visual">Visual-Rich (Frequent visual illustrations)</SelectItem>
                  <SelectItem value="maximum">Maximum (Every lesson receives a tailored visual)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Model Engine */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('builder.imageModelEngine', 'AI Visual Generation Engine')}</Label>
              <Select value={imageModel} onValueChange={onChangeImageModel}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    🤖 Automatic — pick the best available free engine (Recommended)
                  </SelectItem>
                  {/* Free — Cloudflare Workers AI */}
                  <SelectItem value="@cf/leonardo/lucid-origin">
                    🖼️ Leonardo Lucid Origin (Free • flagship photorealism)
                  </SelectItem>
                  <SelectItem value="@cf/leonardo/phoenix-1.0">
                    🖼️ Leonardo Phoenix 1.0 (Free • strong prompt adherence)
                  </SelectItem>
                  <SelectItem value="@cf/black-forest-labs/flux-1-schnell">
                    ✨ FLUX.1 Schnell (Free • best text & diagrams)
                  </SelectItem>
                  <SelectItem value="@cf/bytedance/stable-diffusion-xl-lightning">
                    ⚡ SDXL-Lightning (Free • fastest)
                  </SelectItem>
                  <SelectItem value="@cf/stabilityai/stable-diffusion-xl-base-1.0">
                    🛡️ SDXL Base 1.0 (Free • detailed)
                  </SelectItem>
                  <SelectItem value="@cf/lykon/dreamshaper-8-lcm">
                    🎨 DreamShaper 8 LCM (Free • creative/photo)
                  </SelectItem>
                  {/* Deterministic SVG — always available, zero cost */}
                  <SelectItem value="recraft-vector">
                    📐 Vector Schematic (Free • instant SVG diagrams & flowcharts)
                  </SelectItem>
                  {/* Paid — OpenRouter (needs credits) */}
                  <SelectItem value="google/gemini-3-pro-image">
                    💎 Gemini 3 Pro Image (Paid • OpenRouter • highest quality)
                  </SelectItem>
                  <SelectItem value="google/gemini-2.5-flash-image">
                    💎 Gemini 2.5 Flash Image (Paid • OpenRouter • fast)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. Progressive Disclosure: Advanced Resolution & Budgets */}
          <div className="border rounded-xl bg-muted/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>{t('builder.advancedVisuals', 'Advanced Aspect Ratios & Course Image Limits')}</span>
                <Badge variant="outline" className="text-[9px]">Optional</Badge>
              </div>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 pt-1 border-t space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Aspect Ratio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">{t('builder.aspectRatio', 'Default Aspect Ratio')}</Label>
                    <Select value={preferredAspectRatio} onValueChange={(v: any) => onChangePreferredAspectRatio(v)}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 Widescreen (Recommended for Lessons)</SelectItem>
                        <SelectItem value="4:3">4:3 Standard Frame</SelectItem>
                        <SelectItem value="1:1">1:1 Square (Cards / Modules)</SelectItem>
                        <SelectItem value="3:2">3:2 Classic Photo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max Per Lesson */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Max Images Per Lesson</Label>
                    <Select value={String(maxImagesPerLesson)} onValueChange={(v) => onChangeMaxImagesPerLesson(parseInt(v, 10))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Image Per Lesson</SelectItem>
                        <SelectItem value="2">2 Images Per Lesson</SelectItem>
                        <SelectItem value="3">3 Images Per Lesson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max Per Course */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Max Images Per Course</Label>
                    <Select value={String(maxImagesPerCourse)} onValueChange={(v) => onChangeMaxImagesPerCourse(parseInt(v, 10))}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 Images Total</SelectItem>
                        <SelectItem value="6">6 Images Total (Recommended)</SelectItem>
                        <SelectItem value="10">10 Images Total</SelectItem>
                        <SelectItem value="15">15 Images Total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
