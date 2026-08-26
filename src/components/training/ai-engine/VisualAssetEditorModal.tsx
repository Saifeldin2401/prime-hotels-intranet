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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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

  const [title, setTitle] = useState(asset?.title || '')
  const [altText, setAltText] = useState(asset?.alt_text || '')
  const [caption, setCaption] = useState(asset?.caption || '')
  const [prompt, setPrompt] = useState(asset?.prompt || '')
  const [placement, setPlacement] = useState<VisualPlacement>((asset?.placement as any) || 'concept_explanation')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>((asset?.visual_style as any) || 'educational_illustration')
  const [aspectRatio, setAspectRatio] = useState(asset?.aspect_ratio || '16:9')

  const updateMutation = useUpdateVisualAsset()
  const deleteMutation = useDeleteVisualAsset()
  const generateMutation = useGenerateVisualAsset()

  if (!asset) return null

  const handleSave = async () => {
    try {
      const updated = await updateMutation.mutateAsync({
        assetId: asset.id,
        updates: {
          title,
          alt_text: altText,
          caption,
          placement,
          visual_style: visualStyle,
          aspect_ratio: aspectRatio,
        },
      })
      onAssetUpdated?.(updated)
      toast({
        title: t('builder.visualSaved', 'Visual Updated'),
        description: t('builder.visualSavedDesc', 'Asset metadata and placement saved.'),
      })
      onOpenChange(false)
    } catch {
      toast({
        title: t('common:error', 'Error'),
        description: t('builder.visualSaveFailed', 'Failed to save visual asset.'),
        variant: 'destructive',
      })
    }
  }

  const [selectedModel, setSelectedModel] = useState(asset?.model || '@cf/bytedance/stable-diffusion-xl-lightning')
  const [negativePrompt, setNegativePrompt] = useState(asset?.negative_prompt || 'blurry, low quality, distorted anatomy, malformed hands, duplicate objects, watermark, text, logo, cluttered composition')

  const handleRegenerate = async () => {
    try {
      const regenerated = await generateMutation.mutateAsync({
        courseId: asset.course_id,
        moduleId: asset.module_id,
        lessonId: asset.lesson_id,
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
        provider: 'cloudflare',
        costTier: 'free_only',
        model: selectedModel,
        visualStyle,
      } as any)

      if (regenerated) {
        onAssetUpdated?.(regenerated)
        toast({
          title: t('builder.regeneratedSuccess', 'Visual Regenerated with Cloudflare Workers AI'),
          description: t('builder.regeneratedSuccessDesc', 'New 5-star visual saved to Supabase storage ($0.00/step).'),
        })
      }
    } catch {
      toast({
        title: t('common:error', 'Regeneration Failed'),
        description: t('builder.regenerateFailedDesc', 'Could not regenerate image with Cloudflare Workers AI.'),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ assetId: asset.id, courseId: asset.course_id })
      onAssetDeleted?.(asset.id)
      toast({
        title: t('builder.visualDeleted', 'Visual Deleted'),
        description: t('builder.visualDeletedDesc', 'Removed from lesson and database.'),
      })
      onOpenChange(false)
    } catch {
      toast({
        title: t('common:error', 'Error'),
        description: t('builder.deleteFailed', 'Could not delete visual asset.'),
        variant: 'destructive',
      })
    }
  }

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
                  {t('builder.visualAssetEditorDesc', 'Inspect image, refine Cloudflare Workers AI SDXL prompt & negative prompt, or update accessibility alt-text.')}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
              Cloudflare Workers AI Free Tier ($0.00/step)
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Preview Box */}
          <div className="w-full md:w-1/2 p-6 bg-muted/10 border-e flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full rounded-2xl overflow-hidden border shadow-sm bg-card aspect-[16/9] flex items-center justify-center">
              <img
                src={asset.image_url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'}
                alt={altText}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
                }}
              />
              <div className="absolute top-2 end-2">
                <Badge className="bg-black/60 backdrop-blur text-white text-[10px]">
                  {aspectRatio}
                </Badge>
              </div>
            </div>

            <div className="w-full space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{t('builder.purposeLabel', 'Educational Purpose')}:</span>
                <span className="font-semibold text-foreground capitalize">
                  {asset.educational_purpose.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('builder.modelLabel', 'Cloudflare Model')}:</span>
                <span className="font-semibold text-orange-700 dark:text-orange-300 font-mono text-[11px]">
                  {selectedModel.split('/').pop() || 'stable-diffusion-xl-lightning'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('builder.storageBucket', 'Storage')}:</span>
                <span className="font-mono text-[11px] text-foreground">
                  Supabase ({asset.storage_bucket})
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
                  <Label className="text-xs font-semibold">{t('builder.imageModelEngine', 'Cloudflare Model')}</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="@cf/black-forest-labs/flux-1-schnell">
                        ✨ FLUX.1 Schnell (Ultra-HD Studio • 12B DiT)
                      </SelectItem>
                      <SelectItem value="@cf/bytedance/stable-diffusion-xl-lightning">
                        ⚡ SDXL-Lightning (Primary Free • $0.00/step)
                      </SelectItem>
                      <SelectItem value="@cf/stabilityai/stable-diffusion-xl-base-1.0">
                        🛡️ SDXL Base 1.0 (Detailed Free • $0.00/step)
                      </SelectItem>
                      <SelectItem value="@cf/lykon/dreamshaper-8-lcm">
                        🎨 DreamShaper 8 LCM (Creative Free • $0.00/step)
                      </SelectItem>
                      <SelectItem value="@cf/runwayml/stable-diffusion-v1-5-img2img">
                        🔄 SD 1.5 Img2Img (Transformation)
                      </SelectItem>
                      <SelectItem value="@cf/runwayml/stable-diffusion-v1-5-inpainting">
                        🖌️ SD 1.5 Inpainting (Region Editing)
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
                  <Label className="text-xs font-semibold">{t('builder.cloudflarePrompt', 'Cloudflare SDXL Prompt')}</Label>
                  <span className="text-[10px] text-orange-600 font-semibold">$0.00 / step</span>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                  placeholder="Detailed instructional prompt for SDXL..."
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
                disabled={generateMutation.isPending}
                className="w-full text-xs text-orange-700 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin me-1" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5 me-1" />
                )}
                <span>{t('builder.regenerateWithAi', 'Regenerate Image with Cloudflare Workers AI (SDXL-Lightning)')}</span>
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
