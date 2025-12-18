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
    Link as LinkIcon,
    Languages
} from 'lucide-react'
import { marked } from 'marked'
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
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'


const VISIBILITY_OPTIONS: { value: KnowledgeVisibility; label: string; description: string }[] = [
    {
        value: 'all_properties' as KnowledgeVisibility,
        label: 'All Properties',
        description: 'Visible across entire hotel chain'
    },
    {
        value: 'property',
        label: 'This Property Only',
        description: 'Only visible at selected property'
    },
    {
        value: 'department',
        label: 'This Department Only',
        description: 'Only visible to department members at selected property'
    },
    {
        value: 'role',
        label: 'Specific Role',
        description: 'Visible to users with a specific role'
    },
]


interface ArticleFormData {
    title: string
    description: string
    content: string
    file_url: string
    content_type: string
    visibility: KnowledgeVisibility
    requires_acknowledgment: boolean
    featured: boolean
    department_id: string | null
    target_property_id: string | null
}

export default function KnowledgeEditor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { t } = useTranslation(['knowledge', 'common'])
    const { user, profile, roles, primaryRole } = useAuth()
    const { currentProperty } = useProperty()
    const queryClient = useQueryClient()
    const isEditing = Boolean(id)

    const [formData, setFormData] = useState<ArticleFormData>({
        title: '',
        description: '',
        content: '',
        file_url: '',
        content_type: 'document',
        visibility: 'all_properties' as KnowledgeVisibility,
        requires_acknowledgment: false,
        featured: false,
        department_id: null,
        target_property_id: null
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
    const { departments } = useDepartments(currentProperty?.id)
    const { data: properties } = useProperties()

    // Debug: Log departments
    console.log('🏢 Departments loaded:', departments)
    console.log('🏨 Current Property:', currentProperty)
    console.log('👤 Primary Role:', primaryRole)
    console.log('👤 Roles:', roles)

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
    const [isSaving, setIsSaving] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiLanguage, setAiLanguage] = useState('English')

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
                            content: data.content || '',
                            file_url: data.file_url || '',
                            content_type: data.content_type || 'document',
                            visibility: data.visibility || 'all_properties',
                            requires_acknowledgment: data.requires_acknowledgment || false,
                            featured: false,
                            department_id: data.department_id || null,
                            target_property_id: data.property_id || null
                        })
                    }
                })
        }
    })

    const updateField = useCallback(<K extends keyof ArticleFormData>(
        field: K,
        value: ArticleFormData[K]
    ) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value }

            // Smart validation: Auto-adjust visibility based on department selection
            if (field === 'department_id') {
                // If department is set to None (null), reset visibility if it requires department
                if (value === null && updated.visibility === 'department') {
                    updated.visibility = 'all_properties' as KnowledgeVisibility
                }
            }

            // Smart validation: If visibility requires department but none selected, show warning
            if (field === 'visibility') {
                const visValue = value as KnowledgeVisibility
                // If switching to department-based visibility without a department, auto-select cannot proceed
                // Just update the value, validation will show warning
            }

            return updated
        })
    }, [])

    // Computed validation warnings
    const validationWarnings = {
        departmentRequired: formData.visibility === 'department' && !formData.department_id,
        propertyIrrelevant: formData.visibility === 'all_properties' && formData.target_property_id,
    }

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
                result = await aiService.improveContent(`Outline for: ${formData.title}`, 'expand', aiLanguage)
            } else if (action === 'expand') {
                result = await aiService.improveContent(formData.content, 'expand', aiLanguage)
            } else if (action === 'improve') {
                result = await aiService.improveContent(formData.content, 'professional', aiLanguage)
            }

            if (result) {
                // Parse AI markdown response to HTML
                const htmlContent = await marked(result)
                updateField('content', htmlContent)

                // Auto-generate description if missing
                if (!formData.description) {
                    try {
                        // Use the raw result (markdown) to generate a summary
                        const summary = await aiService.improveContent(
                            `Generate a 1-sentence summary for this SOP: ${result.substring(0, 500)}...`,
                            'shorten',
                            aiLanguage
                        )
                        if (summary) {
                            updateField('description', summary)
                        }
                    } catch (err) {
                        console.warn('Failed to auto-generate description:', err)
                    }
                }
            }
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

        // Validate department is selected when required
        if (formData.visibility === 'department' && !formData.department_id) {
            toast.error('Please select a department for department-based visibility')
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
                status: status,
                property_id: formData.target_property_id || currentProperty?.id,
                department_id: formData.department_id,
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
                            <CardTitle className="flex items-center justify-between text-base">
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-hotel-gold" />
                                    AI Writing Assistant
                                </span>
                                <div className="flex items-center gap-2">
                                    <Select value={aiLanguage} onValueChange={setAiLanguage}>
                                        <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="English">English Only</SelectItem>
                                            <SelectItem value="Arabic">Arabic Only</SelectItem>
                                            <SelectItem value="English and Arabic">Bilingual (En/Ar)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                <RichTextEditor
                                    value={formData.content}
                                    onChange={v => updateField('content', v)}
                                    placeholder="Write content..."
                                    minHeight={400}
                                    direction={aiLanguage === 'Arabic' ? 'rtl' : 'ltr'}
                                />
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
                                <Label>Department</Label>
                                <Select value={formData.department_id || 'none'} onValueChange={v => updateField('department_id', v === 'none' ? null : v)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Global)</SelectItem>
                                        {departments?.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.visibility === 'department' && formData.department_id && 'Document will only be visible to members of this department'}
                                    {formData.visibility === 'department' && !formData.department_id && '⚠️ Select a department for department-only visibility'}
                                </p>
                            </div>
                            {/* Target Property Selector - Temporarily visible to all for testing */}
                            {user && (
                                <div>
                                    <Label>Target Property (Admin)</Label>
                                    <Select
                                        value={formData.target_property_id || 'current'}
                                        onValueChange={v => updateField('target_property_id', v === 'current' ? null : v)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select property" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="current">
                                                Current Property ({currentProperty?.name || 'None'})
                                            </SelectItem>
                                            {properties?.map(prop => (
                                                <SelectItem key={prop.id} value={prop.id}>
                                                    {prop.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-blue-600 mt-1">
                                        {formData.target_property_id
                                            ? `Document will be assigned to: ${properties?.find(p => p.id === formData.target_property_id)?.name}`
                                            : `Document will be assigned to: ${currentProperty?.name || 'Current property'}`
                                        }
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label>Visibility</Label>
                                <Select value={formData.visibility} onValueChange={v => updateField('visibility', v as KnowledgeVisibility)}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {VISIBILITY_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{o.label}</span>
                                                    <span className="text-xs text-gray-500">{o.description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {VISIBILITY_OPTIONS.find(o => o.value === formData.visibility)?.description}
                                    {(formData.visibility === 'property' || formData.visibility === 'department') && (
                                        <span className="block mt-1 text-blue-600">
                                            📍 Assigned to: <strong>
                                                {formData.target_property_id
                                                    ? properties?.find(p => p.id === formData.target_property_id)?.name
                                                    : currentProperty?.name || 'Current property'}
                                            </strong>
                                        </span>
                                    )}
                                    {/* Validation warnings */}
                                    {validationWarnings.departmentRequired && (
                                        <span className="block mt-1 text-orange-600">
                                            ⚠️ Department visibility requires selecting a department above
                                        </span>
                                    )}
                                    {validationWarnings.propertyIrrelevant && (
                                        <span className="block mt-1 text-gray-500 italic">
                                            ℹ️ Target Property won't limit visibility (visible to all properties)
                                        </span>
                                    )}
                                    {formData.visibility === 'all_properties' && !formData.department_id && (
                                        <span className="block mt-1 text-green-600">
                                            ✓ Document will be visible to everyone in the hotel chain
                                        </span>
                                    )}
                                </p>
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
