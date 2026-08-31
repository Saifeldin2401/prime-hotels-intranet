/**
 * AIMediaGeneratorModal
 * ----------------------------------------------------------------------------
 * 5-Star Luxury AI Visual Studio for PRIME Connect Media Library.
 * Generates photorealistic hospitality photography, Forbes SOP vector schematics,
 * and educational illustrations, saving them directly to the Media Library.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { imageAgent } from '@/lib/ai/agents/imageAgent'
import { modelRegistry } from '@/lib/ai/agents/modelRegistry'
import type { MediaCategory } from '@/lib/types/media'
import type { VisualStyle } from '@/types/aiCourseEngine'
import {
  Check,
  Cpu,
  ImageIcon,
  Layers,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface AIMediaGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssetSaved?: () => void
  onUploadFile?: (file: File, options?: { title?: string; category?: MediaCategory; tags?: string[] }) => Promise<any>
}

const HOSPITALITY_PRESETS = [
  {
    id: 'vip_suite',
    title: 'VIP Suite Arrival',
    title_ar: 'استقبال جناح كبار الشخصيات',
    prompt: '5-star luxury hotel penthouse suite orientation, elegant butler welcoming VIP guest with fresh Arabic coffee and dates, floor-to-ceiling glass windows with Riyadh skyline, Hasselblad 8k',
    style: 'photorealistic' as VisualStyle,
    category: 'general' as MediaCategory,
  },
  {
    id: 'front_desk',
    title: 'Front Desk Handover',
    title_ar: 'استلام وتسليم الاستقبال',
    prompt: 'Forbes 5-star hotel reception desk, professional associates in tailored uniforms reviewing guest logs on Opera PMS screen with warm authentic posture',
    style: 'photorealistic' as VisualStyle,
    category: 'training' as MediaCategory,
  },
  {
    id: 'turndown_geometry',
    title: 'Forbes Turndown Protocol',
    title_ar: 'بروتوكول ترتيب الأسرّة الفاخر',
    prompt: 'Housekeeping turndown standard, 45-degree duvet fold with pristine white Egyptian cotton linen, bedside slipper mat and luxury pillow menu card',
    style: 'photorealistic' as VisualStyle,
    category: 'training' as MediaCategory,
  },
  {
    id: 'haccp_safety',
    title: 'HACCP Food Safety Station',
    title_ar: 'محطة سلامة الغذاء HACCP',
    prompt: '5-star luxury hotel commercial culinary kitchen, chef with digital probe thermometer checking hot holding temperature, stainless steel prep counters, Balady hygiene compliance',
    style: 'photorealistic' as VisualStyle,
    category: 'compliance' as MediaCategory,
  },
  {
    id: 'sop_schematic',
    title: 'SOP Flowchart Diagram',
    title_ar: 'مخطط سير الإجراءات التشغيلية',
    prompt: 'Technical standard operating procedure flowchart for hotel check-in and luggage delivery, clean corporate blueprint, numbered phase boxes, vector clarity',
    style: 'technical_diagram' as VisualStyle,
    category: 'training' as MediaCategory,
  },
]

export function AIMediaGeneratorModal({
  open,
  onOpenChange,
  onAssetSaved,
  onUploadFile,
}: AIMediaGeneratorModalProps) {
  const { t, i18n } = useTranslation('media')
  const isRTL = i18n.dir() === 'rtl'
  const { user } = useAuth()

  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<MediaCategory>('training')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('photorealistic')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [selectedModel, setSelectedModel] = useState('google-imagen-3')
  const [tags, setTags] = useState<string[]>(['AI Generated', '5-Star'])
  const [tagInput, setTagInput] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)

  const handleApplyPreset = (preset: typeof HOSPITALITY_PRESETS[0]) => {
    setTitle(isRTL ? preset.title_ar : preset.title)
    setPrompt(preset.prompt)
    setVisualStyle(preset.style)
    setCategory(preset.category)
    if (preset.style === 'technical_diagram') {
      setSelectedModel('recraft-vector')
    } else {
      setSelectedModel('google-imagen-3')
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t('ai_generator.promptRequired', 'Please enter a visual description prompt.'))
      return
    }

    setIsGenerating(true)
    setGeneratedImageUrl(null)

    try {
      const activeTitle = title.trim() || 'AI Generated Hotel Visual'

      const agentRes = await imageAgent.process({
        lesson: {
          id: `media-${Date.now()}`,
          title: activeTitle,
          description: prompt,
          learningOutcomes: [activeTitle],
        } as any,
        courseTitle: 'Altus Advisory Media Library',
        moduleTitle: 'Central Assets',
        imageModel: selectedModel,
        preferredStyle: visualStyle,
        preferredAspectRatio: aspectRatio,
      })

      if (agentRes.data && agentRes.data.image_url) {
        setGeneratedImageUrl(agentRes.data.image_url)
        if (!title.trim()) {
          setTitle(activeTitle)
        }
        toast.success(t('ai_generator.generatedSuccess', 'AI visual generated successfully!'))
      } else {
        throw new Error('Image generator returned no visual output.')
      }
    } catch (err: any) {
      console.error('AI Media Generation failed:', err)
      toast.error(t('ai_generator.failed', 'Visual generation failed. Please try another model or refine your prompt.'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (!generatedImageUrl) return
    setIsSaving(true)

    try {
      let fileToUpload: File

      if (generatedImageUrl.startsWith('data:image/svg+xml')) {
        let svgContent = ''
        if (generatedImageUrl.includes('base64,')) {
          svgContent = decodeURIComponent(escape(atob(generatedImageUrl.split('base64,')[1])))
        } else {
          svgContent = decodeURIComponent(generatedImageUrl.split('charset=utf-8,')[1] || generatedImageUrl.split(',')[1])
        }
        const blob = new Blob([svgContent], { type: 'image/svg+xml' })
        fileToUpload = new File([blob], `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_') || 'ai_vector'}.svg`, {
          type: 'image/svg+xml',
        })
      } else if (generatedImageUrl.startsWith('data:image/')) {
        const mimeType = generatedImageUrl.split(';')[0].split(':')[1] || 'image/png'
        const base64Data = generatedImageUrl.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png'
        const blob = new Blob([byteArray], { type: mimeType })
        fileToUpload = new File([blob], `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_') || 'ai_visual'}.${ext}`, {
          type: mimeType,
        })
      } else {
        // Remote URL
        const response = await fetch(generatedImageUrl)
        const blob = await response.blob()
        const ext = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : blob.type.includes('svg') ? 'svg' : 'png'
        fileToUpload = new File([blob], `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_') || 'ai_visual'}.${ext}`, {
          type: blob.type || 'image/png',
        })
      }

      if (onUploadFile) {
        await onUploadFile(fileToUpload, {
          title: title.trim() || 'AI Generated Visual',
          category,
          tags,
        })
      }

      toast.success(t('ai_generator.savedToLibrary', 'Asset saved to Media Library!'))
      onAssetSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Failed to save AI asset to media library:', err)
      toast.error(t('ai_generator.saveFailed', 'Could not save asset to Media Library.'))
    } finally {
      setIsSaving(false)
    }
  }

  const modelMeta = modelRegistry.getModelMetadata(selectedModel)
  const selectedModelDisplayName = modelMeta?.name || selectedModel

  const isGoogle = selectedModel.includes('imagen') || selectedModel.includes('google') || selectedModel.includes('banana')
  const isOpenRouter = selectedModel.includes('/')
  const isVector = selectedModel === 'recraft-vector'
  const isCloudflare = !isGoogle && !isOpenRouter && !isVector

  const providerBadgeLabel = isGoogle
    ? 'Google AI Studio'
    : isOpenRouter
    ? 'OpenRouter Unified'
    : isVector
    ? 'Deterministic SVG ($0.00)'
    : 'Cloudflare Workers AI ($0.00)'

  const providerBadgeColor = isGoogle
    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
    : isOpenRouter
    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300'
    : isVector
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {t('ai_generator.title', 'AI Media Asset Generator')}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {t('ai_generator.description', 'Synthesize 5-star hotel visuals, SOP schematics, and hospitality photography for your media library.')}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] font-semibold ${providerBadgeColor}`}>
              {providerBadgeLabel}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Preview Box */}
          <div className="w-full md:w-1/2 p-6 bg-muted/10 border-e flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full rounded-2xl overflow-hidden border shadow-sm bg-slate-950 aspect-[16/9] flex items-center justify-center">
              {isGenerating && (
                <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 p-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <p className="text-xs font-semibold text-center">
                    Synthesizing with {selectedModelDisplayName}...
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">
                    Applying 5-star hospitality aesthetics & lighting
                  </p>
                </div>
              )}

              {generatedImageUrl ? (
                generatedImageUrl.startsWith('data:image/svg+xml') ? (
                  <div
                    className="w-full h-full p-2 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                    dangerouslySetInnerHTML={{
                      __html: generatedImageUrl.includes('base64,')
                        ? decodeURIComponent(escape(atob(generatedImageUrl.split('base64,')[1])))
                        : decodeURIComponent(generatedImageUrl.split('charset=utf-8,')[1] || generatedImageUrl.split(',')[1]),
                    }}
                  />
                ) : (
                  <img
                    src={generatedImageUrl}
                    alt={title || 'Generated Visual'}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2 p-4">
                  <ImageIcon className="w-12 h-12 stroke-1 text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">Ready to Generate</p>
                  <p className="text-[10px] text-slate-500 text-center max-w-xs">
                    Choose a preset or type a prompt, then click "Generate Visual".
                  </p>
                </div>
              )}

              <div className="absolute top-2 end-2 z-10">
                <Badge className="bg-black/60 backdrop-blur text-white text-[10px]">
                  {aspectRatio}
                </Badge>
              </div>
            </div>

            {/* Quick Hospitality Presets */}
            <div className="w-full space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {t('ai_generator.quickPresets', 'Quick 5-Star Presets')}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {HOSPITALITY_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2.5 bg-background hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:hover:bg-purple-950/40"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <Sparkles className="w-3 h-3 me-1 text-amber-500" />
                    {isRTL ? preset.title_ar : preset.title}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Editor Form */}
          <ScrollArea className="flex-1 p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('ai_generator.assetTitle', 'Asset Title')}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. VIP Reception Lounge Arrival"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">{t('ai_generator.prompt', 'Visual Prompt')}</Label>
                  <span className="text-[10px] text-purple-600 font-semibold">{selectedModelDisplayName}</span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="text-xs font-mono"
                  placeholder="Describe the 5-star hotel scene, lighting, personnel, uniform, and architectural details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('ai_generator.category', 'Category')}</Label>
                  <Select value={category} onValueChange={(v: MediaCategory) => setCategory(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">{t('categories.training', 'Training')}</SelectItem>
                      <SelectItem value="knowledgebase">{t('categories.knowledgebase', 'Knowledge Base')}</SelectItem>
                      <SelectItem value="compliance">{t('categories.compliance', 'Compliance')}</SelectItem>
                      <SelectItem value="onboarding">{t('categories.onboarding', 'Onboarding')}</SelectItem>
                      <SelectItem value="announcement">{t('categories.announcement', 'Announcements')}</SelectItem>
                      <SelectItem value="marketing">{t('categories.marketing', 'Marketing')}</SelectItem>
                      <SelectItem value="general">{t('categories.general', 'General')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('ai_generator.visualStyle', 'Visual Style')}</Label>
                  <Select value={visualStyle} onValueChange={(v: VisualStyle) => setVisualStyle(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photorealistic">Photorealistic Studio (8K)</SelectItem>
                      <SelectItem value="realistic">Realistic Hospitality</SelectItem>
                      <SelectItem value="educational_illustration">Educational Illustration</SelectItem>
                      <SelectItem value="professional_corporate">5-Star Corporate</SelectItem>
                      <SelectItem value="technical_diagram">Technical Diagram (SOP)</SelectItem>
                      <SelectItem value="infographic">Infographic Chart</SelectItem>
                      <SelectItem value="3d_illustration">3D Modern Render</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('ai_generator.model', 'AI Engine')}</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="auto">🤖 Automatic (Recommended)</SelectItem>
                      <SelectItem value="@cf/leonardo/lucid-origin">
                        🎨 Leonardo Lucid Origin (Free • flagship)
                      </SelectItem>
                      <SelectItem value="@cf/leonardo/phoenix-1.0">
                        🖋️ Leonardo Phoenix 1.0 (Free • typography)
                      </SelectItem>
                      <SelectItem value="@cf/black-forest-labs/flux-1-schnell">
                        ✨ FLUX.1 Schnell (Free • text &amp; diagrams)
                      </SelectItem>
                      <SelectItem value="@cf/stabilityai/stable-diffusion-xl-base-1.0">
                        🛡️ SDXL Base 1.0 (Free • high detail)
                      </SelectItem>
                      <SelectItem value="@cf/lykon/dreamshaper-8-lcm">
                        🏨 DreamShaper 8 LCM (Free • photo)
                      </SelectItem>
                      <SelectItem value="@cf/bytedance/stable-diffusion-xl-lightning">
                        ⚡ SDXL Lightning (Free • fastest)
                      </SelectItem>
                      <SelectItem value="recraft-vector">
                        📐 Vector Schematic (Free • instant SVG)
                      </SelectItem>
                      <SelectItem value="google/gemini-3-pro-image">
                        💎 Gemini 3 Pro Image (Paid • highest quality)
                      </SelectItem>
                      <SelectItem value="google/gemini-2.5-flash-image">
                        💎 Gemini 2.5 Flash Image (Paid • fast)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('ai_generator.aspectRatio', 'Aspect Ratio')}</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 Widescreen</SelectItem>
                      <SelectItem value="4:3">4:3 Standard</SelectItem>
                      <SelectItem value="1:1">1:1 Square</SelectItem>
                      <SelectItem value="3:2">3:2 Photography</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('editDialog.fields.tags', 'Tags')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="Add a tag..."
                    className="text-xs"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-[10px]">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm gap-1.5 py-5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Visual...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{generatedImageUrl ? 'Regenerate Visual' : 'Generate Visual with AI'}</span>
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('actions.cancel', 'Cancel')}
          </Button>

          <Button
            size="sm"
            onClick={handleSaveToLibrary}
            disabled={!generatedImageUrl || isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 px-5"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{t('ai_generator.saveToLibrary', 'Save to Media Library')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
