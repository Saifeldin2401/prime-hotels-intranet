/**
 * KnowledgeEditor
 * 
 * Simplified article editor for Knowledge Base.
 * Uses 'documents' table.
 */

import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
    Save,
    Send,
    Sparkles,
    Loader2,
    ArrowLeft,
    Wand2,
    RefreshCw,
    Link as LinkIcon
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
import { useAuth } from '@/contexts/AuthContext'
import { useProperty } from '@/contexts/PropertyContext'
import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/gemini'
import type { KnowledgeVisibility } from '@/types/knowledge'
import { RelatedArticlesEditor } from '@/components/knowledge'
import { useRelatedArticles } from '@/hooks/useKnowledge'
import { CONTENT_TYPE_CONFIG } from '@/types/knowledge'

const VISIBILITY_OPTIONS: { value: KnowledgeVisibility; label: string }[] = [
    { value: 'all_properties', label: 'Everyone' },
    { value: 'property', label: 'Property Only' },
    { value: 'department', label: 'Department Only' },
    { value: 'role', label: 'Specific Roles' },
]

interface ArticleFormData {
    title: string
    description: string
    content: string
    file_url: string
    content_type: string
    visibility: KnowledgeVisibility | 'all_properties' // Allow mapping global to all_properties
    requires_acknowledgment: boolean
    featured: boolean // Note: 'featured' not in documents schema I saw earlier, but might be there or I should omit. 
    // Schema check: id, title, description, file_url, visibility, property_id, department_id, status, requires_acknowledgment, created_by, current_version, created_at, updated_at
    // No 'featured'. I will omit 'featured' from save logic or check if I missed it.
    // I'll omit it to be safe, or check status query again.
    // Actually `knowledgeService` used 'featured' in `getFeaturedArticles`?
    // Let's assume 'featured' is NOT in documents. I'll remove it from UI or mock it.
}

