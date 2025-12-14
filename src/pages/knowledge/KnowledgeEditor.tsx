/**
 * KnowledgeEditor
 * 
 * Rich article editor with AI-assisted content generation.
 * Uses Supabase Edge Function for Hugging Face AI.
 */

import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
    Save,
    Eye,
    Send,
    Sparkles,
    FileText,
    BookOpen,
    CheckSquare,
    HelpCircle,
    Video,
    Image,
    ClipboardList,
    Link2,
    Loader2,
    ArrowLeft,
    Wand2,
    RefreshCw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/useKnowledge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/gemini'
import type { KnowledgeContentType, KnowledgeVisibility, ChecklistItem, FAQItem, RelatedArticle } from '@/types/knowledge'
import {
    VideoContentBuilder,
    ChecklistBuilder,
    FAQBuilder,
    VisualContentBuilder,
    LinkedResourceSelector,
    RelatedArticlesEditor
} from '@/components/knowledge'
import { useRelatedArticles } from '@/hooks/useKnowledge'

const CONTENT_TYPES: { value: KnowledgeContentType; label: string; icon: any }[] = [
    { value: 'sop', label: 'SOP', icon: ClipboardList },
    { value: 'policy', label: 'Policy', icon: FileText },
    { value: 'guide', label: 'Guide', icon: BookOpen },
    { value: 'checklist', label: 'Checklist', icon: CheckSquare },
    { value: 'reference', label: 'Reference', icon: Link2 },
    { value: 'faq', label: 'FAQ', icon: HelpCircle },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'visual', label: 'Visual', icon: Image },
]

const VISIBILITY_OPTIONS: { value: KnowledgeVisibility; label: string }[] = [
    { value: 'global', label: 'Everyone' },
    { value: 'property', label: 'Property Only' },
    { value: 'department', label: 'Department Only' },
    { value: 'role', label: 'Specific Roles' },
]

interface ArticleFormData {
    title: string
    title_ar: string
    description: string
    description_ar: string
    content: string
    content_type: KnowledgeContentType
    category_id: string
    visibility_scope: KnowledgeVisibility
    requires_acknowledgment: boolean
    featured: boolean
    estimated_read_time: number
    tags: string[]
    // Content type specific fields
    video_url: string
    checklist_items: ChecklistItem[]
    faq_items: FAQItem[]
    images: { id: string; url: string; caption: string; order: number }[]
    linked_quiz_id: string | null
    linked_training_id: string | null
}

