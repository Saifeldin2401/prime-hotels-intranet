/**
 * Content Type Builders
 * 
 * Specialized editor components for different knowledge article content types.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    CheckSquare,
    ChevronDown,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    FolderOpen,
    GripVertical,
    HelpCircle,
    Loader2,
    Play,
    Plus,
    Sparkles,
    Trash2,
    Upload,
    Video
} from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { uploadFileToSupabase } from '@/editor/utils/supabaseUpload'
import { uploadVideoWithCompression } from '@/editor/utils/videoUpload'

import { MediaPicker } from '@/components/media/MediaPicker'
import type { MediaAsset } from '@/lib/types/media'
import { useMedia } from '@/hooks/useMedia'
import { useProperties } from '@/hooks/useProperties'
import { DocumentPicker } from '@/components/documents/DocumentPicker'
import type { Document } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { ChecklistItem, FAQItem } from '@/types/knowledge'

// ============================================================================
// VIDEO CONTENT BUILDER
// ============================================================================

interface VideoContentBuilderProps {
    value: string
    onChange: (url: string) => void
}

export function VideoContentBuilder({ value, onChange }: VideoContentBuilderProps) {
    const { t } = useTranslation('knowledge')
    const [showPreview, setShowPreview] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isValidUrl = useMemo(() => {
        try {
            new URL(value)
            return true
        } catch {
            return false
        }
    }, [value])

    // Handle media selection from picker
    const handleMediaSelect = useCallback((assets: MediaAsset[]) => {
        if (assets.length > 0) {
            onChange(assets[0].public_url)
            toast.success('Video selected from library')
        }
        setShowMediaPicker(false)
    }, [onChange])

    // Extract YouTube video ID
    const getYouTubeId = (url: string): string | null => {
        if (!url) return null
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    // Extract Vimeo video ID
    const getVimeoId = (url: string): string | null => {
        if (!url) return null
        const regExp = /vimeo\.com\/(\d+)/
        const match = url.match(regExp)
        return match ? match[1] : null
    }

    // Secure URL host checking to prevent incomplete URL substring sanitization
    const isYouTube = (() => {
        try {
            const url = new URL(value)
            return url.hostname === 'youtube.com' ||
                   url.hostname === 'www.youtube.com' ||
                   url.hostname === 'youtu.be' ||
                   url.hostname === 'www.youtu.be'
        } catch {
            return false
        }
    })()
    const isVimeo = (() => {
        try {
            const url = new URL(value)
            return url.hostname === 'vimeo.com' ||
                   url.hostname === 'www.vimeo.com'
        } catch {
            return false
        }
    })()
    const isDirectVideo = value.match(/\.(mp4|webm|ogg)$/i)
    const youtubeId = getYouTubeId(value)
    const vimeoId = getVimeoId(value)

    // YouTube thumbnail URL
    const thumbnailUrl = youtubeId
        ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
        : null

    return (
        <Card className="border-dashed">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-base">Video Content</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Video URL</Label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={value}
                            onChange={e => onChange(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowPreview(!showPreview)}
                            title={showPreview ? 'Hide preview' : 'Show preview'}
                            aria-label={showPreview ? t('accessibility.hide_preview', 'Hide preview') : t('accessibility.show_preview', 'Show preview')}
                        >
                            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Supports YouTube, Vimeo, or direct video file URLs (.mp4, .webm)
                    </p>
                </div>

                <div className="flex flex-col gap-3 p-4 border-2 border-dashed rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Internal Video</p>
                            <p className="text-xs text-muted-foreground">
                                Upload or select from your media library
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowMediaPicker(true)}
                                className="gap-2"
                            >
                                <FolderOpen className="h-4 w-4" />
                                Browse Library
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="gap-2"
                            >
                                {isUploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                    <Upload className="h-4 w-4" />
                                )}
                                {isUploading ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="video/mp4,video/quicktime,video/webm"
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return

                            setIsUploading(true)
                            try {
                                // Auto-compress oversized files; upload also records
                                // the video in the Media Library (see supabaseUpload).
                                const { url } = await uploadVideoWithCompression(file)
                                onChange(url)
                                toast.success('Video uploaded and added to Media Library')
                            } catch (error) {
                                console.error('Upload error:', error)
                                toast.error((error as Error).message || 'Failed to upload video')
                            } finally {
                                setIsUploading(false)
                                if (fileInputRef.current) fileInputRef.current.value = ''
                            }
                        }}
                    />

                    {/* MediaPicker Dialog */}
                    <MediaPicker
                        open={showMediaPicker}
                        onOpenChange={setShowMediaPicker}
                        onSelect={handleMediaSelect}
                        config={{ allowedTypes: ['video'], multiple: false, category: 'knowledgebase' }}
                        title="Select Video from Library"
                    />
                </div>

                {showPreview && isValidUrl && (
                    <div className="space-y-2">
                        {/* Direct video files - use native player */}
                        {isDirectVideo && (
                            <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                <video src={value} controls className="w-full h-full" />
                            </div>
                        )}

                        {/* YouTube - show thumbnail with play button */}
                        {isYouTube && youtubeId && (
                            <div
                                className="aspect-video rounded-lg overflow-hidden bg-black relative cursor-pointer group"
                                onClick={() => window.open(value, '_blank')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        window.open(value, '_blank')
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Open YouTube video in a new tab"
                            >
                                <img
                                    src={thumbnailUrl!}
                                    alt="Video thumbnail"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback to a generic background if thumbnail fails
                                        const target = e.target as HTMLImageElement
                                        target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'
                                        target.style.opacity = '0.5'
                                    }}
                                />
                                {/* Play button overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Play className="h-8 w-8 text-white fill-white ms-1" />
                                    </div>
                                </div>
                                <div className="absolute bottom-3 start-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                    Click to watch on YouTube
                                </div>
                            </div>
                        )}

                        {/* Vimeo - show placeholder with link */}
                        {isVimeo && vimeoId && (
                            <div
                                className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-[#1ab7ea] to-[#0d92c8] relative cursor-pointer group"
                                onClick={() => window.open(value, '_blank')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        window.open(value, '_blank')
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Open Vimeo video in a new tab"
                            >
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Play className="h-8 w-8 text-white fill-white ms-1" />
                                    </div>
                                    <p className="text-sm font-medium">Vimeo Video</p>
                                    <p className="text-xs opacity-80 mt-1">Click to watch</p>
                                </div>
                            </div>
                        )}

                        {/* Fallback for other URLs */}
                        {!isDirectVideo && !isYouTube && !isVimeo && (
                            <div className="aspect-video rounded-lg overflow-hidden bg-muted flex flex-col items-center justify-center">
                                <Video className="h-12 w-12 text-muted-foreground mb-3" />
                                <p className="text-sm text-muted-foreground">Video URL detected</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => window.open(value, '_blank')}
                                >
                                    Open Video
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ============================================================================
// CHECKLIST BUILDER
// ============================================================================

interface ChecklistBuilderProps {
    items: ChecklistItem[]
    onChange: (items: ChecklistItem[]) => void
    onAIGenerate?: () => void
    isGenerating?: boolean
    title?: string
}

export function ChecklistBuilder({
    items,
    onChange,
    onAIGenerate,
    isGenerating = false,
    title
}: ChecklistBuilderProps) {
    const { t } = useTranslation('knowledge')
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkText, setBulkText] = useState('')

    const addItem = () => {
        const newItem: ChecklistItem = {
            id: crypto.randomUUID(),
            text: '',
            text_ar: '',
            is_required: false,
            order: items.length
        }
        onChange([...items, newItem])
    }

    const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
        onChange(items.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ))
    }

    const removeItem = (id: string) => {
        onChange(items.filter(item => item.id !== id).map((item, idx) => ({
            ...item,
            order: idx
        })))
    }

    const moveItem = (id: string, direction: 'up' | 'down') => {
        const currentIndex = items.findIndex(item => item.id === id)
        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === items.length - 1)
        ) return

        const newItems = [...items]
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        ;[newItems[currentIndex], newItems[swapIndex]] = [newItems[swapIndex], newItems[currentIndex]]

        onChange(newItems.map((item, idx) => ({ ...item, order: idx })))
    }

    const handleBulkAdd = () => {
        if (!bulkText.trim()) return
        const lines = bulkText
            .split('\n')
            .map(l => l.replace(/^[-*•\d.\s[\]xX]+/, '').trim())
            .filter(Boolean)

        if (lines.length === 0) return

        const newItems: ChecklistItem[] = lines.map((text, idx) => ({
            id: crypto.randomUUID(),
            text,
            text_ar: '',
            is_required: idx < 2,
            order: items.length + idx
        }))

        onChange([...items, ...newItems])
        setBulkText('')
        setShowBulkModal(false)
        toast.success(t('editor.alerts.items_added', { defaultValue: `Added ${newItems.length} checklist items` }))
    }

    const loadPreset = (presetType: 'vip_luxury' | 'housekeeping' | 'shift_handover' | 'food_safety') => {
        let presetItems: Array<{ text: string; text_ar: string; is_required: boolean }> = []

        if (presetType === 'vip_luxury') {
            presetItems = [
                {
                    text: 'Verify guest profile, preferences, and loyalty tier in Opera PMS prior to arrival',
                    text_ar: 'التحقق من ملف النزيل وتفضيلاته ومستوى الولاء في نظام PMS قبل الوصول',
                    is_required: true
                },
                {
                    text: 'Inspect VIP suite for pristine five-star standard (cleanliness, floral setup, linen count)',
                    text_ar: 'فحص جناح كبار الشخصيات وفق معايير الخدمة العالمية 5 نجوم (النظافة، التنسيق الزهري، الشراشف)',
                    is_required: true
                },
                {
                    text: 'Place personalized welcome amenity and General Manager handwritten welcome card',
                    text_ar: 'وضع ضيافة الترحيب المخصصة وبطاقة الترحيب المكتوبة بخط يد المدير العام',
                    is_required: true
                },
                {
                    text: 'Test suite HVAC climate control, electronic door lock, and lighting preset scenes',
                    text_ar: 'اختبار نظام التكييف والقفل الإلكتروني وإعدادات الإضاءة الذكية في الجناح',
                    is_required: true
                },
                {
                    text: 'Warmly greet guest by surname within 15 seconds of approaching the front desk',
                    text_ar: 'الترحيب بالضيف باسم العائلة خلال 15 ثانية كحد أقصى من وصوله لمنطقة الاستقبال',
                    is_required: true
                },
                {
                    text: 'Offer personal escort to suite and confirm luggage delivery within 8 minutes of check-in',
                    text_ar: 'مرافقة الضيف للجناح والتأكد من وصول الحقائب خلال 8 دقائق كحد أقصى',
                    is_required: false
                }
            ]
        } else if (presetType === 'housekeeping') {
            presetItems = [
                {
                    text: 'Strip and sanitize all bed linens, pillow protectors, and mattress encasements',
                    text_ar: 'تجريد وتعقيم كافة بياضات الأسرّة وواقيات الوسائد والمراتب',
                    is_required: true
                },
                {
                    text: 'Disinfect all high-touch surfaces (door handles, TV remote, light switches, thermostat)',
                    text_ar: 'تعقيم جميع الأسطح متكررة اللمس (مقابض الأبواب، جهاز التحكم، المفاتيح، التكييف)',
                    is_required: true
                },
                {
                    text: 'Scrub and polish bathroom vanity, mirrors, and chrome fixtures to spotless shine',
                    text_ar: 'تنظيف وتلميع مغاسل الحمام والمرايا والإكسسوارات المعدنية لتلمع بالكامل',
                    is_required: true
                },
                {
                    text: 'Inspect shower drain velocity and replenish five-star brand luxury toiletries',
                    text_ar: 'فحص سرعة تصريف مياه الدش وتزويد مستلزمات الاستحمام الفاخرة المعتمدة',
                    is_required: true
                },
                {
                    text: 'Vacuum carpet edges, underneath bed frame, and behind nightstands',
                    text_ar: 'تنظيف السجاد بالمكنسة الكهربائية بما في ذلك الزوايا وتحت السرير وخلف الكومودينو',
                    is_required: false
                },
                {
                    text: 'Restock minibar items and verify all expiration dates and seal tags',
                    text_ar: 'إعادة تعبئة الميني بار والتأكد من تواريخ الصلاحية وسلامة الأختام',
                    is_required: false
                }
            ]
        } else if (presetType === 'shift_handover') {
            presetItems = [
                {
                    text: 'Review unassigned VIP arrivals and ensure suite assignment locks in PMS',
                    text_ar: 'مراجعة وصول كبار الشخصيات غير المخصصين وتثبيت الغرف في نظام PMS',
                    is_required: true
                },
                {
                    text: 'Audit pending guest folios, trace logs, and unresolved billing inquiries',
                    text_ar: 'تدقيق فواتير النزلاء المعلقة وسجلات المتابعة والاستفسارات المالية',
                    is_required: true
                },
                {
                    text: 'Verify front desk keycard encoder supplies and physical master key emergency safe',
                    text_ar: 'التأكد من رصيد بطاقات الغرف وصندوق المفاتيح الرئيسية للطوارئ',
                    is_required: true
                },
                {
                    text: 'Document all special guest requests, wake-up calls, and airport transfers in logbook',
                    text_ar: 'توثيق جميع طلبات النزلاء الخاصة ومنبهات الاستيقاظ وتوصيل المطار في السجل',
                    is_required: true
                },
                {
                    text: 'Count cash drawer floats and verify electronic terminal POS batch settlement',
                    text_ar: 'جرد الصندوق النقدي ومطابقة تسوية أجهزة الدفع الإلكتروني (POS)',
                    is_required: false
                }
            ]
        } else if (presetType === 'food_safety') {
            presetItems = [
                {
                    text: 'Record walk-in refrigerator and freezer temperatures (must be below 4°C / -18°C)',
                    text_ar: 'تسجيل درجات حرارة الثلاجات والمجمدات (أقل من 4 درجات مئوية / -18 درجة مئوية)',
                    is_required: true
                },
                {
                    text: 'Verify raw vs cooked food vertical separation on storage racks',
                    text_ar: 'التحقق من الفصل الرأسي بين الأطعمة النيئة والمطبوخة على أرفف التخزين',
                    is_required: true
                },
                {
                    text: 'Test sanitizing solution chemical concentration using test strip swabs',
                    text_ar: 'اختبار تركيز محاليل التعقيم الكيميائية باستخدام أشرطة الفحص',
                    is_required: true
                },
                {
                    text: 'Inspect FIFO rotation and date labeling on all prepared food containers',
                    text_ar: 'فحص تطبيق قاعدة FIFO وتاريخ الصلاحية الملصق على جميع حاويات الأطعمة',
                    is_required: true
                },
                {
                    text: 'Confirm food handler personal hygiene, glove usage, and clean aprons',
                    text_ar: 'التأكد من النظافة الشخصية لمعدي الطعام وارتداء القفازات والمآزر النظيفة',
                    is_required: false
                }
            ]
        }

        const generated: ChecklistItem[] = presetItems.map((item, idx) => ({
            id: crypto.randomUUID(),
            text: item.text,
            text_ar: item.text_ar,
            is_required: item.is_required,
            order: idx
        }))

        onChange(generated)
        toast.success(t('editor.alerts.preset_loaded', { defaultValue: 'Loaded hotel standard checklist template' }))
    }

    return (
        <Card className="border-orange-200/60 dark:border-orange-900/40 shadow-sm bg-gradient-to-b from-orange-50/20 to-transparent">
            <CardHeader className="pb-3 border-b border-orange-100 dark:border-orange-950/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
                            <CheckSquare className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                {t('editor.checklist_title', 'Interactive Execution Checklist')}
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                                    {items.length} {t('editor.steps', 'steps')}
                                </Badge>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                {t('editor.checklist_subtitle', 'Verifiable steps staff can interactively check off during operations')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {onAIGenerate && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onAIGenerate}
                                disabled={isGenerating}
                                className="h-7 text-xs gap-1 border-hotel-gold/40 text-hotel-navy dark:text-hotel-gold hover:bg-hotel-gold/10"
                            >
                                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-hotel-gold" />}
                                <span>{t('editor.ai_generate_checklist', '✨ AI Extract Steps')}</span>
                            </Button>
                        )}

                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowBulkModal(true)}
                                className="h-7 text-xs gap-1"
                            >
                                <Copy className="h-3 w-3 text-slate-500" />
                                <span>Bulk Paste</span>
                            </Button>

                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={addItem}
                                className="h-7 text-xs gap-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>{t('editor.add_item', 'Add Step')}</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Hotel Quick Templates */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-slate-400">⚡ Hotel Templates:</span>
                    <button
                        type="button"
                        onClick={() => loadPreset('vip_luxury')}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-orange-400 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        👑 five-star VIP Arrival
                    </button>
                    <button
                        type="button"
                        onClick={() => loadPreset('housekeeping')}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-orange-400 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        🧹 Housekeeping 15-Point
                    </button>
                    <button
                        type="button"
                        onClick={() => loadPreset('shift_handover')}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-orange-400 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        🔄 Shift Handover
                    </button>
                    <button
                        type="button"
                        onClick={() => loadPreset('food_safety')}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-orange-400 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        🍽️ HACCP Food Safety
                    </button>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
                {items.length === 0 ? (
                    <div className="text-center py-8 px-4 border border-dashed rounded-xl bg-white/50 dark:bg-slate-950/50">
                        <CheckSquare className="h-10 w-10 mx-auto mb-2 text-orange-300 dark:text-orange-800" />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {t('editor.no_checklist_items', 'No interactive checklist steps added yet')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            Add steps individually, click "✨ AI Extract Steps" to automatically convert the SOP text into verification checkpoints, or pick a hotel template above.
                        </p>
                        <div className="flex justify-center gap-2 mt-4">
                            <Button type="button" size="sm" onClick={addItem} className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white font-medium">
                                <Plus className="h-3.5 w-3.5 me-1" />
                                Add First Step
                            </Button>
                            {onAIGenerate && (
                                <Button type="button" size="sm" variant="outline" onClick={onAIGenerate} disabled={isGenerating} className="h-8 text-xs border-hotel-gold/50 text-hotel-navy dark:text-hotel-gold">
                                    <Sparkles className="h-3.5 w-3.5 me-1 text-hotel-gold" />
                                    AI Auto-Fill
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="flex items-start gap-2.5 p-3 border rounded-xl bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                            >
                                <div className="flex flex-col gap-0.5 pt-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                        onClick={() => moveItem(item.id, 'up')}
                                        disabled={index === 0}
                                        aria-label={t('accessibility.move_up', 'Move up')}
                                    >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                        onClick={() => moveItem(item.id, 'down')}
                                        disabled={index === items.length - 1}
                                        aria-label={t('accessibility.move_down', 'Move down')}
                                    >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 shrink-0 bg-slate-50 dark:bg-slate-800">
                                            #{index + 1}
                                        </Badge>
                                        <Input
                                            placeholder="Verification action step (e.g. Inspect minibar seal and inventory)..."
                                            value={item.text}
                                            onChange={(e) => updateItem(item.id, { text: e.target.value })}
                                            className="h-8 text-xs font-medium"
                                        />
                                    </div>

                                    {/* Optional Arabic Translation Row */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8 text-end shrink-0">AR</span>
                                        <Input
                                            dir="rtl"
                                            placeholder="النص باللغة العربية (خطوة التحقق والمطابقة)..."
                                            value={item.text_ar || ''}
                                            onChange={(e) => updateItem(item.id, { text_ar: e.target.value })}
                                            className="h-7 text-xs text-right font-arabic"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-0.5">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <Checkbox
                                                id={`required-${item.id}`}
                                                checked={item.is_required}
                                                onCheckedChange={(checked) =>
                                                    updateItem(item.id, { is_required: !!checked })
                                                }
                                                className="h-3.5 w-3.5"
                                            />
                                            <span className={`text-[11px] font-semibold ${item.is_required ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500'}`}>
                                                {item.is_required ? '⚠️ Mandatory Quality Benchmark' : 'Optional Checkpoint'}
                                            </span>
                                        </label>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-2"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <Trash2 className="h-3 w-3 me-1" />
                                            {t('editor.delete', 'Remove')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bulk Paste Modal */}
                {showBulkModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b pb-3">
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    <Copy className="h-4 w-4 text-orange-500" />
                                    Bulk Paste Checklist Steps
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                                >
                                    ×
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Paste numbered or bulleted lines. Each new line will become an interactive checklist step:
                            </p>
                            <Textarea
                                rows={6}
                                placeholder="1. Verify guest ID in Opera PMS&#10;2. Inspect room cleanliness&#10;3. Place personalized welcome note&#10;4. Test HVAC temperature control"
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                className="text-xs font-mono"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowBulkModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="button" size="sm" onClick={handleBulkAdd} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                                    Add All Steps
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ============================================================================
// FAQ BUILDER
// ============================================================================

interface FAQBuilderProps {
    items: FAQItem[]
    onChange: (items: FAQItem[]) => void
    onAIGenerate?: () => void
    isGenerating?: boolean
    title?: string
}

export function FAQBuilder({
    items,
    onChange,
    onAIGenerate,
    isGenerating = false,
    title
}: FAQBuilderProps) {
    const { t } = useTranslation('knowledge')

    const addItem = () => {
        const newItem: FAQItem = {
            id: crypto.randomUUID(),
            question: '',
            question_ar: '',
            answer: '',
            answer_ar: '',
            order: items.length
        }
        onChange([...items, newItem])
    }

    const updateItem = (id: string, updates: Partial<FAQItem>) => {
        onChange(items.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ))
    }

    const removeItem = (id: string) => {
        onChange(items.filter(item => item.id !== id).map((item, idx) => ({
            ...item,
            order: idx
        })))
    }

    const moveItem = (id: string, direction: 'up' | 'down') => {
        const currentIndex = items.findIndex(item => item.id === id)
        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === items.length - 1)
        ) return

        const newItems = [...items]
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        ;[newItems[currentIndex], newItems[swapIndex]] = [newItems[swapIndex], newItems[currentIndex]]

        onChange(newItems.map((item, idx) => ({ ...item, order: idx })))
    }

    const loadPreset = (presetType: 'vip_exceptions' | 'safety_lost') => {
        let presetItems: Array<{ question: string; question_ar: string; answer: string; answer_ar: string }> = []

        if (presetType === 'vip_exceptions') {
            presetItems = [
                {
                    question: 'What should frontline associates do if a guest arrives early before the room is inspected?',
                    question_ar: 'ما هو الإجراء المتبع عند وصول الضيف قبل موعد تسجيل الوصول الرسمي وقبل فحص الغرفة؟',
                    answer: 'Acknowledge warmly, securely store luggage with concierge, offer complimentary refreshments in the executive lounge, and prioritize the room cleaning with Housekeeping.',
                    answer_ar: 'الترحيب الحار بالضيف، وتخزين الأمتعة بأمان لدى الكونسيرج، وتقديم ضيافة في ردهة النزلاء، وإعطاء أولوية التنظيف للغرفة لدى قسم التدبير الفندقي.'
                },
                {
                    question: 'How do we handle guest special requests for a higher floor or specific suite view?',
                    question_ar: 'كيف نتعامل مع طلبات النزلاء الخاصة بالحصول على طابق أعلى أو إطلالة محددة؟',
                    answer: 'Cross-check live PMS inventory, accommodate immediately if available, or offer an upgrade in accordance with loyalty tier guidelines.',
                    answer_ar: 'مراجعة التوفر في نظام PMS وتلبية الطلب فوراً في حال التوفر، أو تقديم ترقية وفق لائحة برنامج الولاء المعتمدة.'
                },
                {
                    question: 'What is the empowerment limit for front desk associates resolving guest billing queries?',
                    question_ar: 'ما هو حد التمكين المالي لموظفي الاستقبال لحل استفسارات وملاحظات فواتير النزلاء؟',
                    answer: 'Associates are empowered to adjust up to 300 SAR in disputed minor charges without manager pre-approval to ensure zero checkout friction.',
                    answer_ar: 'الموظفون مخولون بتسوية وتعديل مبالغ حتى 300 ريال سعودي للرسوم البسيطة محل النزاع دون موافقة مسبقة لضمان سرعة إنجاز المغادرة.'
                }
            ]
        } else if (presetType === 'safety_lost') {
            presetItems = [
                {
                    question: 'How should staff handle valuable personal items left behind in a guest room?',
                    question_ar: 'كيف يجب التعامل مع المقتنيات الثمينة المتروكة في غرف النزلاء بعد المغادرة؟',
                    answer: 'Immediately log the item in the Housekeeping Lost & Found register with room number and date, and transfer to the Security safe within 30 minutes.',
                    answer_ar: 'تسجيل القطعة فوراً في سجل المفقودات مع رقم الغرفة والتاريخ، وتسليمها لخزنة الأمن خلال 30 دقيقة كحد أقصى.'
                },
                {
                    question: 'What is the immediate action required during a localized fire alarm activation?',
                    question_ar: 'ما هو الإجراء الفوري المطلوب عند انطلاق جرس إنذار الحريق في أحد الطوابق؟',
                    answer: 'Verify the alarm zone on the main annunciator panel, contact Security dispatch immediately, and prepare the floor evacuation protocol without inducing panic.',
                    answer_ar: 'التحقق من منطقة الإنذار على اللوحة الرئيسية، وإبلاغ غرفة عمليات الأمن فوراً، والتجهيز لإخلاء الطابق وفق البروتوكول دون إثارة الهلع.'
                }
            ]
        }

        const generated: FAQItem[] = presetItems.map((item, idx) => ({
            id: crypto.randomUUID(),
            question: item.question,
            question_ar: item.question_ar,
            answer: item.answer,
            answer_ar: item.answer_ar,
            order: idx
        }))

        onChange(generated)
        toast.success(t('editor.alerts.preset_loaded', { defaultValue: 'Loaded hotel operational FAQs' }))
    }

    return (
        <Card className="border-yellow-200/60 dark:border-yellow-900/40 shadow-sm bg-gradient-to-b from-yellow-50/20 to-transparent">
            <CardHeader className="pb-3 border-b border-yellow-100 dark:border-yellow-950/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400">
                            <HelpCircle className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                {t('editor.faqs_title', 'Operational FAQs & Edge Cases')}
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                                    {items.length} {t('editor.qas', 'Q&As')}
                                </Badge>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                {t('editor.faqs_subtitle', 'Answers to exceptions and common dilemmas staff encounter during this SOP')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {onAIGenerate && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onAIGenerate}
                                disabled={isGenerating}
                                className="h-7 text-xs gap-1 border-hotel-gold/40 text-hotel-navy dark:text-hotel-gold hover:bg-hotel-gold/10"
                            >
                                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-hotel-gold" />}
                                <span>{t('editor.ai_generate_faqs', '✨ AI Generate FAQs')}</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={addItem}
                            className="h-7 text-xs gap-1 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{t('editor.add_faq', 'Add Q&A')}</span>
                        </Button>
                    </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-slate-400">⚡ Hotel Presets:</span>
                    <button
                        type="button"
                        onClick={() => loadPreset('vip_exceptions')}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-yellow-400 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        🌟 VIP & Front Desk Exceptions
                    </button>
                    <button
                        type="button"
                        onClick={() => loadPreset('safety_lost')}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-yellow-400 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        🛡️ Safety & Lost Items
                    </button>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
                {items.length === 0 ? (
                    <div className="text-center py-8 px-4 border border-dashed rounded-xl bg-white/50 dark:bg-slate-950/50">
                        <HelpCircle className="h-10 w-10 mx-auto mb-2 text-yellow-300 dark:text-yellow-800" />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {t('editor.no_faqs', 'No operational FAQs added yet')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            Add common questions and answers, or click "✨ AI Generate FAQs" to automatically identify operational edge cases from the article text.
                        </p>
                        <div className="flex justify-center gap-2 mt-4">
                            <Button type="button" size="sm" onClick={addItem} className="h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white font-medium">
                                <Plus className="h-3.5 w-3.5 me-1" />
                                Add First Q&A
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="border rounded-xl bg-white dark:bg-slate-900 shadow-2xs overflow-hidden"
                            >
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                            onClick={() => moveItem(item.id, 'up')}
                                            disabled={index === 0}
                                        >
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-slate-400 hover:text-slate-700"
                                            onClick={() => moveItem(item.id, 'down')}
                                            disabled={index === items.length - 1}
                                        >
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 h-5 bg-white dark:bg-slate-900">
                                        Q{index + 1}
                                    </Badge>
                                    <span className="flex-1 font-semibold text-xs truncate text-slate-700 dark:text-slate-300">
                                        {item.question || 'New Question'}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Trash2 className="h-3 w-3 me-1" />
                                        Remove
                                    </Button>
                                </div>

                                <div className="p-3 space-y-3">
                                    {/* English Question & Answer */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                            Question (EN)
                                        </Label>
                                        <Input
                                            placeholder="e.g. What should frontline staff do if...?"
                                            value={item.question}
                                            onChange={(e) => updateItem(item.id, { question: e.target.value })}
                                            className="h-8 text-xs font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                            Answer / Resolution Procedure (EN)
                                        </Label>
                                        <Textarea
                                            placeholder="Clear, step-by-step resolution answer..."
                                            value={item.answer}
                                            onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                                            rows={2}
                                            className="text-xs"
                                        />
                                    </div>

                                    {/* Arabic Row */}
                                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                السؤال باللغة العربية (Question AR)
                                            </Label>
                                            <Input
                                                dir="rtl"
                                                placeholder="السؤال باللغة العربية..."
                                                value={item.question_ar || ''}
                                                onChange={(e) => updateItem(item.id, { question_ar: e.target.value })}
                                                className="h-7 text-xs font-arabic text-right"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                الإجابة باللغة العربية (Answer AR)
                                            </Label>
                                            <Textarea
                                                dir="rtl"
                                                placeholder="الإجراء والحل المعتمد باللغة العربية..."
                                                value={item.answer_ar || ''}
                                                onChange={(e) => updateItem(item.id, { answer_ar: e.target.value })}
                                                rows={2}
                                                className="text-xs font-arabic text-right"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ============================================================================
// VISUAL CONTENT BUILDER (Diagrams/Infographics)
// ============================================================================

interface VisualImage {
    id: string
    url: string
    caption: string
    order: number
}

interface VisualContentBuilderProps {
    images: VisualImage[]
    onChange: (images: VisualImage[]) => void
}

export function VisualContentBuilder({ images, onChange }: VisualContentBuilderProps) {
    const { t } = useTranslation('knowledge')
    const [isUploading, setIsUploading] = useState(false)
    
    // Get user's primary property for media uploads
    const { data: properties } = useProperties()
    const primaryProperty = properties?.[0]
    const { uploadFile } = useMedia({ propertyId: primaryProperty?.id, autoFetch: false })

    const handleFileUpload = useCallback((files: FileList | null) => {
        if (!files) return

        setIsUploading(true)

        Array.from(files).forEach(async (file, index) => {
            try {
                // Upload to Supabase storage first
                const url = await uploadFileToSupabase(file, 'content-media')
                
                // Then sync to Media Library
                await uploadFile(file, {
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    category: 'knowledgebase',
                    property_id: primaryProperty?.id,
                })
                
                // Add to local state
                const newImage: VisualImage = {
                    id: crypto.randomUUID(),
                    url: url,
                    caption: file.name.replace(/\.[^/.]+$/, ''),
                    order: images.length + index
                }
                onChange([...images, newImage])
                
                toast.success('Image uploaded and added to Media Library')
            } catch (error) {
                console.error('Upload error:', error)
                toast.error(`Failed to upload ${file.name}`)
            }
        })

        setIsUploading(false)
    }, [images, onChange, uploadFile, primaryProperty?.id])

    const updateImage = (id: string, caption: string) => {
        onChange(images.map(img =>
            img.id === id ? { ...img, caption } : img
        ))
    }

    const removeImage = (id: string) => {
        onChange(images.filter(img => img.id !== id).map((img, idx) => ({
            ...img,
            order: idx
        })))
    }

    const moveImage = (id: string, direction: 'up' | 'down') => {
        const currentIndex = images.findIndex(img => img.id === id)
        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === images.length - 1)
        ) return

        const newImages = [...images]
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
            ;[newImages[currentIndex], newImages[swapIndex]] = [newImages[swapIndex], newImages[currentIndex]]

        onChange(newImages.map((img, idx) => ({ ...img, order: idx })))
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="h-5 w-5 text-purple-500" />
                        Visual Content
                        <Badge variant="secondary" className="ms-2">{images.length} images</Badge>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Upload Area */}
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                        isUploading ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/50"
                    )}
                    onClick={() => document.getElementById('visual-upload')?.click()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            document.getElementById('visual-upload')?.click()
                        }
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleFileUpload(e.dataTransfer.files)
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload visual content images"
                >
                    <input
                        type="file"
                        id="visual-upload"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <Plus className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                            {isUploading ? 'Uploading...' : 'Click or drag images to upload'}
                        </p>
                        <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 5MB each
                        </p>
                    </div>
                </div>

                {/* Image Grid */}
                {images.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {images.map((image, index) => (
                            <div key={image.id} className="border rounded-lg overflow-hidden">
                                <div className="aspect-video bg-gray-100 relative">
                                    <img
                                        src={image.url}
                                        alt={image.caption}
                                        className="w-full h-full object-contain"
                                    />
                                    <div className="absolute top-2 end-2 flex gap-1">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="h-7 w-7"
                                            onClick={() => moveImage(image.id, 'up')}
                                            disabled={index === 0}
                                            aria-label={t('accessibility.move_up', 'Move up')}
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="h-7 w-7"
                                            onClick={() => moveImage(image.id, 'down')}
                                            disabled={index === images.length - 1}
                                            aria-label={t('accessibility.move_down', 'Move down')}
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="h-7 w-7"
                                            onClick={() => removeImage(image.id)}
                                            aria-label={t('accessibility.remove_image', 'Remove image')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="p-2">
                                    <Input
                                        placeholder="Image caption..."
                                        value={image.caption}
                                        onChange={(e) => updateImage(image.id, e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ============================================================================
// STRING LIST BUILDER
// ============================================================================
// Generic editable/reorderable list of short text entries, used for the
// structured operational sections the AI KB pipeline produces:
// Critical Control Points, service benchmarks and contingency protocols.

interface StringListBuilderProps {
    items: string[]
    onChange: (items: string[]) => void
    title: string
    description?: string
    icon?: ReactNode
    placeholder?: string
    addLabel?: string
    accentClassName?: string
}

export function StringListBuilder({
    items,
    onChange,
    title,
    description,
    icon,
    placeholder = 'Add an entry...',
    addLabel = 'Add entry',
    accentClassName = 'text-hotel-gold',
}: StringListBuilderProps) {
    const list = Array.isArray(items) ? items : []

    const addItem = () => onChange([...list, ''])
    const updateItem = (index: number, value: string) =>
        onChange(list.map((entry, idx) => (idx === index ? value : entry)))
    const removeItem = (index: number) => onChange(list.filter((_, idx) => idx !== index))
    const moveItem = (index: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? index - 1 : index + 1
        if (target < 0 || target >= list.length) return
        const next = [...list]
        ;[next[index], next[target]] = [next[target], next[index]]
        onChange(next)
    }

    return (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <span className={accentClassName}>{icon}</span>
                        <span>{title}</span>
                        {list.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                                {list.length}
                            </Badge>
                        )}
                    </CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        {addLabel}
                    </Button>
                </div>
                {description && (
                    <p className="text-[11px] text-muted-foreground pt-1">{description}</p>
                )}
            </CardHeader>
            {list.length > 0 && (
                <CardContent className="space-y-2">
                    {list.map((entry, index) => (
                        <div key={index} className="flex items-start gap-1.5">
                            <div className="flex flex-col pt-2 text-slate-300 dark:text-slate-600">
                                <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <span className="pt-2 text-[11px] font-mono text-muted-foreground w-5 text-right shrink-0">
                                {index + 1}
                            </span>
                            <Textarea
                                value={entry}
                                onChange={(e) => updateItem(index, e.target.value)}
                                placeholder={placeholder}
                                rows={2}
                                className="text-xs bg-white dark:bg-slate-950 flex-1 min-h-[38px]"
                            />
                            <div className="flex flex-col gap-0.5">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => moveItem(index, 'up')}
                                    disabled={index === 0}
                                    aria-label="Move up"
                                >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => moveItem(index, 'down')}
                                    disabled={index === list.length - 1}
                                    aria-label="Move down"
                                >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-red-500 hover:text-red-600"
                                    onClick={() => removeItem(index)}
                                    aria-label="Remove entry"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            )}
        </Card>
    )
}
