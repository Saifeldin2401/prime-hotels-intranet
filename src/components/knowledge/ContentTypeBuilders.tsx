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
    Eye,
    EyeOff,
    FolderOpen,
    HelpCircle,
    Play,
    Plus,
    Trash2,
    Video,
    Upload,
    Loader2
} from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { uploadFileToSupabase } from '@/editor/utils/supabaseUpload'

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
    
    // Get user's primary property for media uploads
    const { data: properties } = useProperties()
    const primaryProperty = properties?.[0]
    const { uploadFile } = useMedia({ propertyId: primaryProperty?.id, autoFetch: false })

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
                                // Upload to Supabase storage first
                                const url = await uploadFileToSupabase(file, 'content-media')
                                
                                // Then sync to Media Library
                                await uploadFile(file, {
                                    title: file.name.replace(/\.[^/.]+$/, ''),
                                    category: 'knowledgebase',
                                    property_id: primaryProperty?.id,
                                })
                                
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
}

export function ChecklistBuilder({ items, onChange }: ChecklistBuilderProps) {
    const { t } = useTranslation('knowledge')
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

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-orange-500" />
                        Checklist Items
                        <Badge variant="secondary" className="ms-2">{items.length}</Badge>
                    </CardTitle>
                    <Button type="button" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 me-1" />
                        Add Item
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No checklist items yet</p>
                        <p className="text-sm">Click "Add Item" to create your first item</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50"
                        >
                            <div className="flex flex-col gap-1 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveItem(item.id, 'up')}
                                    disabled={index === 0}
                                    aria-label={t('accessibility.move_up', 'Move up')}
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveItem(item.id, 'down')}
                                    disabled={index === items.length - 1}
                                    aria-label={t('accessibility.move_down', 'Move down')}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex-1 space-y-2">
                                <Input
                                    placeholder="Checklist item text..."
                                    value={item.text}
                                    onChange={(e) => updateItem(item.id, { text: e.target.value })}
                                />
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id={`required-${item.id}`}
                                            checked={item.is_required}
                                            onCheckedChange={(checked) =>
                                                updateItem(item.id, { is_required: !!checked })
                                            }
                                        />
                                        <Label
                                            htmlFor={`required-${item.id}`}
                                            className="text-sm text-gray-600"
                                        >
                                            Required
                                        </Label>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        #{index + 1}
                                    </Badge>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeItem(item.id)}
                                aria-label={t('accessibility.remove_item', 'Remove item')}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
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
}

export function FAQBuilder({ items, onChange }: FAQBuilderProps) {
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

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-yellow-500" />
                        FAQ Questions
                        <Badge variant="secondary" className="ms-2">{items.length}</Badge>
                    </CardTitle>
                    <Button type="button" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 me-1" />
                        Add Question
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <HelpCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No FAQ items yet</p>
                        <p className="text-sm">Click "Add Question" to create your first Q&A</p>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={item.id}
                            className="border rounded-lg overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b">
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => moveItem(item.id, 'up')}
                                        disabled={index === 0}
                                        aria-label={t('accessibility.move_up', 'Move up')}
                                    >
                                        <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => moveItem(item.id, 'down')}
                                        disabled={index === items.length - 1}
                                        aria-label={t('accessibility.move_down', 'Move down')}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Badge variant="outline" className="text-xs">Q{index + 1}</Badge>
                                <span className="flex-1" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                    onClick={() => removeItem(item.id)}
                                    aria-label={t('accessibility.remove_item', 'Remove item')}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Question</Label>
                                    <Input
                                        placeholder="Enter the frequently asked question..."
                                        value={item.question}
                                        onChange={(e) => updateItem(item.id, { question: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Answer</Label>
                                    <Textarea
                                        placeholder="Provide the answer..."
                                        value={item.answer}
                                        onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
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
