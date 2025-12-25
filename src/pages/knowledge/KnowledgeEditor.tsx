/**
 * KnowledgeEditor
 * 
 * Simplified article editor for Knowledge Base.
 * Uses 'documents' table.
 */

import { useState, useCallback, useEffect } from 'react'
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
    Languages,
    Clock
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
import { triggerService } from '@/services/triggerService'
import { aiService } from '@/lib/gemini'
import {
    type KnowledgeVisibility,
    type KnowledgeStatus,
    type ChecklistItem,
    type FAQItem,
    CONTENT_TYPE_CONFIG
} from '@/types/knowledge'
import {
    RelatedArticlesEditor,
    AIDocumentSummary,
    VideoContentBuilder,
    ChecklistBuilder,
    FAQBuilder,
    VisualContentBuilder
} from '@/components/knowledge'
import { useRelatedArticles, useCategories } from '@/hooks/useKnowledge'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'

interface ArticleFormData {
    title: string
    description: string
    summary: string              // TL;DR summary for quick reading
    content: string
    file_url: string
    content_type: string
    visibility: KnowledgeVisibility
    requires_acknowledgment: boolean
    featured: boolean
    department_id: string | null
    category_id: string | null
    target_property_id: string | null
    // Content Type Specific
    checklist_items: ChecklistItem[]
    faq_items: FAQItem[]
    video_url: string
    images: any[]
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
        summary: '',
        content: '',
        file_url: '',
        content_type: 'document',
        visibility: 'all_properties' as KnowledgeVisibility,
        requires_acknowledgment: false,
        featured: false,
        department_id: null,
        category_id: null,
        target_property_id: null,
        checklist_items: [],
        faq_items: [],
        video_url: '',
        images: []
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
    const { data: categories } = useCategories(formData.department_id || undefined)
    const { data: properties } = useProperties()

    // Helper function to notify reviewers when a document is submitted for review
    const notifyReviewersOfSubmission = async (documentId: string, documentTitle: string) => {
        try {
            // Get reviewers with reviewer roles from user_roles table
            const reviewerRoles = ['property_manager', 'regional_admin', 'regional_hr']

            // Query user_roles to find users with reviewer roles, then get their profile info
            const { data: reviewerRolesData, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, profiles!inner(id, full_name, is_active)')
                .in('role', reviewerRoles)

            if (rolesError) {
                console.error('Error fetching reviewer roles:', rolesError)
                return
            }

            if (!reviewerRolesData || reviewerRolesData.length === 0) {
                console.log('No reviewers found to notify')
                return
            }

            // Filter active users and exclude the author, get unique user IDs
            const uniqueReviewerIds = new Set<string>()
            const reviewers: { id: string; full_name: string }[] = []

            for (const item of reviewerRolesData) {
                const profile = (item as any).profiles
                if (profile?.is_active && profile.id !== user?.id && !uniqueReviewerIds.has(profile.id)) {
                    uniqueReviewerIds.add(profile.id)
                    reviewers.push({ id: profile.id, full_name: profile.full_name })
                }
            }

            if (reviewers.length === 0) {
                console.log('No active reviewers found to notify')
                return
            }

            // Create notifications for all reviewers
            const notifications = reviewers.map(reviewer => ({
                user_id: reviewer.id,
                type: 'document_review_pending',
                title: '📋 New Document for Review',
                message: `"${documentTitle}" has been submitted for review by ${profile?.full_name || 'a team member'}.`,
                link: `/knowledge/review`,
                data: {
                    document_id: documentId,
                    submitted_by: user?.id,
                    submitted_by_name: profile?.full_name
                }
            }))

            const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications)

            if (notifError) {
                console.error('Error creating review notifications:', notifError)
            } else {
                console.log(`Notified ${reviewers.length} reviewers about document submission`)
            }
        } catch (error) {
            console.error('Failed to notify reviewers:', error)
        }
    }