export default function KnowledgeEditor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation(['knowledge', 'common'])
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    const [formData, setFormData] = useState<ArticleFormData>({
        title: '',
        description: '',
        content: '',
        file_url: '',
        content_type: 'document',
        visibility: 'all_properties',
        requires_acknowledgment: false,
        featured: false
    })

    // Fetch existing data if editing
    // We need to fetch from 'documents' table now
    // Since useKnowledgeArticle calls service, and service queries documents, it *should* work if service returns correct shape.
    // But service `getArticleById` maps `documents` result to `KnowledgeArticle` type.
    // If I didn't update `KnowledgeArticle` type, it might have mismatch.
    // I'll rely on manual fetch here to be safe and clear about columns.

    // Actually, let's just use what we have, but I'll add a useEffect to load data manually if needed.
    // Or simpler: Load it here.

    const { data: relatedArticles = [], refetch: refetchRelated } = useRelatedArticles(id || '')

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
    const [isSaving, setIsSaving] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    // Load Data Effect
    useState(() => {
        if (isEditing && id) {
            supabase
                .from('documents')
                .select('*')
                .eq('id', id)
                .single()
                .then(({ data, error }) => {
                    if (data && !error) {
                        setFormData({
                            title: data.title || '',
                            description: data.description || '',
                            content: data.content || '', // Added column
                            file_url: data.file_url || '',
                            content_type: data.content_type || 'document',
                            visibility: (data.visibility === 'global' ? 'all_properties' : data.visibility) || 'all_properties',
                            requires_acknowledgment: data.requires_acknowledgment || false,
                            featured: false // Not in schema
                        })
                    }
                })
        }
    })

    const updateField = useCallback(<K extends keyof ArticleFormData>(
        field: K,
        value: ArticleFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }, [])

    // AI
    const generateWithAI = async (action: 'outline' | 'expand' | 'improve') => {
        if (!formData.title && action !== 'improve') {
            toast.error('Please enter a title first')
            return
        }
        setIsGenerating(true)
        try {
            let result: string | null = null
            // Reusing basic AI service calls
            if (action === 'outline') {
                result = await aiService.improveContent(`Outline for: ${formData.title}`, 'expand')
            } else if (action === 'expand') {
                result = await aiService.improveContent(formData.content, 'expand')
            } else if (action === 'improve') {
                result = await aiService.improveContent(formData.content, 'professional')
            }

            if (result) updateField('content', result)
            toast.success('AI generation complete!')
        } catch (error) {
            toast.error('AI failed')
        } finally {
            setIsGenerating(false)
        }
    }

    const saveArticle = async (status: 'DRAFT' | 'PUBLISHED') => {
        if (!formData.title.trim()) {
            toast.error('Title is required')
            return
        }

        setIsSaving(true)
        try {
            const articleData = {
                title: formData.title,
                description: formData.description || null,
                content: formData.content || null,
                file_url: formData.file_url || null,
                content_type: formData.content_type,
                visibility: formData.visibility,
                requires_acknowledgment: formData.requires_acknowledgment,
                status: status, // Uppercase
                property_id: currentProperty?.id,
                created_by: user?.id,
                updated_at: new Date().toISOString()
            }

            if (isEditing && id) {
                const { error } = await supabase
                    .from('documents') // Correct table
                    .update(articleData)
                    .eq('id', id)
                if (error) throw error
                toast.success('Saved!')
            } else {
                const { data, error } = await supabase
                    .from('documents') // Correct table
                    .insert(articleData)
                    .select()
                    .single()
                if (error) throw error
                toast.success('Created!')
                navigate(`/knowledge/${data.id}`)
            }
            queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })
        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
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
                            {isEditing ? t('editor.edit_title', 'Edit Document') : t('editor.create_title', 'Create Document')}
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">Add to Knowledge Base</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => saveArticle('DRAFT')} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                        Draft
                    </Button>
                    <Button onClick={() => saveArticle('PUBLISHED')} disabled={isSaving} className="bg-hotel-gold text-hotel-navy">
                        {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4 mr-2" />}
                        Publish
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <Label>Title *</Label>
                                <Input value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder="Document Title" className="mt-1 text-lg" />
                            </div>
                            <div>
                                <Label>Type</Label>
                                <Select value={formData.content_type} onValueChange={v => updateField('content_type', v)}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CONTENT_TYPE_CONFIG.map(o => <SelectItem key={o.type} value={o.type}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea value={formData.description} onChange={e => updateField('description', e.target.value)} placeholder="Summary..." className="mt-1" rows={2} />
                            </div>
                            <div>
                                <Label>External File URL (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input value={formData.file_url} onChange={e => updateField('file_url', e.target.value)} placeholder="https://..." className="mt-1" />
                                    <Button variant="outline" size="icon" className="mt-1"><LinkIcon className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Assistant */}
                    <Card className="border-hotel-gold/30 bg-hotel-gold/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Sparkles className="h-5 w-5 text-hotel-gold" />
                                AI Writing Assistant
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => generateWithAI('outline')} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Outline
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => generateWithAI('expand')} disabled={isGenerating || !formData.content}>
                                    <RefreshCw className="h-4 w-4" /> Expand
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => generateWithAI('improve')} disabled={isGenerating || !formData.content}>
                                    <Sparkles className="h-4 w-4" /> Improve
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
                                <TabsList>
                                    <TabsTrigger value="edit">Edit Content</TabsTrigger>
                                    <TabsTrigger value="preview">Preview</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent>
                            {activeTab === 'edit' ? (
                                <RichTextEditor value={formData.content} onChange={v => updateField('content', v)} placeholder="Write content..." minHeight={400} />
                            ) : (
                                <div className="prose max-w-none min-h-[400px] p-4 border rounded bg-white">
                                    <div dangerouslySetInnerHTML={{ __html: formData.content || '<p class="text-gray-400">Empty</p>' }} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {isEditing && id && (
                        <RelatedArticlesEditor documentId={id} relatedArticles={relatedArticles} onUpdate={refetchRelated} />
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Visibility</Label>
                                <Select value={formData.visibility} onValueChange={v => updateField('visibility', v as KnowledgeVisibility)}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {VISIBILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div><Label>Requires Acknowledgment</Label></div>
                                <Switch checked={formData.requires_acknowledgment} onCheckedChange={v => updateField('requires_acknowledgment', v)} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
