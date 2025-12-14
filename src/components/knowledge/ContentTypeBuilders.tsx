/**
 * Content Type Builders
 * 
 * Specialized editor components for different knowledge article content types.
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Video,
    Plus,
    Trash2,
    GripVertical,
    ChevronUp,
    ChevronDown,
    HelpCircle,
    CheckSquare,
    Play,
    Eye
} from 'lucide-react'
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
    const [showPreview, setShowPreview] = useState(false)

    const isValidUrl = value && (
        value.includes('youtube.com') ||
        value.includes('youtu.be') ||
        value.includes('vimeo.com') ||
        value.match(/\.(mp4|webm|ogg)$/i)
    )

    const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]
            return `https://www.youtube.com/embed/${videoId}?rel=0`
        }
        if (url.includes('vimeo.com')) {
            const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
            return `https://player.vimeo.com/video/${videoId}`
        }
        return url
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Video className="h-5 w-5 text-red-500" />
                    Video Content
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="video-url">Video URL</Label>
                    <div className="flex gap-2">
                        <Input
                            id="video-url"
                            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPreview(!showPreview)}
                            disabled={!isValidUrl}
                        >
                            <Eye className="h-4 w-4 mr-1" />
                            {showPreview ? 'Hide' : 'Preview'}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Supports YouTube, Vimeo, or direct video file URLs (.mp4, .webm)
                    </p>
                </div>

                {showPreview && isValidUrl && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                        {value.match(/\.(mp4|webm|ogg)$/i) ? (
                            <video src={value} controls className="w-full h-full" />
                        ) : (
                            <iframe
                                src={getEmbedUrl(value)}
                                title="Video Preview"
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
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
                        <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                    </CardTitle>
                    <Button type="button" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1" />
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
                        <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                    </CardTitle>
                    <Button type="button" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1" />
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
    const [isUploading, setIsUploading] = useState(false)

    const handleFileUpload = useCallback((files: FileList | null) => {
        if (!files) return

        setIsUploading(true)

        Array.from(files).forEach((file, index) => {
            const reader = new FileReader()

            reader.onload = () => {
                const newImage: VisualImage = {
                    id: crypto.randomUUID(),
                    url: reader.result as string,
                    caption: file.name.replace(/\.[^/.]+$/, ''),
                    order: images.length + index
                }
                onChange([...images, newImage])
            }

            reader.onerror = () => {
                console.error('Failed to read file:', file.name)
            }

            reader.onloadend = () => {
                setIsUploading(false)
            }

            reader.readAsDataURL(file)
        })
    }, [images, onChange])

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
                        <Badge variant="secondary" className="ml-2">{images.length} images</Badge>
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
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleFileUpload(e.dataTransfer.files)
                    }}
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
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="h-7 w-7"
                                            onClick={() => moveImage(image.id, 'up')}
                                            disabled={index === 0}
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
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="h-7 w-7"
                                            onClick={() => removeImage(image.id)}
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