    const VISIBILITY_OPTIONS: { value: KnowledgeVisibility; label: string; description: string }[] = [
        {
            value: 'all_properties' as KnowledgeVisibility,
            label: t('editor.visibility.all_properties'),
            description: t('editor.visibility.all_properties_desc')
        },
        {
            value: 'property',
            label: t('editor.visibility.property'),
            description: t('editor.visibility.property_desc')
        },
        {
            value: 'department',
            label: t('editor.visibility.department'),
            description: t('editor.visibility.department_desc')
        },
        {
            value: 'role',
            label: t('editor.visibility.role'),
            description: t('editor.visibility.role_desc')
        },
    ]

    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [aiLanguage, setAiLanguage] = useState('English')
    const [isForbidden, setIsForbidden] = useState(false)

    // Permission check
    useEffect(() => {
        if (primaryRole === 'staff') {
            setIsForbidden(true)
            toast.error('You do not have permission to create or edit articles.')
            navigate('/knowledge/search')
        }
    }, [primaryRole, navigate])

    if (isForbidden || primaryRole === 'staff') {
        return null
    }

    // Load Data Effect
    useEffect(() => {
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
                            summary: data.summary || '',
                            content: data.content || '',
                            file_url: data.file_url || '',
                            content_type: data.content_type || 'document',
                            visibility: data.visibility || 'all_properties',
                            requires_acknowledgment: data.requires_acknowledgment || false,
                            featured: false,
                            department_id: data.department_id || null,
                            category_id: data.category_id || null,
                            target_property_id: data.property_id || null,
                            checklist_items: data.checklist_items || [],
                            faq_items: data.faq_items || [],
                            video_url: data.video_url || '',
                            images: data.images || []
                        })
                    }
                })
        }
    }, [isEditing, id])

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
    const generateWithAI = async (action: 'outline' | 'expand' | 'improve' | 'summarize') => {
        if (!formData.title && action !== 'improve' && action !== 'summarize') {
            toast.error(t('editor.alerts.title_required'))
            return
        }
        if (action === 'summarize' && !formData.content) {
            toast.error(t('editor.write_placeholder'))
            return
        }

        setIsGenerating(true)
        try {
            let result: string | null = null

            // Content generation actions (outline, expand, improve)
            if (action === 'outline') {
                result = await aiService.improveContent(`Outline for: ${formData.title}`, 'expand', aiLanguage)
            } else if (action === 'expand') {
                result = await aiService.improveContent(formData.content, 'expand', aiLanguage)
            } else if (action === 'improve') {
                result = await aiService.improveContent(formData.content, 'professional', aiLanguage)
            } else if (action === 'summarize') {
                // Build language instruction based on selection
                const langInstruction = aiLanguage === 'Arabic'
                    ? 'IMPORTANT: Write your response in ARABIC ONLY. لا تستخدم اللغة الإنجليزية.'
                    : aiLanguage === 'English and Arabic'
                        ? 'IMPORTANT: Write your response in BOTH English AND Arabic. First write in English, then provide the Arabic translation below it.'
                        : 'IMPORTANT: Write your response in ENGLISH ONLY. Do not use any other language.'

                // Generate BOTH summary and description from content
                // Summary: 2-3 sentence overview of key points
                const summaryResult = await aiService.improveContent(
                    `Read this hotel policy/SOP document and write a 2-3 sentence summary that captures: 1) What this document is for, 2) Who it applies to, 3) The key requirement or procedure. Be specific and professional.

${langInstruction}

DOCUMENT:
${formData.content.substring(0, 4000)}

Write ONLY the summary, no labels or prefixes.`,
                    'shorten',
                    aiLanguage
                )
                if (summaryResult) {
                    updateField('summary', summaryResult)
                }

                // Description: Short tagline/subtitle style (max 15 words)
                const descResult = await aiService.improveContent(
                    `Create a SHORT tagline (maximum 10-15 words) for this document. It should be like a subtitle that appears under the title. Do NOT write a full sentence - just a brief phrase.

${langInstruction}

DOCUMENT TITLE: ${formData.title}
CONTENT PREVIEW: ${formData.content.substring(0, 1000)}

Write ONLY the tagline, no quotes or labels.
${aiLanguage === 'English' ? 'Example: "Step-by-step procedures for handling guest complaints"' : ''}
${aiLanguage === 'Arabic' ? 'مثال: "إجراءات التعامل مع شكاوى النزلاء"' : ''}`,
                    'shorten',
                    aiLanguage
                )
                if (descResult) {
                    // Clean up any quotes the AI might add
                    let cleanDesc = descResult.replace(/^["']|["']$/g, '').trim()

                    // Only filter non-ASCII if English-only mode (to remove Chinese mistakes)
                    if (aiLanguage === 'English') {
                        cleanDesc = cleanDesc.replace(/[^\x00-\x7F]/g, '').trim()
                    }
                    updateField('description', cleanDesc)
                }

                toast.success('Summary and description generated!')
                setIsGenerating(false)
                return
            }

            // For content actions only - just update content
            if (result) {
                // Parse AI markdown response to HTML
                const htmlContent = await marked(result)
                updateField('content', htmlContent)
            }
            toast.success(t('editor.alerts.ai_success'))
        } catch (error) {
            toast.error(t('editor.alerts.ai_failed'))
        } finally {
            setIsGenerating(false)
        }
    }

    const saveArticle = async (status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED') => {
        if (!formData.title.trim()) {
            toast.error(t('editor.alerts.title_required'))
            return
        }

        if (isUploading) {
            toast.error(t('editor.alerts.file_uploading'))
            return
        }

        if (formData.visibility === 'department' && !formData.department_id) {
            toast.error(t('editor.alerts.dept_required'))
            return
        }

        setIsSaving(true)

        let finalSummary = formData.summary
        let finalDescription = formData.description

        if (formData.content && formData.content.length > 100) {
            const needsSummary = !formData.summary || formData.summary.trim().length < 10
            const needsDescription = !formData.description || formData.description.trim().length < 5

            if (needsSummary || needsDescription) {
                toast.info('🤖 Auto-generating summary...', { duration: 2000 })
                try {
                    const cleanContent = formData.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    if (needsSummary) {
                        const summaryResult = await aiService.improveContent(
                            `Write a 2-3 sentence professional summary of this hotel document.\n\nDOCUMENT:\n${cleanContent.substring(0, 3000)}\n\nWrite ONLY the summary in English.`,
                            'shorten',
                            'English'
                        )
                        if (summaryResult) {
                            finalSummary = summaryResult
                            updateField('summary', summaryResult)
                        }
                    }
                    if (needsDescription) {
                        const descResult = await aiService.improveContent(
                            `Create a 10-15 word tagline for this document.\n\nTITLE: ${formData.title}\nCONTENT: ${cleanContent.substring(0, 1000)}\n\nWrite ONLY the tagline in English.`,
                            'shorten',
                            'English'
                        )
                        if (descResult) {
                            const cleanDesc = descResult.replace(/^["']|["']$/g, '').replace(/[^\x00-\x7F]/g, '').trim()
                            finalDescription = cleanDesc
                            updateField('description', cleanDesc)
                        }
                    }
                } catch (aiErr) {
                    console.warn('Auto-summarization failed:', aiErr)
                }
            }
        }

        try {
            const articleData = {
                title: formData.title,
                description: finalDescription || null,
                summary: finalSummary || null,
                content: formData.content || null,
                file_url: formData.file_url || null,
                content_type: formData.content_type,
                visibility: formData.visibility,
                requires_acknowledgment: formData.requires_acknowledgment,
                status: status,
                property_id: formData.target_property_id || currentProperty?.id,
                department_id: formData.department_id,
                category_id: formData.category_id,
                created_by: user?.id,
                updated_at: new Date().toISOString(),
                checklist_items: formData.checklist_items,
                faq_items: formData.faq_items,
                video_url: formData.video_url,
                images: formData.images
            }

            if (isEditing && id) {
                const { error } = await supabase
                    .from('documents')
                    .update(articleData)
                    .eq('id', id)
                if (error) throw error

                if (status === 'PENDING_REVIEW') {
                    await notifyReviewersOfSubmission(id, formData.title)
                }
                if (status === 'PUBLISHED') {
                    await triggerService.onSOPPublished(id, formData.department_id || undefined)
                }

                const typeLabel = t(`content_types.${formData.content_type}`, { defaultValue: formData.content_type.toUpperCase() })
                toast.success(status === 'PENDING_REVIEW'
                    ? t('editor.alerts.submitted_for_review')
                    : t('editor.alerts.update_success', { type: typeLabel }))
            } else {
                const { data, error } = await supabase
                    .from('documents')
                    .insert(articleData)
                    .select()
                    .single()
                if (error) throw error

                if (status === 'PENDING_REVIEW') {
                    await notifyReviewersOfSubmission(data.id, formData.title)
                }
                if (status === 'PUBLISHED') {
                    await triggerService.onSOPPublished(data.id, formData.department_id || undefined)
                }

                const typeLabel = t(`content_types.${formData.content_type}`, { defaultValue: formData.content_type.toUpperCase() })
                toast.success(status === 'PENDING_REVIEW'
                    ? t('editor.alerts.submitted_for_review')
                    : t('editor.alerts.save_success', { type: typeLabel }))
                navigate(`/knowledge/${data.id}`)
            }
            queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] })
        } catch (error: any) {
            console.error('Save error:', error)
            toast.error(`${t('editor.alerts.save_error')} ${error.message}`)
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
                            {isEditing ? t('editor.edit_title') : t('editor.create_title')}
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">{t('editor.subtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => saveArticle('DRAFT')} disabled={isSaving || isUploading}>
                        {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                        {t('editor.draft')}
                    </Button>
                    {/* Role-based: department_head and property_hr need review, others can publish directly */}
                    {['department_head', 'property_hr'].includes(primaryRole || '') ? (
                        <Button
                            onClick={() => saveArticle('PENDING_REVIEW')}
                            disabled={isSaving || isUploading}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                            {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Clock className="h-4 w-4 mr-2" />}
                            {t('editor.submit_for_review')}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => saveArticle('PUBLISHED')}
                            disabled={isSaving || isUploading}
                            className="bg-hotel-gold text-hotel-navy"
                        >
                            {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4 mr-2" />}
                            {t('editor.publish')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <Label>{t('editor.title_label')} *</Label>
                                <Input value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder={t('editor.title_placeholder')} className="mt-1 text-lg" />
                            </div>
                            <div>
                                <Label>{t('editor.type_label')}</Label>
                                <Select value={formData.content_type} onValueChange={v => updateField('content_type', v)}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CONTENT_TYPE_CONFIG.map(o => <SelectItem key={o.type} value={o.type}>{t(`content_types.${o.type}`, o.label)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('editor.description_label')}</Label>
                                <Textarea value={formData.description} onChange={e => updateField('description', e.target.value)} placeholder={t('editor.description_placeholder')} className="mt-1" rows={2} />
                            </div>
                            <div>
                                <Label>{t('editor.summary_label')}</Label>
                                <Textarea
                                    value={formData.summary}
                                    onChange={e => updateField('summary', e.target.value)}
                                    placeholder={t('editor.summary_placeholder')}
                                    className="mt-1"
                                    rows={2}
                                    maxLength={300}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('editor.summary_hint')} ({formData.summary.length}/300)
                                </p>
                            </div>
                            <div>
                                <Label>{t('editor.url_label')}</Label>
                                <div className="flex gap-2">
                                    <Input value={formData.file_url} onChange={e => updateField('file_url', e.target.value)} placeholder={t('editor.url_placeholder')} className="mt-1" />
                                    <Button variant="outline" size="icon" className="mt-1"><LinkIcon className="h-4 w-4" /></Button>
                                </div>
                            </div>

                            <div>
                                <Label>{t('editor.upload_label')}</Label>
                                <div className="mt-1 flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept=".pdf"
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return

                                            if (file.type !== 'application/pdf') {
                                                toast.error(t('editor.alerts.only_pdf'))
                                                return
                                            }

                                            if (!user?.id) {
                                                toast.error(t('editor.alerts.user_error'))
                                                return
                                            }

                                            setIsUploading(true)
                                            try {
                                                // RLS requires uploading to a folder matching the user ID
                                                const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
                                                const { data, error } = await supabase.storage
                                                    .from('documents')
                                                    .upload(fileName, file)

                                                if (error) throw error

                                                const { data: { publicUrl } } = supabase.storage
                                                    .from('documents')
                                                    .getPublicUrl(fileName)

                                                updateField('file_url', publicUrl)
                                                toast.success(t('editor.alerts.upload_success'))

                                                // Auto-set title if empty
                                                if (!formData.title) {
                                                    updateField('title', file.name.replace('.pdf', ''))
                                                }
                                            } catch (error: any) {
                                                console.error('Upload error:', error)
                                                toast.error(t('editor.alerts.upload_error') + error.message)
                                            } finally {
                                                setIsUploading(false)
                                            }
                                        }}
                                        className="cursor-pointer"
                                    />
                                    {isUploading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                                    {formData.file_url && formData.file_url.includes('supabase') && !isUploading && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                                            {t('editor.uploaded')}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {isUploading ? t('editor.uploading') : t('editor.upload_hint')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Assistant */}
                    <Card className="border-hotel-gold/30 bg-hotel-gold/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-base">
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-hotel-gold" />
                                    {t('editor.ai_assistant')}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Select value={aiLanguage} onValueChange={setAiLanguage}>
                                        <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="English">{t('languages.english_only', { defaultValue: 'English Only' })}</SelectItem>
                                            <SelectItem value="Arabic">{t('languages.arabic_only', { defaultValue: 'Arabic Only' })}</SelectItem>
                                            <SelectItem value="English and Arabic">{t('languages.bilingual', { defaultValue: 'Bilingual (En/Ar)' })}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => generateWithAI('outline')} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {t('editor.outline')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => generateWithAI('expand')} disabled={isGenerating || !formData.content}>
                                    <RefreshCw className="h-4 w-4" /> {t('editor.expand')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => generateWithAI('improve')} disabled={isGenerating || !formData.content}>
                                    <Sparkles className="h-4 w-4" /> {t('editor.improve')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateWithAI('summarize')}
                                    disabled={isGenerating || !formData.content}
                                    className="border-hotel-navy/20 hover:border-hotel-navy text-hotel-navy"
                                >
                                    <Sparkles className="h-4 w-4" /> Auto-Summarize
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
                                <TabsList>
                                    <TabsTrigger value="edit">{t('editor.content_tab')}</TabsTrigger>
                                    <TabsTrigger value="preview">{t('editor.preview_tab')}</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent>
                            {activeTab === 'edit' ? (
                                <div className="space-y-6">
                                    <RichTextEditor
                                        value={formData.content}
                                        onChange={v => updateField('content', v)}
                                        placeholder={t('editor.write_placeholder')}
                                        minHeight={200}
                                        direction={aiLanguage === 'Arabic' ? 'rtl' : 'ltr'}
                                    />

                                    {/* Content Type Specific Builders */}
                                    {formData.content_type === 'video' && (
                                        <VideoContentBuilder
                                            value={formData.video_url}
                                            onChange={v => updateField('video_url', v)}
                                        />
                                    )}

                                    {formData.content_type === 'checklist' && (
                                        <ChecklistBuilder
                                            items={formData.checklist_items}
                                            onChange={v => updateField('checklist_items', v)}
                                        />
                                    )}

                                    {formData.content_type === 'faq' && (
                                        <FAQBuilder
                                            items={formData.faq_items}
                                            onChange={v => updateField('faq_items', v)}
                                        />
                                    )}

                                    {formData.content_type === 'visual' && (
                                        <VisualContentBuilder
                                            images={formData.images}
                                            onChange={v => updateField('images', v)}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="prose max-w-none min-h-[400px] p-4 border rounded bg-white">
                                    <div dangerouslySetInnerHTML={{ __html: formData.content || `<p class="text-gray-400">${t('editor.empty_preview')}</p>` }} />

                                    {/* Preview content type specific blocks */}
                                    <div className="mt-8 space-y-6">
                                        {formData.content_type === 'video' && formData.video_url && (
                                            <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                                <p className="text-white p-4">Video Preview: {formData.video_url}</p>
                                            </div>
                                        )}
                                        {formData.content_type === 'checklist' && formData.checklist_items.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="font-bold">Checklist Preview:</h4>
                                                {formData.checklist_items.map((item: any) => (
                                                    <div key={item.id} className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border rounded" />
                                                        <span>{item.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {isEditing && id && (
                        <RelatedArticlesEditor documentId={id} relatedArticles={relatedArticles} onUpdate={refetchRelated} />
                    )}

                    {/* AI Document Summary - For detailed analysis */}
                    {formData.content && formData.content.length > 100 && (
                        <AIDocumentSummary
                            content={formData.content}
                            title={formData.title}
                        />
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">{t('editor.categorization_title')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('editor.department_label')}</Label>
                                <Select value={formData.department_id || 'none'} onValueChange={v => {
                                    updateField('department_id', v === 'none' ? null : v)
                                    // Reset category when department changes
                                    updateField('category_id', null)
                                }}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder={t('editor.department_label')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('editor.general_department')}</SelectItem>
                                        {departments?.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {t('editor.department_hint')}
                                </p>
                            </div>

                            {formData.department_id && (
                                <div>
                                    <Label>{t('editor.category_label')}</Label>
                                    <Select value={formData.category_id || 'none'} onValueChange={v => updateField('category_id', v === 'none' ? null : v)}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder={t('editor.category_label')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('editor.general_category')}</SelectItem>
                                            {categories?.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">{t('editor.access_title')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>{t('editor.visibility_label')}</Label>
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

                                    {/* Visibility Context Helpers */}
                                    {formData.visibility === 'department' && (
                                        <span className="block mt-1 text-blue-600" dangerouslySetInnerHTML={{
                                            __html: t('editor.visibility.dept_context', {
                                                dept: formData.department_id ? departments?.find(d => d.id === formData.department_id)?.name : 'Selected Department'
                                            })
                                        }} />
                                    )}

                                    {/* Validation warnings */}
                                    {validationWarnings.departmentRequired && (
                                        <span className="block mt-1 text-orange-600">
                                            {t('editor.visibility.dept_warning')}
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Target Property Selector - Temporarily visible to all for testing */}
                            {user && (
                                <div>
                                    <Label>{t('editor.target_property')}</Label>
                                    <Select
                                        value={formData.target_property_id || 'current'}
                                        onValueChange={v => updateField('target_property_id', v === 'current' ? null : v)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={t('editor.target_property')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="current">
                                                {t('editor.current_property')} ({currentProperty?.name || 'None'})
                                            </SelectItem>
                                            {properties?.map(prop => (
                                                <SelectItem key={prop.id} value={prop.id}>
                                                    {prop.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div><Label>{t('editor.requires_ack')}</Label></div>
                                <Switch checked={formData.requires_acknowledgment} onCheckedChange={v => updateField('requires_acknowledgment', v)} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    )
}
