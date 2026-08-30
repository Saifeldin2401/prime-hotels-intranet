/**
 * VisualAssetEditorModal
 * Management, Prompt Editing, and Regeneration of AI-Generated Course Visuals
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
import { useToast } from '@/components/ui/use-toast'
import { useDeleteVisualAsset, useGenerateVisualAsset, useUpdateVisualAsset } from '@/hooks/useCourseVisualAssets'
import type { CourseVisualAsset, VisualPlacement, VisualStyle } from '@/types/aiCourseEngine'
import {
  Check,
  Cpu,
  Eye,
  FileImage,
  ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { imageAgent } from '@/lib/ai/agents/imageAgent'
import { isPersistedAssetId, modelRegistry } from '@/lib/ai/agents/modelRegistry'

interface VisualAssetEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: CourseVisualAsset | null
  onAssetUpdated?: (updated: CourseVisualAsset) => void
  onAssetDeleted?: (assetId: string) => void
}

export function VisualAssetEditorModal({
  open,
  onOpenChange,
  asset,
  onAssetUpdated,
  onAssetDeleted,
}: VisualAssetEditorModalProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'
  const { toast } = useToast()

  const [currentAsset, setCurrentAsset] = useState<CourseVisualAsset | null>(asset)
  const [currentImageUrl, setCurrentImageUrl] = useState(asset?.image_url || '')
  const [title, setTitle] = useState(asset?.title || '')
  const [altText, setAltText] = useState(asset?.alt_text || '')
  const [caption, setCaption] = useState(asset?.caption || '')
  const [prompt, setPrompt] = useState(asset?.prompt || '')
  const [placement, setPlacement] = useState<VisualPlacement>((asset?.placement as any) || 'concept_explanation')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>((asset?.visual_style as any) || 'educational_illustration')
  const [aspectRatio, setAspectRatio] = useState(asset?.aspect_ratio || '16:9')
  const [selectedModel, setSelectedModel] = useState(asset?.model || 'google-imagen-3')
  const [negativePrompt, setNegativePrompt] = useState(
    asset?.negative_prompt || 'blurry, low quality, distorted anatomy, malformed hands, duplicate objects, watermark, text, logo, cluttered composition'
  )
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Sync internal state when asset prop or modal visibility changes
  useEffect(() => {
    if (asset) {
      setCurrentAsset(asset)
      setCurrentImageUrl(asset.image_url || '')
      setTitle(asset.title || '')
      setAltText(asset.alt_text || '')
      setCaption(asset.caption || '')
      setPrompt(asset.prompt || '')
      setPlacement((asset.placement as any) || 'concept_explanation')
      setVisualStyle((asset.visual_style as any) || 'educational_illustration')
      setAspectRatio(asset.aspect_ratio || '16:9')
      if (asset.model) {
        setSelectedModel(asset.model)
      }
      if (asset.negative_prompt) {
        setNegativePrompt(asset.negative_prompt)
      }
    }
  }, [asset, open])

  const updateMutation = useUpdateVisualAsset()
  const deleteMutation = useDeleteVisualAsset()
  const generateMutation = useGenerateVisualAsset()

  if (!asset) return null

  const handleSave = async () => {
    const activeAsset = currentAsset || asset
    const updated: CourseVisualAsset = {
      ...activeAsset,
      image_url: currentImageUrl || activeAsset.image_url,
      title,
      alt_text: altText,
      caption,
      placement,
      visual_style: visualStyle,
      aspect_ratio: aspectRatio,
      prompt,
      model: selectedModel,
    }

    try {
      const isDbRecord = isPersistedAssetId(activeAsset.id) && !activeAsset.draft
      if (isDbRecord) {
        await updateMutation.mutateAsync({
          assetId: activeAsset.id,
          updates: {
            title,
            alt_text: altText,
            caption,
            placement,
            visual_style: visualStyle,
            aspect_ratio: aspectRatio,
          },
        })
      }
    } catch (saveErr) {
      console.warn('Database sync deferred for in-memory draft visual asset:', saveErr)
    }

    onAssetUpdated?.(updated)
    toast({
      title: t('builder.visualSaved', 'Visual Updated'),
      description: t('builder.visualSavedDesc', 'Asset metadata and placement saved successfully.'),
    })
    onOpenChange(false)
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    console.group(`🎨 [Visual Studio] Regenerate Visual: "${title || asset.title}"`)
    console.info('Parameters:', {
      model: selectedModel,
      style: visualStyle,
      aspectRatio,
      prompt,
      negativePrompt,
      assetId: asset.id,
    })

    try {
      // 1. Primary Engine: Direct synthesis via imageAgent (supports Google Imagen 3 / Nano Banana, OpenRouter, Cloudflare, Vector)
      const agentRes = await imageAgent.process({
        lesson: {
          id: asset.lesson_id || `doc-${Date.now()}`,
          title: title || asset.title,
          description: prompt || asset.prompt || title,
          learningOutcomes: [caption || altText || title],
        } as any,
        courseTitle: title || 'the hotel group Hospitality Training',
        moduleTitle: title || 'Standard Operating Procedure',
        imageModel: selectedModel,
        preferredStyle: visualStyle,
        preferredAspectRatio: aspectRatio,
      })

      if (agentRes.data && agentRes.data.image_url) {
        const updated: CourseVisualAsset = {
          ...asset,
          ...(currentAsset || {}),
          ...agentRes.data,
          title,
          alt_text: altText,
          caption,
          prompt,
          visual_style: visualStyle,
          aspect_ratio: aspectRatio,
          model: selectedModel,
          provider: agentRes.providerUsed || (selectedModel.includes('imagen') || selectedModel.includes('banana') ? 'gemini' : selectedModel.includes('/') ? 'openrouter' : 'cloudflare'),
        }
        setCurrentAsset(updated)
        setCurrentImageUrl(agentRes.data.image_url)
        onAssetUpdated?.(updated)

        const getModelDisplayName = (m: string) => {
          const lower = m.toLowerCase()
          if (lower.includes('banana-pro') || lower.includes('imagen-3') || lower === 'google-imagen-3') return 'Google Nano Banana Pro (Gemini 3 Pro)'
          if (lower.includes('banana-2') || lower.includes('imagen-3-fast')) return 'Google Nano Banana 2 (Gemini 3.1 Flash)'
          if (lower.includes('seedream')) return 'ByteDance Seedream 4.5'
          if (lower.includes('flux.2') || lower.includes('flux-1')) return 'FLUX.2 Pro (Flow Transformer)'
          if (lower.includes('recraft-v4')) return 'Recraft V4 (Ultra-Texture)'
          if (lower.includes('recraft-v3') || lower === 'recraft/recraft-v3') return 'Recraft V3 Flagship'
          if (lower.includes('recraft-vector')) return 'Recraft Vector Engine (SVG Blueprint)'
          if (lower.includes('lucid')) return 'Leonardo Lucid Origin'
          if (lower.includes('phoenix')) return 'Leonardo Phoenix 1.0'
          return m
        }

        const providerLabel = getModelDisplayName(selectedModel)

        console.info(`%c[Visual Studio] ✅ Primary Engine Succeeded with ${providerLabel}%c`, 'color: #10b981; font-weight: bold;', '', {
          imageUrl: agentRes.data.image_url,
          modelUsed: agentRes.modelUsed,
          providerUsed: agentRes.providerUsed,
        })

        toast({
          title: t('builder.regeneratedSuccess', 'Visual Regenerated'),
          description: `Synthesized with ${providerLabel}.`,
        })
        console.groupEnd()
        return
      }

      // 2. Secondary Engine: Supabase generate-course-image Edge Function
      const isGoogle = selectedModel.includes('imagen') || selectedModel.includes('google') || selectedModel.includes('banana')
      const isOpenRouter = selectedModel.includes('/') || selectedModel.includes('seedream')
      const inferredProvider = isGoogle ? 'google' : isOpenRouter ? 'openrouter' : 'cloudflare'

      console.info(`[Visual Studio] ⚡ Calling Edge Function generate-course-image (${inferredProvider})...`)
      const regenerated = await generateMutation.mutateAsync({
        courseId: asset.course_id || 'draft',
        moduleId: asset.module_id || 'mod',
        lessonId: asset.lesson_id || 'lesson',
        opportunity: {
          shouldGenerate: true,
          purpose: asset.educational_purpose,
          educationalObjective: asset.visual_concept,
          subject: title,
          visualConcept: asset.visual_concept,
          optimizedPrompt: prompt,
          negativePrompt,
          placement,
          aspectRatio,
          title,
          altText,
          caption,
        },
        provider: inferredProvider,
        costTier: 'free_only',
        model: selectedModel,
        visualStyle,
      } as any)

      if (regenerated && (regenerated.image_url || (regenerated as any).publicUrl)) {
        const finalUrl = regenerated.image_url || (regenerated as any).publicUrl
        const updated: CourseVisualAsset = {
          ...asset,
          ...(currentAsset || {}),
          ...regenerated,
          image_url: finalUrl,
          title,
          alt_text: altText,
          caption,
          prompt,
          visual_style: visualStyle,
          aspect_ratio: aspectRatio,
          model: selectedModel,
        }
        setCurrentAsset(updated)
        setCurrentImageUrl(finalUrl)
        onAssetUpdated?.(updated)
        console.info(`%c[Visual Studio] ✅ Edge Function Regeneration Succeeded%c`, 'color: #10b981;', '', regenerated)
        toast({
          title: t('builder.regeneratedSuccess', 'Visual Regenerated'),
          description: `Saved to media library (${selectedModel}).`,
        })
      }
    } catch (regenErr) {
      console.error('%c[Visual Studio] ❌ Visual Regeneration Failed:%c', 'color: #ef4444; font-weight: bold;', '', {
        error: regenErr,
        selectedModel,
        prompt,
      })
      toast({
        title: t('common:error', 'Regeneration Failed'),
        description: t('builder.regenerateFailedDesc', 'Could not regenerate image. Please try another model.'),
        variant: 'destructive',
      })
    } finally {
      setIsRegenerating(false)
      console.groupEnd()
    }
  }

  const handleDelete = async () => {
    const targetAssetId = currentAsset?.id || asset.id
    try {
      const isDbRecord = isPersistedAssetId(targetAssetId) && !asset.draft
      if (isDbRecord) {
        await deleteMutation.mutateAsync({ assetId: targetAssetId, courseId: asset.course_id })
      }
    } catch (delErr) {
      console.warn('Database delete deferred for draft visual asset:', delErr)
    }

    setCurrentImageUrl('')
    setCurrentAsset(null)
    onAssetDeleted?.(targetAssetId)
    toast({
      title: t('builder.visualDeleted', 'Visual Deleted'),
      description: t('builder.visualDeletedDesc', 'Removed from lesson.'),
    })
    onOpenChange(false)
  }

  const modelMeta = modelRegistry.getModelMetadata(selectedModel)
  const selectedModelDisplayName = modelMeta?.name || selectedModel

  const isGoogle = selectedModel.includes('imagen') || selectedModel.includes('google') || selectedModel.includes('banana')
  const isOpenRouter = selectedModel.includes('/') || selectedModel.includes('seedream')
  const isVector = selectedModel === 'recraft-vector'
  const isCloudflare = !isGoogle && !isOpenRouter && !isVector

  const providerBadgeLabel = isGoogle
    ? 'Google AI Studio (Gemini Key)'
    : isOpenRouter
    ? 'OpenRouter Unified Image Engine'
    : isVector
    ? 'Zero-Loss SVG Blueprint Engine ($0.00)'
    : 'Cloudflare Workers AI Free Tier ($0.00/step)'

  const providerBadgeColor = isGoogle
    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
    : isOpenRouter
    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300'
    : isVector
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {t('builder.visualAssetEditorTitle', 'AI Visual Asset & Prompt Studio')}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {`Inspect image, refine ${selectedModelDisplayName} prompt & negative prompt, or update accessibility alt-text.`}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] font-semibold ${providerBadgeColor}`}>
              {providerBadgeLabel}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Preview Box */}
          <div className="w-full md:w-1/2 p-6 bg-muted/10 border-e flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full rounded-2xl overflow-hidden border shadow-sm bg-slate-950 aspect-[16/9] flex items-center justify-center">
              {isRegenerating && (
                <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 p-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <p className="text-xs font-semibold text-center">
                    Synthesizing visual with {selectedModelDisplayName}...
                  </p>
                  <p className="text-[10px] text-slate-400 text-center">
                    Applying 5-star hospitality visual standards
                  </p>
                </div>
              )}
              {(() => {
                const imgUrl = currentImageUrl || currentAsset?.image_url || asset.image_url || ''
                let rawSvg: string | null = null
                if (imgUrl.startsWith('<svg') || imgUrl.includes('xmlns="http://www.w3.org/2000/svg"')) {
                  rawSvg = imgUrl
                } else if (imgUrl.startsWith('data:image/svg+xml')) {
                  try {
                    const commaIdx = imgUrl.indexOf(',')
                    if (commaIdx !== -1) {
                      const header = imgUrl.slice(0, commaIdx)
                      const body = imgUrl.slice(commaIdx + 1)
                      if (header.includes('base64')) {
                        rawSvg = decodeURIComponent(escape(atob(body)))
                      } else {
                        rawSvg = decodeURIComponent(body)
                      }
                    }
                  } catch {
                    try {
                      rawSvg = decodeURIComponent(imgUrl.replace(/^data:image\/svg\+xml[^,]*,/, ''))
                    } catch {}
                  }
                }

                if (rawSvg) {
                  return (
                    <div
                      className="w-full h-full p-2 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                      dangerouslySetInnerHTML={{ __html: rawSvg }}
                    />
                  )
                }

                if (imgUrl) {
                  return (
                    <img
                      src={imgUrl}
                      alt={altText || title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
                      }}
                    />
                  )
                }

                return (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2 p-4">
                    <ImageIcon className="w-10 h-10 stroke-1" />
                    <p className="text-xs">No image generated yet.</p>
                    <p className="text-[10px] text-slate-600 text-center">Click "Regenerate Visual" below to synthesize with {selectedModelDisplayName}.</p>
                  </div>
                )
              })()}
              <div className="absolute top-2 end-2 z-10">
                <Badge className="bg-black/60 backdrop-blur text-white text-[10px]">
                  {aspectRatio}
                </Badge>
              </div>
            </div>

            <div className="w-full space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{t('builder.purposeLabel', 'Educational Purpose')}:</span>
                <span className="font-semibold text-foreground capitalize">
                  {(currentAsset || asset).educational_purpose?.replace('_', ' ') || 'Concept Illustration'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('builder.modelLabel', 'AI Image Model')}:</span>
                <span className="font-semibold text-primary font-mono text-[11px]">
                  {selectedModel}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('builder.storageBucket', 'Storage')}:</span>
                <span className="font-mono text-[11px] text-foreground">
                  Supabase ({(currentAsset || asset).storage_bucket || 'content-media'})
                </span>
              </div>
            </div>
          </div>

          {/* Right Editor Form */}
          <ScrollArea className="flex-1 p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('builder.visualTitle', 'Visual Title')}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('builder.altText', 'Accessibility Alt-Text (Mandatory)')}</Label>
                <Input
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describes what the image illustrates for screen-readers"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('builder.caption', 'Display Caption (Optional)')}</Label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Educational takeaway caption below image"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('builder.visualStyle', 'Visual Style')}</Label>
                  <Select value={visualStyle} onValueChange={(v: any) => setVisualStyle(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educational_illustration">Educational Illustration</SelectItem>
                      <SelectItem value="professional_corporate">5-Star Corporate</SelectItem>
                      <SelectItem value="realistic">Realistic Hospitality</SelectItem>
                      <SelectItem value="photorealistic">Photorealistic Studio</SelectItem>
                      <SelectItem value="technical_diagram">Technical Diagram</SelectItem>
                      <SelectItem value="infographic">Infographic</SelectItem>
                      <SelectItem value="3d_illustration">3D Modern Illustration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('builder.placement', 'Lesson Placement')}</Label>
                  <Select value={placement} onValueChange={(v: any) => setPlacement(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intro">Lesson Introduction</SelectItem>
                      <SelectItem value="concept_explanation">Concept Explanation</SelectItem>
                      <SelectItem value="procedure">Within Step Procedure</SelectItem>
                      <SelectItem value="case_study">Case Study / Scenario</SelectItem>
                      <SelectItem value="summary">Summary & Takeaway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">AI Generation Engine & Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="auto">
                        🤖 Automatic — best available free engine (Recommended)
                      </SelectItem>

                      {/* Cloudflare Workers AI — free */}
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 rounded-sm mt-2 mb-1">
                        Cloudflare Workers AI (Free)
                      </div>
                      <SelectItem value="@cf/leonardo/lucid-origin">
                        🎨 Leonardo Lucid Origin (flagship photorealism)
                      </SelectItem>
                      <SelectItem value="@cf/leonardo/phoenix-1.0">
                        🖋️ Leonardo Phoenix 1.0 (coherent typography)
                      </SelectItem>
                      <SelectItem value="@cf/black-forest-labs/flux-1-schnell">
                        ✨ FLUX.1 Schnell (best text &amp; diagrams)
                      </SelectItem>
                      <SelectItem value="@cf/stabilityai/stable-diffusion-xl-base-1.0">
                        🛡️ SDXL Base 1.0 (high detail)
                      </SelectItem>
                      <SelectItem value="@cf/lykon/dreamshaper-8-lcm">
                        🏨 DreamShaper 8 LCM (photorealism &amp; ambiance)
                      </SelectItem>
                      <SelectItem value="@cf/bytedance/stable-diffusion-xl-lightning">
                        ⚡ SDXL Lightning (fastest, 4-step)
                      </SelectItem>

                      {/* Deterministic SVG — always available */}
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 rounded-sm mt-2 mb-1">
                        Vector (Free • instant)
                      </div>
                      <SelectItem value="recraft-vector">
                        📐 Vector Schematic (SVG diagrams &amp; flowcharts)
                      </SelectItem>

                      {/* OpenRouter — paid, needs credits */}
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 rounded-sm mt-2 mb-1">
                        OpenRouter (Paid • needs credits)
                      </div>
                      <SelectItem value="google/gemini-3-pro-image">
                        💎 Gemini 3 Pro Image (highest quality)
                      </SelectItem>
                      <SelectItem value="google/gemini-2.5-flash-image">
                        💎 Gemini 2.5 Flash Image (fast)
                      </SelectItem>
                      <SelectItem value="google/gemini-3.1-flash-image">
                        💎 Gemini 3.1 Flash Image
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('builder.aspectRatio', 'Aspect Ratio')}</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 Widescreen</SelectItem>
                      <SelectItem value="4:3">4:3 Standard</SelectItem>
                      <SelectItem value="1:1">1:1 Square</SelectItem>
                      <SelectItem value="3:2">3:2 Photo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">{`${selectedModelDisplayName} Prompt`}</Label>
                  <span className={`text-[10px] font-semibold ${isCloudflare || isVector ? 'text-emerald-600' : 'text-primary'}`}>
                    {isCloudflare || isVector ? '$0.00 / step' : isGoogle ? 'Google AI Studio' : 'OpenRouter Unified'}
                  </span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                  placeholder={`Detailed instructional prompt for ${selectedModelDisplayName}...`}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">{t('builder.negativePrompt', 'Negative Prompt (Artifact Elimination)')}</Label>
                  <span className="text-[10px] text-muted-foreground">Auto-tuned</span>
                </div>
                <Textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={2}
                  className="font-mono text-xs text-muted-foreground"
                  placeholder="blurry, distorted anatomy, watermark, extra fingers..."
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating || generateMutation.isPending}
                className={`w-full text-xs font-semibold ${providerBadgeColor} hover:opacity-90 transition-all`}
              >
                {isRegenerating || generateMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin me-1" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5 me-1" />
                )}
                <span>{currentImageUrl ? `Regenerate Visual with ${selectedModelDisplayName}` : `Generate Visual with ${selectedModelDisplayName}`}</span>
              </Button>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 me-1" />
            <span>{t('common:delete', 'Delete Visual')}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin me-1" />
              ) : (
                <Save className="w-3.5 h-3.5 me-1" />
              )}
              <span>{t('common:save', 'Save Changes')}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