export default function KnowledgeEditor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation(['knowledge', 'common'])
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    const { data: categories } = useCategories()

    const [formData, setFormData] = useState<ArticleFormData>({
        title: '',
        title_ar: '',
        description: '',
        description_ar: '',
        content: '',
        content_type: 'guide',
        category_id: '',
        visibility_scope: 'global',
        requires_acknowledgment: false,
        featured: false,
        estimated_read_time: 5,
        tags: [],
        // Content type specific
        video_url: '',
        checklist_items: [],
        faq_items: [],
        images: [],
        linked_quiz_id: null,
        linked_training_id: null
    })

    // Fetch related articles if editing
    const { data: relatedArticles = [], refetch: refetchRelated } = useRelatedArticles(id || '')

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
    const [isSaving, setIsSaving] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')

    const updateField = useCallback(<K extends keyof ArticleFormData>(
        field: K,
        value: ArticleFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }, [])

    // AI-Assisted Content Generation
    const generateWithAI = async (action: 'outline' | 'expand' | 'improve' | 'questions') => {
        if (!formData.title && action !== 'improve') {
            toast.error('Please enter a title first')
            return
        }

        setIsGenerating(true)
        try {
            let result: string | null = null

            switch (action) {
                case 'outline':
                    // Generate lesson outline from title
                    result = await aiService.improveContent(
                        `Create a detailed outline for a ${formData.content_type} about: ${formData.title}`,
                        'expand'
                    )
                    if (result) {
                        updateField('content', result)
                    }
                    break

                case 'expand':
                    // Expand existing content
                    result = await aiService.improveContent(formData.content, 'expand')
                    if (result) {
                        updateField('content', result)
                    }
                    break

                case 'improve':
                    // Improve grammar and professionalism
                    result = await aiService.improveContent(formData.content, 'professional')
                    if (result) {
                        updateField('content', result)
                    }
                    break

                case 'questions':
                    // Generate quiz questions (for training integration)
                    const questions = await aiService.generateQuiz(formData.content)
                    if (questions && questions.length > 0) {
                        const qContent = questions.map((q, i) =>
                            `**Q${i + 1}: ${q.question_text}**\n${q.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join('\n')}\n\n`
                        ).join('')
                        updateField('content', formData.content + '\n\n---\n\n## Assessment Questions\n\n' + qContent)
                    }
                    break
            }

            toast.success('AI generation complete!')
        } catch (error: any) {
            console.error('AI generation failed:', error)
            toast.error('AI generation failed. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    // Save article (draft or publish)
    const saveArticle = async (status: 'draft' | 'published') => {
        if (!formData.title.trim()) {
            toast.error('Title is required')
            return
        }

        // Validate based on content type
        const needsContent = !['video', 'checklist', 'faq'].includes(formData.content_type)
        if (needsContent && !formData.content.trim()) {
            toast.error('Content is required')
            return
        }

        if (formData.content_type === 'video' && !formData.video_url) {
            toast.error('Video URL is required for video content')
            return
        }

        if (formData.content_type === 'checklist' && formData.checklist_items.length === 0) {
            toast.error('Add at least one checklist item')
            return
        }

        if (formData.content_type === 'faq' && formData.faq_items.length === 0) {
            toast.error('Add at least one FAQ question')
            return
        }

        setIsSaving(true)
        try {
            const articleData = {
                title: formData.title,
                title_ar: formData.title_ar || null,
                description: formData.description || null,
                description_ar: formData.description_ar || null,
                content: formData.content,
                content_type: formData.content_type,
                category_id: formData.category_id || null,
                visibility_scope: formData.visibility_scope,
                requires_acknowledgment: formData.requires_acknowledgment,
                estimated_read_time: formData.estimated_read_time,
                status,
                created_by: user?.id,
                updated_at: new Date().toISOString(),
                // Content type specific fields
                video_url: formData.video_url || null,
                checklist_items: formData.checklist_items.length > 0 ? formData.checklist_items : null,
                faq_items: formData.faq_items.length > 0 ? formData.faq_items : null,
                images: formData.images.length > 0 ? formData.images : null,
                linked_quiz_id: formData.linked_quiz_id,
                linked_training_id: formData.linked_training_id
            }

            if (isEditing && id) {
                const { error } = await supabase
                    .from('sop_documents')
                    .update(articleData)
                    .eq('id', id)

                if (error) throw error
                toast.success(status === 'published' ? 'Article published!' : 'Draft saved!')
            } else {
                const { data, error } = await supabase
                    .from('sop_documents')
                    .insert(articleData)
                    .select()
                    .single()

                if (error) throw error
                toast.success(status === 'published' ? 'Article published!' : 'Draft saved!')
                navigate(`/knowledge/${data.id}`)
            }

            queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })
        } catch (error: any) {
            console.error('Save failed:', error)
            toast.error(`Failed to save: ${error.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? t('editor.edit_title', 'Edit Article') : t('editor.create_title', 'Create Article')}
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {t('editor.subtitle', 'Add to the Knowledge Base')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => saveArticle('draft')}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Draft
                    </Button>
                    <Button
                        onClick={() => saveArticle('published')}
                        disabled={isSaving}
                        className="bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Publish
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Editor */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Title */}
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <Label htmlFor="title">Title (English) *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    placeholder="Enter article title..."
                                    className="mt-1 text-lg"
                                />
                            </div>
                            <div>
                                <Label htmlFor="title_ar">Title (Arabic)</Label>
                                <Input
                                    id="title_ar"
                                    value={formData.title_ar}
                                    onChange={(e) => updateField('title_ar', e.target.value)}
                                    placeholder="أدخل عنوان المقال..."
                                    className="mt-1 text-right"
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    placeholder="Brief summary of this article..."
                                    className="mt-1"
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Assistant */}
                    <Card className="border-hotel-gold/30 bg-hotel-gold/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="h-5 w-5 text-hotel-gold" />
                                AI Writing Assistant
                                <Badge variant="outline" className="ml-auto text-xs">
                                    Powered by Hugging Face
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateWithAI('outline')}
                                    disabled={isGenerating}
                                    className="gap-2"
                                >
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    Generate Outline
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateWithAI('expand')}
                                    disabled={isGenerating || !formData.content}
                                    className="gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Expand Content
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateWithAI('improve')}
                                    disabled={isGenerating || !formData.content}
                                    className="gap-2"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Improve Writing
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateWithAI('questions')}
                                    disabled={isGenerating || !formData.content}
                                    className="gap-2"
                                >
                                    <HelpCircle className="h-4 w-4" />
                                    Generate Questions
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                AI-generated content requires human review before publishing.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Content Editor */}
                    <Card>
                        <CardHeader className="pb-2">
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
                                <TabsList>
                                    <TabsTrigger value="edit">Edit</TabsTrigger>
                                    <TabsTrigger value="preview">Preview</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent>
                            {activeTab === 'edit' ? (
                                <RichTextEditor
                                    value={formData.content}
                                    onChange={(value) => updateField('content', value)}
                                    placeholder="Start writing your article content here..."
                                    minHeight={400}
                                />
                            ) : (
                                <div className="prose prose-sm max-w-none min-h-[400px] p-4 border rounded-lg bg-white">
                                    {formData.content ? (
                                        <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                                    ) : (
                                        <p className="text-gray-400 italic">No content to preview</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Content Type Specific Editors */}
                    {formData.content_type === 'video' && (
                        <VideoContentBuilder
                            value={formData.video_url}
                            onChange={(url) => updateField('video_url', url)}
                        />
                    )}

                    {formData.content_type === 'checklist' && (
                        <ChecklistBuilder
                            items={formData.checklist_items}
                            onChange={(items) => updateField('checklist_items', items)}
                        />
                    )}

                    {formData.content_type === 'faq' && (
                        <FAQBuilder
                            items={formData.faq_items}
                            onChange={(items) => updateField('faq_items', items)}
                        />
                    )}

                    {formData.content_type === 'visual' && (
                        <VisualContentBuilder
                            images={formData.images}
                            onChange={(images) => updateField('images', images)}
                        />
                    )}

                    {/* Linked Resources */}
                    <LinkedResourceSelector
                        linkedQuizId={formData.linked_quiz_id}
                        linkedTrainingId={formData.linked_training_id}
                        onQuizChange={(id) => updateField('linked_quiz_id', id)}
                        onTrainingChange={(id) => updateField('linked_training_id', id)}
                    />

                    {/* Related Articles (shown when editing) */}
                    {isEditing && id && (
                        <RelatedArticlesEditor
                            documentId={id}
                            relatedArticles={relatedArticles}
                            onUpdate={() => refetchRelated()}
                        />
                    )}
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-6">
                    {/* Content Type */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Article Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Content Type</Label>
                                <Select
                                    value={formData.content_type}
                                    onValueChange={(v) => updateField('content_type', v as KnowledgeContentType)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
                                            <SelectItem key={value} value={value}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4" />
                                                    {label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Category</Label>
                                <Select
                                    value={formData.category_id}
                                    onValueChange={(v) => updateField('category_id', v)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Visibility</Label>
                                <Select
                                    value={formData.visibility_scope}
                                    onValueChange={(v) => updateField('visibility_scope', v as KnowledgeVisibility)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VISIBILITY_OPTIONS.map(({ value, label }) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Estimated Read Time (min)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={formData.estimated_read_time}
                                    onChange={(e) => updateField('estimated_read_time', parseInt(e.target.value) || 5)}
                                    className="mt-1"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Options */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Featured Article</Label>
                                    <p className="text-xs text-gray-500">Show on homepage</p>
                                </div>
                                <Switch
                                    checked={formData.featured}
                                    onCheckedChange={(v) => updateField('featured', v)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Requires Acknowledgment</Label>
                                    <p className="text-xs text-gray-500">Users must confirm reading</p>
                                </div>
                                <Switch
                                    checked={formData.requires_acknowledgment}
                                    onCheckedChange={(v) => updateField('requires_acknowledgment', v)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
